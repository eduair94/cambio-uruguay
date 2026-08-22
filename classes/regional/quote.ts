// One constructor for every quote in the system.
//
// Every source builds its rows through `makeQuote`, so `id`, `avg` and
// `spreadPct` are derived in exactly one place. A source that publishes only one
// side (Chile's observed rate, Bolivia's official rate) still gets an `avg`;
// a source that publishes both gets a spread it never had to compute itself.
import type { RegionalCountry, RegionalKind, RegionalQuote } from "./types";

export interface MakeQuoteInput {
  country: RegionalCountry;
  market: string;
  label: string;
  kind: RegionalKind;
  base: string;
  quote: string;
  buy?: number | null;
  sell?: number | null;
  /** Used when the source publishes a single mid price (PTAX, observado). */
  avg?: number | null;
  high?: number | null;
  low?: number | null;
  variationPct?: number | null;
  /** Number of independent boards behind a composite row (see RegionalQuote). */
  sample?: number;
  updatedAt: string | Date | null | undefined;
  source: string;
  sourceUrl: string;
}

const isPos = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Round to `decimals`, keeping enough precision for guaraníes and for BRL alike. */
export function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * How the source writes numbers. NOT a detail — guessing it is how a real bug
 * shipped here: AwesomeAPI's `"5.138"` (five point one three eight reales per
 * dollar) read as a thousands group became 5 138, so the buy leg came out a
 * thousand times the sell leg and the validator threw the whole Brazilian
 * commercial quote away. `5.138` and `6.021` are indistinguishable without
 * knowing who wrote them, so every call site says which convention it is in.
 *
 * - `latam` — `6.021,64`: dot groups thousands, comma is the decimal (Ámbito,
 *   BCP, DolarHoy — anything rendered for a Spanish-speaking reader).
 * - `dot` — `5.1395`: a plain machine decimal (JSON APIs).
 * - `auto` — comma wins when present, otherwise dot-plus-exactly-three-digits is
 *   read as a thousands group. Only for input whose origin is genuinely unknown.
 */
export type NumberStyle = "latam" | "dot" | "auto";

export function parseLocaleNumber(
  raw: string | number | null | undefined,
  style: NumberStyle = "auto"
): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (!raw) return null;
  const text = String(raw)
    .replace(/[\s ]/g, "")
    .replace(/[^\d.,-]/g, "");
  if (!text) return null;

  let normalised: string;
  if (style === "dot") {
    normalised = text.replace(/,/g, "");
  } else if (style === "latam") {
    normalised = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    normalised = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    normalised = text.replace(/\./g, "");
  } else {
    normalised = text;
  }
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

/** Build the canonical id of a quote without building the quote. */
export function quoteId(country: string, market: string, base: string, quote: string): string {
  return `${country}:${market}:${base}${quote}`;
}

/**
 * Normalise one source row. Returns null when there is no usable price at all —
 * a source that answers with zeros contributes nothing, and a zero that reaches
 * the board becomes a division by zero three layers later.
 */
export function makeQuote(input: MakeQuoteInput): RegionalQuote | null {
  // A card dollar has no buy side. Argentina's "dólar tarjeta" is defined as the
  // official rate plus the tax load on a card purchase abroad: it is a price you
  // pay, never one anybody pays you. Publishers still fill a `compra` field —
  // with the official buy rate, or with the rate before tax — and three sources
  // disagreed by 11% purely on that meaningless leg. Dropping it here means the
  // consensus check compares the number that exists.
  const isCard = input.kind === "card";
  const buy = !isCard && isPos(input.buy) ? round(input.buy) : null;
  const sell = isPos(input.sell) ? round(input.sell) : null;
  const explicitAvg = isPos(input.avg) ? round(input.avg) : null;

  let avg: number | null = explicitAvg;
  if (avg === null) {
    if (buy !== null && sell !== null) avg = round((buy + sell) / 2);
    else avg = sell ?? buy;
  }
  if (avg === null) return null;

  const updatedAt =
    input.updatedAt instanceof Date
      ? input.updatedAt.toISOString()
      : typeof input.updatedAt === "string" && input.updatedAt
        ? isoOrNow(input.updatedAt)
        : new Date().toISOString();

  return {
    id: quoteId(input.country, input.market, input.base, input.quote),
    country: input.country,
    market: input.market,
    label: input.label,
    kind: input.kind,
    base: input.base,
    quote: input.quote,
    buy,
    sell,
    avg,
    spreadPct: buy !== null && sell !== null && buy > 0 ? round((sell / buy - 1) * 100, 4) : null,
    high: isPos(input.high) ? round(input.high) : null,
    low: isPos(input.low) ? round(input.low) : null,
    variationPct:
      typeof input.variationPct === "number" && Number.isFinite(input.variationPct)
        ? round(input.variationPct, 4)
        : null,
    ...(typeof input.sample === "number" ? { sample: input.sample } : {}),
    updatedAt,
    source: input.source,
    sourceUrl: input.sourceUrl,
  };
}

/** Accept whatever date shape a source hands us; fall back to "now" rather than to an invalid date. */
export function isoOrNow(raw: string): string {
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  // `dd/mm/yyyy` and `dd/mm/yyyy - HH:MM` (Ámbito, BCB).
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[^\d]+(\d{2}):(\d{2}))?/);
  if (match) {
    const [, d, m, y, hh, mm] = match;
    const parsed = new Date(`${y}-${m}-${d}T${hh || "00"}:${mm || "00"}:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}
