// The daily run's store listings, kept for the hourly run.
//
// `saveEquiparCatalog` replaces each item whole. The hourly `--fast` run skips every Fenicio store
// (one request per product page is fine daily, abusive hourly) and searches 24 terms instead of 80,
// so on its own it rebuilt every item from a thinner market than the daily run had just seen: the
// store offers the daily run found vanished for 23 hours a day and the bands swung every hour.
//
// So the daily run stores every store listing it published (after the unit guard) in ONE document,
// and the fast run merges it back before building the catalogue. Fresh listings always win; a
// snapshot row older than 36 hours is ignored, which covers one missed daily run and no more; and
// MercadoLibre and Marketplace never come from the snapshot — the hourly run reads those itself.
import type { RetailListing } from "../retail/types";

export const EQUIPAR_STORE_SNAPSHOT_KEY = "equipar-store-listings";

export const STORE_SNAPSHOT_MAX_AGE_MS = 36 * 3_600_000;

/**
 * A Mongo document stops at 16 MB. The daily run measures what it would write and refuses above
 * this, well short of the hard limit, rather than find out from a failed write.
 */
export const STORE_SNAPSHOT_MAX_BYTES = 12 * 1024 * 1024;

export const storeSnapshotBytes = (listings: readonly RetailListing[]): number =>
  Buffer.byteLength(JSON.stringify(listings));

export interface StoreSnapshotMerge {
  listings: RetailListing[];
  /** Snapshot rows added because the fresh run did not read them. */
  fromSnapshot: number;
  /** Snapshot rows older than {@link STORE_SNAPSHOT_MAX_AGE_MS}. */
  stale: number;
  /** Snapshot rows that are not store listings. */
  ignored: number;
}

export function mergeStoreSnapshot(
  fresh: readonly RetailListing[],
  snapshot: readonly RetailListing[] | null,
  nowMs: number
): StoreSnapshotMerge {
  if (!snapshot?.length) return { listings: [...fresh], fromSnapshot: 0, stale: 0, ignored: 0 };

  const seen = new Set(fresh.map((listing) => listing.listingId));
  const listings = [...fresh];
  let fromSnapshot = 0;
  let stale = 0;
  let ignored = 0;

  for (const listing of snapshot) {
    if (listing.source !== "store") {
      ignored++;
      continue;
    }
    if (seen.has(listing.listingId)) continue;
    const observed = Date.parse(listing.observedAt);
    if (!Number.isFinite(observed) || nowMs - observed > STORE_SNAPSHOT_MAX_AGE_MS) {
      stale++;
      continue;
    }
    seen.add(listing.listingId);
    listings.push(listing);
    fromSnapshot++;
  }

  return { listings, fromSnapshot, stale, ignored };
}
