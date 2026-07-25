// Shopify storefronts (Armo, Grassi, Cover Company). `/products.json` is a public, paginated,
// documented endpoint that returns the whole catalogue — no HTML parsing at all.
//
// The one thing it does NOT return is the shop's currency, and a USD price published as UYU is a
// 40x error. So the currency is read from the storefront at run time and a store whose currency
// cannot be established is skipped rather than guessed.
import { fetchJson, fetchText } from "../net";
import { isDeskChair } from "../normalize";
import type { ChairListing } from "../types";
import type { ChairSourceResult } from "./mercadolibre";
import type { ChairStore } from "./registry";

const PAGE_SIZE = 250;
const MAX_PAGES = 8;

interface ShopifyProduct {
  id?: number;
  title?: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[] | string;
  body_html?: string;
  variants?: Array<{ id?: number; sku?: string; price?: string; available?: boolean; title?: string }>;
  images?: Array<{ src?: string }>;
}

export async function detectShopifyCurrency(baseUrl: string): Promise<"UYU" | "USD" | null> {
  const html = await fetchText(baseUrl, { retries: 1 });
  if (!html) return null;
  const active = /Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/.exec(html)?.[1];
  const meta = /"currency"\s*:\s*"([A-Z]{3})"/.exec(html)?.[1];
  const found = (active || meta || "").toUpperCase();
  if (found === "UYU" || found === "USD") return found;
  return null;
}

const chairish = (product: ShopifyProduct): boolean => {
  const tags = Array.isArray(product.tags) ? product.tags.join(" ") : String(product.tags || "");
  return isDeskChair(String(product.title || ""), `${product.product_type || ""} ${tags}`);
};

export async function harvestShopifyStore(store: ChairStore): Promise<ChairSourceResult> {
  const observedAt = new Date().toISOString();
  const currency = await detectShopifyCurrency(store.baseUrl);
  if (!currency) {
    return { listings: [], ok: false, note: "no se pudo determinar la moneda de la tienda; se omite" };
  }

  const paths = store.collections?.length
    ? store.collections.map((handle) => `/collections/${handle}/products.json`)
    : ["/products.json"];

  const listings: ChairListing[] = [];
  let scanned = 0;
  let reachable = false;

  for (const path of paths) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const payload = await fetchJson<{ products?: ShopifyProduct[] }>(
        `${store.baseUrl}${path}?limit=${PAGE_SIZE}&page=${page}`,
        { retries: 2, timeoutMs: 30_000 }
      );
      const products = payload?.products;
      if (!products) break;
      reachable = true;
      scanned += products.length;

      for (const product of products) {
        if (!chairish(product)) continue;
        const variant = (product.variants || []).find((entry) => Number(entry.price) > 0);
        const price = Number(variant?.price);
        const title = String(product.title || "").trim();
        if (!title || !Number.isFinite(price) || price <= 0) continue;

        listings.push({
          listingId: `store:${store.key}:${product.handle || product.id || title}`,
          source: "store",
          sellerKey: store.key,
          sellerName: store.name,
          channel: store.channel,
          title,
          url: `${store.baseUrl}/products/${product.handle}`,
          price,
          currency,
          condition: "new",
          available: (product.variants || []).some((entry) => entry.available !== false),
          image: product.images?.[0]?.src || null,
          brand: String(product.vendor || "").trim(),
          model: "",
          catalogId: null,
          attributes: product.product_type ? { PRODUCT_TYPE: String(product.product_type) } : {},
          rating: null,
          ratingCount: 0,
          location: null,
          freeShipping: null,
          officialStore: true,
          observedAt,
        });
      }
      if (products.length < PAGE_SIZE) break;
    }
  }

  if (store.expectCurrency && store.expectCurrency !== currency) {
    return {
      listings,
      ok: true,
      note: `${scanned} productos, ${listings.length} sillas; moneda detectada ${currency} (se esperaba ${store.expectCurrency})`,
    };
  }
  return {
    listings,
    ok: reachable,
    note: reachable
      ? `${scanned} productos revisados, ${listings.length} sillas en ${currency}`
      : "products.json no respondió",
  };
}
