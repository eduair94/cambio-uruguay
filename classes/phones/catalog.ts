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
//     floor backstops the cases a tiny sample can't statistically catch — see PHONE_NEW_FLOOR_UYU.
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
  min: number;
  p25: number;
  median: number;
  p75: number;
  n: number;
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
  /** Offers removed by the absolute floor or by priceVerdict (suspect or reject) — see below. */
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

const floorFor = (condition: PhoneCondition): number => (condition === "new" ? PHONE_NEW_FLOOR_UYU : PHONE_USED_FLOOR_UYU);

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
 * A photo for the model card, mirroring `representativeImage` in classes/equipar/catalog.ts: the
 * CHEAPEST surviving offer is disproportionately the one screening barely let through (a near-floor
 * bundle, a stripped color variant, a seller who under-titled a listing), so its photo would
 * misrepresent the model. The offer closest to the MEDIAN price among everything screening already
 * kept is preferred — `survivors` never includes a floor-failed or suspect/reject-verdict listing,
 * so this can never pick from one. A null image on the exact median listing walks outward to its
 * price neighbours (alternating below/above) instead of giving up immediately.
 */
function pickImage(survivors: readonly Candidate[]): string | null {
  if (!survivors.length) return null;
  const byPrice = [...survivors].sort(byPriceSellerUrl);
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
    const modelOffers: PhoneOffer[] = [];
    let suspectDropped = 0;
    let newSellers = 0;

    for (const [condition, candidates] of byCondition) {
      // Step 1: the absolute floor, independent of sample size (see PHONE_NEW_FLOOR_UYU /
      // PHONE_USED_FLOOR_UYU). Applied BEFORE the percentile band so a floor-failing price never
      // widens or skews the band the rest of the group is measured against.
      const floor = floorFor(condition);
      const aboveFloor: Candidate[] = [];
      for (const candidate of candidates) {
        if (candidate.priceUyu < floor) suspectDropped += 1;
        else aboveFloor.push(candidate);
      }

      // Step 2: the percentile band — reached only once there is enough of a sample
      // (PHONE_MIN_BAND_SAMPLE) to say anything; null otherwise, in which case priceVerdict answers
      // "ok" for everything that already cleared the absolute floor above (this is precisely the
      // "screening needs a minimum sample" case: with too few offers, only the floor applies).
      const band = screeningBand(aboveFloor.map((candidate) => candidate.priceUyu));
      const survivors = aboveFloor.filter((candidate) => priceVerdict(candidate.priceUyu, band) === "ok");
      // Unlike classes/equipar/bands.ts (which only counts its own "suspect" bucket and silently
      // drops "reject" without counting it), a phone's suspectDropped counts EVERY offer this
      // condition group lost — floor failures and BOTH non-"ok" verdicts alike. A model here has far
      // fewer offers to begin with, so every drop is worth surfacing to whoever reads the count, not
      // just the merely-doubtful ones.
      suspectDropped += aboveFloor.length - survivors.length;

      allSurvivors.push(...survivors);

      const sellers = new Set(survivors.map((candidate) => candidate.seller));
      if (condition === "new") newSellers = sellers.size;

      if (survivors.length >= PHONE_MIN_BAND_SAMPLE) {
        const sortedPrices = survivors.map((candidate) => candidate.priceUyu).sort((a, b) => a - b);
        bands[condition] = {
          min: percentile(sortedPrices, 0),
          p25: percentile(sortedPrices, 0.25),
          median: percentile(sortedPrices, 0.5),
          p75: percentile(sortedPrices, 0.75),
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

    models.push({
      key,
      slug: key,
      brand: identity.brand,
      brandLabel: identity.brandLabel,
      family: identity.family,
      familyLabel: identity.familyLabel,
      storageGb: identity.storageGb,
      name: identity.name,
      image: pickImage(allSurvivors),
      bands,
      offers: modelOffers.slice(0, 30),
      newSellers,
      esimOnlySeen: modelOffers.some((offer) => offer.esimOnly),
      suspectDropped,
      observedAt,
    });
  }

  // Deterministic top-level order (by model key) — the per-offer/per-band determinism above already
  // covers what happens inside one model, this covers the array itself for anyone diffing output.
  return models.sort((a, b) => a.key.localeCompare(b.key));
}
