// Un precio que no puede ser el de ESE auto.
//
// El caso que lo motivó: un Chevrolet Spark 2008 publicado a $ 6.990 (US$ 169) en Facebook
// Marketplace. En Facebook `listing_price.currency` siempre dice "UYU" aunque el precio esté en
// dólares (ver ./sources/facebook.ts), así que un aviso cuyo texto nombra pesos cerca del monto
// entra como pesos sin que nadie lo discuta. Pero al medir contra producción el problema resultó
// ser más ancho que Facebook y más ancho que la moneda: hay señas publicadas como precio, precios
// de atracción, placeholders de automotora (Clasiautos con avisos a US$ 9 y US$ 17) y hasta un
// alquiler listado entre las ventas.
//
// **Lo que NO se hace: un piso fijo en dólares.** Medido el 2026-09-21 sobre los 19.036 avisos
// publicados, debajo de US$ 1.000 hay 36 avisos y la mayoría son PRECIOS REALES: autos que se
// venden para repuestos y lo dicen en su propia descripción ("vendo para repuestos, está completo",
// "vendo por partes", "está sin andar solo para repuestos"). Un piso global borraría esos avisos
// legítimos y, peor, dejaría pasar lo que de verdad está mal: una Toyota Hilux SRV 2015
// "inmaculada" a $ 35.500 (US$ 857) sobrevive a cualquier piso razonable. El monto no distingue: lo
// que distingue es el auto. Un Fiat Duna del 99 a US$ 483 es chatarra a precio de chatarra; una
// Hilux del 2015 al mismo precio es un error.
//
// Así que se compara cada aviso contra su propia cohorte, que es la misma lección de
// `classes/precios/` y de `rate_audit.ts`: la banda sale del grupo, no de un factor inventado. La
// cascada va de la cohorte más parecida a la más gruesa, y el umbral se AFLOJA cuanto más parecida
// es la cohorte, porque es al revés de lo que parece: entre autos del mismo modelo y año un 15 % de
// sus pares ya es imposible, mientras que "todos los autos de 2015" mezcla un Lada con una Hilux y
// ahí sólo un 7 % de la mediana prueba algo.
import { quantile } from "./stats";
import type { CarListing } from "./types";

/** Debajo de esto no hay auto, ni para repuestos. Sólo se usa cuando no hay ninguna cohorte. */
export const PRICE_ABSOLUTE_FLOOR_USD = 200;

/**
 * Cada escalón: cuántos avisos necesita el grupo para que su mediana valga, y cuán por debajo de
 * esa mediana deja de ser un precio. Medido: con estos números se retiran 17 avisos de 19.036 y no
 * cae ninguno de los que se venden para repuestos.
 */
export const PRICE_COHORTS = [
  { level: "model_year", min: 5, ratio: 0.15 },
  { level: "brand_year", min: 20, ratio: 0.08 },
  { level: "year", min: 20, ratio: 0.07 },
] as const;
export type PriceCohortLevel = (typeof PRICE_COHORTS)[number]["level"];

export interface ImplausiblePrice {
  key: string;
  priceUsd: number;
  /** Contra qué se lo midió, o "floor" si no había ninguna cohorte. */
  basis: PriceCohortLevel | "floor";
  /** La mediana del grupo, null para el piso absoluto. */
  median: number | null;
  ratio: number | null;
}

const keyOf = (listing: CarListing, level: PriceCohortLevel): string | null => {
  if (!Number.isInteger(listing.year) || listing.year < 1900) return null;
  if (level === "year") return String(listing.year);
  if (level === "brand_year") return listing.brandSlug ? `${listing.brandSlug}|${listing.year}` : null;
  return listing.marketSlug ? `${listing.marketSlug}|${listing.year}` : null;
};

/**
 * La mediana de cada grupo que tenga suficientes avisos. Se calcula sobre lo que hay, con los
 * precios raros adentro: diecisiete avisos no mueven una mediana, y sacarlos primero para poder
 * sacarlos después sería circular.
 */
function medians(listings: readonly CarListing[], level: PriceCohortLevel, min: number): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const listing of listings) {
    const key = keyOf(listing, level);
    if (key === null || !(listing.priceUsd > 0)) continue;
    groups.set(key, [...(groups.get(key) ?? []), listing.priceUsd]);
  }
  const result = new Map<string, number>();
  for (const [key, prices] of groups) if (prices.length >= min) result.set(key, quantile(prices, 0.5));
  return result;
}

/** Por qué este aviso no puede tener este precio, o null si puede. */
export function implausiblePrice(
  listing: CarListing,
  tables: ReadonlyMap<PriceCohortLevel, ReadonlyMap<string, number>>,
): ImplausiblePrice | null {
  const base = { key: listing.key, priceUsd: listing.priceUsd };
  if (!(listing.priceUsd > 0)) return { ...base, basis: "floor", median: null, ratio: null };
  for (const cohort of PRICE_COHORTS) {
    const key = keyOf(listing, cohort.level);
    const median = key === null ? undefined : tables.get(cohort.level)?.get(key);
    if (median === undefined || !(median > 0)) continue;
    const ratio = listing.priceUsd / median;
    // La primera cohorte que existe es la que manda: es la más parecida a este auto, y si su
    // veredicto es "puede ser" no hay por qué seguir preguntándole a grupos más gruesos.
    return ratio < cohort.ratio ? { ...base, basis: cohort.level, median, ratio } : null;
  }
  return listing.priceUsd < PRICE_ABSOLUTE_FLOOR_USD
    ? { ...base, basis: "floor", median: null, ratio: null }
    : null;
}

/**
 * Saca del catálogo los avisos cuyo precio no puede ser el de ese auto. Se retira el aviso entero y
 * no se le corrige el precio: no sabemos cuál es. Si el vendedor quiso decir dólares, si puso la
 * seña o si se le fue un dígito son tres historias distintas y ninguna se puede adivinar desde acá.
 */
export function dropImplausiblePrices<T extends CarListing>(
  listings: readonly T[],
): { kept: T[]; dropped: ImplausiblePrice[] } {
  const tables = new Map<PriceCohortLevel, Map<string, number>>();
  for (const cohort of PRICE_COHORTS) tables.set(cohort.level, medians(listings, cohort.level, cohort.min));
  const kept: T[] = [];
  const dropped: ImplausiblePrice[] = [];
  for (const listing of listings) {
    const verdict = implausiblePrice(listing, tables);
    if (verdict) dropped.push(verdict);
    else kept.push(listing);
  }
  return { kept, dropped };
}

/** Una línea por motivo para el log del job. */
export function priceDropSummary(dropped: readonly ImplausiblePrice[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const item of dropped) summary[item.basis] = (summary[item.basis] ?? 0) + 1;
  return summary;
}
