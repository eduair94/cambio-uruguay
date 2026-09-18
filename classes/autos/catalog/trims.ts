// El vocabulario de versiones, que es lo que decide si un auto puede compararse con otro.
//
// Medido el 2026-09-18 sobre 18.796 avisos vigentes: 7.056 no tenían versión, y NO por falta de
// inteligencia sino de vocabulario. La faceta de Mercado Libre trae la lista vacía en 515 de 932
// modelos, y donde trae algo el título usa otra palabra: el Sandero Stepway lista "Privilegio" y el
// aviso dice "Privilege"; el Cruze lista "Lt/Ltz" y el aviso dice "Premier Plus"; el T-Cross lista
// "Trendline" y el aviso dice "Trend".
//
// Entonces el vocabulario se MINA del propio corpus: lo que queda del título después de sacar marca,
// modelo y el ruido conocido (año, cilindrada, km, caja, tracción, combustible, carrocería, adjetivos
// de venta), contado por modelo. Un token que aparece en ≥3 avisos del modelo y en menos del 70 % de
// ellos es candidato a versión; arriba de ese 70 % no distingue nada y encima ROMPE la lectura, que
// se abstiene cuando hay dos aciertos que no se contienen.
import { fold, wordText } from "../normalize";
import type { CarModelVocabulary } from "../types";

export interface TrimCorpusRow {
  brandId: string;
  modelId: string;
  brand: string;
  model: string;
  title: string;
  specText?: string | null;
  /** The "Versión" row of the advert's own page: the word Mercado Libre itself uses. */
  version?: string | null;
}

/** Everything that is never a version name. */
const NOISE_WORDS = new Set([
  // caja, tracción, combustible
  "at", "mt", "automatica", "automatico", "automatic", "manual", "secuencial", "tiptronic", "cvt", "dsg", "dct", "steptronic",
  "4x4", "4x2", "awd", "fwd", "rwd", "traccion", "doble", "simple", "cabina", "dcab", "cab", "dc", "cs", "cd",
  "nafta", "gasolina", "diesel", "gasoil", "gnc", "gnv", "hibrido", "hybrid", "electrico", "electrica", "ev", "flex", "td", "tdi", "crdi", "hdi",
  // carrocería y tamaño
  "sedan", "hatchback", "hatch", "suv", "pickup", "pick", "up", "familiar", "rural", "coupe", "convertible", "van", "furgon", "utilitario",
  "puertas", "puerta", "ptas", "pts", "plazas", "pasajeros", "asientos", "p", "pax",
  // estado y venta
  "impecable", "excelente", "estado", "unico", "unica", "dueno", "duena", "dueno", "km", "kms", "kilometros", "full", "extra", "fullequipo",
  "permuta", "permuto", "permutas", "financia", "financiacion", "financiamos", "cuotas", "entrega", "anticipo", "oportunidad", "oferta",
  "vendo", "venta", "vende", "vendido", "nuevo", "nueva", "usado", "usada", "okm", "0km", "km0", "service", "oficial", "garantia", "recibo",
  "menor", "mayor", "valor", "precio", "contado", "credito", "banco", "gestion", "libre", "titular", "consulte", "consultar", "consultas",
  "disponible", "stock", "entrega", "inmediata", "ya", "urgente", "urge", "liquido", "liquidacion", "rebajado", "descuento", "promo",
  "cuidado", "cuidadisimo", "mantenido", "conservado", "original", "originales", "primera", "mano", "papeles", "dia", "al", "y", "con", "sin",
  "de", "del", "la", "el", "los", "las", "un", "una", "por", "para", "en", "a", "o", "u", "su", "sus", "mas", "muy", "todo", "toda", "super",
  // motorización escrita con palabras
  "cc", "cv", "hp", "cvt", "turbo", "tsi", "tfsi", "thp", "bi", "biturbo", "aspirado", "inyeccion", "multipoint", "vvt", "dohc", "v6", "v8",
  // colores
  "blanco", "blanca", "negro", "negra", "gris", "plata", "plateado", "rojo", "roja", "azul", "verde", "amarillo", "beige", "dorado", "bordo",
  "celeste", "naranja", "marron", "gris", "perla", "metalizado",
]);

const NOISE_PATTERN = /^(?:\d+(?:[.,]\d+)?|(?:19|20)\d{2}|\d+k|\d+x\d+|\d+p|\d+cv|\d+hp|\d+cc|v\d)$/;
/** Chassis and body codes the sellers copy from the plate ("b18", "m69", "b9"), never a trim name. */
const CODE_PATTERN = /^[a-z]{1,2}\d{1,3}$/;

const MAX_TRIMS_PER_MODEL = 25;
const MIN_ADVERTS = 3;
const MAX_SHARE = 0.6;
/**
 * A word that shows up under three different models is not a version, it is the seller: "Fullcars",
 * "Aerocar" and "Barriola" are dealers, and "buen" comes from "Muy Buen Estado". This one rule threw
 * out most of what a first mining run published as trims.
 */
const MAX_MODELS = 2;

/**
 * Language and marketing variants of the same trim, seen in the corpus. Only pairs that name the SAME
 * trim: "Premier" and "Premier Plus" are different cars and are never merged (the longest-with-
 * containment rule already tells them apart).
 */
const TRIM_ALIASES: ReadonlyArray<readonly string[]> = [
  ["privilege", "privilegio"],
  ["comfort", "confort"],
  ["intens", "intense"],
  ["luxury", "lujo"],
  ["advance", "advanced"],
  ["exclusive", "exclusivo"],
  ["active", "activo"],
  ["dynamic", "dynamique"],
];
/** "Trendline" is "Trend" plus a line suffix; "Highline" is not "High". */
const LINE_SUFFIX = /^(.+?)(?:line|linea)$/;

/** ML titles sign the dealer after a spaced dash ("Impecable! - Fontes Maldonado"): that tail is a name. */
const withoutDealerTail = (title: string): string => String(title || "").split(/\s+-\s+/)[0]!;

const tokensOf = (row: TrimCorpusRow): string[] => {
  const identity = wordText(`${withoutDealerTail(row.title)} ${row.specText ?? ""} ${row.version ?? ""}`);
  const brandWords = new Set(wordText(row.brand).trim().split(" ").filter(Boolean));
  const modelWords = new Set(wordText(row.model).trim().split(" ").filter(Boolean));
  return identity
    .trim()
    .split(" ")
    .filter(token => token && !brandWords.has(token) && !modelWords.has(token) &&
      !NOISE_WORDS.has(token) && !NOISE_PATTERN.test(token) && token.length >= 2);
};

const candidatesOf = (tokens: readonly string[]): string[] => {
  const candidates = new Set<string>();
  for (let index = 0; index < tokens.length; index++) {
    const word = tokens[index]!;
    if (word.length >= 3) candidates.add(word);
    const next = tokens[index + 1];
    if (next && word.length >= 2 && next.length >= 2) candidates.add(`${word} ${next}`);
  }
  return [...candidates];
};

/** The vocabulary of every model: Mercado Libre's own facet plus what the corpus itself says. */
export function mineTrims(rows: readonly TrimCorpusRow[], base: readonly CarModelVocabulary[] = []): CarModelVocabulary[] {
  const groups = new Map<string, TrimCorpusRow[]>();
  for (const row of rows) {
    const key = `${row.brandId}|${row.modelId}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  const merged = new Map<string, CarModelVocabulary>();
  for (const vocabulary of base) {
    merged.set(`${vocabulary.brandId}|${vocabulary.modelId}`, {
      brandId: vocabulary.brandId, modelId: vocabulary.modelId, trims: [...vocabulary.trims],
    });
  }
  const perModel = new Map<string, Map<string, number>>();
  const modelsPerCandidate = new Map<string, number>();
  for (const [key, group] of groups) {
    const counts = new Map<string, number>();
    for (const row of group) {
      for (const candidate of candidatesOf(tokensOf(row))) counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
    }
    perModel.set(key, counts);
    for (const [candidate, count] of counts) {
      if (count >= MIN_ADVERTS) modelsPerCandidate.set(candidate, (modelsPerCandidate.get(candidate) ?? 0) + 1);
    }
  }
  for (const [key, group] of groups) {
    const counts = perModel.get(key)!;
    const [brandId, modelId] = key.split("|") as [string, string];
    const entry = merged.get(key) ?? { brandId, modelId, trims: [] };
    const known = new Set(entry.trims.map(trim => wordText(trim).trim()));
    const mined = [...counts.entries()]
      .filter(([candidate, count]) =>
        count >= MIN_ADVERTS && count <= group.length * MAX_SHARE && !known.has(candidate) &&
        (modelsPerCandidate.get(candidate) ?? 0) <= MAX_MODELS &&
        !candidate.split(" ").some(word => CODE_PATTERN.test(word)))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_TRIMS_PER_MODEL)
      .map(([candidate]) => candidate);
    entry.trims = [...entry.trims, ...mined];
    merged.set(key, entry);
  }
  return [...merged.values()].sort((a, b) => a.brandId.localeCompare(b.brandId) || a.modelId.localeCompare(b.modelId));
}

export interface TrimIndex {
  /** Normalized variant → the name every cohort of this model uses. */
  canonical: Map<string, string>;
  names: string[];
  /** The names Mercado Libre itself publishes for the model: they win a tie against a mined one. */
  authoritative: Set<string>;
}

const aliasKey = (name: string): string => {
  const line = LINE_SUFFIX.exec(name);
  const stem = line ? line[1]! : name;
  const group = TRIM_ALIASES.find(names => names.includes(stem));
  return group ? group[0]! : stem;
};

/**
 * One entry per spelling, all pointing at one canonical name, so "Privilege" and "Privilegio" land in
 * the same cohort instead of two cohorts of half the size.
 */
export function buildTrimIndex(vocabulary: readonly string[], authoritative: readonly string[] = []): TrimIndex {
  const names = [...new Set(vocabulary.map(name => wordText(name).trim()).filter(Boolean))];
  const families = new Map<string, string[]>();
  for (const name of names) {
    const key = aliasKey(name);
    const family = families.get(key);
    if (family) family.push(name);
    else families.set(key, [name]);
  }
  const canonical = new Map<string, string>();
  for (const family of families.values()) {
    // The shortest spelling is the canonical one: "comfort" covers "comfortline" and "confort".
    const winner = [...family].sort((a, b) => a.length - b.length || a.localeCompare(b))[0]!;
    for (const name of family) canonical.set(name, winner);
  }
  return {
    canonical,
    names: names.sort((a, b) => b.length - a.length || a.localeCompare(b)),
    authoritative: new Set(authoritative.map(name => wordText(name).trim()).filter(Boolean)),
  };
}

/**
 * The model's version as written in this advert, canonicalized. The longest hit wins only if it
 * contains every other hit — two unrelated hits ("compact" and "xs") stay ambiguous and abstain,
 * because guessing which one is the trim is how a cheaper car becomes a fake bargain.
 */
export function matchTrim(text: string, index: TrimIndex): string | null {
  const haystack = wordText(text);
  const all = index.names.filter(name => haystack.includes(` ${name} `));
  if (!all.length) return null;
  // Mercado Libre's own names beat the mined ones: a title carrying both "Privilege" (theirs) and
  // "Fullcars" (ours, wrongly mined) has one version, and it is theirs.
  const official = all.filter(name => index.authoritative.has(name));
  const hits = official.length ? official : all;
  const [top, ...rest] = hits;
  const canonicalTop = index.canonical.get(top!) ?? top!;
  const unexplained = rest.filter(hit => !` ${top} `.includes(` ${hit} `) && (index.canonical.get(hit) ?? hit) !== canonicalTop);
  return unexplained.length ? null : canonicalTop;
}

/** The nicest spelling to show for a canonical trim ("Privilege", not "privilege"). */
export function trimLabelFor(trim: string | null, vocabulary: readonly string[]): string | null {
  if (!trim) return null;
  const match = vocabulary.find(name => wordText(name).trim() === trim);
  if (match) return match;
  return trim.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
}

export const trimFold = fold;
