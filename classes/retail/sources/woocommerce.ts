// WooCommerce storefronts (American Mesh, Prontometal, Punto Unión, TYT, Ufficio).
//
// Five Uruguayan chair sellers turned out to run the same platform, and WooCommerce ships a public,
// documented Store API — `/wp-json/wc/store/v1/products` — so this is one adapter for all of them
// and no HTML parsing, exactly like the Shopify one.
//
// Three traps. The price format: the Store API returns prices as an INTEGER STRING in minor units
// with the divisor in `currency_minor_unit`. "399000" with minor unit 2 is 3 990, not 399 000.
// Reading it naively inflates every price by 100x. The currency: `currency_code` is the store's
// default, not the product's — TYT sells in pesos and dollars under one "UYU" (see
// {@link wooPricing}). And the body is not always clean JSON, which is why nothing here goes
// through `fetchJson` — see {@link parseWooProducts}.
import { fetchText } from "../net";
import { listPriceOf } from "../price";
import type { CategorySpec, RetailListing, RetailSourceResult, RetailStore, StoreHarvestOptions } from "../types";
import { parsePrice } from "./structured";

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
    /** The crossed-out sticker price, in the same minor-unit encoding as `price`. */
    regular_price?: string;
    currency_code?: string;
    currency_minor_unit?: number;
  };
  /** The price as the storefront renders it, currency symbol included. See {@link wooPricing}. */
  price_html?: string;
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

/** Only symbols that name one currency. "$" is the peso in Uruguay but does not say so. */
const USD_SYMBOL = /^(usd|u\$s|us\$|u\$d)$/i;
const UYU_SYMBOL = /^(uyu|\$u|\$uy)$/i;

/**
 * The price the storefront itself renders, read from the Store API's own `price_html`.
 *
 * On a sale the markup carries the crossed-out price in `<del>` and the current one in `<ins>`, so
 * only the `<ins>` part is read. Returns null when the symbol does not name a currency ("$", or
 * nothing) or the markup holds no amount.
 */
export function wooDisplayedPrice(priceHtml: string | null | undefined): { currency: "UYU" | "USD"; amount: number } | null {
  const html = String(priceHtml || "");
  const current = html.includes("<ins") ? html.slice(html.indexOf("<ins")) : html;
  const symbols = [...current.matchAll(/woocommerce-Price-currencySymbol["'][^>]*>([^<]*)</g)].map((match) =>
    decodeEntities(match[1] || "").replace(/&#0?36;/g, "$").trim()
  );
  const currencies = new Set(
    symbols.map((symbol) => (USD_SYMBOL.test(symbol) ? "USD" : UYU_SYMBOL.test(symbol) ? "UYU" : null))
  );
  if (currencies.size !== 1) return null;
  const [currency] = [...currencies];
  if (!currency) return null;
  const amountText = /woocommerce-Price-currencySymbol["'][^>]*>[^<]*<\/span>(?:&nbsp;|\s)*([\d.,]+)/.exec(current)?.[1];
  const amount = parsePrice(amountText);
  return amount === null ? null : { currency, amount };
}

/** How far the rendered amount may sit from `price / 10^minor` and still be the same number. */
const DISPLAY_TOLERANCE = 0.02;

/**
 * Price, currency and crossed-out price of one product.
 *
 * The trap this exists for: TYT's Store API declares `currency_code: "UYU"` on EVERY product while
 * its own storefront renders 149 of 515 of them in dollars (measured 2026-09-16). The minor unit is
 * honest — "20500" is USD 205,00 and "960000" is UYU 9.600,00 — only the currency field lies, and
 * the rendered `price_html` in the same response says which it is. Its amount matched
 * `price / 100` on 515 of 515 products, so the rendered currency is trusted only when that number
 * agrees; when the currencies disagree AND the number does too, nothing can be told apart and the
 * product is dropped rather than guessed. When the rendered symbol says the same currency, or says
 * nothing ("$"), the API is used exactly as before — prontometal renders "U$S 89 + IVA" against a
 * price of 113 in the same currency, and that is not ours to correct.
 */
export function wooPricing(
  product: Pick<WooProduct, "prices" | "price_html">
): { price: number; currency: string; listPrice: number | null; currencyFromDisplay: boolean } | { dropped: string } | null {
  const price = wooPrice(product.prices);
  if (price === null) return null;
  const apiCurrency = String(product.prices?.currency_code || "").toUpperCase();
  const listPrice = listPriceOf(price, wooPrice({ ...product.prices, price: product.prices?.regular_price }));
  const shown = wooDisplayedPrice(product.price_html);

  if (!shown || shown.currency === apiCurrency) {
    return { price, currency: apiCurrency, listPrice, currencyFromDisplay: false };
  }
  if (Math.abs(shown.amount - price) > price * DISPLAY_TOLERANCE) {
    return { dropped: "precio mostrado distinto" };
  }
  return { price, currency: shown.currency, listPrice, currencyFromDisplay: true };
}

export async function harvestWooStore(
  store: RetailStore,
  specs: readonly CategorySpec[],
  options: StoreHarvestOptions = {}
): Promise<RetailSourceResult> {
  const observedAt = new Date().toISOString();
  const byId = new Map<string, RetailListing>();
  const maxQueries = options.maxQueries ?? MAX_QUERIES;
  const queries = [...new Set(specs.flatMap((spec) => spec.storeQueries ?? []))].slice(0, maxQueries);
  if (!queries.length) {
    return { listings: [], ok: true, note: "sin terminos de busqueda para esta tienda" };
  }
  let reachable = false;
  let scanned = 0;
  let wrongCurrency = 0;
  let currencyFromDisplay = 0;
  const dropped = new Map<string, string[]>();

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

        const pricing = wooPricing(product);
        if (!pricing) continue;
        if ("dropped" in pricing) {
          const titles = dropped.get(pricing.dropped) ?? [];
          if (!titles.includes(title)) titles.push(title);
          dropped.set(pricing.dropped, titles);
          continue;
        }
        const { price, currency, listPrice } = pricing;
        if (currency !== "UYU" && currency !== "USD") {
          wrongCurrency++;
          continue;
        }

        const id = `store:${store.key}:${product.id ?? title}`;
        if (pricing.currencyFromDisplay && !byId.has(id)) currencyFromDisplay++;
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
          listPrice,
          observedAt,
        });
      }
      if (products.length < PAGE_SIZE) break;
    }
  }

  // Every correction and every drop is counted where the run is reported, with a few titles, so a
  // store whose rendered prices start disagreeing shows up in the job log instead of in the page.
  const droppedNote = [...dropped]
    .map(([reason, titles]) => `, ${titles.length} descartados (${reason}: ${titles.slice(0, 3).join(" / ")})`)
    .join("");
  return {
    listings: [...byId.values()],
    ok: reachable,
    note: reachable
      ? `${scanned} productos revisados, ${byId.size} aceptados${
          currencyFromDisplay ? `, ${currencyFromDisplay} con la moneda del precio mostrado` : ""
        }${droppedNote}${wrongCurrency ? `, ${wrongCurrency} en moneda no soportada` : ""}`
      : "la Store API de WooCommerce no respondió",
  };
}
