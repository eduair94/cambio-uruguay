import { appConnection } from "../appdb";
import { PropertyOpportunitySnapshotModel } from "../models/PropertyOpportunitySnapshot";
import { PropertySaleListingModel } from "../models/PropertySaleListing";
import { RentalListingModel } from "../models/RentalListing";
import { RentalMetaModel } from "../models/RentalMeta";
import type { RentalMeta, RentalProperty } from "../rentals/types";
import type { OpportunityAnalysisResult, OpportunityListing, OpportunityOperation } from "./types";
import type { OpportunityCoverage, PropertyOpportunitySnapshot } from "./snapshotTypes";
import type { SaleHarvestResult } from "./sales";
import { OPPORTUNITY_POLICY } from "./analyze";
import type { SaleCatalogInput } from "../propertysales/project";

const CHUNK = 300;
const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;
const salesMeta = () => appConnection().collection("propertysalemetas");

export interface SaleReadMeta {
  key: "infocasas";
  readAt: string;
  coverage: OpportunityCoverage[];
}

export function salesCoverage(harvest: SaleHarvestResult): OpportunityCoverage[] {
  return [{
    source: "infocasas", observed: harvest.listings.length, lastRead: harvest.readAt,
    complete: harvest.complete, note: harvest.note,
  }];
}

export function validateSaleHarvest(harvest: SaleHarvestResult, now: string): void {
  const captured = Date.parse(harvest.readAt);
  const clock = Date.parse(now);
  if (!harvest.ok || harvest.operation !== "sale" || harvest.source !== "infocasas" ||
    !Array.isArray(harvest.listings) || !harvest.listings.length ||
    !Number.isFinite(captured) || !Number.isFinite(clock) || captured > clock + 60_000 ||
    clock - captured > 24 * 3_600_000) throw new Error("Sales harvest is missing, failed or too old to import");
  const ids = new Set<string>();
  if (harvest.unavailableIds?.some(id => !/^sale:infocasas:\d{1,18}$/.test(id))) throw new Error("Invalid withdrawn source ID");
  for (const row of harvest.listings) {
    if (row.operation !== "sale" || row.source !== "infocasas" ||
      !/^sale:infocasas:\d+$/.test(row.id) || ids.has(row.id) || harvest.unavailableIds?.includes(row.id) ||
      !Number.isFinite(Date.parse(row.lastSeen)) || row.lastSeen.slice(0, 10) !== harvest.readAt.slice(0, 10)) {
      throw new Error("Sales harvest contains conflicting operations, identities or observation dates");
    }
    ids.add(row.id);
  }
}

/** Existing archived rows must not disguise a failed new harvest as fresh coverage. */
export function saleHarvestRefusal(harvest: SaleHarvestResult, previous: SaleReadMeta | null): string | null {
  if (previous && previous.readAt > harvest.readAt) return "Refusing an older sales capture";
  const failures = harvest.coverage.failedPages;
  if (failures >= 3 && failures > harvest.coverage.pagesRequested * 0.2) return "Sales pages failed above the accepted rate";
  const observed = previous?.coverage.find(row => row.source === "infocasas")?.observed || 0;
  if (observed > 100 && harvest.listings.length < observed * 0.4) return "Sales harvest coverage collapsed";
  return null;
}

/** A bounded sample never proves that an unseen advert was withdrawn. */
export async function saveSaleHarvest(harvest: SaleHarvestResult, now: string): Promise<void> {
  validateSaleHarvest(harvest, now);
  const previousMeta = await loadSaleReadMeta();
  const refusal = saleHarvestRefusal(harvest, previousMeta);
  if (refusal) throw new Error(`${refusal}; keeping the previous sales capture metadata`);
  const saleCollection = appConnection().collection(PropertySaleListingModel.collection.name);
  await saleCollection.createIndex({ id: 1 }, { unique: true });
  await saleCollection.createIndex({ lastSeen: 1 });
  await salesMeta().createIndex({ key: 1 }, { unique: true });
  for (let offset = 0; offset < harvest.listings.length; offset += CHUNK) {
    await saleCollection.bulkWrite(harvest.listings.slice(offset, offset + CHUNK).map(listing => ({
      updateOne: {
        filter: { id: listing.id },
        update: { $set: { listing, lastSeen: listing.lastSeen }, $unset: { retiredAt: "" }, $setOnInsert: { firstSeen: listing.lastSeen } },
        upsert: true,
      },
    })), { ordered: true });
  }
  if (harvest.unavailableIds?.length) await saleCollection.updateMany({ id: { $in: harvest.unavailableIds } }, { $set: { retiredAt: harvest.readAt } });
  await salesMeta().updateOne({ key: "infocasas" }, {
    $set: { readAt: harvest.readAt, coverage: salesCoverage(harvest) },
  }, { upsert: true });
}

export async function loadSaleReadMeta(): Promise<SaleReadMeta | null> {
  return await salesMeta().findOne({ key: "infocasas" }, { projection: { _id: 0 } }) as unknown as SaleReadMeta | null;
}

export async function loadSaleListings(): Promise<OpportunityListing[]> {
  return (await loadSaleCatalogInputs()).map(row => row.listing);
}

/** firstSeen is the original own-advert observation, never the catalogue publication time. */
export async function loadSaleCatalogInputs(): Promise<SaleCatalogInput[]> {
  const rows = await appConnection().collection(PropertySaleListingModel.collection.name)
    .find({ retiredAt: { $exists: false } }, { projection: { _id: 0, listing: 1, firstSeen: 1 }, maxTimeMS: 30_000 }).toArray();
  return rows.map(row => ({ listing: row.listing as OpportunityListing, firstSeen: typeof row.firstSeen === "string" ? row.firstSeen : null }));
}

export async function loadRentalMarket(): Promise<{ rows: Pick<RentalProperty, "key" | "offers">[]; meta: RentalMeta | null }> {
  const rows = await RentalListingModel.find({ "offers.identity.version": 1 }).select({
    _id: 0, key: 1, "offers.identity": 1, "offers.source": 1, "offers.listingId": 1,
    "offers.title": 1, "offers.url": 1, "offers.image": 1, "offers.sellerName": 1,
    "offers.price": 1, "offers.currency": 1, "offers.commonExpenses": 1, "offers.commonExpensesCurrency": 1,
    "offers.lastSeen": 1, "offers.publishedAt": 1, "offers.parkingSpaces": 1, "offers.furnished": 1,
    "offers.details.description": 1, "offers.details.builtArea": 1, "offers.details.totalArea": 1,
    "offers.details.landArea": 1, "offers.details.amenities": 1,
  }).maxTimeMS(30_000).lean() as unknown as Pick<RentalProperty, "key" | "offers">[];
  const meta = await RentalMetaModel.findOne({ key: "uy-rentals" }).lean() as unknown as RentalMeta | null;
  return { rows, meta };
}

export function rentalCoverage(
  meta: RentalMeta | null,
  listings: readonly Pick<OpportunityListing, "id" | "source" | "lastSeen">[],
  now: string,
): OpportunityCoverage[] {
  const today = Math.floor(Date.parse(now) / 86_400_000);
  const sources = new Set([...(meta?.sources || []).map(source => source.key), ...listings.map(row => row.source)]);
  return [...sources].flatMap(source => {
    const rows = listings.filter(row => {
      const day = Math.floor(Date.parse(row.lastSeen) / 86_400_000);
      return row.source === source && Number.isFinite(day) && day <= today && day >= today - OPPORTUNITY_POLICY.freshDays;
    });
    if (!rows.length) return [];
    return [{
      source, observed: new Set(rows.map(row => row.id)).size,
      lastRead: rows.map(row => row.lastSeen).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!,
      // A small hourly harvest does not replace the corpus; neither proves exhaustive coverage.
      complete: false,
      note: "Avisos residenciales con datos propios y lectura reciente presentes en el análisis, contados una sola vez por identificador. No equivale a viviendas únicas ni a cobertura de todo el mercado.",
    }];
  });
}

/** The sale comparison can have several input sources, regardless of the last harvested batch. */
export function saleAnalysisCoverage(listings: readonly OpportunityListing[], now: string): OpportunityCoverage[] {
  return rentalCoverage(null, listings.filter(row => row.operation === "sale"), now);
}

export function operationSnapshot(
  analysis: OpportunityAnalysisResult,
  operation: OpportunityOperation,
  sourceReadAt: string,
  coverage: OpportunityCoverage[],
): PropertyOpportunitySnapshot {
  return {
    version: analysis.version, algorithm: analysis.algorithm, operation,
    generatedAt: analysis.generatedAt, sourceReadAt, usdUyu: analysis.usdUyu,
    items: analysis.items.filter(item => item.subject.operation === operation),
    stats: analysis.stats[operation], coverage,
  };
}

export function snapshotRefusal(next: PropertyOpportunitySnapshot, previous: PropertyOpportunitySnapshot | null): string | null {
  if (!Number.isFinite(Date.parse(next.generatedAt)) || !Number.isFinite(Date.parse(next.sourceReadAt))) return "Invalid snapshot dates";
  if (next.items.some(item => item.subject.operation !== next.operation)) return "Mixed operations";
  if (Buffer.byteLength(JSON.stringify(next), "utf8") > MAX_SNAPSHOT_BYTES) return "Snapshot exceeds the storage budget";
  if (previous && next.generatedAt < previous.generatedAt) return "Newer analysis already exists";
  if (previous && previous.stats.input > 100 && next.stats.input < previous.stats.input * 0.4) return "Input coverage collapsed";
  return null;
}

/** One atomic document per operation: readers never see half a ranked result set. */
export async function saveOpportunitySnapshot(snapshot: PropertyOpportunitySnapshot): Promise<void> {
  const previous = await PropertyOpportunitySnapshotModel.findOne({ key: snapshot.operation }).select({ snapshot: 1 }).lean();
  const refusal = snapshotRefusal(snapshot, previous?.snapshot || null);
  if (refusal) throw new Error(`[${snapshot.operation}] ${refusal}; keeping previous analysis`);
  await appConnection().collection(PropertyOpportunitySnapshotModel.collection.name).createIndex({ key: 1 }, { unique: true });
  await PropertyOpportunitySnapshotModel.updateOne({ key: snapshot.operation }, {
    $set: { generatedAt: snapshot.generatedAt, snapshot },
  }, { upsert: true });
}
