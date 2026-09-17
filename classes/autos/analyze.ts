// Which used cars ask noticeably less than the SAME car. The cohort is fixed BEFORE prices are
// looked at: same brand/model ids, year, version, engine and gearbox, km within max(20k, 30 %).
// Measured on 2,279 real adverts (2026-09-16): without version+engine the rule "found" 125 bargains
// that were a cheaper trim or a 4x2; with them, 11, all defensible by eye.
import { quantile } from "./stats";
import { engineOf, slugify, trimOf } from "./normalize";
import type { PublicCarOpportunityStats } from "./publicTypes";
import type { CarDetail, CarListing, CarTextFlag } from "./types";

export const CAR_OPPORTUNITY_POLICY = {
  freshDays: 2,
  kmToleranceRatio: 0.3,
  kmToleranceMin: 20_000,
  maximumPerSeller: 2,
  maximumComparables: 24,
  maximumGap: 0.45,
  detailMaxAgeHours: 72,
  detailKmTolerance: 0.01,
  maxItems: 2_000,
  strict: { minimumComparables: 8, minimumSellers: 4, maximumSpread: 0.3, minimumGap: 0.15, minimumConservativeGap: 0.05, minimumSellerSensitivityGap: 0.1 },
  exploratory: { minimumComparables: 5, minimumSellers: 3, maximumSpread: 0.3, minimumGap: 0.12, minimumConservativeGap: 0, minimumSellerSensitivityGap: 0.08 },
} as const;

export type CarTier = "strict" | "exploratory";

export interface CarSample {
  n: number;
  sellers: number;
  dealers: number;
  privates: number;
  p25: number;
  median: number;
  p75: number;
  spread: number;
  kmMedian: number;
  kmP75: number;
  gap: number;
  conservativeGap: number;
  sellerSensitivityGap: number;
}

export interface CarCandidate {
  subject: CarListing;
  tier: CarTier;
  sample: CarSample;
  comparables: CarListing[];
}

export interface CarAnalysis {
  accepted: CarCandidate[];
  needsDetail: string[];
  stats: PublicCarOpportunityStats;
}

const DAY = 86_400_000;
export const EXCLUDING_FLAGS: ReadonlySet<CarTextFlag> = new Set<CarTextFlag>(["damaged", "financing", "foreign_plate", "paperwork", "price_mismatch", "recovered"]);
const REFETCH = new Set(["detail_missing", "detail_stale", "detail_price_changed"]);
const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

export function exclusionReason(listing: CarListing, now: Date): string | null {
  const cutoff = now.getTime() - CAR_OPPORTUNITY_POLICY.freshDays * DAY;
  // Date.parse returns NaN for an unparseable date; NaN >= cutoff is false, so it falls through
  // to "stale" here rather than silently passing as fresh.
  if (!(Date.parse(listing.lastSeen) >= cutoff)) return "stale";
  if (listing.priceConverted) return "not_usd";
  // A deduced currency is good enough to list a car, never to call it cheap.
  if (listing.currencyInferred) return "currency_inferred";
  if (listing.priceUsd < 1_000 || listing.priceUsd > 500_000) return "implausible_price";
  if (listing.kmQuality !== "ok") return `km_${listing.kmQuality}`;
  const flag = listing.flags.find(item => EXCLUDING_FLAGS.has(item));
  if (flag) return `flag_${flag}`;
  if (!listing.transmission) return "no_transmission";
  if (!listing.trim) return "no_trim";
  if (!listing.engine) return "no_engine";
  return null;
}

const sellerOf = (listing: CarListing): string => listing.sellerId ?? listing.key;
const cohortKey = (listing: CarListing): string =>
  [listing.brandId, listing.modelId, listing.year, listing.trim, listing.engine, listing.transmission].join("|");

function possibleCopy(a: CarListing, b: CarListing): boolean {
  if (a.id === b.id) return true;
  return !!a.sellerId && a.sellerId === b.sellerId && a.year === b.year &&
    Math.abs(a.km! - b.km!) <= Math.max(1, a.km! * 0.01) && Math.abs(a.priceUsd - b.priceUsd) <= a.priceUsd * 0.01;
}

/**
 * Collapses possibleCopy clusters among CANDIDATE peers (not just copies of the subject): when two
 * peers are copies of each other, only the one with the lowest key survives. Processing candidates
 * in ascending key order and greedily keeping an item unless it copies one already kept achieves
 * this without needing a full union-find, since a repost pair is always directly close to itself.
 */
function dedupeCopies(peers: readonly CarListing[]): CarListing[] {
  const sorted = [...peers].sort((a, b) => a.key.localeCompare(b.key));
  const kept: CarListing[] = [];
  for (const peer of sorted) {
    if (!kept.some(existing => possibleCopy(existing, peer))) kept.push(peer);
  }
  return kept;
}

export function comparablesFor(subject: CarListing, pool: readonly CarListing[]): CarListing[] {
  const policy = CAR_OPPORTUNITY_POLICY;
  const tolerance = Math.max(policy.kmToleranceMin, subject.km! * policy.kmToleranceRatio);
  const candidates = pool.filter(peer => peer.key !== subject.key &&
    // No seller id means no leave-one-seller-out coverage and no repost detection: it cannot enter
    // the sample (the subject itself may still lack one; only comparables are excluded here).
    peer.sellerId !== null &&
    (!peer.fuel || !subject.fuel || peer.fuel === subject.fuel) &&
    Math.abs(peer.km! - subject.km!) <= tolerance &&
    !possibleCopy(subject, peer));
  const perSeller = new Map<string, number>();
  return dedupeCopies(candidates)
    .sort((a, b) => Math.abs(a.km! - subject.km!) - Math.abs(b.km! - subject.km!) || a.key.localeCompare(b.key))
    .filter(peer => {
      const seller = sellerOf(peer);
      const used = perSeller.get(seller) ?? 0;
      if (used >= policy.maximumPerSeller) return false;
      perSeller.set(seller, used + 1);
      return true;
    })
    .slice(0, policy.maximumComparables);
}

function measure(subject: CarListing, sample: readonly CarListing[]): Omit<CarSample, "sellerSensitivityGap"> {
  const prices = sample.map(peer => peer.priceUsd);
  const kms = sample.map(peer => peer.km!);
  const median = quantile(prices, 0.5);
  const p25 = quantile(prices, 0.25);
  const p75 = quantile(prices, 0.75);
  return {
    n: sample.length,
    sellers: new Set(sample.map(sellerOf)).size,
    dealers: sample.filter(peer => peer.sellerType === "dealer").length,
    privates: sample.filter(peer => peer.sellerType === "private").length,
    p25,
    median,
    p75,
    spread: round6((p75 - p25) / median),
    kmMedian: quantile(kms, 0.5),
    kmP75: quantile(kms, 0.75),
    gap: round6(1 - subject.priceUsd / median),
    conservativeGap: round6(1 - subject.priceUsd / p25),
  };
}

/** Leave-one-seller-out: the gap must survive removing any single seller's adverts. */
export function sampleFor(subject: CarListing, comparables: readonly CarListing[]): CarSample {
  const base = measure(subject, comparables);
  let sensitivity = base.gap;
  for (const seller of new Set(comparables.map(sellerOf))) {
    const rest = comparables.filter(peer => sellerOf(peer) !== seller);
    if (rest.length >= 3) sensitivity = Math.min(sensitivity, measure(subject, rest).gap);
  }
  return { ...base, sellerSensitivityGap: sensitivity };
}

export function tierFor(subject: CarListing, sample: CarSample): CarTier | "review" | null {
  const policy = CAR_OPPORTUNITY_POLICY;
  if (sample.gap > policy.maximumGap) return "review";
  if (subject.km! > sample.kmP75) return null;
  for (const name of ["strict", "exploratory"] as const) {
    const tier = policy[name];
    if (sample.n >= tier.minimumComparables && sample.sellers >= tier.minimumSellers &&
      sample.spread <= tier.maximumSpread && sample.gap >= tier.minimumGap &&
      sample.conservativeGap >= tier.minimumConservativeGap &&
      sample.sellerSensitivityGap >= tier.minimumSellerSensitivityGap) return name;
  }
  return null;
}

/** The advert's own page must still describe the same car, price and km, and nothing disqualifying. */
export function detailVerdict(subject: CarListing, detail: CarDetail | undefined, now: Date, trims: readonly string[]): string | null {
  const policy = CAR_OPPORTUNITY_POLICY;
  if (!detail) return "detail_missing";
  const cutoff = now.getTime() - policy.detailMaxAgeHours * 3_600_000;
  if (!(Date.parse(detail.readAt) >= cutoff)) return "detail_stale";
  // An ended advert must not keep being re-fetched even if its last-seen price also drifted.
  if (!detail.active) return "detail_inactive";
  if (detail.price !== subject.price || detail.currency !== subject.currency) return "detail_price_changed";
  if (!detail.brand || slugify(detail.brand) !== subject.brandSlug) return "detail_mismatch";
  if (!detail.model || slugify(detail.model) !== subject.modelSlug) return "detail_mismatch";
  if (detail.year !== subject.year) return "detail_mismatch";
  if (detail.km === null || Math.abs(detail.km - subject.km!) > Math.max(1, subject.km! * policy.detailKmTolerance)) return "detail_mismatch";
  if (detail.version) {
    const pageTrim = trimOf(detail.version, trims);
    if (pageTrim && pageTrim !== subject.trim) return "detail_trim_mismatch";
    const pageEngine = engineOf(detail.version);
    if (pageEngine && subject.engine && pageEngine.replace("T", "") !== subject.engine.replace("T", "")) return "detail_engine_mismatch";
  }
  if (detail.flags.length) return `detail_flag_${detail.flags[0]}`;
  return null;
}

const bump = (bag: Record<string, number>, key: string): void => {
  bag[key] = (bag[key] ?? 0) + 1;
};

export function analyzeCars(
  listings: readonly CarListing[],
  options: { now: Date; details: ReadonlyMap<string, CarDetail>; vocabularies: ReadonlyMap<string, readonly string[]> },
): CarAnalysis {
  const stats: PublicCarOpportunityStats = {
    input: listings.length, eligible: 0, analyzed: 0, candidates: 0, verified: 0, strict: 0, exploratory: 0, review: 0,
    excluded: {}, rejectedByDetail: {},
  };
  const eligible = [...listings]
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter(listing => {
      const reason = exclusionReason(listing, options.now);
      if (reason) bump(stats.excluded, reason);
      return !reason;
    });
  stats.eligible = eligible.length;
  const groups = new Map<string, CarListing[]>();
  for (const listing of eligible) {
    const key = cohortKey(listing);
    const group = groups.get(key);
    if (group) group.push(listing);
    else groups.set(key, [listing]);
  }
  const accepted: CarCandidate[] = [];
  const refetch: CarCandidate[] = [];
  for (const subject of eligible) {
    const comparables = comparablesFor(subject, groups.get(cohortKey(subject)) ?? []);
    if (comparables.length < CAR_OPPORTUNITY_POLICY.exploratory.minimumComparables) continue;
    stats.analyzed++;
    const sample = sampleFor(subject, comparables);
    const tier = tierFor(subject, sample);
    if (tier === "review") {
      stats.review++;
      continue;
    }
    if (!tier) continue;
    stats.candidates++;
    const trims = options.vocabularies.get(`${subject.brandId}|${subject.modelId}`) ?? [];
    const verdict = detailVerdict(subject, options.details.get(subject.key), options.now, trims);
    if (verdict) {
      bump(stats.rejectedByDetail, verdict);
      if (REFETCH.has(verdict)) refetch.push({ subject, tier, sample, comparables });
      continue;
    }
    stats.verified++;
    stats[tier]++;
    accepted.push({ subject, tier, sample, comparables });
  }
  const order = (a: CarCandidate, b: CarCandidate): number =>
    (a.tier === b.tier ? 0 : a.tier === "strict" ? -1 : 1) || b.sample.gap - a.sample.gap || a.subject.key.localeCompare(b.subject.key);
  return {
    accepted: accepted.sort(order).slice(0, CAR_OPPORTUNITY_POLICY.maxItems),
    needsDetail: refetch.sort(order).map(candidate => candidate.subject.key),
    stats,
  };
}
