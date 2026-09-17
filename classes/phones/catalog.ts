// From a pile of retail listings to one row per phone MODEL — brand, family and storage — with a
// price band per CONDITION, never mixed.
//
// classes/equipar/catalog.ts (and its classes/equipar/bands.ts) is the house style this mirrors:
// group listings into an identity, screen each condition's prices against its OWN distribution,
// publish a band only once there is enough of a sample to mean something. Two things differ here
// on purpose:
//   - Storage is part of the model's own IDENTITY, not a variant of it. A 128 GB and a 256 GB
//     iPhone 17 Pro are two different products at two genuinely different prices — merging them
//     would average two real markets into a number that describes neither, the same lesson
//     PRECIOS.md/EQUIPAR.md already encode for "nuevo y usado nunca se promedian", just on a
//     different axis (identifyPhone, Task 1, already bakes this into `identity.key`).
//   - A phone model rarely clears enough offers for classes/precios/plausibility.ts's own
//     MIN_BAND_SAMPLE (8, tuned for a SIPC article with ~350 rows in one scrape). Percentile
//     screening alone would leave almost every model without a band at all, so a SEPARATE, absolute
//     floor/ceiling backstops the cases a tiny sample can't statistically catch — see
//     PHONE_NEW_FLOOR_UYU/PHONE_NEW_CEILING_UYU below.
//
// Defense in depth, not a replacement for it: `classes/retail/unitGuard.ts` (`applyUnitGuard`)
// already runs upstream, in the harvest job, comparing a whole STORE's MEDIAN price for a category
// against MercadoLibre's median for the same category and dropping the store's listings wholesale
// when they are >20x off — that catches a store-wide unit/currency mistake (a WooCommerce store
// that renders cents as pesos on every product). It does NOT catch a single mistitled or
// mis-parsed LISTING sitting inside an otherwise-honest store or ML sweep, which is exactly the
// shape a phone model sees far more often than equipar's fridges/mattresses do, at a fraction of
// the sample size: a case/funda whose title bundles a phone's model+storage (identify.ts's own
// bundle rule), a seller who fat-fingered a decimal point, or a currency mislabel on one row rather
// than a whole store. The guards below — absolute floor+ceiling, then an ambiguous-split check, then
// an ITERATIVE median-of-others ratio check (screenByMedianOfOthers, worst offer removed one at a
// time), then the percentile band on what is left — are what catches THAT. See
// screenByMedianOfOthers's own comment for why it has to be iterative rather than a single pass, and
// why it runs before priceVerdict, not after.
//
// One more limit, found on a later re-review and worth stating plainly: none of these guards can
// ARBITRATE between two roughly equal-sized clusters of prices — they are built to find the odd one
// out against a majority, and a `[40000, 41000, 42000, 90000, 91000, 92000]` group is not "three
// outliers next to three real offers", it is two co-equal populations (most likely two storage tiers
// an identify.ts gap merged onto one key) with no honest way to say which one is THE price. Forcing
// an answer would publish a number that describes only half the market and hide the other half
// entirely. findAmbiguousSplit (below) catches this shape BEFORE the per-offer guards run and
// abstains — no band, no offers, for that (model, condition) — rather than let the per-offer guards
// pick a side (see PhoneModel.ambiguousConditions).
import { percentile, priceVerdict } from "../precios/plausibility";
import type { PrecioBand } from "../precios/plausibility";
import { identifyPhone, phoneConditionFromTitle } from "./identify";
import type { PhoneBrand, PhoneCondition, PhoneIdentity } from "./types";
import type { RetailListing } from "../retail/types";
import type { RetailSourceRun } from "../retail/harvest";

export interface PhoneOffer {
  seller: string;
  sellerKey: string;
  source: "store" | "mercadolibre";
  officialStore: boolean;
  title: string;
  url: string;
  price: number;
  currency: "UYU" | "USD";
  priceUyu: number;
  listPrice: number | null;
  condition: PhoneCondition;
  esimOnly: boolean;
  observedAt: string;
}

export interface PhoneBand {
  /** All four in whole UYU (Math.round) — a fractional peso is never a real price to publish. */
  min: number;
  p25: number;
  median: number;
  p75: number;
  /**
   * Price observations that passed every screen (floor/ceiling, percentile band, leave-one-out
   * ratio) for this condition, counted BEFORE per-seller dedupe — several listings from the SAME
   * seller each count here if each individually passed. This is NOT a seller count: `n` can
   * legitimately be larger than `sellers` below. A page that wants to say "vendido en N tiendas"
   * (or any other "how many sellers" claim) must read `sellers` (or the model-level `newSellers`
   * for the new condition specifically) — never `n`.
   */
  n: number;
  /** Distinct normalized sellers (see `sellerIdentity`) among the `n` observations above. */
  sellers: number;
}

export interface PhoneModel {
  key: string;
  slug: string;
  brand: PhoneBrand;
  brandLabel: string;
  family: string;
  familyLabel: string;
  storageGb: number;
  name: string;
  image: string | null;
  /** One band per condition, never mixed — see the module comment. */
  bands: Partial<Record<PhoneCondition, PhoneBand>>;
  /** The cheapest offer per seller and condition; new first, then open-box, refurbished, used. Capped at 30. */
  offers: PhoneOffer[];
  /** Distinct sellers (normalized) with a NEW offer that passed screening. */
  newSellers: number;
  esimOnlySeen: boolean;
  /**
   * Offers removed by the absolute floor/ceiling, by priceVerdict (suspect or reject), or by the
   * median-of-others ratio check — see the guards below. Every drop counts here, not only the
   * merely-doubtful ones (contrast classes/equipar/bands.ts's own suspectDropped, which only counts
   * its "suspect" bucket and silently ignores "reject"). Does NOT include ambiguousDropped below —
   * those offers were never individually judged bad, the whole condition group was abstained on.
   */
  suspectDropped: number;
  /**
   * Offers withheld because their (model, condition) group looked like TWO co-equal populations
   * merged onto one key (typically two storage tiers an identify.ts false-positive collapsed
   * together) rather than one population with an outlier — see findAmbiguousSplit. Counted
   * separately from suspectDropped on purpose: nothing here was judged individually implausible,
   * the group as a whole was too ambiguous to arbitrate.
   */
  ambiguousDropped: number;
  /**
   * Which conditions this run abstained on (empty when none). An array, not a single boolean,
   * because a model can have an ambiguous NEW cluster while its used/refurbished market is perfectly
   * fine (or vice versa) — a page needs to know WHICH price to distrust, not just that something
   * somewhere is wrong.
   *
   * FOR TASK 7 (pages/sitemap): a model whose "new" condition is ambiguous and has no OTHER
   * publishable data (no other condition's band, no offers at all) must not be published — an empty
   * "new" band plus an empty page is worse than not existing. Check `ambiguousConditions.includes
   * ("new")` alongside the existing `bands`/`offers` emptiness checks before publishing a model or a
   * sitemap entry for it.
   */
  ambiguousConditions: PhoneCondition[];
  observedAt: string;
}

/**
 * Minimum price observations for a per-condition percentile band to mean anything.
 *
 * `classes/precios/plausibility.ts`'s own MIN_BAND_SAMPLE is 8, tuned for a SIPC article where ONE
 * scrape returns ~350 rows for the SAME article in the SAME run. A phone model rarely clears 8
 * offers in one condition across every Uruguayan store plus MercadoLibre combined — requiring 8
 * would leave almost every model band-less. 3 is the smallest sample percentile() can extract a
 * meaningful p10/p90 spread from without a single value deciding the whole band by itself.
 */
export const PHONE_MIN_BAND_SAMPLE = 3;

/**
 * Absolute floor for a NEW-condition offer, in UYU — a guard that runs REGARDLESS of sample size,
 * on top of (not instead of) the percentile screening above.
 *
 * Percentile screening needs company: a model with only one or two new offers never reaches
 * PHONE_MIN_BAND_SAMPLE, so `screeningBand` returns null and `priceVerdict` answers "ok"
 * unconditionally (see classes/precios/plausibility.ts — a null band never rejects anything). A
 * single mistitled listing — a case/funda whose title happens to bundle a phone model + storage
 * figure (identify.ts's own bundle rule, "Samsung Galaxy S25 256gb + Funda Silicona", reads that as
 * a phone by design) — would then become that model's ONLY, and therefore BEST, price with nothing
 * to compare it against.
 *
 * Set from the real cheapest NEW phones this identifier actually resolves (measured 16/9/2026,
 * docs/superpowers/plans/2026-09-16-celulares-titulos-muestra.txt): the cheapest in-scope-brand new
 * phone in the whole sample is a Honor Play10 at USD 132 (three separate listings, so not a
 * one-off typo), and the cheapest UYU-denominated one is a Motorola Moto G54 at UYU 6.500 (roughly
 * USD 160 at the sample's own implied rate). PHONE_NEW_FLOOR_UYU (2.400, ~USD 60 at ~40 UYU/USD)
 * sits at well under HALF of the cheapest real phone ever matched here, while still sitting above
 * what a bare case/funda/cargador lists for (the accessory titles this identifier rejects outright
 * don't even reach the catalogue, but a bundle-shaped one that slips past Task 1 would still be
 * priced like the accessory, not like a phone).
 */
export const PHONE_NEW_FLOOR_UYU = 2_400;

/**
 * Absolute floor for open-box/refurbished/used, in UYU — one shared floor for the three, lower than
 * PHONE_NEW_FLOOR_UYU on purpose.
 *
 * A used/refurbished unit of even the cheapest new model above can legitimately resell for well
 * under half its new price (an entry-level Android's secondary value drops fast), and the sample
 * has no genuine rock-bottom "usado" listing to anchor a tighter number to — the cheapest real
 * `usado` observed in the sample is a Galaxy A56 (a mid-range phone) at UYU 10.000, nowhere near a
 * floor case. Half of PHONE_NEW_FLOOR_UYU keeps the same margin below the cheapest real NEW phone
 * while staying clearly above an accessory's price.
 */
export const PHONE_USED_FLOOR_UYU = 1_200;

/**
 * Absolute ceiling for a NEW-condition offer, in UYU — the same "runs regardless of sample size"
 * idea as the floor, at the other end of the distribution. A single-offer model has no band
 * (n < PHONE_MIN_BAND_SAMPLE) and priceVerdict answers "ok" unconditionally, so a currency mislabel
 * that turns a genuine USD ~2.200 phone into a UYU 2.200.000 "price" (the raw number carried over
 * with the wrong unit — a real class of bug, see classes/retail/unitGuard.ts's own history) would
 * otherwise become that model's ONLY, and therefore headline, price with nothing to compare it to.
 *
 * Set from the most expensive real NEW phone in the sample (measured 16/9/2026,
 * docs/superpowers/plans/2026-09-16-celulares-titulos-muestra.txt): an Apple iPhone 17 Pro at
 * USD 2.499 (list, not an outlier — a second listing prices the 512 GB variant at USD 2.299). Three
 * times that (~USD 7.500, comfortably above even a 2 TB Pro Max at Apple's own US list price of
 * USD 2.499 plus a healthy Uruguayan import margin) converts to UYU 300.000 at ~40 UYU/USD — the
 * same implied rate PHONE_NEW_FLOOR_UYU's own comment uses.
 */
export const PHONE_NEW_CEILING_UYU = 300_000;

/**
 * Absolute ceiling for open-box/refurbished/used, in UYU — one shared ceiling for the three, lower
 * than PHONE_NEW_CEILING_UYU: a used/refurbished market realistically never prices ABOVE what the
 * same phone costs new, so it needs less headroom than the new ceiling does.
 *
 * Set the same way as the floor's non-new value: the most expensive real non-new phone in the
 * sample is a Reacondicionado Apple iPhone 16 Pro Max at USD 1.749. Three times that
 * (~USD 5.250) converts to roughly UYU 210.000 at ~40 UYU/USD.
 */
export const PHONE_USED_CEILING_UYU = 210_000;

const floorFor = (condition: PhoneCondition): number => (condition === "new" ? PHONE_NEW_FLOOR_UYU : PHONE_USED_FLOOR_UYU);
const ceilingFor = (condition: PhoneCondition): number => (condition === "new" ? PHONE_NEW_CEILING_UYU : PHONE_USED_CEILING_UYU);

/** new, then open-box, then refurbished, then used — never by price across conditions. */
const CONDITION_RANK: Record<PhoneCondition, number> = { new: 0, "open-box": 1, refurbished: 2, used: 3 };

const toUyu = (price: number, currency: "UYU" | "USD", usdUyu: number): number =>
  Math.round(currency === "USD" ? price * usdUyu : price);

/**
 * Every ML listing without a real seller id or name comes back tagged `ml:unknown` by
 * `mlSellerKey` (classes/retail/sources/mercadolibre.ts) — or, equivalently, with the literal
 * fallback display name "Mercado Libre", the same fallback that produces `ml:unknown` in the first
 * place. That is NOT one seller: it is however many anonymous ML listings happened to lack an id,
 * which for celulares routinely means MOST of a model's ML rows (measured across the dry runs).
 * Counting each as its own "seller" would inflate `newSellers`/`bands.*.sellers` with fake
 * competition and let a pile of near-duplicate anonymous rows dominate the dedupe/percentile step
 * below. They collapse into one shared bucket here. A store offer is untouched: `RETAIL_STORES`
 * gives every store its own registry key, so `sellerKey` already identifies a real, distinct seller.
 */
function sellerIdentity(source: "store" | "mercadolibre", sellerKey: string, sellerName: string): string {
  if (source === "mercadolibre" && (sellerKey === "ml:unknown" || sellerName.trim() === "Mercado Libre")) {
    return "ml:unknown";
  }
  return sellerKey;
}

/**
 * The same p10/p50/p90 percentile shape `articleBand` builds in classes/precios/plausibility.ts,
 * with PHONE_MIN_BAND_SAMPLE in place of that module's own MIN_BAND_SAMPLE (see its comment for
 * why 8 doesn't fit a phone model). `priceVerdict` itself doesn't care where the band came from —
 * reused unchanged, so a price outside p10/3–p90×3 (or under p10/2) is judged by the exact same
 * rule that already proved itself on the SIPC index and on `rate_audit`.
 */
function screeningBand(prices: readonly number[]): PrecioBand | null {
  const sorted = [...prices].sort((a, b) => a - b);
  if (sorted.length < PHONE_MIN_BAND_SAMPLE) return null;
  const p10 = percentile(sorted, 0.1);
  const p90 = percentile(sorted, 0.9);
  return { p10, p50: percentile(sorted, 0.5), p90, low: p10 / 3, high: p90 * 3, suspectBelow: p10 / 2, n: sorted.length };
}

/**
 * A gap at least this wide between two CONSECUTIVE sorted prices, with at least two offers on each
 * side of it, marks the group as ambiguous (see findAmbiguousSplit) rather than an outlier to screen
 * out. Controller ruling, from a re-review of 5d2abd6d: a real case is two storage tiers of the same
 * family colliding on one identify.ts key (a title parsing gap, not caught here — this module only
 * ever sees whatever key it is handed), typically 1.5-3x apart in Uruguayan retail. 1.8 sits below
 * that real range while comfortably above the spread a single honest market normally shows for one
 * product (see NEW_LOO_HIGH's own 2.5x ceiling for a single population — 1.8 triggers before that
 * even would, which is the point: this check runs BEFORE the per-offer screening below, not as a
 * backstop after it).
 */
const AMBIGUOUS_GAP_RATIO = 1.8;

/**
 * Is this (model, condition) group really TWO co-equal populations merged onto one key, rather than
 * one population with an outlier?
 *
 * The distinction matters because the guards below (screenByMedianOfOthers, priceVerdict) are built
 * to find the ODD ONE OUT against a majority — they have no way to arbitrate between two roughly
 * equal-sized clusters, and forcing an answer picks one arbitrarily (see screenByMedianOfOthers's own
 * "known remaining bias" comment for what "arbitrarily" looks like in practice: the cheaper cluster
 * tends to lose, for reasons that have nothing to do with which one is actually correct). A
 * `[40000, 41000, 42000, 90000, 91000, 92000]` group is not "three real offers and three outliers" —
 * it is two real markets (two storage tiers, most likely) that a title-parsing gap merged onto one
 * key, and publishing either cluster as THE price for this model would be inventing a fact this
 * module cannot support. Controller ruling: abstain instead of choosing.
 *
 * Finds the SINGLE largest ratio between two consecutive sorted prices (not every gap ≥ the
 * threshold — a group can have at most one genuine population split, and picking the largest is the
 * least surprising way to find it) and checks that it clears {@link AMBIGUOUS_GAP_RATIO} with at
 * least 2 offers on each side. A gap with only 1 offer on one side is a single outlier next to a
 * real cluster — exactly the ordinary case screenByMedianOfOthers already handles (see e.g. the
 * `[56000, 56500, 250000]` and `[55000, 58000, 120000]` tests, both of which have a ≥1.8x gap but a
 * 1-offer side, and neither is ambiguous). Needs at least 4 total offers by construction — 2 on each
 * side is the minimum a "population" can mean here.
 */
function findAmbiguousSplit(prices: readonly number[]): boolean {
  if (prices.length < 4) return false;
  const sorted = [...prices].sort((a, b) => a - b);
  let maxGapRatio = 1;
  let maxGapIndex = -1; // split: sorted[0..maxGapIndex] vs sorted[maxGapIndex+1..]
  for (let i = 0; i < sorted.length - 1; i++) {
    const ratio = sorted[i + 1]! / sorted[i]!;
    if (ratio > maxGapRatio) {
      maxGapRatio = ratio;
      maxGapIndex = i;
    }
  }
  if (maxGapIndex < 0 || maxGapRatio < AMBIGUOUS_GAP_RATIO) return false;
  const leftCount = maxGapIndex + 1;
  const rightCount = sorted.length - leftCount;
  return leftCount >= 2 && rightCount >= 2;
}

/**
 * Ratio thresholds for the leave-one-out guard below. NEW is tighter than the rest on purpose:
 * a genuine new phone, still under manufacturer warranty, has one real wholesale cost feeding every
 * seller's margin, so sellers of the SAME new model cluster fairly close together — a listing under
 * 60% or over 250% of what the rest of the group says is more likely a bad title, a currency slip
 * or an unrelated variant the identifier didn't fully disambiguate than a genuine price. 250% still
 * comfortably tolerates a pricier variant quietly mixed into the group (see the 212% case in the
 * tests, which this deliberately does NOT flag). Non-new tolerates a much wider spread (35%-300%):
 * a "reacondicionado"/"usado" listing's price depends on cosmetic grade, battery health and
 * whatever the seller feels like charging that day — genuine 3-8x spreads for nominally the same
 * condition are ordinary in the sample this module was built against, and a tighter band here would
 * flag real listings constantly.
 */
const NEW_LOO_LOW = 0.6;
const NEW_LOO_HIGH = 2.5;
const OTHER_LOO_LOW = 0.35;
const OTHER_LOO_HIGH = 3.0;

/** One listing, already resolved to a model + condition + UYU price, before screening/dedupe. */
interface Candidate {
  listing: RetailListing;
  condition: PhoneCondition;
  priceUyu: number;
  /** Normalized for dedupe/counting — see {@link sellerIdentity}. */
  seller: string;
  esimOnly: boolean;
}

/**
 * Deterministic order for both the dedupe "keep cheapest" pick and the final `offers` sort within a
 * condition: price first, then seller, then url — so two runs over the same (possibly reordered)
 * input always publish the exact same offer in the exact same position.
 */
const byPriceSellerUrl = (a: Candidate, b: Candidate): number =>
  a.priceUyu - b.priceUyu || a.seller.localeCompare(b.seller) || a.listing.url.localeCompare(b.listing.url);

/**
 * Is `price` a plausible multiple of what `others` (every OTHER offer currently in the group) says,
 * for this condition's thresholds?
 */
function medianRatioOk(condition: PhoneCondition, price: number, othersUyu: readonly number[]): { ok: boolean; deviation: number } {
  const median = percentile([...othersUyu].sort((a, b) => a - b), 0.5);
  if (!(median > 0)) return { ok: true, deviation: 0 }; // shouldn't happen once the absolute floor already ran
  const ratio = price / median;
  const [low, high] = condition === "new" ? [NEW_LOO_LOW, NEW_LOO_HIGH] : [OTHER_LOO_LOW, OTHER_LOO_HIGH];
  // Measured on a LOG scale, not the raw ratio: a ratio of 0.4 (60% under) and a ratio of 2.5 (150%
  // over) are symmetric distortions of the same relative size, and ln makes that literal
  // (ln(0.4) ≈ -0.916, ln(2.5) ≈ 0.916) — comparing raw ratios would make a LOW outlier look
  // artificially milder than an equally-extreme HIGH one and bias which one gets removed first when
  // more than one offer is flagged in the same round (see {@link screenByMedianOfOthers}).
  return { ok: ratio >= low && ratio <= high, deviation: Math.abs(Math.log(ratio)) };
}

// Two deviations within this of each other count as tied, not "one is infinitesimally worse than
// the other". Reciprocal ratios (e.g. 1/3 and 3) are the clearest real case: Math.log(1/3) and
// -Math.log(3) differ by ~2e-16 purely from floating-point rounding of the division, even though
// they represent the exact same relative distortion in opposite directions. Comparing with strict
// `===` would let that rounding noise — not the documented price/seller/url rule — decide which one
// is "worse", making the choice depend on which side of a division happened to round up.
const TIE_EPSILON = 1e-9;

/**
 * Removes the single WORST offer — largest log-scale deviation from the median of its peers — one
 * at a time, recomputing every remaining offer's ratio after each removal, until either nobody is
 * flagged anymore or the group would drop below PHONE_MIN_BAND_SAMPLE.
 *
 * Why iterative, one offer at a time, rather than a single pass over the group AS FIRST SEEN (the
 * bug this replaces, found reviewing eb49d731): a single pass computes every offer's "others"
 * median from the group INCLUDING whichever outlier(s) are in it. One in-range currency-mislabel
 * outlier — `[56000, 56500, 250000]` — then poisons the "others" set for the two NORMAL offers too
 * (each one's own comparison median is dragged toward the outlier: 56000's peers are {56500,
 * 250000}, whose median is 153250 — 56000 reads as only 36.5% of THAT, flagged, even though 56000
 * is a perfectly ordinary price), so a single pass condemns the whole group, not just the outlier.
 * Removing the WORST one, recomputing, and repeating fixes this: once 250000 is gone, 56000 and
 * 56500 are judged against EACH OTHER and read as perfectly ordinary. The same mechanism handles
 * MULTIPLE outliers too (see the two-outlier test) — each round removes only the currently-worst
 * offender, so a milder second outlier gets re-evaluated (and, if genuinely bad, still eventually
 * removed) only once judged against a cleaner reference, never in the same pass as the first.
 *
 * KNOWN REMAINING BIAS, documented and pinned by a test rather than hidden: when two offers on
 * OPPOSITE sides of the group are tied (within TIE_EPSILON) for worst, the tie-break below prefers
 * removing the CHEAPER one (`byPriceSellerUrl` sorts ascending by price, and ties favor whichever
 * sorts first). At small n this can be the whole outcome: a 3-offer group `[A, B, C]` where A and C
 * are tied outliers around a normal B drops to 2 offers (below PHONE_MIN_BAND_SAMPLE) the instant
 * ONE of them is removed, so whichever one loses the tie survives by the OTHER one never being
 * re-evaluated — see the pinning test. This is a real, asymmetric bias (a two-outlier tie always
 * resolves against the cheap side, never the expensive one), not a coin flip, and it is NOT the same
 * failure as the ambiguous-split guard above catches: that guard fires on two co-equal POPULATIONS
 * (≥2 offers each side of a ≥1.8x gap) and abstains entirely; this bias is about a single tied PAIR
 * of individual offers in an otherwise-resolvable group, too narrow a shape to be worth a second
 * abstention rule on top of the first.
 *
 * Trade-offs accepted, not hidden: (1) below PHONE_MIN_BAND_SAMPLE the loop never starts — two
 * offers cannot leave one out and still have two to compare against, so a two-offer group relies on
 * the absolute floor/ceiling alone, same as a one-offer group already does; the loop can also END
 * with fewer than PHONE_MIN_BAND_SAMPLE survivors (this is expected, not a bug — see the
 * `[56000, 56500, 250000]` test, which ends at 2). (2) if EVERY offer in a group is wrong in the
 * same direction (a whole model gets bundle-mispriced the same way everywhere, or a genuine
 * short-lived supply shock moves every real seller's price at once), this has nothing honest to
 * compare against and cannot catch it — a leave-one-out check only ever judges a listing against
 * its own peers, never an external ground truth.
 */
function screenByMedianOfOthers(condition: PhoneCondition, candidates: readonly Candidate[]): Candidate[] {
  let remaining = [...candidates];

  while (remaining.length >= PHONE_MIN_BAND_SAMPLE) {
    let worst: { candidate: Candidate; deviation: number } | null = null;
    for (let index = 0; index < remaining.length; index++) {
      const candidate = remaining[index]!;
      const others = remaining.filter((_, otherIndex) => otherIndex !== index).map((c) => c.priceUyu);
      const { ok, deviation } = medianRatioOk(condition, candidate.priceUyu, others);
      if (ok) continue;
      const isTied = worst !== null && Math.abs(deviation - worst.deviation) <= TIE_EPSILON;
      const isWorse = !worst || deviation > worst.deviation + TIE_EPSILON;
      if (isWorse || (isTied && byPriceSellerUrl(candidate, worst!.candidate) < 0)) {
        worst = { candidate, deviation };
      }
    }
    if (!worst) break; // nobody flagged this round: done
    const removed = worst.candidate;
    remaining = remaining.filter((c) => c !== removed);
  }

  return remaining;
}

function toOffer(candidate: Candidate): PhoneOffer {
  const { listing, condition, priceUyu, esimOnly } = candidate;
  return {
    seller: listing.sellerName,
    sellerKey: listing.sellerKey,
    source: listing.source === "mercadolibre" ? "mercadolibre" : "store",
    officialStore: listing.officialStore,
    title: listing.title,
    url: listing.url,
    price: listing.price,
    currency: listing.currency,
    priceUyu,
    listPrice: listing.listPrice ?? null,
    condition,
    esimOnly,
    observedAt: listing.observedAt,
  };
}

/**
 * A photo for the model card, mirroring `representativeImage` in classes/equipar/catalog.ts.
 *
 * NEW offers are preferred outright: a new listing's photo is the manufacturer's own catalogue shot
 * almost every time, while a used/refurbished unit's photo is the seller's own (possibly worn,
 * possibly the wrong color) physical unit. Only when NO new offer survived screening at all does
 * this fall back to whichever other condition DID survive, so a used-only model — or one whose new
 * offers were all screened out — still gets a picture instead of none. If new offers DID survive
 * but happen to have no image at all, this does not fall through to a non-new photo: a used unit's
 * photo is not a substitute for a missing new one, it is a different (possibly different-looking)
 * physical thing.
 *
 * Within whichever pool is used, the offer closest to the MEDIAN price is preferred over the
 * cheapest: the cheapest row is disproportionately the one screening barely let through (a
 * near-floor bundle, a stripped color variant, a seller who under-titled a listing), so its photo
 * would misrepresent the model. `survivors`/`newSurvivors` never include a floor/ceiling-failed or
 * suspect/reject/leave-one-out-failed listing, so this can never pick from one. A null image on the
 * exact median listing walks outward to its price neighbours (alternating below/above) instead of
 * giving up immediately.
 */
function pickImage(newSurvivors: readonly Candidate[], allSurvivors: readonly Candidate[]): string | null {
  const pool = newSurvivors.length ? newSurvivors : allSurvivors;
  if (!pool.length) return null;
  const byPrice = [...pool].sort(byPriceSellerUrl);
  const medianIndex = Math.floor((byPrice.length - 1) / 2);
  for (let offset = 0; offset < byPrice.length; offset++) {
    const right = byPrice[medianIndex + offset];
    if (right?.listing.image) return right.listing.image;
    if (offset === 0) continue;
    const left = byPrice[medianIndex - offset];
    if (left?.listing.image) return left.listing.image;
  }
  return null;
}

export interface BuildPhoneCatalogInput {
  listings: readonly RetailListing[];
  usdUyu: number;
}

/**
 * Single document describing the last celulares run — mirrors `classes/equipar/types.ts`'s
 * `EquiparMeta` / `classes/chairs/types.ts`'s `ChairCatalogMeta`. `runs` is `harvest.runs` itself
 * (the exact per-source result `harvestRetail` already produces), not a re-shaped copy: every other
 * directory that reuses the shared retail harvester duplicates this shape as its own named type
 * (`EquiparSourceRun`, …) even though it is structurally identical — this one just reuses
 * {@link RetailSourceRun} directly instead of adding a fourth copy of the same six fields.
 */
export interface PhoneMeta {
  generatedAt: string;
  usdUyu: number;
  listings: number;
  models: number;
  runs: RetailSourceRun[];
}

export function buildPhoneCatalog(input: BuildPhoneCatalogInput): PhoneModel[] {
  const { usdUyu } = input;

  // Group raw listings into one bucket per model KEY (brand+family+storage) — a listing whose title
  // never states a storage figure returns null from identifyPhone and is skipped here, not published
  // as a partial/guessed model (Task 1's own recall-vs-precision call, unchanged by this task).
  const byKey = new Map<string, { identity: PhoneIdentity; candidates: Candidate[] }>();

  for (const listing of input.listings) {
    const identity = identifyPhone(listing.title, listing.attributes);
    if (!identity) continue;

    const condition = phoneConditionFromTitle(listing.title, listing.condition);
    const priceUyu = toUyu(listing.price, listing.currency, usdUyu);
    const seller = sellerIdentity(listing.source === "mercadolibre" ? "mercadolibre" : "store", listing.sellerKey, listing.sellerName);

    const bucket = byKey.get(identity.key) ?? { identity, candidates: [] };
    bucket.candidates.push({ listing, condition, priceUyu, seller, esimOnly: identity.esimOnly });
    byKey.set(identity.key, bucket);
  }

  const models: PhoneModel[] = [];

  for (const [key, bucket] of byKey) {
    const { identity } = bucket;

    const byCondition = new Map<PhoneCondition, Candidate[]>();
    for (const candidate of bucket.candidates) {
      const list = byCondition.get(candidate.condition) ?? [];
      list.push(candidate);
      byCondition.set(candidate.condition, list);
    }

    const bands: Partial<Record<PhoneCondition, PhoneBand>> = {};
    const allSurvivors: Candidate[] = [];
    let newSurvivors: Candidate[] = [];
    const modelOffers: PhoneOffer[] = [];
    let suspectDropped = 0;
    let ambiguousDropped = 0;
    const ambiguousConditions: PhoneCondition[] = [];
    let newSellers = 0;

    for (const [condition, candidates] of byCondition) {
      // Step 1: the absolute floor AND ceiling, independent of sample size (see
      // PHONE_NEW_FLOOR_UYU/PHONE_NEW_CEILING_UYU and their non-new counterparts). Applied BEFORE
      // the percentile band so an out-of-range price never widens or skews the band the rest of the
      // group is measured against.
      const floor = floorFor(condition);
      const ceiling = ceilingFor(condition);
      const inRange: Candidate[] = [];
      for (const candidate of candidates) {
        if (candidate.priceUyu < floor || candidate.priceUyu > ceiling) suspectDropped += 1;
        else inRange.push(candidate);
      }

      // Step 1.5: the ambiguous-split check (findAmbiguousSplit) — BEFORE the per-offer guards
      // below, which have no way to arbitrate between two roughly equal-sized clusters (see the
      // module comment and findAmbiguousSplit's own comment). Abstaining here means skipping this
      // condition entirely: no band, no offers, nothing added to allSurvivors/newSurvivors — every
      // in-range offer counts in ambiguousDropped instead of suspectDropped, because none of them
      // was individually judged bad.
      if (findAmbiguousSplit(inRange.map((candidate) => candidate.priceUyu))) {
        ambiguousDropped += inRange.length;
        ambiguousConditions.push(condition);
        continue;
      }

      // Step 2: the median-of-others guard, iterative worst-first (screenByMedianOfOthers). This
      // runs BEFORE priceVerdict on purpose, not after: priceVerdict's own band is computed from
      // whatever set it is handed, INCLUDING any outlier(s) still in it, so a band built from the
      // raw, uncleaned `inRange` set is largely blind to exactly the kind of outlier this guard
      // targets (a `[56000, 56500, 250000]` band's own p10/p90 stretches wide enough around the
      // 250000 to call all three "ok"). Running this guard first and computing priceVerdict's band
      // from ITS survivors instead gives priceVerdict a clean, uncontaminated reference — a
      // meaningful supplementary check instead of a mostly-redundant first pass.
      const afterMedianGuard = screenByMedianOfOthers(condition, inRange);
      suspectDropped += inRange.length - afterMedianGuard.length;

      // Step 3: the percentile band — reached only once there is enough of a sample
      // (PHONE_MIN_BAND_SAMPLE) to say anything; null otherwise, in which case priceVerdict answers
      // "ok" for everything that already cleared the two guards above (this is precisely the
      // "screening needs a minimum sample" case: with too few offers, only the absolute guards
      // apply — see the dedicated test with a 2-offer group at a 10x spread that survives).
      const band = screeningBand(afterMedianGuard.map((candidate) => candidate.priceUyu));
      const survivors = afterMedianGuard.filter((candidate) => priceVerdict(candidate.priceUyu, band) === "ok");
      // Unlike classes/equipar/bands.ts (which only counts its own "suspect" bucket and silently
      // drops "reject" without counting it), a phone's suspectDropped counts EVERY offer this
      // condition group lost — floor/ceiling failures, every median-guard removal, and every
      // non-"ok" priceVerdict alike. A model here has far fewer offers to begin with, so every drop
      // is worth surfacing, not just the merely-doubtful ones.
      suspectDropped += afterMedianGuard.length - survivors.length;

      allSurvivors.push(...survivors);
      if (condition === "new") newSurvivors = survivors;

      const sellers = new Set(survivors.map((candidate) => candidate.seller));
      if (condition === "new") newSellers = sellers.size;

      if (survivors.length >= PHONE_MIN_BAND_SAMPLE) {
        const sortedPrices = survivors.map((candidate) => candidate.priceUyu).sort((a, b) => a - b);
        bands[condition] = {
          // Whole pesos: a fractional peso from percentile interpolation is never a real price.
          min: Math.round(percentile(sortedPrices, 0)),
          p25: Math.round(percentile(sortedPrices, 0.25)),
          median: Math.round(percentile(sortedPrices, 0.5)),
          p75: Math.round(percentile(sortedPrices, 0.75)),
          n: survivors.length,
          sellers: sellers.size,
        };
      }

      // Dedupe: the cheapest survivor per (model, condition, seller). Several listings from the SAME
      // seller — different colors, different SKUs, a duplicate post — are the same shopping option,
      // and only the cheapest one is real. A seller with both a new AND a refurbished listing is
      // unaffected: they sit in two different `condition` buckets and both survive here.
      const cheapestPerSeller = new Map<string, Candidate>();
      for (const candidate of [...survivors].sort(byPriceSellerUrl)) {
        if (!cheapestPerSeller.has(candidate.seller)) cheapestPerSeller.set(candidate.seller, candidate);
      }
      for (const candidate of cheapestPerSeller.values()) modelOffers.push(toOffer(candidate));
    }

    modelOffers.sort(
      (a, b) =>
        CONDITION_RANK[a.condition] - CONDITION_RANK[b.condition] ||
        a.priceUyu - b.priceUyu ||
        a.seller.localeCompare(b.seller) ||
        a.url.localeCompare(b.url)
    );

    const observedAt = allSurvivors.length
      ? allSurvivors.reduce((latest, candidate) => (candidate.listing.observedAt > latest ? candidate.listing.observedAt : latest), allSurvivors[0]!.listing.observedAt)
      : bucket.candidates[0]!.listing.observedAt;

    // The published (capped) list, not the pre-cap one — a phone whose only eSIM-only listing gets
    // cut by the 30-offer cap must not still claim "some offers are eSIM-only" for an offer the page
    // never shows.
    const publishedOffers = modelOffers.slice(0, 30);

    models.push({
      key,
      slug: key,
      brand: identity.brand,
      brandLabel: identity.brandLabel,
      family: identity.family,
      familyLabel: identity.familyLabel,
      storageGb: identity.storageGb,
      name: identity.name,
      image: pickImage(newSurvivors, allSurvivors),
      bands,
      offers: publishedOffers,
      newSellers,
      esimOnlySeen: publishedOffers.some((offer) => offer.esimOnly),
      suspectDropped,
      ambiguousDropped,
      ambiguousConditions,
      observedAt,
    });
  }

  // Deterministic top-level order (by model key) — the per-offer/per-band determinism above already
  // covers what happens inside one model, this covers the array itself for anyone diffing output.
  return models.sort((a, b) => a.key.localeCompare(b.key));
}
