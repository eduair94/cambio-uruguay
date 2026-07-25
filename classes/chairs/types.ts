export const CHAIR_QUERIES = [
  '"silla" escritorio',
  '"silla" oficina',
  '"silla" ergonómica',
  '"silla" ergonomica',
  '"silla" gamer',
  '"sillas" recomendación',
] as const;

export const CHAIR_THEMES = [
  "comfort",
  "ergonomics",
  "adjustability",
  "durability",
  "value",
  "support",
  "heat",
  "build",
] as const;

export type ChairTheme = (typeof CHAIR_THEMES)[number];
export type ChairTier = "S" | "A" | "B" | "C" | "D";
export type ChairConfidence = "low" | "medium" | "high";

export interface ChairSourceComment {
  commentId: string;
  postId: string;
  sourceType: "post" | "comment";
  parentId: string | null;
  depth: number;
  postTitle: string;
  body: string;
  score: number;
  createdUtc: number;
  date: string;
  permalink: string;
  author: string;
}

export interface ChairClassification {
  commentId: string;
  name: string;
  brand: string;
  model: string;
  sentiment: number;
  themes: ChairTheme[];
}

export interface ChairEvidence {
  commentId: string;
  postId: string;
  sourceType: "post" | "comment";
  parentId: string | null;
  depth: number;
  postTitle: string;
  author: string;
  body: string;
  excerpt: string;
  sentiment: number;
  themes: ChairTheme[];
  score: number;
  date: string;
  permalink: string;
}

export interface ChairReviewPoint {
  text: string;
  sourceIds: string[];
}

export interface ChairGeneralReview {
  verdict: string;
  pros: ChairReviewPoint[];
  cons: ChairReviewPoint[];
}

export interface ChairPurchaseOffer {
  id: string;
  seller: string;
  channel: "local-store" | "marketplace" | "importer" | "comparator";
  title: string;
  price: number;
  currency: "UYU" | "USD";
  url: string;
  condition: "new" | "refurbished" | "used" | "unknown";
  verifiedAt: string;
  note?: string;
}

export interface ChairMedia {
  url: string;
  alt: string;
  sourceName: string;
  sourceUrl: string;
}

export interface ChairThemeCount {
  id: ChairTheme;
  mentions: number;
  positive: number;
  negative: number;
}

export interface ChairTierItem {
  slug: string;
  name: string;
  brand: string;
  model: string;
  tier: ChairTier | null;
  score: number;
  confidence: ChairConfidence;
  sources: number;
  posts: number;
  comments: number;
  replies: number;
  uniqueAuthors: number;
  positive: number;
  neutral: number;
  negative: number;
  themes: ChairThemeCount[];
  summary: string;
  generalReview: ChairGeneralReview;
  evidence: ChairEvidence[];
  offers: ChairPurchaseOffer[];
  /** Lead photo. Always the first entry of `gallery` when one exists. */
  image: ChairMedia | null;
  /** Every verified photo we have for the chair, lead photo first. */
  gallery: ChairMedia[];
}

// ---------------------------------------------------------------------------
// Market catalog (daily price + review harvest). The tier list above is one
// evidence source feeding it; everything below describes the directory itself.
// ---------------------------------------------------------------------------

/** Where a listing was read from. `store` covers every real Uruguayan retailer. */
export type ChairMarketSource = "mercadolibre" | "facebook" | "store";

export type ChairChannel = "marketplace" | "local-store" | "importer" | "classifieds";

export type ChairCategory = "ergonomic" | "gaming" | "executive" | "operative" | "unknown";

/** A single price observation: one product, at one seller, at one moment. */
export interface ChairListing {
  /** Stable across runs: `ml:MLU123`, `store:bertoni:<sku>`, `fb:<id>`. */
  listingId: string;
  source: ChairMarketSource;
  /** Registry key of the store, or the marketplace id. */
  sellerKey: string;
  sellerName: string;
  channel: ChairChannel;
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

export interface ChairSpec {
  id: string;
  label: string;
  value: string;
}

/** A review quoted from outside Reddit (marketplace buyers, store review widgets). */
export interface ChairExternalReview {
  source: string;
  sourceUrl: string;
  rating: number | null;
  text: string;
  date: string | null;
}

/** One contribution to the published star rating, kept visible so the score stays auditable. */
export interface ChairRatingSignal {
  source: "reddit" | "mercadolibre" | "store" | "expert";
  stars: number;
  /** Number of independent opinions behind `stars`. */
  sampleSize: number;
  /** Share of the final score this signal carried, 0-1. */
  weight: number;
  detail: string;
}

/** A live offer as published on the directory. */
export interface ChairOffer {
  id: string;
  source: ChairMarketSource;
  sellerKey: string;
  seller: string;
  channel: ChairChannel;
  title: string;
  url: string;
  price: number;
  currency: "UYU" | "USD";
  /** `price` converted with the run's reference rate, for sorting and filtering only. */
  priceUyu: number;
  condition: "new" | "refurbished" | "used" | "unknown";
  available: boolean;
  freeShipping: boolean | null;
  location: string | null;
  image: string | null;
  observedAt: string;
}

export interface ChairPriceStats {
  min: number;
  max: number;
  median: number;
  /** Everything normalised to UYU with the run's reference rate. */
  currency: "UYU";
  samples: number;
  /** Cheapest offer that is both new and in stock, when one exists. */
  bestNew: number | null;
  bestUsed: number | null;
}

export interface ChairPricePoint {
  date: string;
  median: number;
  min: number;
  offers: number;
}

export interface ChairCatalogProduct {
  slug: string;
  /** Canonical dedupe key (normalised brand + model). */
  key: string;
  name: string;
  brand: string;
  model: string;
  category: ChairCategory;
  /** 1-5, one decimal. Null while there is no usable evidence at all. */
  stars: number | null;
  ratingCount: number;
  ratingSignals: ChairRatingSignal[];
  confidence: ChairConfidence;
  /** Slug of the matching r/CharruaDevs tier entry, when the chair is discussed there. */
  redditSlug: string | null;
  tier: ChairTier | null;
  price: ChairPriceStats | null;
  offers: ChairOffer[];
  sellers: number;
  specs: ChairSpec[];
  verdict: string;
  pros: ChairReviewPoint[];
  cons: ChairReviewPoint[];
  /** Reddit sources backing `pros`/`cons`, by `commentId`. */
  evidence: ChairEvidence[];
  reviews: ChairExternalReview[];
  images: ChairMedia[];
  history: ChairPricePoint[];
  /** Hash of the evidence behind verdict/pros/cons, so an unchanged chair is never re-generated. */
  reviewFingerprint: string;
  firstSeen: string;
  lastSeen: string;
}

/** Per-source health for one run, surfaced on the page so gaps are never silent. */
export interface ChairSourceRun {
  key: string;
  label: string;
  adapter: string;
  listings: number;
  chairs: number;
  ok: boolean;
  note: string;
}

export interface ChairCatalogMeta {
  key: "uy-desk-chairs";
  asOf: string;
  usdUyu: number;
  products: number;
  offers: number;
  sellers: number;
  sources: ChairSourceRun[];
}

export interface ChairTierSnapshot {
  key: "charruadevs-desktop-chairs";
  asOf: string;
  subreddit: "CharruaDevs";
  queries: string[];
  classifierModel: string;
  methodologyVersion: 2;
  corpus: {
    threads: number;
    comments: number;
    analyzed: number;
    uniqueAuthors: number;
  };
  tiers: ChairTierItem[];
  watchlist: ChairTierItem[];
}
