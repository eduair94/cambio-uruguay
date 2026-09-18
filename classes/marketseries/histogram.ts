// La forma de los precios de una cohorte: un histograma de los precios reales, no una campana ajustada
// encima. Los precios pedidos no son simétricos (venta, todo el país: el tramo p50→p75 mide 2,7 veces
// el p25→p50) y una normal pondría el centro donde no está y probabilidad en precios negativos.
//
// - Se dibuja desde 30 observaciones: con menos, la forma es ruido.
// - El eje va de p1 a p99; lo que queda afuera se cuenta aparte (`below`/`above`). En esas colas
//   viven los errores de carga, y dejarlos adentro aplastaría el resto del gráfico.
// - Si p99 es 4 veces p1 o más, los tramos son logarítmicos: con tramos lineales, la cola cara se
//   come el eje y el cuerpo del mercado queda en dos barras.
// - Unas √n barras (entre 6 y 20): 20 barras para 71 autos dibujaban ruido (4, 9, 2, 3, 8, 13...).
// - Un tramo lineal es múltiplo del redondeo que usa la mayoría de los precios. La gente pide
//   números redondos: en Pocitos, 2 dormitorios, $45.000 tenía 127 avisos y $42.500 18. Con tramos
//   de $2.500 las barras serpenteaban por eso solo; con tramos de $5.000 cada barra lleva los
//   mismos redondos.
import { quantile } from "./stats";
import type { MarketHistogram } from "./types";

export const MARKET_HISTOGRAM_MINIMUM = 30;
export const MARKET_HISTOGRAM_MIN_BINS = 6;
export const MARKET_HISTOGRAM_MAX_BINS = 20;
export const MARKET_HISTOGRAM_LOG_RATIO = 4;

const GRANULARITIES = [100_000, 50_000, 10_000, 5_000, 1_000, 500, 100, 50, 10, 1];

/**
 * The coarsest rounding at least half the prices are a multiple of (5.000 for most rents) that still
 * leaves three bars across the axis: a coarser one would squeeze the whole market into one or two.
 */
function granularity(prices: readonly number[], span: number): number {
  return (
    GRANULARITIES.find(
      unit => unit * 3 <= span && prices.filter(price => price % unit === 0).length * 2 >= prices.length,
    ) ?? 1
  );
}

/** The smallest of 1, 2, 5 x 10^k times `unit` that is at least `raw`. */
function niceStep(raw: number, unit: number): number {
  let power = unit;
  for (;;) {
    for (const base of [1, 2, 5]) if (base * power >= raw * (1 - 1e-12)) return base * power;
    power *= 10;
  }
}

const roundSignificant = (value: number, digits: number): number => {
  const power = 10 ** (Math.floor(Math.log10(Math.abs(value))) - digits + 1);
  return Math.round(value / power) * power;
};

/** Removes float noise from a multiple of a nice step (0.1 + 0.2 must print as 0.3). */
const clean = (value: number): number => Number(value.toPrecision(12));

export function buildHistogram(prices: readonly number[]): MarketHistogram | null {
  const sorted = prices.filter(price => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (sorted.length < MARKET_HISTOGRAM_MINIMUM) return null;
  const low = quantile(sorted, 0.01);
  const high = quantile(sorted, 0.99);
  if (!(high > low)) return null;

  const bins = Math.min(MARKET_HISTOGRAM_MAX_BINS, Math.max(MARKET_HISTOGRAM_MIN_BINS, Math.round(Math.sqrt(sorted.length))));
  const log = high / low >= MARKET_HISTOGRAM_LOG_RATIO;
  let edges: number[];
  if (log) {
    const from = Math.log(low);
    const to = Math.log(high);
    edges = Array.from({ length: bins + 1 }, (_, i) => roundSignificant(Math.exp(from + ((to - from) * i) / bins), 3));
  } else {
    const step = niceStep((high - low) / bins, granularity(sorted, high - low));
    const start = Math.floor(low / step) * step;
    const count = Math.max(1, Math.ceil((high - start) / step - 1e-9));
    edges = Array.from({ length: count + 1 }, (_, i) => clean(start + i * step));
  }
  edges = edges.filter((edge, i) => i === 0 || edge > edges[i - 1]!);
  if (edges.length < 2) return null;

  const counts = edges.slice(1).map(() => 0);
  let below = 0;
  let above = 0;
  let bin = 0;
  const last = edges[edges.length - 1]!;
  for (const price of sorted) {
    if (price < edges[0]!) {
      below++;
      continue;
    }
    if (price > last) {
      above++;
      continue;
    }
    while (bin < counts.length - 1 && price >= edges[bin + 1]!) bin++;
    counts[bin]!++;
  }
  return { n: sorted.length, log, edges, counts, below, above };
}
