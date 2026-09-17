// Shopify storefronts (Armo, Grassi, Cover Company). `/products.json` is a public, paginated,
// documented endpoint that returns the whole catalogue — no HTML parsing at all.
//
// The one thing it does NOT return is the shop's currency, and a USD price published as UYU is a
// 40x error. So the currency is read from the storefront at run time and a store whose currency
// cannot be established is skipped rather than guessed.
import { fetchJson, fetchText } from "../net";
import { listPriceOf } from "../price";
import type { CategorySpec, RetailListing, RetailSourceResult, RetailStore } from "../types";

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
  variants?: Array<{
    id?: number;
    sku?: string;
    price?: string;
    /** Shopify's own crossed-out price for the variant, when a discount is configured. */
    compare_at_price?: string | null;
    available?: boolean;
    title?: string;
  }>;
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

const claim = (title: string, product: ShopifyProduct, specs: readonly CategorySpec[]): CategorySpec | undefined => {
  const tags = Array.isArray(product.tags) ? product.tags.join(" ") : String(product.tags || "");
  const context = `${product.product_type || ""} ${tags}`;
  return specs.find((spec) => spec.accept(title, context));
};

/** Case/accent-insensitive "does this text already say that", so a store whose title already spells
 * the product type out never gets it doubled. */
function foldForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Some storefronts (see `RetailStore.productTypeInTitle`) only ever say what a product IS in
 * Shopify's own `product_type` — never in the product's own title ("SuperVolt", not "Bicicleta
 * Eléctrica SuperVolt"). `matchesCategory()` (classes/equipar/classify.ts) tests a category's
 * `include` against the title alone, by design, so those listings are invisible to every category no
 * matter how the regex is written. When the flag is on and `product_type` is non-empty, this joins
 * the two — unless the title already names the type, which would otherwise double it ("Bicicleta
 * Eléctrica Bicicleta Eléctrica Muche"). Every other store defaults to `false` and gets its title
 * back unchanged.
 */
/**
 * Exported (not just used internally) so `scripts/oneoff/movilidad_dry_run.ts` composes titles
 * exactly the same way production does instead of maintaining a second copy of this logic that could
 * drift. `product` only needs `product_type` — the dry run's own row shape is not `ShopifyProduct`.
 */
export function titleWithType(
  store: Pick<RetailStore, "productTypeInTitle">,
  product: Pick<ShopifyProduct, "product_type">,
  rawTitle: string
): string {
  if (!store.productTypeInTitle) return rawTitle;
  const productType = String(product.product_type || "").trim();
  if (!productType) return rawTitle;
  if (foldForCompare(rawTitle).includes(foldForCompare(productType))) return rawTitle;
  return `${productType} ${rawTitle}`.trim();
}

export async function harvestShopifyStore(
  store: RetailStore,
  specs: readonly CategorySpec[]
): Promise<RetailSourceResult> {
  const observedAt = new Date().toISOString();
  const currency = await detectShopifyCurrency(store.baseUrl);
  if (!currency) {
    return { listings: [], ok: false, note: "no se pudo determinar la moneda de la tienda; se omite" };
  }

  const paths = store.collections?.length
    ? store.collections.map((handle) => `/collections/${handle}/products.json`)
    : ["/products.json"];

  const listings: RetailListing[] = [];
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
        const rawTitle = String(product.title || "").trim();
        if (!rawTitle) continue;
        const title = titleWithType(store, product, rawTitle);
        const spec = claim(title, product, specs);
        if (!spec) continue;
        const variant = (product.variants || []).find((entry) => Number(entry.price) > 0);
        const price = Number(variant?.price);
        if (!Number.isFinite(price) || price <= 0) continue;

        listings.push({
          listingId: `store:${store.key}:${product.handle || product.id || rawTitle}`,
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
          attributes: {
            ...(product.product_type ? { PRODUCT_TYPE: String(product.product_type) } : {}),
            CATEGORY_SPEC: spec.key,
          },
          rating: null,
          ratingCount: 0,
          location: null,
          freeShipping: null,
          officialStore: true,
          listPrice: listPriceOf(price, Number(variant?.compare_at_price)),
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
      note: `${scanned} productos, ${listings.length} aceptados; moneda detectada ${currency} (se esperaba ${store.expectCurrency})`,
    };
  }
  return {
    listings,
    ok: reachable,
    note: reachable
      ? `${scanned} productos revisados, ${listings.length} aceptados en ${currency}`
      : "products.json no respondió",
  };
}
