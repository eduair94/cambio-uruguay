// What a Facebook Marketplace item page adds to a rental advert, and how much of it we believe.
//
// The bridge (:9657) gives a card: title, price, city, photo. The item page adds the DESCRIPTION,
// which is where the seller writes the barrio ("Zona Piedras Blancas"), the corner ("Ladines y
// José Llupes") or the address ("Felipe Argentó 467"). Measured 2026-09-22 over 100 fichas of
// adverts whose title named no barrio: 89 had a description, 31 named a barrio in it, 17 named a
// corner or a numbered address. Nothing else on the page locates the flat: the pin is a ~1 km grid
// point 3–6 km off in Montevideo, `walk_score`/`transit_score` are null, `nearby_*` empty,
// `home_address` says "Canelones". So this module reads the description and the pin's CITY (only
// to fill a missing department), and turns corners into coordinates through a geocoder with a rule
// strict enough to refuse Google's fallback answer — the centroid of a single street.
//
// Pure: no network, no database. The reader (sync_rentals_detail.ts) and the harvester call it.
import { fbNodes } from "../facebook/graphql";
import { rentalDescription } from "./details";
import { neighborhoodFromText } from "./neighborhoods";
import { canonicalDepartment, flatten } from "./normalize";

export interface FbRentalDetail {
  /** Marketplace item id (the listingId without the `facebook:` prefix). */
  id: string;
  readAt: string;
  /** False when the page carried no listing node (removed, private, or a login wall we did not hit). */
  found: boolean;
  title: string | null;
  /** Sanitized: no phones, emails, links or handles cross into the catalogue. Empty when absent. */
  description: string;
  /** The pin's reverse-geocoded city and postal code. Never a coordinate for the map. */
  pinCity: string | null;
  pinPostal: string | null;
  pinLat: number | null;
  pinLng: number | null;
  isLive: boolean;
}

const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** The item page's listing node, or `found: false`. The seller node is never read. */
export function fbRentalDetailFromTexts(id: string, texts: readonly string[], readAt: string): FbRentalDetail {
  const nodes = fbNodes(texts, node => node.id === id && !!node.listing_price && (!!node.redacted_description || !!node.location));
  const empty: FbRentalDetail = { id, readAt, found: false, title: null, description: "", pinCity: null, pinPostal: null, pinLat: null, pinLng: null, isLive: true };
  if (!nodes.length) return empty;
  const node = Object.assign({}, ...nodes);
  const geo = node.location?.reverse_geocode_detailed;
  return {
    ...empty,
    found: true,
    title: text(node.marketplace_listing_title),
    description: rentalDescription(node.redacted_description?.text, 4_000),
    pinCity: text(geo?.city),
    pinPostal: text(geo?.postal_code),
    pinLat: finite(node.location?.latitude),
    pinLng: finite(node.location?.longitude),
    isLive: node.is_live !== false && node.is_sold !== true,
  };
}

// --- Address candidates ------------------------------------------------------------------------

/** A description is read in segments; only a segment with a locative anchor may carry an address. */
const SEGMENT_SPLIT = /[\n|•▪✅✨🏡🏠💥📌🔑‼️!?;]+|\.(?=\s|$)|\s[–—-]\s|(?<=\S)\s*📍\s*/u;
/** "Av. 18 de Julio", "Gral. Flores": the dot of an abbreviation is not the end of a sentence. */
const ABBREVIATION = /\b(av|avda|gral|grl|dr|dra|ing|esq|bvar|blvd|cno|ma|sta|sto|pte|prof|cnel|tte|cap|brig|pbro|mons)\.\s*/giu;
const ANCHOR = /(?:^|\b)(?:calle|esq\.?|esquina|entre|sobre|ubicad[oa]s?\s+en|ubicaci[oó]n|direcci[oó]n|zona|en)\b|📍/iu;
/** A street name: a word, then up to four more (digits allowed inside: "Av. 18 de Julio"). */
const NOT_CONNECTOR = "(?!(?:y|e|entre|esq|esquina|casi)\\b)";
const NAME = `${NOT_CONNECTOR}[A-Za-zÁÉÍÓÚÑÜáéíóúñü][\\wÁÉÍÓÚÑÜáéíóúñü.]*(?:\\s+${NOT_CONNECTOR}[\\wÁÉÍÓÚÑÜáéíóúñü][\\wÁÉÍÓÚÑÜáéíóúñü.]*){0,4}`;
/** Anchors and articles that lead into a street but are not part of its name. */
const LEAD = /^(?:(?:sobre|calle|en|la|el|los|las|de|del|zona|ubicad[oa]s?|direcci[oó]n|esq\.?|esquina|entre|av\.?|avda\.?|avenida|bvar\.?|bulevar|cno\.?|camino)\s+)+/iu;
const FUNCTION_WORD = /^(?:la|el|los|las|de|del|desde|hasta|para|con|por|calle|sobre|en|zona|y|e|esq|esquina|entre|casi|av|avda|avenida|bvar|bulevar|cno|camino|ruta|rambla|ubicado|ubicada|direccion|n)$/i;
/** A street that starts with a number is a date-named street ("18 de Julio", "8 de Octubre"). */
const DATE_STREET = "\\d{1,2}\\s+de\\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+";
const CORNER = new RegExp(`\\b(${NAME})\\s+(y|e|esq\\.?|esquina|casi|entre)\\s+((?:${DATE_STREET}|${NAME}))`, "u");
/** Left of the connector, the street starts after the last of these; right of it, it ends at the first. */
const LEFT_CUT = /^(?:en|sobre|calle|ubicad[oa]s?|zona|direcci[oó]n|esq|esquina|entre|casi|y|e|pleno|barrio|bo|con)$/i;
const RIGHT_CUT = /^(?:a|al|con|para|por|cerca|prox|pr[oó]ximo|frente|cuadras?|metros|mts?|m|km|en|sobre|zona|desde|hasta|se|es|hay|tiene)$/i;
const cutLeft = (value: string): string => {
  const tokens = value.split(/\s+/);
  let start = 0;
  tokens.forEach((token, index) => { if (LEFT_CUT.test(token) || STOP.test(token)) start = index + 1; });
  return tokens.slice(start).join(" ");
};
const cutRight = (value: string): string => {
  const tokens = value.split(/\s+/);
  const end = tokens.findIndex((token, index) => index > 0 && (RIGHT_CUT.test(token) || STOP.test(token)));
  return (end === -1 ? tokens : tokens.slice(0, end)).join(" ");
};
const NUMBERED = new RegExp(`\\b(?:calle|av\\.?|avda\\.?|avenida|bvar\\.?|bulevar|cno\\.?|camino|ruta|rambla|sobre|en|direcci[oó]n)\\s+(${NAME})\\s+(?:n[°º]?\\.?\\s*)?(\\d{2,5})(?!\\s*(?:m2|m²|mts?|metros|pesos|usd|u\\$s|\\$|mil|%|hs|am|pm|dorm|a[ñn]os|cuadras?))\\b`, "iu");
/** Words of the dwelling, the deal or the pitch: a "corner" built from them is not an address. */
const STOP = /\b(?:dormitorios?|dorm|ba[ñn]os?|patio|cochera|garaje|garage|terraza|parrillero|cocina|living|comedor|luz|agua|gastos|gc|luc|anda|porto|contadur[ií]a|garant[ií]as?|dep[oó]sito|amueblad[oa]|amoblad[oa]|estrenar|balc[oó]n|fondo|jard[ií]n|azotea|pesos|mes|meses|precio|personas?|mascotas|ni[ñn]os|hombres|mujeres|estudiantes|whatsapp|m2|metros|piso|planta|ascensor|inmobiliaria|contrato|seguro|sura|mapfre|alquiler|alquilo|casa|apartamento|apto|habitaci[oó]n|privacidad|tranquilidad|ampli[oa]s?|ventilad[oa]s?|techado|ideal|excelente|hermos[oa]|c[oó]mod[oa]|incluid[oa]s?|internet|wifi|cable|tv|heladera|cama|placard|ropero|escritorio|seguridad|estilo|conectividad|acceso|servicios|entorno|cercan[ií]a|vista|mar|playa|sol|estudiar|trabajar|vivir)\b/iu;

/**
 * Corners ("Guillermo Rodríguez esquina San Martín") and numbered addresses ("Felipe Argentó 467")
 * the text names, at most three, in the order they appear. Precision first: a segment without a
 * locative anchor or with a word of the dwelling in the span yields nothing.
 */
export function addressCandidates(text: string): string[] {
  const out: string[] = [];
  /** A street needs a word of its own: "la calle desde el" is articles all the way down. */
  const hasContent = (value: string): boolean =>
    flatten(value).split(/[^a-z0-9]+/).some(token => token.length >= 3 && !FUNCTION_WORD.test(token) && !/^\d+$/.test(token));
  const push = (value: string) => {
    const clean = value.replace(LEAD, "").replace(/\s+/g, " ").replace(/[.,;:]+$/g, "").trim();
    if (clean.length < 6 || clean.length > 80 || !hasContent(clean)) return;
    if (!out.some(existing => flatten(existing) === flatten(clean))) out.push(clean);
  };
  const segments = String(text || "").replace(/\+/g, " ").replace(ABBREVIATION, "$1 ").split(SEGMENT_SPLIT).map(segment => segment.trim()).filter(segment => segment.length >= 6 && segment.length <= 160);
  for (const segment of segments) {
    if (!ANCHOR.test(segment)) continue;
    const corner = CORNER.exec(segment);
    if (corner) {
      const left = cutLeft(corner[1]!);
      const right = cutRight(corner[3]!);
      if (left && right && !STOP.test(`${left} ${right}`) && hasContent(left) && hasContent(right)) push(`${left} ${corner[2]} ${right}`);
    }
    const numbered = NUMBERED.exec(segment);
    if (numbered && !STOP.test(numbered[1]!)) {
      // "desde el 2026", "en el 2024": a year after an article is a date, not a door.
      const lead = flatten(numbered[1]!).split(/\s+/).slice(-2).join(" ");
      if (!/(?:^|\s)(?:desde|hasta|el|ano|anio)$/.test(lead)) push(`${numbered[1]} ${numbered[2]}`);
    }
    if (out.length >= 3) break;
  }
  return out;
}

// --- Geocoder acceptance -----------------------------------------------------------------------

export interface GeocodePoint {
  latitude: number;
  longitude: number;
  /** Google's formatted address, kept as the audit trail of why the point was believed. */
  address: string;
}

const inUruguay = (lat: number, lng: number): boolean => lat >= -35.1 && lat <= -30 && lng >= -58.6 && lng <= -53;

/**
 * Whether a Google Geocoding result is the place the text named.
 *
 * Measured 2026-09-22: when Google cannot find an intersection it answers the centroid of ONE of
 * the streets ("Guillermo Rodríguez esq San Martín" → Gral. San Martín, CP 15000, 10 km from the
 * Cerrito), and it will read a stray number as a house number ("Septiembre 2026" → "Basilio
 * Araújo 2026"). So: the answer must be an intersection ("&" in the formatted address) that shares
 * a word with the query, or a rooftop/interpolated address whose number was in the query.
 */
export function acceptGeocode(query: string, result: unknown): GeocodePoint | null {
  const r = result as { formatted_address?: unknown; geometry?: { location?: { lat?: unknown; lng?: unknown }; location_type?: unknown } } | null;
  const lat = finite(r?.geometry?.location?.lat);
  const lng = finite(r?.geometry?.location?.lng);
  if (lat === null || lng === null || !inUruguay(lat, lng)) return null;
  const address = typeof r?.formatted_address === "string" ? r.formatted_address : "";
  const formatted = flatten(address);
  const words = flatten(query).split(/[^a-z0-9]+/).filter(word => word.length >= 5);
  const overlap = words.some(word => formatted.includes(word));
  const type = String(r?.geometry?.location_type || "");
  if (formatted.includes("&")) return overlap ? { latitude: lat, longitude: lng, address } : null;
  if (type !== "ROOFTOP" && type !== "RANGE_INTERPOLATED") return null;
  const number = /\b(\d{2,5})\b/.exec(query)?.[1];
  return number && formatted.includes(number) && overlap ? { latitude: lat, longitude: lng, address } : null;
}

/** The query that goes to the geocoder: the candidate, the city, the country. */
export function geocodeQuery(candidate: string, department: string): string {
  const city = department && department !== "Montevideo" ? department : "Montevideo";
  return `${candidate}, ${city}, Uruguay`;
}

// --- Barrio and department from everything the advert says -----------------------------------

export interface FacebookRentalLocation {
  neighborhood: string;
  department: string;
}

/**
 * Title first, then description, both against the card's department; the pin's city only fills
 * a department the card did not bring. A cue-only word ("Centro") never names a department.
 */
export function locateFacebookRental(input: { title: string; description?: string | null; department: string; cardNeighborhood?: string; pinCity?: string | null }): FacebookRentalLocation {
  const department = input.department || canonicalDepartment(input.pinCity || "");
  const named = neighborhoodFromText(input.title, department) || (input.description ? neighborhoodFromText(input.description, department) : null);
  return {
    neighborhood: named?.neighborhood || input.cardNeighborhood || "",
    department: department || named?.department || "",
  };
}
