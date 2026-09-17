// Free text (a Facebook title, a dealer's "NUEVO ONIX 1.0 JOY MT") → which car it is, in Mercado
// Libre ids. Conservative on purpose: an advert that cannot be named is left out, never guessed —
// "Vendo o permuto" is 1 of every 6 Facebook vehicle titles.
import { fold, fuelOf, slugify, transmissionOf, wordText } from "../normalize";
import type { CarCurrency, CarFuel, CarTransmission } from "../types";
import type { CarDictionary, CarDictionaryBrand, CarDictionaryModel } from "./dictionary";

export interface CarMatch {
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  year: number | null;
  km: number | null;
  transmission: CarTransmission | null;
  fuel: CarFuel | null;
  declaredCurrency: CarCurrency | null;
  isNew: boolean;
}

export interface CarMatchHints {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  km?: number | null;
}

// Model names that are also everyday Spanish words: without the brand in the same text they name
// nothing ("vendo uno de mis autos", "punto de venta").
const NEEDS_BRAND = new Set(["uno", "up", "ka", "punto", "idea", "city", "fit", "one", "move", "life", "sol", "linea", "classic", "master"]);

const has = (text: string, name: string): boolean => !!name && text.includes(` ${name} `);

function findBrand(text: string, dictionary: CarDictionary, hint: string | null | undefined): CarDictionaryBrand | null {
  if (hint) {
    const wanted = slugify(hint);
    const hinted = dictionary.brands.find(brand => brand.slug === wanted || brand.aliases.some(alias => slugify(alias) === wanted));
    if (hinted) return hinted;
  }
  let best: CarDictionaryBrand | null = null;
  let bestLength = 0;
  for (const brand of dictionary.brands) {
    for (const alias of brand.aliases) {
      if (alias.length > bestLength && has(text, alias)) {
        best = brand;
        bestLength = alias.length;
      }
    }
  }
  return best;
}

function findModel(text: string, models: readonly CarDictionaryModel[], brandKnown: boolean): { model: CarDictionaryModel; name: string } | null {
  // Titles name the model first and the version after ("Peugeot 208 1.2 Active"): the earliest
  // name wins, then the longest ("Corolla Cross" over "Corolla").
  let best: { model: CarDictionaryModel; name: string }[] = [];
  let bestIndex = Infinity;
  let bestLength = 0;
  for (const model of models) {
    for (const name of model.names) {
      if (!brandKnown && (/^\d+$/.test(name.replace(/ /g, "")) || NEEDS_BRAND.has(name))) continue;
      const index = name ? text.indexOf(` ${name} `) : -1;
      if (index < 0 || index > bestIndex || (index === bestIndex && name.length < bestLength)) continue;
      if (index < bestIndex || name.length > bestLength) {
        best = [];
        bestIndex = index;
        bestLength = name.length;
      }
      if (!best.some(hit => hit.model === model)) best.push({ model, name });
    }
  }
  // Two different models named by the same words at the same place: nothing says which one it is.
  return best.length === 1 ? best[0]! : null;
}

const YEAR_ANCHOR = /(?:ano|modelo|mod)\.?\s*$/;

export function yearFromText(text: string, maxYear: number): number | null {
  const folded = ` ${fold(text)} `;
  const pattern = /(^|[^\d.,])((?:19|20)\d{2})(?![\d])(?![.,]\d)(?!\s*(?:cc|km|kms|kilometros)\b)/g;
  const found: Array<{ year: number; anchored: boolean }> = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(folded))) {
    const year = Number(match[2]);
    if (year < 1950 || year > maxYear) continue;
    const start = match.index + match[1]!.length;
    found.push({ year, anchored: YEAR_ANCHOR.test(folded.slice(Math.max(0, start - 12), start)) });
  }
  const distinct = [...new Set(found.map(item => item.year))];
  if (distinct.length === 1) return distinct[0]!;
  if (distinct.length > 1) {
    const anchored = [...new Set(found.filter(item => item.anchored).map(item => item.year))];
    return anchored.length === 1 ? anchored[0]! : null;
  }
  const short = /\b(?:del|ano|mod|modelo)\.?\s*'?(\d{2})\b/.exec(folded);
  if (!short) return null;
  const twoDigits = Number(short[1]);
  return twoDigits <= maxYear % 100 ? 2000 + twoDigits : 1900 + twoDigits;
}

function plainNumber(raw: string): number {
  const text = raw.trim();
  const thousands = /^\d{1,3}(?:[.,]\d{3})+$/.test(text);
  return Number(thousands ? text.replace(/[.,]/g, "") : text.replace(",", "."));
}

export function kmFromText(text: string): number | null {
  const folded = fold(text);
  const candidates: Array<{ index: number; km: number }> = [];
  const thousand = /(\d{1,3}(?:[.,]\d)?)\s*mil\s*(?:km|kms|kilometros)\b/.exec(folded);
  if (thousand) candidates.push({ index: thousand.index, km: Math.round(Number(thousand[1]!.replace(",", ".")) * 1000) });
  const plain = /(^|[^\d.,])(\d{1,3}(?:[.,]\d{3})+|\d{1,7})\s*(?:km|kms|kilometros)\b/.exec(folded);
  if (plain) candidates.push({ index: plain.index + plain[1]!.length, km: plainNumber(plain[2]!) });
  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.index - b.index)[0]!.km;
}

const USD_MARKER = /(u\$s|us\$|u\$d|\busd\b|\bdolares?\b)/;
const UYU_MARKER = /(\$u\b|\buyu\b|\bpesos?\b)/;

export function declaredCurrencyOf(text: string): CarCurrency | null {
  const folded = fold(text);
  const usd = USD_MARKER.test(folded);
  const uyu = UYU_MARKER.test(folded);
  return usd === uyu ? null : usd ? "USD" : "UYU";
}

const currencyOfMarker = (marker: string): CarCurrency => (/^(u\$s|us\$|u\$d|usd|dolar)/.test(marker) ? "USD" : "UYU");

function amountOfPhrase(raw: string): number {
  const text = raw.trim();
  const thousand = /^(\d{1,3}(?:[.,]\d)?)\s*mil$/.exec(text);
  return thousand ? Math.round(Number(thousand[1]!.replace(",", ".")) * 1000) : plainNumber(text);
}

/** A currency marker glued to THIS amount ("U$S 4.000", "4 mil dólares"); "debe 52 mil pesos" says nothing about a 4,000 price. */
export function declaredCurrencyFor(text: string, amount: number): CarCurrency | null {
  const folded = fold(text);
  const found = new Set<CarCurrency>();
  const number = "(\\d[\\d.,]*\\d|\\d)(\\s*mil)?";
  const before = new RegExp(`(u\\$s|us\\$|u\\$d|\\busd|\\$u|\\buyu)\\s*${number}`, "g");
  const after = new RegExp(`${number}\\s*(dolares?|usd|u\\$s|pesos?|uyu)\\b`, "g");
  const near = (value: number): boolean => Number.isFinite(value) && Math.abs(value - amount) <= amount * 0.01;
  let match: RegExpExecArray | null;
  while ((match = before.exec(folded))) {
    if (near(amountOfPhrase(`${match[2]}${match[3] ?? ""}`))) found.add(currencyOfMarker(match[1]!));
  }
  while ((match = after.exec(folded))) {
    if (near(amountOfPhrase(`${match[1]}${match[2] ?? ""}`))) found.add(currencyOfMarker(match[3]!));
  }
  return found.size === 1 ? [...found][0]! : null;
}

/** Dealer version lines end in "MT"/"AT"; never used on free prose, where "at" means nothing. */
export function versionTransmission(text: string): CarTransmission | null {
  const folded = fold(text);
  if (/\b(mt|m\/t|manual)\b/.test(folded)) return "manual";
  if (/\b(at|a\/t|cvt|dsg|automatica|automatico|aut)\b/.test(folded)) return "automatica";
  return null;
}

/** "1600cc" | "1.6" | "1400" | "3,5" → "1.6" | "1.6" | "1.4" | "3.5". */
export function engineFromCc(value: string): string | null {
  const text = String(value || "").trim().toLowerCase().replace(",", ".");
  const litres = /^(\d)\.(\d)/.exec(text);
  if (litres) return `${litres[1]}.${litres[2]}`;
  const cc = /^(\d{3,4})\s*(?:cc)?$/.exec(text);
  if (!cc) return null;
  const value_ = Number(cc[1]);
  return value_ >= 600 && value_ <= 8_000 ? (Math.round(value_ / 100) / 10).toFixed(1) : null;
}

export function matchCar(text: string, dictionary: CarDictionary, hints: CarMatchHints, maxYear: number): CarMatch | null {
  const words = wordText(text);
  const brand = findBrand(words, dictionary, hints.brand);
  const candidates = brand ? dictionary.models.filter(model => model.brandId === brand.brandId) : dictionary.models;
  let hit: { model: CarDictionaryModel; name: string | null } | null = null;
  if (hints.model) {
    const wanted = slugify(hints.model);
    const exact = candidates.find(model => model.slug === wanted);
    const hinted = exact ? { model: exact, name: null } : findModel(wordText(hints.model.replace(/-/g, " ")), candidates, !!brand);
    if (hinted) hit = { model: hinted.model, name: null };
  }
  if (!hit) hit = findModel(words, candidates, !!brand);
  if (!hit) return null;
  const model = hit.model;
  const brandRow = brand ?? dictionary.brands.find(item => item.brandId === model.brandId);
  if (!brandRow) return null;
  // The model name itself ("Peugeot 2008") must not be read as a year.
  const withoutModel = hit.name ? words.replace(` ${hit.name} `, " ") : words;
  const folded = fold(text);
  const km = hints.km !== undefined && hints.km !== null ? hints.km : kmFromText(text);
  return {
    brandId: brandRow.brandId,
    brand: brandRow.brand,
    modelId: model.modelId,
    model: model.model,
    year: hints.year ?? yearFromText(withoutModel, maxYear),
    km,
    transmission: transmissionOf(text) ?? (/\b(dsg|tiptronic)\b/.test(folded) ? "automatica" : null),
    fuel: fuelOf(text),
    declaredCurrency: declaredCurrencyOf(text),
    isNew: km === 0 || /\b0 ?km\b/.test(folded),
  };
}
