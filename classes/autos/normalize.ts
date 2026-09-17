// Pure parsing for Mercado Libre used-car cards. Every rule was measured on the 2,279-card sample
// of 2026-09-16 (see the spec): version-by-title agreed with ML's own facet 494 of 498 times, and
// 47 cards carried placeholder km such as 111.111.
import type { CarCurrency, CarFuel, CarKmQuality, CarSellerType, CarTextFlag, CarTransmission } from "./types";

export function fold(text: string): string {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function slugify(text: string): string {
  return fold(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** " word word " with dots kept ("1.0" survives), so whole-word matching is a plain includes(). */
export function wordText(text: string): string {
  return ` ${fold(text).replace(/[^a-z0-9.]+/g, " ").trim()} `;
}

const TURBO = /\b(turbo|tsi|tfsi|thp)\b/;

/** "1.0T", "1.6", "EV" (0.0 is how ML writes electric versions) or null. */
export function engineOf(title: string): string | null {
  const text = fold(title);
  const match = /(?:^|[^\d.])(\d\.\d)(?!\d)\s*(t\b|turbo\b|tsi\b|tfsi\b|thp\b)?/.exec(text);
  if (!match) return null;
  if (match[1] === "0.0") return "EV";
  return `${match[1]}${match[2] || TURBO.test(text) ? "T" : ""}`;
}

/** The model's SHORT_VERSION name found in the title. The longest wins only if it contains the rest. */
export function trimOf(title: string, vocabulary: readonly string[]): string | null {
  const text = wordText(title);
  const names = [...new Set(vocabulary.map(name => wordText(name).trim()).filter(Boolean))];
  const hits = names.filter(name => text.includes(` ${name} `)).sort((a, b) => b.length - a.length);
  if (!hits.length) return null;
  const [top, ...rest] = hits;
  return rest.every(hit => ` ${top} `.includes(` ${hit} `)) ? top! : null;
}

export function trimLabel(trim: string | null, vocabulary: readonly string[]): string | null {
  if (!trim) return null;
  return vocabulary.find(name => wordText(name).trim() === trim) ?? trim;
}

/** Placeholder km (1, 111, 111.111…) never enters a statistic. */
export function kmQuality(km: number | null): CarKmQuality {
  if (km === null || !Number.isFinite(km)) return "unknown";
  if (km < 1_000 || km > 1_000_000 || /^(\d)\1+$/.test(String(Math.round(km)))) return "placeholder";
  return "ok";
}

export function transmissionOf(label: string): CarTransmission | null {
  const text = fold(label);
  if (/\bmanual\b/.test(text)) return "manual";
  if (/automat|\bcvt\b|\bdht\b|secuencial/.test(text)) return "automatica";
  return null;
}

export function fuelOf(label: string): CarFuel | null {
  const text = fold(label);
  if (/hibrido/.test(text)) return "hibrido";
  if (/electrico/.test(text)) return "electrico";
  if (/\bgnc\b/.test(text)) return "gnc";
  if (/diesel/.test(text)) return "diesel";
  if (/nafta|gasolina/.test(text)) return "nafta";
  return null;
}

export function parsePrimaryAttribute(value: string, maxYear: number): { year: number | null; km: number | null } {
  const [yearText = "", kmText = ""] = String(value || "").split("|").map(part => part.trim());
  const year = /^\d{4}$/.test(yearText) && Number(yearText) >= 1950 && Number(yearText) <= maxYear ? Number(yearText) : null;
  const digits = kmText.replace(/[^\d]/g, "");
  return { year, km: digits && /km/i.test(kmText) ? Number(digits) : null };
}

const DEPARTMENT_CODES: Readonly<Record<string, string>> = {
  AR: "Artigas", CA: "Canelones", CL: "Cerro Largo", CO: "Colonia", DU: "Durazno", FS: "Flores", FL: "Florida",
  LA: "Lavalleja", MA: "Maldonado", MO: "Montevideo", PA: "Paysandú", RN: "Río Negro", RI: "Rivera", RO: "Rocha",
  SA: "Salto", SJ: "San José", SO: "Soriano", TA: "Tacuarembó", TT: "Treinta y Tres",
};
export const CAR_DEPARTMENTS: readonly string[] = Object.values(DEPARTMENT_CODES).sort((a, b) => a.localeCompare(b, "es"));

const departmentNamed = (name: string): string | null => CAR_DEPARTMENTS.find(d => fold(d) === fold(name.trim())) ?? null;

/** "Barrio, MO • Concesionaria" | "Barrio - Montevideo" | "Barrio, Montevideo". */
export function parseCarLocation(text: string): { neighborhood: string | null; department: string | null; sellerType: CarSellerType | null } {
  const clean = String(text || "").replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim();
  const [place = "", seller = ""] = clean.split("•").map(part => part.trim());
  const sellerType: CarSellerType | null = /concesionaria/i.test(seller) ? "dealer" : /particular|due[nñ]o/i.test(seller) ? "private" : null;
  let neighborhood: string | null = null;
  let department: string | null = null;
  const coded = /^(.*),\s*([A-Z]{2})$/.exec(place);
  const dashed = /^(.*?)\s+-\s+(.+)$/.exec(place);
  const comma = /^(.*),\s*(.+)$/.exec(place);
  if (coded) {
    neighborhood = coded[1]!.trim();
    department = DEPARTMENT_CODES[coded[2]!] ?? null;
  } else if (dashed && departmentNamed(dashed[2]!)) {
    neighborhood = dashed[1]!.trim();
    department = departmentNamed(dashed[2]!);
  } else if (comma && departmentNamed(comma[2]!)) {
    neighborhood = comma[1]!.trim();
    department = departmentNamed(comma[2]!);
  } else {
    department = departmentNamed(place);
  }
  if (!neighborhood || (department && fold(neighborhood) === fold(department))) neighborhood = null;
  return { neighborhood, department, sellerType };
}

const NEGATION = /\b(no|nunca|sin|jamas|cero|libre de|ni|tampoco)\s+(?:[a-z]+\s+){0,2}$/;

function affirmed(text: string, source: string): boolean {
  const pattern = new RegExp(source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const before = text.slice(Math.max(0, match.index - 40), match.index);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

// Plural/gender tolerant on purpose: `rueda\b` never matched "Ruedas" in the chair directory.
const DESCRIPTION_FLAGS: ReadonlyArray<[CarTextFlag, string]> = [
  ["damaged", "\\b(chocad[oa]s?|accidentad[oa]s?|a reparar|para reparar|a arreglar|para repuestos?|por partes|no arranca|siniestrad[oa]s?|incendiad[oa]s?|inundad[oa]s?|para desarme|(?:motor|caja) (?:fundid[oa]|rot[oa]|trancad[oa]|a reparar))\\b"],
  ["recovered", "\\b(recuperad[oa]s? (?:de|por|del) (?:robo|hurto|seguro|aseguradora)|de aseguradora|ex seguro)\\b"],
  ["paperwork", "\\b(sin (?:papeles|titulo|libreta|documentos)|con deudas?|tiene deudas?|embargad[oa]s?|remate|leasing|sucesion)\\b"],
  ["foreign_plate", "\\b(?:chapa|placa|matricula|patente|empadronad[oa])s? (?:en |de )?(?:argentin[oa]|brasil(?:en[oa]|er[oa])?|paraguay[oa]?|extranjer[oa])\\b"],
];

const flatText = (text: string): string => ` ${fold(text).replace(/[^a-z0-9$.,]+/g, " ").replace(/\s+/g, " ").trim()} `;

export function descriptionFlags(text: string): CarTextFlag[] {
  const flat = flatText(text);
  return DESCRIPTION_FLAGS.filter(([, source]) => affirmed(flat, source)).map(([flag]) => flag).sort();
}

function amountOf(text: string): number {
  return Number(text.replace(/[.,](?=\d{3}\b)/g, "").replace(/[^\d]/g, ""));
}

// "Entrega Inmediata" / "Retira Ya" are delivery timing, not a down payment: the keyword only
// counts when an amount sits right next to it (at most one connector word and an optional
// currency marker in between). Runs against the UNSTRIPPED text: `stripped` eats "7.990" as if
// it were an engine displacement ("\d\.\d\w*"), which would hide the very amount we're looking for.
const FINANCING_KEYWORD_AMOUNT = /\b(?:entrega|anticipo|retira\w*)\b(?:\s+(?:de|con|minima|solo|y)\b)?(?:\s+(?:u\$s|u\$d|us\$|usd|\$))?\s+(?:\d[\d.,]*\d|\d{2,})\b/;
// "Usd 5500 Cuotas En Pesos": a currency amount landing directly on "cuotas" (or one word away).
const FINANCING_CURRENCY_BEFORE_CUOTAS = /\b(?:u\$s|u\$d|us\$|usd)\s+(?:\d[\d.,]*\d|\d{2,})\b(?:\s+\S+)?\s+(?:cuotas?|cuot)\b/;

/** Title-only signals: a down payment in the headline, or a second price that is not the listed one. */
export function titleFlags(title: string, price: number, currency: CarCurrency): CarTextFlag[] {
  const flags = new Set<CarTextFlag>(descriptionFlags(title));
  const text = flatText(title);
  const stripped = text
    .replace(/\b(19|20)\d{2}\b/g, " ")
    // Engine displacement ("1.6t", "1.8"): single digit either side of the dot, letters only
    // after it — never `\w*`, which also eats digits and would swallow a thousands-dot amount
    // like "7.990" as if it were "7.9" plus a suffix.
    .replace(/\b\d\.\d[a-z]*\b/g, " ")
    .replace(/\b\d+ ?(cv|hp|p|puertas|km|kms|v)\b/g, " ")
    .replace(/\b\dx\d\b/g, " ");
  if (FINANCING_KEYWORD_AMOUNT.test(text) || FINANCING_CURRENCY_BEFORE_CUOTAS.test(text)) flags.add("financing");
  if (currency === "USD") {
    const pattern = /(?:u\$[sd]|us\$|\busd|\bdolares?)\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,6})/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(stripped))) {
      const amount = amountOf(match[1]!);
      if (amount > 0 && Math.abs(amount - price) > price * 0.02) flags.add("price_mismatch");
    }
  }
  return [...flags].sort();
}

/** Titles are seller prose: drop phone numbers, emails and links before anything is published. */
export function cleanPublicText(text: string): string {
  return String(text || "")
    // Emails first: a bare-domain strip below would otherwise eat "b.com" out of "a@b.com" and
    // leave the dangling "a@" behind.
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    // Bare domain tokens ("autosusados.com", "miconcesionaria.com.uy"). Restricted to a known TLD
    // suffix so a decimal like "1.6" or "111.111" is never mistaken for one.
    .replace(/\b[a-z0-9-]+\.com(?:\.uy)?\b/gi, " ")
    .replace(/\b0?9\d[\s-]?\d{3}[\s-]?\d{3}\b/g, " ")
    .replace(/\b\d{4}[\s-]?\d{4}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}
