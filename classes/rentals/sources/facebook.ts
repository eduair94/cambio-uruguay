// Facebook Marketplace, read through the browser service on the 104 box (pm2
// `facebook_marketplace`, :9657) that owns the logged-in Chrome profile — the same bridge the
// chair directory uses.
//
// Marketplace is where the "dueño directo" half of the rental market posts: no agency, no
// comisión, and frequently no address beyond the city. That is exactly why it is worth having and
// exactly why its rows are the weakest for dedupe — with no street we can only merge them by
// barrio + price + dormitorios, so the merge rules in dedupe.ts refuse to guess.
//
// The bridge needs a live browser session. When it has none it answers
// `FB_MARKETPLACE_SESSION_UNAVAILABLE`, and this harvester reports `ok: false` so the run keeps
// yesterday's Marketplace rows instead of declaring them gone.
import { fetchJson } from "../net";
import {
  canonicalDepartment,
  inferPropertyType,
  isPlausibleRent,
  looksLikeRentalAdvert,
  parseAttributes,
  parseLocationLine,
} from "../normalize";
import type { RawRental, RentalCurrency } from "../types";
import type { RentalSourceResult } from "./types";

const API_BASE = (process.env.RENTALS_FB_API || "http://104.234.204.107:9657/facebook/marketplace").replace(
  /\/+$/,
  ""
);

const QUERIES = ["alquiler apartamento", "alquiler casa", "alquilo apartamento", "alquiler habitacion"];

/** Marketplace searches by city, so the list of cities IS the coverage. */
const LOCATIONS = (process.env.RENTALS_FB_LOCATIONS || "montevideo,ciudad-de-la-costa,maldonado,salto,paysandu")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

interface FbListing {
  id?: string;
  title?: string;
  url?: string;
  price?: { amount?: number; currency?: string };
  image?: string | null;
  location?: string | null;
  seller?: string | null;
}

interface FbResponse {
  ok?: boolean;
  error?: string;
  code?: string;
  results?: FbListing[];
}

export function toRawRental(item: FbListing, locationHint: string): RawRental | null {
  const id = String(item.id || "").trim();
  const title = String(item.title || "").trim();
  const amount = Number(item.price?.amount);
  const currency = String(item.price?.currency || "UYU").toUpperCase();
  if (!id || !title || !Number.isFinite(amount) || amount <= 0) return null;
  if (currency !== "UYU" && currency !== "USD") return null;
  if (!looksLikeRentalAdvert(title)) return null;

  // The card's location is a city ("Montevideo", "Ciudad de la Costa"), never a street.
  const location = parseLocationLine(String(item.location || ""), locationHint.replace(/-/g, " "));
  const attributes = parseAttributes([title]);

  return {
    source: "facebook",
    listingId: `facebook:${id}`,
    url: String(item.url || `https://www.facebook.com/marketplace/item/${id}`),
    title,
    price: amount,
    currency: currency as RentalCurrency,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: String(item.seller || "").trim() || "Facebook Marketplace",
    // Marketplace has no agency flag we can trust; most posters are private, but "most" is not a
    // fact about any given row.
    sellerType: "desconocido",
    image: String(item.image || "").trim() || null,
    publishedAt: null,
    propertyType: inferPropertyType(title),
    department: location.department || canonicalDepartment(locationHint.replace(/-/g, " ")),
    neighborhood: location.neighborhood,
    address: "",
    street: "",
    streetNumber: "",
    latitude: null,
    longitude: null,
    bedrooms: attributes.bedrooms,
    bathrooms: attributes.bathrooms,
    area: attributes.area,
  };
}

export async function harvestFacebookMarketplace(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  if (process.env.RENTALS_FB_ENABLED === "0") {
    return { key: "facebook", ok: true, listings: [], note: "deshabilitado por configuración" };
  }

  const perQuery = Number(process.env.RENTALS_FB_LIMIT || 40);
  const locations = mode === "fast" ? LOCATIONS.slice(0, 1) : LOCATIONS;
  const queries = mode === "fast" ? QUERIES.slice(0, 2) : QUERIES;

  const byId = new Map<string, RawRental>();
  let reachable = false;
  let lastError = "";

  for (const location of locations) {
    for (const query of queries) {
      const url = `${API_BASE}/search?${new URLSearchParams({
        q: query,
        location,
        limit: String(perQuery),
      })}`;
      const payload = await fetchJson<FbResponse>(url, { timeoutMs: 120_000, retries: 1, unthrottled: true });
      if (!payload) {
        lastError = "sin respuesta del servicio";
        continue;
      }
      if (payload.error) lastError = `${payload.code || ""} ${payload.error}`.trim();
      if (!Array.isArray(payload.results)) continue;
      if (payload.results.length) reachable = true;

      for (const item of payload.results) {
        const listing = toRawRental(item, location);
        if (!listing) continue;
        const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
        if (!isPlausibleRent(priceUyu)) continue;
        byId.set(listing.listingId, listing);
      }
    }
  }

  return {
    key: "facebook",
    ok: reachable,
    listings: [...byId.values()],
    note: reachable ? `${byId.size} avisos en ${locations.length} ciudades` : `sin sesión del navegador: ${lastError}`,
  };
}
