// Un precio que no puede ser el de ESA moto.
//
// La estructura es la de `classes/autos/priceSanity.ts` y la lección es la misma: **no se corrige el
// precio, se retira el aviso**. Si el vendedor quiso decir dólares, si publicó la seña o si se le fue
// un dígito son tres historias distintas y ninguna se adivina desde acá.
//
// Lo que NO se puede copiar de autos son los números, y el motivo no es cosmético: el piso absoluto
// de autos es US$ 200 porque debajo de eso "no hay auto, ni para repuestos", y una moto de trabajo
// de US$ 400 es un precio corriente en Uruguay. Medido el 2026-09-22 sobre el listado de MLU1763: el
// aviso más barato de la muestra es un scooter eléctrico a US$ 650 y hay ciclomotores usados
// publicados entre $ 20.000 y $ 25.000 (US$ 500–625 al cambio del día). Un piso pensado para autos
// borraría exactamente el tramo que este directorio existe para publicar.
//
// La cascada va de la cohorte más parecida a la más gruesa y el umbral se AFLOJA cuanto más gruesa
// es la cohorte, igual que en autos y por la misma razón: entre motos del mismo modelo y año un 15 %
// de sus pares ya es imposible, mientras que "todas las motos de 2015" mezcla una Yumbo 110 con una
// Harley y ahí sólo un 7 % de la mediana prueba algo.
import { quantile } from "../autos/stats";

/**
 * Debajo de esto no hay moto en venta, ni para repuestos. Sólo se usa cuando NINGUNA cohorte existe
 * —una marca rara, un año sin pares— y está puesto en US$ 120 y no en los US$ 200 de autos porque
 * el piso del mercado de motos es visiblemente más bajo: el tramo de US$ 150–400 son ciclomotores
 * viejos que se venden de verdad. Es un guardarraíl contra un precio de accesorio publicado como
 * moto, no un juicio sobre qué es barato.
 */
export const MOTO_PRICE_ABSOLUTE_FLOOR_USD = 120;

/**
 * Cada escalón: cuántos avisos necesita el grupo para que su mediana valga, y cuán por debajo de esa
 * mediana el precio deja de ser un precio.
 *
 * Los mínimos son MÁS CHICOS que los de autos (5/8/20 → 4/6/12) por una razón de tamaño medida, no
 * por gusto: MLU1763 tenía 1.391 avisos usados el 2026-09-22 contra los ~19.000 de autos. Con los
 * mínimos de autos, la cohorte modelo+año casi nunca existiría y todo caería al escalón del año, que
 * es el más grueso y el que menos prueba. Las proporciones (0,15 / 0,08 / 0,07) se mantienen: son
 * las que autos midió y no hay medición propia que justifique moverlas — cuando la haya, se mueven.
 */
export const MOTO_PRICE_COHORTS = [
  { level: "model_year", min: 4, ratio: 0.15 },
  { level: "brand_year", min: 6, ratio: 0.08 },
  { level: "year", min: 12, ratio: 0.07 },
] as const;
export type MotoPriceCohortLevel = (typeof MOTO_PRICE_COHORTS)[number]["level"];

/** Lo único que la guarda necesita saber de un aviso. Estructural, para que un test no arme una moto entera. */
export interface MotoPriceSubject {
  key: string;
  priceUsd: number;
  year: number;
  brandSlug: string;
  marketSlug: string;
}

export interface MotoImplausiblePrice {
  key: string;
  priceUsd: number;
  /** Contra qué se lo midió, o "floor" cuando no había ninguna cohorte. */
  basis: MotoPriceCohortLevel | "floor";
  median: number | null;
  ratio: number | null;
}

const keyOf = (listing: MotoPriceSubject, level: MotoPriceCohortLevel): string | null => {
  if (!Number.isInteger(listing.year) || listing.year < 1900) return null;
  if (level === "year") return String(listing.year);
  if (level === "brand_year") return listing.brandSlug ? `${listing.brandSlug}|${listing.year}` : null;
  return listing.marketSlug ? `${listing.marketSlug}|${listing.year}` : null;
};

/**
 * La mediana de cada grupo que tenga suficientes avisos. Se calcula sobre lo que hay, con los precios
 * raros adentro: un puñado de avisos no mueve una mediana, y sacarlos primero para poder sacarlos
 * después sería circular.
 */
function medians(listings: readonly MotoPriceSubject[], level: MotoPriceCohortLevel, min: number): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const listing of listings) {
    const key = keyOf(listing, level);
    if (key === null || !(listing.priceUsd > 0)) continue;
    const group = groups.get(key);
    if (group) group.push(listing.priceUsd);
    else groups.set(key, [listing.priceUsd]);
  }
  const result = new Map<string, number>();
  for (const [key, prices] of groups) if (prices.length >= min) result.set(key, quantile(prices, 0.5));
  return result;
}

/** Por qué este aviso no puede tener este precio, o null si puede. */
export function motoImplausiblePrice(
  listing: MotoPriceSubject,
  tables: ReadonlyMap<MotoPriceCohortLevel, ReadonlyMap<string, number>>
): MotoImplausiblePrice | null {
  const base = { key: listing.key, priceUsd: listing.priceUsd };
  if (!(listing.priceUsd > 0)) return { ...base, basis: "floor", median: null, ratio: null };
  for (const cohort of MOTO_PRICE_COHORTS) {
    const key = keyOf(listing, cohort.level);
    const median = key === null ? undefined : tables.get(cohort.level)?.get(key);
    if (median === undefined || !(median > 0)) continue;
    const ratio = listing.priceUsd / median;
    // La primera cohorte que existe es la que manda: es la más parecida a esta moto, y si su
    // veredicto es "puede ser" no hay por qué seguir preguntándole a grupos más gruesos.
    return ratio < cohort.ratio ? { ...base, basis: cohort.level, median, ratio } : null;
  }
  return listing.priceUsd < MOTO_PRICE_ABSOLUTE_FLOOR_USD ? { ...base, basis: "floor", median: null, ratio: null } : null;
}

/** Saca del catálogo los avisos cuyo precio no puede ser el de esa moto. */
export function dropImplausibleMotoPrices<T extends MotoPriceSubject>(
  listings: readonly T[]
): { kept: T[]; dropped: MotoImplausiblePrice[] } {
  const tables = new Map<MotoPriceCohortLevel, Map<string, number>>();
  for (const cohort of MOTO_PRICE_COHORTS) tables.set(cohort.level, medians(listings, cohort.level, cohort.min));
  const kept: T[] = [];
  const dropped: MotoImplausiblePrice[] = [];
  for (const listing of listings) {
    const verdict = motoImplausiblePrice(listing, tables);
    if (verdict) dropped.push(verdict);
    else kept.push(listing);
  }
  return { kept, dropped };
}

/** Una línea por motivo para el log del job. */
export function motoPriceDropSummary(dropped: readonly MotoImplausiblePrice[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const item of dropped) summary[item.basis] = (summary[item.basis] ?? 0) + 1;
  return summary;
}
