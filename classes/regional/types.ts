// The shape every regional source is normalised into.
//
// Six countries publish their exchange rates in six different shapes: Argentina
// has seven simultaneous dollars, Brazil has a central-bank fixing plus a
// tourism rate, Paraguay publishes an hourly reference table, Chile publishes
// yesterday's observed rate, Bolivia has an official rate nobody trades at.
// Comparing them at all requires one row shape, and the row has to carry WHERE
// it came from — a blue rate and a PTAX fixing are not the same kind of number
// and a page that stacks them without saying so is lying by layout.

/** Countries the regional board covers. */
export type RegionalCountry = "AR" | "BR" | "CL" | "PY" | "BO" | "UY";

/**
 * What kind of price this is. Not decoration: the API and the pages group by
 * this, and the comparison logic only ever compares like with like.
 *
 * - `official`   — a central bank's own rate (BCRA, PTAX, BCP referencial, dólar observado).
 * - `wholesale`  — interbank / mayorista, the price banks trade at.
 * - `parallel`   — the street/informal price (blue, paralelo boliviano).
 * - `financial`  — legal market-priced dollars (MEP/bolsa, CCL, cripto).
 * - `card`       — what a card purchase abroad actually costs (dólar tarjeta, dólar turismo).
 * - `retail`     — what a casa de cambio charges a walk-in customer.
 * - `reference`  — a cross rate published by a third party, not a market price.
 */
export type RegionalKind =
  | "official"
  | "wholesale"
  | "parallel"
  | "financial"
  | "card"
  | "retail"
  | "reference";

/** One normalised quote: the price of one `base` unit expressed in `quote`. */
export interface RegionalQuote {
  /** Stable key: `${country}:${market}:${base}${quote}` (e.g. `AR:blue:USDARS`). */
  id: string;
  country: RegionalCountry;
  /** Market slug inside the country (`blue`, `oficial`, `ptax`, `turismo`, ...). */
  market: string;
  /** Human label in Spanish (`Dólar blue`, `Dólar PTAX`). */
  label: string;
  kind: RegionalKind;
  /** Unit currency (ISO 4217). One `base` costs `buy`/`sell` of `quote`. */
  base: string;
  /** Price currency (ISO 4217). */
  quote: string;
  /** What the market PAYS for one `base`, in `quote`. Null when unpublished. */
  buy: number | null;
  /** What the market CHARGES for one `base`, in `quote`. Null when unpublished. */
  sell: number | null;
  /** Mid price. Always present: the only field every consumer can rely on. */
  avg: number;
  /** `(sell/buy - 1) * 100`, or null when either leg is missing. */
  spreadPct: number | null;
  /** Session high, when the source publishes one. */
  high?: number | null;
  /** Session low, when the source publishes one. */
  low?: number | null;
  /** Percent change the SOURCE reports (never computed here). */
  variationPct?: number | null;
  /** When the source says this price was set (ISO 8601, UTC). */
  updatedAt: string;
  /**
   * How many independent boards this row summarises, when it summarises any.
   * Only the Uruguayan "best of market" row carries it, and it is the difference
   * between "the best of 20 casas" and "the only casa that quotes it" — which
   * the reader has to know before treating a one-casa price as a market.
   */
  sample?: number;
  /** Source id from the catalog. */
  source: string;
  /** Page/endpoint the value came from, so any figure can be re-checked. */
  sourceUrl: string;
  /**
   * Other sources that published this same market this run and agreed. Empty
   * means nobody corroborated it — which is normal (only Argentina is covered
   * by four publishers) but worth knowing before quoting the number.
   */
  corroboratedBy?: string[];
  /**
   * Widest disagreement between the published value and a corroborating source,
   * in percent. A number here is a quality signal, not an error: two honest
   * surveys of the blue differ by a few tenths.
   */
  disagreementPct?: number | null;
}

/** Static description of one upstream. Served by `GET /regional/sources`. */
export interface RegionalSourceMeta {
  id: string;
  /** Publisher, as it calls itself. */
  name: string;
  /**
   * The country whose prices it publishes. For a worldwide feed this is the
   * least wrong of six answers, so `global` marks it and the tables say "Global"
   * instead of naming a country the publisher never singled out.
   */
  country: RegionalCountry;
  /** True for feeds that quote every currency and belong to no country. */
  global?: boolean;
  /** Human-facing home of the data. */
  url: string;
  /** `api` = documented JSON endpoint; `scrape` = HTML we parse ourselves. */
  access: "api" | "scrape";
  /** Who publishes it: a central bank, a market data vendor, a casa de cambio. */
  publisher: "central-bank" | "market-data" | "media" | "exchange-house";
  /** One line on what it adds that nothing else does. */
  covers: string;
}

/** A source's result for one run. A failure is data, not an exception. */
export interface RegionalSourceRun {
  id: string;
  ok: boolean;
  quotes: RegionalQuote[];
  /** Why it failed, or what it brought back. Always human-readable. */
  note: string;
  ms: number;
}

/** Parallel-vs-official gap for one country. */
export interface RegionalGap {
  country: RegionalCountry;
  /** Market whose price sits above the official one. */
  market: string;
  label: string;
  official: number;
  parallel: number;
  /** `(parallel/official - 1) * 100`. */
  gapPct: number;
}

/** One country's line on the regional board. */
export interface RegionalBoardRow {
  country: RegionalCountry;
  name: string;
  currency: string;
  /** The rate that country's own central bank stands behind. */
  official: RegionalQuote | null;
  /** The freely-traded price when one exists (blue, paralelo, turismo). */
  parallel: RegionalQuote | null;
  /** What a walk-in customer pays, when a casa publishes it. */
  retail: RegionalQuote | null;
  /** Every quote for the country, in publication order. */
  quotes: RegionalQuote[];
  gap: RegionalGap | null;
  /** USD per unit of the local currency, from the reference rate. */
  usdPerUnit: number | null;
}

/** One cell of the region's cross-rate matrix, implied through the dollar. */
export interface RegionalCross {
  base: string;
  quote: string;
  /** Units of `quote` per one `base`. */
  rate: number;
  /** The two legs it was derived from (`AR:oficial:USDARS`, ...). */
  via: [string, string];
}

/** One way of ending up holding a foreign currency, priced in pesos uruguayos. */
export interface RegionalRoute {
  kind: "local" | "dollars";
  label: string;
  /** Uruguayan pesos per one unit of the foreign currency. */
  costPerUnit: number;
  /** Quote ids the figure was built from, in order of use. */
  legs: string[];
  note: string;
}

/** "¿Compro la moneda acá o llevo dólares?", answered for one country. */
export interface RegionalRouteComparison {
  country: RegionalCountry;
  countryName: string;
  currency: string;
  routes: RegionalRoute[];
  /** Which route costs less, or null when only one could be priced. */
  best: "local" | "dollars" | null;
  /** How much more the losing route costs, in percent. */
  differencePct: number | null;
  /** Legs the comparison needed and did not have. */
  missing: string[];
}

/** The whole snapshot, as stored and as `GET /regional` serves it. */
export interface RegionalSnapshot {
  /** When this run finished (ISO 8601). */
  generatedAt: string;
  /** Oldest `updatedAt` among the published quotes — the real freshness floor. */
  oldestQuoteAt: string | null;
  quotes: RegionalQuote[];
  board: RegionalBoardRow[];
  gaps: RegionalGap[];
  cross: RegionalCross[];
  /** "¿Compro la moneda acá o llevo dólares?" for every neighbour. */
  routes: RegionalRouteComparison[];
  sources: Array<Pick<RegionalSourceRun, "id" | "ok" | "note" | "ms"> & { quotes: number }>;
  /** Quotes a validator refused, with the reason. Published on purpose. */
  rejected: Array<{ id: string; source: string; reason: string; value: number | null }>;
}

/** One stored daily point of a series. Unique on `key` + `day`. */
export interface RegionalHistoryPoint {
  /** `${country}:${market}:${base}${quote}` — same key as the quote it came from. */
  key: string;
  country: RegionalCountry;
  market: string;
  base: string;
  quote: string;
  /** Calendar day, `YYYY-MM-DD`, in the country's own timezone. */
  day: string;
  buy: number | null;
  sell: number | null;
  avg: number;
  source: string;
}

export const REGIONAL_COUNTRY_NAMES: Record<RegionalCountry, string> = {
  AR: "Argentina",
  BR: "Brasil",
  CL: "Chile",
  PY: "Paraguay",
  BO: "Bolivia",
  UY: "Uruguay",
};

export const REGIONAL_COUNTRY_CURRENCY: Record<RegionalCountry, string> = {
  AR: "ARS",
  BR: "BRL",
  CL: "CLP",
  PY: "PYG",
  BO: "BOB",
  UY: "UYU",
};

/** Timezone each country's calendar day is measured in. */
export const REGIONAL_COUNTRY_TZ: Record<RegionalCountry, string> = {
  AR: "America/Argentina/Buenos_Aires",
  BR: "America/Sao_Paulo",
  CL: "America/Santiago",
  PY: "America/Asuncion",
  BO: "America/La_Paz",
  UY: "America/Montevideo",
};
