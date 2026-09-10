// Vocabulary for "what does it cost to fill an empty home in Uruguay".

export type EquiparTier = "S" | "A" | "B" | "C";

/**
 * How a category can honestly be published.
 *
 * `modelo` — the title carries a brand and a model, so listings from six sellers merge into one
 * product row with six offers and a link, exactly like the chair directory.
 *
 * `commodity` — there is no model to merge on. "Juego de ollas 5 piezas" identifies nothing, and a
 * description is not an identity: pooling those into a fake product would invent a thing that does
 * not exist. What such a category CAN publish honestly is the distribution — p25, median, p75 over
 * every listing that belongs to it.
 */
export type EquiparRegime = "modelo" | "commodity";

export type EquiparRoom = "cocina" | "dormitorio" | "bano" | "living" | "limpieza";

export interface EquiparVariant {
  key: string;
  label: string;
  /** Placed here when the title matches. */
  match?: RegExp;
  /** Placed here when a number in the title falls in range — litres, inches, centimetres. */
  numeric?: { unit: EquiparUnit; min: number; max: number };
  /** Where a listing lands when nothing matched. Exactly one variant per category has it. */
  fallback?: boolean;
  /** 1 = cheapest/smallest. The "mínima" basket takes rank 1; "completa" takes the middle. */
  rank: number;
}

export type EquiparUnit = "litros" | "pulgadas" | "cm" | "plazas" | "piezas" | "btu";

export interface EquiparCategory {
  key: string;
  label: string;
  room: EquiparRoom;
  tier: EquiparTier;
  regime: EquiparRegime;
  /** Why it sits in this tier. Published beside the row: a tier that cannot say why is an opinion. */
  reason: string;
  /** Is buying this second-hand sane? A used mattress is not a bargain. */
  usedOk: boolean;
  usedNote?: string;
  /** How many of these a first home needs (six plates, one fridge). Multiplies into the basket. */
  quantity?: number;
  variants: EquiparVariant[];
  /** The title has to match this… */
  include: RegExp;
  /** …and not this. */
  exclude?: RegExp;
  urlHint?: RegExp;
  storeQueries: readonly string[];
  mlQueries: readonly string[];
  mlCategories?: readonly string[];
  fbQueries: readonly string[];
}

/** One price observation kept for display: the cheapest offers behind a row. */
export interface EquiparOffer {
  seller: string;
  title: string;
  url: string;
  price: number;
  currency: "UYU" | "USD";
  /** Always in UYU, whatever the seller published, so rows are comparable. */
  priceUyu: number;
  condition: "new" | "used";
  source: "store" | "mercadolibre" | "facebook";
  observedAt: string;
}

export interface EquiparBand {
  p25: number;
  median: number;
  p75: number;
  min: number;
  n: number;
}

/** A branded product inside a `modelo` category: one row, many offers. */
export interface EquiparProduct {
  slug: string;
  name: string;
  brand: string;
  model: string;
  image: string | null;
  offers: EquiparOffer[];
  bestPriceUyu: number;
  sellers: number;
}

export interface EquiparItem {
  /** `<category>:<variant>`. */
  key: string;
  category: string;
  categoryLabel: string;
  variant: string;
  variantLabel: string;
  room: EquiparRoom;
  tier: EquiparTier;
  /**
   * Position of the category in the registry, which is the published necessity order.
   *
   * It is stored rather than re-derived because the planner and the tier table MUST agree: a plan
   * that buys in a different order from the one the page prints contradicts the page. Sorting by
   * price inside a tier looks reasonable and is not — it just picks a different essential to drop.
   */
  rank: number;
  regime: EquiparRegime;
  reason: string;
  usedOk: boolean;
  usedNote?: string;
  quantity: number;
  /** New and used are NEVER pooled: two markets, two bands, always. */
  newBand: EquiparBand | null;
  usedBand: EquiparBand | null;
  /**
   * Percent off the new median. Published only when both bands cleared the sample floor — a saving
   * computed against three Marketplace posts is a number we made up.
   */
  usedSavingPct: number | null;
  /** `modelo` categories only. */
  products: EquiparProduct[];
  /** Cheapest honest offers, new first. */
  offers: EquiparOffer[];
  /** Rows below p10/2 of their own category: shown, explained, never at the top. */
  suspectDropped: number;
  observedAt: string | null;
}

export type EquiparBasketKey = "minima" | "decente" | "completa";

export interface EquiparBasketLine {
  itemKey: string;
  label: string;
  variantLabel: string;
  tier: EquiparTier;
  quantity: number;
  unitPriceUyu: number;
  totalUyu: number;
  condition: "new" | "used";
}

export interface EquiparBasket {
  key: EquiparBasketKey;
  label: string;
  tiers: EquiparTier[];
  lines: EquiparBasketLine[];
  /**
   * The sum of what we could price. It is NOT "what a home costs" unless `missing` is empty — a
   * total that quietly drops the fridge is lower than the truth, which is the exact failure the
   * supermarket basket taught us.
   */
  totalUyu: number;
  totalUsd: number | null;
  /** Categories in this basket that have no usable band. Published beside the total, never hidden. */
  missing: Array<{ itemKey: string; label: string; tier: EquiparTier }>;
  complete: boolean;
}

export interface EquiparSourceRun {
  key: string;
  label: string;
  adapter: string;
  listings: number;
  ok: boolean;
  note: string;
}

export interface EquiparMeta {
  generatedAt: string;
  usdUyu: number;
  listings: number;
  items: number;
  runs: EquiparSourceRun[];
  baskets: EquiparBasket[];
  /** Categories that produced nothing this run, so the page can say so instead of hiding them. */
  uncovered: string[];
}
