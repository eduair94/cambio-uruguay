import { rentalDescription } from "../rentals/details";
import { rentalMatchHasConflicts, type RentalMatchCandidate } from "../rentals/matchEvidence";
import type {
  OpportunityAnalysisOptions,
  OpportunityAnalysisResult,
  OpportunityCaution,
  OpportunityExclusion,
  OpportunityItem,
  OpportunityListing,
  OpportunityOperation,
  OpportunityOperationStats,
  OpportunityPublicListing,
  OpportunityRisk,
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

const DAY = 86_400_000;
const SOURCES = new Set(["infocasas", "mercadolibre", "casasweb", "elpais", "facebook"]);
const RISKS = new Set<OpportunityRisk>([
  "temporary", "partial_price", "occupied", "needs_renovation", "restricted_rights",
  "project", "multiple_units", "price_on_request", "extra_purchase_costs", "special_layout", "location_conflict", "attribute_conflict",
]);
const text = (value: unknown) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const round = (value: number, digits = 0) => Number(value.toFixed(digits));
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
  if (/\b(?:temporario|temporaria|temporal|turistico|invernal|quincena)\b|\balquiler (?:de |por )?(?:invierno|temporada)\b|\b(?:por|la) (?:noche|semana)\b/.test(own))
    found.add("temporary");
  if (/\b(?:anticipo|adelanto|entrega inicial|saldo financiado|precio de la cuota)\b|\bdesde\s*(?:u\s*\$\s*s?|usd|uyu|\$|\d)|\b\d+[\d.,]*\s*(?:cuotas|mensualidades)\b|\bcuotas?\s*(?:de|desde|:|usd|u\s*\$|\$)/.test(own))
    found.add("partial_price");
  const nonNegated = own.replace(/\b(?:no (?:esta |se encuentra |es )?(?:ocupad[oa]|alquilad[oa]|arrendad[oa])|sin (?:ocupantes|inquilinos|renta))\b/g, " ");
  if (/\b(?:con renta|con inquilinos?|actualmente alquilad[oa]|actualmente arrendad[oa]|se vende alquilad[oa]|se vende con ocupantes|ocupad[oa] por|inmueble ocupado|vivienda ocupada)\b/.test(nonNegated))
    found.add("occupied");
  const renovation = own.replace(/\b(?:no (?:requiere|necesita) (?:reforma|reciclaje|arreglos)|sin necesidad de (?:reforma|reciclaje|arreglos))\b/g, " ");
  if (/\b(?:a reciclar|para reciclar|a reformar|para reformar|a refaccionar|para refaccionar|requiere (?:reforma|reciclaje|arreglos)|necesita (?:reforma|reciclaje|arreglos))\b/.test(renovation))
    found.add("needs_renovation");
  if (/\b(?:nuda propiedad|derechos? posesorios?|cesion de (?:derechos|alquiler|contrato)|derechos? hereditarios?|parte indivisa|remate|cooperativa|derecho de uso|usufructo)\b/.test(own))
    found.add("restricted_rights");
  if (/\b(?:en pozo|en construccion|nuevo proyecto|proyecto en|hasta finalizar la obra|entrega (?:prevista|estimada|en 20\d{2})|ocupacion (?:prevista|en 20\d{2}))\b|\b(?:ocupacion|entrega)\b.{0,45}\b(?:sera|fijada|prevista|estimada)\b.{0,50}\b20\d{2}\b|\bla construccion\b.{0,65}\bsera\b/.test(own))
    found.add("project");
  if (/\b(?:block de|bloque de|lote de|paquete de) (?:apartamentos|casas|unidades)\b|\b(?:dos|tres|cuatro|[2-9]) (?:casas|apartamentos) (?:en|independientes|juntos)|\bcasa (?:con|mas|y) (?:un |una |dos |[2-9] )?apartamento\b/.test(own))
    found.add("multiple_units");
  if (/\b(?:consultar precio|precio a consultar|precio de referencia|precio ilustrativo)\b/.test(own))
    found.add("price_on_request");
  if (listing.operation === "sale" && /\b(?:garaje|garage|cochera|conexiones|gastos de ocupacion)\b.{0,35}\b(?:aparte|adicional|no incluid[oa]s?|se vende por separado)\b/.test(own))
    found.add("extra_purchase_costs");
  const occupationCosts = own.replace(/\b(?:sin|no (?:tiene|hay|incluye))\s+(?:gastos|gtos\.?) (?:de )?ocupacion\b/g, " ");
  if (listing.operation === "sale" && /\b(?:gastos|gtos\.?) (?:de )?ocupacion\s*(?:[:=]|del?|son)?\s*\d|\+\s*(?:gastos|gtos\.?) (?:de )?ocupacion\b/.test(occupationCosts))
    found.add("extra_purchase_costs");
  if (/\b(?:dormitorio|habitacion)\b.{0,30}\b(?:ciego|ciega|sin ventanas|no tiene ventanas)\b|\b(?:entrada compartida|ingreso compartido|acceso compartido|acceso por patio comun|subsuelo|sotano)\b|\b(?:actualmente )?(?:equipad[oa]|acondicionad[oa]) para (?:escritorio|oficinas?)\b/.test(own))
    found.add("special_layout");
  if (explicitMoneyConflict(listing)) found.add("attribute_conflict");
  if (positive(listing.parkingSpaces) && /\b(?:opcion (?:de )?(?:cochera|garaje|garage)|(?:cochera|garaje|garage) opcional)\b/.test(own))
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
    const declared = /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts?2?|metros(?: cuadrados)?)\s*(?:propios|interiores|cubiertos|construidos|edificados)\b/g;
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
  const stripped = raw.replace(/\s/g, "");
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(stripped)) return Number(stripped.replace(/[.,]/g, ""));
  return Number(stripped.replace(/,(?=\d{1,2}$)/, "."));
}

/** Only labelled amounts can contradict a price. A bare unrelated number cannot. */
function explicitMoneyConflict(listing: OpportunityListing): boolean {
  const own = text(`${listing.title}\n${listing.description}`);
  const expenses = /\b(?:gastos comunes|gc)\s*(?:(?:son|ascienden|mensuales|aproximados|aproximadamente|aprox\.?|de|a|:|=)\s*){0,5}(usd|u\s*\$\s*[sd]|us\$|uyu|uy\$|\$)?\s*(\d[\d.,]*)/g;
  if (listing.expenses) for (const match of own.matchAll(expenses)) {
    const number = parsePublishedNumber(match[2]!);
    if (!Number.isFinite(number) || number < 0) continue;
    const symbol = match[1] || "";
    const currency = /usd|us\$|u\s*\$\s*[sd]/.test(symbol) ? "USD" : symbol ? "UYU" : listing.expenses.currency;
    if ((listing.expenses.amount === 0 && number > 0) || (currency === listing.expenses.currency &&
      Math.abs(number - listing.expenses.amount) > Math.max(1, listing.expenses.amount * 0.10))) return true;
  }
  const label = listing.operation === "rent" ? "alquiler" : "venta";
  const prices = new RegExp(`\\b(?:precio(?: de ${label})?|${label})\\s*(?:(?:mensual|de|:|=)\\s*){0,3}(usd|u\\s*\\$\\s*[sd]|us\\$|uyu|uy\\$|\\$)\\s*(\\d[\\d.,]*)`, "g");
  for (const match of own.matchAll(prices)) {
    const amount = parsePublishedNumber(match[2]!);
    const currency = /usd|us\$|u\s*\$\s*[sd]/.test(match[1]!) ? "USD" : "UYU";
    if (currency === listing.price.currency && Number.isFinite(amount) &&
      Math.abs(amount - listing.price.amount) > Math.max(1, listing.price.amount * 0.10)) return true;
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
  const access = /\b(?:por escaleras?|piso (?:x )?escaleras?|sin ascensor)\b/.test(own)
    ? "stairs" : /\bascensor(?:es)?\b/.test(own) || facilities.has("ascensor") || facilities.has("ascensores") ? "elevator" : "unknown";
  // Kitchen cupboards are fixtures, not evidence that the dwelling is furnished.
  const furnishingText = own.replace(/\b(?:con )?muebles\s+(?:(?:de |en |la )?cocina|bajo ?mesada|aereos?|bajos?)(?:\s+y\s+aereos?)?/g, " ");
  const furnishing = /\b(?:sin muebles|sin amueblar|no amueblado|no amoblado)\b/.test(furnishingText)
    ? "unfurnished" : listing.furnished || /\b(?:amueblad[oa]|amoblad[oa]|semiamueblad[oa]|semiamoblad[oa]|con muebles)\b/.test(furnishingText) ? "furnished" : "unknown";
  const aspect = /\b(?:(?:apartamento|apto) (?:luminoso )?interior|disposicion interna|disposicion interior|contrafrente|al fondo por pasillo|planta baja intern[oa])\b/.test(own)
    ? "interior" : /\b(?:al frente|disposicion: frente)\b/.test(own) ? "front" : "unknown";
  const pool = facilities.has("piscina") || /\bpiscina\b/.test(own.replace(/\b(?:sin|no tiene|no dispone de) piscina\b/g, " ")) ? "pool" : "unknown";
  const condition = /\b(?:a estrenar|nuevo a estrenar|sin estrenar|(?:apto|apartamento) estrenar|estrene)\b/.test(own) ? "new" : "unknown";
  const gym = facilities.has("gimnasio") || /\bgimnasio\b/.test(own.replace(/\b(?:sin|no tiene) gimnasio\b/g, " ")) ? "gym" : "unknown";
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
    version: 1, algorithm: "local-asking-comparables-v1", generatedAt: new Date(now).toISOString(),
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
      const candidates = rows.filter(row =>
        row !== subject && !possibleCopy(subject, row) && compatibleAmenities(subject, row) &&
        Math.abs(row.raw.area!.value / subjectArea - 1) <= OPPORTUNITY_POLICY.areaTolerance,
      ).sort((a, b) => Math.abs(a.raw.area!.value - subjectArea) - Math.abs(b.raw.area!.value - subjectArea) ||
        b.raw.lastSeen.localeCompare(a.raw.lastSeen) || a.raw.id.localeCompare(b.raw.id));
      const peers: Eligible[] = [];
      const sellers = new Map<string, number>();
      for (const row of candidates) {
        if (!row.seller || (sellers.get(row.seller) ?? 0) >= OPPORTUNITY_POLICY.maximumPerSeller) continue;
        if (peers.some(other => possibleCopy(row, other))) continue;
        peers.push(row); sellers.set(row.seller, (sellers.get(row.seller) ?? 0) + 1);
        if (peers.length >= OPPORTUNITY_POLICY.maximumComparables) break;
      }
      if (peers.length < OPPORTUNITY_POLICY.minimumComparables) { exclude(stat, "insufficient_comparables"); continue; }
      if (sellers.size < OPPORTUNITY_POLICY.minimumSellers) { exclude(stat, "seller_concentration"); continue; }
      stat.analyzed++;
      const prices = peers.map(peer => peer.price);
      const median = quantile(prices, 0.5), q25 = quantile(prices, 0.25), q75 = quantile(prices, 0.75);
      const spread = (q75 - q25) / median;
      if (spread > OPPORTUNITY_POLICY.maximumSpread) { exclude(stat, "high_dispersion"); continue; }
      const gap = 1 - subject.price / median;
      const conservativeGap = 1 - subject.price / q25;
      const perAreaGap = 1 - (subject.price / subjectArea) / quantile(peers.map(peer => peer.price / peer.raw.area!.value), 0.5);
      if (gap > OPPORTUNITY_POLICY.maximumGap) { exclude(stat, "extreme_discount"); continue; }
      // Rent and total must both be lower; expensive common expenses cannot manufacture a saving.
      const rentGap = 1 - subject.rent / quantile(peers.map(peer => peer.rent), 0.5);
      if (gap < OPPORTUNITY_POLICY.minimumGap || conservativeGap < OPPORTUNITY_POLICY.minimumConservativeGap ||
          perAreaGap < OPPORTUNITY_POLICY.minimumPerAreaGap || (subject.raw.operation === "rent" && rentGap < 0.10)) {
        exclude(stat, "not_below_reference"); continue;
      }
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
          confidence: peers.length >= 12 && sellers.size >= 6 && spread <= 0.20 ? "supported" : "limited",
        },
        comparables: peers.slice(0, 10).map(peer => ({
          ...project(peer), differences: { areaPercent: round((peer.raw.area!.value / subjectArea - 1) * 100, 1) },
        })),
        cautions,
      });
      stat.qualified++;
    }
  }
  qualified.sort((a, b) => (a.analysis.confidence === "supported" ? 0 : 1) - (b.analysis.confidence === "supported" ? 0 : 1) ||
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
