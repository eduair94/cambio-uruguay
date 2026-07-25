// The published star rating.
//
// Four independent signals feed it and every one of them stays visible on the page, because a
// single number hides what it is made of: 900 MercadoLibre buyers and four Reddit comments are not
// the same evidence. Rules:
//
//   * Marketplace ratings are counted ONCE per catalogue product. Ten sellers listing the same
//     chair all show the same review pool; summing them would multiply one sample by ten.
//   * Every signal is shrunk toward 3.5 by its own sample size (Bayesian average). A chair with
//     one 5-star review does not outrank one with 400 reviews at 4.4.
//   * No evidence at all -> `stars: null`. The directory says "sin datos", it does not invent 3.5.
import type { ChairConfidence, ChairListing, ChairRatingSignal, ChairTierItem } from "./types";

/** Prior every signal is pulled toward, and how hard. */
const PRIOR_STARS = 3.5;
const PRIOR_WEIGHT = 8;

/** How much a signal counts once its own sample is big enough. */
const SOURCE_WEIGHT: Record<ChairRatingSignal["source"], number> = {
  reddit: 1.15,
  mercadolibre: 1,
  store: 0.7,
  expert: 0.9,
};

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Bayesian average: pulls a small sample toward the prior, leaves a large one alone. */
export const shrink = (mean: number, sampleSize: number): number =>
  (mean * sampleSize + PRIOR_STARS * PRIOR_WEIGHT) / (sampleSize + PRIOR_WEIGHT);

/**
 * Marketplace stars for one chair.
 *
 * `listings` is every listing of the same chair; the review pool is keyed by catalogue id so the
 * same pool is never counted twice. Listings with no catalogue id are keyed by their own id — an
 * independent seller's own reviews.
 */
export function mercadoLibreSignal(listings: readonly ChairListing[]): ChairRatingSignal | null {
  const pools = new Map<string, { rating: number; count: number }>();
  for (const listing of listings) {
    if (listing.rating === null || listing.ratingCount <= 0) continue;
    const key = listing.catalogId || listing.listingId;
    const existing = pools.get(key);
    // Same pool seen twice: keep the bigger sample rather than adding them up.
    if (!existing || listing.ratingCount > existing.count) {
      pools.set(key, { rating: listing.rating, count: listing.ratingCount });
    }
  }
  if (!pools.size) return null;

  let weighted = 0;
  let sample = 0;
  for (const pool of pools.values()) {
    weighted += pool.rating * pool.count;
    sample += pool.count;
  }
  if (!sample) return null;
  const mean = clamp(weighted / sample, 1, 5);
  return {
    source: "mercadolibre",
    stars: round1(clamp(shrink(mean, sample), 1, 5)),
    sampleSize: sample,
    weight: 0,
    detail: `${sample} reseña${sample === 1 ? "" : "s"} de compradores en Mercado Libre`,
  };
}

/** r/CharruaDevs consensus, converted from the tier list's 0-100 sentiment score. */
export function redditSignal(item: ChairTierItem | null | undefined): ChairRatingSignal | null {
  if (!item || item.sources <= 0) return null;
  const mean = clamp(1 + (item.score / 100) * 4, 1, 5);
  return {
    source: "reddit",
    stars: round1(clamp(shrink(mean, item.sources), 1, 5)),
    sampleSize: item.sources,
    weight: 0,
    detail: `${item.sources} opinion${item.sources === 1 ? "" : "es"} en r/CharruaDevs (${item.positive} a favor, ${item.negative} en contra)`,
  };
}

/** Owner reviews from the international chair subreddits, for models Uruguay barely discusses. */
export function globalSignal(input: {
  mentions: number;
  positive: number;
  negative: number;
  subs: string[];
} | null): ChairRatingSignal | null {
  if (!input || input.mentions <= 0) return null;
  const judged = input.positive + input.negative;
  if (!judged) return null;
  const mean = clamp(1 + (input.positive / judged) * 4, 1, 5);
  return {
    source: "expert",
    stars: round1(clamp(shrink(mean, judged), 1, 5)),
    sampleSize: judged,
    weight: 0,
    detail: `${judged} opiniones de usuarios en ${input.subs.map((sub) => `r/${sub}`).join(", ")}`,
  };
}

/** Ratings published by the store itself (product review widgets). */
export function storeSignal(input: { rating: number; count: number; seller: string } | null): ChairRatingSignal | null {
  if (!input || input.count <= 0) return null;
  const mean = clamp(input.rating, 1, 5);
  return {
    source: "store",
    stars: round1(clamp(shrink(mean, input.count), 1, 5)),
    sampleSize: input.count,
    weight: 0,
    detail: `${input.count} reseña${input.count === 1 ? "" : "s"} en ${input.seller}`,
  };
}

export interface ChairRating {
  stars: number | null;
  ratingCount: number;
  signals: ChairRatingSignal[];
  confidence: ChairConfidence;
}

/**
 * Combines the signals. Each one's influence is its configured weight times a saturating function
 * of its sample size, so a 3-comment signal never outvotes a 300-review one — and the resulting
 * share is written back into `weight` so the page can show exactly how the number was formed.
 */
export function combineChairRating(signals: Array<ChairRatingSignal | null>): ChairRating {
  const present = signals.filter((signal): signal is ChairRatingSignal => Boolean(signal));
  if (!present.length) {
    return { stars: null, ratingCount: 0, signals: [], confidence: "low" };
  }

  const weights = present.map((signal) => {
    const saturation = signal.sampleSize / (signal.sampleSize + 10);
    return Math.max(0.01, SOURCE_WEIGHT[signal.source] * saturation);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const stars = present.reduce((sum, signal, index) => sum + signal.stars * (weights[index]! / total), 0);
  const ratingCount = present.reduce((sum, signal) => sum + signal.sampleSize, 0);

  const withWeights = present
    .map((signal, index) => ({ ...signal, weight: round1((weights[index]! / total) * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight);

  const confidence: ChairConfidence =
    ratingCount >= 40 && present.length >= 2 ? "high" : ratingCount >= 10 ? "medium" : "low";

  return {
    stars: round1(clamp(stars, 1, 5)),
    ratingCount,
    signals: withWeights,
    confidence,
  };
}
