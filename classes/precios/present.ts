// La capa que decide QUÉ se muestra como "más barato".
//
// Vive acá y no en la página porque la regla tiene que valer también para quien
// consuma la API: si la respuesta trae un `cheapest` calculado a mano por cada
// cliente, la primera integración de terceros publica la góndola congelada.
//
// Una fila `stale` o `suspect` se muestra, pero no encabeza. Si encabezara
// volveríamos a la pizarra congelada: el scraper anda, el origen se congeló, y
// ordenar por "más barato" sube la fila más vieja al titular.
import { MIN_COVERAGE } from "./basket";
import { rankable } from "./plausibility";
import type { PrecioFreshness } from "./staleness";

export interface PresentableRow {
  storeId: number;
  storeName: string;
  price: number;
  sourceDay: string;
  freshness: PrecioFreshness;
  verdict: "ok" | "suspect" | "reject";
  promo?: boolean;
}

/** La fila más barata que puede encabezar, o null si no queda ninguna. */
export function cheapestRankable<T extends PresentableRow>(rows: T[]): T | null {
  const eligible = (rows || []).filter((row) => rankable(row));
  if (!eligible.length) return null;
  return eligible.reduce((best, row) => (row.price < best.price ? row : best));
}

/** Por qué una fila visible no encabeza, o null cuando sí puede. */
export function whyNotRankable(row: PresentableRow): string | null {
  if (row.verdict === "reject") return "el precio quedó fuera de la banda del propio artículo";
  if (row.verdict === "suspect") {
    return "precio muy por debajo del resto del país: se muestra, pero no encabeza hasta que se confirme";
  }
  if (row.freshness === "stale") return `el local no actualiza esta góndola desde el ${row.sourceDay}`;
  return null;
}

export function coverageNote(coverage: number): string {
  const pct = Math.round(coverage * 100);
  if (coverage < MIN_COVERAGE) {
    return `muestra insuficiente: el local declara ${pct} % de la canasta, y por debajo de ${Math.round(
      MIN_COVERAGE * 100
    )} % un total no es comparable`;
  }
  return `${pct} % de la canasta declarada por el local`;
}

/**
 * El nivel de precios de un local, dicho en palabras.
 *
 * Se publica el RATIO y no un total completado: escalar el ratio a los 33
 * artículos daría una cifra linda y comparable, pero sería imputar los
 * artículos que el local no vende — exactamente lo que se le critica al `(*)`
 * del SIPC.
 */
export function ratioNote(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "sin nivel de precios medible";
  const pct = (ratio - 1) * 100;
  if (Math.abs(pct) < 1) return "en línea con la mediana del país";
  return pct < 0
    ? `${Math.abs(pct).toFixed(1)} % más barato que la mediana del país, medido sobre los artículos que este local declara`
    : `${pct.toFixed(1)} % más caro que la mediana del país, medido sobre los artículos que este local declara`;
}
