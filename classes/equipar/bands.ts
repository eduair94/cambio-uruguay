// Price bands, and the two rules that keep them honest.
//
// 1. New and used are NEVER pooled. They are different markets with different guarantees: a used
//    fridge at a quarter of retail is a real option, and averaging it into "what a fridge costs"
//    produces a number that describes neither market.
//
// 2. A saving is only published when BOTH sides cleared the sample floor. "38% cheaper used",
//    computed from three Marketplace posts, is a number we invented — and it would be the headline.
import { articleBand, percentile, priceVerdict } from "../precios/plausibility";
import type { EquiparBand, EquiparOffer } from "./types";

/** Below this, a band describes noise. Same floor the supermarket index uses. */
export const MIN_BAND_SAMPLE = 8;

/**
 * The used market is genuinely thinner than retail — one Marketplace search answers where sixteen
 * storefronts do — so its floor is lower. Five posts is still a signal; two is a coincidence.
 */
export const MIN_USED_BAND_SAMPLE = 5;

export function bandOf(
  pricesUyu: readonly number[],
  minSample: number = MIN_BAND_SAMPLE
): EquiparBand | null {
  const sorted = pricesUyu.filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (sorted.length < minSample) return null;
  return {
    p25: Math.round(percentile(sorted, 0.25)),
    median: Math.round(percentile(sorted, 0.5)),
    p75: Math.round(percentile(sorted, 0.75)),
    min: Math.round(sorted[0]!),
    n: sorted.length,
  };
}

export interface ScreenedOffers {
  kept: EquiparOffer[];
  /**
   * Rows under p10/2 of their own category. They are NOT deleted — we do not know that a price is
   * impossible, only that it is far enough from its own distribution to be worth doubting — but
   * they never lead a "cheapest" ranking. This is the same verdict the supermarket index uses, and
   * it exists because the $18,50 row that survives a crude band is exactly the row that wins.
   */
  suspect: EquiparOffer[];
}

/**
 * Drops the impossible and flags the doubtful, using the distribution of the item ITSELF.
 *
 * A fixed multiplier cannot work here: the real spread of a sartén is not the spread of a heladera,
 * and one factor either erases the cheap category or lets anything through in the expensive one.
 */
export function screen(offers: readonly EquiparOffer[]): ScreenedOffers {
  const band = articleBand(offers.map((offer) => offer.priceUyu));
  const kept: EquiparOffer[] = [];
  const suspect: EquiparOffer[] = [];
  for (const offer of offers) {
    const verdict = priceVerdict(offer.priceUyu, band);
    if (verdict === "reject") continue;
    if (verdict === "suspect") suspect.push(offer);
    else kept.push(offer);
  }
  return { kept, suspect };
}

/**
 * How much cheaper the used market is, against the NEW median. Null unless both sides have enough
 * observations to mean anything — the page then says so rather than showing a percentage.
 */
export function savingPct(newBand: EquiparBand | null, usedBand: EquiparBand | null): number | null {
  // Both bands existing already means new >= 8 and used >= 5 observations; there is no third floor
  // to apply here, and adding one would only hide comparisons that are already honest.
  if (!newBand || !usedBand) return null;
  if (usedBand.median >= newBand.median) return null;
  return Math.round(((newBand.median - usedBand.median) / newBand.median) * 100);
}
