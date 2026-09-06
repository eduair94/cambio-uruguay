import { appConnection } from "../appdb";
import { buildSaleCatalog, type SaleCatalogInput } from "./project";
import type { PublicSaleCatalogMeta } from "./types";
import { PropertySaleListingModel } from "../models/PropertySaleListing";
import type { CasaswebSaleHarvest } from "./casasweb";
import { retainCasaswebDetail } from "./casasweb";
import type { OpportunityListing } from "../propertyopportunities/types";

export const SALE_CATALOG_COLLECTION = "propertysalecatalog";
export const SALE_CATALOG_META_COLLECTION = "propertysalecatalogmetas";

export interface CasaswebSaleReadMeta { key: "casasweb"; readAt: string; observed: number; complete: false }
export async function loadCasaswebSaleReadMeta(): Promise<CasaswebSaleReadMeta | null> {
  return await appConnection().collection("propertysalemetas").findOne({ key: "casasweb" }, { projection: { _id: 0 } }) as unknown as CasaswebSaleReadMeta | null;
}

export function casaswebHarvestRefusal(harvest: CasaswebSaleHarvest, now: string, previous: CasaswebSaleReadMeta | null): string | null {
  const captured = Date.parse(harvest.readAt), clock = Date.parse(now);
  if (!harvest.ok || harvest.operation !== "sale" || harvest.source !== "casasweb" || !Array.isArray(harvest.listings) || !harvest.listings.length ||
    !Number.isFinite(captured) || !Number.isFinite(clock) || captured > clock + 60_000 || clock - captured > 86_400_000) return "Invalid Casasweb sale capture";
  if (previous && previous.readAt > harvest.readAt) return "Newer Casasweb capture already stored";
  if (harvest.failedPages >= 3 && harvest.failedPages > harvest.pagesRequested * 0.2) return "Casasweb sale searches failed";
  if (previous && previous.observed > 100 && harvest.listings.length < previous.observed * 0.4) return "Casasweb sale coverage collapsed";
  const ids = new Set<string>();
  for (const row of harvest.listings) {
    if (row.operation !== "sale" || row.source !== "casasweb" || !/^sale:casasweb:\d{1,18}$/.test(row.id) || ids.has(row.id) ||
      !Number.isFinite(Date.parse(row.lastSeen)) || row.lastSeen.slice(0, 10) !== harvest.readAt.slice(0, 10) || harvest.unavailableIds.includes(row.id)) return "Conflicting Casasweb sale identities or dates";
    ids.add(row.id);
  }
  if (harvest.unavailableIds.some(id => !/^sale:casasweb:\d{1,18}$/.test(id))) return "Invalid Casasweb withdrawal ID";
  return null;
}

export async function saveCasaswebSaleHarvest(harvest: CasaswebSaleHarvest, now: string): Promise<void> {
  const refusal = casaswebHarvestRefusal(harvest, now, await loadCasaswebSaleReadMeta());
  if (refusal) throw new Error(refusal);
  const collection = appConnection().collection(PropertySaleListingModel.collection.name);
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: 1 });
  const originals = await collection.find({ id: { $in: harvest.listings.map(row => row.id) }, retiredAt: { $exists: false } }, { projection: { _id: 0, id: 1, listing: 1 }, maxTimeMS: 30_000 }).toArray();
  const previous = new Map(originals.map(row => [row.id as string, row.listing as OpportunityListing]));
  const listings = harvest.listings.map(row => retainCasaswebDetail(previous.get(row.id), row));
  for (let offset = 0; offset < listings.length; offset += 300) await collection.bulkWrite(listings.slice(offset, offset + 300).map(listing => ({
    updateOne: { filter: { id: listing.id }, update: {
      $set: { listing, lastSeen: listing.lastSeen }, $unset: { retiredAt: "" }, $setOnInsert: { firstSeen: listing.lastSeen },
    }, upsert: true },
  })), { ordered: true });
  if (harvest.unavailableIds.length) await collection.updateMany({ id: { $in: harvest.unavailableIds } }, { $set: { retiredAt: harvest.readAt } });
  await appConnection().collection("propertysalemetas").updateOne({ key: "casasweb" }, {
    $set: { readAt: harvest.readAt, observed: harvest.listings.length, complete: false },
  }, { upsert: true });
}

export function saleCatalogRefusal(next: PublicSaleCatalogMeta, previous: PublicSaleCatalogMeta | null): string | null {
  if (!Number.isFinite(Date.parse(next.generatedAt))) return "Invalid catalogue date";
  if (previous && next.generatedAt < previous.generatedAt) return "Newer catalogue already published";
  if (previous && previous.inputCount > 100 && next.inputCount < previous.inputCount * 0.4) return "Private input coverage collapsed";
  return null;
}

/** Public rows are generated only from own-advert inputs, never from an opportunity comparison. */
export async function publishSaleCatalog(inputs: readonly SaleCatalogInput[], now: string, usdUyu: number): Promise<PublicSaleCatalogMeta> {
  const { listings, meta } = buildSaleCatalog(inputs, now, usdUyu);
  const db = appConnection();
  const collection = db.collection(SALE_CATALOG_COLLECTION), metas = db.collection(SALE_CATALOG_META_COLLECTION);
  const previous = await metas.findOne({ key: "uy-sales" }, { projection: { _id: 0 } }) as unknown as PublicSaleCatalogMeta | null;
  const refusal = saleCatalogRefusal(meta, previous);
  if (refusal) throw new Error(`${refusal}; keeping the previous public sales catalogue`);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: -1 });
  await collection.createIndex({ department: 1, propertyType: 1, bedrooms: 1, lastSeen: -1 });
  await collection.createIndex({ department: 1, neighborhood: 1, propertyType: 1, lastSeen: -1 }, { collation: { locale: "es", strength: 1 } });
  await collection.createIndex({ neighborhood: 1, lastSeen: -1 });
  await collection.createIndex({ "price.currency": 1, "price.amount": 1 });
  await metas.createIndex({ key: 1 }, { unique: true });
  for (let offset = 0; offset < listings.length; offset += 300) {
    await collection.bulkWrite(listings.slice(offset, offset + 300).map(listing => ({
      replaceOne: { filter: { key: listing.key }, replacement: listing, upsert: true },
    })), { ordered: true });
  }
  // All private rows were read, not merely the latest harvest. Only invalid/expired public
  // projections are removed, after replacement rows succeeded. Private history is untouched.
  await collection.deleteMany({ key: { $nin: listings.map(row => row.key) } });
  await metas.replaceOne({ key: "uy-sales" }, meta, { upsert: true });
  return meta;
}
