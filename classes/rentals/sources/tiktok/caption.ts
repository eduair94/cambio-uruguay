// What a TikTok caption SAYS about a rental, and nothing it does not.
//
// The caption is the whole advert: there is no structured price, no type dropdown, no address
// field. Everything here is text, so every rule is precision-first — an abstention costs one
// advert, a wrong price poisons a median. Measured 2026-09-23 over 50 real captions
// (`tests/rentals/fixtures/tiktok-captions.json` keeps 15 of them):
//   * the rent is a peso amount with a `$`, sometimes `💲`, sometimes only a "PRECIO:" label;
//   * the same caption prices gastos comunes, a garage, a deposit and a per-guarantee variant
//     ("$24.000 con aseguradoras / $25.000 con Anda") — the NEAREST label decides, and a label
//     never reaches past an earlier amount ("Contrato 2 años ✅ Alquiler $49.000" is rent, not
//     a number of years);
//   * "NO DISPONIBLE", "RESERVADO" and "ALQUILADO" are edited INTO the caption of a flat that is
//     gone, because a video is never taken down;
//   * half of Montevideo's streets are department names ("Durazno y Maldonado", "Jackson y
//     Canelones"), so a department only counts from a hashtag or behind a locative cue.
import { addressCandidates } from "../../facebookDetail";
import { guaranteesFromText, type RentalGuarantee } from "../../guarantees";
import { KNOWN_NEIGHBORHOODS, neighborhoodFromText } from "../../neighborhoods";
import { DEPARTMENTS, canonicalDepartment, flatten, inferPropertyType, looksLikeRentalAdvert, parseAttributes, parseMoney } from "../../normalize";
import type { RentalCurrency, RentalPropertyType } from "../../types";

export interface CaptionFacts {
  title: string;
  /** Why the caption is not a publishable rental advert; `null` when it is. */
  rejected: string | null;
  price: number | null;
  currency: RentalCurrency | null;
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  propertyType: RentalPropertyType;
  department: string;
  neighborhood: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  addressCandidates: string[];
  guarantees: RentalGuarantee[];
}

// --- Title -----------------------------------------------------------------------------------

const EMOJI = /[\p{Extended_Pictographic}️‍⃣]/gu;
/** Bullets the captions put between facts. They split a title and, for the address reader, a segment. */
const BULLETS = /[✅🔹▪️•▫️🔸➡️👉📍💰💲🛏️🚿🧾📑📲📞❗️‼️⛔️🔑🏡🏠🤩❤️✨🎥🔥🌳🐶☀️🧺❄️💡🎨💼📚🚌🏢🛋🍽🚗🔒📩🗝️🔵🟩]/gu;
const BULLET_SPLIT = /\s*(?:[✅🔹▪️•▫️🔸➡️👉📍💰💲🛏️🚿🧾📑📲📞❗️‼️⛔️🔑🏡🏠🤩❤️✨🎥🔥🌳🐶☀️🧺❄️💡🎨💼📚🚌🏢🛋🍽🚗🔒📩🗝️🔵🟩]|\s[|]\s)\s*/u;

/** The first line of the caption, without emojis, bullets and hashtags; "" when there is none. */
export function captionTitle(lines: readonly string[]): string {
  for (const raw of lines) {
    const first = raw
      .split(BULLET_SPLIT)
      .map(part => part.replace(EMOJI, "").replace(/#\S+/g, "").replace(/\s+/g, " ").trim())
      .find(part => /[a-záéíóúñ]{3}/i.test(part));
    if (first) return first.replace(/[\s:–—-]+$/g, "").slice(0, 120);
  }
  return "";
}

// --- Rejection -------------------------------------------------------------------------------

export function captionRejection(text: string): string | null {
  const flat = flatten(text);
  if (/\bno\s+disponible\b/.test(flat)) return "no disponible";
  if (/\breservad[oa]s?\b/.test(flat)) return "reservado";
  if (/\balquilad[oa]s?\b/.test(flat)) return "alquilado";
  if (/\btraspaso\b/.test(flat)) return "traspaso";
  if (/\b(?:busco|buscamos|necesito|solicito)\b/.test(flat)) return "busco";
  if (/\b(?:vendo|venta|se vende|permuta|remato)\b/.test(flat) && !/\balquil/.test(flat)) return "venta";
  if (!looksLikeRentalAdvert(text)) return "temporal";
  return null;
}

// --- Amounts ---------------------------------------------------------------------------------

type Role = "price" | "gc" | "variant" | "ignore" | "plain";
interface Amount { value: number; currency: RentalCurrency; role: Role }

const USD = /(?:u\$s|us\$|usd|u\$d|d[oó]lares)/i;
/** Three bare digits are a dollar rent ("U$S 900") or nothing: without a currency mark they are dropped below. */
const AMOUNT = /(?:(u\$s|us\$|usd|u\$d|\$)\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{3,6})(?:\s*(pesos|d[oó]lares|usd|u\$s))?/giu;
/** Labels read BEFORE an amount (the nearest one wins). */
const BEFORE_LABELS: ReadonlyArray<[Role, RegExp]> = [
  ["gc", /gastos\s+comunes|gastos\s+c(?![a-záéíóúñ])|(?:^|[^a-z])g\.?\s?c\.?(?![a-záéíóúñ])|expensas/gi],
  ["ignore", /(?:^|[^a-záéíóúñ])(?:dep[oó]sito|se[ñn]a|comisi[oó]n|honorarios|cochera|garaje|garage|estacionamiento|extra|adelantad[oa]|luz|agua|ute|ose|internet|wifi|tributos?|contribuci[oó]n|m2|m²|metros|a[ñn]os?|meses|hs|horas)(?![a-záéíóúñ])/gi],
  ["variant", /(?:^|[^a-záéíóúñ])(?:anda|cgn|contadur[ií]a|porto|aseguradoras?|sura|mapfre|surco|fideciu|sancor|garant[ií]as?)(?![a-záéíóúñ])/gi],
  ["price", /(?:^|[^a-záéíóúñ])(?:precio|alquiler|arriendo|mensual(?:es)?|por\s+mes|al\s+mes|renta|valor)(?![a-záéíóúñ])/gi],
];
/**
 * Labels read right AFTER an amount ("$17.000 de alquiler", "$24.000 con aseguradoras"). No GC
 * here on purpose: "$30.000 GC $4.000" labels the NEXT amount, and gastos comunes are always
 * labelled before their own figure.
 */
const AFTER_LABELS: ReadonlyArray<[Role, RegExp]> = [
  ["ignore", /^\s*(?:de\s+)?(?:dep[oó]sito|se[ñn]a|extra|adelanto|de\s+garant[ií]a)(?![a-záéíóúñ])/i],
  ["variant", /^\s*(?:con\s+|para\s+)?(?:anda|cgn|contadur[ií]a|porto|aseguradoras?|sura|mapfre|surco|fideciu|sancor)(?![a-záéíóúñ])/i],
  ["price", /^\s*(?:de\s+)?(?:alquiler|mensual(?:es)?|por\s+mes|al\s+mes)(?![a-záéíóúñ])/i],
];
/** Between two amounts of one range ("$3.500–$4.000", "$18.000 a $20.000"): a connector, never just a space. */
const RANGE_GAP = /^\s*(?:[-–—/]|a|y|o|hasta)\s*$/i;

function nearestBefore(before: string): Role | null {
  let role: Role | null = null;
  let position = -1;
  for (const [kind, pattern] of BEFORE_LABELS) {
    pattern.lastIndex = 0;
    for (const match of before.matchAll(pattern)) {
      if (match.index! > position) { position = match.index!; role = kind; }
    }
  }
  return role;
}

function firstAfter(after: string): Role | null {
  for (const [kind, pattern] of AFTER_LABELS) if (pattern.test(after)) return kind;
  return null;
}

export function captionAmounts(text: string): {
  price: number | null;
  currency: RentalCurrency | null;
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  ambiguous: boolean;
} {
  const source = String(text || "").replace(/💲/g, "$").replace(/\$\s*U(?![a-záéíóúñ])/gi, "$");
  const amounts: Amount[] = [];
  let previousEnd = 0;
  /** The last number was kept, so a range connector right after it continues its role. */
  let previousKept = false;
  for (const match of source.matchAll(AMOUNT)) {
    const symbol = match[1] || "";
    const digits = match[2]!;
    const word = match[3] || "";
    const value = parseMoney(digits);
    const start = match.index!;
    const end = start + match[0].length;
    if (value === null) { previousEnd = end; previousKept = false; continue; }
    const before = source.slice(Math.max(previousEnd, start - 34), start);
    const after = source.slice(end, end + 28);
    const currency: RentalCurrency | null = USD.test(symbol) || USD.test(word) ? "USD" : symbol || /pesos/i.test(word) ? "UYU" : null;
    const previous = previousKept && amounts.length ? amounts[amounts.length - 1]! : null;
    const role: Role = previous && RANGE_GAP.test(before)
      ? previous.role
      : nearestBefore(before) ?? firstAfter(after) ?? "plain";
    previousEnd = end;
    // A bare number without a currency mark is money only when its label says so.
    if (!currency && role !== "price" && role !== "gc") { previousKept = false; continue; }
    amounts.push({ value, currency: currency ?? "UYU", role });
    previousKept = true;
  }
  const gc = amounts.find(amount => amount.role === "gc") ?? null;
  const noGc = /\b(?:sin|no\s+(?:paga|pagas|tiene|abona)|libre\s+de)\s+(?:gastos\s+comunes|gc|expensas)\b/i.test(source);
  const labelled = amounts.filter(amount => amount.role === "price");
  const plain = amounts.filter(amount => amount.role === "plain");
  const variants = amounts.filter(amount => amount.role === "variant");
  const distinct = (list: Amount[]): number => new Set(list.map(amount => `${amount.currency}:${amount.value}`)).size;
  const min = (list: Amount[]): Amount => list.reduce((best, amount) => (amount.value < best.value ? amount : best));
  let chosen: Amount | null = null;
  let ambiguous = false;
  if (labelled.length) chosen = min(labelled);
  else if (distinct(plain) === 1) chosen = plain[0]!;
  else if (plain.length > 1) ambiguous = true;
  else if (variants.length) chosen = min(variants);
  return {
    price: chosen ? chosen.value : null,
    currency: chosen ? chosen.currency : null,
    commonExpenses: gc ? gc.value : noGc ? 0 : null,
    commonExpensesCurrency: gc ? gc.currency : noGc ? (chosen ? chosen.currency : "UYU") : null,
    ambiguous,
  };
}

// --- Location --------------------------------------------------------------------------------

const HASHTAG_PREFIX = /^(?:alquiler(?:es)?|alquilo|alquilar|apartamentos?|apto|casas?|inmobiliaria|propiedades|inmuebles|venta)/;
const HASHTAG_SUFFIX = /(?:uruguay|uy|montevideo)$/;
const departmentKeys = new Map(DEPARTMENTS.map(name => [flatten(name).replace(/\s+/g, ""), name]));
const neighborhoodKeys: Array<[string, string]> = Object.values(KNOWN_NEIGHBORHOODS)
  .flatMap(names => names.map(name => [flatten(name).replace(/\s+/g, ""), name] as [string, string]))
  .filter(([key]) => key.length >= 5);

/** `#alquilermontevideo` → Montevideo; `#alquilerpocitos` / `#pocitosmontevideo` → "Pocitos". */
export function hashtagEvidence(hashtags: readonly string[]): { departments: Set<string>; neighborhoods: string[] } {
  const departments = new Set<string>();
  const neighborhoods: string[] = [];
  for (const raw of hashtags) {
    const tag = flatten(raw).replace(/[^a-z0-9]/g, "");
    if (!tag) continue;
    const core = tag.replace(HASHTAG_PREFIX, "").replace(HASHTAG_SUFFIX, "");
    if (departmentKeys.has(tag)) { departments.add(departmentKeys.get(tag)!); continue; }
    if (core && departmentKeys.has(core)) { departments.add(departmentKeys.get(core)!); continue; }
    if (tag.endsWith("montevideo") && !core) { departments.add("Montevideo"); continue; }
    const hit = neighborhoodKeys.find(([key]) => tag === key || core === key);
    if (hit) neighborhoods.push(hit[1]);
    if (tag !== core && tag.endsWith("montevideo")) departments.add("Montevideo");
  }
  return { departments, neighborhoods };
}

const DEPARTMENT_CUE = /(?:^|[^a-z0-9])(?:en|de|zona|departamento|ciudad|dpto|dpto\.)\s+$/;
const CORNER_AFTER = /^\s*(?:y|e|esq|esquina|casi|entre)(?![a-z0-9])/;

/** Departments the text names behind a locative cue and not as a street ("Durazno y Maldonado"). */
function departmentsInText(text: string): Set<string> {
  const flat = flatten(text);
  const found = new Set<string>();
  for (const name of DEPARTMENTS) {
    const key = flatten(name);
    const pattern = new RegExp(`(^|[^a-z0-9])${key.replace(/\s+/g, "\\s+")}(?![a-z0-9])`, "g");
    for (const match of flat.matchAll(pattern)) {
      const before = flat.slice(0, match.index! + match[1]!.length);
      const after = flat.slice(match.index! + match[0].length);
      if (!DEPARTMENT_CUE.test(before) || CORNER_AFTER.test(after)) continue;
      found.add(canonicalDepartment(name));
    }
  }
  return found;
}

/**
 * The text first, hashtags only when the text names nothing: "#Palermo #ParqueRodo" tag the
 * neighbours, and the caption "Alquiler Palermo" says which one it is.
 */
export function captionLocation(text: string, hashtags: readonly string[]): { department: string; neighborhood: string } {
  // The caption carries its hashtags inline ("… #cordón #Palermo #Gym"): they are read as
  // hashtags below, never as prose — as prose, the longest-name rule let "#Palermo" outrank the
  // "Cordón" the caption actually says.
  const prose = text.replace(/#\S+/g, " ");
  const evidence = hashtagEvidence([...hashtags, ...(text.match(/#(\S+)/g) || []).map(tag => tag.slice(1))]);
  const departments = new Set([...departmentsInText(prose), ...evidence.departments]);
  if (departments.size > 1) return { department: "", neighborhood: "" };
  const department = departments.size === 1 ? [...departments][0]! : "";
  const named = neighborhoodFromText(prose, department) || neighborhoodFromText(evidence.neighborhoods.join(" · "), department);
  return { department: department || (named ? named.department : ""), neighborhood: named ? named.neighborhood : "" };
}

// --- Type ------------------------------------------------------------------------------------

export function captionPropertyType(title: string, text: string): RentalPropertyType {
  const flat = flatten(`${title}\n${text}`);
  if (/\b(?:habitaci[oó]n(?:es)?\s+(?:en|para|disponible)|pensi[oó]n|cuarto|pieza|compartid[oa]|coliving|residencia estudiantil)\b/.test(flat)) return "habitacion";
  const byTitle = inferPropertyType(title);
  if (byTitle !== "otro" && byTitle !== "habitacion") return byTitle;
  if (/\b(?:apartamento|apto|apart|monoambiente|duplex|penthouse|loft)\b/.test(flat)) return "apartamento";
  if (/\b(?:casa|chalet|chacra|quinta)\b/.test(flat)) return "casa";
  const byText = inferPropertyType(text);
  return byText === "habitacion" ? "otro" : byText;
}

// --- Everything ------------------------------------------------------------------------------

export function parseCaption(lines: readonly string[], hashtags: readonly string[]): CaptionFacts {
  const text = lines.join("\n");
  const title = captionTitle(lines);
  const amounts = captionAmounts(text);
  const location = captionLocation(text, hashtags);
  const attributes = parseAttributes([text]);
  const rejected = captionRejection(text)
    ?? (!/\b(?:alquil|arriend)/.test(flatten(text)) ? "sin verbo de alquiler" : null)
    ?? (amounts.ambiguous ? "precio ambiguo" : amounts.price === null ? "sin precio" : null);
  return {
    title,
    rejected,
    price: amounts.price,
    currency: amounts.currency,
    commonExpenses: amounts.commonExpenses,
    commonExpensesCurrency: amounts.commonExpensesCurrency,
    propertyType: captionPropertyType(title, text),
    department: location.department,
    neighborhood: location.neighborhood,
    bedrooms: attributes.bedrooms,
    bathrooms: attributes.bathrooms,
    area: attributes.area,
    // The address reader splits on its own bullets; a caption's bullets become line breaks first.
    // 📍 stays: it is the anchor that says "an address follows".
    // Every 📍 opens its own line and whitespace around the breaks is collapsed: the reader's own
    // splitter swallows a 📍 that follows a word, and the anchor has to open its segment.
    addressCandidates: addressCandidates(text.replace(BULLETS, (bullet) => (bullet === "📍" ? "\n📍" : "\n")).replace(/[ \t]*\n[ \t]*/g, "\n")),
    guarantees: guaranteesFromText(text),
  };
}
