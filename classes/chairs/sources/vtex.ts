// VTEX storefronts (El Dorado). VTEX IO serves the legacy catalogue API from the storefront host
// itself — `/api/catalog_system/pub/products/search` — so this is one adapter for every VTEX
// retailer and, like the Shopify and WooCommerce ones, it reads a contract instead of markup.
//
// Two traps, both silent:
//   - `ft=` takes ONE token. "silla gamer" answers `[]` rather than an error, and so does the
//     plural of a word the catalogue only holds in the singular, so the queries below are single
//     words in both forms and `isDeskChair` does the narrowing.
//   - the catalogue never states a currency. Prices are in the store's price-table currency, which
//     the storefront declares in its own HTML, so it is read at run time and a store whose currency
//     cannot be established is skipped rather than guessed: USD published as UYU is a 40x error.
import { fetchJson, fetchText } from "../net";
import { isDeskChair } from "../normalize";
import type { ChairListing } from "../types";
import type { ChairSourceResult } from "./mercadolibre";
import type { ChairStore } from "./registry";

/** The legacy catalogue API caps a page at 50 products, addressed through `_from`/`_to`. */
const PAGE_SIZE = 50;
const MAX_PAGES = 8;
const QUERIES = ["silla", "sillas", "sillon", "sillones"];

interface VtexOffer {
  Price?: number;
  ListPrice?: number;
  IsAvailable?: boolean;
  AvailableQuantity?: number;
}

interface VtexItem {
  itemId?: string;
  images?: Array<{ imageUrl?: string }>;
  sellers?: Array<{ sellerDefault?: boolean; commertialOffer?: VtexOffer }>;
}

interface VtexProduct {
  productId?: string;
  productName?: string;
  brand?: string;
  linkText?: string;
  description?: string;
  categories?: string[];
  /** Names of the specifications VTEX publishes as extra top-level keys on this same object. */
  allSpecifications?: string[];
  items?: VtexItem[];
  [specification: string]: unknown;
}

/**
 * VTEX echoes the retailer's ERP text verbatim, so a product name can reach us carrying HTML
 * entities exactly as the WooCommerce stores do. Left raw, a numeric entity survives normalisation
 * and becomes the model — that is how the catalogue once filled up with chairs called "8211".
 */
export const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:ndash|mdash);/g, "-")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();

/**
 * VTEX makes `brand` mandatory, so a catalogue files unbranded goods under a placeholder. Passed
 * on as a brand, "OTRAS MARCAS" would merge every unbranded chair in the country into one product.
 */
const PLACEHOLDER_BRAND = /^(?:otras?\s+marcas?|sin\s+marca|gen[eé]ric[ao]s?|varios|n\/?a)$/i;

export function vtexBrand(raw: unknown): string {
  const brand = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  return PLACEHOLDER_BRAND.test(brand) ? "" : brand;
}

/**
 * `commertialOffer.Price` is already a decimal (11603.35). The `addToCartLink` sitting beside it in
 * the very same object repeats that price in cents (`price=189000` for 1 890), so it is the one
 * number never to read here: it would publish every chair at 100x.
 */
export function vtexPrice(offer: VtexOffer | undefined): number | null {
  const price = Number(offer?.Price);
  const value = Number.isFinite(price) && price > 0 ? price : Number(offer?.ListPrice);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** Values of one specification. VTEX publishes them as extra top-level keys ("Modelo", "Color"…). */
const specValues = (product: VtexProduct, name: string): string[] => {
  const value = product[name];
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
};

/** The first SKU with a real price, preferring the store's own listing over a marketplace seller. */
export function vtexOffer(
  product: VtexProduct
): { price: number; available: boolean; image: string | null } | null {
  for (const item of product.items || []) {
    const sellers = item.sellers || [];
    const seller =
      sellers.find((entry) => entry.sellerDefault && vtexPrice(entry.commertialOffer) !== null) ||
      sellers.find((entry) => vtexPrice(entry.commertialOffer) !== null);
    const price = vtexPrice(seller?.commertialOffer);
    if (price === null) continue;
    return {
      price,
      available:
        seller?.commertialOffer?.IsAvailable !== false &&
        Number(seller?.commertialOffer?.AvailableQuantity ?? 1) > 0,
      image: item.images?.find((image) => image.imageUrl)?.imageUrl || null,
    };
  }
  return null;
}

/**
 * Everything the catalogue knows besides the title. A supermarket names a gaming chair "Silla
 * Cougar Armor Elite" and nothing else, so the category path and the specifications are the only
 * evidence that it belongs at a desk.
 */
const contextOf = (product: VtexProduct): string =>
  [
    (product.categories || []).join(" "),
    String(product.description || ""),
    (product.allSpecifications || []).flatMap((name) => specValues(product, name)).join(" "),
  ].join(" ");

/** VTEX IO ships the storefront's runtime culture in the page it serves, and repeats it as a meta tag. */
export function readVtexCurrency(html: string): "UYU" | "USD" | null {
  const culture = /"culture"\s*:\s*\{[^}]*"currency"\s*:\s*"([A-Z]{3})"/.exec(html)?.[1];
  const meta = /name="currency"[^>]*content="([A-Z]{3})"/.exec(html)?.[1];
  const found = (culture || meta || "").toUpperCase();
  if (found === "UYU" || found === "USD") return found;
  return null;
}

export async function detectVtexCurrency(baseUrl: string): Promise<"UYU" | "USD" | null> {
  const html = await fetchText(baseUrl, { retries: 1 });
  return html ? readVtexCurrency(html) : null;
}

export async function harvestVtexStore(store: ChairStore): Promise<ChairSourceResult> {
  const observedAt = new Date().toISOString();
  const currency = await detectVtexCurrency(store.baseUrl);
  if (!currency) {
    return { listings: [], ok: false, note: "no se pudo determinar la moneda de la tienda; se omite" };
  }

  const byId = new Map<string, ChairListing>();
  let reachable = false;
  let scanned = 0;
  let noPrice = 0;

  for (const query of QUERIES) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const url = `${store.baseUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=${from}&_to=${from + PAGE_SIZE - 1}`;
      const products = await fetchJson<VtexProduct[]>(url, { retries: 2, timeoutMs: 30_000 });
      if (!Array.isArray(products)) break;
      reachable = true;
      scanned += products.length;

      for (const product of products) {
        const title = decodeEntities(String(product.productName || ""));
        const linkText = String(product.linkText || "").trim();
        if (!title || !linkText) continue;
        if (!isDeskChair(title, contextOf(product))) continue;

        const offer = vtexOffer(product);
        if (!offer) {
          noPrice++;
          continue;
        }

        const categories = (product.categories || []).join(" ");
        const id = `store:${store.key}:${product.productId || linkText}`;
        byId.set(id, {
          listingId: id,
          source: "store",
          sellerKey: store.key,
          sellerName: store.name,
          channel: store.channel,
          title,
          url: `${store.baseUrl}/${linkText}/p`,
          price: offer.price,
          currency,
          condition: "new",
          available: offer.available,
          image: offer.image,
          brand: vtexBrand(product.brand),
          model: decodeEntities(specValues(product, "Modelo")[0] || ""),
          catalogId: null,
          attributes: categories ? { PRODUCT_TYPE: categories.slice(0, 120) } : {},
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

  const unexpected = store.expectCurrency && store.expectCurrency !== currency;
  return {
    listings: [...byId.values()],
    ok: reachable,
    note: reachable
      ? `${scanned} productos revisados, ${byId.size} sillas en ${currency}${noPrice ? `, ${noPrice} sin precio publicado` : ""}${unexpected ? ` (se esperaba ${store.expectCurrency})` : ""}`
      : "el catálogo VTEX no respondió",
  };
}
