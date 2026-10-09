// Facebook Marketplace for the retail directories (chairs, equipar, movilidad), read from the
// logged-in profile Chrome over CDP with the shared search reader (classes/facebook/search.ts):
// each search scrolled to the end or to its cap, the cards taken from Facebook's GraphQL stream.
//
// Until 2026-10-09 this went through the scraper service on the 104 box (pm2 `facebook_marketplace`,
// :9657, trustpilot repo), which scrolls a few screens and then parses the visible grid. The grid
// is virtualized — the DOM never holds more than ~45 item links — so the cards that scrolled past
// were lost before it read, and it capped each search at 40. That service stays as the fallback
// when the browser cannot be reached (`RETAIL_FB_BROWSER=0` forces it).
//
// Marketplace is the used half of the Uruguayan market — an Aeron at a third of retail, a fridge at
// a quarter — so its listings are marked `used` unless the seller says otherwise and are never
// mixed into the "new" price statistics. A search card carries no condition at all (only the
// bridge's text grid sometimes did), so through the browser every card is `used`.
//
// A Marketplace title identifies almost nothing ("heladera funcionando", "juego de ollas"), so a
// caller must never use these rows to build a branded product row. They belong in a used-price band
// for a category, and nowhere else. The seller's name is never copied: on Marketplace it is usually
// a private person's.
import { readMarketplaceSearches, type MarketplaceSearchRead } from "../../facebook/search";
import { fetchJson } from "../net";
import type { CategorySpec, RetailListing, RetailSourceResult } from "../types";

const API_BASE = (
  process.env.RETAIL_FB_API ||
  process.env.CHAIR_FB_API ||
  "http://104.234.204.107:9657/facebook/marketplace"
).replace(/\/+$/, "");
const PER_QUERY = Number(process.env.RETAIL_FB_LIMIT || process.env.CHAIR_FB_LIMIT || 40);
const SELLER = "Facebook Marketplace";

/**
 * Per run. A price band needs a few hundred cards per category, not the whole market, and every
 * scroll spends the same session rentals and autos read with: 8 pages (~190 cards) a search once a
 * day, 3 pages every hour. The lock wait covers another job's read (rentals, autos).
 */
export const RETAIL_FB_BUDGET = {
  daily: { maxScrolls: 8, minutes: 25, lockWaitMinutes: 20 },
  fast: { maxScrolls: 3, minutes: 8, lockWaitMinutes: 10 },
  stagnantRounds: 3,
  gapMs: 6_000,
} as const;

interface FbListing {
  id?: string;
  title?: string;
  url?: string;
  price?: { amount?: number; currency?: string };
  image?: string | null;
  location?: string | null;
  condition?: string | null;
  seller?: string | null;
}

interface FbResponse {
  ok?: boolean;
  error?: string;
  results?: FbListing[];
}

const location = (): string => process.env.RETAIL_FB_LOCATION || process.env.CHAIR_FB_LOCATION || "montevideo";

/** One card under one category, or null when the category or the price does not take it. */
function toListing(item: FbListing, spec: CategorySpec, observedAt: string): RetailListing | null {
  const id = String(item.id || "").trim();
  const title = String(item.title || "").trim();
  const amount = Number(item.price?.amount);
  const currency = String(item.price?.currency || "UYU").toUpperCase();
  if (!id || !title || !Number.isFinite(amount) || amount <= 0) return null;
  if (currency !== "UYU" && currency !== "USD") return null;
  if (!spec.accept(title)) return null;
  const condition = String(item.condition || "").toLowerCase();
  return {
    listingId: `fb:${id}`,
    source: "facebook",
    sellerKey: "facebook",
    sellerName: SELLER,
    channel: "classifieds",
    title,
    url: String(item.url || `https://www.facebook.com/marketplace/item/${id}`),
    price: amount,
    currency,
    condition: condition.includes("nuevo") || condition.includes("new") ? "new" : "used",
    available: true,
    image: item.image || null,
    brand: "",
    model: "",
    catalogId: null,
    attributes: { CATEGORY_SPEC: spec.key },
    rating: null,
    ratingCount: 0,
    location: item.location || null,
    freeShipping: null,
    officialStore: false,
    observedAt,
  };
}

export interface RetailFacebookOptions {
  /** The hourly pass: fewer pages per search. */
  fast?: boolean;
  /** The browser reader; defaults to the profile Chrome. */
  reader?: typeof readMarketplaceSearches;
}

export async function harvestFacebookMarketplace(
  specs: readonly CategorySpec[],
  maxQueries = Number(process.env.RETAIL_FB_MAX_QUERIES || 0) || Infinity,
  options: RetailFacebookOptions = {}
): Promise<RetailSourceResult> {
  if (process.env.RETAIL_FB_ENABLED === "0" || process.env.CHAIR_FB_ENABLED === "0") {
    return { listings: [], ok: true, note: "deshabilitado por configuración" };
  }
  const observedAt = new Date().toISOString();

  // Interleaved like the MercadoLibre plan: a budget cut has to cost every category its tail, not
  // one category everything. Callers put what matters first.
  const planned: Array<{ query: string; spec: CategorySpec }> = [];
  for (let round = 0; ; round++) {
    const slice = specs
      .map((spec) => ({ query: spec.fbQueries?.[round], spec }))
      .filter((entry): entry is { query: string; spec: CategorySpec } => Boolean(entry.query));
    if (!slice.length) break;
    planned.push(...slice);
  }
  const budgeted = planned.slice(0, maxQueries);
  const outOfBudget = planned.length > budgeted.length ? `, ${planned.length - budgeted.length} búsquedas fuera de presupuesto` : "";

  let fallbackReason = "";
  if (process.env.RETAIL_FB_BROWSER !== "0" && budgeted.length) {
    const budget = options.fast ? RETAIL_FB_BUDGET.fast : RETAIL_FB_BUDGET.daily;
    const read: MarketplaceSearchRead = await (options.reader ?? readMarketplaceSearches)({
      owner: "retail",
      searches: budgeted.map(({ query }) => ({ location: location(), query })),
      maxScrolls: budget.maxScrolls,
      stagnantRounds: RETAIL_FB_BUDGET.stagnantRounds,
      maxDurationMs: budget.minutes * 60_000,
      gapMs: RETAIL_FB_BUDGET.gapMs,
      lockWaitMs: budget.lockWaitMinutes * 60_000,
      // A narrow wording ("juego de ollas") can end on its first page; that is not the throttle.
      stallFloor: 20,
    });
    if (read.busy || (read.sessionLost && !read.lists)) {
      // Not the bridge: it drives the same Chrome, which another job is scrolling right now or
      // whose session is gone.
      return { listings: [], ok: false, note: `no disponible: ${read.note}` };
    }
    if (read.lists > 0) {
      const cards = new Map(read.cards.map((card) => [card.id, card]));
      const byId = new Map<string, RetailListing>();
      budgeted.forEach(({ spec }, index) => {
        for (const id of read.perSearch[index] ?? []) {
          const card = cards.get(id);
          const listing = card && toListing(card, spec, observedAt);
          if (listing) byId.set(listing.listingId, listing);
        }
      });
      return {
        listings: [...byId.values()],
        ok: true,
        note: `${byId.size} publicaciones${outOfBudget}; navegador: ${read.cards.length} tarjetas, `
          + `${read.lists} búsquedas (${read.exhausted} leídas hasta el final, ${read.stalled} frenadas), ${read.failed} fallidas`
          + (read.note ? `; ${read.note}` : ""),
      };
    }
    fallbackReason = `navegador sin lecturas (${read.note || "sin búsquedas"}); `;
  }

  const byId = new Map<string, RetailListing>();
  let reachable = false;
  let lastError = "";
  for (const { query, spec } of budgeted) {
    const url = `${API_BASE}/search?${new URLSearchParams({ q: query, location: location(), limit: String(PER_QUERY) })}`;
    const payload = await fetchJson<FbResponse>(url, { timeoutMs: 120_000, retries: 1, unthrottled: true });
    if (!payload) {
      lastError = "sin respuesta del servicio";
      continue;
    }
    if (payload.error) lastError = payload.error;
    if (!Array.isArray(payload.results)) continue;
    reachable = true;
    for (const item of payload.results) {
      const listing = toListing(item, spec, observedAt);
      if (listing) byId.set(listing.listingId, listing);
    }
  }

  return {
    listings: [...byId.values()],
    ok: reachable,
    note: reachable
      ? `${fallbackReason}${byId.size} publicaciones${outOfBudget}`
      : `${fallbackReason}no disponible${lastError ? `: ${lastError}` : ""}`,
  };
}
