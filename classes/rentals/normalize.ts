// Turning three portals' free text into something two rows can be compared on.
//
// The whole directory rests on this file: if "Av. Garzón 1975" and "Avenida Garzon 1975 bis" do not
// produce the same key, the same apartment is published twice and the page is worthless. Every
// function here is pure and unit-tested (tests/rentals/normalize.test.ts).
import type { RentalCurrency, RentalPropertyType } from "./types";

export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** lowercase, unaccented, single-spaced. The starting point of every comparison here. */
export function flatten(value: string): string {
  return stripAccents(String(value || ""))
    .toLowerCase()
    .replace(/[\s ]+/g, " ")
    .trim();
}

// --- Departments -----------------------------------------------------------

/**
 * The 19 departments, canonical spelling (WITH accents — that is how the site writes them).
 * Uruguayan listings spell four of them both ways; matching by exact string is the bug that
 * `app/utils/localData` already learned the hard way, so everything joins on `flatten()`.
 */
export const DEPARTMENTS: readonly string[] = [
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

const DEPARTMENT_BY_FLAT = new Map<string, string>(DEPARTMENTS.map((name) => [flatten(name), name]));

/** Portals write "Departamento de Montevideo", "Montevideo, Uruguay", "Ciudad de la Costa". */
export function canonicalDepartment(raw: string): string {
  const flat = flatten(raw)
    .replace(/^departamento de /, "")
    .replace(/, ?uruguay$/, "")
    .trim();
  const direct = DEPARTMENT_BY_FLAT.get(flat);
  if (direct) return direct;
  // Longest-match scan: "montevideo departamento de montevideo" and "canelones, ciudad de la costa"
  // both carry the department somewhere inside the string.
  let best = "";
  for (const [key, name] of DEPARTMENT_BY_FLAT) {
    if (flat.includes(key) && key.length > best.length) best = key;
  }
  return best ? DEPARTMENT_BY_FLAT.get(best)! : "";
}

// --- Street addresses ------------------------------------------------------

/**
 * Abbreviations Uruguayan adverts use interchangeably. Expanded (not stripped) so that
 * "Av. Italia" and "Avenida Italia" collapse, while "Italia" alone stays a different street.
 */
const STREET_ABBREVIATIONS: ReadonlyArray<[RegExp, string]> = [
  [/\bav\.?\b/g, "avenida"],
  [/\bavda\.?\b/g, "avenida"],
  [/\bavd\.?\b/g, "avenida"],
  [/\bbv\.?\b/g, "bulevar"],
  [/\bblvd\.?\b/g, "bulevar"],
  [/\bboulevard\b/g, "bulevar"],
  [/\bdr\.?\b/g, "doctor"],
  [/\bdra\.?\b/g, "doctora"],
  [/\bgral\.?\b/g, "general"],
  [/\bcnel\.?\b/g, "coronel"],
  [/\bcno\.?\b/g, "camino"],
  [/\bcmno\.?\b/g, "camino"],
  [/\bing\.?\b/g, "ingeniero"],
  [/\barq\.?\b/g, "arquitecto"],
  [/\bpte\.?\b/g, "presidente"],
  [/\bprof\.?\b/g, "profesor"],
  [/\bsan\b/g, "san"],
  [/\bsta\.?\b/g, "santa"],
  [/\bsto\.?\b/g, "santo"],
  [/\bpza\.?\b/g, "plaza"],
  [/\bplza\.?\b/g, "plaza"],
  [/\bramb\.?\b/g, "rambla"],
  [/\bp\.?\s?rod[oó]\b/g, "parque rodo"],
];

/** Words that mark the end of the useful part of an address line. */
const ADDRESS_NOISE = /\b(apto|apartamento|unidad|piso|nivel|of|oficina|local|casa|block|torre)\b.*/;

/**
 * Normalises one street line: expands abbreviations, drops apartment/floor tails, collapses the
 * "esquina" half (a corner is written in either order, so keeping both makes two keys for one
 * address), and returns the street name plus its door number when there is one.
 */
export function parseStreet(raw: string): { street: string; number: string } {
  let flat = flatten(raw)
    .replace(/[."'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of STREET_ABBREVIATIONS) flat = flat.replace(pattern, replacement);
  // Google Plus Codes ("4QJ9+664") ride along in some MercadoLibre addresses and are not a street.
  flat = flat.replace(/\b[a-z0-9]{4}\+[a-z0-9]{2,4}\b/g, " ");
  flat = flat.replace(ADDRESS_NOISE, "").trim();
  // "Sena esq. 20 de Febrero" / "Carlos M. Maggiolo y García de Zúñiga": keep the first street only.
  flat = flat.split(/\besq(?:uina)?\b|\by\b(?=\s)|&/)[0]!.trim();
  flat = flat.replace(/\bs\/n\b/g, " ").replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim();

  // THE DOOR NUMBER IS THE LAST ONE, not the first. Half of Montevideo's streets ARE numbers —
  // 18 de Julio, 25 de Mayo, 8 de Octubre, 33 Orientales — and reading the first number as the door
  // left those addresses with an empty street name, which quietly split one building into two
  // properties. Ranges ("Colorado 1500 - 1800") keep the low end.
  const trailing = flat.match(/(?:^|\s)(\d{1,5})(?:\s*[-–/]\s*\d{1,5})?(?:\s+bis)?\s*$/);
  const number = trailing ? trailing[1]! : "";
  const street = (trailing ? flat.slice(0, trailing.index).trim() : flat)
    .replace(/\bbis\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // "1975" alone is a number, not an address: without a street name there is nothing to join on.
  if (!street) return { street: "", number: "" };
  return { street, number };
}

export interface ParsedLocation {
  /** Street line exactly as the portal published it (trimmed) — what the site shows. */
  address: string;
  street: string;
  number: string;
  neighborhood: string;
  department: string;
}

/**
 * Splits a portal's location line into street / barrio / department.
 *
 * MercadoLibre writes "Av. Garzón 1975 Bis, Colón, Montevideo" but also "Brazo Oriental,
 * Montevideo" (no street) and "Colorado 1500 - 1800, Montevideo, Goes, Montevideo" (a stray city
 * in the middle). The rule that survives all three: the LAST segment that names a department is
 * the department, the segment before it is the barrio, and whatever is left at the front — if it
 * carries a number or more than one word — is the street.
 */
export function parseLocationLine(raw: string, fallbackDepartment = "", fallbackNeighborhood = ""): ParsedLocation {
  const parts = String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let department = "";
  let departmentIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = canonicalDepartment(parts[i]!);
    if (candidate) {
      department = candidate;
      departmentIndex = i;
      break;
    }
  }
  if (!department) department = canonicalDepartment(fallbackDepartment);

  let neighborhood = "";
  if (departmentIndex > 0) {
    const previous = parts[departmentIndex - 1]!;
    // "Montevideo, Goes, Montevideo": the city repeat is not a barrio.
    neighborhood = canonicalDepartment(previous) ? "" : previous;
  }
  if (!neighborhood && fallbackNeighborhood) neighborhood = fallbackNeighborhood.trim();

  const head = parts
    .slice(0, Math.max(departmentIndex, 0))
    .filter((part) => part !== neighborhood && !canonicalDepartment(part));
  const addressLine = head.join(", ").trim();
  const { street, number } = parseStreet(addressLine);

  return {
    address: addressLine,
    street,
    number,
    neighborhood: neighborhood.replace(/\s+/g, " ").trim(),
    department,
  };
}

/** Display-cased barrio, used both as a filter facet and as the merge key. */
export function neighborhoodKey(neighborhood: string, department: string): string {
  return `${flatten(department)}|${flatten(neighborhood)}`;
}

// --- Numbers ---------------------------------------------------------------

/**
 * Parses a published amount. THE LAST SEPARATOR DECIDES: three digits after it means thousands
 * ("$ 4.500" is 4500, never 4.50); anything else is the decimal point. Learned from the chair
 * directory, where the alternative was a 1000× price error.
 */
export function parseMoney(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  const text = String(raw ?? "").replace(/[^\d.,]/g, "");
  if (!text) return null;
  const lastSeparator = Math.max(text.lastIndexOf("."), text.lastIndexOf(","));
  let value: number;
  if (lastSeparator === -1) {
    value = Number(text);
  } else {
    const tail = text.slice(lastSeparator + 1);
    const head = text.slice(0, lastSeparator).replace(/[.,]/g, "");
    value = tail.length === 3 ? Number(`${head}${tail}`) : Number(`${head}.${tail}`);
  }
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseCurrency(raw: string | null | undefined): RentalCurrency | null {
  const flat = flatten(raw || "");
  if (!flat) return null;
  if (/(^|\W)(u\$s?|usd|dolar|dolares|us\$)/.test(flat)) return "USD";
  if (/(^|\W)(\$u?|uyu|peso|pesos)/.test(flat)) return "UYU";
  return null;
}

/**
 * Rent that cannot be a monthly rent for THIS kind of property.
 *
 * Portals mix sale adverts into rental categories (a "$180.000 USD alquiler" is a sale) and sellers
 * type "1" or "90" to mean "consultá el precio". Both poison every median on the page.
 *
 * The floor is per type on purpose: a garage or a storage box really does rent for $3.500, and a
 * two-bedroom flat in Pocitos really does not. One shared floor either lets a US$ 90 apartment
 * through — it was in the first live run — or throws away the whole garage market.
 */
const RENT_FLOOR_UYU: Record<RentalPropertyType, number> = {
  apartamento: 8_000,
  casa: 8_000,
  habitacion: 3_000,
  local: 3_000,
  oficina: 3_000,
  terreno: 2_000,
  otro: 2_000,
};

export function isPlausibleRent(priceUyu: number, propertyType: RentalPropertyType = "otro"): boolean {
  return priceUyu >= RENT_FLOOR_UYU[propertyType] && priceUyu <= 900_000;
}

// --- Attributes ------------------------------------------------------------

export interface RentalAttributes {
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
}

const INT = /(\d+(?:[.,]\d+)?)/;

/**
 * Reads MercadoLibre's attribute strip (`["2 dormitorios", "1 baño", "40 m² cubiertos"]`) and any
 * other "N dormitorios" text. A monoambiente has zero bedrooms by definition, and that zero is
 * meaningful — it is NOT the same as "the portal did not say".
 */
export function parseAttributes(texts: readonly string[]): RentalAttributes {
  let bedrooms: number | null = null;
  let bathrooms: number | null = null;
  let area: number | null = null;

  for (const raw of texts) {
    const flat = flatten(raw);
    if (bedrooms === null && /\b(dormitorio|dormitorios|habitacion|habitaciones)\b/.test(flat)) {
      const match = flat.match(INT);
      if (match) bedrooms = Math.round(Number(match[1]!.replace(",", ".")));
    }
    if (bedrooms === null && /\bmonoambiente\b/.test(flat)) bedrooms = 0;
    if (bathrooms === null && /\bbanos?\b/.test(flat)) {
      const match = flat.match(INT);
      if (match) bathrooms = Math.round(Number(match[1]!.replace(",", ".")));
    }
    if (area === null && /\bm2|m²\b/.test(flat.replace("m²", "m2"))) {
      const match = flat.match(INT);
      if (match) area = Math.round(Number(match[1]!.replace(",", ".")));
    }
  }

  return {
    bedrooms: bedrooms !== null && bedrooms >= 0 && bedrooms <= 20 ? bedrooms : null,
    bathrooms: bathrooms !== null && bathrooms > 0 && bathrooms <= 20 ? bathrooms : null,
    area: area !== null && area >= 8 && area <= 5_000 ? area : null,
  };
}

// --- Property type ---------------------------------------------------------

const TYPE_PATTERNS: ReadonlyArray<[RegExp, RentalPropertyType]> = [
  [/\b(habitacion|habitaciones|pension|cuarto|pieza|dormitorio en|compartida)\b/, "habitacion"],
  [/\b(apartamento|apto|apart|monoambiente|penthouse|duplex|loft)\b/, "apartamento"],
  [/\b(casa|chalet|chacra|quinta|duplex de casa|casahabitacion)\b/, "casa"],
  [/\b(local|comercial|galpon|deposito|tienda)\b/, "local"],
  [/\b(oficina|coworking|consultorio|escritorio comercial)\b/, "oficina"],
  [/\b(terreno|predio|campo|padron)\b/, "terreno"],
  [/\b(garage|garaje|cochera|estacionamiento)\b/, "otro"],
];

/**
 * Type from the portal's own taxonomy first (ML ships a `domain_id`, InfoCasas a numeric type),
 * text only as a fallback: a title that says "casa en el barrio de los apartamentos" must not
 * outvote the category the seller picked from a dropdown.
 */
export function inferPropertyType(title: string, hint?: string | null): RentalPropertyType {
  const hintFlat = flatten(hint || "");
  if (hintFlat) {
    if (/apartment|apartamento/.test(hintFlat)) return "apartamento";
    if (/house|casa/.test(hintFlat)) return "casa";
    if (/room|habitacion|pension/.test(hintFlat)) return "habitacion";
    if (/commercial|local|store|warehouse|galpon/.test(hintFlat)) return "local";
    if (/office|oficina/.test(hintFlat)) return "oficina";
    if (/land|lot|terreno|campo/.test(hintFlat)) return "terreno";
  }
  const flat = flatten(title);
  for (const [pattern, type] of TYPE_PATTERNS) if (pattern.test(flat)) return type;
  return "otro";
}

/**
 * Adverts that are not a rental at all. Portals leak sales, "busco alquiler" wanted-ads and
 * temporary/tourist rentals into the same category; a nightly rate compared against a monthly one
 * is the fastest way to publish a lie.
 */
export function looksLikeRentalAdvert(title: string, description = ""): boolean {
  const flat = flatten(title);
  if (/\b(vendo|venta|se vende|permuta|remato)\b/.test(flat) && !/\balquil/.test(flat)) return false;
  if (/\b(busco|necesito|solicito)\b.*\balquil/.test(flat)) return false;
  if (/\b(por dia|por noche|diario|temporada|temporal|alquiler temporario|turistico)\b/.test(flat)) return false;
  if (/\binvernal(?:es)?\b|\balquiler (?:de |por |durante el )?invierno\b/.test(flat)) return false;
  // Some portals label winter-only contracts as ordinary rentals and mention the term only in
  // the description. Do not scan for "invierno" alone: an annual home may have a winter garden.
  // If an annual option is also mentioned, the description does not prove it is winter-only.
  const detail = flatten(description.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " "));
  if (!/\banual(?:es)?\b/.test(`${flat} ${detail}`)
    && /\balquiler (?:invernal|(?:de |por |durante el )?invierno)\b/.test(detail)) return false;
  return true;
}

/** Stable, human-debuggable id for a property key. */
export function slugify(value: string): string {
  return flatten(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
