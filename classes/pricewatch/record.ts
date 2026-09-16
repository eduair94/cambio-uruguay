// Daily price history per offer, fed by whatever job already reads a market (equipar, sillas, and
// whatever joins later). A later job (Plan D) needs to tell a real CyberLunes/Black Friday discount
// from list-price theatre by comparing an offer's price today against its own last ~60 days — that
// comparison only exists if a daily point per offer has been written since well before the season
// that needs it, which is why this starts recording now rather than when Plan D is built.
import { PricewatchOfferModel } from "../models/PricewatchOffer";
import type { RetailListing } from "../retail/types";
import type { PricewatchPoint } from "./types";

/**
 * Facebook Marketplace has no shelf price to discount against — every listing is a one-off private
 * ask — and a used item's price is whatever that seller decided today, not a markdown off a list
 * price either. Both are excluded regardless of source. A listing worth $0 or with no url to revisit
 * is not an observable offer.
 */
export function pricewatchEligible(listing: RetailListing): boolean {
  return listing.source !== "facebook" && listing.condition !== "used" && listing.price > 0 && !!listing.url;
}

const lit = (value: unknown): { $literal: unknown } => ({ $literal: value });

/**
 * Same semantics as the Mongo update pipeline in {@link pricewatchOperation}, in plain JS, so the
 * recompute logic is testable without a database: drop any existing point for `point.d` (a resync
 * within the same day replaces it, never duplicates it), append the fresh point, and keep only the
 * newest `maxPoints` entries.
 */
export function applyHistory(
  history: PricewatchPoint[] | undefined,
  point: PricewatchPoint,
  maxPoints = 120
): PricewatchPoint[] {
  const rest = (history ?? []).filter((entry) => entry.d !== point.d);
  return [...rest, point].slice(-maxPoints);
}

export interface PricewatchUpdateOp {
  updateOne: {
    filter: { listingId: string };
    update: object[];
    upsert: true;
  };
}

/**
 * Builds the update PIPELINE (an array, not a plain `$set` document) for one listing. A pipeline is
 * required because two fields depend on the document already in the database: `firstSeen` must
 * survive across runs (`$ifNull` against the existing field, only defaulted to `today` on insert)
 * and `history` is recomputed from the existing array via {@link applyHistory}'s Mongo-side twin.
 *
 * Every literal value is wrapped in `$literal`. Mongo update-pipeline `$set` reads any string
 * starting with "$" as a field path, not a value — and real titles start with a dollar sign
 * ("$ 4.500 Colchón 2 plazas"). Without the wrapper that row would silently write `undefined`.
 */
export function pricewatchOperation(
  listing: RetailListing,
  vertical: string,
  today: string,
  maxPoints = 120
): PricewatchUpdateOp {
  return {
    updateOne: {
      filter: { listingId: listing.listingId },
      update: [
        {
          $set: {
            listingId: lit(listing.listingId),
            vertical: lit(vertical),
            category: lit(listing.attributes.CATEGORY_SPEC ?? null),
            productKey: lit(listing.catalogId ? `ml:${listing.catalogId}` : null),
            source: lit(listing.source),
            sellerKey: lit(listing.sellerKey),
            sellerName: lit(listing.sellerName),
            title: lit(listing.title),
            url: lit(listing.url),
            currency: lit(listing.currency),
            firstSeen: { $ifNull: ["$firstSeen", today] },
            lastSeen: lit(today),
            history: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ["$history", []] },
                        cond: { $ne: ["$$this.d", today] },
                      },
                    },
                    [{ d: lit(today), p: lit(listing.price), lp: lit(listing.listPrice ?? null) }],
                  ],
                },
                -maxPoints,
              ],
            },
          },
        },
      ],
      upsert: true,
    },
  };
}

let indexesCreated = false;

/**
 * Records one price point per eligible listing for `today` (default: today, UTC date-only, matching
 * every other job's `today`). A listingId that repeats within the same harvest (the same offer
 * surfaced through two search terms in one run) keeps only its cheapest row — the point is an
 * identity's price for the day, not a log of every time it was seen.
 *
 * A failure here must never cost the caller its catalogue: callers wrap this in their own try/catch
 * (see sync_equipar.ts / sync_chairs.ts) rather than this function swallowing errors itself, so the
 * caller decides how loudly to log it.
 */
export async function recordPricewatch(
  listings: readonly RetailListing[],
  vertical: string,
  today: string = new Date().toISOString().slice(0, 10)
): Promise<{ written: number; skipped: number }> {
  const eligible = listings.filter(pricewatchEligible);

  const byListingId = new Map<string, RetailListing>();
  for (const candidate of eligible) {
    const existing = byListingId.get(candidate.listingId);
    if (!existing || candidate.price < existing.price) byListingId.set(candidate.listingId, candidate);
  }
  const deduped = [...byListingId.values()];

  // Created once per process, not once per call: a repeated createIndexes() is a no-op round trip
  // to Mongo on every run of an hourly job, forever.
  if (!indexesCreated) {
    await PricewatchOfferModel.createIndexes();
    indexesCreated = true;
  }

  const ops = deduped.map((listing) => pricewatchOperation(listing, vertical, today));
  const BATCH = 1000;
  for (let i = 0; i < ops.length; i += BATCH) {
    const batch = ops.slice(i, i + BATCH);
    await PricewatchOfferModel.bulkWrite(batch, { ordered: false });
  }

  return { written: ops.length, skipped: listings.length - ops.length };
}
