// Is this trend about money?
//
// Deterministic on purpose. The trending list for Uruguay is mostly football and TV, and the whole
// value of the page is separating the handful of rows that touch somebody's pocket from the noise.
// A keyword table does that predictably, is testable, costs nothing per run, and — unlike an LLM
// call — can never invent a category or drift between runs.
//
// The cost of that choice is real and is stated on the page: the classifier reads the TERM, not the
// story behind it. "salario" is money; a politician's surname on the day they announce a tax rise
// is not, and we do not pretend otherwise.

import type { MoneyVerdict } from "./types";

/**
 * Terms that make a trend money-related on their own.
 *
 * Kept lowercase and accent-free; {@link normalizeForMatch} strips accents off the haystack before
 * comparing, so "dólar" and "dolar" both hit `dolar`.
 */
export const MONEY_KEYWORDS: readonly string[] = Object.freeze([
  // Currency and prices
  "dolar",
  "euro",
  "real brasileno",
  "peso argentino",
  "cotizacion",
  "tipo de cambio",
  "casa de cambio",
  "casas de cambio",
  "inflacion",
  "ipc",
  "precios",
  "aumento",
  "tarifa",
  "tarifas",
  "canasta",
  "supermercado",
  "nafta",
  "combustible",
  "ancap",
  "ute",
  "antel",
  "ose",
  // Work and income
  "salario",
  "sueldo",
  "aguinaldo",
  "despido",
  "seguro de paro",
  "paro general",
  "conflicto sindical",
  "consejo de salarios",
  "jubilacion",
  "jubilaciones",
  "pension",
  "bps",
  "afap",
  // Tax and state
  "irpf",
  "iva",
  "imesi",
  "dgi",
  "impuesto",
  "impuestos",
  "rendicion de cuentas",
  "presupuesto",
  "aduana",
  "franquicia",
  "courier",
  // Banking and credit
  "brou",
  "itau",
  "santander",
  "scotiabank",
  "bbva",
  "prex",
  "mercado pago",
  "oca",
  "creditos",
  "credito",
  "prestamo",
  "prestamos",
  "tarjeta",
  "deuda",
  "clearing",
  "plazo fijo",
  "bcu",
  "banco central",
  "cuenta bancaria",
  "caja de ahorro",
  // Housing and big purchases
  "alquiler",
  "alquileres",
  "hipoteca",
  "inmobiliaria",
  "patente",
  "sucive",
  // Investing
  "inversion",
  "inversiones",
  "bitcoin",
  "criptomoneda",
  "criptomonedas",
  "acciones",
  "bolsa",
  // English. r/AskUruguayan is half tourists and expats, and the single most relevant thread of
  // the week measured on 2026-08-18 — "I have a collection of foreign currencies. What can I buy
  // with this in Uruguay?", 97 comments — was invisible to a Spanish-only table.
  "exchange rate",
  "exchange money",
  "currency",
  "currencies",
  "dollars",
  "salary",
  "wage",
  "rent",
  "mortgage",
  "taxes",
  "cost of living",
  "bank account",
  "invest",
  "investing",
  "investment",
]);

/**
 * Terms that only SUGGEST money and are wrong often enough that the page must not present them as
 * certain: they get "maybe" and are shown in their own, clearly-labelled group.
 */
export const MAYBE_KEYWORDS: readonly string[] = Object.freeze([
  // Ambiguous on their own: "cambio" is also a haircut, "paro" is also the verb, and
  // "banco" is also the one in the plaza. They suggest money; they do not prove it.
  "cambio",
  "trabajo",
  "empleo",
  "banco",
  "bancos",
  "precio",
  "economia",
  "mef",
  "ministerio de economia",
  "oddone",
  "temu",
  "shein",
  "aliexpress",
  "mercadolibre",
  "amazon",
  "tienda inglesa",
  "devoto",
  "black friday",
  "cyber monday",
  "descuento",
  "descuentos",
  "beneficio",
  "beneficios",
  "cinco de oro",
  "quiniela",
  "loteria",
  "tesla",
  "auto electrico",
  "importar",
]);

/** Lowercase, strip accents, collapse whitespace. */
export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Does `haystack` contain `keyword` as a whole word (or whole phrase)?
 *
 * Substring matching is what makes keyword classifiers embarrassing: without the boundary check,
 * "cambio" matches "recambio", "paro" matches "disparo", and "iva" matches "Bolivia". Both sides are
 * normalized before this runs.
 */
function containsWord(haystack: string, keyword: string): boolean {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(keyword, from);
    if (at === -1) return false;
    const before = at === 0 ? " " : haystack[at - 1];
    const afterAt = at + keyword.length;
    const after = afterAt >= haystack.length ? " " : haystack[afterAt];
    if (!/[a-z0-9]/.test(before ?? " ") && !/[a-z0-9]/.test(after ?? " ")) return true;
    from = at + 1;
  }
}

export interface MoneyClassification {
  money: MoneyVerdict;
  matchedOn: string[];
}

/**
 * Classify one trend from its text.
 *
 * Pass everything you have (term plus its headlines): a bare surname says nothing, while the
 * headline attached to it often does. A hit on any MONEY keyword wins outright; MAYBE only decides
 * when no MONEY keyword matched.
 */
export function classifyMoney(...parts: Array<string | null | undefined>): MoneyClassification {
  const haystack = normalizeForMatch(parts.filter(Boolean).join(" · "));
  if (!haystack) return { money: "no", matchedOn: [] };

  const strong = MONEY_KEYWORDS.filter(k => containsWord(haystack, k));
  if (strong.length > 0) return { money: "money", matchedOn: strong };

  const weak = MAYBE_KEYWORDS.filter(k => containsWord(haystack, k));
  if (weak.length > 0) return { money: "maybe", matchedOn: weak };

  return { money: "no", matchedOn: [] };
}
