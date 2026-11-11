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

type Quote = { buy?: number | null; sell?: number | null };

const price = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/**
 * "¿Este precio está fuera de mercado?" para UN lado de una moneda. `quotes` es el mercado entero
 * de esa moneda, una pizarra por casa; con menos de MIN_SAMPLE no se descarta nada.
 */
export function offMarketSide(quotes: ReadonlyArray<Quote>, code: string, side: QuoteSide): (q: Quote) => boolean {
  if (quotes.length < MIN_SAMPLE) return () => false;
  const reference = median(quotes.map((q) => price(q[side])).filter((n): n is number => n !== null));
  const band = bandFor(code, side);
  return (q) => {
    const value = price(q[side]);
    return value !== null && pastBand(value, reference, side, band);
  };
}
