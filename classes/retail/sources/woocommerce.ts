// WooCommerce storefronts (American Mesh, Prontometal, Punto Unión, TYT, Ufficio).
//
// Five Uruguayan chair sellers turned out to run the same platform, and WooCommerce ships a public,
// documented Store API — `/wp-json/wc/store/v1/products` — so this is one adapter for all of them
// and no HTML parsing, exactly like the Shopify one.
//
// Two traps. The price format: the Store API returns prices as an INTEGER STRING in minor units
// with the divisor in `currency_minor_unit`. "399000" with minor unit 2 is 3 990, not 399 000.
// Reading it naively inflates every price by 100x. And the body is not always clean JSON, which is
// why nothing here goes through `fetchJson` — see {@link parseWooProducts}.
import { fetchText } from "../net";
import type { CategorySpec, RetailListing, RetailSourceResult, RetailStore } from "../types";

/**
 * WooCommerce returns titles with HTML entities ("Silla de oficina &#8211; Manila 984A"). Left
 * raw, the numeric entity survives normalisation and becomes the model — the catalogue filled up
 * with chairs called "8211".
 */
const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:ndash|mdash);/g, "-")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PAGE_SIZE = 100;
const MAX_PAGES = 6;
/**
 * How many distinct search terms one store is worth per run. The Store API filters server-side, so
 * terms are the unit of cost here: thirty-eight household categories would otherwise turn five
 * stores into hundreds of paginated scans.
 */
const MAX_QUERIES = Number(process.env.RETAIL_WOO_MAX_QUERIES || 24);

interface WooProduct {
  id?: number;
  name?: string;
  permalink?: string;
  is_in_stock?: boolean;
  short_description?: string;
  description?: string;
  prices?: {
    price?: string;
    currency_code?: string;
    currency_minor_unit?: number;
  };
  images?: Array<{ src?: string }>;
  categories?: Array<{ name?: string }>;
}

/**
 * The Store API answers 200 `application/json`, but a theme on one of these stores echoes ~2 KB of
 * its own cart-icon markup BEFORE the array, so `JSON.parse` on the raw body throws and the store
 * looks unreachable while its catalogue is perfectly readable. The payload is everything between
 * the first `[` and the last `]`.
 */
export function parseWooProducts(body: string | null): WooProduct[] | null {
  if (!body) return null;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start < 0 || end < start) return null;
  try {
    const parsed: unknown = JSON.parse(body.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as WooProduct[]) : null;
  } catch {
    return null;
  }
}

/** "399000" + minor unit 2 -> 3990. Returns null when the store publishes no usable price. */
export function wooPrice(prices: WooProduct["prices"]): number | null {
  const raw = Number(prices?.price);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const minorUnit = Number(prices?.currency_minor_unit);
  const divisor = Number.isFinite(minorUnit) && minorUnit >= 0 ? 10 ** minorUnit : 1;
  const value = raw / divisor;
  return value > 0 ? Math.round(value * 100) / 100 : null;
}

export async function harvestWooStore(
  store: RetailStore,
  specs: readonly CategorySpec[]
): Promise<RetailSourceResult> {
  const observedAt = new Date().toISOString();
  const byId = new Map<string, RetailListing>();
  const queries = [...new Set(specs.flatMap((spec) => spec.storeQueries ?? []))].slice(0, MAX_QUERIES);
  if (!queries.length) {
    return { listings: [], ok: true, note: "sin terminos de busqueda para esta tienda" };
  }
  let reachable = false;
  let scanned = 0;
  let wrongCurrency = 0;

  for (const query of queries) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${store.baseUrl}/wp-json/wc/store/v1/products?per_page=${PAGE_SIZE}&page=${page}&search=${encodeURIComponent(query)}`;
      const body = await fetchText(url, {
        retries: 2,
        timeoutMs: 30_000,
        headers: { accept: "application/json" },
      });
      const products = parseWooProducts(body);
      if (!products) break;
      reachable = true;
      scanned += products.length;

      for (const product of products) {
        const title = decodeEntities(String(product.name || ""));
        const permalink = String(product.permalink || "").trim();
        if (!title || !permalink) continue;

        const categories = (product.categories || []).map((category) => category.name || "").join(" ");
        const context = `${categories} ${product.short_description || ""}`;
        const spec = specs.find((candidate) => candidate.accept(title, context));
        if (!spec) continue;

        const price = wooPrice(product.prices);
        if (price === null) continue;
        const currency = String(product.prices?.currency_code || "").toUpperCase();
        if (currency !== "UYU" && currency !== "USD") {
          wrongCurrency++;
          continue;
        }

        const id = `store:${store.key}:${product.id ?? title}`;
        byId.set(id, {
          listingId: id,
          source: "store",
          sellerKey: store.key,
          sellerName: store.name,
          channel: store.channel,
          title,
          url: permalink,
          price,
          currency,
          condition: "new",
          available: product.is_in_stock !== false,
          image: product.images?.[0]?.src || null,
          brand: "",
          model: "",
          catalogId: null,
          attributes: {
            ...(categories ? { PRODUCT_TYPE: categories.slice(0, 120) } : {}),
            CATEGORY_SPEC: spec.key,
          },
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

  return {
    listings: [...byId.values()],
    ok: reachable,
    note: reachable
      ? `${scanned} productos revisados, ${byId.size} aceptados${wrongCurrency ? `, ${wrongCurrency} en moneda no soportada` : ""}`
      : "la Store API de WooCommerce no respondió",
  };
}
