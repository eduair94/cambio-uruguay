import { rentalDescription } from "../rentals/details";
import { rentalMatchHasConflicts, type RentalMatchCandidate } from "../rentals/matchEvidence";
import type {
  OpportunityAnalysisOptions,
  OpportunityAnalysisResult,
  OpportunityCaution,
  OpportunityComparable,
  OpportunityComparisonScope,
  OpportunityExclusion,
  OpportunityFeature,
  OpportunityItem,
  OpportunityListing,
  OpportunityOperation,
  OpportunityOperationStats,
  OpportunityPublicListing,
  OpportunityRisk,
  OpportunitySignal,
} from "./types";

// Product eligibility rules, not industry-prescribed accuracy or probability thresholds.
// Small, recent cohorts and a second per-area check deliberately sacrifice recall.
export const OPPORTUNITY_POLICY = Object.freeze({
  freshDays: 3,
  areaTolerance: 0.15,
  minimumComparables: 8,
  maximumComparables: 24,
  maximumPerSeller: 2,
  minimumSellers: 4,
  maximumSpread: 0.30,
  minimumGap: 0.15,
  minimumConservativeGap: 0.05,
  minimumPerAreaGap: 0.10,
  maximumGap: 0.45,
});

// Exploratory comparisons remain a separate evidence tier. Their cohort is selected
// by physical facts and sample independence before any asking price is inspected.
const EXPLORATORY_POLICY = Object.freeze({
  minimumComparables: 5, minimumSellers: 3, widerAreaTolerance: 0.25,
  maximumSpread: 0.25, minimumTotalGap: 0.10, minimumRentGap: 0.05,
  minimumPerAreaGap: 0.20, minimumPerAreaQ25Gap: 0.10,
  minimumOmittedSellerTotalGap: 0.05, minimumOmittedSellerPerAreaGap: 0.15,
});

const DAY = 86_400_000;
const SOURCES = new Set(["infocasas", "mercadolibre", "casasweb", "elpais", "facebook"]);
const RISKS = new Set<OpportunityRisk>([
  "temporary", "partial_price", "occupied", "unavailable", "needs_renovation", "restricted_rights",
  "project", "multiple_units", "price_on_request", "extra_purchase_costs", "special_layout", "location_conflict", "attribute_conflict",
]);
const text = (value: unknown) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const round = (value: number, digits = 0) => Number(value.toFixed(digits));
const meets = (value: number, minimum: number) => value + 1e-10 >= minimum;
const publicText = (value: unknown, max: number) => rentalDescription(value, max);

const HOSTS: Record<OpportunityListing["source"], { advert: string[]; image: string[] }> = {
  infocasas: { advert: ["infocasas.com.uy"], image: ["infocasas.com.uy"] },
  mercadolibre: { advert: ["mercadolibre.com.uy"], image: ["mlstatic.com"] },
  facebook: { advert: ["facebook.com"], image: ["fbcdn.net"] },
  casasweb: { advert: ["casasweb.com"], image: ["casasweb.com", "static.tokkobroker.com"] },
  elpais: { advert: ["inmuebles.elpais.com.uy"], image: ["imagenes.gallito.com.uy"] },
};

function publicUrl(value: unknown, source?: OpportunityListing["source"], kind: "advert" | "image" = "advert"): string | null {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (source && !HOSTS[source]?.[kind].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    return url.href;
  } catch { return null; }
}

function date(value: unknown): number {
  const raw = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(raw)) return NaN;
  return Date.parse(raw);
}

/** Exclusions use the subject's own prose. They neither correct attributes nor prove identity. */
export function opportunityRisks(listing: OpportunityListing): OpportunityRisk[] {
  const found = new Set((listing.riskFlags ?? []).filter(risk => RISKS.has(risk)));
  const own = text(`${listing.title}\n${listing.description}`);
  const statusTitle = text(listing.title).replace(/^[\s[(]+/, "");
  const statusLines = `${listing.title}\n${listing.description}`.split(/\r?\n/).map(text).join("\n");
  if (/^(?:reservad[oa]|vendid[oa]|no disponible)\b/.test(statusTitle) ||
    /\b(?:inmueble|apartamento|apto|unidad|propiedad|casa)\s+(?:(?:esta|se encuentra)\s+)?(?:actualmente\s+)?(?:reservad[oa]|vendid[oa]|no disponible)\b/.test(own) ||
    /(?:^|\n)(?:estado\s*:\s*|actualmente )?(?:reservad[oa]|vendid[oa]|no disponible)[.!]?\s*(?:\n|$)/.test(statusLines))
    found.add("unavailable");
  if (/\b(?:temporario|temporaria|temporal|turistico|invernal|quincena)\b|\balquiler (?:de |por )?(?:invierno|temporada)\b|\b(?:por|la) (?:noche|semana)\b/.test(own))
    found.add("temporary");
  if (/\b(?:anticipo|adelanto|entrega inicial|saldo financiado|precio de la cuota)\b|\bdesde\s*(?:u\s*\$\s*s?|usd|uyu|\$|\d)|\b\d+[\d.,]*\s*(?:cuotas|mensualidades)\b|\bcuotas?\s*(?:de|desde|:|usd|u\s*\$|\$)/.test(own))
    found.add("partial_price");
  const nonNegated = own.replace(/\b(?:no (?:(?:esta|se encuentra|se vende|es) )?(?:actualmente )?(?:ocupad[oa]|alquilad[oa]|arrendad[oa])|sin (?:ocupantes|inquilinos|renta))\b/g, " ");
  if (/\b(?:con renta|con inquilinos?|actualmente alquilad[oa]|actualmente arrendad[oa]|se vende alquilad[oa]|se vende con ocupantes|ocupad[oa] por|inmueble ocupado|vivienda ocupada)\b/.test(nonNegated))
    found.add("occupied");
  if (/\brenta activa\b/.test(nonNegated.replace(/\bno (?:(?:genera|tiene) |cuenta con (?:una )?)renta activa\b/g, " ")))
    found.add("occupied");
  const occupancyLines = `${listing.title}\n${listing.description}`.split(/\r?\n/).map(text).join("\n")
    .replace(/\b(?:no (?:(?:esta|se encuentra|se vende|es) )?(?:actualmente )?|(?:anteriormente |antes |estuvo |fue )|(?:puede ser |podria ser |para ser |sera ))(?:alquilad[oa]|arrendad[oa])\b/g, " ");
  if (/(?:^|[\n.!?;]\s*)(?:alquilad[oa]|arrendad[oa])(?=\s*(?:[,.;:]|con contrato|$))|\b(?:esta|se encuentra)\s+(?:actualmente\s+)?(?:alquilad[oa]|arrendad[oa])\b|\b(?:alquilad[oa]|arrendad[oa])\s+con\s+contrato\b/.test(occupancyLines))
    found.add("occupied");
  const renovation = own.replace(/\b(?:no (?:requiere|necesita) (?:reforma|reciclaje|arreglos)|sin necesidad de (?:reforma|reciclaje|arreglos))\b/g, " ");
  if (/\b(?:a reciclar|para reciclar|a reformar|para reformar|a refaccionar|para refaccionar|requiere (?:reforma|reciclaje|arreglos)|necesita (?:reforma|reciclaje|arreglos))\b/.test(renovation))
    found.add("needs_renovation");
  // An explicit pending repair is different from a historical repaint or a cosmetic preference.
  if (/\b(?:esta|se encuentra)\s+para hacer arreglos\b/.test(renovation)) found.add("needs_renovation");
  if (/\b(?:nuda propiedad|derechos? posesorios?|cesion de (?:derechos|alquiler|contrato)|derechos? hereditarios?|parte indivisa|remate|cooperativa|derecho de uso|usufructo)\b/.test(own))
    found.add("restricted_rights");
  if (/\b(?:en pozo|en construccion|nuevo proyecto|proyecto en|hasta finalizar la obra|entrega (?:prevista|estimada|en 20\d{2})|ocupacion (?:prevista|en 20\d{2}))\b|\b(?:ocupacion|entrega)\b.{0,45}\b(?:sera|fijada|prevista|estimada)\b.{0,50}\b20\d{2}\b|\bla construccion\b.{0,65}\bsera\b/.test(own))
    found.add("project");
  if (/\bla estructura sera de hormigon\b/.test(own)) found.add("project");
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const readDate = new Date(listing.lastSeen);
  for (const match of own.matchAll(/\b(?:ocupacion|entrega)\s+(?:en\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(20\d{2})\b/g)) {
    if (Number.isFinite(readDate.getTime()) && (Number(match[2]) > readDate.getUTCFullYear() ||
      (Number(match[2]) === readDate.getUTCFullYear() && months.indexOf(match[1]!) > readDate.getUTCMonth()))) found.add("project");
  }
  if (/\b(?:block de|bloque de|lote de|paquete de) (?:apartamentos|casas|unidades)\b|\b(?:dos|tres|cuatro|[2-9]) (?:casas|apartamentos) (?:en|independientes|juntos)|\bcasa (?:con|mas|y) (?:un |una |dos |[2-9] )?apartamento\b/.test(own))
    found.add("multiple_units");
  if (/\b(?:consultar precio|precio a consultar|precio de referencia|precio ilustrativo)\b/.test(own))
    found.add("price_on_request");
  if (/\b(?:esta publicacion|este aviso)\s+(?:muestra|presenta)\s+una unidad de referencia\b/.test(own))
    found.add("price_on_request");
  if (listing.operation === "sale" && /\b(?:garaje|garage|cochera|conexiones|gastos de ocupacion)\b.{0,35}\b(?:aparte|adicional|no incluid[oa]s?|se vende por separado)\b/.test(own))
    found.add("extra_purchase_costs");
  // "The price does not include occupation costs" means an additional charge, not no costs.
  const occupationCosts = own.replace(/\b(?:sin|no (?:tiene|hay))\s+(?:gastos|gtos\.?) (?:de )?ocupacion\b/g, " ");
  if (listing.operation === "sale" && /\b(?:gastos|gtos\.?) (?:de )?ocupacion\s*(?:[:=]|del?|son)?\s*\d|\+\s*(?:gastos|gtos\.?) (?:de )?ocupacion\b/.test(occupationCosts))
    found.add("extra_purchase_costs");
  const combinedOccupationCosts = [...occupationCosts.matchAll(/\b(?:gastos|gtos\.?) (?:de )?ocupacion\s*(?:\+|y)\s*(?:conexiones|reglamento)\b[^.!?]{0,140}/g)];
  if (listing.operation === "sale" && combinedOccupationCosts.some(match => /\d+(?:[.,]\d+)?\s*%/.test(match[0]) &&
    !/\bincluid[oa]s?\b|\ba cargo del vendedor\b/.test(match[0].replace(/\bno (?:estan |estaran )?incluid[oa]s?\b/g, " "))))
    found.add("extra_purchase_costs");
  const connectionCosts = [...occupationCosts.matchAll(/\bconexiones\s*[:=]\s*\d+(?:[.,]\d+)?\s*%[^.!?]{0,60}/g)];
  if (listing.operation === "sale" && connectionCosts.some(match =>
    !/\bincluid[oa]s?\b|\ba cargo del vendedor\b/.test(match[0].replace(/\bno (?:estan |estaran )?incluid[oa]s?\b/g, " "))))
    found.add("extra_purchase_costs");
  if (listing.operation === "sale" && /\bal precio (?:publicado )?se debe agregar (?:un )?\d+(?:[.,]\d+)?\s*%\s+(?:correspondiente a |de )?(?:conexiones|gastos de ocupacion)\b/.test(own))
    found.add("extra_purchase_costs");
  if (listing.operation === "sale" && /\+\s*\d+(?:[.,]\d+)?\s*%\s*(?:de )?(?:gastos|gtos\.?) (?:de )?ocupacion\b/.test(occupationCosts))
    found.add("extra_purchase_costs");
  if (/\b(?:dormitorio|habitacion)\b.{0,30}\b(?:ciego|ciega|sin ventanas|no tiene ventanas)\b|\b(?:entrada compartida|ingreso compartido|acceso compartido|acceso por patio comun|subsuelo|sotano)\b|\b(?:actualmente )?(?:equipad[oa]|acondicionad[oa]) para (?:escritorio|oficinas?)\b/.test(own))
    found.add("special_layout");
  if (/\b(?:inmueble|apartamento|apto|unidad)\s+(?:(?:es|esta)\s+)?actualmente\s+(?:utilizad[oa]|usad[oa]|destinad[oa])\s+(?:como|para)\s+(?:oficinas?|escritorio)\b/.test(own))
    found.add("special_layout");
  if (/\b(?:arquitectura|distribucion) multinivel (?:estilo |tipo )?loft\b/.test(own) && /\barea social y dormitorio\b/.test(own))
    found.add("special_layout");
  if (explicitMoneyConflict(listing)) found.add("attribute_conflict");
  if (positive(listing.parkingSpaces) && /\b(?:opcion (?:de )?(?:(?:alquilar|comprar) )?(?:cochera|garaje|garage)|(?:cochera|garaje|garage) opcional)\b/.test(own))
    found.add("attribute_conflict");
  const evidence: RentalMatchCandidate = {
    source: listing.source, listingId: listing.listingId,
    title: listing.title.replace(/^(?:venta|vendo|se vende|en venta)\s+(?:de\s+)?/i, ""),
    description: "", image: listing.image,
    department: listing.department, locality: listing.locality, neighborhood: listing.neighborhood,
    address: listing.address ?? "", street: "", streetNumber: "",
    propertyType: listing.propertyType, bedrooms: listing.bedrooms, bathrooms: listing.bathrooms,
    area: listing.area?.value ?? null, parkingSpaces: listing.parkingSpaces, priceUyu: 0,
  };
  // Identity's stricter whole-description floor/unit veto is inappropriate here:
  // a first-floor apartment may legitimately have its gym on the ground floor.
  if (rentalMatchHasConflicts(evidence) || explicitPhysicalConflict(listing)) found.add("attribute_conflict");
  return [...found].sort();
}

function explicitPhysicalConflict(listing: OpportunityListing): boolean {
  const own = text(`${listing.title}\n${listing.description}`);
  const counts: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
  const values = (pattern: RegExp) => [...own.matchAll(pattern)].map(match => counts[match[1]!] ?? Number(match[1]));
  const beds = values(/\b(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|dorms?|bedrooms?)\b/g);
  if (/\bmono\s*ambiente\b/.test(own)) beds.push(0);
  const baths = values(/\b(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis)\s*banos?\b/g);
  if (beds.some(value => value !== listing.bedrooms) || baths.some(value => value !== listing.bathrooms)) return true;
  if (listing.area?.basis === "built") {
    if (listing.propertyType === "apartamento") for (const line of listing.description.split(/\r?\n/)) {
      // An isolated heading describes the dwelling. Do not treat a patio/garage,
      // an explicitly total area, or a bare unrelated distance as built surface.
      const match = text(line).match(/^(?:caracteristicas|superficie|metraje|tamano)\s*[:=-]\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mtrs?|mts?|metros(?: cuadrados)?)\s*\.?$/);
      if (!match) continue;
      const value = parsePublishedNumber(match[1]!);
      if (positive(value) && Math.abs(value - listing.area.value) > Math.max(2, listing.area.value * 0.10)) return true;
    }
    const declared = /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts?2?|metros(?: cuadrados)?)\s*(?:propios|privados|interiores|cubiertos|construidos|edificados)\b/g;
    for (const match of own.matchAll(declared)) {
      const prefix = own.slice(Math.max(0, (match.index || 0) - 65), match.index);
      // A covered balcony, garage or patio is not the dwelling's built area.
      if (/\b(?:terraza|balcon|patio|garaje|cochera|deposito|barbacoa)(?:\s+cubiert[oa])?(?:\s+de)?\s*$/.test(prefix)) continue;
      const value = parsePublishedNumber(match[1]!);
      if (positive(value) && Math.abs(value - listing.area.value) > Math.max(2, listing.area.value * 0.10)) return true;
    }
  }
  return false;
}

function parsePublishedNumber(raw: string): number {
  const stripped = raw.replace(/\s/g, "").replace(/[.,]+$/, "");
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(stripped)) return Number(stripped.replace(/[.,]/g, ""));
  return Number(stripped.replace(/,(?=\d{1,2}$)/, "."));
}

/** Only labelled amounts can contradict a price. A bare unrelated number cannot. */
function explicitMoneyConflict(listing: OpportunityListing): boolean {
  const own = text(`${listing.title}\n${listing.description}`);
  const expenses = /\b(?:gastos comunes|gc)\s*(?:(?:son|ascienden|mensuales|aproximados|aproximadamente|aprox\.?|estimados|variables|promedio|de|a|:|=)\s*){0,5}(usd|u\s*\$\s*[sd]|us\$|uyu|uy\$|\$)?\s*(\d[\d.,]*)/g;
  if (listing.expenses) for (const match of own.matchAll(expenses)) {
    const number = parsePublishedNumber(match[2]!);
    if (!Number.isFinite(number) || number < 0) continue;
    const symbol = match[1] || "";
    const currency = /usd|us\$|u\s*\$\s*[sd]/.test(symbol) ? "USD" : symbol ? "UYU" : listing.expenses.currency;
    let tail = own.slice((match.index ?? 0) + match[0].length);
    const range = tail.match(/^\s*(?:[-–—]|a|hasta)\s*(usd|u\s*\$\s*[sd]|us\$|uyu|uy\$|\$)?\s*(\d[\d.,]*)/);
    const rangeCurrency = range?.[1] ? /usd|us\$|u\s*\$\s*[sd]/.test(range[1]) ? "USD" : "UYU" : currency;
    const rangeNumber = range ? parsePublishedNumber(range[2]!) : NaN;
    const hasRange = Number.isFinite(rangeNumber) && rangeNumber >= 0 && rangeCurrency === currency;
    if (hasRange) tail = tail.slice(range![0].length);
    const approximate = /\b(?:aprox|aproximad[oa]s?|aproximadamente|estimad[oa]s?|variables?|promedio)\b/.test(match[0]) ||
      /^\s*(?:(?:pesos|mensuales)\s*){0,2}(?:[([]\s*)?(?:aprox|aproximad[oa]s?|aproximadamente|estimad[oa]s?|variables?|promedio)\b/.test(tail);
    const low = hasRange ? Math.min(number, rangeNumber) : number;
    const high = hasRange ? Math.max(number, rangeNumber) : number;
    const distance = Math.max(low - listing.expenses.amount, listing.expenses.amount - high, 0);
    if ((listing.expenses.amount === 0 && number > 0) || (currency === listing.expenses.currency &&
      distance > Math.max(1, listing.expenses.amount * (approximate ? 0.10 : 0.01)))) return true;
  }
  const label = listing.operation === "rent" ? "alquiler" : "venta";
  const prices = new RegExp(`\\b(?:precio(?: de ${label})?|${label})\\s*(?:(?:mensual|de|:|=)\\s*){0,3}(usd|u\\s*\\$\\s*[sd]|us\\$|uyu|uy\\$|\\$)\\s*(\\d[\\d.,]*)`, "g");
  for (const match of own.matchAll(prices)) {
    const amount = parsePublishedNumber(match[2]!);
    const currency = /usd|us\$|u\s*\$\s*[sd]/.test(match[1]!) ? "USD" : "UYU";
    if (currency === listing.price.currency && Number.isFinite(amount) &&
      Math.abs(amount - listing.price.amount) > Math.max(1, listing.price.amount * 0.01)) return true;
  }
  return Boolean(listing.expenses && listing.expenses.amount > 0 && /\bsin gastos comunes\b/.test(own));
}

/** Source barrio names supply a vocabulary; prose only vetoes, never relocates an advert. */
export function opportunityLocationConflict(listing: OpportunityListing, neighborhoodNames: readonly string[]): boolean {
  const title = ` ${text(listing.title).replace(/[^a-z0-9 ]/g, " ")} `;
  const own = text(listing.neighborhood);
  const namesIn = (segment: string) => {
    const matches = neighborhoodNames.filter(name => name.length >= 5 && segment.includes(` ${name} `));
    // "Pocitos" inside "Pocitos Nuevo" is not a second location declaration.
    return matches.filter(name => !matches.some(longer => longer !== name && longer.includes(name)));
  };
  const titleNames = namesIn(title);
  if (titleNames.length && !titleNames.includes(own))
    return true;
  // The property introduction can disagree with both title and structured barrio.
  // Do not read agencies' branch addresses or "near X" as a location declaration.
  const intro = text(listing.description).slice(0, 300).split(/(?<=[.!?])\s/)[0] || "";
  if (namesIn(` ${intro.replace(/[^a-z0-9 ]/g, " ")} `).includes(own)) return false;
  return neighborhoodNames.some(name => name !== own && name.length >= 5 &&
    new RegExp(`\\b(?:en (?:el )?(?:barrio(?: de)? )?|barrio(?: de)? |zona de )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\W|$)`).test(intro));
}

interface Eligible {
  raw: OpportunityListing;
  price: number;
  rent: number;
  scope: string;
  seller: string;
  image: string;
  address: string;
  profile: string;
  description: string;
}

/** Equality of stated features, without assigning made-up monetary premiums. */
function amenityProfile(listing: OpportunityListing): string {
  const own = text(`${listing.title} ${listing.description}`);
  const facilities = new Set((listing.amenities ?? []).map(text));
  const access = /\b(?:por (?:(?:una?|la|comoda|amplia|corta|segura)\s+){0,3}escaleras?|piso (?:x )?escaleras?|sin ascensor)\b/.test(own)
    ? "stairs" : /\bascensor(?:es)?\b/.test(own) || facilities.has("ascensor") || facilities.has("ascensores") ? "elevator" : "unknown";
  // Kitchen cupboards are fixtures, not evidence that the dwelling is furnished.
  const furnishingText = own.replace(/\b(?:con )?muebles\s+(?:(?:de |en |la )?cocina|bajo ?mesada|aereos?|bajos?)(?:\s+y\s+aereos?)?/g, " ");
  const furnishing = /\b(?:sin muebles|sin amueblar|no amueblado|no amoblado)\b/.test(furnishingText)
    ? "unfurnished" : listing.furnished || /\b(?:amueblad[oa]|amoblad[oa]|semiamueblad[oa]|semiamoblad[oa]|con muebles)\b/.test(furnishingText) ? "furnished" : "unknown";
  const aspect = /\b(?:(?:apartamento|apto) (?:luminoso )?interior|disposicion interna|disposicion interior|contrafrente|al fondo por pasillo|planta baja intern[oa])\b/.test(own)
    ? "interior" : /\b(?:al frente|disposicion: frente)\b/.test(own) ? "front" : "unknown";
  const pool = /\b(?:sin|no tiene|no dispone de|no cuenta con) piscina\b/.test(own) ? "no_pool"
    : facilities.has("piscina") || /\bpiscina\b/.test(own) ? "pool" : "unknown";
  const condition = /\b(?:a estrenar|nuevo a estrenar|sin estrenar|(?:apto|apartamento) estrenar|estrene)\b/.test(own) ? "new" : "unknown";
  const gym = /\b(?:sin|no tiene|no dispone de|no cuenta con) gimnasio\b/.test(own) ? "no_gym"
    : facilities.has("gimnasio") || /\bgimnasio\b/.test(own) ? "gym" : "unknown";
  const ground = /\b(?:planta baja|pb)\b/.test(text(listing.title)) ||
    /\b(?:apartamento|apto|unidad)\s+(?:(?:\d+|un|dos|tres)\s+dorm(?:itorios?)?s?\s+)?(?:tipo casita |interior[, ]*|ubicad[oa] |se encuentra )?(?:en )?(?:planta baja|pb)\b/.test(own)
    ? "ground" : "unknown";
  return [listing.parkingSpaces ?? "unknown", furnishing, access, aspect, pool, gym, condition, ground].join("|");
}

function amountInUyu(money: OpportunityListing["price"], usdUyu: number): number | null {
  if (!money || !Number.isFinite(money.amount) || money.amount < 0) return null;
  if (money.currency === "UYU") return money.amount;
  if (money.currency === "USD") return money.amount * usdUyu;
  return null;
}

function prepare(listing: OpportunityListing, now: number, usdUyu: number): Eligible | OpportunityExclusion {
  if (!listing.id || !listing.listingId || !SOURCES.has(listing.source) || !publicUrl(listing.url, listing.source) || !listing.title?.trim())
    return "invalid_identity";
  if (!["rent", "sale"].includes(listing.operation) || listing.id !==
      `${listing.operation}:${listing.source}:${listing.listingId.replace(new RegExp(`^${listing.source}:`), "")}`)
    return "invalid_identity";
  const seen = date(listing.lastSeen);
  // Source readings are day-granular; do not pretend every reading happened at midnight.
  const today = Math.floor(now / DAY) * DAY;
  const seenDay = Math.floor(seen / DAY) * DAY;
  if (!Number.isFinite(seen) || seenDay > today || seenDay < today - OPPORTUNITY_POLICY.freshDays * DAY)
    return "stale";
  if (![listing.department, listing.locality, listing.neighborhood].every(value => typeof value === "string" && value.trim()))
    return "missing_location";
  if (!Number.isInteger(listing.bedrooms) || listing.bedrooms! < 0 || listing.bedrooms! > 8 ||
      !Number.isInteger(listing.bathrooms) || listing.bathrooms! < 1 || listing.bathrooms! > 6 ||
      !["apartamento", "casa"].includes(listing.propertyType) || !listing.area ||
      !positive(listing.area.value) || listing.area.value < 20 || listing.area.value > 450)
    return "missing_attributes";
  if (!["built", "total"].includes(listing.area.basis) ||
      (listing.propertyType === "casa" && listing.area.basis !== "built")) return "area_basis_unknown";
  const rent = amountInUyu(listing.price, usdUyu);
  if (!positive(rent)) return "invalid_price";
  let price: number;
  if (listing.operation === "rent") {
    if (rent < 8_000 || rent > 900_000) return "invalid_price";
    if (!listing.expenses) return "expenses_unknown";
    const expenses = amountInUyu(listing.expenses, usdUyu);
    if (expenses === null) return "expenses_unknown";
    price = rent + expenses;
  } else {
    price = rent / usdUyu;
    // The initial residential shortlist excludes token prices and unusual luxury stock.
    if (price < 15_000 || price > 3_000_000) return "invalid_price";
  }
  const imageUrl = publicUrl(listing.image, listing.source, "image");
  const image = imageUrl && !/logo|placeholder|no[-_]?image|sin[-_]?foto/i.test(imageUrl)
    ? imageUrl.split("?")[0]!.replace(/_\d+(?=\.(?:jpe?g|png|webp)$)/i, "") : "";
  const sellerName = text(listing.sellerName).replace(/[^a-z0-9]+/g, " ").trim();
  const seller = !sellerName || /^(?:mercado libre|mercadolibre|infocasas|facebook marketplace|inmuebles el pais|casasweb|particular|dueno directo|sin dato)$/.test(sellerName)
    ? "" : sellerName;
  return {
    raw: listing, price, rent,
    scope: [listing.operation, listing.department, listing.locality, listing.neighborhood,
      listing.propertyType, listing.bedrooms, listing.bathrooms, listing.area.basis].map(text).join("|"),
    seller, image, address: text(listing.address).replace(/[^a-z0-9 ]/g, ""),
    profile: amenityProfile(listing), description: text(listing.description),
  };
}

/** Conservative sampling dependency, deliberately NOT a property merge or an ID mapping. */
function possibleCopy(a: Eligible, b: Eligible): boolean {
  if (a.raw.id === b.raw.id || (a.raw.propertyKey && a.raw.propertyKey === b.raw.propertyKey)) return true;
  if (a.scope !== b.scope || Math.abs(a.raw.area!.value / b.raw.area!.value - 1) > 0.05) return false;
  return Boolean((a.image && a.image === b.image) || (a.address && a.address === b.address) ||
    (a.description.length >= 300 && a.description === b.description));
}

function compatibleAmenities(subject: Eligible, other: Eligible): boolean {
  // A missing field is not an explicit negative; do not benchmark it against a known premium.
  if (subject.profile !== other.profile) return false;
  if (subject.raw.propertyType === "casa" && positive(subject.raw.landArea) && positive(other.raw.landArea) &&
      Math.abs(other.raw.landArea / subject.raw.landArea - 1) > 0.30) return false;
  return true;
}

function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * p;
  const low = Math.floor(at);
  return sorted[low]! + (sorted[Math.ceil(at)]! - sorted[low]!) * (at - low);
}

const PROFILE_FEATURES: OpportunityFeature[] = ["parking", "furnishing", "access", "aspect", "pool", "gym", "condition", "ground_floor"];

function featureDifferences(subject: Eligible, peer: Eligible): NonNullable<OpportunityComparable["differences"]["featureDifferences"]> {
  const own = subject.profile.split("|"), other = peer.profile.split("|");
  return PROFILE_FEATURES.flatMap((feature, i) => own[i] === other[i] ? [] : [{
    feature, subject: own[i]!, comparable: other[i]!,
  }]);
}

function contextCompatible(subject: Eligible, peer: Eligible): boolean {
  if (compatibleAmenities(subject, peer)) return true;
  if (subject.raw.propertyType === "casa" && positive(subject.raw.landArea) && positive(peer.raw.landArea) &&
      Math.abs(peer.raw.landArea / subject.raw.landArea - 1) > 0.30) return false;
  // Condition, floor, access, aspect and parking remain exact even in the local context.
  // Unknown furnishing/pool/gym can be compared only with explicit disclosure, never imputed.
  return featureDifferences(subject, peer).every(difference =>
    ["furnishing", "pool", "gym"].includes(difference.feature) &&
    (difference.subject === "unknown" || difference.comparable === "unknown"));
}

interface ComparisonSample {
  peers: Eligible[];
  sellers: Set<string>;
  scope: OpportunityComparisonScope;
  areaTolerance: number;
}

function comparisonSample(subject: Eligible, rows: Eligible[], areaTolerance: number, contextual = false): ComparisonSample {
  const candidates = rows.filter(peer => peer !== subject && !possibleCopy(subject, peer) &&
    (contextual ? contextCompatible(subject, peer) : compatibleAmenities(subject, peer)) &&
    Math.abs(peer.raw.area!.value / subject.raw.area!.value - 1) <= areaTolerance,
  ).sort((a, b) => Math.abs(a.raw.area!.value - subject.raw.area!.value) - Math.abs(b.raw.area!.value - subject.raw.area!.value) ||
    b.raw.lastSeen.localeCompare(a.raw.lastSeen) || a.raw.id.localeCompare(b.raw.id));
  const peers: Eligible[] = [], perSeller = new Map<string, number>();
  for (const peer of candidates) {
    if (!peer.seller || (perSeller.get(peer.seller) ?? 0) >= OPPORTUNITY_POLICY.maximumPerSeller ||
        peers.some(other => possibleCopy(peer, other))) continue;
    peers.push(peer); perSeller.set(peer.seller, (perSeller.get(peer.seller) ?? 0) + 1);
    if (peers.length >= OPPORTUNITY_POLICY.maximumComparables) break;
  }
  return { peers, sellers: new Set(perSeller.keys()), areaTolerance,
    scope: contextual ? "local_context" : areaTolerance > OPPORTUNITY_POLICY.areaTolerance ? "wider_area" : "same_features" };
}

function selectComparisonSample(subject: Eligible, rows: Eligible[]): ComparisonSample | null {
  const enough = (sample: ComparisonSample, n: number, sellers: number) => sample.peers.length >= n && sample.sellers.size >= sellers;
  const exact = comparisonSample(subject, rows, OPPORTUNITY_POLICY.areaTolerance);
  if (enough(exact, EXPLORATORY_POLICY.minimumComparables, EXPLORATORY_POLICY.minimumSellers)) return exact;
  const wider = comparisonSample(subject, rows, EXPLORATORY_POLICY.widerAreaTolerance);
  if (enough(wider, EXPLORATORY_POLICY.minimumComparables, EXPLORATORY_POLICY.minimumSellers)) return wider;
  const contextual = comparisonSample(subject, rows, OPPORTUNITY_POLICY.areaTolerance, true);
  return enough(contextual, OPPORTUNITY_POLICY.minimumComparables, OPPORTUNITY_POLICY.minimumSellers) ? contextual : null;
}

function sampleMeasures(subject: Eligible, peers: Eligible[]) {
  const prices = peers.map(peer => peer.price), unitPrices = peers.map(peer => peer.price / peer.raw.area!.value);
  const median = quantile(prices, 0.5), q25 = quantile(prices, 0.25), q75 = quantile(prices, 0.75);
  const perAreaMedian = quantile(unitPrices, 0.5), perAreaQ25 = quantile(unitPrices, 0.25), perAreaQ75 = quantile(unitPrices, 0.75);
  const unitPrice = subject.price / subject.raw.area!.value;
  return { median, q25, q75, perAreaMedian, perAreaQ25, perAreaQ75,
    spread: (q75 - q25) / median, perAreaSpread: (perAreaQ75 - perAreaQ25) / perAreaMedian,
    gap: 1 - subject.price / median, conservativeGap: 1 - subject.price / q25,
    perAreaGap: 1 - unitPrice / perAreaMedian, perAreaQ25Gap: 1 - unitPrice / perAreaQ25,
    rentGap: 1 - subject.rent / quantile(peers.map(peer => peer.rent), 0.5),
    rentPerAreaGap: 1 - (subject.rent / subject.raw.area!.value) / quantile(peers.map(peer => peer.rent / peer.raw.area!.value), 0.5),
  };
}

function sellerSensitivity(subject: Eligible, sample: ComparisonSample) {
  const omissions = [...sample.sellers].map(seller => sampleMeasures(subject, sample.peers.filter(peer => peer.seller !== seller)));
  return {
    minimumGap: Math.min(...omissions.map(m => m.gap)),
    minimumQ25Gap: Math.min(...omissions.map(m => m.conservativeGap)),
    minimumPerAreaGap: Math.min(...omissions.map(m => m.perAreaGap)),
  };
}

function project(row: Eligible): OpportunityPublicListing {
  const raw = row.raw;
  // Explicit allowlist: descriptions, unit/address evidence and ingestion flags never leave here.
  return {
    id: raw.id, operation: raw.operation, ...(raw.propertyKey ? { propertyKey: raw.propertyKey } : {}),
    source: raw.source, listingId: raw.listingId, url: publicUrl(raw.url, raw.source)!,
    title: publicText(raw.title, 200), image: publicUrl(raw.image, raw.source, "image"), sellerName: publicText(raw.sellerName, 100),
    department: publicText(raw.department, 80), locality: publicText(raw.locality, 80),
    neighborhood: publicText(raw.neighborhood, 100), propertyType: raw.propertyType,
    bedrooms: raw.bedrooms!, bathrooms: raw.bathrooms!, area: { value: raw.area!.value, basis: raw.area!.basis },
    price: { amount: raw.price.amount, currency: raw.price.currency },
    expenses: raw.expenses ? { amount: raw.expenses.amount, currency: raw.expenses.currency } : null,
    comparisonPrice: round(row.price), lastSeen: raw.lastSeen, publishedAt: raw.publishedAt,
  };
}

function stats(): OpportunityOperationStats {
  return { input: 0, eligible: 0, analyzed: 0, shortlisted: 0, qualified: 0, excluded: {}, risks: {} };
}

function exclude(stat: OpportunityOperationStats, reason: OpportunityExclusion) {
  stat.excluded[reason] = (stat.excluded[reason] ?? 0) + 1;
}

export function analyzeOpportunities(
  listings: readonly OpportunityListing[], options: OpportunityAnalysisOptions,
): OpportunityAnalysisResult {
  const now = date(options.now);
  if (!Number.isFinite(now) || !positive(options.usdUyu)) throw new Error("Valid snapshot date and USD/UYU conversion are required");
  const result: OpportunityAnalysisResult = {
    version: 1, algorithm: "local-asking-comparables-v2", generatedAt: new Date(now).toISOString(),
    usdUyu: options.usdUyu, items: [], stats: { rent: stats(), sale: stats() },
  };
  const groups = new Map<string, Eligible[]>();
  const neighborhoodVocabulary = new Map<string, string[]>();
  for (const listing of listings) {
    const key = text(`${listing.department}|${listing.locality}`);
    const name = text(listing.neighborhood);
    if (name.length < 5 || /^(?:otros?|otras?|sin dato|desconocido)$/.test(name)) continue;
    const names = neighborhoodVocabulary.get(key) ?? [];
    if (!names.includes(name)) names.push(name);
    neighborhoodVocabulary.set(key, names);
  }
  const unique = new Map<string, OpportunityListing[]>();
  for (const listing of listings) {
    if (listing.operation !== "rent" && listing.operation !== "sale") continue;
    result.stats[listing.operation].input++;
    const key = listing.id;
    const rows = unique.get(key) ?? [];
    rows.push(listing); unique.set(key, rows);
  }
  for (const duplicates of unique.values()) {
    const listing = duplicates[0]!;
    const stat = result.stats[listing.operation];
    // Multiple copies of an ID do not constitute independent evidence. Contradictory copies abstain.
    if (duplicates.some(row => JSON.stringify(row) !== JSON.stringify(listing))) {
      duplicates.forEach(() => exclude(stat, "duplicate_id")); continue;
    }
    duplicates.slice(1).forEach(() => exclude(stat, "duplicate_id"));
    const candidate = prepare(listing, now, options.usdUyu);
    if (typeof candidate === "string") { exclude(stat, candidate); continue; }
    const risks = opportunityRisks(listing);
    if (opportunityLocationConflict(listing, neighborhoodVocabulary.get(text(`${listing.department}|${listing.locality}`)) ?? []))
      risks.push("location_conflict");
    if (risks.length) {
      exclude(stat, "risky_terms");
      for (const risk of risks) stat.risks[risk] = (stat.risks[risk] ?? 0) + 1;
      continue;
    }
    stat.eligible++;
    const group = groups.get(candidate.scope) ?? [];
    group.push(candidate); groups.set(candidate.scope, group);
  }
  const qualified: OpportunityItem[] = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => a.raw.id.localeCompare(b.raw.id));
    for (const subject of rows) {
      const stat = result.stats[subject.raw.operation];
      const subjectArea = subject.raw.area!.value;
      const sample = selectComparisonSample(subject, rows);
      if (!sample) { exclude(stat, "insufficient_comparables"); continue; }
      const { peers, sellers } = sample;
      stat.analyzed++;
      const m = sampleMeasures(subject, peers);
      const { median, q25, q75, spread, gap, conservativeGap, perAreaGap } = m;
      if (spread > OPPORTUNITY_POLICY.maximumSpread) { exclude(stat, "high_dispersion"); continue; }
      if (gap > OPPORTUNITY_POLICY.maximumGap) { exclude(stat, "extreme_discount"); continue; }
      const sensitivity = sellerSensitivity(subject, sample);
      const standard = sample.scope === "same_features" && peers.length >= OPPORTUNITY_POLICY.minimumComparables &&
        sellers.size >= OPPORTUNITY_POLICY.minimumSellers && meets(gap, OPPORTUNITY_POLICY.minimumGap) &&
        meets(conservativeGap, OPPORTUNITY_POLICY.minimumConservativeGap) && meets(perAreaGap, OPPORTUNITY_POLICY.minimumPerAreaGap) &&
        (subject.raw.operation !== "rent" || meets(m.rentGap, 0.10));
      const contextual = sample.scope === "local_context";
      const exploratoryTotal = sample.scope !== "wider_area" && perAreaGap <= OPPORTUNITY_POLICY.maximumGap &&
        spread <= EXPLORATORY_POLICY.maximumSpread && meets(gap, contextual ? OPPORTUNITY_POLICY.minimumGap : EXPLORATORY_POLICY.minimumTotalGap) &&
        meets(conservativeGap, contextual ? OPPORTUNITY_POLICY.minimumConservativeGap : 0) &&
        meets(perAreaGap, contextual ? OPPORTUNITY_POLICY.minimumPerAreaGap : 0) &&
        (subject.raw.operation !== "rent" || meets(m.rentGap, contextual ? 0.10 : EXPLORATORY_POLICY.minimumRentGap)) &&
        meets(sensitivity.minimumGap, contextual ? 0.10 : EXPLORATORY_POLICY.minimumOmittedSellerTotalGap) && meets(sensitivity.minimumQ25Gap, 0);
      const perArea = sample.scope !== "local_context" && perAreaGap <= OPPORTUNITY_POLICY.maximumGap &&
        m.perAreaSpread <= EXPLORATORY_POLICY.maximumSpread && meets(perAreaGap, EXPLORATORY_POLICY.minimumPerAreaGap) &&
        meets(m.perAreaQ25Gap, EXPLORATORY_POLICY.minimumPerAreaQ25Gap) && meets(gap, 0) && meets(conservativeGap, -0.05) &&
        (subject.raw.operation !== "rent" || (meets(m.rentGap, 0) && meets(m.rentPerAreaGap, 0.10))) && meets(sensitivity.minimumGap, 0) &&
        meets(sensitivity.minimumPerAreaGap, EXPLORATORY_POLICY.minimumOmittedSellerPerAreaGap);
      const signals: OpportunitySignal[] = [...(standard || exploratoryTotal ? ["total_price" as const] : []), ...(perArea ? ["price_per_m2" as const] : [])];
      if (!signals.length) { exclude(stat, "not_below_reference"); continue; }
      const sources = [...new Set(peers.map(peer => peer.raw.source))].sort();
      const cautions: OpportunityCaution[] = ["asking_prices_only", "availability_unverified", "condition_unverified"];
      if (subject.raw.parkingSpaces == null) cautions.push("parking_unverified");
      if (subject.raw.furnished == null) cautions.push("furnishing_unverified");
      if (subject.raw.propertyType === "casa" && !positive(subject.raw.landArea)) cautions.push("land_area_unverified");
      if (sources.length === 1) cautions.push("single_source");
      if (subject.raw.area!.basis === "total") cautions.push("total_area_basis");
      qualified.push({
        subject: project(subject),
        analysis: {
          pricingBasis: subject.raw.operation === "rent" ? "monthly_total" : "asking_price",
          currency: subject.raw.operation === "rent" ? "UYU" : "USD",
          median: round(median), q25: round(q25), q75: round(q75), spread: round(spread, 4),
          gapPct: round(gap * 100, 1), conservativeGapPct: round(conservativeGap * 100, 1),
          perAreaGapPct: round(perAreaGap * 100, 1), distinctN: peers.length, sellersN: sellers.size,
          sources, oldestLastSeen: peers.map(peer => peer.raw.lastSeen).sort()[0]!,
          newestLastSeen: peers.map(peer => peer.raw.lastSeen).sort().slice(-1)[0]!,
          areaBasis: subject.raw.area!.basis as "built" | "total",
          areaMin: Math.min(...peers.map(peer => peer.raw.area!.value)),
          areaMax: Math.max(...peers.map(peer => peer.raw.area!.value)),
          confidence: standard && peers.length >= 12 && sellers.size >= 6 && spread <= 0.20 ? "supported" : "limited",
          signals, evidenceTier: standard ? "standard" : "exploratory", comparisonScope: sample.scope,
          areaTolerancePct: round(sample.areaTolerance * 100),
          perAreaMedian: round(m.perAreaMedian, 2), perAreaQ25: round(m.perAreaQ25, 2), perAreaQ75: round(m.perAreaQ75, 2),
          sensitivity: { minimumGapPct: round(sensitivity.minimumGap * 100, 1),
            minimumPerAreaGapPct: round(sensitivity.minimumPerAreaGap * 100, 1), omittedSellersN: sellers.size },
        },
        comparables: peers.slice(0, 10).map(peer => ({
          ...project(peer), differences: { areaPercent: round((peer.raw.area!.value / subjectArea - 1) * 100, 1),
            ...(contextual ? { featureDifferences: featureDifferences(subject, peer) } : {}) },
        })),
        cautions,
      });
      stat.qualified++;
    }
  }
  qualified.sort((a, b) => (a.analysis.evidenceTier === "standard" ? 0 : 1) - (b.analysis.evidenceTier === "standard" ? 0 : 1) ||
    (a.analysis.confidence === "supported" ? 0 : 1) - (b.analysis.confidence === "supported" ? 0 : 1) ||
    b.analysis.conservativeGapPct - a.analysis.conservativeGapPct || b.analysis.distinctN - a.analysis.distinctN ||
    a.subject.id.localeCompare(b.subject.id));
  const requested = options.maxItemsPerOperation ?? 2_000;
  const limit = Number.isFinite(requested) ? Math.max(0, Math.min(2_000, Math.trunc(requested))) : 2_000;
  const bytes: Record<OpportunityOperation, number> = { rent: 0, sale: 0 };
  const byId = new Map([...groups.values()].flat().map(row => [row.raw.id, row]));
  const published: Eligible[] = [];
  for (const item of qualified) {
    const operation = item.subject.operation;
    const candidate = byId.get(item.subject.id)!;
    // Suppress repeated analytical recommendations, without merging source adverts or URLs.
    if (published.some(row => possibleCopy(candidate, row))) { exclude(result.stats[operation], "suspected_copy"); continue; }
    if (result.stats[operation].shortlisted >= limit) continue;
    const size = Buffer.byteLength(JSON.stringify(item), "utf8");
    // Leave a megabyte for collection metadata within the store's 8 MiB snapshot ceiling.
    if (bytes[operation] + size > 7 * 1024 * 1024) continue;
    bytes[operation] += size;
    published.push(candidate);
    result.items.push(item); result.stats[operation].shortlisted++;
  }
  return result;
}
