// APP DB boundary of the used-car job. Pure rules first (tested without Mongo), then I/O.
import { appConnection } from "../appdb";
import { CarCatalogMetaModel } from "../models/CarCatalogMeta";
import { CarFbCardModel } from "../models/CarFbCard";
import { CarGuideEntryModel } from "../models/CarGuideEntry";
import { CarHarvestMetaModel } from "../models/CarHarvestMeta";
import { CarListingModel } from "../models/CarListing";
import { CarMarketSnapshotModel } from "../models/CarMarketSnapshot";
import { CarOpportunitySnapshotModel } from "../models/CarOpportunitySnapshot";
import { CarReportSnapshotModel } from "../models/CarReportSnapshot";
import { CarRiskSnapshotModel } from "../models/CarRiskSnapshot";
import type { CarPhotoVerdict } from "./llm/vision";
import { guideKey, type CarGuideEntry, type CarGuideTarget } from "./catalog/guide";
import { carKey } from "./enrich";
import { slugify } from "./normalize";
import type { DetailFetchResult } from "./detail";
import type {
  PublicCarCatalogMeta, PublicCarListing, PublicCarMarketSnapshot, PublicCarOpportunitySnapshot, PublicCarReportSnapshot, PublicCarRiskSnapshot,
} from "./publicTypes";
import type { FbCard, FbItem } from "./sources/facebook";
import type { CarDetail, CarHarvestResult, CarModelVocabulary, CarPricePoint, CarSource, CarSourceResult, RawCarListing, StoredCar } from "./types";

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
  cooldowns: number;
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
    // Captures written before the outage retry existed have no counter.
    cooldowns: harvest.cooldowns ?? 0,
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

/**
 * La colección NATIVA de mongoose no encola nada: llamarla antes de que la conexión abra tira
 * "Collection method find is synchronous". Los modelos sí encolan, así que un job que empieza por una
 * consulta nativa —como currency-autos-detail, que arranca leyendo los avisos guardados— se caía en
 * su primera corrida en el VPS. Esperar la conexión acá lo arregla para todos los que vengan.
 */
async function nativeReady(): Promise<void> {
  // Escrito contra la forma, no contra el tipo: los tests cambian `appConnection` por un doble que
  // sólo tiene `collection`, y esperar la conexión no puede ser motivo para que fallen.
  const connection = appConnection() as { readyState?: number; asPromise?: () => Promise<unknown> };
  if (connection.readyState !== 1 && typeof connection.asPromise === "function") await connection.asPromise();
}

export async function loadStoredCars(now: Date, days = 21): Promise<StoredCar[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  await nativeReady();
  const rows = await listingsCollection()
    .find({ lastSeen: { $gte: cutoff }, retiredAt: null }, { projection: { _id: 0 } })
    .toArray();
  return rows as unknown as StoredCar[];
}

/**
 * Cuánto duró publicado cada aviso que ya salió del mercado. Va aparte porque `loadStoredCars` filtra
 * `retiredAt: null` —y por eso el informe medía la rotación sobre CERO avisos retirados, o sea que la
 * sección "cuánto tarda en venderse" no se iba a encender nunca—.
 */
export async function loadRetiredCarSpans(now: Date, days = 120): Promise<Array<{ firstSeen: string; retiredAt: string }>> {
  await nativeReady();
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  const rows = await listingsCollection()
    .find({ retiredAt: { $gte: cutoff } }, { projection: { _id: 0, firstSeen: 1, retiredAt: 1 } })
    .toArray();
  return rows
    .filter(row => typeof row.firstSeen === "string" && typeof row.retiredAt === "string")
    .map(row => ({ firstSeen: row.firstSeen as string, retiredAt: row.retiredAt as string }));
}

async function upsertListings(listings: readonly RawCarListing[], details: ReadonlyMap<string, CarDetail> | null): Promise<number> {
  await nativeReady();
  const collection = listingsCollection();
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: 1 });
  let upserted = 0;
  for (let index = 0; index < listings.length; index += CHUNK) {
    const chunk = listings.slice(index, index + CHUNK);
    const existing = new Map(
      (await collection.find({ key: { $in: chunk.map(listing => carKey(listing.id, listing.source)) } }, { projection: { key: 1, priceHistory: 1 } }).toArray())
        .map(doc => [String(doc.key), doc])
    );
    const operations = chunk.map(listing => {
      const key = carKey(listing.id, listing.source);
      const history = nextPriceHistory((existing.get(key)?.priceHistory as CarPricePoint[] | undefined) ?? [], listing);
      const detail = details?.get(key);
      return {
        updateOne: {
          filter: { key },
          update: {
            $set: { listing, lastSeen: listing.observedAt, priceHistory: history, missedFullSweeps: 0, retiredAt: null, ...(detail ? { detail } : {}) },
            $setOnInsert: { key, firstSeen: listing.observedAt, ...(detail ? {} : { detail: null }) },
          },
          upsert: true,
        },
      };
    });
    const result = await collection.bulkWrite(operations, { ordered: false });
    upserted += result.upsertedCount + result.modifiedCount;
  }
  return upserted;
}

async function countMisses(filter: Record<string, unknown>, finishedAt: string): Promise<number> {
  const collection = listingsCollection();
  const missing = await collection.find(filter, { projection: { key: 1, missedFullSweeps: 1, retiredAt: 1 } }).toArray();
  let retired = 0;
  const operations = missing.map(doc => {
    const update = sweepUpdate(doc as { missedFullSweeps?: number; retiredAt?: string | null }, finishedAt);
    if (update.retiredAt) retired++;
    return { updateOne: { filter: { key: doc.key }, update: { $set: update } } };
  });
  for (let index = 0; index < operations.length; index += CHUNK) {
    await collection.bulkWrite(operations.slice(index, index + CHUNK), { ordered: false });
  }
  return retired;
}

export async function saveCarHarvest(harvest: CarHarvestResult): Promise<{ upserted: number; retired: number }> {
  const upserted = await upsertListings(harvest.listings, null);
  let retired = 0;
  if (harvest.mode === "full" && harvest.completeBrands.length) {
    // A lower bound too: a full run only needs to reconsider adverts it could plausibly have seen
    // again, so this doesn't rescan the whole history on every run.
    const missSince = new Date(Date.parse(harvest.startedAt) - 21 * 86_400_000).toISOString();
    retired = await countMisses({
      // Web adverts share ML brand ids: an ML sweep must never retire them.
      "listing.source": "mercadolibre",
      "listing.brandId": { $in: harvest.completeBrands },
      key: { $nin: harvest.listings.map(listing => carKey(listing.id, listing.source)) },
      lastSeen: { $lt: harvest.startedAt, $gte: missSince },
      retiredAt: null,
    }, harvest.finishedAt);
  }
  return { upserted, retired };
}

/** Only this source's adverts, unseen by a COMPLETE read, last seen within 21 days. */
export function sourceRetirementFilter(result: Pick<CarSourceResult, "source" | "startedAt" | "listings">): Record<string, unknown> {
  return {
    "listing.source": result.source,
    key: { $nin: result.listings.map(listing => carKey(listing.id, listing.source)) },
    lastSeen: { $lt: result.startedAt, $gte: new Date(Date.parse(result.startedAt) - 21 * 86_400_000).toISOString() },
    retiredAt: null,
  };
}

export async function saveSourceHarvest(result: CarSourceResult, options: { retireKeys?: readonly string[] } = {}): Promise<{ upserted: number; retired: number }> {
  const upserted = await upsertListings(result.listings, result.details);
  let retired = 0;
  if (result.complete) retired += await countMisses(sourceRetirementFilter(result), result.finishedAt);
  const retireKeys = [...(options.retireKeys ?? [])];
  for (const [key, detail] of result.details) if (!detail.active) retireKeys.push(key);
  if (retireKeys.length) {
    const outcome = await listingsCollection().updateMany({ key: { $in: retireKeys }, retiredAt: null }, { $set: { retiredAt: result.finishedAt } });
    retired += outcome.modifiedCount;
  }
  return { upserted, retired };
}

export interface SourceMetaRecord {
  source: CarSource;
  ok: boolean;
  complete: boolean;
  listings: number;
  requests: number;
  note: string | null;
  startedAt: string;
  finishedAt: string;
  lastOkAt: string | null;
  failingSince: string | null;
}

export function sourceMetaRecord(result: CarSourceResult, previous: { lastOkAt?: string | null; failingSince?: string | null } | null): SourceMetaRecord {
  return {
    source: result.source,
    ok: result.ok,
    complete: result.complete,
    listings: result.listings.length,
    requests: result.requests,
    note: result.note,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    lastOkAt: result.ok ? result.finishedAt : previous?.lastOkAt ?? null,
    failingSince: result.ok ? null : previous?.failingSince ?? result.finishedAt,
  };
}

const sourceMetaKey = (source: CarSource): string => `uy-cars-source-${source}`;

export async function saveSourceMeta(result: CarSourceResult): Promise<SourceMetaRecord> {
  const key = sourceMetaKey(result.source);
  const previous = (await loadHarvestMeta(key)) as { lastOkAt?: string | null; failingSince?: string | null } | null;
  const record = sourceMetaRecord(result, previous);
  await CarHarvestMetaModel.updateOne({ key }, { $set: { updatedAt: result.finishedAt, data: record } }, { upsert: true });
  return record;
}

export async function loadSourceMetas(): Promise<Map<CarSource, { lastOkAt: string | null; ok: boolean }>> {
  const docs = await CarHarvestMetaModel.find({ key: { $regex: "^uy-cars-source-" } }).lean();
  const metas = new Map<CarSource, { lastOkAt: string | null; ok: boolean }>();
  for (const doc of docs) {
    const data = doc.data as Partial<SourceMetaRecord> | undefined;
    if (data?.source) metas.set(data.source, { lastOkAt: data.lastOkAt ?? null, ok: data.ok === true });
  }
  return metas;
}

const fbCollection = () => appConnection().collection(CarFbCardModel.collection.name);

export async function upsertFbCards(cards: readonly FbCard[], observedAt: string): Promise<void> {
  if (!cards.length) return;
  const collection = fbCollection();
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: 1 });
  for (let index = 0; index < cards.length; index += CHUNK) {
    await collection.bulkWrite(cards.slice(index, index + CHUNK).map(card => ({
      updateOne: {
        filter: { key: `fb-${card.id}` },
        update: { $set: { card, lastSeen: observedAt }, $setOnInsert: { key: `fb-${card.id}`, firstSeen: observedAt, item: null } },
        upsert: true,
      },
    })), { ordered: false });
  }
}

export async function saveFbItems(items: readonly FbItem[]): Promise<void> {
  if (!items.length) return;
  await fbCollection().bulkWrite(items.map(item => ({
    updateOne: { filter: { key: `fb-${item.id}` }, update: { $set: { item } } },
  })), { ordered: false });
}

export async function loadFbCards(since: string): Promise<Array<FbCard & { lastSeen: string; item: FbItem | null }>> {
  const docs = await fbCollection().find(
    { $or: [{ lastSeen: { $gte: since } }, { "item.readAt": { $gte: since } }] },
    { projection: { _id: 0 } },
  ).toArray();
  return docs.map(doc => ({ ...(doc.card as FbCard), lastSeen: String(doc.lastSeen), item: (doc.item as FbItem | null) ?? null }));
}

const FB_WANTED_KEY = "uy-cars-fb-wanted";

export async function loadFbWanted(): Promise<Set<string>> {
  const data = await loadHarvestMeta(FB_WANTED_KEY);
  return new Set(Array.isArray(data?.ids) ? (data!.ids as string[]) : []);
}

export async function saveFbWanted(ids: readonly string[], at: string): Promise<void> {
  await CarHarvestMetaModel.updateOne({ key: FB_WANTED_KEY }, { $set: { updatedAt: at, data: { ids: ids.slice(0, 500) } } }, { upsert: true });
}

/** Los veredictos de fotos, que son privados y viven al lado del aviso. */
export async function saveCarPhotoChecks(checks: ReadonlyMap<string, CarPhotoVerdict>): Promise<void> {
  if (!checks.size) return;
  await nativeReady();
  await listingsCollection().bulkWrite(
    [...checks].map(([key, photoCheck]) => ({ updateOne: { filter: { key }, update: { $set: { photoCheck } } } })),
    { ordered: false },
  );
}

export async function saveCarDetails(result: DetailFetchResult, now: string): Promise<void> {
  await nativeReady();
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

// A separate doc, never a nested field on "uy-cars": saveHarvestMeta() replaces that doc's whole
// `data` wholesale on every successful harvest, which would silently wipe a recorded refusal.
export async function saveRefusal(reason: string | null, at: string): Promise<void> {
  await CarHarvestMetaModel.updateOne({ key: "uy-cars-publish" }, { $set: { updatedAt: at, data: { reason, at } } }, { upsert: true });
}

export async function publishCarCatalog(rows: readonly PublicCarListing[], meta: PublicCarCatalogMeta): Promise<void> {
  if (!rows.length) throw new Error("refusing to publish an empty car catalog");
  const collection = appConnection().collection(CAR_CATALOG_COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ marketSlug: 1, year: -1 });
  await collection.createIndex({ brandSlug: 1, lastSeen: -1 });
  await collection.createIndex({ lastSeen: -1, firstSeen: -1 });
  await collection.createIndex({ priceUsd: 1 });
  await collection.createIndex({ source: 1, lastSeen: -1 });
  // "Menor consumo" sorts the whole catalogue by km per litre.
  await collection.createIndex({ "fuelEconomy.kmPerLiter": -1 });
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

/** El informe del mercado: agregados, sin una sola fila de aviso adentro. */
export async function saveCarReportSnapshot(snapshot: PublicCarReportSnapshot): Promise<void> {
  await CarReportSnapshotModel.updateOne(
    { key: "used" },
    { $set: { generatedAt: snapshot.generatedAt, snapshot } },
    { upsert: true },
  );
}

/** El tablero de precios con motivo. Se poda igual que el de oportunidades si no entra. */
export async function saveCarRiskSnapshot(snapshot: PublicCarRiskSnapshot): Promise<void> {
  let bounded = snapshot;
  while (Buffer.byteLength(JSON.stringify(bounded)) > MAX_SNAPSHOT_BYTES && bounded.items.length) {
    bounded = { ...bounded, items: bounded.items.slice(0, Math.floor(bounded.items.length * 0.8)) };
  }
  await CarRiskSnapshotModel.updateOne({ key: "used" }, { $set: { generatedAt: bounded.generatedAt, snapshot: bounded } }, { upsert: true });
}

export async function saveCarOpportunitySnapshot(snapshot: PublicCarOpportunitySnapshot): Promise<void> {
  let bounded = snapshot;
  while (Buffer.byteLength(JSON.stringify(bounded)) > MAX_SNAPSHOT_BYTES && bounded.items.length) {
    bounded = { ...bounded, items: bounded.items.slice(0, Math.floor(bounded.items.length * 0.8)) };
  }
  await CarOpportunitySnapshotModel.updateOne({ key: "used" }, { $set: { generatedAt: bounded.generatedAt, snapshot: bounded } }, { upsert: true });
}

const guideCollection = () => appConnection().collection(CarGuideEntryModel.collection.name);

export async function loadGuideEntries(): Promise<Map<string, CarGuideEntry>> {
  const rows = (await guideCollection().find({}, { projection: { _id: 0 } }).toArray()) as unknown as CarGuideEntry[];
  return new Map(rows.map(row => [row.key, row]));
}

export async function saveGuideEntries(entries: readonly CarGuideEntry[]): Promise<void> {
  if (!entries.length) return;
  const collection = guideCollection();
  await collection.createIndex({ key: 1 }, { unique: true });
  for (let index = 0; index < entries.length; index += CHUNK) {
    await collection.bulkWrite(entries.slice(index, index + CHUNK).map(entry => ({
      replaceOne: { filter: { key: entry.key }, replacement: { ...entry }, upsert: true },
    })), { ordered: false });
  }
}

/** The model-years the directory holds right now (any source), with how many adverts each has. */
export async function loadGuideTargets(now: Date, days = 21): Promise<CarGuideTarget[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  // Through the model, not the native collection: this is the first query of the guide job, and the
  // native aggregate() throws when the connection is not open yet (mongoose buffers only model calls).
  const rows = await CarListingModel.aggregate<{ _id: { brand: string; model: string; year: number }; count: number }>([
    { $match: { lastSeen: { $gte: cutoff }, retiredAt: null } },
    { $group: { _id: { brand: "$listing.brand", model: "$listing.model", year: "$listing.year" }, count: { $sum: 1 } } },
  ]);
  const targets = new Map<string, CarGuideTarget>();
  for (const row of rows) {
    const brandSlug = slugify(String(row._id.brand || ""));
    const modelSlug = slugify(String(row._id.model || ""));
    const year = Number(row._id.year);
    if (!brandSlug || !modelSlug || !Number.isInteger(year)) continue;
    const key = guideKey(brandSlug, modelSlug, year);
    const target = targets.get(key) ?? { brandSlug, modelSlug, year, listings: 0 };
    target.listings += row.count;
    targets.set(key, target);
  }
  return [...targets.values()];
}
