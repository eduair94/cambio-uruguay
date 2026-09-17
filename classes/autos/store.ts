// APP DB boundary of the used-car job. Pure rules first (tested without Mongo), then I/O.
import { appConnection } from "../appdb";
import { CarCatalogMetaModel } from "../models/CarCatalogMeta";
import { CarHarvestMetaModel } from "../models/CarHarvestMeta";
import { CarListingModel } from "../models/CarListing";
import { CarMarketSnapshotModel } from "../models/CarMarketSnapshot";
import { CarOpportunitySnapshotModel } from "../models/CarOpportunitySnapshot";
import { carKey } from "./enrich";
import type { DetailFetchResult } from "./detail";
import type { PublicCarCatalogMeta, PublicCarListing, PublicCarMarketSnapshot, PublicCarOpportunitySnapshot } from "./publicTypes";
import type { CarHarvestResult, CarModelVocabulary, CarPricePoint, RawCarListing, StoredCar } from "./types";

export const CAR_CATALOG_COLLECTION = "carcatalog";
const CHUNK = 300;
const MAX_SNAPSHOT_BYTES = 7 * 1024 * 1024;

export function nextPriceHistory(history: readonly CarPricePoint[], listing: RawCarListing): CarPricePoint[] {
  const last = history[history.length - 1];
  if (last && last.price === listing.price && last.currency === listing.currency) return [...history];
  return [...history, { price: listing.price, currency: listing.currency, observedAt: listing.observedAt }].slice(-20);
}

export function sweepUpdate(doc: { missedFullSweeps?: number | null; retiredAt?: string | null }, now: string): { missedFullSweeps: number; retiredAt: string | null } {
  const missed = (doc.missedFullSweeps ?? 0) + 1;
  return { missedFullSweeps: missed, retiredAt: doc.retiredAt ?? (missed >= 2 ? now : null) };
}

export function collapseRefusal(previous: number | null | undefined, next: number, label: string): string | null {
  if (previous && previous > 100 && next < previous * 0.4) {
    return `${label}: ${next} contra ${previous} de la corrida anterior (caída de más de 60 %); se conserva lo publicado`;
  }
  return null;
}

export function mergeVocabularies(previous: readonly CarModelVocabulary[], next: readonly CarModelVocabulary[]): CarModelVocabulary[] {
  const merged = new Map<string, Set<string>>();
  for (const vocabulary of [...previous, ...next]) {
    const key = `${vocabulary.brandId}|${vocabulary.modelId}`;
    const trims = merged.get(key) ?? new Set<string>();
    vocabulary.trims.forEach(trim => trims.add(trim));
    merged.set(key, trims);
  }
  return [...merged]
    .map(([key, trims]) => {
      const [brandId = "", modelId = ""] = key.split("|");
      return { brandId, modelId, trims: [...trims].sort() };
    })
    .sort((a, b) => `${a.brandId}|${a.modelId}`.localeCompare(`${b.brandId}|${b.modelId}`));
}

export interface HarvestMetaRecord {
  mode: "full" | "fast";
  startedAt: string;
  finishedAt: string;
  listings: number;
  requests: number;
  pages: number;
  failedPages: number;
  rejectedCards: number;
  completeBrands: number;
  gaps: CarHarvestResult["gaps"];
  reportedTotal: number | null;
  note: string | null;
  ok: boolean;
  lastOkAt: string | null;
  failingSince: string | null;
}

export function harvestMetaRecord(harvest: CarHarvestResult, previous: { lastOkAt?: string | null; failingSince?: string | null } | null): HarvestMetaRecord {
  // A fast (`since=today`) sweep can legitimately return zero adverts in the early morning hours,
  // so only full sweeps require at least one listing to be called "ok".
  const ok = harvest.failedPages === 0 && !harvest.note && (harvest.mode === "fast" || harvest.listings.length > 0);
  return {
    mode: harvest.mode,
    startedAt: harvest.startedAt,
    finishedAt: harvest.finishedAt,
    listings: harvest.listings.length,
    requests: harvest.requests,
    pages: harvest.pages,
    failedPages: harvest.failedPages,
    rejectedCards: harvest.rejectedCards,
    completeBrands: harvest.completeBrands.length,
    gaps: harvest.gaps.slice(0, 50),
    reportedTotal: harvest.reportedTotal,
    note: harvest.note,
    ok,
    lastOkAt: ok ? harvest.finishedAt : previous?.lastOkAt ?? null,
    failingSince: ok ? null : previous?.failingSince ?? harvest.finishedAt,
  };
}

const listingsCollection = () => appConnection().collection(CarListingModel.collection.name);

export async function loadStoredCars(now: Date, days = 21): Promise<StoredCar[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  const rows = await listingsCollection().find({ lastSeen: { $gte: cutoff }, retiredAt: null }, { projection: { _id: 0 } }).toArray();
  return rows as unknown as StoredCar[];
}

export async function saveCarHarvest(harvest: CarHarvestResult): Promise<{ upserted: number; retired: number }> {
  const collection = listingsCollection();
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: 1 });
  let upserted = 0;
  for (let index = 0; index < harvest.listings.length; index += CHUNK) {
    const chunk = harvest.listings.slice(index, index + CHUNK);
    const existing = new Map(
      (await collection.find({ key: { $in: chunk.map(listing => carKey(listing.id)) } }, { projection: { key: 1, priceHistory: 1 } }).toArray())
        .map(doc => [String(doc.key), doc])
    );
    const operations = chunk.map(listing => {
      const key = carKey(listing.id);
      const history = nextPriceHistory((existing.get(key)?.priceHistory as CarPricePoint[] | undefined) ?? [], listing);
      return {
        updateOne: {
          filter: { key },
          update: {
            $set: { listing, lastSeen: listing.observedAt, priceHistory: history, missedFullSweeps: 0, retiredAt: null },
            $setOnInsert: { key, firstSeen: listing.observedAt, detail: null },
          },
          upsert: true,
        },
      };
    });
    const result = await collection.bulkWrite(operations, { ordered: false });
    upserted += result.upsertedCount + result.modifiedCount;
  }
  let retired = 0;
  if (harvest.mode === "full" && harvest.completeBrands.length) {
    // A lower bound too: a full run only needs to reconsider adverts it could plausibly have seen
    // again, so this doesn't rescan the whole history on every run.
    const missSince = new Date(Date.parse(harvest.startedAt) - 21 * 86_400_000).toISOString();
    const missing = await collection.find(
      {
        "listing.brandId": { $in: harvest.completeBrands },
        key: { $nin: harvest.listings.map(listing => carKey(listing.id)) },
        lastSeen: { $lt: harvest.startedAt, $gte: missSince },
        retiredAt: null,
      },
      { projection: { key: 1, missedFullSweeps: 1, retiredAt: 1 } }
    ).toArray();
    const operations = missing.map(doc => {
      const update = sweepUpdate(doc as { missedFullSweeps?: number; retiredAt?: string | null }, harvest.finishedAt);
      if (update.retiredAt) retired++;
      return { updateOne: { filter: { key: doc.key }, update: { $set: update } } };
    });
    for (let index = 0; index < operations.length; index += CHUNK) {
      await collection.bulkWrite(operations.slice(index, index + CHUNK), { ordered: false });
    }
  }
  return { upserted, retired };
}

export async function saveCarDetails(result: DetailFetchResult, now: string): Promise<void> {
  const operations = [
    ...[...result.details].map(([key, detail]) => ({ updateOne: { filter: { key }, update: { $set: { detail } } } })),
    ...result.gone.map(key => ({ updateOne: { filter: { key }, update: { $set: { retiredAt: now } } } })),
  ];
  if (operations.length) await listingsCollection().bulkWrite(operations, { ordered: false });
}

const VOCABULARY_KEY = "uy-cars-vocabulary";

export async function loadHarvestMeta(key: string): Promise<Record<string, unknown> | null> {
  const doc = await CarHarvestMetaModel.findOne({ key }).lean();
  return (doc?.data as Record<string, unknown> | undefined) ?? null;
}

export async function loadVocabularies(): Promise<CarModelVocabulary[]> {
  const data = await loadHarvestMeta(VOCABULARY_KEY);
  return Array.isArray(data?.vocabularies) ? (data!.vocabularies as CarModelVocabulary[]) : [];
}

export async function saveVocabularies(vocabularies: readonly CarModelVocabulary[], updatedAt: string): Promise<void> {
  await CarHarvestMetaModel.updateOne({ key: VOCABULARY_KEY }, { $set: { updatedAt, data: { vocabularies } } }, { upsert: true });
}

export async function saveHarvestMeta(harvest: CarHarvestResult): Promise<HarvestMetaRecord> {
  const key = harvest.mode === "full" ? "uy-cars-last-full" : "uy-cars-last-fast";
  const previous = (await loadHarvestMeta(key)) as { lastOkAt?: string | null; failingSince?: string | null } | null;
  const record = harvestMetaRecord(harvest, previous);
  await CarHarvestMetaModel.updateOne({ key }, { $set: { updatedAt: harvest.finishedAt, data: record } }, { upsert: true });
  await CarHarvestMetaModel.updateOne({ key: "uy-cars" }, { $set: { updatedAt: harvest.finishedAt, data: record } }, { upsert: true });
  return record;
}

export async function loadCatalogMeta(): Promise<PublicCarCatalogMeta | null> {
  const doc = await CarCatalogMetaModel.findOne({ key: "uy-cars" }).lean();
  return (doc?.meta as PublicCarCatalogMeta | undefined) ?? null;
}

export async function saveRefusal(reason: string | null, at: string): Promise<void> {
  await CarHarvestMetaModel.updateOne({ key: "uy-cars" }, { $set: { "data.publishRefusal": { reason, at } } }, { upsert: true });
}

export async function publishCarCatalog(rows: readonly PublicCarListing[], meta: PublicCarCatalogMeta): Promise<void> {
  if (!rows.length) throw new Error("refusing to publish an empty car catalog");
  const collection = appConnection().collection(CAR_CATALOG_COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ marketSlug: 1, year: -1 });
  await collection.createIndex({ brandSlug: 1, lastSeen: -1 });
  await collection.createIndex({ lastSeen: -1, firstSeen: -1 });
  await collection.createIndex({ priceUsd: 1 });
  for (let index = 0; index < rows.length; index += CHUNK) {
    await collection.bulkWrite(rows.slice(index, index + CHUNK).map(row => ({
      replaceOne: { filter: { key: row.key }, replacement: row, upsert: true },
    })), { ordered: false });
  }
  await collection.deleteMany({ key: { $nin: rows.map(row => row.key) } });
  await CarCatalogMetaModel.updateOne({ key: "uy-cars" }, { $set: { generatedAt: meta.generatedAt, meta } }, { upsert: true });
}

export async function publishCarMarkets(snapshots: readonly PublicCarMarketSnapshot[]): Promise<void> {
  if (!snapshots.length) throw new Error("refusing to publish an empty car market snapshot list");
  const collection = appConnection().collection(CarMarketSnapshotModel.collection.name);
  await collection.createIndex({ key: 1 }, { unique: true });
  for (let index = 0; index < snapshots.length; index += CHUNK) {
    await collection.bulkWrite(snapshots.slice(index, index + CHUNK).map(snapshot => ({
      replaceOne: { filter: { key: snapshot.slug }, replacement: { key: snapshot.slug, generatedAt: snapshot.generatedAt, snapshot }, upsert: true },
    })), { ordered: false });
  }
  await collection.deleteMany({ key: { $nin: snapshots.map(snapshot => snapshot.slug) } });
}

export async function loadOpportunityStats(): Promise<PublicCarOpportunitySnapshot["stats"] | null> {
  const doc = await CarOpportunitySnapshotModel.findOne({ key: "used" }).lean();
  return (doc?.snapshot as PublicCarOpportunitySnapshot | undefined)?.stats ?? null;
}

export async function saveCarOpportunitySnapshot(snapshot: PublicCarOpportunitySnapshot): Promise<void> {
  let bounded = snapshot;
  while (Buffer.byteLength(JSON.stringify(bounded)) > MAX_SNAPSHOT_BYTES && bounded.items.length) {
    bounded = { ...bounded, items: bounded.items.slice(0, Math.floor(bounded.items.length * 0.8)) };
  }
  await CarOpportunitySnapshotModel.updateOne({ key: "used" }, { $set: { generatedAt: bounded.generatedAt, snapshot: bounded } }, { upsert: true });
}
