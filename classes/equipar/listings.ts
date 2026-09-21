// One row per listing, for the directory behind /equipar-casa-uruguay/productos.
//
// `equiparitems` keeps only the eight cheapest new and six cheapest used offers of each variant —
// the right cut for a page that says "what does a fridge cost", and useless for a page that lets a
// reader filter every fridge by brand, condition, seller and price. That page needs every listing
// the band accepted, as its own document, in a collection the app can query with facets.
//
// The classification is the catalogue's own, not a second opinion: the same `CATEGORY_SPEC` tag,
// the same `variantFor`, the same `conditionOf`, and the same per-item, per-condition `screen()`.
// A row this module keeps is a row `buildEquiparCatalog` counted; a row it drops is one the band
// rejected there too. Reproducing the screen here (instead of threading it out of `catalog.ts`)
// keeps that module's contract untouched for its two consumers (equipar and movilidad).
import { screen } from "./bands";
import { conditionOf, NOT_A_BRAND, toOffer } from "./catalog";
import { categoryFor, itemKey, norm, variantFor } from "./classify";
import { EQUIPAR_CATEGORIES } from "./registry";
import type { RetailListing } from "../retail/types";
import type { EquiparCategory, EquiparRegime, EquiparRoom, EquiparTier } from "./types";

export interface EquiparListingRow {
  /** `RetailListing.listingId`: `ml:MLU123`, `store:<key>:<sku>`, `fb:<id>`. Unique. */
  listingId: string;
  category: string;
  categoryLabel: string;
  variant: string;
  variantLabel: string;
  tier: EquiparTier;
  room: EquiparRoom;
  /** Registry position — the published necessity order the list page sorts by. */
  rank: number;
  variantRank: number;
  regime: EquiparRegime;
  /** Marketplace is used unless the seller says new; a storefront is new unless it says otherwise. */
  condition: "new" | "used";
  source: "store" | "mercadolibre" | "facebook";
  sellerKey: string;
  sellerName: string;
  channel: string;
  officialStore: boolean;
  /** The seller's spelling, or "" when the catalogue printed a placeholder ("Sin marca"). */
  brand: string;
  /** `norm(brand)`: what the brand facet groups and filters on. */
  brandKey: string;
  title: string;
  url: string;
  image: string | null;
  price: number;
  currency: "UYU" | "USD";
  /** Always UYU, at the run's rate, so rows can be sorted and filtered together. */
  priceUyu: number;
  listPrice: number | null;
  location: string | null;
  freeShipping: boolean | null;
  /**
   * Under p10/2 of its own item+condition. Stored — the count is published — but never served in
   * the directory: a list sorted by "menor precio" would lead with exactly the row the band doubts.
   */
  suspect: boolean;
  observedAt: string;
  /** `observedAt` as a date: the freshness window and the prune both read this. */
  lastSeen: string;
}

export interface BuildListingsInput {
  listings: readonly RetailListing[];
  usdUyu: number;
  /** Defaults to equipar's own registry, exactly like `buildEquiparCatalog`. */
  registry?: readonly EquiparCategory[];
}

export interface BuildListingsResult {
  rows: EquiparListingRow[];
  /** Listings the band rejected (outside p10/3–p90×3 of their item+condition). Not stored. */
  rejected: number;
  /** Rows stored with `suspect: true`. */
  suspect: number;
}

const brandOf = (listing: RetailListing): { brand: string; brandKey: string } => {
  const brand = (listing.brand ?? "").trim();
  const brandKey = norm(brand);
  if (!brandKey || NOT_A_BRAND.test(brandKey)) return { brand: "", brandKey: "" };
  return { brand, brandKey };
};

export function buildEquiparListings(input: BuildListingsInput): BuildListingsResult {
  const { usdUyu, registry = EQUIPAR_CATEGORIES } = input;
  const categoryOrder = new Map(registry.map((category, index) => [category.key, index]));
  const byKey = new Map(registry.map((category) => [category.key, category]));

  // Same listingId twice in one run (a storefront listed under two collections, an ML search that
  // returned the same item for two terms): the last observation stands, exactly one row.
  const unique = new Map<string, RetailListing>();
  for (const listing of input.listings) unique.set(listing.listingId, listing);

  interface Bucket {
    category: EquiparCategory;
    variant: string;
    variantLabel: string;
    variantRank: number;
    listings: RetailListing[];
  }
  const byItem = new Map<string, Bucket>();

  for (const listing of unique.values()) {
    const tagged = listing.attributes?.CATEGORY_SPEC;
    const category = (tagged && byKey.get(tagged)) || categoryFor(listing.title, "", registry);
    if (!category) continue;
    const variant = variantFor(category, listing.title);
    const key = itemKey(category.key, variant.key);
    const bucket = byItem.get(key) ?? {
      category,
      variant: variant.key,
      variantLabel: variant.label,
      variantRank: variant.rank,
      listings: [],
    };
    bucket.listings.push(listing);
    byItem.set(key, bucket);
  }

  const rows: EquiparListingRow[] = [];
  let rejected = 0;
  let suspect = 0;

  for (const bucket of byItem.values()) {
    const { category } = bucket;
    // `offers[i]` is `toOffer(bucket.listings[i])`; object identity maps a verdict back to its
    // listing without trusting urls to be unique — the same trick `buildEquiparCatalog` uses.
    const offers = bucket.listings.map((listing) => toOffer(listing, usdUyu));
    const verdicts = new Map<object, "ok" | "suspect">();
    for (const condition of ["new", "used"] as const) {
      const screened = screen(offers.filter((offer) => offer.condition === condition));
      for (const offer of screened.kept) verdicts.set(offer, "ok");
      for (const offer of screened.suspect) verdicts.set(offer, "suspect");
    }

    bucket.listings.forEach((listing, index) => {
      const offer = offers[index]!;
      const verdict = verdicts.get(offer);
      if (!verdict) {
        rejected += 1;
        return;
      }
      if (verdict === "suspect") suspect += 1;
      const { brand, brandKey } = brandOf(listing);
      rows.push({
        listingId: listing.listingId,
        category: category.key,
        categoryLabel: category.label,
        variant: bucket.variant,
        variantLabel: bucket.variantLabel,
        tier: category.tier,
        room: category.room,
        rank: categoryOrder.get(category.key) ?? 999,
        variantRank: bucket.variantRank,
        regime: category.regime,
        condition: conditionOf(listing),
        source: listing.source === "store" ? "store" : listing.source,
        sellerKey: listing.sellerKey,
        sellerName: listing.sellerName,
        channel: listing.channel,
        officialStore: Boolean(listing.officialStore),
        brand,
        brandKey,
        title: listing.title,
        url: listing.url,
        image: listing.image ?? null,
        price: listing.price,
        currency: listing.currency,
        priceUyu: offer.priceUyu,
        listPrice: typeof listing.listPrice === "number" ? listing.listPrice : null,
        location: listing.location ?? null,
        freeShipping: typeof listing.freeShipping === "boolean" ? listing.freeShipping : null,
        suspect: verdict === "suspect",
        observedAt: listing.observedAt,
        lastSeen: listing.observedAt.slice(0, 10),
      });
    });
  }

  return { rows, rejected, suspect };
}
