// Facebook Marketplace, read through the scraper service on the 104 box (pm2 app
// `facebook-marketplace`, `servers/facebook-marketplace-server.ts` in the trustpilot repo). That
// service owns the logged-in Chrome profile and the proxy pool; this module only speaks HTTP to it.
//
// Marketplace is the used-chair half of the Uruguayan market — an Aeron at a third of retail is a
// real option people take — so its listings are marked `used` unless the seller says otherwise and
// are never mixed into the "new" price statistics.
import { fetchJson } from "../net";
import { isDeskChairTitle } from "../normalize";
import type { ChairListing } from "../types";
import type { ChairSourceResult } from "./mercadolibre";

const API_BASE = (process.env.CHAIR_FB_API || "http://104.234.204.107:9657/facebook/marketplace").replace(
  /\/+$/,
  ""
);
const QUERIES = ["silla de escritorio", "silla ergonomica", "silla gamer", "silla oficina"];
const PER_QUERY = Number(process.env.CHAIR_FB_LIMIT || 40);

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

export async function harvestFacebookMarketplace(): Promise<ChairSourceResult> {
  if (process.env.CHAIR_FB_ENABLED === "0") {
    return { listings: [], ok: true, note: "deshabilitado por configuración" };
  }
  const observedAt = new Date().toISOString();
  const byId = new Map<string, ChairListing>();
  let reachable = false;
  let lastError = "";

  for (const query of QUERIES) {
    const url = `${API_BASE}/search?${new URLSearchParams({
      q: query,
      location: process.env.CHAIR_FB_LOCATION || "montevideo",
      limit: String(PER_QUERY),
    })}`;
    const payload = await fetchJson<FbResponse>(url, { timeoutMs: 120_000, retries: 1, unthrottled: true });
    if (!payload) {
      lastError = "sin respuesta del servicio";
      continue;
    }
    if (payload.error) lastError = payload.error;
    if (!Array.isArray(payload.results)) continue;
    reachable = true;

    for (const item of payload.results) {
      const id = String(item.id || "").trim();
      const title = String(item.title || "").trim();
      const amount = Number(item.price?.amount);
      const currency = String(item.price?.currency || "UYU").toUpperCase();
      if (!id || !title || !Number.isFinite(amount) || amount <= 0) continue;
      if (currency !== "UYU" && currency !== "USD") continue;
      if (!isDeskChairTitle(title)) continue;

      const condition = String(item.condition || "").toLowerCase();
      byId.set(`fb:${id}`, {
        listingId: `fb:${id}`,
        source: "facebook",
        sellerKey: "facebook",
        sellerName: item.seller?.trim() || "Facebook Marketplace",
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
        attributes: {},
        rating: null,
        ratingCount: 0,
        location: item.location || null,
        freeShipping: null,
        officialStore: false,
        observedAt,
      });
    }
  }

  return {
    listings: [...byId.values()],
    ok: reachable,
    note: reachable ? `${byId.size} publicaciones` : `no disponible${lastError ? `: ${lastError}` : ""}`,
  };
}
