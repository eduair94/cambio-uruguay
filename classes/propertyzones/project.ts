import { rentalEligibility } from "../rentals/eligibility";
import type { RentalZoneMarketObservation } from "./market";

const SOURCES = new Set(["mercadolibre", "infocasas", "facebook", "casasweb", "elpais"]);
const record = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const name = (value: unknown): string => typeof value === "string" && value.length <= 120 && !/[\p{Cc}\p{Cf}<>]/u.test(value)
  ? value.normalize("NFC").trim().replace(/\s+/g, " ") : "";
const text = (value: unknown): string => typeof value === "string" ? value.slice(0, 30_000) : "";
const amount = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const fold = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036F]/g, "").toLowerCase().replace(/\s+/g, " ");

/** A default zero or a conditional discount is not evidence of recurring zero common expenses. */
export function zoneOwnCommonExpenses(offer: Record<string, any>, description: string): {
  commonExpenses: number | null; commonExpensesCurrency: "UYU" | "USD" | null;
} {
  const own = fold(`${text(offer.title)}\n${description}`).slice(0, 30_000);
  const negated = (start: number) => /\b(?:no|nunca|tampoco)(?: (?:es|son|esta|estan|se|ofrece|incluye|significa)){0,3} $/.test(own.slice(Math.max(0, start - 65), start));
  const conditional = (start: number, end: number) => {
    const before = own.slice(Math.max(0, start - 100), start).split(/[.;!?]/).pop() || "";
    const after = own.slice(end, end + 100).split(/[.;!]/)[0];
    return /^ ?\?/.test(after) || /\b(?:primer(?:os|a|as)?|durante|hasta|promocion|bonificad[oa])\b/.test(`${before} ${after}`) ||
      /^ ?(?:por )?(?:(?:el|los|las) )?(?:\d+|un|una|dos|tres|cuatro|seis|doce) (?:mes(?:es)?|ano|anos|dias?)\b/.test(after);
  };
  let zero = false;
  const statements: Array<{ amount: number; currency: "UYU" | "USD" | null }> = [];
  const zeroPattern = /\b(?:sin|no (?:tiene|paga|lleva|hay)) (?:gastos? comunes?|g\.? ?c\.?)\b|\b(?:gastos? comunes?|g\.? ?c\.?) ?(?:[:=-] ?)?(?:no (?:tiene|paga|hay)|sin costo)\b/g;
  for (const match of own.matchAll(zeroPattern)) if (!negated(match.index || 0) && !conditional(match.index || 0, (match.index || 0) + match[0].length)) zero = true;
  const pattern = /\b(?:gastos? comunes?|g\.? ?c\.?) ?(?:[:=-] ?)?(?:(?:aprox(?:imados?|imadamente)?\.?|mensuales?|estimados?|actuales?|de|son|es) ?(?:[:=-] ?)?)?(?:(uyu|\$u?|usd|u ?\$ ?s|us\$) ?)?(\d[\d.,]*)/g;
  for (const match of own.matchAll(pattern)) {
    if (negated(match.index || 0)) continue;
    const raw = match[2].replace(/[.,]+$/, "");
    const normalized = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".")
      : /^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(raw) ? raw.replace(/,/g, "")
        : /^\d{1,3}(?:[.,]\d{3})+$/.test(raw) ? raw.replace(/[.,]/g, "") : raw.replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0 || (value === 0 && conditional(match.index || 0, (match.index || 0) + match[0].length))) continue;
    const suffix = own.slice((match.index || 0) + match[0].length).match(/^ ?(usd|uyu|us\$|u ?\$ ?s|dolares|pesos)(?![a-z])/)?.[1];
    const symbols = [match[1], suffix].filter(Boolean);
    if (!symbols.length) statements.push({ amount: value, currency: null });
    for (const symbol of symbols) statements.push({ amount: value, currency: /usd|us\$|u ?\$ ?s|dolares/.test(symbol) ? "USD" : "UYU" });
    if (value === 0) zero = true;
  }
  const unknown = { commonExpenses: null, commonExpensesCurrency: null };
  const published = amount(offer.commonExpenses);
  const positive = statements.filter(row => row.amount > 0);
  if (zero) return positive.length || (published !== null && published > 0) ? unknown : { commonExpenses: 0, commonExpensesCurrency: "UYU" };
  if (published === null || published <= 0 || !["UYU", "USD"].includes(offer.commonExpensesCurrency)) return unknown;
  if (positive.some(row => Math.abs(row.amount - published) > Math.max(1, published * .01) || (row.currency !== null && row.currency !== offer.commonExpensesCurrency))) return unknown;
  return { commonExpenses: published, commonExpensesCurrency: offer.commonExpensesCurrency };
}

/** Only the same advert's published physical facts enter the market; all prose is then discarded. */
export function projectZoneObservations(value: unknown): RentalZoneMarketObservation[] {
  const row = record(value), propertyKey = name(row.key);
  if (!propertyKey || !Array.isArray(row.offers)) return [];
  const result: RentalZoneMarketObservation[] = [];
  for (const value of row.offers) {
    const offer = record(value), own = record(offer.identity), details = record(offer.details);
    const source = name(offer.source), listingId = name(offer.listingId);
    const nativeId = listingId.startsWith(source + ":") ? listingId.slice(source.length + 1) : listingId;
    if (own.version !== 1 || !SOURCES.has(source) || !/^[\w-]{1,120}$/.test(nativeId) ||
      ["constructor", "prototype", "__proto__"].includes(nativeId) || !["apartamento", "casa"].includes(own.propertyType)) continue;
    const department = name(own.department), neighborhood = name(own.neighborhood);
    if (!department || !neighborhood || !["UYU", "USD"].includes(offer.currency)) continue;
    const description = text(own.description || details.description);
    if (!rentalEligibility({ title: text(offer.title), description, guaranteeText: text(details.guaranteeText),
      price: offer.price, currency: offer.currency, propertyType: own.propertyType }).eligible) continue;
    const bedrooms = amount(own.bedrooms);
    const areaBuilt = amount(details.builtArea);
    // Total/land/reported area never substitutes for explicitly built square metres.
    const totalArea = amount(details.totalArea);
    const built = areaBuilt !== null && areaBuilt >= 8 && areaBuilt <= 100_000 &&
      !(own.propertyType === "apartamento" && totalArea && areaBuilt > totalArea * 1.05 && areaBuilt - totalArea > 2) ? areaBuilt : null;
    result.push({ propertyKey, advertId: `${source}:${nativeId}`, source,
      department, neighborhood, propertyType: own.propertyType,
      bedrooms: bedrooms !== null && Number.isInteger(bedrooms) && bedrooms <= 20 ? bedrooms : null,
      price: offer.price, currency: offer.currency, ...zoneOwnCommonExpenses(offer, description),
      areaBuilt: built, lastSeen: typeof offer.lastSeen === "string" ? offer.lastSeen : "" });
  }
  return result;
}

/** No full descriptions, contacts, exact addresses or identity objects are retained downstream. */
export const ZONE_RENTAL_PROJECTION = {
  _id: 0, key: 1,
  "offers.source": 1, "offers.listingId": 1, "offers.title": 1,
  "offers.price": 1, "offers.currency": 1, "offers.commonExpenses": 1, "offers.commonExpensesCurrency": 1,
  "offers.lastSeen": 1, "offers.identity.version": 1, "offers.identity.propertyType": 1,
  "offers.identity.department": 1, "offers.identity.neighborhood": 1, "offers.identity.bedrooms": 1,
  "offers.identity.description": 1, "offers.details.description": 1, "offers.details.guaranteeText": 1,
  "offers.details.builtArea": 1, "offers.details.totalArea": 1,
};
