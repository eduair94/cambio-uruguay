// La guarda por fila, al escribir.
//
// Se puede hacer bien porque las ~352 filas de un artículo llegan en UNA
// respuesta: la distribución del artículo se conoce antes de guardar nada. Eso
// es lo que `classes/rate_plausibility.ts` no pudo hacer para las cotizaciones,
// donde el scrape recorre una casa por vez.
//
// La banda es por percentiles del propio artículo y no un factor fijo, y eso se
// midió: el spread real del mismo artículo va de 1,58× (aceite de girasol) a
// 4,86× (cinta leuco). Un factor fijo borra al primero o deja pasar cualquier
// cosa en el segundo.
//
// Y hay una segunda etiqueta que NO borra. El mínimo de $18,5 contra una
// mediana de $64 sobrevive a p10/3 y sin embargo es exactamente la fila que
// gana un ranking de "más barato". Se marca `suspect`: sigue visible, dice por
// qué está marcada, y no encabeza. Borrarla sería afirmar que no puede ser un
// precio real, y eso no lo sabemos.
import type { PrecioFreshness } from "./staleness";

export interface PrecioBand {
  p10: number;
  p50: number;
  p90: number;
  low: number;
  high: number;
  suspectBelow: number;
  n: number;
}

/** Percentil por interpolación lineal sobre una lista YA ordenada. */
export function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Mínimo de observaciones para que una banda signifique algo. */
export const MIN_BAND_SAMPLE = 8;

export function articleBand(prices: number[]): PrecioBand | null {
  const sorted = prices.filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (sorted.length < MIN_BAND_SAMPLE) return null;
  const p10 = percentile(sorted, 0.1);
  const p50 = percentile(sorted, 0.5);
  const p90 = percentile(sorted, 0.9);
  return { p10, p50, p90, low: p10 / 3, high: p90 * 3, suspectBelow: p10 / 2, n: sorted.length };
}

export function priceVerdict(price: number, band: PrecioBand | null): "ok" | "suspect" | "reject" {
  if (!Number.isFinite(price) || price <= 0) return "reject";
  if (!band) return "ok";
  if (price < band.low || price > band.high) return "reject";
  if (price < band.suspectBelow) return "suspect";
  return "ok";
}

/**
 * Si la fila puede encabezar un ranking de "más barato".
 *
 * Es la regla que faltaba en las pizarras de cambio: el scraper anda, el origen
 * se congeló, y ordenar por "más barato" sube la fila más vieja al titular.
 * Vive acá y no en la página porque tiene que valer también para quien consuma
 * la API.
 */
export function rankable(row: { verdict: "ok" | "suspect" | "reject"; freshness: PrecioFreshness }): boolean {
  return row.verdict === "ok" && row.freshness !== "stale";
}
