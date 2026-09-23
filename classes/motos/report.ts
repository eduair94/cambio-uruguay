// El informe del mercado de motos usadas: qué hay a la venta, a qué precio y cuánto pierde por año.
//
// Lo primero es lo que el informe NO puede decir, porque es lo primero que alguien va a querer leer
// en él: **cuáles son las más vendidas**. En Uruguay nadie publica transferencias de motos por
// modelo, y lo que este job tiene son AVISOS. Un modelo con mucha oferta puede ser el que más se
// vende o el que nadie quiere sacarse de encima, y el aviso no distingue esas dos cosas. Es la misma
// advertencia que encabeza `classes/autos/report.ts`, y vale más acá: con 1.391 avisos usados
// (medido el 2026-09-22) cualquier lectura de "tendencia" sería ruido.
//
// Tampoco se publica ROTACIÓN (cuánto tarda un aviso en irse): esa medición necesita historia propia
// y la serie de motos arranca el día que este job corre por primera vez. El informe lo dice.
import { annualDropOf, depreciationOf } from "../autos/report";
import { quantile } from "../autos/stats";
import { bandEligible, propulsionOf } from "./catalog";
import { MOTO_DISPLACEMENT_FACETS } from "./identify";
import type { MotoFuel, MotoListing, MotoReportDepreciation, MotoSellerType, MotoType, PublicMotoReport } from "./types";

export const MOTO_REPORT_POLICY = {
  /**
   * Un modelo entra a la curva de depreciación con esto. Doce y no los treinta de autos porque el
   * mercado es catorce veces más chico (1.391 avisos contra ~19.000, medido el 2026-09-22): con
   * treinta, la sección quedaría vacía para siempre y "no hay datos" diría algo falso sobre el
   * mercado en vez de algo verdadero sobre el umbral. `annualDropOf` sigue exigiendo por su cuenta
   * seis puntos de año y cinco años de tramo, que es la guarda que de verdad decide.
   */
  minimumAdverts: 12,
  topBrands: 20,
  topModels: 30,
} as const;

/** En dólares, y bajos a propósito: es el tramo en el que se compra una moto de trabajo en Uruguay. */
const BUDGETS = [1_000, 2_000, 3_500, 6_000, 12_000];

const medianOf = (values: readonly number[]): number | null => (values.length ? Math.round(quantile(values, 0.5)) : null);

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    const group = groups.get(name);
    if (group) group.push(item);
    else groups.set(name, [item]);
  }
  return groups;
}

const countBy = <T extends string>(
  rows: readonly MotoListing[],
  pick: (listing: MotoListing) => T | null
): Array<{ id: T | "sin-dato"; adverts: number }> => {
  const counts = new Map<T | "sin-dato", number>();
  for (const row of rows) {
    const id = pick(row) ?? ("sin-dato" as const);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, adverts]) => ({ id, adverts }))
    .sort((a, b) => b.adverts - a.adverts || String(a.id).localeCompare(String(b.id)));
};

export interface MotoReportContext {
  generatedAt: string;
  usdUyu: number;
  /** Cuántos avisos del catálogo no declaran su cilindrada exacta, para decirlo en el propio informe. */
  withoutDisplacement: number;
  /** Y cuántos no tienen ni siquiera tramo. */
  withoutDisplacementBand: number;
}

export function buildMotoReport(listings: readonly MotoListing[], context: MotoReportContext): PublicMotoReport {
  // El informe mide el mercado de combustión: las 35 motos eléctricas medidas son otro mercado y
  // promediarlas acá repetiría el error que las bandas evitan. Cuando haya volumen, tendrán su
  // propia sección; hasta entonces, el informe lo dice en `caveats` en vez de mezclarlas en silencio.
  const clean = listings.filter(listing => bandEligible(listing) && propulsionOf(listing) === "combustion");

  const brands = [...groupBy(clean, listing => listing.brandSlug)]
    .map(([slug, items]) => ({
      slug,
      name: items[0]!.brand,
      adverts: items.length,
      medianUsd: medianOf(items.map(listing => listing.priceUsd)),
    }))
    .sort((a, b) => b.adverts - a.adverts || a.slug.localeCompare(b.slug))
    .slice(0, MOTO_REPORT_POLICY.topBrands);

  // Los tramos son los de la propia faceta `ENGINE_DISPLACEMENT` de Mercado Libre y no unos
  // inventados: si el origen ya corta el mercado así, cortarlo distinto obligaría a explicar por qué.
  // Y se cuenta por `displacementBand` y no por la cilindrada exacta porque es la única de las dos
  // que el catálogo tiene de verdad (2 de 73 títulos la escriben, medido el 2026-09-22).
  const displacements = [
    ...MOTO_DISPLACEMENT_FACETS.map(facet => {
      const items = clean.filter(listing => listing.displacementBand === facet.band);
      return {
        band: facet.band,
        label: facet.label,
        adverts: items.length,
        medianUsd: medianOf(items.map(listing => listing.priceUsd)),
      };
    }),
    // El tramo que falta se DECLARA, con su propia mediana: un aviso sin cilindrada no desaparece
    // del informe, aparece diciendo que no se sabe.
    (() => {
      const items = clean.filter(listing => listing.displacementBand === null);
      return {
        band: "sin-dato" as const,
        label: "sin cilindrada declarada",
        adverts: items.length,
        medianUsd: medianOf(items.map(listing => listing.priceUsd)),
      };
    })(),
  ];

  const depreciation: MotoReportDepreciation[] = [];
  for (const [slug, items] of groupBy(clean, listing => listing.marketSlug)) {
    if (items.length < MOTO_REPORT_POLICY.minimumAdverts) continue;
    const maxYear = Math.max(...items.map(listing => listing.year));
    const points = depreciationOf(
      items.map(listing => ({ year: listing.year, priceUsd: listing.priceUsd })),
      maxYear
    );
    const drop = annualDropOf(points);
    if (drop === null) continue;
    depreciation.push({
      slug,
      brand: items[0]!.brand,
      model: items[0]!.model,
      adverts: items.length,
      annualDrop: drop,
      points,
    });
  }
  depreciation.sort((a, b) => b.adverts - a.adverts || a.slug.localeCompare(b.slug));

  const budgets = BUDGETS.map(maxUsd => {
    const items = clean.filter(listing => listing.priceUsd <= maxUsd);
    const models = [...groupBy(items, listing => listing.marketSlug)]
      .map(([slug, group]) => ({ slug, brand: group[0]!.brand, model: group[0]!.model, adverts: group.length }))
      .sort((a, b) => b.adverts - a.adverts || a.slug.localeCompare(b.slug))
      .slice(0, 10);
    return { maxUsd, adverts: items.length, models };
  });

  const sellers = countBy<MotoSellerType>(clean, listing => listing.sellerType).map(entry => ({
    sellerType: entry.id,
    adverts: entry.adverts,
    medianUsd: medianOf(
      clean.filter(listing => (listing.sellerType ?? "sin-dato") === entry.id).map(listing => listing.priceUsd)
    ),
  }));

  const caveats = [
    "Mide OFERTA, no ventas: en Uruguay las transferencias de motos usadas no se publican por modelo, así que un modelo con mucha oferta puede ser el que más se vende o el que nadie logra vender.",
    `La cilindrada EXACTA sale del título del aviso y ${context.withoutDisplacement} avisos no la declaran: esos no entran a ninguna cohorte de cilindrada exacta. El TRAMO (hasta 125 cc, 126 a 250, más de 250) lo declara Mercado Libre y falta en ${context.withoutDisplacementBand}.`,
    "No se publican oportunidades ni gangas: la cohorte que autos usa (modelo+año+versión+motor+caja) no tiene equivalente medido en motos, y declarar una ganga sin esa cohorte es el error que autos ya cometió y corrigió.",
    "Las motos eléctricas quedan fuera de este informe y de estas medianas: son otro mercado, con otro costo de uso, y se publican en sus propias bandas.",
    "No se publica cuánto tarda en venderse una moto: esa medición necesita historia propia y la serie arranca con la primera corrida de este job.",
  ];

  return {
    generatedAt: context.generatedAt,
    usdUyu: context.usdUyu,
    adverts: clean.length,
    brands,
    displacements,
    types: countBy<MotoType>(clean, listing => listing.type).map(entry => ({ type: entry.id, adverts: entry.adverts })),
    fuels: countBy<MotoFuel>(listings.filter(bandEligible), listing => listing.fuel).map(entry => ({
      fuel: entry.id,
      adverts: entry.adverts,
    })),
    sellers,
    depreciation: depreciation.slice(0, MOTO_REPORT_POLICY.topModels),
    budgets,
    caveats,
  };
}
