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
import type { PrecioStore } from "./types";

export interface PresentableRow {
  storeId: number;
  storeName: string;
  price: number;
  sourceDay: string;
  freshness: PrecioFreshness;
  verdict: "ok" | "suspect" | "reject";
  promo?: boolean;
}

export interface RankedStore {
  storeId: number;
  storeName: string;
  department: string;
  chain: string;
  address: string;
  ratio: number;
  coverage: number;
}

/**
 * Todos los locales calificados, del nivel de precios más bajo al más alto.
 *
 * Existe porque los 25 más baratos del país son casi todos de Montevideo y
 * Canelones: filtrar esa lista por Maldonado o Salto devolvía cero filas, y la
 * pregunta real es "dónde sale más barato en MI departamento". Sin `cost` a
 * propósito: el total parcial baja por faltarle artículos al local, y publicarlo
 * al lado del ratio invita a leerlo como precio de la canasta.
 */
export function rankStoresByRatio(
  entries: Array<{
    storeId: number;
    store?: Partial<PrecioStore>;
    ratio: number | null;
    coverage: number;
    qualified: boolean;
  }>
): RankedStore[] {
  return (entries || [])
    .filter((entry) => entry.qualified && entry.ratio !== null && Number.isFinite(entry.ratio))
    .sort((a, b) => (a.ratio as number) - (b.ratio as number) || a.storeId - b.storeId)
    .map((entry) => ({
      storeId: entry.storeId,
      storeName: entry.store?.name || "",
      department: entry.store?.department || "",
      chain: entry.store?.chain || "",
      address: entry.store?.address || "",
      ratio: entry.ratio as number,
      coverage: entry.coverage,
    }));
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
