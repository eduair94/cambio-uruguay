// The queue and the writes of currency-rentals-detail.
//
// Two collections: `rentalfacebookdetails` (private, one row per advert read, the audit trail) and
// `rentallistings` (public), which takes from a detail row ONLY the fields it lacked — a barrio,
// a department, a coordinate, the description — and only on a property that holds that single
// Facebook advert. Nothing here renews `lastSeen`, moves an advert, or touches another portal's
// row. Every write is a compare-and-set on the listingId and the offer count, so a harvest that
// ran in between wins.
import { appConnection } from "../appdb";
import { INE_DISPLAY_NAMES } from "../propertyzones/names";
import { RentalFacebookDetailModel, type RentalFacebookDetailDocument } from "../models/RentalFacebookDetail";
import { RentalListingModel } from "../models/RentalListing";
import { rentalOfferDetails } from "./details";
import { flatten } from "./normalize";

const listings = () => appConnection().collection(RentalListingModel.collection.name);
const details = () => appConnection().collection(RentalFacebookDetailModel.collection.name);

export interface DetailTarget {
  listingId: string;
  /** The Marketplace item id. */
  id: string;
  key: string;
  title: string;
  department: string;
  neighborhood: string;
  hasCoordinate: boolean;
  lastSeen: string;
}

/**
 * Who gets read first, given a budget: Montevideo (where a barrio changes the filter and the
 * neighbourhood data), then adverts without a barrio, then without a coordinate, freshest first.
 * Pure, so the order is testable without a database.
 */
export function prioritizeDetailTargets(rows: readonly DetailTarget[], alreadyRead: ReadonlySet<string>, budget: number): DetailTarget[] {
  const score = (row: DetailTarget): number =>
    (row.department === "Montevideo" ? 4 : 0) + (row.neighborhood ? 0 : 2) + (row.hasCoordinate ? 0 : 1);
  return rows
    .filter(row => !alreadyRead.has(row.listingId))
    .sort((a, b) => score(b) - score(a) || b.lastSeen.localeCompare(a.lastSeen) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}

/** Facebook adverts seen in the last `days` days whose item page has not been read. */
export async function facebookDetailTargets(now: Date, budget: number, days = 10): Promise<DetailTarget[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await listings()
    .find(
      { offers: { $elemMatch: { source: "facebook", lastSeen: { $gte: cutoff } } } },
      { projection: { key: 1, department: 1, neighborhood: 1, latitude: 1, longitude: 1, "offers.source": 1, "offers.listingId": 1, "offers.title": 1, "offers.lastSeen": 1 } },
    )
    .toArray();
  const targets: DetailTarget[] = [];
  for (const row of rows) {
    const offers: Array<Record<string, unknown>> = Array.isArray(row.offers) ? row.offers : [];
    if (offers.length !== 1) continue;
    const offer = offers[0]!;
    if (offer.source !== "facebook" || typeof offer.listingId !== "string") continue;
    const id = offer.listingId.replace(/^facebook:/, "");
    if (!/^\d{6,20}$/.test(id)) continue;
    targets.push({
      listingId: offer.listingId,
      id,
      key: String(row.key),
      title: String(offer.title || ""),
      department: String(row.department || ""),
      neighborhood: String(row.neighborhood || ""),
      hasCoordinate: typeof row.latitude === "number" && typeof row.longitude === "number",
      lastSeen: String(offer.lastSeen || ""),
    });
  }
  const read = await details().find({ listingId: { $in: targets.map(target => target.listingId) } }, { projection: { listingId: 1 } }).toArray();
  return prioritizeDetailTargets(targets, new Set(read.map(doc => String(doc.listingId))), budget);
}

export async function saveFacebookDetails(rows: readonly RentalFacebookDetailDocument[]): Promise<void> {
  if (!rows.length) return;
  await details().bulkWrite(rows.map(row => ({
    updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true },
  })), { ordered: false });
}

/** The stored detail rows for these adverts, by listingId. */
export async function loadFacebookDetails(listingIds: readonly string[]): Promise<Map<string, RentalFacebookDetailDocument>> {
  if (!listingIds.length) return new Map();
  const docs = await details().find({ listingId: { $in: [...listingIds] } }, { projection: { _id: 0 } }).toArray();
  return new Map(docs.map(doc => [String(doc.listingId), doc as unknown as RentalFacebookDetailDocument]));
}

// --- Applying a detail to the stored property -------------------------------------------------

/** INE labels are composite ("Parque Batlle, Villa Dolores"); a named barrio agrees with any part. */
const INE_PARTS = new Set(Object.values(INE_DISPLAY_NAMES).flatMap(label => label.split(", ")).map(flatten));

/**
 * Whether a point contradicts the barrio the advert named: only when the name is an INE barrio
 * (an official area we can test against) and the point sits in a DIFFERENT INE barrio. An
 * advertised name outside the INE list ("Goes", "Pocitos Nuevo") cannot contradict anything.
 */
/**
 * The barrio to show for a point when the text named none: the INE area the point is in, by its
 * first label part ("Parque Batlle" out of "Parque Batlle, Villa Dolores"), which is a name the
 * portals actually advertise. Only Montevideo has these areas; elsewhere the answer is "".
 */
export function neighborhoodFromZoneLabel(zoneLabel: string | null): string {
  return (zoneLabel || "").split(", ")[0]?.trim() || "";
}

export function pointContradictsBarrio(neighborhood: string, zoneLabel: string | null): boolean {
  const name = flatten(neighborhood);
  if (!name || !INE_PARTS.has(name) || !zoneLabel) return false;
  return !zoneLabel.split(", ").some(part => flatten(part) === name);
}

export interface StoredFacebookRow {
  key: string;
  department?: string;
  neighborhood?: string;
  latitude?: number | null;
  longitude?: number | null;
  offers?: Array<{
    source?: string;
    listingId?: string;
    image?: string | null;
    identity?: { version?: number; description?: string; neighborhood?: string; department?: string; latitude?: number | null; longitude?: number | null };
    details?: { description?: string };
  }>;
}

/**
 * The `$set` that brings a detail into its property, or null when there is nothing to add. Only
 * empty fields are filled; a value the harvest already established is never overwritten.
 */
export function facebookDetailUpdate(row: StoredFacebookRow, detail: RentalFacebookDetailDocument): Record<string, unknown> | null {
  const offers = Array.isArray(row.offers) ? row.offers : [];
  if (offers.length !== 1) return null;
  const offer = offers[0]!;
  if (offer.source !== "facebook" || offer.listingId !== detail.listingId) return null;
  const identity = offer.identity;
  if (!identity || identity.version !== 1) return null;
  const set: Record<string, unknown> = {};
  if (detail.description && !offer.details?.description) {
    set["offers.0.details"] = rentalOfferDetails({ description: detail.description, images: offer.image ? [offer.image] : [] });
    if (!identity.description) set["offers.0.identity.description"] = detail.description;
  }
  if (!row.neighborhood && detail.neighborhood) {
    set.neighborhood = detail.neighborhood;
    set["offers.0.identity.neighborhood"] = detail.neighborhood;
  }
  if (!row.department && detail.department) {
    set.department = detail.department;
    set["offers.0.identity.department"] = detail.department;
  }
  if (typeof row.latitude !== "number" && typeof detail.latitude === "number" && typeof detail.longitude === "number") {
    set.latitude = detail.latitude;
    set.longitude = detail.longitude;
    set["offers.0.identity.latitude"] = detail.latitude;
    set["offers.0.identity.longitude"] = detail.longitude;
  }
  return Object.keys(set).length ? set : null;
}

export async function applyFacebookDetails(rows: readonly RentalFacebookDetailDocument[]): Promise<{ candidates: number; written: number }> {
  const byListing = new Map(rows.filter(row => row.found).map(row => [row.listingId, row]));
  if (!byListing.size) return { candidates: 0, written: 0 };
  const stored = await listings()
    .find({ "offers.listingId": { $in: [...byListing.keys()] } }, { projection: { key: 1, department: 1, neighborhood: 1, latitude: 1, longitude: 1, offers: 1 } })
    .toArray();
  const writes: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> } }> = [];
  for (const doc of stored) {
    const row = doc as unknown as StoredFacebookRow;
    const listingId = row.offers?.[0]?.listingId;
    const detail = listingId ? byListing.get(listingId) : undefined;
    if (!detail) continue;
    const set = facebookDetailUpdate(row, detail);
    if (!set) continue;
    writes.push({ updateOne: {
      filter: { key: row.key, offers: { $size: 1 }, "offers.0.listingId": detail.listingId, "offers.0.identity.version": 1 },
      update: { $set: set },
    } });
  }
  if (!writes.length) return { candidates: stored.length, written: 0 };
  const result = await listings().bulkWrite(writes, { ordered: false });
  return { candidates: stored.length, written: result.modifiedCount };
}
