// Automated collection is disabled: the portal's terms expressly prohibit scraping (2026-09-05).
// Keep these pure parsers for offline validation of existing samples and a future authorized feed.
// Public HTML or a permissive robots path does not establish permission to reuse the catalogue.
import * as cheerio from "cheerio";
import { guaranteesFromText } from "../guarantees";
import { canonicalDepartment, flatten, inferPropertyType, looksLikeRentalAdvert, parseCurrency, parseStreet } from "../normalize";
import type { RawRental, RentalPropertyType } from "../types";
import type { RentalSourceResult } from "./types";

const ORIGIN = "https://inmuebles.elpais.com.uy";
const TYPES: Record<string, RentalPropertyType> = {
  apartment: "apartamento", house: "casa", room: "habitacion", office: "oficina",
  commercial: "local", commercial_space: "local", land: "terreno",
};

export function elpaisCategoryUrls(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  return [...new Set($("loc").map((_, node) => $(node).text().trim()).get().filter((raw) => {
    try {
      const url = new URL(raw);
      return url.origin === ORIGIN && /^\/alquiler\/[a-z-]+\/[a-z0-9-]+\/?$/.test(url.pathname)
        && !url.search && !url.hash && !url.username && !url.password;
    } catch { return false; }
  }))];
}

/** Extract a balanced JSON array without evaluating any publisher JavaScript. */
function arrayAfter(text: string, marker: string): unknown[] | null {
  const found = text.indexOf(marker);
  if (found < 0) return null;
  const start = found + marker.length - 1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "[") depth++;
    else if (char === "]" && --depth === 0) {
      try { const result = JSON.parse(text.slice(start, index + 1)); return Array.isArray(result) ? result : null; }
      catch { return null; }
    }
  }
  return null;
}

/** Next Flight chunks are JSON strings, occasionally split in the middle of a property. */
export function extractElpaisRows(html: string): unknown[] | null {
  const $ = cheerio.load(html);
  const chunks: string[] = [];
  $("script").each((_, node) => {
    const script = $(node).text().trim();
    const match = script.match(/^self\.__next_f\.push\((\[.*\])\);?$/s);
    if (!match) return;
    try {
      const chunk = JSON.parse(match[1]!);
      if (chunk[0] === 1 && typeof chunk[1] === "string") chunks.push(chunk[1]);
    } catch { /* A malformed chunk is not executable input. */ }
  });
  return arrayAfter(chunks.join(""), '"listings":[');
}

const positive = (value: unknown): number | null => value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;

/** A rental category can contain fortnight or named-month holiday prices. */
function hasOnlyShortTermPrice(title: string, description: string): boolean {
  const text = flatten(`${title} ${description.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")}`);
  if (/\banual(?:es)?\b/.test(text)) return false;
  if (/\b(?:primera|segunda|1ra|2da) quincena\b|\b(?:por|precio(?: de| por)?|alquiler(?: por)?) quincena\b/.test(text)) return true;
  // "Desde febrero" can be an annual start date. "En febrero 2023" names a bounded stay.
  return /\bdisponible en alquiler en (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre) (?:de )?20\d{2}\b/.test(text);
}

export function elpaisToRawRental(value: unknown): RawRental | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, any>;
  if (row.transactionType !== "rental" || row.status !== "active" || row.pausedByAdmin || row.trashedAt) return null;
  if (!/^[a-f0-9]{24}$/i.test(String(row._id || ""))) return null;
  const title = String(row.title || "").trim();
  const description = typeof row.description === "string" ? row.description : "";
  const price = positive(row.price?.amount);
  const currency = parseCurrency(row.price?.currency);
  if (!title || !price || !currency || !looksLikeRentalAdvert(title, description) || hasOnlyShortTermPrice(title, description)) return null;
  const department = canonicalDepartment(String(row.province || ""));
  if (!department) return null;
  const address = String(row.address || "").replace(/\s*-?\s*Ref\s*:.*$/i, "").trim();
  const street = parseStreet(address);
  const expenses = row.expenses?.amount;
  // This portal imports third-party records: a numeric 0 may be an import default. Only the
  // original advert explicitly saying "sin gastos comunes" turns that value into a free expense.
  const noExpenses = /\bsin gastos comunes\b/i.test(`${title} ${description}`);
  const commonExpenses = positive(expenses) ?? (noExpenses ? 0 : null);
  const coordinates = row.geo?.coordinates;
  const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
  const lon = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
  const located = lat >= -35.9 && lat <= -30 && lon >= -58.6 && lon <= -53;
  const images = Array.isArray(row.images) ? row.images.filter((item: any) => item && typeof item === "object") : [];
  const image = images.find((item: any) => item.isPrimary) || images[0];
  const agency = typeof row.sourceAgency === "string" ? row.sourceAgency : row.sourceAgency?.raw;
  const seller = [row.contact?.company, agency].find(item => typeof item === "string" && item.trim())?.trim() || "";
  // Do not use the portal's AI-enriched features/visualDescription or its converted costs.
  // Only original money fields and advert text provide evidence for the facets we persist.
  return {
    source: "elpais", listingId: `elpais:${row._id}`, url: `${ORIGIN}/property/${row._id}`,
    title, price, currency, commonExpenses,
    commonExpensesCurrency: commonExpenses === null ? null : parseCurrency(row.expenses?.currency),
    sellerName: seller || "Inmuebles El País", sellerType: row.ownerDirect === true ? "particular" : seller ? "inmobiliaria" : "desconocido",
    image: typeof (image?.publicUrl || image?.url) === "string" ? image.publicUrl || image.url : null,
    // createdAt is the portal's import date, not necessarily the advert's publication date.
    publishedAt: null, propertyType: TYPES[String(row.propertyType)] || inferPropertyType(title),
    department, neighborhood: String(row.neighborhood || "").trim(), address,
    street: street.street, streetNumber: street.number,
    latitude: located ? lat : null, longitude: located ? lon : null,
    bedrooms: row.bedrooms != null && Number.isInteger(Number(row.bedrooms)) && Number(row.bedrooms) >= 0 ? Number(row.bedrooms) : null,
    bathrooms: positive(row.bathrooms), area: positive(row.areaM2),
    parkingSpaces: null, furnished: null, petsAllowed: null,
    guarantees: guaranteesFromText(description),
  };
}

export async function harvestElpais(_mode: "full" | "fast", _usdUyu: number): Promise<RentalSourceResult> {
  return {
    key: "elpais", ok: false, complete: false, access: "external_only", listings: [],
    note: "Consulta externa; actualización automática no habilitada por las condiciones del portal.",
  };
}
