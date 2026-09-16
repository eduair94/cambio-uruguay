// Cross-store price-unit guard.
//
// A per-store fix only ever helps for the mistake someone already measured, and this one was
// measured wrong first: TYT's "15900" Smart TV was read as $ 15.900 and a whole-units override
// shipped, when the real defect was the currency — the Store API says "UYU" on every product and
// the storefront renders that TV as USD 159,00 (wooPricing in sources/woocommerce.ts now reads the
// rendered currency). This is the generic backstop for the NEXT store: it compares what a category
// costs at a given store, in pesos, against what MercadoLibre says the SAME category costs.
// MercadoLibre is read from a scraper service we do not run and is free of WooCommerce's
// declared-unit and declared-currency traps, so it stands in for ground truth here.
//
// The threshold is 20x. A wrong-unit price is off by a factor of 100 (cents read as pesos) or, on a
// three-decimal store, 1000 — never a number anywhere near 1 — so 20x leaves wide room below it for
// a store that is genuinely, deeply discounted or sells a cheaper sub-segment of the category,
// while still tripping on a unit bug long before it would take 100x to notice. A wrong currency
// (40x) trips it too, but only when most of a store's category is wrong: it judges medians, never
// single listings, and never rescales anything.
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
