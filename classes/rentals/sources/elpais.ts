// Inmuebles El País publishes the first 24 adverts of each category in its server HTML.
// Its robots.txt excludes /api/, so we ONLY read the public category sitemap and those pages.
// This is deliberately partial coverage, never evidence that an unseen advert has disappeared.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { guaranteesFromText } from "../guarantees";
import { canonicalDepartment, inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseCurrency, parseStreet } from "../normalize";
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
      return url.origin === ORIGIN && /^\/alquiler\/[a-z-]+\/[a-z0-9-]+\/?$/.test(url.pathname) && !url.search;
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

export function elpaisToRawRental(value: unknown): RawRental | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, any>;
  if (row.transactionType !== "rental" || row.status !== "active" || row.pausedByAdmin || row.trashedAt) return null;
  if (!/^[a-f0-9]{24}$/i.test(String(row._id || ""))) return null;
  const title = String(row.title || "").trim();
  const price = positive(row.price?.amount);
  const currency = parseCurrency(row.price?.currency);
  if (!title || !price || !currency || !looksLikeRentalAdvert(title)) return null;
  const department = canonicalDepartment(String(row.province || ""));
  if (!department) return null;
  const address = String(row.address || "").replace(/\s*-?\s*Ref\s*:.*$/i, "").trim();
  const street = parseStreet(address);
  const expenses = row.expenses?.amount;
  // This portal imports third-party records: a numeric 0 may be an import default. Only the
  // original advert explicitly saying "sin gastos comunes" turns that value into a free expense.
  const noExpenses = /\bsin gastos comunes\b/i.test(`${title} ${typeof row.description === "string" ? row.description : ""}`);
  const commonExpenses = positive(expenses) ?? (noExpenses ? 0 : null);
  const coordinates = row.geo?.coordinates;
  const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
  const lon = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
  const located = lat >= -35.9 && lat <= -30 && lon >= -58.6 && lon <= -53;
  const image = row.images?.find((item: any) => item.isPrimary) || row.images?.[0];
  const seller = String(row.contact?.company || row.sourceAgency || "").trim();
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
    guarantees: guaranteesFromText(typeof row.description === "string" ? row.description : ""),
  };
}

export async function harvestElpais(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const sitemap = await fetchText(`${ORIGIN}/sitemaps/categories.xml`, { retries: 0 });
  if (!sitemap) {
    return { key: "elpais", ok: false, complete: false, listings: [],
      note: "No se pudo leer el sitemap público de categorías; fuente no actualizada." };
  }
  const urls = elpaisCategoryUrls(sitemap);
  if (!urls.length) {
    return { key: "elpais", ok: false, complete: false, listings: [],
      note: "El sitemap público no contiene categorías de alquiler reconocibles; fuente no actualizada." };
  }
  const limit = Math.max(1, Number(mode === "fast" ? process.env.RENTALS_EP_FAST_PAGES || 8 : process.env.RENTALS_EP_MAX_PAGES || 250));
  const byId = new Map<string, RawRental>();
  let pages = 0;
  let failures = 0;
  let consecutiveFailures = 0;
  for (const url of urls.slice(0, limit)) {
    const html = await fetchText(url, { retries: 0 });
    const rows = html ? extractElpaisRows(html) : null;
    if (!rows) {
      failures++;
      if (++consecutiveFailures >= 3) break;
      continue;
    }
    consecutiveFailures = 0;
    pages++;
    for (const row of rows) {
      const listing = elpaisToRawRental(row);
      if (listing && isPlausibleRent(listing.price * (listing.currency === "USD" ? usdUyu : 1), listing.propertyType)) byId.set(listing.listingId, listing);
    }
  }
  return {
    key: "elpais", ok: byId.size > 0, complete: false, listings: [...byId.values()],
    note: `${pages} categorías públicas, ${byId.size} avisos únicos — cobertura parcial: hasta 24 avisos por categoría` +
      (failures ? `; ${failures} páginas sin datos` : ""),
  };
}
