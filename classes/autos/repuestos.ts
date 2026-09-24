// Cuánto salen los repuestos de cada modelo: seis piezas buscadas en Mercado Libre Uruguay, una por
// categoría, para el asesor de compra (/que-auto-comprar-uruguay).
//
// No es `IS_A_PART` de priceSanity.ts —eso saca repuestos publicados como autos—: acá el repuesto es
// el dato. Las seis piezas resumen lo que cuesta mantener un auto (pastillas, filtro, amortiguador,
// embrague, distribución) y lo que cuesta un golpe chico (la óptica delantera).
//
// DOS REGLAS QUE SALIERON DE MIRAR TÍTULOS REALES (2026-09-24):
//  * El modelo va como PALABRA ENTERA y con todas sus palabras. "Amortiguador Peugeot 2008" apareció
//    buscando 208, y "Pastilla Freno Citroen C4 06-" buscando C4 Cactus: son otros autos.
//  * Un nombre de tres letras o menos exige la marca. "Up" es también "Pick Up", y "Ka", "C3" o
//    "208" sueltos no alcanzan para saber de qué auto habla un título.
//
// El índice compara cada pieza contra la mediana de TODOS los modelos y promedia las razones
// (media geométrica). Nunca se suma una canasta a la que le faltan piezas: un total baja por
// faltarle ítems, que es la lección de la canasta del súper (docs/app/PRECIOS.md).
import { fold } from "./normalize";
import { quantile } from "./stats";
import type { PublicCarAdvisorParts, PublicCarPartKey, PublicCarPartPrice } from "./publicTypes";

export interface CarPart {
  key: PublicCarPartKey;
  label: string;
  /** Categoría de Mercado Libre Uruguay, verificada contra el puente el 2026-09-24. */
  category: string;
  /** Las palabras que van antes de marca y modelo en la búsqueda. */
  query: string;
  /** El precio es por unidad: un par, un kit o un juego no se compara. */
  perUnit: boolean;
  /** Es la pieza delantera: la trasera es otra pieza con otro precio. */
  front: boolean;
}

export const CAR_PARTS: readonly CarPart[] = [
  { key: "pastillas", label: "Pastillas de freno delanteras", category: "MLU62414", query: "pastillas freno", perUnit: false, front: true },
  { key: "filtro_aceite", label: "Filtro de aceite", category: "MLU164783", query: "filtro aceite", perUnit: false, front: false },
  { key: "amortiguador", label: "Amortiguador delantero", category: "MLU164832", query: "amortiguador delantero", perUnit: true, front: true },
  { key: "embrague", label: "Kit de embrague", category: "MLU164977", query: "kit embrague", perUnit: false, front: false },
  { key: "distribucion", label: "Kit de distribución", category: "MLU164771", query: "kit distribucion", perUnit: false, front: false },
  { key: "optica", label: "Óptica delantera", category: "MLU442928", query: "farol delantero", perUnit: true, front: true },
];

/** Un modelo necesita esto para que una pieza tenga precio. */
export const PART_MIN_OFFERS = 3;
/** Y la pieza necesita esto para entrar al índice: la base de una razón no puede ser anécdota. */
export const PART_BASELINE_MIN_MODELS = 5;
/** Piezas con precio que hacen falta para dar un índice. */
export const PART_INDEX_MIN_PARTS = 3;

const words = (text: string): string[] => fold(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Palabras que describen la carrocería o la edición y no el modelo. */
const GENERIC = new Set(["new", "nuevo", "nueva", "sedan", "hatch", "hatchback", "cabina", "doble", "simple", "cd", "cs", "4x4", "4x2", "pick", "up"]);

const BRAND_ALIASES: Record<string, string[]> = {
  volkswagen: ["volkswagen", "vw", "volks"],
  chevrolet: ["chevrolet", "gm", "chevy"],
  "mercedes-benz": ["mercedes", "benz", "mb"],
  mercedes: ["mercedes", "benz", "mb"],
};

export interface PartsModelTokens {
  model: string[];
  brand: string[];
}

export function partsModelTokens(brand: string, model: string): PartsModelTokens {
  const all = words(model);
  // "Up!" es la palabra entera del modelo: ahí "up" no es genérica.
  const distinctive = all.filter(word => !GENERIC.has(word));
  const brandKey = fold(brand).trim().replace(/\s+/g, "-");
  return {
    model: distinctive.length ? distinctive : all,
    brand: BRAND_ALIASES[brandKey] ?? words(brand),
  };
}

const REAR = /\btras(era|eras|ero|eros)?\b/;
const SET = /\b(par|pares|x2|kit|juego|jgo|set)\b|\bx 2\b/;
const USED = /\busad[oa]s?\b/;

export function partTitleMatches(title: string, tokens: PartsModelTokens, part: Pick<CarPart, "perUnit" | "front">): boolean {
  const folded = fold(title);
  const present = new Set(words(title));
  if (!tokens.model.length || !tokens.model.every(word => present.has(word))) return false;
  const shortName = Math.max(...tokens.model.map(word => word.length)) <= 3;
  if (shortName && !tokens.brand.some(word => present.has(word))) return false;
  if (part.front && REAR.test(folded)) return false;
  if (part.perUnit && SET.test(folded)) return false;
  if (USED.test(folded)) return false;
  return true;
}

export interface CarPartSummary {
  median: number;
  p25: number;
  p75: number;
  offers: number;
  sellers: number;
}

export function summarizePart(prices: readonly number[], sellers: readonly string[]): CarPartSummary | null {
  const usable = prices.filter(price => Number.isFinite(price) && price > 0);
  if (usable.length < PART_MIN_OFFERS) return null;
  return {
    median: Math.round(quantile(usable, 0.5)),
    p25: Math.round(quantile(usable, 0.25)),
    p75: Math.round(quantile(usable, 0.75)),
    offers: usable.length,
    sellers: new Set(sellers).size,
  };
}

/** Lo que el relevamiento guarda por modelo (APP DB `carpartsprices`, privada). */
export interface CarPartsRecord {
  marketSlug: string;
  brand: string;
  model: string;
  readAt: string;
  parts: Array<{ key: PublicCarPartKey } & CarPartSummary>;
}

const ORDER = new Map(CAR_PARTS.map((part, index) => [part.key, index]));
const byOrder = <T extends { key: PublicCarPartKey }>(a: T, b: T): number => (ORDER.get(a.key) ?? 0) - (ORDER.get(b.key) ?? 0);

export function partsIndex(records: readonly CarPartsRecord[]): { baseline: PublicCarPartPrice[]; byModel: Map<string, PublicCarAdvisorParts> } {
  const medians = new Map<PublicCarPartKey, number[]>();
  const offers = new Map<PublicCarPartKey, number>();
  for (const record of records) {
    for (const part of record.parts) {
      medians.set(part.key, [...(medians.get(part.key) ?? []), part.median]);
      offers.set(part.key, (offers.get(part.key) ?? 0) + part.offers);
    }
  }
  const baseline: PublicCarPartPrice[] = [...medians.entries()]
    .filter(([, values]) => values.length >= PART_BASELINE_MIN_MODELS)
    .map(([key, values]) => ({ key, median: Math.round(quantile(values, 0.5)), offers: offers.get(key) ?? 0 }))
    .sort(byOrder);
  const base = new Map(baseline.map(item => [item.key, item.median]));

  const byModel = new Map<string, PublicCarAdvisorParts>();
  for (const record of records) {
    const ratios = record.parts
      .filter(part => (base.get(part.key) ?? 0) > 0)
      .map(part => part.median / base.get(part.key)!);
    const index = ratios.length >= PART_INDEX_MIN_PARTS
      ? Math.round(Math.exp(ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length) * 1000) / 1000
      : null;
    byModel.set(record.marketSlug, {
      readAt: record.readAt,
      index,
      offers: record.parts.reduce((sum, part) => sum + part.offers, 0),
      parts: record.parts.map(part => ({ key: part.key, median: part.median, offers: part.offers })).sort(byOrder),
    });
  }
  return { baseline, byModel };
}
