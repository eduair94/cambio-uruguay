// Seguimiento de precios de mercado: alquileres, viviendas en venta y autos usados. Una serie diaria
// por cohorte ("cada producto") con dos medidas que NO son lo mismo: el nivel (p25/mediana/p75 de lo
// que se pide hoy, sensible a qué avisos entran y salen) y la variación de la misma oferta (el mismo
// aviso contra su propio precio de hace 7/30/90 días, que no depende de la composición).
// Diseño: docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md.
//
// Espejo público en app/utils/marketSeries.ts (la app no importa la raíz); la paridad de las
// constantes la vigila app/tests/unit/marketSeries.test.ts leyendo este directorio como texto.

export const MARKET_VERTICALS = ["alquiler", "venta", "autos"] as const;
export type MarketVertical = (typeof MARKET_VERTICALS)[number];
export type MarketCurrency = "UYU" | "USD";
export type MarketPropertyType = "apartamento" | "casa";
export type MarketTypeBucket = MarketPropertyType | "todas";
export type MarketBedrooms = "any" | "0" | "1" | "2" | "3" | "4plus";
export type MarketScope = "uy" | "department" | "neighborhood" | "all" | "model" | "year";
export type MarketWindow = 7 | 30 | 90;

/** One advert in today's public catalogue, already validated by that catalogue's own rules. */
export interface MarketObservation {
  vertical: MarketVertical;
  /** Stable per advert across runs. */
  advertId: string;
  /** Unit of the level: the rental PROPERTY (several portals, one home); the advert elsewhere. */
  groupKey: string;
  price: number;
  currency: MarketCurrency;
  /** The catalogue's own lastSeen, raw (day or ISO): picks the representative. */
  seenAt: string;
  /** YYYY-MM-DD of seenAt: the day this price was actually observed. */
  seenDay: string;
  areaBuilt: number | null;
  department: string | null;
  neighborhood: string | null;
  propertyType: MarketPropertyType | null;
  bedrooms: number | null;
  marketSlug: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
}

export interface MarketPricePoint {
  d: string;
  p: number;
  c: MarketCurrency;
}

/** Private change log of one advert: a point only when its price or currency changes. */
export interface MarketPriceLog {
  key: string;
  vertical: MarketVertical;
  advertId: string;
  /** First day THIS job saw the advert — not the portal's publication date. */
  firstSeen: string;
  lastSeen: string;
  points: MarketPricePoint[];
}

export interface MarketPairStats {
  /** Pairs inside the plausibility band. */
  n: number;
  /** Geometric mean of price_today / price_then, minus 1. Null under MARKET_PAIR_MINIMUM. */
  chg: number | null;
  down: number;
  up: number;
  same: number;
  /** Pairs outside [0.5, 2]: a typo or a unit change, never a repricing. */
  outliers: number;
}

export interface MarketSeriesPoint {
  d: string;
  n: number;
  p25: number | null;
  med: number | null;
  p75: number | null;
  /** Housing only: asking price per built square metre. */
  m2: { n: number; med: number | null } | null;
  w7: MarketPairStats | null;
  w30: MarketPairStats | null;
  w90: MarketPairStats | null;
}

/** The shape of a cohort's prices that day (classes/marketseries/histogram.ts). */
export interface MarketHistogram {
  n: number;
  /** Log-spaced bins (the page draws them at equal width, which is a log axis). */
  log: boolean;
  /** `counts.length + 1` strictly increasing edges; the last bin includes its right edge. */
  edges: number[];
  counts: number[];
  /** Observations under the first edge / over the last one (the p1..p99 cut). */
  below: number;
  above: number;
}

export interface MarketCohortDims {
  vertical: MarketVertical;
  currency: MarketCurrency;
  scope: MarketScope;
  propertyType: MarketTypeBucket | null;
  bedrooms: MarketBedrooms | null;
  departmentSlug: string | null;
  neighborhoodSlug: string | null;
  marketSlug: string | null;
  year: number | null;
}

export interface MarketCohort {
  key: string;
  dims: MarketCohortDims;
}

export interface MarketCohortLabels {
  department: string | null;
  neighborhood: string | null;
  brand: string | null;
  model: string | null;
}

export interface MarketSeriesEntry {
  cohort: MarketCohort;
  labels: MarketCohortLabels;
  label: string;
  point: MarketSeriesPoint;
  /** Null under MARKET_HISTOGRAM_MINIMUM or when every price is the same. */
  hist: MarketHistogram | null;
}

/** Stored in `marketseries`, one per cohort. */
export interface MarketSeriesDoc {
  key: string;
  vertical: MarketVertical;
  dims: MarketCohortDims;
  labels: MarketCohortLabels;
  label: string;
  latest: MarketSeriesPoint;
  updatedAt: string;
  points: MarketSeriesPoint[];
  /** Daily shapes, newest last, kept for MARKET_HIST_MAX_DAYS (the page overlays today on ~30 days ago). */
  hists?: Array<MarketHistogram & { d: string }>;
}

export interface MarketIndexScope {
  token: string;
  scope: "uy" | "department" | "neighborhood";
  department: string | null;
  neighborhood: string | null;
  label: string;
  n: Partial<Record<MarketCurrency, number>>;
}

export interface MarketIndexModel {
  slug: string;
  brand: string;
  model: string;
  n: number;
  med: number | null;
  w30: number | null;
}

export interface MarketMover {
  key: string;
  label: string;
  currency: MarketCurrency;
  window: MarketWindow;
  chg: number;
  pairs: number;
  down: number;
  up: number;
}

/** Stored in `marketseriesmetas` as `index:<vertical>`: everything the page's selectors need. */
export interface MarketSeriesIndex {
  key: string;
  vertical: MarketVertical;
  day: string;
  generatedAt: string;
  dataAsOf: string;
  trackingSince: string;
  observations: number;
  cohorts: number;
  excluded: Record<string, number>;
  scopes: MarketIndexScope[];
  models: MarketIndexModel[];
  movers: { window: MarketWindow | null; down: MarketMover[]; up: MarketMover[] };
}
