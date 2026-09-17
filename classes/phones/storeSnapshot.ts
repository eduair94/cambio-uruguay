// The daily run's store listings, kept for the hourly run — mirrors classes/equipar/storeSnapshot.ts
// exactly (same age cutoff, same size ceiling, same merge rules); only the constants' names/values
// changed to this vertical.
//
// `savePhoneCatalog` replaces each model whole (`$set`). The hourly `--fast` run skips every Fenicio
// store (7 of PHONE_STORE_KEYS' 9 stores — one request per product page is fine daily, abusive
// hourly) and searches 8 ML terms instead of 40, so on its own it would rebuild every model from a
// thinner market than the daily run had just seen: the store offers/bands the daily run found would
// vanish for 23 hours a day, and the whole-document `$set` would overwrite yesterday's good bands
// with ones built from MercadoLibre + Shopify + WooCommerce alone.
//
// So the daily run stores every store listing it published (after the unit guard) in ONE document,
// and the fast run merges it back before buildPhoneCatalog runs. Fresh listings always win; a
// snapshot row older than 36 hours is ignored, which covers one missed daily run and no more; and
// MercadoLibre and Marketplace never come from the snapshot — the hourly run reads those itself.
import type { RetailListing } from "../retail/types";

export const PHONE_STORE_SNAPSHOT_KEY = "celulares-uruguay";

export const PHONE_STORE_SNAPSHOT_MAX_AGE_MS = 36 * 3_600_000;

/**
 * A Mongo document stops at 16 MB. The daily run measures what it would write and refuses above
 * this, well short of the hard limit, rather than find out from a failed write.
 */
export const PHONE_STORE_SNAPSHOT_MAX_BYTES = 12 * 1024 * 1024;

export const phoneStoreSnapshotBytes = (listings: readonly RetailListing[]): number =>
  Buffer.byteLength(JSON.stringify(listings));

/**
 * The listings as the snapshot stores them: without `attributes.DESCRIPTION`.
 *
 * Fenicio copies each product's whole description into that attribute, and it is most of what a
 * store listing weighs. Nothing downstream of the harvest reads it — the catalogue, the unit guard
 * and pricewatch read `CATEGORY_SPEC` only — so keeping it only brought the one document closer to
 * its size ceiling. New objects: the caller's listings are not mutated.
 */
export function phoneStoreSnapshotRows(listings: readonly RetailListing[]): RetailListing[] {
  return listings.map((listing) => {
    if (!listing.attributes || !("DESCRIPTION" in listing.attributes)) return listing;
    const { DESCRIPTION: _description, ...attributes } = listing.attributes;
    return { ...listing, attributes };
  });
}

export interface PhoneStoreSnapshotMerge {
  listings: RetailListing[];
  /** Snapshot rows added because the fresh run did not read them. */
  fromSnapshot: number;
  /** Snapshot rows older than {@link PHONE_STORE_SNAPSHOT_MAX_AGE_MS}. */
  stale: number;
  /** Snapshot rows that are not store listings. */
  ignored: number;
}

export function mergePhoneStoreSnapshot(
  fresh: readonly RetailListing[],
  snapshot: readonly RetailListing[] | null,
  nowMs: number
): PhoneStoreSnapshotMerge {
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
    if (!Number.isFinite(observed) || nowMs - observed > PHONE_STORE_SNAPSHOT_MAX_AGE_MS) {
      stale++;
      continue;
    }
    seen.add(listing.listingId);
    listings.push(listing);
    fromSnapshot++;
  }

  return { listings, fromSnapshot, stale, ignored };
}
