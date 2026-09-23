// De un aviso crudo a una moto con todo lo derivado ya calculado, y el filtro de lo que no es una
// moto. Todo puro: ni red ni base, así que se prueba entero sin nada levantado.
import { slugify, titleFlags, wordText } from "../autos/normalize";
import {
  displacementBandOf,
  displacementOf,
  motoProductKey,
  motoRejection,
  motoTypeFromTitle,
  type MotoRejection,
} from "./identify";
import { MOTO_SOURCES } from "./sources";
import type {
  MotoCurrency,
  MotoDisplacementBandId,
  MotoFuel,
  MotoKmQuality,
  MotoListing,
  MotoPricePoint,
  MotoType,
  RawMotoListing,
} from "./types";

/**
 * Calidad del kilometraje. NO se reusa `kmQuality` de autos y el motivo está medido: allá todo lo
 * que está debajo de 1.000 km es stock 0 km de automotora, y acá no — de las 100 tarjetas leídas el
 * 2026-09-22, "Sherco Sef 300 My 2026" tiene 11 km reales, la "Ktm 890 Adventure R" 14 y el
 * "Morbidelli N352" 200. Lo que en este catálogo sí es un placeholder es el **1**: "Vespa 125" de
 * 2009, "Honda 50, C-70" de 1979 y "Moto Zanela Due 50 Cc" de 1991 vienen las tres con 1 km, que es
 * lo que queda cuando el vendedor no declaró nada.
 *
 * El dígito repetido se exige de CUATRO cifras para arriba (111.111 es el placeholder clásico de ML
 * y aparece en esta categoría también), porque con el patrón de autos "11" sería un placeholder y en
 * motos 11 km es un número real.
 */
export function motoKmQuality(km: number | null): MotoKmQuality {
  if (km === null || !Number.isFinite(km)) return "unknown";
  if (km <= 1) return "placeholder";
  // Nadie vende una moto con más de 300.000 km; ese número es un error de tipeo o un precio metido
  // en el campo equivocado.
  if (km > 300_000) return "placeholder";
  if (/^(\d)\1{3,}$/.test(String(Math.round(km)))) return "placeholder";
  return "ok";
}

/** Una baja que OBSERVAMOS: el precio guardado anterior era mayor, en la misma moneda. */
export function motoPriceDrop(
  listing: Pick<RawMotoListing, "price" | "currency">,
  history: readonly MotoPricePoint[]
): MotoListing["priceDrop"] {
  if (history.length < 2) return null;
  const current = history[history.length - 1]!;
  const previous = history[history.length - 2]!;
  if (current.price !== listing.price || current.currency !== listing.currency) return null;
  if (previous.currency !== listing.currency || previous.price <= listing.price) return null;
  return { from: previous.price, currency: listing.currency, since: current.observedAt };
}

/** El título dice que es eléctrica aunque la etiqueta de ML no lo diga. */
const TITULO_ELECTRICA = /\b(electric[oa]s?|e-?bike|litio)\b/;

export interface EnrichMotoContext {
  usdUyu: number;
  firstSeen: string;
  lastSeen: string;
  priceHistory: readonly MotoPricePoint[];
  /** El tipo que declaró la faceta `MOTO_TYPE` del origen, cuando la corrida la barrió. */
  declaredType?: MotoType | null;
  /** El tramo de cilindrada que declaró la faceta `ENGINE_DISPLACEMENT`, cuando la corrida la barrió. */
  declaredBand?: MotoDisplacementBandId | null;
}

export function enrichMotoListing(raw: RawMotoListing, context: EnrichMotoContext): MotoListing {
  const brandSlug = slugify(raw.brand);
  const modelSlug = slugify(raw.model);
  const displacement = displacementOf(raw.title);
  const titleType = motoTypeFromTitle(raw.title);
  // La faceta del origen gana siempre: es lo que el vendedor eligió al publicar, no lo que una
  // palabra del título sugiere. Mismo orden de evidencia que la carrocería de autos.
  const type = context.declaredType ?? titleType;
  // El tramo lo declara la faceta del origen, que lo sabe de casi todo el catálogo; si la corrida no
  // llegó a barrerla, se deriva de la cilindrada exacta que haya dicho el título. Nunca al revés: un
  // tramo no puede inventar la cilindrada exacta.
  const titleBand = displacementBandOf(displacement);
  const displacementBand = context.declaredBand ?? titleBand;
  const fuel: MotoFuel | null = raw.fuel ?? (TITULO_ELECTRICA.test(wordText(raw.title)) ? "electrica" : null);
  return {
    ...raw,
    key: motoKey(raw.id, raw.source),
    sourceName: MOTO_SOURCES[raw.source].name,
    brandSlug,
    modelSlug,
    marketSlug: `${brandSlug}-${modelSlug}`,
    displacement,
    displacementBasis: displacement === null ? null : "title",
    displacementBand,
    displacementBandBasis: context.declaredBand ? "mercadolibre" : titleBand ? "title" : null,
    type,
    typeBasis: context.declaredType ? "mercadolibre" : titleType ? "title" : null,
    productKey: motoProductKey(raw.brand, raw.model, displacement),
    kmQuality: motoKmQuality(raw.km),
    fuel,
    flags: titleFlags(raw.title, raw.price, raw.currency as MotoCurrency),
    priceUsd: raw.currency === "USD" ? raw.price : Math.round(raw.price / context.usdUyu),
    priceConverted: raw.currency !== "USD",
    // Mercado Libre declara la moneda en cada tarjeta, así que en v1 nunca se deduce. El campo viaja
    // igual porque el comparador de transporte lo LEE para descartar filas (`currencyInferred`), y
    // una fuente futura sin moneda declarada tiene que poder ponerlo en true sin cambiar el contrato.
    currencyInferred: false,
    firstSeen: context.firstSeen,
    lastSeen: context.lastSeen,
    priceDrop: motoPriceDrop(raw, context.priceHistory),
  };
}

export function motoKey(id: string, source: RawMotoListing["source"] = "mercadolibre"): string {
  return `${source === "mercadolibre" ? "ml" : source}-${id}`;
}

export interface MotoFilterResult<T> {
  kept: T[];
  /** Cuántos se fueron por cada motivo. Se publica en el log: la ausencia se declara. */
  rejected: Partial<Record<MotoRejection | "tipo-excluido", number>>;
}

/**
 * Saca del directorio lo que no es una moto usada en venta.
 *
 * `excludedIds` son los avisos que la PROPIA taxonomía de Mercado Libre clasifica como cuatriciclo,
 * triciclo o motocarro (faceta `MOTO_TYPE`). Van primero porque son los únicos con evidencia del
 * origen; el título es el respaldo, y hace falta: de los 23 títulos distintos de esas tres facetas,
 * 16 no nombran su clase en ninguna parte (ver ./identify.ts).
 */
export function filterMotos<T extends { id: string; title: string }>(
  listings: readonly T[],
  excludedIds: ReadonlySet<string> = new Set()
): MotoFilterResult<T> {
  const kept: T[] = [];
  const rejected: MotoFilterResult<T>["rejected"] = {};
  for (const listing of listings) {
    if (excludedIds.has(listing.id)) {
      rejected["tipo-excluido"] = (rejected["tipo-excluido"] ?? 0) + 1;
      continue;
    }
    const reason = motoRejection(listing.title);
    if (reason) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    kept.push(listing);
  }
  return { kept, rejected };
}

/**
 * La misma moto publicada en dos fuentes queda UNA vez, con la de menor `priority` (ver
 * ./sources/index.ts). Misma marca, modelo y año, km dentro de max(500, 1 %) y precio dentro del 3 %
 * — los mismos umbrales que `classes/autos/dedupe.ts`, que es el archivo del que sale la regla.
 *
 * En v1 hay una sola fuente y esto no descarta nada; existe porque es el seam por el que entra la
 * segunda, y porque una identidad de producto que sólo funciona con una fuente no es una identidad.
 */
const DUPLICATE = { kmAbsolute: 500, kmRatio: 0.01, priceRatio: 0.03 } as const;

export function motoTwins(a: MotoListing, b: MotoListing): boolean {
  return (
    a.brandId === b.brandId &&
    a.modelId === b.modelId &&
    a.year === b.year &&
    a.km !== null &&
    b.km !== null &&
    Math.abs(a.km - b.km) <= Math.max(DUPLICATE.kmAbsolute, a.km * DUPLICATE.kmRatio) &&
    Math.abs(a.priceUsd - b.priceUsd) <= a.priceUsd * DUPLICATE.priceRatio
  );
}

export function dedupeMotos(listings: readonly MotoListing[]): {
  kept: MotoListing[];
  duplicates: Partial<Record<RawMotoListing["source"], number>>;
} {
  const sorted = [...listings].sort(
    (a, b) => MOTO_SOURCES[a.source].priority - MOTO_SOURCES[b.source].priority || a.key.localeCompare(b.key)
  );
  const keptByMoto = new Map<string, MotoListing[]>();
  const kept: MotoListing[] = [];
  const duplicates: Partial<Record<RawMotoListing["source"], number>> = {};
  for (const listing of sorted) {
    const cohort = `${listing.brandId}|${listing.modelId}|${listing.year}`;
    const peers = keptByMoto.get(cohort) ?? [];
    if (peers.some(peer => peer.source !== listing.source && motoTwins(peer, listing))) {
      duplicates[listing.source] = (duplicates[listing.source] ?? 0) + 1;
      continue;
    }
    peers.push(listing);
    keptByMoto.set(cohort, peers);
    kept.push(listing);
  }
  return { kept, duplicates };
}
