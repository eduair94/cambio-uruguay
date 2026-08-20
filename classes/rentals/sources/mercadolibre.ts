// MercadoLibre Uruguay, read through the scraper service on the 104 box (pm2 `mercadolibre`,
// :9656) — the same bridge the chair directory uses. We do not re-implement the MLU client here.
//
// The catch that shapes this file: the bridge's TRIMMED response drops the fields a rental needs
// (address, dormitorios, m²) because it was built for products. The RAW response keeps them, but
// only inside ML's "polycard" search layout — a nested UI payload, 20 cards per page regardless of
// `limit`. So we ask for `raw=true`, walk the tree for polycards, and read the card the way the
// search page renders it: `attributes_list` for "2 dormitorios | 1 baño | 40 m² cubiertos" and
// `location` for "Av. Garzón 1975 Bis, Colón, Montevideo".
import { fetchJson } from "../net";
import { inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseAttributes, parseLocationLine } from "../normalize";
import type { RawRental, RentalCurrency } from "../types";
import type { RentalSourceResult } from "./types";

const API_BASE = (process.env.RENTALS_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");

/** "Inmuebles > Alquiler" on MLU. Every rental advert lives under it. */
const RENT_CATEGORY = "MLU1473";

/** ML's search page returns 20 cards per request whatever `limit` says. */
const PAGE_SIZE = 20;

/**
 * The bridge requires a text query, and one query does not see the whole category: `alquiler`
 * misses adverts whose text never uses the word. Several broad queries inside the rental category,
 * deduped by item id, cover far more than any single one.
 */
const QUERIES = ["alquiler", "apartamento", "casa", "habitacion", "monoambiente", "local", "oficina"];

interface Polycard {
  metadata?: {
    id?: string;
    url_params?: string;
    category_id?: string;
    domain_id?: string;
  };
  components?: Array<{
    type?: string;
    title?: { text?: string };
    price?: { current_price?: { value?: number; currency?: string } };
    attributes_list?: { texts?: string[] };
    location?: { text?: string };
  }>;
}

/** Walks the search layout for every polycard, wherever ML decided to nest them this week. */
export function collectPolycards(payload: unknown): Polycard[] {
  const found: Polycard[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.polycard && typeof record.polycard === "object") found.push(record.polycard as Polycard);
    for (const value of Object.values(record)) visit(value);
  };
  visit(payload);
  return found;
}

const componentOf = (card: Polycard, type: string) => card.components?.find((component) => component.type === type);

export function toRawRental(card: Polycard): RawRental | null {
  const id = String(card.metadata?.id || "").trim();
  if (!id) return null;

  const params = new URLSearchParams(String(card.metadata?.url_params || "").replace(/^\?/, ""));
  const title = String(componentOf(card, "title")?.title?.text || params.get("title") || "").trim();
  const permalink = String(params.get("permalink") || "").trim();
  const priceValue = Number(componentOf(card, "price")?.price?.current_price?.value ?? params.get("price"));
  const currencyRaw = String(
    componentOf(card, "price")?.price?.current_price?.currency || params.get("currency_id") || ""
  ).toUpperCase();

  if (!title || !permalink || !Number.isFinite(priceValue) || priceValue <= 0) return null;
  if (currencyRaw !== "UYU" && currencyRaw !== "USD") return null;
  if (!looksLikeRentalAdvert(title)) return null;

  const attributes = parseAttributes(componentOf(card, "attributes_list")?.attributes_list?.texts || []);
  const location = parseLocationLine(
    componentOf(card, "location")?.location?.text || params.get("location") || ""
  );

  return {
    source: "mercadolibre",
    listingId: `mercadolibre:${id}`,
    url: permalink,
    title,
    price: priceValue,
    currency: currencyRaw as RentalCurrency,
    // ML's search card never states gastos comunes. Saying "0" would be inventing a number, so the
    // field stays null and the page shows "no informa".
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: "Mercado Libre",
    sellerType: "desconocido",
    image: String(params.get("picture") || params.get("thumbnail") || "").trim() || null,
    publishedAt: null,
    propertyType: inferPropertyType(title, card.metadata?.domain_id || null),
    department: location.department,
    neighborhood: location.neighborhood,
    address: location.address,
    street: location.street,
    streetNumber: location.number,
    latitude: null,
    longitude: null,
    bedrooms: attributes.bedrooms,
    bathrooms: attributes.bathrooms,
    area: attributes.area,
  };
}

async function searchPage(query: string, offset: number, since?: string): Promise<Polycard[] | null> {
  const params = new URLSearchParams({
    country: "UY",
    category: RENT_CATEGORY,
    q: query,
    offset: String(offset),
    limit: String(PAGE_SIZE),
    raw: "true",
  });
  if (since) params.set("since", since);
  const payload = await fetchJson<unknown>(`${API_BASE}/search?${params}`, {
    timeoutMs: 45_000,
    retries: 2,
    // Deliberately THROTTLED even though the bridge is ours: a full sweep is ~800 requests, and
    // every one of them is a request the bridge makes to MercadoLibre. The chair harvester can
    // afford `unthrottled` because it asks for 36 pages; this one would be a burst.
  });
  if (!payload) return null;
  return collectPolycards((payload as any).components ?? payload);
}

export async function harvestMercadoLibre(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const maxPages =
    mode === "fast" ? Number(process.env.RENTALS_ML_FAST_PAGES || 12) : Number(process.env.RENTALS_ML_MAX_PAGES || 120);
  // Fast runs read the same category filtered to today's publications: ~500 adverts, 25 pages.
  const since = mode === "fast" ? "today" : undefined;
  const queries = mode === "fast" ? ["alquiler"] : QUERIES;

  const byId = new Map<string, RawRental>();
  let pages = 0;
  let reachable = false;
  let rejected = 0;

  for (const query of queries) {
    for (let page = 0; page < maxPages; page++) {
      const cards = await searchPage(query, page * PAGE_SIZE, since);
      if (cards === null) break;
      pages++;
      if (cards.length) reachable = true;

      for (const card of cards) {
        const listing = toRawRental(card);
        if (!listing) {
          rejected++;
          continue;
        }
        const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
        if (!isPlausibleRent(priceUyu, listing.propertyType)) {
          rejected++;
          continue;
        }
        byId.set(listing.listingId, listing);
      }

      if (cards.length < PAGE_SIZE) break;
    }
  }

  return {
    key: "mercadolibre",
    ok: reachable && byId.size > 0,
    listings: [...byId.values()],
    note: reachable
      ? `${pages} páginas, ${byId.size} avisos, ${rejected} descartados`
      : `sin respuesta de ${API_BASE}`,
  };
}
