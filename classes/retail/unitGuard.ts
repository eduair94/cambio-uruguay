// Cross-store price-unit guard.
//
// TYT's WooCommerce Store API declares `currency_minor_unit: 2` but sends whole pesos: a $ 15.900
// Smart TV comes back as `{"price":"15900", "currency_minor_unit":2}`, which the adapter used to
// divide by 100 and publish as $ 159 — the household page showed a Samsung 32" at $ 178.
// `wooPrice`'s `priceInMajorUnits` flag (classes/retail/stores.ts) fixes that ONE store, but a
// per-store override only ever helps for the mistake someone already measured in production. This
// is the generic backstop: it compares what a category costs at a given store, in pesos, against
// what MercadoLibre says the SAME category costs. MercadoLibre is read from a scraper service we do
// not run and is free of the "declared minor unit that lies" trap WooCommerce has, so it stands in
// for ground truth here.
//
// The threshold is 20x. A wrong-unit price is off by a factor of 100 (cents read as pesos) or, on a
// three-decimal store, 1000 — never a number anywhere near 1 — so 20x leaves wide room below it for
// a store that is genuinely, deeply discounted or sells a cheaper sub-segment of the category,
// while still tripping on a unit bug long before it would take 100x to notice.
import { percentile } from "../precios/plausibility";
import type { RetailListing } from "./types";

export interface UnitGuardDrop {
  sellerKey: string;
  spec: string;
  storeMedianUyu: number;
  mlMedianUyu: number;
  n: number;
}

/** Below this many observations a median is noise, not a signal — neither side of the comparison decides on fewer. */
const MIN_SAMPLE = 5;
const RATIO = 20;

const toUyu = (listing: RetailListing, usdUyu: number): number =>
  listing.currency === "USD" ? listing.price * usdUyu : listing.price;

const median = (values: readonly number[]): number => percentile([...values].sort((a, b) => a - b), 0.5);

const groupKey = (sellerKey: string, spec: string): string => `${sellerKey}::${spec}`;

/** MercadoLibre prices per category, in pesos. Both guards measure against this and nothing else. */
function mlPricesBySpec(listings: readonly RetailListing[], usdUyu: number): Map<string, number[]> {
  const bySpec = new Map<string, number[]>();
  for (const listing of listings) {
    const spec = listing.attributes.CATEGORY_SPEC;
    if (listing.source !== "mercadolibre" || !spec) continue;
    const bucket = bySpec.get(spec) ?? [];
    bucket.push(toUyu(listing, usdUyu));
    bySpec.set(spec, bucket);
  }
  return bySpec;
}

/**
 * Drops every listing from a (store, category) pair whose median price, in pesos, sits more than
 * {@link RATIO}x away from MercadoLibre's median for the same category. Only decides when BOTH sides
 * have at least {@link MIN_SAMPLE} listings — a thin store or a thin MercadoLibre category is not
 * evidence of anything.
 */
export function applyUnitGuard(
  listings: readonly RetailListing[],
  usdUyu: number
): { listings: RetailListing[]; dropped: UnitGuardDrop[] } {
  const mlBySpec = mlPricesBySpec(listings, usdUyu);
  const storePricesByGroup = new Map<string, number[]>();

  for (const listing of listings) {
    const spec = listing.attributes.CATEGORY_SPEC;
    if (listing.source !== "store" || !spec) continue;
    const key = groupKey(listing.sellerKey, spec);
    const bucket = storePricesByGroup.get(key) ?? [];
    bucket.push(toUyu(listing, usdUyu));
    storePricesByGroup.set(key, bucket);
  }

  const dropped: UnitGuardDrop[] = [];
  const droppedGroups = new Set<string>();

  for (const [key, storePrices] of storePricesByGroup) {
    if (storePrices.length < MIN_SAMPLE) continue;
    const [sellerKey, spec] = key.split("::");
    const mlPrices = mlBySpec.get(spec);
    if (!mlPrices || mlPrices.length < MIN_SAMPLE) continue;

    const storeMedianUyu = median(storePrices);
    const mlMedianUyu = median(mlPrices);
    if (storeMedianUyu < mlMedianUyu / RATIO || storeMedianUyu > mlMedianUyu * RATIO) {
      dropped.push({ sellerKey, spec, storeMedianUyu, mlMedianUyu, n: storePrices.length });
      droppedGroups.add(key);
    }
  }

  if (!droppedGroups.size) {
    return { listings: [...listings], dropped };
  }

  const survivors = listings.filter((listing) => {
    const spec = listing.attributes.CATEGORY_SPEC;
    if (listing.source !== "store" || !spec) return true;
    return !droppedGroups.has(groupKey(listing.sellerKey, spec));
  });

  return { listings: survivors, dropped };
}

/** Wrong units are off by exactly this factor: cents read as pesos. */
const UNIT_FACTOR = 100;
/**
 * How far past the band's ceiling a published price must sit before it is rescaled.
 *
 * A cents error multiplies a price that is INSIDE the band by 100, so it lands far outside it:
 * TYT's calefones in cents came in at 16x to 33x MercadoLibre's p90. A genuinely expensive product
 * lands just outside: "Smart Tv Samsung Qled 85« 4k" at 229900 was 7.5x the television p90, and
 * 2299 happened to fall inside the band's floor, so without this margin it was published at
 * $ 2.299. 3x the ceiling (9x the p90) sits between the two measured cases.
 */
const RESCALE_MARGIN = 3;

/**
 * Per-listing unit resolution for a seller that mixes units INSIDE one catalogue.
 *
 * TYT sends most products in whole pesos and some in cents, all under the same declared
 * `currency_minor_unit: 2` (measured 2026-09-16: "Calefon Termotanque De Acero Enxuta 60 L" at
 * 20500 and "Termotanque Calefon Enxuta 60 Lts" at 960000 in the same run). {@link applyUnitGuard}
 * cannot see that: it judges a store's MEDIAN, and the half published right holds the median
 * steady while the other half goes out at 100x. So for a seller flagged ambiguous each listing is
 * judged on its own, against MercadoLibre's band for its category, in pesos: [p10/3, p90*3] — the
 * same shape as the exchange-rate plausibility band, wide enough for a genuinely cheap or premium
 * item and still two orders of magnitude narrower than the error.
 *
 *   price in band, price/100 not  -> kept as published
 *   price/100 in band, price not,
 *     and price > RESCALE_MARGIN x ceiling -> rescaled (price and listPrice, in their own currency)
 *   anything else (both, neither,
 *     or just past the ceiling)   -> dropped: the number cannot tell us which it is
 *   no MercadoLibre band (<5)     -> dropped: there is nothing to judge it against
 *
 * Dropping is the honest default because a guess is published as a fact. Sellers that are not
 * flagged, and MercadoLibre itself, pass through untouched. Nothing is mutated.
 */
export function resolveAmbiguousUnits(
  listings: readonly RetailListing[],
  usdUyu: number,
  ambiguousSellerKeys: ReadonlySet<string>
): { listings: RetailListing[]; rescaled: number; dropped: number } {
  if (!ambiguousSellerKeys.size) return { listings: [...listings], rescaled: 0, dropped: 0 };

  const bands = new Map<string, { low: number; high: number }>();
  for (const [spec, prices] of mlPricesBySpec(listings, usdUyu)) {
    if (prices.length < MIN_SAMPLE) continue;
    const sorted = [...prices].sort((a, b) => a - b);
    bands.set(spec, { low: percentile(sorted, 0.1) / 3, high: percentile(sorted, 0.9) * 3 });
  }

  const out: RetailListing[] = [];
  let rescaled = 0;
  let dropped = 0;

  for (const listing of listings) {
    if (listing.source !== "store" || !ambiguousSellerKeys.has(listing.sellerKey)) {
      out.push(listing);
      continue;
    }
    const spec = listing.attributes.CATEGORY_SPEC;
    const band = spec ? bands.get(spec) : undefined;
    if (!band) {
      dropped++;
      continue;
    }
    const inBand = (uyu: number): boolean => uyu >= band.low && uyu <= band.high;
    const publishedUyu = toUyu(listing, usdUyu);
    const asPublished = inBand(publishedUyu);
    const asCents = inBand(publishedUyu / UNIT_FACTOR);

    if (asPublished && !asCents) {
      out.push(listing);
    } else if (asCents && !asPublished && publishedUyu > band.high * RESCALE_MARGIN) {
      const scale = (value: number): number => Math.round((value / UNIT_FACTOR) * 100) / 100;
      out.push({
        ...listing,
        price: scale(listing.price),
        listPrice: listing.listPrice ? scale(listing.listPrice) : listing.listPrice,
      });
      rescaled++;
    } else {
      dropped++;
    }
  }

  return { listings: out, rescaled, dropped };
}
