// El límite público del directorio de motos.
//
// Cada fila pública se ARMA CAMPO POR CAMPO, como en autos: nada se copia con un spread, así que un
// campo interno que aparezca mañana (el id del vendedor, un texto de ficha) no puede cruzar solo. El
// permalink y la foto se vuelven a validar acá contra el host del origen aunque el lector ya los
// haya validado al parsear — es la regla de "se valida en los dos lados" que autos compró con un
// defecto.
//
// Y acá vive la decisión que más cambia lo que la página muestra: **qué avisos entran a una banda**.
import { annualDropOf, depreciationOf } from "../autos/report";
import { cleanPublicText } from "../autos/normalize";
import { quantile } from "../autos/stats";
import { ML_MOTOS_PERMALINK_PREFIX } from "./sources/mercadolibre";
import { MOTO_SOURCES } from "./sources";
import type {
  MotoDisplacementBand,
  MotoListing,
  MotoPriceBand,
  MotoPropulsion,
  MotoType,
  MotoYearBand,
  PublicMotoCatalogMeta,
  PublicMotoListing,
  PublicMotoModel,
  PublicMotoSourceCoverage,
} from "./types";

/** Un aviso que no se vio en estos días sale del catálogo público. Mismo número que autos. */
export const MOTO_CATALOG_FRESH_DAYS = 4;

/** Mínimo de avisos para que una banda sea una banda y no una anécdota. */
export const MOTO_BAND_MIN = 5;

/**
 * Lo que el propio vendedor declara y que saca al aviso de la banda: una moto chocada, con deuda,
 * sin papeles o con chapa extranjera no cuesta lo que cuesta el mercado de esa moto, y meterla en la
 * mediana es exactamente el error que `/autos-chocados-y-con-deuda-uruguay` mide del otro lado.
 * `financing` y `price_mismatch` NO están: en autos su descuento medido es ≈0 — no son riesgo, son
 * truco de aviso — y acá no hay medición propia que diga otra cosa.
 */
export const MOTO_EXCLUDING_FLAGS = new Set(["damaged", "paperwork", "recovered", "foreign_plate"]);

/** Eléctrica o combustión: el eje por el que se parten las bandas. */
export function propulsionOf(listing: Pick<MotoListing, "fuel">): MotoPropulsion {
  return listing.fuel === "electrica" ? "electrica" : "combustion";
}

/**
 * Qué avisos cuentan para una banda de precio.
 *
 * **Un precio en pesos SÍ cuenta**, y es una divergencia deliberada con autos, que sólo mira los
 * avisos publicados en dólares. El motivo está medido: en las 100 tarjetas leídas el 2026-09-22, los
 * 20 avisos en pesos son justo el tramo barato (Yumbo, Baccio, Zanella, Winner, entre $ 24.000 y
 * $ 110.000) y los de dólares arrancan bastante más arriba. Descartar los pesos no "limpia" la
 * banda: le borra el piso, que es la mitad del mercado que este directorio existe para publicar —
 * la misma lección de la canasta emparejada de PRECIOS.md, donde un total baja por FALTARLE ítems.
 * Se convierten con el mismo tipo de cambio que usa todo el sitio (la mediana de venta de las casas)
 * y ese número viaja en la meta, así que la conversión es auditable.
 *
 * Lo que sí queda afuera es una moneda DEDUCIDA (`currencyInferred`), que en v1 no existe porque
 * Mercado Libre la declara en cada tarjeta, y el aviso cuyo propio texto dice que está chocado.
 */
export function bandEligible(listing: MotoListing): boolean {
  return (
    !listing.currencyInferred &&
    listing.priceUsd > 0 &&
    listing.year > 1950 &&
    !listing.flags.some(flag => MOTO_EXCLUDING_FLAGS.has(flag))
  );
}

function bandOf(group: readonly MotoListing[]): MotoPriceBand {
  const prices = group.map(listing => listing.priceUsd);
  const kms = group.filter(listing => listing.kmQuality === "ok" && listing.km !== null).map(listing => listing.km!);
  return {
    n: group.length,
    // Un vendedor con cuarenta avisos no es cuarenta opiniones sobre el precio: la tarjeta imprime
    // cuántos vendedores distintos hay detrás de la banda.
    sellers: new Set(group.map(listing => listing.sellerId ?? listing.key)).size,
    p25: Math.round(quantile(prices, 0.25)),
    median: Math.round(quantile(prices, 0.5)),
    p75: Math.round(quantile(prices, 0.75)),
    // Sin al menos tres kilometrajes declarados de verdad no se publica una mediana de km: con uno o
    // dos, el número describe a un aviso y no al modelo.
    kmMedian: kms.length >= 3 ? Math.round(quantile(kms, 0.5)) : null,
  };
}

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

export function publicMotoListing(listing: MotoListing): PublicMotoListing | null {
  // Segunda validación del permalink, a propósito: si un día entra otra fuente con otro host, el
  // aviso no llega al público sin que alguien agregue su regla acá.
  if (listing.source !== "mercadolibre" || !listing.permalink.startsWith(ML_MOTOS_PERMALINK_PREFIX)) return null;
  const picture = listing.picture && /^https:\/\/http2\.mlstatic\.com\//.test(listing.picture) ? listing.picture : null;
  return {
    key: listing.key,
    source: listing.source,
    sourceName: listing.sourceName,
    brand: listing.brand,
    brandSlug: listing.brandSlug,
    model: listing.model,
    modelSlug: listing.modelSlug,
    marketSlug: listing.marketSlug,
    productKey: listing.productKey,
    // El título es prosa del vendedor: se le sacan teléfonos, mails y links antes de publicarlo.
    title: cleanPublicText(listing.title).slice(0, 160),
    year: listing.year,
    km: listing.kmQuality === "ok" ? listing.km : null,
    price: listing.price,
    currency: listing.currency,
    priceUsd: listing.priceUsd,
    priceConverted: listing.priceConverted,
    currencyInferred: listing.currencyInferred,
    displacement: listing.displacement,
    displacementBasis: listing.displacementBasis,
    displacementBand: listing.displacementBand,
    displacementBandBasis: listing.displacementBandBasis,
    type: listing.type,
    typeBasis: listing.typeBasis,
    fuel: listing.fuel,
    department: listing.department,
    neighborhood: listing.neighborhood,
    sellerType: listing.sellerType,
    picture,
    pictureCount: listing.pictureCount,
    permalink: listing.permalink,
    firstSeen: listing.firstSeen,
    lastSeen: listing.lastSeen,
    priceDrop: listing.priceDrop ? { ...listing.priceDrop } : null,
    flags: [...listing.flags],
  };
}

export interface MotoCatalogContext {
  now: Date;
  generatedAt: string;
  usdUyu: number;
  lastFullReadAt: string | null;
  lastReadAt: string | null;
  reportedTotal: number | null;
  sources: PublicMotoSourceCoverage[];
}

export function buildMotoCatalog(
  listings: readonly MotoListing[],
  context: MotoCatalogContext
): { listings: PublicMotoListing[]; meta: PublicMotoCatalogMeta } {
  const cutoff = context.now.getTime() - MOTO_CATALOG_FRESH_DAYS * 86_400_000;
  const rows = listings
    .filter(listing => Date.parse(listing.lastSeen) >= cutoff)
    .map(publicMotoListing)
    .filter((row): row is PublicMotoListing => !!row)
    .sort((a, b) => a.key.localeCompare(b.key));
  const models = new Map<string, { slug: string; brand: string; model: string; listings: number }>();
  for (const row of rows) {
    const entry = models.get(row.marketSlug) ?? { slug: row.marketSlug, brand: row.brand, model: row.model, listings: 0 };
    entry.listings++;
    models.set(row.marketSlug, entry);
  }
  return {
    listings: rows,
    meta: {
      id: "uy-motos",
      generatedAt: context.generatedAt,
      freshDays: MOTO_CATALOG_FRESH_DAYS,
      sourceCoverage: "partial",
      listings: rows.length,
      usdUyu: context.usdUyu,
      lastFullReadAt: context.lastFullReadAt,
      lastReadAt: context.lastReadAt,
      reportedTotal: context.reportedTotal,
      // Se publica cuántos avisos no dicen su cilindrada para que la página lo pueda decir en vez de
      // dejar pensar que todos los que no aparecen en un filtro de cilindrada no existen.
      withoutDisplacement: rows.filter(row => row.displacement === null).length,
      // El tramo es la dimensión que el directorio de verdad puede filtrar: la cilindrada exacta la
      // declara el título y casi nunca lo hace (2 de 73 en la primera corrida real). Se publican los
      // dos números para que la página diga cuál de los dos filtros puede ofrecer y sobre cuántos.
      withoutDisplacementBand: rows.filter(row => row.displacementBand === null).length,
      models: [...models.values()].sort((a, b) => b.listings - a.listings || a.slug.localeCompare(b.slug)),
      sources: context.sources.map(source => ({ ...source })),
    },
  };
}

/**
 * El slug de la ficha del modelo. Una línea eléctrica del mismo fabricante es una ficha APARTE
 * (`yumbo-gs-electrica`) y no una sección de la misma: si compartieran ficha, la banda de arriba
 * tendría que promediar dos mercados para existir, que es justo lo que no se hace.
 */
export const motoModelSlug = (marketSlug: string, propulsion: MotoPropulsion): string =>
  propulsion === "electrica" ? `${marketSlug}-electrica` : marketSlug;

export function buildMotoModels(
  listings: readonly MotoListing[],
  options: { now: Date; generatedAt: string; freshDays?: number }
): PublicMotoModel[] {
  const cutoff = options.now.getTime() - (options.freshDays ?? MOTO_CATALOG_FRESH_DAYS) * 86_400_000;
  const fresh = listings.filter(listing => Date.parse(listing.lastSeen) >= cutoff);
  const models: PublicMotoModel[] = [];
  for (const [, group] of groupBy(fresh, listing => `${listing.marketSlug}|${propulsionOf(listing)}`)) {
    const newest = [...group].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))[0]!;
    const propulsion = propulsionOf(newest);
    const clean = group.filter(bandEligible);
    const years: MotoYearBand[] = [...groupBy(clean, listing => String(listing.year))]
      .filter(([, items]) => items.length >= MOTO_BAND_MIN)
      .map(([, items]) => ({ year: items[0]!.year, ...bandOf(items) }))
      .sort((a, b) => b.year - a.year);
    const displacements: MotoDisplacementBand[] = [...groupBy(
      // Una fila sin cilindrada declarada NO entra a ninguna cohorte de cilindrada. Es la regla de
      // la spec escrita como código: precisión sobre recall.
      clean.filter(listing => listing.displacement !== null),
      listing => String(listing.displacement)
    )]
      .filter(([, items]) => items.length >= MOTO_BAND_MIN)
      .map(([, items]) => ({ displacement: items[0]!.displacement!, ...bandOf(items) }))
      .sort((a, b) => a.displacement - b.displacement);
    const types = [...groupBy(clean.filter(listing => listing.type), listing => listing.type!)]
      .map(([type, items]) => ({ type: type as MotoType, adverts: items.length }))
      .sort((a, b) => b.adverts - a.adverts || a.type.localeCompare(b.type));
    models.push({
      version: 1,
      slug: motoModelSlug(newest.marketSlug, propulsion),
      brand: newest.brand,
      brandSlug: newest.brandSlug,
      model: newest.model,
      modelSlug: newest.modelSlug,
      generatedAt: options.generatedAt,
      listings: group.length,
      propulsion,
      band: clean.length >= MOTO_BAND_MIN ? bandOf(clean) : null,
      years,
      displacements,
      // La misma recta que usa el informe de autos (`annualDropOf`), con la firma ya ensanchada a
      // `{ year, priceUsd }`: la mediana por año en escala logarítmica, ponderada por la raíz de los
      // avisos. Devuelve null cuando la curva no tiene puntos ni tramo suficientes, y entonces la
      // ficha dice que no hay depreciación medida en vez de estimar una.
      annualDrop: annualDropOf(
        depreciationOf(
          clean.map(listing => ({ year: listing.year, priceUsd: listing.priceUsd })),
          Math.max(...clean.map(listing => listing.year), options.now.getUTCFullYear())
        )
      ),
      types,
    });
  }
  return models.sort((a, b) => b.listings - a.listings || a.slug.localeCompare(b.slug));
}

/** Cobertura por fuente, para que la página diga qué se leyó y cuándo. */
export function motoSourceCoverage(
  rows: readonly Pick<PublicMotoListing, "source">[],
  duplicates: Partial<Record<PublicMotoListing["source"], number>>,
  metas: ReadonlyMap<PublicMotoListing["source"], { lastOkAt: string | null; ok: boolean }>
): PublicMotoSourceCoverage[] {
  return (Object.keys(MOTO_SOURCES) as Array<PublicMotoListing["source"]>).map(source => ({
    source,
    name: MOTO_SOURCES[source].name,
    listings: rows.filter(row => row.source === source).length,
    duplicates: duplicates[source] ?? 0,
    lastReadAt: metas.get(source)?.lastOkAt ?? null,
    ok: metas.get(source)?.ok ?? false,
  }));
}
