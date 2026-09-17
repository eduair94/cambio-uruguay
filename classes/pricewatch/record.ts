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
 * `productKeyOverride` is additive, for callers whose listings rarely carry an ML `catalogId` at all
 * (most celulares listings, store or ML, never do) but do have their own way to name the underlying
 * product — see {@link recordPricewatch}'s own `productKeyFor` option, which is what actually
 * computes this value; this function just writes whatever it is handed. `undefined` (every existing
 * caller, which never passes a 5th argument) means "no override", preserving today's
 * `ml:<catalogId>`-or-`null` behaviour exactly. Passing `null` explicitly writes `productKey: null`
 * rather than falling back to the catalogId — a caller whose own identifier lookup failed for this
 * listing means "no product key", not "use the default one instead".
 *
 * Every literal value is wrapped in `$literal`. Mongo update-pipeline `$set` reads any string
 * starting with "$" as a field path, not a value — and real titles start with a dollar sign
 * ("$ 4.500 Colchón 2 plazas"). Without the wrapper that row would silently write `undefined`.
 */
export function pricewatchOperation(
  listing: RetailListing,
  vertical: string,
  today: string,
  maxPoints = 120,
  productKeyOverride?: string | null
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
            productKey: lit(
              productKeyOverride !== undefined ? productKeyOverride : listing.catalogId ? `ml:${listing.catalogId}` : null
            ),
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
                    [
                      {
                        d: lit(today),
                        p: lit(listing.price),
                        lp: lit(listing.listPrice ?? null),
                        // Plan D (analyze.ts) needs to know a point's own currency to refuse comparing
                        // a UYU price against a USD one from the same "offer" — a peso price recorded
                        // against a dollar history is not a discount, it's a unit mismatch.
                        c: lit(listing.currency),
                      },
                    ],
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

/** How long an offer nobody has seen again is kept. */
export const PRICEWATCH_RETENTION_DAYS = 180;

/**
 * Which documents of one vertical to delete: those whose `lastSeen` is older than `days` before
 * `today`. An offer unseen for half a year feeds no 60-day comparison, and without a prune the
 * collection grows forever with every listing that ever crossed a search. `lastSeen` is a
 * `YYYY-MM-DD` string, so a string `$lt` compares dates correctly and rides the
 * `{ vertical, lastSeen }` index. Scoped to the vertical: one job never prunes another's rows.
 */
export function pricewatchPruneFilter(
  vertical: string,
  today: string,
  days: number = PRICEWATCH_RETENTION_DAYS
): { vertical: string; lastSeen: { $lt: string } } {
  const cutoff = new Date(Date.parse(`${today}T00:00:00.000Z`) - days * 86_400_000).toISOString().slice(0, 10);
  return { vertical, lastSeen: { $lt: cutoff } };
}

let indexesCreated = false;

export interface RecordPricewatchOptions {
  /**
   * Overrides how `productKey` is computed, per listing, instead of the default `ml:<catalogId>`-or-
   * `null` — additive, and unused by any existing caller (equipar, chairs), whose listings are left
   * exactly as before. `sync_phones.ts` is the first consumer: a phone's identity comes from parsing
   * its title (`identifyPhone`), not from an ML catalog id most celulares listings never carry, so it
   * passes `(listing) => { const id = identifyPhone(...); return id ? \`phone:${id.key}\` : null; }`.
   * Returning `null` for a listing writes `productKey: null` for it, same as having no override at
   * all for a listing with no `catalogId` — it does NOT fall back to the catalogId-based default.
   */
  productKeyFor?: (listing: RetailListing) => string | null;
}

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
  today: string = new Date().toISOString().slice(0, 10),
  options?: RecordPricewatchOptions
): Promise<{ written: number; skipped: number; pruned: number }> {
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

  const ops = deduped.map((listing) =>
    pricewatchOperation(listing, vertical, today, 120, options?.productKeyFor ? options.productKeyFor(listing) : undefined)
  );
  const BATCH = 1000;
  for (let i = 0; i < ops.length; i += BATCH) {
    const batch = ops.slice(i, i + BATCH);
    await PricewatchOfferModel.bulkWrite(batch, { ordered: false });
  }

  // After the writes, so an offer seen again today has already moved its `lastSeen` forward and can
  // never be caught by its own prune.
  const { deletedCount } = await PricewatchOfferModel.deleteMany(pricewatchPruneFilter(vertical, today));

  return { written: ops.length, skipped: listings.length - ops.length, pruned: deletedCount ?? 0 };
}
