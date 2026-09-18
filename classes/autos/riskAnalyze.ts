// Cuánto descuenta el mercado uruguayo por lo que el aviso declara.
//
// No es la otra cara de `analyze.ts`: ahí el sujeto tiene que estar limpio y el hallazgo es "está
// barato y no se sabe por qué". Acá el sujeto declara un motivo y la pregunta es cuánto vale ese
// motivo en dólares. Por eso la cohorte de referencia es LIMPIA: comparar un chocado contra otros
// chocados no dice nada, y meter chocados en la mediana del modelo abarata a todo el mundo.
//
// Un auto con riesgo declarado NO es una oportunidad. Es un precio con una condición adentro, y la
// condición se publica con la frase del vendedor al lado.
import { comparablesFor, sampleFor, type CarSample } from "./analyze";
import { declaredRisks, riskCategories, worstSeverity, type CarRisk, type CarRiskCategory, type CarRiskSeverity } from "./risk";
import { quantile } from "./stats";
import type { CarListing } from "./types";

export const CAR_RISK_POLICY = {
  freshDays: 4,
  minimumComparables: 5,
  minimumSellers: 3,
  maximumSpread: 0.35,
  /** Más barato que esto contra la cohorte limpia no es un descuento, es otro auto. */
  maximumGap: 0.85,
  maxItems: 400,
  /** Mínimo de avisos con descuento medido para publicar la mediana de una categoría. */
  minimumCategorySample: 5,
} as const;

export interface CarRiskItem {
  subject: CarListing;
  risks: CarRisk[];
  categories: CarRiskCategory[];
  severity: CarRiskSeverity;
  /** Nulo cuando el auto no tiene con qué compararse: se publica igual, sin número. */
  sample: CarSample | null;
  gap: number | null;
}

export interface CarRiskCategoryStat {
  category: CarRiskCategory;
  adverts: number;
  measured: number;
  medianGap: number | null;
  p25Gap: number | null;
  p75Gap: number | null;
}

export interface CarRiskAnalysis {
  items: CarRiskItem[];
  categories: CarRiskCategoryStat[];
  stats: { input: number; declared: number; measured: number; withoutDescription: number };
}

const DAY = 86_400_000;
const round3 = (value: number): number => Math.round(value * 1000) / 1000;

const cohortKey = (listing: CarListing): string =>
  [listing.brandId, listing.modelId, listing.year, listing.trim, listing.engine, listing.transmission].join("|");

/** Comparable para medir un descuento: fresco, en dólares de verdad y con cohorte completa. */
const measurable = (listing: CarListing): boolean =>
  !listing.priceConverted && !listing.currencyInferred && listing.priceUsd > 0 &&
  listing.kmQuality === "ok" && !!listing.trim && !!listing.engine && !!listing.transmission;

export function risksOf(listing: CarListing): CarRisk[] {
  return declaredRisks(listing.title, listing.detail?.description ?? "");
}

export function analyzeCarRisk(listings: readonly CarListing[], options: { now: Date }): CarRiskAnalysis {
  const cutoff = options.now.getTime() - CAR_RISK_POLICY.freshDays * DAY;
  const fresh = listings.filter(listing => Date.parse(listing.lastSeen) >= cutoff);
  const withRisks = new Map<string, CarRisk[]>();
  let withoutDescription = 0;
  for (const listing of fresh) {
    if (!listing.detail?.description) withoutDescription++;
    const risks = risksOf(listing);
    if (risks.length) withRisks.set(listing.key, risks);
  }
  // La referencia son los autos que NO declaran nada. Un aviso sin ficha propia no declara nada
  // todavía, así que puede estar acá: lo que se afirma es "no dice", no "no tiene".
  const clean = fresh.filter(listing => !withRisks.has(listing.key) && measurable(listing));
  const pools = new Map<string, CarListing[]>();
  for (const listing of clean) {
    const key = cohortKey(listing);
    const pool = pools.get(key);
    if (pool) pool.push(listing);
    else pools.set(key, [listing]);
  }
  const items: CarRiskItem[] = [];
  for (const listing of fresh) {
    const risks = withRisks.get(listing.key);
    if (!risks) continue;
    let sample: CarSample | null = null;
    if (measurable(listing)) {
      const comparables = comparablesFor(listing, pools.get(cohortKey(listing)) ?? []);
      if (comparables.length >= CAR_RISK_POLICY.minimumComparables) {
        const measured = sampleFor(listing, comparables);
        if (measured.sellers >= CAR_RISK_POLICY.minimumSellers && measured.spread <= CAR_RISK_POLICY.maximumSpread &&
          measured.gap <= CAR_RISK_POLICY.maximumGap) sample = measured;
      }
    }
    items.push({
      subject: listing,
      risks,
      categories: riskCategories(risks),
      severity: worstSeverity(risks)!,
      sample,
      gap: sample ? round3(sample.gap) : null,
    });
  }
  const gapsByCategory = new Map<CarRiskCategory, number[]>();
  const advertsByCategory = new Map<CarRiskCategory, number>();
  for (const item of items) {
    for (const category of item.categories) {
      advertsByCategory.set(category, (advertsByCategory.get(category) ?? 0) + 1);
      if (item.gap === null) continue;
      const gaps = gapsByCategory.get(category) ?? [];
      gaps.push(item.gap);
      gapsByCategory.set(category, gaps);
    }
  }
  const categories: CarRiskCategoryStat[] = [...advertsByCategory.entries()]
    .map(([category, adverts]) => {
      const gaps = gapsByCategory.get(category) ?? [];
      const enough = gaps.length >= CAR_RISK_POLICY.minimumCategorySample;
      return {
        category,
        adverts,
        measured: gaps.length,
        medianGap: enough ? round3(quantile(gaps, 0.5)) : null,
        p25Gap: enough ? round3(quantile(gaps, 0.25)) : null,
        p75Gap: enough ? round3(quantile(gaps, 0.75)) : null,
      };
    })
    .sort((a, b) => b.adverts - a.adverts || a.category.localeCompare(b.category));
  const ordered = items.sort((a, b) =>
    (b.gap ?? -1) - (a.gap ?? -1) || a.subject.key.localeCompare(b.subject.key)).slice(0, CAR_RISK_POLICY.maxItems);
  return {
    items: ordered,
    categories,
    stats: {
      input: fresh.length,
      declared: items.length,
      measured: items.filter(item => item.gap !== null).length,
      withoutDescription,
    },
  };
}
