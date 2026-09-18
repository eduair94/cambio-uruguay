// El informe del mercado de autos usados: qué hay a la venta, a qué precio, cuánto pierde por año
// cada modelo y cuánto margen hay para negociar.
//
// Lo primero es lo que el informe NO puede decir, porque es lo primero que alguien va a querer leer
// en él: **cuáles son los más vendidos**. Nadie publica ventas de usados por modelo en Uruguay —las
// transferencias se registran en las intendencias y no salen abiertas por modelo— y lo que nosotros
// tenemos son AVISOS. Un modelo con mucha oferta puede ser el más vendido o el que nadie quiere
// sacarse de encima, y el aviso no distingue esas dos cosas.
//
// Lo que sí distingue es el TIEMPO: un aviso que desaparece rápido salió del mercado por algo. Esa
// medición se calcula acá (`rotation`) pero **no se publica hasta tener ventana suficiente**: la
// serie arrancó el 2026-09-17 y con día y medio de historia cualquier número de rotación sería una
// invención. El informe dice que falta y por qué, y el día que haya historia aparece solo.
import { quantile } from "./stats";
import { declaredRisks, type CarRiskCategory } from "./risk";
import type { CarFuel, CarListing, CarSellerType, CarTransmission, StoredCar } from "./types";
import type {
  PublicCarReportBudget as CarReportBudget,
  PublicCarReportDepreciation as CarReportDepreciation,
  PublicCarReportDepreciationPoint as CarReportDepreciationPoint,
  PublicCarReportModel as CarReportModel,
  PublicCarReportNegotiation as CarReportNegotiation,
  PublicCarReportRange as CarReportRange,
  PublicCarReportRotation as CarReportRotation,
  PublicCarReportSellerGap as CarReportSellerGap,
  PublicCarReportSnapshotData as CarReportSnapshotData,
} from "./publicTypes";
export type {
  CarReportBudget, CarReportDepreciation, CarReportDepreciationPoint, CarReportModel, CarReportNegotiation,
  CarReportRange, CarReportRotation, CarReportSellerGap, CarReportSnapshotData,
};


export const CAR_REPORT_POLICY = {
  /** Un modelo entra al informe con esto; debajo, la mediana es anécdota. */
  minimumAdverts: 30,
  /** Para la curva de depreciación, mínimo de avisos en el año para que ese punto valga. */
  minimumPerYear: 3,
  /** Años hacia atrás que mira la curva. */
  depreciationYears: 12,
  /** Puntos y tramo mínimos de la curva para publicar una caída anual. */
  minimumCurvePoints: 6,
  minimumCurveSpan: 5,
  /** Cada lado del mostrador necesita esto para comparar automotora contra dueño. */
  minimumPerSeller: 5,
  /** Y hacen falta estos años comparables para que el promedio del modelo no sea ruido. */
  minimumSellerCohorts: 3,
  /** Días de historia que hace falta acumular antes de publicar rotación. */
  rotationMinimumDays: 14,
  rotationMinimumRetired: 150,
  topBrands: 20,
  topModels: 40,
} as const;


const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const DAY = 86_400_000;
const PRICE_BANDS = [0, 5_000, 8_000, 12_000, 18_000, 25_000, 40_000];
const BUDGETS = [6_000, 10_000, 15_000, 20_000, 30_000];

/** Un aviso cuenta para el informe si su precio en dólares es de verdad y no está deducido. */
export const reportable = (listing: CarListing): boolean =>
  !listing.priceConverted && !listing.currencyInferred && listing.priceUsd > 0 && listing.year > 1970;

const rangeOf = (values: readonly number[]): CarReportRange | null =>
  values.length
    ? { p25: Math.round(quantile(values, 0.25)), median: Math.round(quantile(values, 0.5)), p75: Math.round(quantile(values, 0.75)) }
    : null;

const countBy = <T extends string>(rows: readonly CarListing[], pick: (listing: CarListing) => T | null): Array<{ key: T | "unknown"; adverts: number }> => {
  const counts = new Map<T | "unknown", number>();
  for (const row of rows) {
    const key = pick(row) ?? ("unknown" as const);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, adverts]) => ({ key, adverts })).sort((a, b) => b.adverts - a.adverts);
};

/**
 * Cuánto pierde el modelo por año de antigüedad: pendiente de una recta ajustada por mínimos
 * cuadrados sobre el LOGARITMO de la mediana de cada año, ponderada por la raíz de los avisos.
 *
 * La primera versión tomaba la mediana de las razones entre años consecutivos y daba 1,8 % anual
 * para la Fiat Strada, que no es creíble: los años recientes están casi planos y son los que más
 * avisos tienen, así que la mediana se paraba ahí y no veía que de 2025 (US$ 18.500) a 2019
 * (US$ 11.995) hay un 35 % en seis años. La recta usa TODO el tramo, que es donde está la caída.
 */
export function annualDropOf(points: readonly CarReportDepreciationPoint[]): number | null {
  const usable = points.filter(point => point.medianUsd > 0);
  if (usable.length < CAR_REPORT_POLICY.minimumCurvePoints) return null;
  const years = usable.map(point => point.year);
  if (Math.max(...years) - Math.min(...years) < CAR_REPORT_POLICY.minimumCurveSpan) return null;
  let sumW = 0, sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  for (const point of usable) {
    // La raíz amortigua: un año con 200 avisos informa más que uno con 3, pero no sesenta veces más.
    const weight = Math.sqrt(point.adverts);
    const x = point.year;
    const y = Math.log(point.medianUsd);
    sumW += weight;
    sumX += weight * x;
    sumY += weight * y;
    sumXX += weight * x * x;
    sumXY += weight * x * y;
  }
  const denominator = sumW * sumXX - sumX * sumX;
  if (!denominator) return null;
  const slope = (sumW * sumXY - sumX * sumY) / denominator;
  // La recta sube con el año de fabricación; un año MÁS viejo multiplica el precio por exp(-slope).
  const drop = 1 - Math.exp(-slope);
  return drop > 0.005 && drop < 0.5 ? round3(drop) : null;
}

export function depreciationOf(rows: readonly CarListing[], maxYear: number): CarReportDepreciationPoint[] {
  const byYear = new Map<number, number[]>();
  for (const row of rows) {
    if (row.year > maxYear || row.year < maxYear - CAR_REPORT_POLICY.depreciationYears) continue;
    const bag = byYear.get(row.year) ?? [];
    bag.push(row.priceUsd);
    byYear.set(row.year, bag);
  }
  return [...byYear.entries()]
    .filter(([, prices]) => prices.length >= CAR_REPORT_POLICY.minimumPerYear)
    .map(([year, prices]) => ({ year, adverts: prices.length, medianUsd: Math.round(quantile(prices, 0.5)) }))
    .sort((a, b) => b.year - a.year);
}

/**
 * Cuánto más pide una automotora por el MISMO auto. La comparación es por modelo y año —no por modelo
 * a secas— porque las automotoras venden autos más nuevos, y sin fijar el año el "premio" que se mide
 * es la edad, no el mostrador.
 */
export function sellerGapOf(rows: readonly CarListing[]): { gap: number; cohorts: number; dealerMedian: number; privateMedian: number } | null {
  const byYear = new Map<number, { dealer: number[]; private: number[] }>();
  for (const row of rows) {
    if (row.sellerType !== "dealer" && row.sellerType !== "private") continue;
    const bucket = byYear.get(row.year) ?? { dealer: [], private: [] };
    bucket[row.sellerType].push(row.priceUsd);
    byYear.set(row.year, bucket);
  }
  const gaps: number[] = [];
  const dealerPrices: number[] = [];
  const privatePrices: number[] = [];
  for (const bucket of byYear.values()) {
    if (bucket.dealer.length < CAR_REPORT_POLICY.minimumPerSeller || bucket.private.length < CAR_REPORT_POLICY.minimumPerSeller) continue;
    const dealer = quantile(bucket.dealer, 0.5);
    const owner = quantile(bucket.private, 0.5);
    if (!(dealer > 0) || !(owner > 0)) continue;
    gaps.push(dealer / owner - 1);
    dealerPrices.push(dealer);
    privatePrices.push(owner);
  }
  // Con uno o dos años comparados el "premio del mostrador" es ruido: el VW Vento daba −22 %.
  if (gaps.length < CAR_REPORT_POLICY.minimumSellerCohorts) return null;
  return {
    gap: round3(quantile(gaps, 0.5)),
    cohorts: gaps.length,
    dealerMedian: Math.round(quantile(dealerPrices, 0.5)),
    privateMedian: Math.round(quantile(privatePrices, 0.5)),
  };
}

/** Los cambios de precio que VIMOS nosotros, no los que el aviso dice haber hecho. */
export function negotiationOf(docs: readonly StoredCar[], now: Date, windowDays = 7): CarReportNegotiation {
  const since = now.getTime() - windowDays * DAY;
  let changed = 0;
  let cut = 0;
  let raised = 0;
  const cuts: number[] = [];
  for (const doc of docs) {
    const points = (doc.priceHistory ?? []).filter(point => point.currency === doc.listing.currency && Date.parse(point.observedAt) >= since);
    if (points.length < 2) continue;
    const first = points[0]!.price;
    const last = points[points.length - 1]!.price;
    if (first === last) continue;
    changed++;
    if (last < first) {
      cut++;
      cuts.push(1 - last / first);
    } else raised++;
  }
  return {
    windowDays,
    changed,
    cut,
    raised,
    medianCut: cuts.length ? round3(quantile(cuts, 0.5)) : null,
    shareOfMarket: docs.length ? round3(changed / docs.length) : 0,
  };
}

/**
 * Cuánto tarda un aviso en irse. Se calcula siempre y se publica sólo cuando la serie es más larga
 * que la ventana que se quiere medir: con día y medio de historia, "los avisos duran 1,1 días" es un
 * artefacto de cuándo empezamos a mirar, no un dato del mercado.
 */
export function rotationOf(docs: readonly StoredCar[], now: Date): CarReportRotation {
  const firstSeens = docs.map(doc => Date.parse(doc.firstSeen)).filter(Number.isFinite);
  const historyDays = firstSeens.length ? round3((now.getTime() - Math.min(...firstSeens)) / DAY) : 0;
  const lifespans = docs
    .filter(doc => doc.retiredAt)
    .map(doc => (Date.parse(doc.retiredAt!) - Date.parse(doc.firstSeen)) / DAY)
    .filter(value => Number.isFinite(value) && value >= 0);
  const measurable = historyDays >= CAR_REPORT_POLICY.rotationMinimumDays && lifespans.length >= CAR_REPORT_POLICY.rotationMinimumRetired;
  return {
    measurable,
    historyDays,
    retired: lifespans.length,
    medianDays: measurable ? round3(quantile(lifespans, 0.5)) : null,
    note: measurable
      ? ""
      : `La serie propia arrancó hace ${Math.floor(historyDays)} día${Math.floor(historyDays) === 1 ? "" : "s"} y hacen falta ${CAR_REPORT_POLICY.rotationMinimumDays} para que "cuánto tarda en venderse" signifique algo.`,
  };
}

export function buildCarReport(
  listings: readonly CarListing[],
  docs: readonly StoredCar[],
  options: { now: Date; maxYear: number },
): CarReportSnapshotData {
  const rows = listings.filter(reportable);
  const total = rows.length;
  const byModel = new Map<string, CarListing[]>();
  const byBrand = new Map<string, CarListing[]>();
  for (const row of rows) {
    const model = byModel.get(row.marketSlug) ?? [];
    model.push(row);
    byModel.set(row.marketSlug, model);
    const brand = byBrand.get(row.brandSlug) ?? [];
    brand.push(row);
    byBrand.set(row.brandSlug, brand);
  }

  const prices = rows.map(row => row.priceUsd);
  const years = rows.map(row => row.year);
  const kms = rows.filter(row => row.kmQuality === "ok" && row.km !== null).map(row => row.km!);
  const riskByCategory = new Map<CarRiskCategory, number>();
  let riskAdverts = 0;
  for (const row of rows) {
    const risks = declaredRisks(row.title, row.detail?.description ?? "");
    if (!risks.length) continue;
    riskAdverts++;
    for (const risk of risks) riskByCategory.set(risk.category, (riskByCategory.get(risk.category) ?? 0) + 1);
  }

  const models: CarReportModel[] = [...byModel.entries()]
    .filter(([, group]) => group.length >= CAR_REPORT_POLICY.minimumAdverts)
    .map(([marketSlug, group]) => {
      const groupPrices = group.map(row => row.priceUsd);
      const range = rangeOf(groupPrices)!;
      const groupKms = group.filter(row => row.kmQuality === "ok" && row.km !== null).map(row => row.km!);
      const riskCount = group.filter(row => declaredRisks(row.title, row.detail?.description ?? "").length).length;
      return {
        marketSlug,
        brand: group[0]!.brand,
        model: group[0]!.model,
        adverts: group.length,
        share: round3(group.length / total),
        price: range,
        medianYear: Math.round(quantile(group.map(row => row.year), 0.5)),
        medianKm: groupKms.length ? Math.round(quantile(groupKms, 0.5)) : null,
        annualDrop: annualDropOf(depreciationOf(group, options.maxYear)),
        spread: range.median ? round3((range.p75 - range.p25) / range.median) : 0,
        dealerShare: round3(group.filter(row => row.sellerType === "dealer").length / group.length),
        automaticShare: round3(group.filter(row => row.transmission === "automatica").length / group.length),
        declaredRiskShare: round3(riskCount / group.length),
      };
    })
    .sort((a, b) => b.adverts - a.adverts)
    .slice(0, CAR_REPORT_POLICY.topModels);

  const depreciation: CarReportDepreciation[] = models
    .map(model => {
      const group = byModel.get(model.marketSlug)!;
      return {
        marketSlug: model.marketSlug,
        brand: model.brand,
        model: model.model,
        annualDrop: model.annualDrop,
        points: depreciationOf(group, options.maxYear),
      };
    })
    .filter(entry => entry.annualDrop !== null)
    .sort((a, b) => (a.annualDrop ?? 1) - (b.annualDrop ?? 1));

  // "Con US$ 30.000, ¿qué compro?" La primera versión contestaba "un Gol", porque listaba los modelos
  // con más avisos POR DEBAJO del tope y abajo de 30.000 entra casi todo el mercado. La pregunta real
  // es qué se compra GASTANDO ese presupuesto, así que la franja es de 80 % a 100 % del tope y lo que
  // se muestra es el AÑO que ese dinero paga en cada modelo.
  const budgets: CarReportBudget[] = BUDGETS.map(maxUsd => {
    const band = rows.filter(row => row.priceUsd <= maxUsd && row.priceUsd >= maxUsd * 0.8);
    const groups = new Map<string, CarListing[]>();
    for (const row of band) {
      const group = groups.get(row.marketSlug) ?? [];
      group.push(row);
      groups.set(row.marketSlug, group);
    }
    return {
      maxUsd,
      adverts: band.length,
      models: [...groups.entries()]
        .filter(([, group]) => group.length >= 8)
        .map(([marketSlug, group]) => {
          const groupKms = group.filter(row => row.kmQuality === "ok" && row.km !== null).map(row => row.km!);
          return {
            marketSlug,
            brand: group[0]!.brand,
            model: group[0]!.model,
            adverts: group.length,
            medianUsd: Math.round(quantile(group.map(row => row.priceUsd), 0.5)),
            medianYear: Math.round(quantile(group.map(row => row.year), 0.5)),
            medianKm: groupKms.length ? Math.round(quantile(groupKms, 0.5)) : null,
          };
        })
        .sort((a, b) => b.adverts - a.adverts)
        .slice(0, 8),
    };
  });

  const sellerGapModels: CarReportSellerGap[] = models
    .map(model => {
      const gap = sellerGapOf(byModel.get(model.marketSlug)!);
      return gap ? { marketSlug: model.marketSlug, brand: model.brand, model: model.model, ...gap } : null;
    })
    .filter((entry): entry is CarReportSellerGap => !!entry)
    .sort((a, b) => b.gap - a.gap);

  return {
    market: {
      adverts: total,
      brands: byBrand.size,
      models: byModel.size,
      price: rangeOf(prices) ?? { p25: 0, median: 0, p75: 0 },
      year: rangeOf(years) ?? { p25: 0, median: 0, p75: 0 },
      km: rangeOf(kms),
      sellers: {
        dealer: rows.filter(row => row.sellerType === "dealer").length,
        private: rows.filter(row => row.sellerType === "private").length,
        unknown: rows.filter(row => !row.sellerType).length,
      },
      fuels: countBy(rows, row => row.fuel).map(entry => ({ fuel: entry.key as CarFuel | "unknown", adverts: entry.adverts })),
      transmissions: countBy(rows, row => row.transmission).map(entry => ({
        transmission: entry.key as CarTransmission | "unknown", adverts: entry.adverts,
      })),
      departments: countBy(rows, row => row.department)
        .filter(entry => entry.key !== "unknown")
        .slice(0, 10)
        .map(entry => ({ department: entry.key, adverts: entry.adverts })),
      priceBands: PRICE_BANDS.map((from, index) => {
        const to = PRICE_BANDS[index + 1] ?? null;
        return { from, to, adverts: rows.filter(row => row.priceUsd >= from && (to === null || row.priceUsd < to)).length };
      }),
    },
    brands: [...byBrand.entries()]
      .map(([slug, group]) => ({
        slug,
        name: group[0]!.brand,
        adverts: group.length,
        share: round3(group.length / total),
        medianUsd: Math.round(quantile(group.map(row => row.priceUsd), 0.5)),
        medianYear: Math.round(quantile(group.map(row => row.year), 0.5)),
      }))
      .sort((a, b) => b.adverts - a.adverts)
      .slice(0, CAR_REPORT_POLICY.topBrands),
    models,
    depreciation,
    budgets,
    sellerGaps: {
      median: sellerGapModels.length ? round3(quantile(sellerGapModels.map(entry => entry.gap), 0.5)) : null,
      models: sellerGapModels,
    },
    negotiation: negotiationOf(docs, options.now),
    rotation: rotationOf(docs, options.now),
    risk: {
      adverts: riskAdverts,
      share: total ? round3(riskAdverts / total) : 0,
      byCategory: [...riskByCategory.entries()]
        .map(([category, adverts]) => ({ category, adverts }))
        .sort((a, b) => b.adverts - a.adverts),
    },
  };
}
