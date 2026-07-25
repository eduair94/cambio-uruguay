// MercadoLibre Uruguay, read through the existing scraper service on the 104 box
// (pm2 app `mercadolibre`, `servers/mercadolibre-server.ts` in the trustpilot repo). We do NOT
// re-implement the MLU client here: that service already owns the device ids, headers and proxy
// handling, and it is the same bridge other projects use.
import { fetchJson } from "../net";
import { chairCategory, isDeskChairTitle } from "../normalize";
import type { ChairListing } from "../types";

const API_BASE = (process.env.CHAIR_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");
const PAGE_SIZE = 50;
const MAX_PAGES_PER_QUERY = Number(process.env.CHAIR_ML_MAX_PAGES || 4);

/** Sillas de Oficina on MLU. Kept alongside the text queries so nothing niche is missed. */
const CHAIR_CATEGORY = "MLU77709";

const QUERIES = [
  "silla escritorio",
  "silla oficina",
  "silla ergonomica",
  "silla gamer",
  "silla ejecutiva",
  "silla operativa",
  "silla de computadora",
  "silla escritorio malla",
];

interface MlSearchResponse {
  paging?: { total?: number; offset?: number; limit?: number; returned?: number };
  results?: MlResult[];
}

interface MlResult {
  id?: string;
  catalog_product_id?: string | null;
  title?: string;
  permalink?: string;
  category_id?: string;
  condition?: string;
  price?: {
    amount?: number;
    currency?: string;
  };
  image?: string;
  seller?: { id?: number; name?: string; official_store?: boolean; city?: string };
  reviews?: { rating?: number; total?: number };
  free_shipping?: boolean;
  attributes?: Array<{ id?: string; name?: string; value?: string }>;
}

const conditionOf = (value: string | undefined): ChairListing["condition"] => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "new" || normalized === "nuevo") return "new";
  if (normalized === "used" || normalized === "usado") return "used";
  if (normalized.includes("refurb") || normalized.includes("reacondicionado")) return "refurbished";
  return "unknown";
};

function toListing(result: MlResult, observedAt: string): ChairListing | null {
  const id = String(result.id || "").trim();
  const title = String(result.title || "").trim();
  const amount = Number(result.price?.amount);
  const currency = String(result.price?.currency || "").toUpperCase();
  const url = String(result.permalink || "").trim();
  if (!id || !title || !url || !Number.isFinite(amount) || amount <= 0) return null;
  if (currency !== "UYU" && currency !== "USD") return null;

  const attributes: Record<string, string> = {};
  for (const attribute of result.attributes || []) {
    const key = String(attribute.id || attribute.name || "").trim();
    const value = String(attribute.value ?? "").trim();
    if (key && value) attributes[key] = value;
  }

  return {
    listingId: `ml:${id}`,
    source: "mercadolibre",
    sellerKey: `ml:${result.seller?.id ?? "unknown"}`,
    sellerName: String(result.seller?.name || "Mercado Libre").trim(),
    channel: "marketplace",
    title,
    url,
    price: amount,
    currency,
    condition: conditionOf(result.condition),
    available: true,
    image: result.image || null,
    brand: attributes.BRAND || "",
    model: attributes.MODEL || attributes.ALPHANUMERIC_MODEL || attributes.DETAILED_MODEL || "",
    catalogId: result.catalog_product_id ? String(result.catalog_product_id) : null,
    attributes,
    rating: Number.isFinite(Number(result.reviews?.rating)) ? Number(result.reviews?.rating) : null,
    ratingCount: Number(result.reviews?.total) || 0,
    location: result.seller?.city || null,
    freeShipping: typeof result.free_shipping === "boolean" ? result.free_shipping : null,
    officialStore: Boolean(result.seller?.official_store),
    observedAt,
  };
}

async function searchPage(params: Record<string, string>): Promise<MlResult[]> {
  const query = new URLSearchParams({ country: "UY", limit: String(PAGE_SIZE), ...params });
  const response = await fetchJson<MlSearchResponse>(`${API_BASE}/search?${query}`, {
    timeoutMs: 45_000,
    retries: 2,
    unthrottled: true,
  });
  return response?.results ?? [];
}

export interface ChairSourceResult {
  listings: ChairListing[];
  ok: boolean;
  note: string;
}

export async function harvestMercadoLibre(): Promise<ChairSourceResult> {
  const observedAt = new Date().toISOString();
  const byId = new Map<string, ChairListing>();
  let reachable = false;
  let pages = 0;
  let rejected = 0;

  const scans: Array<Record<string, string>> = [
    ...QUERIES.map((q) => ({ q })),
    { q: "silla", category: CHAIR_CATEGORY },
  ];

  for (const scan of scans) {
    for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
      const results = await searchPage({ ...scan, offset: String(page * PAGE_SIZE) });
      pages++;
      if (results.length) reachable = true;
      for (const result of results) {
        const listing = toListing(result, observedAt);
        if (!listing) continue;
        // The category scan is already chair-only; text queries need the title filter.
        if (!scan.category && !isDeskChairTitle(listing.title)) {
          rejected++;
          continue;
        }
        if (scan.category && chairCategory(listing.title, listing.attributes) === "unknown" && !isDeskChairTitle(listing.title)) {
          rejected++;
          continue;
        }
        const existing = byId.get(listing.listingId);
        if (!existing || listing.price < existing.price) byId.set(listing.listingId, listing);
      }
      if (results.length < PAGE_SIZE) break;
    }
  }

  return {
    listings: [...byId.values()],
    ok: reachable,
    note: reachable
      ? `${pages} páginas, ${rejected} descartadas por no ser sillas de escritorio`
      : `sin respuesta de ${API_BASE}`,
  };
}
