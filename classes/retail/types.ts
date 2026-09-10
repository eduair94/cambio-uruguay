// Shared vocabulary for reading Uruguayan retail.
//
// This module started life inside `classes/chairs`, where every adapter had the word "silla"
// compiled into it at exactly one point. Nothing else about reading a Fenicio sitemap, a Shopify
// `products.json` or a Marketplace search is about chairs, so the category is now injected as a
// {@link CategorySpec} and the plumbing is shared. `classes/chairs` and `classes/equipar` are both
// consumers; neither owns the pipes.

export type RetailMarketSource = "mercadolibre" | "facebook" | "store";

export type RetailChannel = "marketplace" | "local-store" | "importer" | "classifieds";

/** A single price observation: one product, at one seller, at one moment. */
export interface RetailListing {
  /** Stable across runs: `ml:MLU123`, `store:bertoni:<sku>`, `fb:<id>`. */
  listingId: string;
  source: RetailMarketSource;
  /** Registry key of the store, or the marketplace id. */
  sellerKey: string;
  sellerName: string;
  channel: RetailChannel;
  title: string;
  url: string;
  price: number;
  currency: "UYU" | "USD";
  condition: "new" | "refurbished" | "used" | "unknown";
  available: boolean;
  image: string | null;
  brand: string;
  model: string;
  /** Marketplace catalog id (MercadoLibre `catalog_product_id`), when the source has one. */
  catalogId: string | null;
  attributes: Record<string, string>;
  rating: number | null;
  ratingCount: number;
  location: string | null;
  freeShipping: boolean | null;
  officialStore: boolean;
  observedAt: string;
}

export interface RetailSourceResult {
  listings: RetailListing[];
  ok: boolean;
  note: string;
}

export type RetailStoreAdapter = "fenicio" | "shopify" | "woocommerce" | "vtex";

export interface RetailStore {
  key: string;
  name: string;
  baseUrl: string;
  adapter: RetailStoreAdapter;
  channel: RetailChannel;
  /**
   * Only a fallback for the sanity check — the real currency is read from the storefront at run
   * time. A store whose currency cannot be established is skipped, never guessed: publishing a
   * USD price as UYU (or the reverse) is a 40x error.
   */
  expectCurrency?: "UYU" | "USD";
  /** Shopify only: restrict the scan to these collection handles instead of the whole catalogue. */
  collections?: string[];
  enabled: boolean;
  note?: string;
}

/**
 * What a consumer wants out of the market. Everything category-specific lives here so the adapters
 * stay ignorant of what they are fetching.
 *
 * `accept` is the whole contract with a storefront adapter: it is asked once per product, and a
 * `false` drops the row. `urlHint` is a cost control, not a filter — a storefront sitemap can hold
 * 40k URLs and fetching every product page to find out it is a doormat is the expensive mistake.
 */
export interface CategorySpec {
  /** Identifies the spec in logs. */
  key: string;
  /** Is this product one of ours? `context` carries description/category/tags when the source has them. */
  accept: (title: string, context?: string) => boolean;
  /** Cheap pre-filter over product URLs before any PDP is fetched. Matches everything when absent. */
  urlHint?: RegExp;
  /**
   * Search terms for storefronts that filter server-side (the WooCommerce Store API), so a whole
   * catalogue is never pulled. Absent means "scan everything the store lists".
   */
  storeQueries?: readonly string[];
  /** MercadoLibre free-text searches. */
  mlQueries?: readonly string[];
  /** MercadoLibre category ids scanned alongside the text searches, so nothing niche is missed. */
  mlCategories?: readonly string[];
  /** Free text sent along with a category scan. Defaults to the first `mlQueries` entry. */
  mlCategoryQuery?: string;
  /**
   * Accepts a listing that came from a scanned ML *category* rather than a text query. Category
   * pages are already narrow, so this is usually laxer than {@link accept}. Defaults to `accept`.
   */
  acceptFromCategory?: (title: string, attributes: Record<string, string>) => boolean;
  /** Facebook Marketplace searches. */
  fbQueries?: readonly string[];
}
