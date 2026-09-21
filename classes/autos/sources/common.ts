// Shared plumbing of the web sources (dealer websites and portals other than ML and Facebook):
// honest bot fetches, HTML text, money, and the one place a structured advert becomes a car.
import { fetchJson, fetchText } from "../../rentals/net";
import type { CarDictionary } from "../catalog/dictionary";
import { kmFromText, matchCar, yearFromText } from "../catalog/match";
import { AUTOS_USER_AGENT } from "../detail";
import { descriptionFlags, fold, slugify } from "../normalize";
import type { CarCurrency, CarDetail, CarFuel, CarSellerType, CarSource, CarSourceResult, CarTransmission, RawCarListing } from "../types";
import { proxiedFetch, sourceUsesProxy } from "./proxy";
import { CAR_SOURCES } from "./registry";

export interface WebCarContext {
  observedAt: string;
  maxYear: number;
  dictionary: CarDictionary;
}

export interface Fetched<T> {
  body: T | null;
  /** "HTTP 400", "tiempo agotado (30000 ms)"… — a status or an error code, never a host name. */
  failure: string | null;
}

const autosHeaders = { "user-agent": AUTOS_USER_AGENT };

export async function autosFetchText(url: string, timeoutMs = 30_000, source?: CarSource): Promise<Fetched<string>> {
  if (source && sourceUsesProxy(source)) return proxiedFetch<string>(url, "text", timeoutMs);
  let failure: string | null = null;
  const body = await fetchText(url, { timeoutMs, headers: autosHeaders, onFailure: reason => { failure = reason; } });
  return { body, failure: body === null ? failure ?? "sin respuesta" : null };
}

export async function autosFetchJson<T>(url: string, timeoutMs = 30_000, source?: CarSource): Promise<Fetched<T>> {
  if (source && sourceUsesProxy(source)) return proxiedFetch<T>(url, "json", timeoutMs);
  let failure: string | null = null;
  const body = await fetchJson<T>(url, {
    timeoutMs, headers: { ...autosHeaders, accept: "application/json" }, onFailure: reason => { failure = reason; },
  });
  return { body, failure: body === null ? failure ?? "sin respuesta" : null };
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ordm: "º", deg: "°", ndash: "–", mdash: "—", hellip: "…",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó",
  Uacute: "Ú", ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü",
};
const ENTITY_NAMES = Object.keys(ENTITIES).sort((a, b) => b.length - a.length);

/** Named entities are also decoded without their ";" — Car One writes "A&ntildeo". */
export function decodeEntities(text: string): string {
  return String(text || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    if (ENTITIES[name] !== undefined) return ENTITIES[name]!;
    const prefix = ENTITY_NAMES.find(entity => name.startsWith(entity));
    return prefix ? `${ENTITIES[prefix]}${name.slice(prefix.length)}` : whole;
  });
}

export function htmlText(html: string): string {
  return decodeEntities(String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** "U$S 15,000" | "US$ 11.990" | "USD 54.890,00" | "$U 450.000" | "$ 450.000" (pesos). */
export function moneyOf(text: string): { amount: number; currency: CarCurrency } | null {
  const folded = fold(text);
  // "u$u" primero y antes del "$u" de pesos: ver el comentario de los marcadores en catalog/match.ts.
  const currency: CarCurrency | null = /(u\$u|u\$s|us\$|u\$d|usd|dolar)/.test(folded) ? "USD" : /((?<![a-z])\$u|uyu|peso|\$)/.test(folded) ? "UYU" : null;
  const number = /\d[\d.,]*/.exec(folded);
  if (!currency || !number) return null;
  let raw = number[0].replace(/[.,]$/, "");
  const decimals = /^(.*\d)[.,](\d{1,2})$/.exec(raw);
  if (decimals && (/[.,]\d{3}/.test(decimals[1]!) || !/[.,]/.test(decimals[1]!))) raw = decimals[1]!;
  const amount = Number(raw.replace(/[.,]/g, ""));
  return amount > 0 ? { amount, currency } : null;
}

export function titleCase(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s-])(\p{L})/gu, (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);
}

export interface WebCarInput {
  source: CarSource;
  id: string;
  title: string;
  /** Version/engine words the site gives outside its title. */
  specText: string;
  permalink: string;
  picture: string | null;
  price: number;
  currency: CarCurrency;
  brand: string | null;
  model: string | null;
  year: number | null;
  km: number | null;
  transmission: CarTransmission | null;
  fuel: CarFuel | null;
  sellerType: CarSellerType;
  sellerId: string;
  dealerName: string | null;
  department: string | null;
  description: string;
  /** The site's own vehicle type ("Sedán", "Camión"), when it has one. */
  category?: string | null;
  context: WebCarContext;
}

/** Trucks, motorbikes and the like share some sites with cars; the directory is cars and pickups. */
export const NOT_A_CAR = /\b(camion|camiones|moto|motos|motocicletas?|scooter|cuatriciclos?|tractor(?:es)?|omnibus|microbus|lancha|casa rodante|motorhome)\b/;

/**
 * Un REPUESTO publicado en la categoría de autos ("Techo De Chevrolet S10 Doble Cabina Nuevo
 * Original", "Butacas Fiat 147"). Sólo cuenta cuando la pieza es el SUJETO del título, o sea que lo
 * abre: buscar la palabra en cualquier posición es inservible y está medido: de 19.026 títulos, 556
 * contienen "techo", "turbo", "cuero" o "volante", y los más caros son un Jeep Wrangler, un Porsche
 * Macan y un Kia Carnival — ahí esas palabras son equipamiento, no lo que se vende. Anclado al
 * principio son 2 títulos y los 2 son repuestos.
 *
 * "Motor" NO está en la lista, a propósito: "Motor Echo Ase 2 Años Libreta Títulos Tiene Deuda" es un
 * Toyota Echo con el motor rehecho, con libreta y con deuda — un auto, no un motor.
 */
export const IS_A_PART = /^(butacas?|asientos?|techo|capot|paragolpes?|parachoques?|guardabarros?|tapizados?|llantas?|cubiertas?|parabrisas|opticas?|far(?:o|ol)(?:es)?|alternador|radiador|inyector(?:es)?|culata|embrague|amortiguador(?:es)?|caja de cambios?|tren delantero|diferencial|bomba|tablero|paragolpe)\b/;

// A model name of digits only is a real one ("155", "190", "147") unless it reads as a year: sites do
// put the year in the model field, and "CAMIÓN KIA" once reached the directory as a "2004".
const plausibleModel = (model: string, maxYear: number): boolean => {
  if (!model || model.length > 30 || /[,;:]/.test(model)) return false;
  if (/[a-z]/i.test(model)) return true;
  const number = Number(model);
  return Number.isInteger(number) && number > 0 && !(number >= 1950 && number <= maxYear + 1);
};

export function buildWebCar(input: WebCarInput): { listing: RawCarListing; detail: CarDetail } | null {
  const { context } = input;
  if (NOT_A_CAR.test(fold(`${input.title} ${input.category ?? ""}`))) return null;
  const text = `${input.title} ${input.specText}`.trim();
  const match = matchCar(text, context.dictionary, { brand: input.brand, model: input.model, year: input.year, km: input.km }, context.maxYear);
  let identity: Pick<RawCarListing, "brandId" | "brand" | "modelId" | "model">;
  let year: number | null;
  let km: number | null;
  if (match) {
    identity = { brandId: match.brandId, brand: match.brand, modelId: match.modelId, model: match.model };
    year = match.year;
    km = match.km;
  } else if (input.brand && input.model && slugify(input.brand) && plausibleModel(input.model, context.maxYear)) {
    // A car the ML dictionary does not know is still listed, but never joins an ML cohort.
    identity = {
      brandId: `x-${slugify(input.brand)}`, brand: titleCase(input.brand),
      modelId: `x-${slugify(input.model)}`, model: titleCase(input.model),
    };
    year = input.year ?? yearFromText(text, context.maxYear);
    km = input.km ?? kmFromText(text);
  } else {
    return null;
  }
  if (!year || !(input.price > 0)) return null;
  // Dealer sites mix 0 km stock in; the directory is used cars only.
  if (match?.isNew || km === 0 || (km !== null && km < 1_000 && year >= context.maxYear - 1)) return null;
  const transmission = input.transmission ?? match?.transmission ?? null;
  const fuel = input.fuel ?? match?.fuel ?? null;
  const listing: RawCarListing = {
    id: input.id,
    source: input.source,
    ...identity,
    title: input.title.slice(0, 200),
    year,
    km,
    price: input.price,
    currency: input.currency,
    transmission,
    fuel,
    neighborhood: null,
    department: input.department,
    sellerType: input.sellerType,
    sellerId: `${input.source}:${input.sellerId}`,
    picture: input.picture,
    pictureCount: input.picture ? 1 : null,
    permalink: input.permalink,
    observedAt: context.observedAt,
    specText: input.specText || null,
    dealerName: input.dealerName,
    currencyInferred: false,
  };
  const detail: CarDetail = {
    readAt: context.observedAt,
    price: input.price,
    currency: input.currency,
    active: true,
    brand: identity.brand,
    model: identity.model,
    year,
    km,
    version: text,
    engineText: null,
    sellerName: input.dealerName,
    bodyType: null,
    color: null,
    doors: null,
    flags: descriptionFlags(`${input.title} ${input.description}`),
    description: input.description,
  };
  return { listing, detail };
}

export function sourceResult(source: CarSource, startedAt: string): CarSourceResult {
  return { source, ok: true, complete: true, listings: [], details: new Map(), requests: 0, note: null, startedAt, finishedAt: startedAt };
}

/** Adds a built car to a result, keyed like the stored document. */
export function addCar(result: CarSourceResult, car: { listing: RawCarListing; detail: CarDetail } | null): void {
  if (!car) return;
  if (result.listings.some(item => item.id === car.listing.id)) return;
  result.listings.push(car.listing);
  result.details.set(`${CAR_SOURCES[car.listing.source].prefix}-${car.listing.id}`, car.detail);
}
