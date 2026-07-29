// Turns free-text listings from six different storefronts into one comparable product identity.
//
// Two jobs live here and nothing else:
//   1. Is this listing a desk chair at all? (storefront catalogues are full of dining chairs,
//      high chairs, car seats, replacement casters and chair *covers*.)
//   2. Which chair is it? Two listings are the same product only when brand AND model agree, so
//      an over-eager match can never merge a Herman Miller Aeron into a generic mesh chair.
import { normalizeChairName } from "./analyze";
import type { ChairCategory, ChairListing } from "./types";

/** A listing must look like a chair… */
const CHAIR_WORD = /\b(sillas?|sillones?|butacas?|chairs?)\b/i;

/**
 * …and be aimed at a desk.
 *
 * The computer-retail words earn their place: a supermarket sells two real gaming chairs whose
 * title, description and specifications say nothing but "Silla Cougar Armor Elite", and the only
 * evidence they belong at a desk is that they are filed under Electrónica e Informática /
 * Periféricos. A chair sold in the peripherals aisle is a desk chair. The exclusion list below is
 * consulted first, so this can never rescue a garden, beach or camping chair.
 */
const DESK_CONTEXT =
  /\b(escritorio|oficina|ergon[oó]mic[ao]s?|gamer|gaming|computador|computadora|pc|estudio|ejecutiv[ao]|gerencial|operativ[ao]|secretarial|task\s*chair|office|perif[eé]ric[oa]s?|inform[aá]tica|computaci[oó]n)\b/i;

/**
 * Things that are never a desk chair, whatever else the title says.
 *
 * Every noun is plural-tolerant: a trailing \b after a singular stem does not match its plural
 * ("apilable" never matches "apilables"), which is how a stack of auditorium chairs reached the
 * directory.
 */
const NOT_A_DESK_CHAIR =
  /\b(comedor|cocina|bebe|beb[eé]s?|infantil|ni[nñ]os?|auto|autos|coche|bicicleta|playa|playeras?|jard[ií]n|exterior|camping|bar|banquetas?|taburetes?|alfombras?|masajes?|masajeadora|dentista|odontol[oó]gic[ao]s?|peluquer[ií]a|barber[ií]a|est[eé]tica|inodoro|ba[nñ]o|sanitarias?|n[aá]uticas?|pesca|combos?|kits?|packs?|auditorios?|apilables?|escolares?|aulas?|iglesias?|tribunas?|estadios?)\b|\b(silla\s+de\s+ruedas|beb[eé]\s+comer|set\s+de|juego\s+de|sala\s+de\s+espera|escritorio\s+solo|plegable\s+de\s+playa|call\s*center\s+banco|\d+\s+unidades)\b/i;

/**
 * Chair PARTS sold on their own.
 *
 * These same words describe features of a perfectly ordinary desk chair — "silla con ruedas",
 * "silla con apoyapiés" — and blanket-banning them deleted real chairs from the catalogue. A part
 * only disqualifies a listing when the part IS what is being sold: at the head of the title,
 * counted ("set de 5 ruedas"), or explicitly a spare.
 */
const ACCESSORY_PRODUCT =
  /^\s*(?:set|juego|kit|pack|combo)?\s*(?:de\s+)?(?:x\s*)?\d*\s*(?:ruedas?|rueditas?|apoyapi[eé]s|apoya\s*pies|fundas?|cubre[a-z]*|almohad[oó]n|cojines?|coj[ií]n|pist[oó]n|pistones|cilindros?|tapizados?)\b|\bde\s+repuestos?\b|\b(?:ruedas?|rueditas?|pistones?|cilindros?)\s+(?:para|de)\s+sillas?\b/i;

/** Brands that actually appear in the Uruguayan market, longest match first. */
const BRANDS: Array<{ brand: string; pattern: RegExp }> = [
  { brand: "Herman Miller", pattern: /\bherman\s*miller\b/i },
  { brand: "Steelcase", pattern: /\bsteelcase\b/i },
  { brand: "Humanscale", pattern: /\bhumanscale\b/i },
  { brand: "Haworth", pattern: /\bhaworth\b/i },
  { brand: "Ergohuman", pattern: /\bergohuman\b/i },
  { brand: "Secretlab", pattern: /\bsecret\s*lab\b/i },
  { brand: "Noblechairs", pattern: /\bnoble\s*chairs?\b/i },
  { brand: "DXRacer", pattern: /\bdx\s*racer\b/i },
  { brand: "Vigo", pattern: /\b(world\s*)?vigo\b/i },
  { brand: "Armo", pattern: /\barmo\b/i },
  { brand: "Imback", pattern: /\bimback\b/i },
  { brand: "Xtech", pattern: /\bx-?tech\b/i },
  { brand: "Redragon", pattern: /\bredragon\b/i },
  { brand: "Cougar", pattern: /\bcougar\b/i },
  { brand: "Corsair", pattern: /\bcorsair\b/i },
  { brand: "Thermaltake", pattern: /\bthermaltake\b/i },
  { brand: "Aerocool", pattern: /\baerocool\b/i },
  { brand: "Cooler Master", pattern: /\bcooler\s*master\b/i },
  { brand: "Logitech", pattern: /\blogitech\b/i },
  { brand: "Trust", pattern: /\btrust\s*gaming\b/i },
  { brand: "Genius", pattern: /\bgenius\b/i },
  { brand: "Kolke", pattern: /\bkolke\b/i },
  { brand: "Mox", pattern: /\bmox\b/i },
  { brand: "Nisuta", pattern: /\bnisuta\b/i },
  { brand: "Philco", pattern: /\bphilco\b/i },
  { brand: "Xion", pattern: /\bxion\b/i },
  { brand: "Global", pattern: /\bglobal\s+(?:office|chair)\b/i },
  { brand: "Sitag", pattern: /\bsitag\b/i },
  { brand: "Interion", pattern: /\binterion\b/i },
  { brand: "Bertoni", pattern: /\bbertoni\b/i },
  { brand: "Sillas Uruguay", pattern: /\bsillas\s+uruguay\b/i },
];

/** The brands the vision fallback is allowed to return: anything else would be invented. */
export const KNOWN_CHAIR_BRANDS: readonly string[] = BRANDS.map((entry) => entry.brand);

/**
 * Model names that identify the manufacturer on their own.
 *
 * `authoritative` ones are registered trademarks of a single maker: a Uruguayan store that lists
 * an "Embody" is reselling a Herman Miller, even though its own microdata names the store as the
 * brand. Those override whatever brand the page declares. The rest only fill in a missing brand.
 */
const KNOWN_MODELS: Array<{ brand: string; model: string; pattern: RegExp; authoritative: boolean }> = [
  { brand: "Herman Miller", model: "Aeron", pattern: /\baeron\b/i, authoritative: true },
  { brand: "Herman Miller", model: "Embody", pattern: /\bembody\b/i, authoritative: true },
  { brand: "Herman Miller", model: "Mirra 2", pattern: /\bmirra\s*2?\b/i, authoritative: true },
  { brand: "Herman Miller", model: "Sayl", pattern: /\bsayl\b/i, authoritative: true },
  { brand: "Herman Miller", model: "Cosm", pattern: /\bcosm\b/i, authoritative: true },
  { brand: "Herman Miller", model: "Verus", pattern: /\bverus\b/i, authoritative: true },
  { brand: "Herman Miller", model: "Setu", pattern: /\bsetu\b/i, authoritative: true },
  { brand: "Steelcase", model: "Leap", pattern: /\bleap\b/i, authoritative: true },
  { brand: "Steelcase", model: "Gesture", pattern: /\bgesture\b/i, authoritative: true },
  { brand: "Steelcase", model: "Series 1", pattern: /\bseries\s*1\b/i, authoritative: true },
  // "Atlas" and "Apolo" are also generic furniture names, so they never override a stated brand.
  { brand: "Vigo", model: "Atlas", pattern: /\batlas\b/i, authoritative: false },
  { brand: "Vigo", model: "Apolo", pattern: /\bapol[ol]?o\b/i, authoritative: false },
  { brand: "Vigo", model: "5K", pattern: /\b5k\b/i, authoritative: false },
];

/** Words that describe a chair but never identify one. */
const DESCRIPTORS = new Set([
  "silla",
  "sillas",
  "sillon",
  "sillones",
  "de",
  "del",
  "la",
  "el",
  "para",
  "con",
  "sin",
  "y",
  "escritorio",
  "oficina",
  "ergonomica",
  "ergonomico",
  "ergonomicas",
  "ergonomicos",
  "gamer",
  "gaming",
  "computadora",
  "computador",
  "pc",
  "estudio",
  "ejecutiva",
  "ejecutivo",
  "gerencial",
  "operativa",
  "operativo",
  "secretarial",
  "giratoria",
  "giratorio",
  "regulable",
  "reclinable",
  "respaldo",
  "alto",
  "bajo",
  "media",
  "malla",
  "mesh",
  "tela",
  "cuero",
  "eco",
  "ecocuero",
  "cuerina",
  "sintetico",
  "sintetica",
  "negra",
  "negro",
  "gris",
  "blanca",
  "blanco",
  "azul",
  "roja",
  "rojo",
  "verde",
  "beige",
  "marron",
  "rosa",
  "celeste",
  "violeta",
  "naranja",
  "amarilla",
  "amarillo",
  "multicolor",
  "cabecera",
  "apoyacabeza",
  "reposacabeza",
  "lumbar",
  "apoyabrazos",
  "reposabrazos",
  "ruedas",
  "nueva",
  "nuevo",
  "premium",
  "importada",
  "importado",
  "envio",
  "gratis",
  "cuotas",
  "oferta",
  "modelo",
  "color",
]);

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Is this listing a desk chair?
 *
 * `context` is whatever else the source knows — the product description, its category, its URL.
 * It matters because a furniture store lists "Silla LZ" with no adjective at all, and the only
 * thing separating a task chair from a dining chair is the copy around the title. The chair word
 * itself must still appear in the title, and the exclusion list is checked against everything:
 * "funda para silla de escritorio" is a cover, not a chair.
 */
export function isDeskChair(title: string, context = ""): boolean {
  const titleText = ` ${stripAccents(title)} `;
  const allText = ` ${stripAccents(`${title} ${context}`)} `;
  if (!CHAIR_WORD.test(titleText) && !CHAIR_WORD.test(allText)) return false;
  if (NOT_A_DESK_CHAIR.test(allText) || ACCESSORY_PRODUCT.test(title.trim())) return false;
  if (DESK_CONTEXT.test(allText)) return true;
  // A store that lists "Silla Sayl" says nothing about desks — but the model name already does.
  return KNOWN_MODELS.some((entry) => entry.authoritative && entry.pattern.test(titleText));
}

export const isDeskChairTitle = (title: string): boolean => isDeskChair(title);

/**
 * True when the text names something that is explicitly NOT a desk chair (casters, covers,
 * auditorium seating). Unlike {@link isDeskChair} it does not require the word "silla", so it can
 * be run over a stored product NAME ("Tcweb Rueda silla") rather than a listing title.
 */
export const looksLikeChairAccessory = (text: string, model = ""): boolean =>
  NOT_A_DESK_CHAIR.test(` ${stripAccents(text)} `) ||
  ACCESSORY_PRODUCT.test(stripAccents(model || text).trim());

export function chairCategory(title: string, attributes: Record<string, string> = {}): ChairCategory {
  const text = stripAccents(`${title} ${Object.values(attributes).join(" ")}`).toLowerCase();
  // Prefixes only, no trailing \b: Spanish inflects ("ejecutiva", "operativas", "ergonomico"),
  // and a closing boundary would only ever match the masculine singular.
  if (/\b(gamer|gaming|racing)/.test(text)) return "gaming";
  if (/\b(ergonomic|lumbar|malla|mesh|task)/.test(text)) return "ergonomic";
  if (/\b(ejecutiv|gerencial|director)/.test(text)) return "executive";
  if (/\b(operativ|secretarial|estudio|escritorio|oficina)/.test(text)) return "operative";
  return "unknown";
}

export interface ChairIdentity {
  brand: string;
  model: string;
  name: string;
  /** Merge key. Empty when the listing cannot be identified well enough to group. */
  key: string;
  slug: string;
  identified: boolean;
}

/** Company suffixes and country noise that a seller types into the model field. */
const MODEL_NOISE = new Set(["sa", "s", "a", "srl", "ltda", "ltd", "inc", "co", "uy", "uruguay", "importado"]);

const cleanModel = (value: string): string =>
  value
    .replace(/[|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

/** Tokens of a model that actually identify it — used for the merge key, not for display. */
function modelTokens(value: string): string[] {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !DESCRIPTORS.has(token) && !MODEL_NOISE.has(token));
}

/**
 * Marketplace sellers fill the "model" field with whatever they like — "giratoria ergonómica",
 * "escritorio mesh". A model made entirely of descriptors identifies nothing, so it is dropped and
 * the title gets a chance instead.
 */
const usableModel = (value: string): boolean => modelTokens(value).length > 0;

function modelFromTitle(title: string, brand: string): string {
  const withoutBrand = brand ? title.replace(new RegExp(brand.replace(/\s+/g, "\\s*"), "ig"), " ") : title;
  const tokens = stripAccents(withoutBrand)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !DESCRIPTORS.has(token));
  // A model is a short, distinctive tail: alphanumeric codes first, then remaining nouns.
  const codes = tokens.filter((token) => /\d/.test(token) && token.length <= 12);
  const words = tokens.filter((token) => !/\d/.test(token) && token.length >= 3);
  const picked = [...codes.slice(0, 2), ...words.slice(0, 2)];
  return cleanModel(picked.join(" "));
}

/**
 * Resolves the chair a listing refers to.
 *
 * `identified` is the contract the rest of the pipeline relies on: only identified chairs are
 * merged across sellers and get a rating, because merging on a description ("silla ergonómica
 * negra") would pool unrelated products into one fake average.
 */
export function identifyChair(input: {
  title: string;
  brand?: string;
  model?: string;
  /**
   * Used as the brand only when nothing else names one — a store's own unbranded line ("Silla
   * Michigan" at Bertoni). It keeps such a chair in the directory under an honest name while
   * making sure it can never merge with a same-named chair sold elsewhere.
   */
  fallbackBrand?: string;
  attributes?: Record<string, string>;
}): ChairIdentity {
  const title = input.title.trim();
  const hintedBrand = (input.brand || "").trim();
  const hintedModel = (input.model || "").trim();

  let brand =
    BRANDS.find((entry) => entry.pattern.test(title))?.brand ||
    BRANDS.find((entry) => hintedBrand && entry.pattern.test(hintedBrand))?.brand ||
    hintedBrand;
  let model = usableModel(hintedModel) ? hintedModel : "";

  const known = KNOWN_MODELS.find((entry) => entry.pattern.test(title));
  if (known) {
    if (known.authoritative) {
      brand = known.brand;
      model = known.model;
    } else if (!brand || brand.toLowerCase() === known.brand.toLowerCase()) {
      brand = known.brand;
      model = known.model;
    }
  }
  if (!model) model = modelFromTitle(title, brand);
  if (!brand && model && input.fallbackBrand) brand = input.fallbackBrand.trim();

  brand = brand.replace(/\s+/g, " ").trim().slice(0, 40);
  model = cleanModel(model);

  const normalizedBrand = normalizeChairName(brand);
  // The key ignores descriptors and company suffixes so "Lumax ROM SA" and "Lumax ROM" are one
  // chair, while the displayed model keeps whatever the seller actually wrote.
  const normalizedModel = modelTokens(model).join(" ");
  const identified =
    Boolean(normalizedBrand && normalizedModel) &&
    // "DeTodo De Todo" is a seller name echoed into the model field, not a chair.
    normalizedBrand !== normalizedModel &&
    // A model made only of one- or two-letter fragments identifies nothing.
    modelTokens(model).some((token) => token.length >= 3);
  const name = identified ? `${brand} ${model}`.replace(/\s+/g, " ").trim() : title.slice(0, 90);
  const key = identified ? `${normalizedBrand}|${normalizedModel}` : "";
  return {
    brand,
    model,
    name,
    key,
    slug: identified ? `${normalizedBrand}-${normalizedModel}`.replace(/\s+/g, "-") : "",
    identified,
  };
}

/** Identity of a listing, letting a store stand in as the brand for its own unbranded lines. */
export const identityForListing = (listing: ChairListing): ChairIdentity =>
  identifyChair({
    title: listing.title,
    brand: listing.brand,
    model: listing.model,
    attributes: listing.attributes,
    fallbackBrand: listing.source === "store" ? listing.sellerName : "",
  });

/** Groups listings that describe the same physical chair. */
export function groupListings(listings: readonly ChairListing[]): Map<string, ChairListing[]> {
  const byCatalog = new Map<string, string>();
  const groups = new Map<string, ChairListing[]>();

  // First pass: a marketplace catalogue id is authoritative, so let it fix the key for its group.
  for (const listing of listings) {
    const identity = identityForListing(listing);
    if (listing.catalogId && identity.key && !byCatalog.has(listing.catalogId)) {
      byCatalog.set(listing.catalogId, identity.key);
    }
  }

  for (const listing of listings) {
    const identity = identityForListing(listing);
    const key = (listing.catalogId && byCatalog.get(listing.catalogId)) || identity.key;
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(listing);
    groups.set(key, bucket);
  }
  return groups;
}
