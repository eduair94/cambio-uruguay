// El catálogo de MODELOS de monopatín: una fila por modelo con todas sus ofertas, sus bandas de precio
// y la ficha de consenso, para /monopatines-electricos-uruguay/<modelo> y la tabla de modelos del hub.
//
// Lo arma currency-movilidad-specs cada hora sobre los avisos frescos ya enriquecidos; la página sólo
// lo lee (regla del dueño desde el 19/9/2026: lo que procesa la base se precalcula).
//
// Las reglas que importan:
//   * la identidad es `identify.ts` (precisión sobre recall) y Facebook nunca entra;
//   * un modelo con un solo aviso no se publica: ese aviso ya tiene su propia página, la del vendedor;
//   * nuevo y usado tienen bandas separadas, nunca un promedio de los dos mercados;
//   * la ficha de consenso cuenta sólo lo que dice la ficha o la descripción (nunca el título, que se
//     escribe para vender), y cuando las fichas no coinciden lo dice (`spread`) en vez de elegir una;
//   * indexable = dos vendedores o más y al menos tres datos de ficha: con menos, la página no dice
//     nada que el aviso no diga, y se sirve con noindex.
import { identifyModel, unifyByCatalog, type ModelIdentity } from "./identify";
import type { BooleanSpecField, MonopatinSpecs, NumericSpecField, SpecField } from "../specs/types";

export const MODEL_OFFERS_MAX = 40;
export const MODEL_HISTORY_MAX = 400;
export const MODEL_MIN_LISTINGS = 2;
export const MODEL_INDEXABLE_SELLERS = 2;
export const MODEL_INDEXABLE_SPECS = 3;
/** Dos fichas "coinciden" si difieren menos que esto (redondeos: 25 y 25,5 km/h). */
const AGREE_TOLERANCE = 0.05;

/** Lo que el catálogo necesita de una fila de `movilidadlistings` ya enriquecida. */
export interface ModelRow {
  listingId: string;
  title: string;
  url: string;
  image: string | null;
  price: number;
  currency: "UYU" | "USD";
  priceUyu: number;
  condition: "new" | "used";
  source: "store" | "mercadolibre" | "facebook";
  sellerName: string;
  sellerKey: string;
  brand: string;
  brandKey: string;
  variant: string;
  suspect: boolean;
  specs: MonopatinSpecs | null;
  firstSeen?: string;
  observedAt: string;
  freeShipping?: boolean | null;
  officialStore?: boolean;
  /** El "Modelo" de la ficha leída (`movilidadspecs.model`). */
  fichaModel: string | null;
}

export interface ModelOffer {
  listingId: string;
  title: string;
  sellerName: string;
  sellerKey: string;
  url: string;
  price: number;
  currency: "UYU" | "USD";
  priceUyu: number;
  condition: "new" | "used";
  source: "store" | "mercadolibre";
  image: string | null;
  observedAt: string;
  freeShipping: boolean | null;
  officialStore: boolean;
}

export interface ModelBand {
  min: number;
  median: number;
  max: number;
  n: number;
  sellers: number;
}

export type ConsensusValues = Omit<MonopatinSpecs, "from">;

export interface ConsensusSpecs {
  values: ConsensusValues;
  /** Cuántas fichas dicen el valor publicado, de cuántas dicen algo de ese campo. */
  agree: Partial<Record<SpecField, { n: number; of: number }>>;
  /** El rango de lo que dicen las fichas, sólo cuando no dicen todas lo mismo. */
  spread: Partial<Record<NumericSpecField, { min: number; max: number }>>;
}

export interface ModelHistoryPoint {
  day: string;
  newMin: number;
  newMedian: number;
  n: number;
}

export interface MovilidadModelDoc {
  slug: string;
  name: string;
  brandKey: string;
  brandLabel: string;
  modelLabel: string;
  variant: string;
  image: string | null;
  offers: ModelOffer[];
  newBand: ModelBand | null;
  usedBand: ModelBand | null;
  specs: ConsensusSpecs;
  /** Avisos con algún dato de ficha o descripción. */
  fichas: number;
  listings: number;
  sellers: number;
  indexable: boolean;
  firstSeen: string;
  lastSeen: string;
  generatedAt: string;
  history: ModelHistoryPoint[];
}

const NUMERIC: readonly NumericSpecField[] = [
  "rangeKm",
  "maxSpeedKmh",
  "motorW",
  "motorPeakW",
  "batteryV",
  "batteryAh",
  "batteryWh",
  "chargeHours",
  "maxLoadKg",
  "weightKg",
  "wheelInches",
  "minAge",
];
const BOOLEAN: readonly BooleanSpecField[] = ["foldable", "suspension", "discBrake", "bluetooth"];
const TEXT = ["brakes", "ipRating"] as const;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};
const round1 = (value: number): number => Math.round(value * 10) / 10;
const declared = (specs: MonopatinSpecs | null, field: SpecField): boolean =>
  !!specs && (specs.from[field] === "ficha" || specs.from[field] === "descripcion");

function band(offers: ModelOffer[]): ModelBand | null {
  if (!offers.length) return null;
  const prices = offers.map((offer) => offer.priceUyu);
  return {
    min: Math.min(...prices),
    median: Math.round(median(prices)),
    max: Math.max(...prices),
    n: offers.length,
    sellers: new Set(offers.map((offer) => offer.sellerKey)).size,
  };
}

function consensus(rows: ModelRow[]): ConsensusSpecs {
  const values = {} as Record<string, unknown>;
  const agree: ConsensusSpecs["agree"] = {};
  const spread: ConsensusSpecs["spread"] = {};

  for (const field of NUMERIC) {
    const said = rows.filter((row) => declared(row.specs, field) && typeof row.specs![field] === "number");
    const numbers = said.map((row) => row.specs![field] as number);
    if (!numbers.length) {
      values[field] = null;
      continue;
    }
    // Nunca un promedio: 12 V y 48 V no hacen un monopatín de 30 V (medido en el Mistyle ME500, 4/11).
    // La moda si un valor se repite más que los demás; si no, la mediana baja, que es un valor que
    // alguna ficha declaró.
    const counts = new Map<number, number>();
    for (const n of numbers) counts.set(n, (counts.get(n) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const hasMode = ranked[0]![1] >= 2 && (ranked.length === 1 || ranked[0]![1] > ranked[1]![1]);
    const sorted = [...numbers].sort((a, b) => a - b);
    const value = round1(hasMode ? ranked[0]![0] : sorted[Math.floor((sorted.length - 1) / 2)]!);
    values[field] = value;
    agree[field] = {
      n: numbers.filter((n) => Math.abs(n - value) <= value * AGREE_TOLERANCE).length,
      of: numbers.length,
    };
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    if (min !== max) spread[field] = { min, max };
  }

  for (const field of BOOLEAN) {
    const said = rows.filter((row) => declared(row.specs, field) && typeof row.specs![field] === "boolean");
    const yes = said.filter((row) => row.specs![field] === true).length;
    const no = said.length - yes;
    // Empate: no se publica ni sí ni no.
    values[field] = yes === no ? null : yes > no;
    if (said.length) agree[field] = { n: Math.max(yes, no), of: said.length };
  }

  for (const field of TEXT) {
    const said = rows
      .filter((row) => declared(row.specs, field) && typeof row.specs![field] === "string")
      .map((row) => row.specs![field] as string);
    if (!said.length) {
      values[field] = null;
      continue;
    }
    const counts = new Map<string, number>();
    for (const text of said) counts.set(text, (counts.get(text) ?? 0) + 1);
    const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
    values[field] = best;
    agree[field] = { n: count, of: said.length };
  }

  return { values: values as unknown as ConsensusValues, agree, spread };
}

const toOffer = (row: ModelRow): ModelOffer => ({
  listingId: row.listingId,
  title: row.title,
  sellerName: row.sellerName,
  sellerKey: row.sellerKey,
  url: row.url,
  price: row.price,
  currency: row.currency,
  priceUyu: row.priceUyu,
  condition: row.condition,
  source: row.source as "store" | "mercadolibre",
  image: row.image,
  observedAt: row.observedAt,
  freeShipping: typeof row.freeShipping === "boolean" ? row.freeShipping : null,
  officialStore: Boolean(row.officialStore),
});

const mode = (values: string[]): string => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
};

export function buildModels(
  rows: ModelRow[],
  today: string,
  generatedAt: string
): { models: MovilidadModelDoc[]; slugByListing: Map<string, string> } {
  const identified = unifyByCatalog(
    rows
      .filter((row) => !row.suspect && row.source !== "facebook" && row.priceUyu > 0)
      .map((row) => ({
        ...row,
        identity: identifyModel({
          title: row.title,
          brand: row.brand || null,
          brandKey: row.brandKey || null,
          fichaModel: row.fichaModel,
          source: row.source,
        }),
      }))
  );

  const groups = new Map<string, { identity: ModelIdentity; rows: ModelRow[] }>();
  for (const row of identified) {
    if (!row.identity) continue;
    const group = groups.get(row.identity.key) ?? { identity: row.identity, rows: [] };
    group.rows.push(row);
    groups.set(row.identity.key, group);
  }

  const models: MovilidadModelDoc[] = [];
  const slugByListing = new Map<string, string>();
  for (const [slug, { identity, rows: members }] of groups) {
    if (members.length < MODEL_MIN_LISTINGS) continue;
    const offers = members.map(toOffer).sort((a, b) => a.priceUyu - b.priceUyu || a.listingId.localeCompare(b.listingId));
    const fresh = offers.filter((offer) => offer.condition === "new");
    const used = offers.filter((offer) => offer.condition === "used");
    const specs = consensus(members);
    const numericSpecs = NUMERIC.filter((field) => specs.values[field] !== null).length;
    const sellers = new Set(members.map((row) => row.sellerKey)).size;
    const image = [...fresh, ...used].find((offer) => offer.image)?.image ?? null;
    models.push({
      slug,
      name: `${identity.brandLabel} ${identity.label}`,
      brandKey: identity.brandKey,
      brandLabel: identity.brandLabel,
      modelLabel: identity.label,
      variant: mode(members.map((row) => row.variant)),
      image,
      offers: offers.slice(0, MODEL_OFFERS_MAX),
      newBand: band(fresh),
      usedBand: band(used),
      specs,
      fichas: members.filter((row) => row.specs && Object.values(row.specs.from).some((s) => s !== "titulo")).length,
      listings: members.length,
      sellers,
      indexable: sellers >= MODEL_INDEXABLE_SELLERS && numericSpecs >= MODEL_INDEXABLE_SPECS,
      firstSeen: members.map((row) => row.firstSeen ?? today).sort()[0]!,
      lastSeen: today,
      generatedAt,
      history: [],
    });
    for (const member of members) slugByListing.set(member.listingId, slug);
  }

  models.sort((a, b) => b.sellers - a.sellers || b.listings - a.listings || a.slug.localeCompare(b.slug));
  return { models, slugByListing };
}

/** La serie del modelo: un punto por día con el precio nuevo, el de hoy reemplazado, tope 400. */
export function mergeHistory(prev: ModelHistoryPoint[] | undefined, doc: MovilidadModelDoc): ModelHistoryPoint[] {
  const kept = (prev ?? []).filter((point) => point.day !== doc.lastSeen);
  if (doc.newBand) {
    kept.push({ day: doc.lastSeen, newMin: doc.newBand.min, newMedian: doc.newBand.median, n: doc.newBand.n });
  }
  kept.sort((a, b) => a.day.localeCompare(b.day));
  return kept.slice(-MODEL_HISTORY_MAX);
}

/** Una corrida que arma menos del 40 % de los modelos frescos guardados no los pisa. */
export function modelsRunIsThin(built: number, freshStored: number): boolean {
  return freshStored >= 5 && built < freshStored * 0.4;
}
