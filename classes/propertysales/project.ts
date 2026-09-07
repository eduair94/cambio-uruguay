import { retainSaleAdvertiser } from "./advertiser";
import { publicAdvertiserFields } from "../rentals/advertiser";
import { opportunityRisks } from "../propertyopportunities/analyze";
import type { OpportunityListing, OpportunityRisk } from "../propertyopportunities/types";
import { rentalDescription, rentalImages } from "../rentals/details";
import { canonicalDepartment } from "../rentals/normalize";
import type { PublicSaleCatalogMeta, PublicSaleListing } from "./types";
import { retainCasaswebDetail } from "./casasweb";

export const SALE_CATALOG_FRESH_DAYS = 21;
const DAY = 86_400_000;
const text = (value: unknown, max: number) => rentalDescription(value, max);
const description = (value: unknown) => text(value, 8_000).split(/\r?\n/)
  .filter(line => !/^\s*(?:contacto|contactar a|agente inmobiliario|corredor responsable|asesor(?:a)?(?: comercial)?|tel[eé]fonos?|tels?\.?|whatsapp|e-?mail)\s*[:=-]/i.test(line))
  .join("\n").replace(/\n{3,}/g, "\n\n").trim();
const date = (value: unknown): string | null => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
};
const count = (value: unknown, min = 0): number | null => typeof value === "number" && Number.isInteger(value) && value >= min && value <= 100 ? value : null;
const area = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 1_000_000 ? value : null;
const money = (value: unknown, zero: boolean): PublicSaleListing["price"] | null => {
  const candidate = value as PublicSaleListing["price"] | null;
  return candidate && typeof candidate.amount === "number" && Number.isFinite(candidate.amount) && candidate.amount >= (zero ? 0 : Number.MIN_VALUE) &&
    candidate.amount <= 1_000_000_000 && (candidate.currency === "USD" || candidate.currency === "UYU")
    ? { amount: candidate.amount, currency: candidate.currency } : null;
};
const PUBLIC_CONDITIONS = new Set<OpportunityRisk>(["occupied", "needs_renovation", "project", "extra_purchase_costs", "special_layout"]);
const DISQUALIFYING = new Set<OpportunityRisk>(["unavailable", "temporary", "partial_price", "restricted_rights", "multiple_units", "price_on_request", "location_conflict", "attribute_conflict"]);

export interface SaleCatalogInput { listing: OpportunityListing; firstSeen?: string | null }

/** Matches DB upsert semantics: missing historical firstSeen stays unknown for existing IDs. */
export function mergeSaleCatalogInputs(stored: readonly SaleCatalogInput[], incoming: readonly OpportunityListing[], unavailableIds: readonly string[] = []): SaleCatalogInput[] {
  const rows = new Map(stored.map(row => [row.listing.id, row]));
  for (const listing of incoming) {
    const previous = rows.get(listing.id);
    if (previous && Date.parse(previous.listing.lastSeen) > Date.parse(listing.lastSeen)) continue;
    rows.set(listing.id, { listing: retainSaleAdvertiser(previous?.listing, retainCasaswebDetail(previous?.listing, listing)), firstSeen: previous ? previous.firstSeen ?? null : listing.lastSeen });
  }
  for (const id of unavailableIds) rows.delete(id);
  return [...rows.values()];
}

/** Comparison input keeps private own-identity evidence but shares the directory's data vetos. */
export function saleOpportunityInputs(inputs: readonly SaleCatalogInput[], now: string, usdUyu: number): OpportunityListing[] {
  return inputs.flatMap(input => {
    const projection = publicSaleListing(input, now, usdUyu);
    return projection ? [{ ...input.listing, expenses: projection.expenses, parkingSpaces: projection.parkingSpaces }] : [];
  });
}

/** Source-owned whitelisting is repeated at this boundary; private input objects never spread. */
export function publicSaleListing(input: SaleCatalogInput, now: string, usdUyu?: number): PublicSaleListing | null {
  const row = input.listing;
  if (!row || row.operation !== "sale" || !["infocasas", "casasweb"].includes(row.source)) return null;
  if (row.source === "casasweb" && (!date(row.saleDetailReadAt) || Date.parse(row.saleDetailReadAt!) < Date.parse(row.lastSeen) ||
    Date.parse(row.saleDetailReadAt!) > Date.parse(now) + 60_000 || Date.parse(row.saleDetailReadAt!) < Date.parse(now) - SALE_CATALOG_FRESH_DAYS * DAY)) return null;
  const match = /^sale:(infocasas|casasweb):(\d{1,18})$/.exec(row.id);
  if (!match || row.source !== match[1] || row.listingId !== `${match[1]}:${match[2]}`) return null;
  let url: URL;
  try {
    url = new URL(row.url);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (row.source === "infocasas" && (url.hostname !== "www.infocasas.com.uy" || url.pathname.split("/").filter(Boolean).pop() !== match[2])) return null;
    if (row.source === "casasweb" && (url.hostname !== "casasweb.com" || !url.pathname.startsWith("/VENTA_") || !url.pathname.endsWith(`_CW${match[2]}`))) return null;
    url.search = ""; url.hash = "";
  } catch { return null; }
  const clock = date(now), lastSeen = date(row.lastSeen);
  if (!clock || !lastSeen || Date.parse(lastSeen) > Date.parse(clock) + 60_000 || Date.parse(lastSeen) < Date.parse(clock) - SALE_CATALOG_FRESH_DAYS * DAY) return null;
  const title = text(row.title, 500).replace(/\s+/g, " ");
  const price = money(row.price, false), department = canonicalDepartment(row.department);
  if (!title || !price || !department || !["apartamento", "casa"].includes(row.propertyType)) return null;
  // The public Casasweb card prints pesos for some USD sale prices (verified against own
  // detail headers). Such a card is withheld until the source detail confirms USD itself.
  if (row.source === "casasweb" && price.currency !== "USD") return null;
  // Reject token/down-payment placeholders without guessing a corrected currency or price.
  const askingUsd = price.currency === "USD" ? price.amount : usdUyu && Number.isFinite(usdUyu) && usdUyu > 0 ? price.amount / usdUyu : null;
  if (askingUsd === null || askingUsd < 1_000) return null;
  const ownText = `${row.title}\n${row.description}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:inmueble|anuncio|aviso|publicacion|propiedad)\s+de\s+(?:prueba|test)\b|\btest\s+infocasas\b/.test(ownText)) return null;
  const unitCount = "(?:dos|tres|cuatro|cinco|seis|siete|ocho|nueve|[2-9]|[1-9]\\d)";
  const unitName = "(?:casas|apartamentos|aptos|unidades)";
  const normalizedTitle = row.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(new RegExp(`\\b(?:edificio|torre|condominio)\\s+(?:de|con)\\s+${unitCount}\\s+${unitName}\\b`, "g"), " ")
    .replace(new RegExp(`\\b${unitCount}\\s+${unitName}\\s+por piso\\b`, "g"), " ");
  if (/^(?:(?:venta|vendo|se vende|en venta|oportunidad|excelente)\s+(?:de\s+)?)?(?:terreno|campo|chacra|solar|lote)\b/.test(normalizedTitle) ||
    /\b(?:adquirir|venta de|se vende)\s+(?:un\s+)?terreno\s+con mejoras\b/.test(ownText) ||
    /\b(?:precio|valor)\b[^.!?\n]{0,45}(?:por\s+hectarea|por\s+ha\b|\/\s*ha\b)/.test(ownText)) return null;
  if (new RegExp(`\\b${unitCount}\\s+${unitName}\\b`).test(normalizedTitle) ||
    new RegExp(`\\b(?:la propiedad|el padron|el inmueble)\\s+(?:consta de|incluye|se compone de)\\s+${unitCount}\\s+${unitName}\\b`).test(ownText)) return null;
  if (new RegExp(`(?:^|[.\\n])\\s*consta\\s+(?:de\\s+)?${unitCount}\\s+${unitName}\\b`).test(ownText)) return null;
  if (/\b(?:precio|venta)\b[^.!?\n]{0,65}(?:\+|mas)\s*(?:cuotas|saldo|financiacion)\b/.test(ownText)) return null;
  if (/\b(?:tiene|con|mas|mantiene|resta)\s+(?:un\s+)?saldo\s+(?:(?:pendiente|a pagar|hipotecario)\b|(?:a|con|en|del?)\s+(?:la\s+|el\s+)?(?:anv|bhu|banco)\b)|\bdeuda\s+(?:pendiente|hipotecaria)\b/.test(ownText)) return null;
  if (/\bsaldo\s+(?:de|a|al|con|en|del)\s+(?:(?:la|el|banco)\s+)?(?:anv|bhu|mvotma|mvot|banco)\b|\brestan?\s+(?:por\s+)?pagar\s+\d+\s+(?:anos|cuotas)\b|\bderechos?\s+(?:sucesorios?|hereditarios?|posesorios?)\b/.test(ownText)) return null;
  if (row.bedrooms !== null && row.bathrooms !== null && row.bedrooms > row.bathrooms &&
    /\bdormitorios?\b[^.!?\n]{0,90}(?:todos?\s+(?:ellos\s+)?en suite|cada uno\s+con\s+(?:su\s+)?bano privado)/.test(ownText)) return null;
  if (row.bathrooms !== null) for (const suite of ownText.matchAll(/\b(\d{1,2})\s+(?:(?:dormitorios?|habitaciones?)\s+en suite|de (?:ellos|ellas) en suite|suites)\b/g)) {
    if (Number(suite[1]) > row.bathrooms) return null;
  }
  if (/\bprecio\b[^.!?\n]{0,55}\b[\d.,]+\s*(?:ui|ur)\b/.test(ownText)) return null;
  const optionalParking = /\b(?:opcion (?:de )?(?:(?:alquilar|comprar) )?(?:cochera|garaje|garage)|(?:cochera|garaje|garage) opcional)\b/.test(ownText);
  const risks = opportunityRisks(optionalParking ? { ...row, parkingSpaces: null } : row);
  // Legacy Casasweb captures retained precisely the own-card badge line, without riskFlags.
  // Read those short explicit badges too; never infer occupancy from "ideal para renta" prose.
  if (row.source === "casasweb" && row.description.length <= 300 && !/[.!?]/.test(row.description)) {
    if (/\bProyecto\b/.test(row.description) && !risks.includes("project")) risks.push("project");
    if (/\bRenta\b/.test(row.description) && !risks.includes("occupied")) risks.push("occupied");
  }
  if (risks.some(risk => DISQUALIFYING.has(risk))) return null;
  const images = rentalImages([row.image, ...(Array.isArray(row.images) ? row.images : [])]).filter(value => {
    const parsed = new URL(value);
    const hosts = row.source === "infocasas" ? ["infocasas.com.uy"] : ["casasweb.com", "static.tokkobroker.com"];
    return parsed.protocol === "https:" && hosts.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  });
  const ownArea = row.area;
  const areas: PublicSaleListing["areas"] = {
    built: area(row.areas?.built) ?? (ownArea?.basis === "built" ? area(ownArea.value) : null),
    total: area(row.areas?.total) ?? (ownArea?.basis === "total" ? area(ownArea.value) : null),
    land: area(row.areas?.land) ?? area(row.landArea),
    terrace: area(row.areas?.terrace),
    reported: area(row.areas?.reported) ?? (ownArea?.basis === "reported" ? area(ownArea.value) : null),
  };
  // Imported dimensions that cannot both be true must not become display facts.
  if (row.propertyType === "apartamento" && areas.built !== null && areas.total !== null &&
    areas.built > areas.total * 1.05 && areas.built - areas.total > 2) return null;
  const originalGeo = row.geo;
  const geo: PublicSaleListing["geo"] = originalGeo?.precision === "approximate" &&
    typeof originalGeo.lat === "number" && Number.isFinite(originalGeo.lat) && originalGeo.lat >= -35.5 && originalGeo.lat <= -30 &&
    typeof originalGeo.lng === "number" && Number.isFinite(originalGeo.lng) && originalGeo.lng >= -58.6 && originalGeo.lng <= -53
    ? { lat: originalGeo.lat, lng: originalGeo.lng, precision: "approximate" } : null;
  const firstSeen = date(input.firstSeen);
  const parsedExpenses = money(row.expenses, true);
  const knownZeroExpenses = /\bsin gastos comunes\b|\bno (?:tiene|hay|paga) gastos comunes\b|\bgastos comunes\s*[:=-]?\s*(?:no tiene|no hay|no paga|cero)\b|\b(?:gastos comunes|gc)\s*[:=-]\s*(?:(?:uyu|\$|usd|u\$s)\s*)?0(?:[.,]00)?(?:\s|$|[.;])/.test(ownText);
  let expenses = parsedExpenses?.amount === 0 && !knownZeroExpenses ? null : parsedExpenses;
  if (expenses && expenses.amount > 0) {
    const expensesUsd = expenses.currency === "USD" ? expenses.amount : usdUyu && usdUyu > 0 ? expenses.amount / usdUyu : null;
    // A monthly bill above 1% of the dwelling's asking price needs an explicit own-source
    // statement; otherwise a currency/period import error could masquerade as known expenses.
    if (expensesUsd !== null && expensesUsd > askingUsd * 0.01 && !/\b(?:gastos comunes|gc)\b[^.!?\n]{0,35}(?:usd|u\$s|us\$|uyu|\$)\s*[\d.,]+/.test(ownText)) expenses = null;
  }
  const publishedAt = typeof row.publishedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.publishedAt) &&
    date(row.publishedAt)?.slice(0, 10) === row.publishedAt && row.publishedAt <= lastSeen.slice(0, 10) ? row.publishedAt : null;
  return {
    key: `${match[1]}-${match[2]}`, id: row.id, operation: "sale", source: row.source as PublicSaleListing["source"], listingId: row.listingId,
    url: url.href, title, description: description(row.description), image: images[0] || null, images,
    sellerName: text(row.sellerName, 160).replace(/\s+/g, " "), department,
    sellerType: row.sellerType === "inmobiliaria" || row.sellerType === "particular" ? row.sellerType : "desconocido",
    ...publicAdvertiserFields(row, { source: row.source, url: url.href, sellerType: row.sellerType, now }),
    locality: text(row.locality, 160), neighborhood: text(row.neighborhood, 160), propertyType: row.propertyType,
    bedrooms: count(row.bedrooms), bathrooms: count(row.bathrooms, 1), parkingSpaces: optionalParking ? null : count(row.parkingSpaces),
    price, expenses, areas,
    amenities: [...new Set((Array.isArray(row.amenities) ? row.amenities : []).map(value => text(value, 80).replace(/\s+/g, " ")).filter(Boolean))].slice(0, 32),
    furnished: row.furnished === true ? true : null, geo,
    conditions: [...risks.filter(risk => PUBLIC_CONDITIONS.has(risk)), ...(optionalParking ? ["optional_parking"] : [])] as PublicSaleListing["conditions"],
    lastSeen, publishedAt, firstSeen: firstSeen && firstSeen <= lastSeen ? firstSeen : null,
  };
}

/** Repeated source IDs replace older reads; visually similar adverts stay separate. */
export function buildSaleCatalog(inputs: readonly SaleCatalogInput[], now: string, usdUyu: number): {
  listings: PublicSaleListing[]; meta: PublicSaleCatalogMeta;
} {
  if (!date(now) || !Number.isFinite(usdUyu) || usdUyu <= 0) throw new Error("Invalid sale catalogue clock or currency reference");
  const own = new Map<string, SaleCatalogInput>();
  for (const input of inputs) {
    const previous = own.get(input.listing.id);
    if (!previous || Date.parse(input.listing.lastSeen) > Date.parse(previous.listing.lastSeen)) own.set(input.listing.id, input);
  }
  const listings = [...own.values()].map(input => publicSaleListing(input, now, usdUyu)).filter((row): row is PublicSaleListing => row !== null)
    .sort((a, b) => a.key.localeCompare(b.key));
  const lastSeen = listings.map(row => row.lastSeen).sort().at(-1) || null;
  return { listings, meta: {
    key: "uy-sales", version: 1, generatedAt: new Date(now).toISOString(), lastSourceReadAt: lastSeen, usdUyu,
    total: listings.length, freshDays: 21, sourceCoverage: "partial",
    sources: (["infocasas", "casasweb"] as const).flatMap(key => {
      const own = listings.filter(row => row.source === key);
      return own.length ? [{ key, listings: own.length, lastSeen: own.map(row => row.lastSeen).sort().at(-1)!, complete: false as const }] : [];
    }),
    inputCount: own.size, excludedCount: own.size - listings.length,
  } };
}
