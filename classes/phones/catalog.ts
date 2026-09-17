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
// than a whole store. The guards below (absolute floor+ceiling, then percentile band, then a
// leave-one-out ratio check) are what catches THAT — see the leave-one-out comment further down for
// the specific small-sample trade-off it accepts.
import { percentile, priceVerdict } from "../precios/plausibility";
import type { PrecioBand } from "../precios/plausibility";
import { identifyPhone, phoneConditionFromTitle } from "./identify";
import type { PhoneBrand, PhoneCondition, PhoneIdentity } from "./types";
import type { RetailListing } from "../retail/types";

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
   * leave-one-out ratio check — see the guards below. Every drop counts here, not only the
   * merely-doubtful ones (contrast classes/equipar/bands.ts's own suspectDropped, which only counts
   * its "suspect" bucket and silently ignores "reject").
   */
  suspectDropped: number;
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

/**
 * Is `price` a plausible multiple of what the REST of this (model, condition) group says, judged
 * one offer at a time?
 *
 * This exists because `screeningBand` above computes ONE band from the WHOLE group, INCLUDING the
 * very listing being judged against it — with the 3-6 offers a phone model typically has (far below
 * plausibility.ts's own tuning target of ~350 SIPC rows), a single bad listing can drag its own
 * band's percentiles down (or up) far enough to still read as "ok" against a band it helped shape.
 * [30000, 60000, 61000] is exactly this: the shared band alone judges all three "ok", but 30000 is
 * only ~50% of what the OTHER two say, which this catches and the shared band does not.
 *
 * Trade-offs accepted, not hidden: (1) below PHONE_MIN_BAND_SAMPLE "others" this never runs at all —
 * two offers cannot leave one out and still have two to compare against, so a two-offer group relies
 * on the absolute floor/ceiling alone, same as a one-offer group already does. (2) the "others" set
 * for one candidate is NOT itself pre-filtered to exclude an already-verdict-rejected peer, so a
 * genuinely bad peer can mildly skew a legitimate candidate's own comparison median — accepted for
 * the same reason `screeningBand` accepts it: with only a handful of points, filtering one out
 * before judging the others would spiral into deciding an order to evaluate them in. (3) if EVERY
 * offer in a group is wrong in the same direction (a whole model gets bundle-mispriced the same way
 * everywhere, or a genuine short-lived supply shock moves every real seller's price at once), this
 * has nothing honest to compare against and cannot catch it — a leave-one-out check only ever judges
 * a listing against its own peers, never an external ground truth.
 */
function leaveOneOutOk(condition: PhoneCondition, price: number, othersUyu: readonly number[]): boolean {
  const median = percentile([...othersUyu].sort((a, b) => a - b), 0.5);
  if (!(median > 0)) return true; // shouldn't happen once the absolute floor already ran; never divide by zero
  const ratio = price / median;
  const [low, high] = condition === "new" ? [NEW_LOO_LOW, NEW_LOO_HIGH] : [OTHER_LOO_LOW, OTHER_LOO_HIGH];
  return ratio >= low && ratio <= high;
}

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

      // Step 2: the percentile band — reached only once there is enough of a sample
      // (PHONE_MIN_BAND_SAMPLE) to say anything; null otherwise, in which case priceVerdict answers
      // "ok" for everything that already cleared the floor/ceiling above (this is precisely the
      // "screening needs a minimum sample" case: with too few offers, only the absolute guards
      // apply — see the dedicated test with a 2-offer group at a 10x spread that survives).
      const band = screeningBand(inRange.map((candidate) => candidate.priceUyu));
      const rawPrices = inRange.map((candidate) => candidate.priceUyu);

      // Step 3: the leave-one-out ratio check (see leaveOneOutOk's own comment for why this exists
      // ALONGSIDE priceVerdict rather than instead of it — each catches a shape of bad price the
      // other misses). Only attempted once there are at least PHONE_MIN_BAND_SAMPLE offers in the
      // group to leave ONE out and still have others to compare against.
      const survivors = inRange.filter((candidate, index) => {
        if (priceVerdict(candidate.priceUyu, band) !== "ok") return false;
        if (inRange.length < PHONE_MIN_BAND_SAMPLE) return true;
        const others = rawPrices.filter((_, otherIndex) => otherIndex !== index);
        return leaveOneOutOk(condition, candidate.priceUyu, others);
      });
      // Unlike classes/equipar/bands.ts (which only counts its own "suspect" bucket and silently
      // drops "reject" without counting it), a phone's suspectDropped counts EVERY offer this
      // condition group lost — floor/ceiling failures and every non-"ok"/leave-one-out drop alike. A
      // model here has far fewer offers to begin with, so every drop is worth surfacing, not just
      // the merely-doubtful ones.
      suspectDropped += inRange.length - survivors.length;

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
      observedAt,
    });
  }

  // Deterministic top-level order (by model key) — the per-offer/per-band determinism above already
  // covers what happens inside one model, this covers the array itself for anyone diffing output.
  return models.sort((a, b) => a.key.localeCompare(b.key));
}
