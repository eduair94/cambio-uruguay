// Lo que mueve el precio de un auto usado uruguayo, medido sobre los avisos que ya tenemos: cuánto
// cuesta cada 10.000 km, qué suma la caja automática, qué suma el diésel.
//
// Todo se mide EMPAREJADO —dentro del mismo modelo y año— y nunca entre modelos. Sin emparejar, "las
// automáticas valen 40 % más" dice que las automáticas están en autos más caros y más nuevos, que es
// verdad y no sirve para nada: quien vende quiere saber cuánto suma la caja EN SU auto.
//
// Cada coeficiente se calcula por cohorte y después se toma la MEDIANA de las cohortes, no el
// promedio de todo junto: así un modelo con 600 avisos no decide el número por todos los demás.
import { quantile } from "./stats";
import type { CarListing } from "./types";

export const CAR_VALUATION_POLICY = {
  /** Avisos mínimos en la cohorte para que su pendiente de kilómetros signifique algo. */
  minimumPerKmCohort: 10,
  /** Y kilómetros de recorrido entre el más y el menos rodado: sin variación no hay pendiente. */
  minimumKmSpread: 40_000,
  /** Avisos mínimos de cada lado para comparar caja o combustible dentro del mismo modelo y año. */
  minimumPerSide: 4,
  /** Cohortes mínimas para publicar un coeficiente. */
  minimumCohorts: 8,
  /** El ajuste por kilómetros no se extrapola más allá de esto. */
  maximumKmAdjustment: 0.25,
} as const;

export interface CarCoefficient {
  /** Fracción del precio: 0,04 = 4 %. Null cuando no hay cohortes suficientes. */
  value: number | null;
  cohorts: number;
  p25: number | null;
  p75: number | null;
}

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;
const usable = (listing: CarListing): boolean =>
  !listing.priceConverted && !listing.currencyInferred && listing.priceUsd > 0 && listing.kmQuality === "ok" && listing.km !== null;

const groupBy = <T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    const group = groups.get(name);
    if (group) group.push(item);
    else groups.set(name, [item]);
  }
  return groups;
};

const summarize = (values: readonly number[]): CarCoefficient =>
  values.length >= CAR_VALUATION_POLICY.minimumCohorts
    ? {
        value: round4(quantile(values, 0.5)),
        cohorts: values.length,
        p25: round4(quantile(values, 0.25)),
        p75: round4(quantile(values, 0.75)),
      }
    : { value: null, cohorts: values.length, p25: null, p75: null };

/**
 * Cuánto se descuenta el precio por cada 10.000 km, dentro del mismo modelo y año. Se ajusta una
 * recta sobre el logaritmo del precio contra el kilometraje de cada cohorte y se toma la mediana de
 * las pendientes; el logaritmo hace el número comparable entre una Hilux y un Celerio.
 */
export function kmEffectOf(listings: readonly CarListing[]): CarCoefficient {
  const slopes: number[] = [];
  for (const cohort of groupBy(listings.filter(usable), listing => `${listing.marketSlug}|${listing.year}`).values()) {
    if (cohort.length < CAR_VALUATION_POLICY.minimumPerKmCohort) continue;
    const kms = cohort.map(listing => listing.km!);
    if (Math.max(...kms) - Math.min(...kms) < CAR_VALUATION_POLICY.minimumKmSpread) continue;
    const n = cohort.length;
    const meanKm = kms.reduce((total, km) => total + km, 0) / n;
    const logs = cohort.map(listing => Math.log(listing.priceUsd));
    const meanLog = logs.reduce((total, value) => total + value, 0) / n;
    let covariance = 0;
    let variance = 0;
    for (let index = 0; index < n; index++) {
      const dx = kms[index]! - meanKm;
      covariance += dx * (logs[index]! - meanLog);
      variance += dx * dx;
    }
    if (!variance) continue;
    const slope = covariance / variance;
    const perTenThousand = 1 - Math.exp(slope * 10_000);
    // Un modelo que se encarece con el uso no existe; es ruido de versiones mezcladas.
    if (perTenThousand > 0 && perTenThousand < 0.25) slopes.push(perTenThousand);
  }
  return summarize(slopes);
}

/**
 * Cuánto más caro se pide un auto por tener algo (caja automática, diésel) contra el MISMO modelo y
 * año sin eso. Cohortes emparejadas con los dos lados presentes; la mediana de las razones.
 */
export function matchedPremiumOf(
  listings: readonly CarListing[],
  side: (listing: CarListing) => "with" | "without" | null,
  cohortKey: (listing: CarListing) => string | null = listing => `${listing.marketSlug}|${listing.year}`,
): CarCoefficient {
  const premiums: number[] = [];
  const keyed = listings.filter(usable).filter(listing => cohortKey(listing) !== null);
  for (const cohort of groupBy(keyed, listing => cohortKey(listing)!).values()) {
    const withIt = cohort.filter(listing => side(listing) === "with").map(listing => listing.priceUsd);
    const without = cohort.filter(listing => side(listing) === "without").map(listing => listing.priceUsd);
    if (withIt.length < CAR_VALUATION_POLICY.minimumPerSide || without.length < CAR_VALUATION_POLICY.minimumPerSide) continue;
    const a = quantile(withIt, 0.5);
    const b = quantile(without, 0.5);
    if (a > 0 && b > 0) premiums.push(a / b - 1);
  }
  return summarize(premiums);
}

export interface CarPriceEnding {
  ending: string;
  adverts: number;
}

/**
 * Cómo termina el precio que pide la gente. No es una curiosidad: quien vende elige un número, y el
 * mercado ya eligió uno por él.
 */
export function priceEndingsOf(listings: readonly CarListing[]): CarPriceEnding[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    if (!(listing.priceUsd > 0)) continue;
    const price = Math.round(listing.priceUsd);
    const last3 = price % 1000;
    const ending = last3 === 990 ? "990" : last3 === 900 ? "900" : last3 === 500 ? "500" : last3 === 0 ? "000" : "otro";
    counts.set(ending, (counts.get(ending) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ending, adverts]) => ({ ending, adverts }))
    .sort((a, b) => b.adverts - a.adverts);
}

export interface CarValuationCoefficients {
  /** Cuánto pierde el precio por cada 10.000 km dentro del mismo modelo y año. */
  km: CarCoefficient;
  /**
   * Cuánto se pide de más por la caja automática, emparejando modelo, año y VERSIÓN. Emparejando sólo
   * modelo y año el número mezcla la caja con el equipamiento: la automática suele venir en la
   * versión más completa, y el comprador paga las dos cosas juntas.
   */
  automatic: CarCoefficient;
  /** Lo mismo pero sólo por modelo y año: caja más la versión con la que suele venir. */
  automaticWithTrim: CarCoefficient;
  /**
   * Diésel contra nafta del mismo modelo y año. Se calcula y NO se usa como consejo: medido el
   * 2026-09-19 dio +48,5 % sobre 17 cohortes, que no es el combustible sino la versión —en los modelos
   * que se venden con las dos, el diésel es la 4x4 o la cabina doble—.
   */
  diesel: CarCoefficient;
  endings: CarPriceEnding[];
}

const gearbox = (listing: CarListing): "with" | "without" | null =>
  listing.transmission === "automatica" ? "with" : listing.transmission === "manual" ? "without" : null;

export function buildValuationCoefficients(listings: readonly CarListing[]): CarValuationCoefficients {
  return {
    km: kmEffectOf(listings),
    automatic: matchedPremiumOf(listings, gearbox, listing =>
      listing.trim && listing.engine ? `${listing.marketSlug}|${listing.year}|${listing.trim}|${listing.engine}` : null),
    automaticWithTrim: matchedPremiumOf(listings, gearbox),
    diesel: matchedPremiumOf(listings, listing =>
      listing.fuel === "diesel" ? "with" : listing.fuel === "nafta" ? "without" : null),
    endings: priceEndingsOf(listings.filter(listing => !listing.priceConverted && !listing.currencyInferred)),
  };
}
