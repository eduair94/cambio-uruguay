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
// "v5", "c3", "x1", "i30": short names with a digit belong to several brands (FAW V5, Brilliance V5).
const needsBrand = (name: string): boolean =>
  NEEDS_BRAND.has(name) || /^\d+$/.test(name.replace(/ /g, "")) || (name.length <= 3 && /\d/.test(name));

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
      if (!brandKnown && needsBrand(name)) continue;
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

// The odometer as sellers write it, in a title or a description. Measured 2026-11-25 against the km
// field of the 11.015 Mercado Libre adverts whose description also mentions kilometres: the old reader
// (first "N km" in the text) agreed with the field 85 % of the time, because a description is full of
// other kilometres. "Año 2015 km 118.000" gave 2015 (the year, glued to the label of the next number);
// "consumo 20 km/l", "0 a 100 km/h", "autonomía 450 km", "garantía 20.000 km", "service cada 10.000
// km", "Ruta 8 km 24.500" (a dealer's address) and "ficha oficial desde 0km" all came before the car's
// own figure. It also missed what sellers write most on Marketplace: the label first ("Km: 219.000",
// "kms 160.000", "Kilometraje: 136901"), "kmts", "145mil", "152xxx km" and a number glued to a comma
// list ("2014,139697km"). Every candidate now has to survive its context, and two that disagree are
// settled at the end of `kmFromText` or leave the km unknown. Same 2026-11-25 measurement, 10.489
// descriptions read: 97,5 % agree with the field, 0,6 % miss it by more than 43 % (most of the rest is
// the field and the text giving close figures). Every rule below has a real advert behind it, in
// tests/autos/match.test.ts.
const KM_UNIT = "(?:kms?|kmts?|kilometros?|kilometraje)";
const KM_LABEL = "(?:kms?|kmts?|kilometros?|kilometraje|recorrido)";
/** 118.000 | 130,000 | 112.700 mil | 16 mil | 145mil | 138. mil | 116k | 152xxx | 194.xxx | 240 *** | 85000. */
const KM_MIL = "mil(?=k|[^a-z]|$)";
const KM_NUMBER = `(\\d{1,3}(?:[.,]{1,2}\\d{3})+(?:\\s*${KM_MIL})?|\\d{1,3}(?:[.,]\\d)?\\s*\\.?\\s*${KM_MIL}|\\d{1,3}\\s?[.,]?\\s?(?:xxx|\\*\\*\\*)|\\d{1,3}k(?![a-z])|\\d{1,7})(?!\\d)`;
const KM_APPROX = "(?:aprox\\w*\\.?\\s*)?";
const KM_YEAR = "(?:19[5-9]\\d|20[0-4]\\d)(?!\\d|[.,]\\d)";
/**
 * "N km" followed by another number is a label: "año 2015 km 118.000", "2019 km aprox: 80.000". Not
 * when that number is something else: a year ("122 mil km 2018"), a price ("94000km 8500 dólares"),
 * another figure with its own unit ("35mil km 370hp", "10.800 km 380 km de autonomía", "8300 km. 100%
 * híbrida"), a phone number.
 */
const KM_LABELS_NEXT = `(?!\\s*${KM_APPROX}[:=.]?\\s*(?!${KM_YEAR})(?:\\d{1,3}[.,]\\d{3}|[1-9]\\d{2,6}|\\d{1,3}\\s*${KM_MIL})(?![a-z%\\d])(?!\\s*(?:kms?|kmts?|kilometros?|cv|hp|cc|kw|dolares|usd|u\\$|us\\$|pesos|\\$|%|anos|puertas)(?![a-z])))`;
const KM_AFTER_UNIT = new RegExp(`(?<!\\d)(?<!\\d[.,])${KM_NUMBER}\\s*(?:\\.?-|\\.)?\\s*${KM_UNIT}(?![a-z])${KM_LABELS_NEXT}`, "g");
// The number a label names is not the start of a word ("km. 330i coupé", "2.0t") nor another unit
// ("km. 190 cv", "km 2 dueños").
const KM_BEFORE_NUMBER = new RegExp(
  `(?<![a-z\\d])${KM_LABEL}(?![a-z])\\s*${KM_APPROX}(?:[:=.\\-]\\s*)?(?:de\\s+)?${KM_NUMBER}(?![a-z])(?!\\s*(?:cv|hp|cc|kw|lts?|litros|puertas|plazas|pasajeros|duen|anos|velocidades|marchas|%|usd|u\\$|dolares|pesos|cuotas)\\b)`,
  "g",
);
/**
 * Kilometres that are not the car's: consumption, speed, a range ("400 km de autonomía", but not the
 * odometer in "25.000 km autonomía 400 km"), a distance per charge, the next service, a warranty.
 */
const KM_NOT_ODOMETER_AFTER = /^\s*(?:\/\s*(?:l|h|lt|litro|hora|kwh|carga)|x\s*l|p\/?l|por\s*(?:l\b|lt|litro|hora|carga)|con\s*(?:un|1)\s*l|al\s*l|(?:de\s*)?aut\w{0,3}omia(?!\s*[:=]?\s*(?:de\s*)?(?:hasta\s*)?\d)|nedc|wltp|cltc|epa\b|de\s*rango|con\s*una\s*carga|hasta\s*(?:el|la)\s*proxim|para\s*(?:el|la)\s*(?:cambio|proxim|service)|de\s*garantia|desde\s*(?:que|el|la|su)\b)/;
/**
 * Earlier in the clause, with no other number in between: "garantía de … 100.000 km", "autonomía:
 * hasta 480 km", "comprado en Car One con 95.000 km", "el próximo es en 9500 km", "revisión gratuita
 * entre los 3.000 y 5.000 km". A number in between means the word was about that one: "en garantía
 * hasta agosto 2027 con casi 28.000 km", "comprada con 14000km actualmente 119000km".
 */
const KM_NOT_ODOMETER_CLAUSE = /(?:\b(?:aut\w{0,3}omia|hasta|compr(?:e|o|ado|ada|amos)|adquiri\w*|seminuevo|proxim[oa]s?|revision(?:es)?)|(?<!\ben\s)\bgarantia)\b[^\d]{0,32}$/;
/**
 * A part's kilometres, in the same clause, with anything in between ("4 cubiertas bridgestone
 * (japonesas) con 15mil km", "cubiertas dunlop 185/60/14 con 5000 km", "embrague, tren delantero y
 * trasero con 20 mil km"). Only under 70.000: no tyre or clutch reaches it, while "4 cubiertas nuevas y
 * está con 206000 km" is the car.
 */
const KM_PART_CLAUSE = /\b(?:cubiertas?|neumaticos?|llantas|embrague|tren delantero|amortiguad\w*|distribucion|correas?|bateria|frenos|pastillas|filtros|bujias|forjado|rectificad[oa]|motor (?:hecho|nuevo|a nuevo))\b.*\b(?:con|tiene|tienen|de)\s+(?:solo\s+|apenas\s+|unos\s+|casi\s+|menos\s+de\s+)?\(?$/;
const KM_PART_MAX = 70_000;
/**
 * A dealer's address names the label: "Ruta 8 km 24.500", "Av. Giannattasio km 19.600" (also
 * misspelt), "Interbalnearia km 36", "te esperamos en … km 22500". Read across a full stop, because
 * "av." ends one.
 */
const KM_ADDRESS = /(?:\b(?:ruta|av|avda|avenida|g[iy]an+a?t+asio|interbalnearia|camino|rambla|bv|bulevar)\b|\b(?:esperamos|estamos|encontramos|ubicad[oa]s?|ubicacion|direccion|locale?s?)\b[^\d]{0,12}\ben\b)[^\d]{0,28}(?:\d{1,3}\s*)?[^\d]{0,4}$/;
/**
 * Right before the number: "cada", "hasta", "hace", "a los", "desde los", "en los últimos", "service
 * de", "le hice 60mil km", "o 160.000 km" and "5 años / 150.000 km" (a warranty's other limit), "l/100
 * km", "año: 2019", "motor: 1.300" (the engine), "entre 3.000 y 5.000 km" (a range).
 */
const KM_NOT_ODOMETER_RIGHT_BEFORE = /(?:\b(?:hasta|cada|hace|a|o|desde|dentro|entre|menos|maximo|minimo|ultim[oa]s?|proxim[oa]s?|services?|servicios?|tenia|vendio|bajan?|hice|hizo|hicimos|hicieron|correa|distribucion|embrague)(?:\s+(?:de|los|las|el|la|con|en|unos|unas|completo|realizado|solo|apenas|casi|aprox\w*|primeros))*\s*~?|\bl(?:ts?|itros?)?\s*\/|\b(?:anos?|meses)\s*(?:\/|y)|\b\d{1,3}(?:[.,]\d{3})?\s+(?:y|a|al)\s+)\s*$/;
/** A year is not a km, even after a label: "101.689km - 2016", "40mil km 2019". */
const KM_LOOKS_LIKE_A_YEAR = /^(?:19[5-9]\d|20[0-4]\d)$/;
/** The seller's own figure: "… reales", "… de uso", "tiene …", "con solo …", "km: …". */
const KM_STATED_AFTER = /^\s*(?:reales|originales|de\s*uso|recorridos|comprobables|exactos|actuales|de\s*fabrica)/;
const KM_STATED_BEFORE = /\b(?:con|tiene|solo|apenas|unicamente|actualmente|marca)\s*(?:solo|apenas)?\s*$/;
const KM_CLAUSE_END = /[;!?•|\n*✅]|\.(?!\d)|\s[-–—]\s/g;

function kmValue(raw: string): number {
  const text = raw.trim();
  const approximate = /^(\d{1,3})\s?[.,]?\s?(?:xxx|\*\*\*|k)$/.exec(text);
  if (approximate) return Number(approximate[1]) * 1000;
  const thousand = /^(\d{1,3}(?:[.,]\d)?)\s*\.?\s*mil$/.exec(text);
  if (thousand) return Math.round(Number(thousand[1]!.replace(",", ".")) * 1000);
  // "120..000" is a typo of one separator.
  return plainNumber(text.replace(/\s*mil$/, "").replace(/([.,])[.,](?=\d{3})/g, "$1"));
}

function clauseBefore(folded: string, index: number): string {
  const window = folded.slice(Math.max(0, index - 60), index);
  let start = 0;
  for (const end of window.matchAll(KM_CLAUSE_END)) start = end.index! + end[0].length;
  return window.slice(start);
}

/**
 * `minKm`: under 1.000 is never published as a used car's km (`kmQuality`), and as a candidate it is
 * mostly something else ("l/100 km", "172 km" for 172.000, a typo, a 0 km). Motorbikes do have real
 * figures down there ("Sherco 300 My 2026, 11 km"), so `classes/motos` asks for 2 and up.
 */
export function kmFromText(text: string, options: { minKm?: number } = {}): number | null {
  const minKm = options.minKm ?? 1_000;
  // A comma or dot next to four or more digits is never a thousands separator: "2014,139697km" is a
  // year and a km in a comma list, not one number. Facebook also encodes spaces as "+".
  const folded = fold(text)
    .replace(/\+/g, " ")
    .replace(/(\d{4,})([.,])(?=\d)/g, "$1$2 ")
    .replace(/(\d)([.,])(?=\d{4,})/g, "$1$2 ");
  const candidates: Array<{ index: number; km: number; labelled: boolean; stated: boolean }> = [];
  const consider = (match: RegExpMatchArray, labelled: boolean): void => {
    const km = kmValue(match[1]!);
    if (!(km >= minKm) || KM_LOOKS_LIKE_A_YEAR.test(match[1]!.trim())) return;
    const before = clauseBefore(folded, match.index!);
    // The words right before are read across a line break ("realizado a los\n147.000km"), never across
    // a bullet or an emoji.
    const rightBefore = folded.slice(Math.max(0, match.index! - 40), match.index!);
    const after = folded.slice(match.index! + match[0].length, match.index! + match[0].length + 24);
    if (KM_NOT_ODOMETER_AFTER.test(after) || KM_NOT_ODOMETER_CLAUSE.test(before) || KM_NOT_ODOMETER_RIGHT_BEFORE.test(rightBefore)) return;
    if (km < KM_PART_MAX && KM_PART_CLAUSE.test(before)) return;
    // "Motor: 1.300" is the engine; "motor 170 mil km" is not.
    if (km < 10_000 && /\bmotor\s*:?\s*$/.test(rightBefore)) return;
    if (labelled && KM_ADDRESS.test(rightBefore)) return;
    candidates.push({
      index: match.index!, km, labelled,
      stated: labelled || KM_STATED_AFTER.test(after) || KM_STATED_BEFORE.test(before),
    });
  };
  for (const match of folded.matchAll(KM_AFTER_UNIT)) consider(match, false);
  for (const match of folded.matchAll(KM_BEFORE_NUMBER)) consider(match, true);
  candidates.sort((a, b) => a.index - b.index);
  // Within 5 % is the same car told twice: a title of "75000 km" and a description of "77.000 km".
  const distinct = (rows: typeof candidates): number[] =>
    rows.map(row => row.km).filter((km, index, all) => all.findIndex(other => Math.abs(other - km) <= Math.max(km, other) * 0.05) === index);
  const all = distinct(candidates);
  if (all.length === 1) return all[0]!;
  // Two figures: the labelled one ("Kilometraje: 64.000" over "cubiertas … con solo 3.000 km de uso"),
  // else one three times the next (the car's own beside a part's: "183.000 km | … filtros y bujías con
  // apenas 2.000 km de uso"), else the one stated as the car's. Two of a kind are two cars, or a guess.
  const labelled = distinct(candidates.filter(row => row.labelled));
  if (labelled.length === 1) return labelled[0]!;
  const [largest, next] = [...all].sort((a, b) => b - a);
  if (largest! >= next! * 3) return largest!;
  const stated = distinct(candidates.filter(row => row.stated));
  return stated.length === 1 ? stated[0]! : null;
}

// "U$U" es una forma uruguaya de escribir dólares, y es una trampa: en "u$u6990" el marcador "u$s"
// no engancha en la posición 0, el motor avanza una letra y ahí "$u" —que es el marcador de PESOS—
// matchea el medio de la palabra. Medido el 2026-09-21: un Chevrolet Spark 2008 cuya descripción
// decía "Precio contado U$U6990 (bonificado)" se publicó a $ 6.990, o sea US$ 169. Por eso "u$u" va
// PRIMERO en toda alternancia, para ganar en la posición 0, y el "$u" de pesos exige que no venga
// una letra pegada adelante.
const USD_MARKER = /(u\$u|u\$s|us\$|u\$d|\busd\b|\bdolares?\b)/;
const UYU_MARKER = /((?<![a-z])\$u\b|\buyu\b|\bpesos?\b)/;

export function declaredCurrencyOf(text: string): CarCurrency | null {
  const folded = fold(text);
  const usd = USD_MARKER.test(folded);
  const uyu = UYU_MARKER.test(folded);
  return usd === uyu ? null : usd ? "USD" : "UYU";
}

const currencyOfMarker = (marker: string): CarCurrency => (/^(u\$u|u\$s|us\$|u\$d|usd|dolar)/.test(marker) ? "USD" : "UYU");

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
  const before = new RegExp(`(u\\$u|u\\$s|us\\$|u\\$d|\\busd|(?<![a-z])\\$u|\\buyu)\\s*${number}`, "g");
  const after = new RegExp(`${number}\\s*(dolares?|usd|u\\$u|u\\$s|pesos?|uyu)\\b`, "g");
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
  // A source that names a brand the dictionary does not know must not borrow another brand's model.
  if (hints.brand && slugify(hints.brand) && !brand) return null;
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
