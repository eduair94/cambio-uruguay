// Las dos medidas. El nivel es p25/mediana/p75 de precios pedidos (cuantiles con interpolación lineal
// en (n-1)p, los mismos de propertyzones/market.ts). La misma oferta es la media GEOMÉTRICA de
// precio_hoy / precio_entonces: -20 % y +25 % se anulan, como tiene que ser con razones.
import type { MarketPairStats } from "./types";

export const MARKET_SAMPLE_MINIMUM = 8;
export const MARKET_PAIR_MINIMUM = 8;
/** A same-advert ratio outside this band is a typo or a unit change, not a repricing. */
export const MARKET_PAIR_BAND = { min: 0.5, max: 2 } as const;
/** Under +/-0.5 % a pair counts as unchanged: a rounding is not a move. */
export const MARKET_CHANGE_EPSILON = 0.005;
export const MARKET_WINDOWS = [7, 30, 90] as const;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function quantile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
}

export function levelStats(prices: readonly number[]): { n: number; p25: number | null; med: number | null; p75: number | null } {
  const sorted = [...prices].sort((a, b) => a - b);
  if (sorted.length < MARKET_SAMPLE_MINIMUM) return { n: sorted.length, p25: null, med: null, p75: null };
  return {
    n: sorted.length,
    p25: round2(quantile(sorted, 0.25)),
    med: round2(quantile(sorted, 0.5)),
    p75: round2(quantile(sorted, 0.75)),
  };
}

export function medianStats(values: readonly number[]): { n: number; med: number | null } {
  const sorted = [...values].sort((a, b) => a - b);
  return { n: sorted.length, med: sorted.length >= MARKET_SAMPLE_MINIMUM ? round2(quantile(sorted, 0.5)) : null };
}

export function pairStats(ratios: readonly number[]): MarketPairStats {
  let n = 0;
  let down = 0;
  let up = 0;
  let same = 0;
  let outliers = 0;
  let logSum = 0;
  for (const ratio of ratios) {
    if (!Number.isFinite(ratio) || ratio < MARKET_PAIR_BAND.min || ratio > MARKET_PAIR_BAND.max) {
      outliers++;
      continue;
    }
    n++;
    logSum += Math.log(ratio);
    if (ratio < 1 - MARKET_CHANGE_EPSILON) down++;
    else if (ratio > 1 + MARKET_CHANGE_EPSILON) up++;
    else same++;
  }
  const chg = n >= MARKET_PAIR_MINIMUM ? Math.round((Math.exp(logSum / n) - 1) * 10_000) / 10_000 : null;
  // `-0` (a geometric mean that rounds to nothing from below) reads as "0,0 %", not "-0,0 %".
  return { n, chg: chg === 0 ? 0 : chg, down, up, same, outliers };
}
