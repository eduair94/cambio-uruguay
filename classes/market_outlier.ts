// Copia de app/utils/marketOutlier.ts: la regla con la que el sitio decide qué precio puede coronar
// como "el mejor". El backend la usa para el resumen que lee la IA (ai_service.ts), que hasta el
// 2026-11-11 le pasaba como venta mínima del dólar una pizarra quieta desde julio a 39,55, y la IA la
// recomendaba. Son dos paquetes y dos builds, y el backend no importa de `app/`;
// tests/market_outlier_parity.test.ts corre las dos copias (y la del MCP) sobre los mismos mercados.
//
// Las cifras de cada banda, y por qué, están en el original.

export const OFF_MARKET_PCT = 3;
export const MIN_SAMPLE = 10;

export type QuoteSide = "buy" | "sell";
export type MarketBand = { pct: number } | { factor: number };

export const OFF_MARKET_BANDS: Readonly<Record<string, Readonly<Record<QuoteSide, MarketBand>>>> = Object.freeze({
  USD: { sell: { pct: OFF_MARKET_PCT }, buy: { pct: 4 } },
  EUR: { sell: { pct: OFF_MARKET_PCT }, buy: { pct: 3.5 } },
  BRL: { sell: { pct: 12 }, buy: { pct: 15 } },
  ARS: { sell: { factor: 4 }, buy: { factor: 2 } },
});

const DEFAULT_BAND: MarketBand = { pct: OFF_MARKET_PCT };

export function bandFor(code: string | null | undefined, side: QuoteSide): MarketBand {
  return (code && OFF_MARKET_BANDS[code.toUpperCase()]?.[side]) || DEFAULT_BAND;
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Una venta tan barata, o una compra tan generosa, que no es un precio. Sólo en ese sentido. */
export function pastBand(value: number, reference: number | null, side: QuoteSide, band: MarketBand = DEFAULT_BAND): boolean {
  if (reference === null || reference === 0) return false;
  if ("factor" in band) {
    return side === "sell" ? value < reference / band.factor : value > reference * band.factor;
  }
  const pct = ((value - reference) / reference) * 100;
  return side === "sell" ? pct < -band.pct : pct > band.pct;
}

/**
 * Una cotización como la lee la regla. `frozen` es la marca del backend (classes/frozen_marks.ts):
 * esta pizarra publica la misma compra y venta desde hace días, más de lo que su propio grupo
 * considera normal (`rate_staleness.ts`). Sólo la llevan las filas de hoy.
 */
type Quote = { buy?: number | null; sell?: number | null; frozen?: boolean | null };

const price = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/** La mitad de la banda: un precio más allá de la banda de su lado, alrededor de la mediana. */
function bandSide(quotes: ReadonlyArray<Quote>, code: string, side: QuoteSide): (q: Quote) => boolean {
  if (quotes.length < MIN_SAMPLE) return () => false;
  const reference = median(quotes.map((q) => price(q[side])).filter((n): n is number => n !== null));
  const band = bandFor(code, side);
  return (q) => {
    const value = price(q[side]);
    return value !== null && pastBand(value, reference, side, band);
  };
}

/** El mejor precio de `side` entre las pizarras que ni están quietas ni se descartan, o null. */
function bestLive(quotes: ReadonlyArray<Quote>, side: QuoteSide, rejected: (q: Quote) => boolean): number | null {
  let best: number | null = null;
  for (const q of quotes) {
    if (q.frozen === true || rejected(q)) continue;
    const value = price(q[side]);
    if (value === null) continue;
    if (best === null || (side === "sell" ? value < best : value > best)) best = value;
  }
  return best;
}

/** Una pizarra quieta que iguala o mejora a `best` en `side`: el único lugar donde hace daño. */
function aheadOf(q: Quote, side: QuoteSide, best: number | null): boolean {
  if (q.frozen !== true || best === null) return false;
  const value = price(q[side]);
  return value !== null && (side === "sell" ? value <= best : value >= best);
}

/**
 * "¿Este precio está fuera de mercado?" para UN lado de una moneda. `quotes` es el mercado entero
 * de esa moneda, una pizarra por casa; con menos de MIN_SAMPLE la banda no descarta nada. Una
 * pizarra quieta (`frozen`) queda afuera sólo si iguala o mejora el mejor precio vivo de `within`
 * (por defecto, el mercado; si `within` no tiene ninguna viva, el del mercado): ahí es donde sube al
 * titular.
 */
export function offMarketSide(
  quotes: ReadonlyArray<Quote>,
  code: string,
  side: QuoteSide,
  within: ReadonlyArray<Quote> = quotes
): (q: Quote) => boolean {
  const band = bandSide(quotes, code, side);
  const best = bestLive(within, side, band) ?? bestLive(quotes, side, band);
  return (q) => band(q) || aheadOf(q, side, best);
}

/** Las pizarras quietas que igualan o mejoran el mejor precio vivo de `within` en `side`. */
export function frozenAheadIn(within: ReadonlyArray<Quote>, side: QuoteSide): (q: Quote) => boolean {
  const best = bestLive(within, side, () => false);
  return (q) => aheadOf(q, side, best);
}
