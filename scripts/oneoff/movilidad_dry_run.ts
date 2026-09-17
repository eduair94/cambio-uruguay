// Dry run for MOVILIDAD_CATEGORIES (monopatines y bicicletas eléctricas): harvests one store (or
// MercadoLibre) and prints how every candidate title was classified — accepted (category, variant)
// or rejected, with the most frequent rejected titles. Writes NOTHING — no appdb import, no dotenv,
// no Mongo. Follows the shape of `scripts/oneoff/phones_dry_run.ts`: it does NOT call
// `harvestRetail`/the adapters in `classes/retail/sources/*` directly, because those adapters
// classify with `spec.accept()` INTERNALLY and only ever return what passed — a rejected title never
// reaches the caller, so there would be no way to report "top rejected titles". This script
// reimplements each adapter's own request shape (same Store-API/`products.json` contracts, same
// shared `classes/retail/net` throttling) but classifies every candidate itself via the SAME
// `categoryFor`/`variantFor` production code path (`classes/equipar/classify.ts` against
// `MOVILIDAD_CATEGORIES`), so nothing is thrown away before it can be counted, and nothing here can
// silently drift from what `sync_movilidad.ts` (Task 3) will actually do.
//
// Usage:
//   npx ts-node scripts/oneoff/movilidad_dry_run.ts delcar
//   npx ts-node scripts/oneoff/movilidad_dry_run.ts superbikers
//   npx ts-node scripts/oneoff/movilidad_dry_run.ts voltbike
//   npx ts-node scripts/oneoff/movilidad_dry_run.ts loopbikes
//   npx ts-node scripts/oneoff/movilidad_dry_run.ts covercompany
//   npx ts-node scripts/oneoff/movilidad_dry_run.ts ml
//
// A store run is capped with `--limit` (default 150) to the number of product pages/entries it reads
// — "be gentle", same budget phones_dry_run.ts uses.
//
// The "ml" run does NOT reuse `harvestMercadoLibre`, and for the same reason phones_dry_run.ts does
// not: the bridge (104.234.204.107:9656) is SHARED with every other production job that reads
// MercadoLibre (chairs-hourly :23, autos-hourly :29, rentals-hourly :47, equipar-hourly :53, the ~2h
// sequential currency-autos daily sweep at 07:43 UTC). A burst from this one-off script that trips the
// bridge's rate limiter pushes EVERY job onto a 10-minute proxy fallback, not just this one. So the ml
// run: at most 8 searches, strictly sequential (one in flight, ever), at least 2 seconds between
// requests, and it refuses to even start outside the windows those jobs do not touch the bridge (quiet
// minutes :00-:18 and :33-:43, never 07:35-10:00 UTC). A 403/429 stops the run immediately, never
// retried — a retry against a rate limiter spends budget to earn another rejection.
import { fetchJson, fetchText } from "../../classes/retail/net";
import { parseWooProducts, wooPricing } from "../../classes/retail/sources/woocommerce";
import { detectShopifyCurrency, titleWithType } from "../../classes/retail/sources/shopify";
import { retailStores } from "../../classes/retail/stores";
import { categoryFor, itemKey, variantFor } from "../../classes/equipar/classify";
import { MOVILIDAD_CATEGORIES } from "../../classes/movilidad/registry";
import type { RetailStore } from "../../classes/retail/types";

const argv = process.argv.slice(2);
const flags = argv.filter((arg) => arg.startsWith("--"));
const [storeKey = "ml"] = argv.filter((arg) => !arg.startsWith("--"));
const flagValue = (name: string): string | undefined =>
  flags.find((flag) => flag.startsWith(`--${name}=`))?.slice(name.length + 3);
const limit = Number(flagValue("limit") || 150);

interface AcceptedRow {
  key: string;
  variantLabel: string;
  currency: string;
  price: number;
  sellerName: string;
  title: string;
}

/** Every candidate title goes through exactly one of these two buckets, via the real production
 * classifier — never a re-implementation of it — so a change to `MOVILIDAD_CATEGORIES` shows up here
 * exactly as it would in `sync_movilidad.ts`. */
class Tally {
  accepted: AcceptedRow[] = [];
  private rejectedCounts = new Map<string, number>();

  classify(title: string, context: string, currency: string, price: number, sellerName: string): void {
    const clean = title.trim();
    if (!clean) return;
    const category = categoryFor(clean, context, MOVILIDAD_CATEGORIES);
    if (!category) {
      this.rejectedCounts.set(clean, (this.rejectedCounts.get(clean) ?? 0) + 1);
      return;
    }
    const variant = variantFor(category, clean);
    this.accepted.push({
      key: itemKey(category.key, variant.key),
      variantLabel: variant.label,
      currency,
      price,
      sellerName,
      title: clean,
    });
  }

  report(): void {
    const byKey = new Map<string, AcceptedRow[]>();
    for (const row of this.accepted) byKey.set(row.key, [...(byKey.get(row.key) ?? []), row]);
    for (const [key, rows] of [...byKey.entries()].sort()) {
      console.log(`\n${key} — ${rows.length} aceptados (${rows[0]!.variantLabel}):`);
      for (const row of rows.slice(0, 20)) console.log(`  ${row.currency} ${row.price} | ${row.sellerName} | ${row.title}`);
      if (rows.length > 20) console.log(`  … y ${rows.length - 20} más`);
    }
    const topRejected = [...this.rejectedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log(
      `\n${this.accepted.length} aceptados en ${byKey.size} categoría(s)/variante(s), ` +
        `${this.rejectedCounts.size} títulos distintos rechazados.`
    );
    console.log(`Top ${topRejected.length} títulos rechazados más frecuentes:`);
    for (const [title, count] of topRejected) console.log(`  ${count}x ${title}`);
  }
}

// ---------------------------------------------------------------------------------------------
// WooCommerce (delcar, superbikers)
// ---------------------------------------------------------------------------------------------

/** Mirrors the private helper in classes/retail/sources/woocommerce.ts — not exported from there. */
function decodeWooEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:ndash|mdash);/g, "-")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MOVILIDAD_WOO_QUERIES = [...new Set(MOVILIDAD_CATEGORIES.flatMap((category) => category.storeQueries))];

async function runWoo(store: RetailStore, tally: Tally): Promise<void> {
  let scanned = 0;
  let pagesOpened = 0;
  let droppedPricing = 0;
  for (const query of MOVILIDAD_WOO_QUERIES) {
    for (let page = 1; page <= 6 && pagesOpened < limit; page++) {
      const url = `${store.baseUrl}/wp-json/wc/store/v1/products?per_page=100&page=${page}&search=${encodeURIComponent(query)}`;
      const body = await fetchText(url, { retries: 2, timeoutMs: 30_000, headers: { accept: "application/json" } });
      pagesOpened++;
      const products = parseWooProducts(body);
      if (!products) break;
      scanned += products.length;
      for (const product of products) {
        const title = decodeWooEntities(String(product.name || ""));
        if (!title) continue;
        const categories = (product.categories || []).map((category) => category.name || "").join(" ");
        const context = `${categories} ${product.short_description || ""}`;
        const pricing = wooPricing(product);
        if (!pricing || "dropped" in pricing) {
          droppedPricing++;
          continue;
        }
        tally.classify(title, context, pricing.currency, pricing.price, store.name);
      }
      if (products.length < 100) break;
    }
  }
  console.log(
    `${scanned} productos revisados en ${MOVILIDAD_WOO_QUERIES.length} búsquedas, ${pagesOpened} páginas (--limit=${limit})` +
      `${droppedPricing ? `, ${droppedPricing} descartados por precio/moneda sin resolver (como en producción)` : ""}.`
  );
}

// ---------------------------------------------------------------------------------------------
// Shopify (voltbike, loopbikes, covercompany)
// ---------------------------------------------------------------------------------------------

interface ShopifyListRow {
  title?: string;
  product_type?: string;
  tags?: string[] | string;
  variants?: Array<{ price?: string }>;
}

async function runShopify(store: RetailStore, tally: Tally): Promise<void> {
  const currency = await detectShopifyCurrency(store.baseUrl);
  console.log(`Moneda detectada por Shopify.currency: ${currency ?? "desconocida (se omitiría en producción)"}.`);
  let scanned = 0;
  for (let page = 1; page <= 8 && page * 250 - 250 < limit; page++) {
    const payload = await fetchJson<{ products?: ShopifyListRow[] }>(`${store.baseUrl}/products.json?limit=250&page=${page}`, {
      retries: 2,
      timeoutMs: 30_000,
    });
    const products = payload?.products;
    if (!products || !products.length) break;
    scanned += products.length;
    for (const product of products) {
      const rawTitle = String(product.title || "").trim();
      if (!rawTitle) continue;
      // Same composition production uses (classes/retail/sources/shopify.ts): voltbike/loopbikes set
      // productTypeInTitle, so a listing titled "SuperVolt" with product_type "Bicicleta Eléctrica" is
      // classified (and would be published) as "Bicicleta Eléctrica SuperVolt".
      const title = titleWithType(store, product, rawTitle);
      const tags = Array.isArray(product.tags) ? product.tags.join(" ") : String(product.tags || "");
      const context = `${product.product_type || ""} ${tags}`;
      const variant = (product.variants || []).find((entry) => Number(entry.price) > 0);
      tally.classify(title, context, currency ?? "?", Number(variant?.price) || 0, store.name);
    }
    if (products.length < 250) break;
  }
  console.log(`${scanned} productos revisados (--limit=${limit} páginas de 250).`);
}

// ---------------------------------------------------------------------------------------------
// MercadoLibre — NOT the shared harvestMercadoLibre. See the file header for why.
// ---------------------------------------------------------------------------------------------

const ML_API = (process.env.RETAIL_ML_API || process.env.CHAIR_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(
  /\/+$/,
  ""
);
const ML_MAX_SEARCHES = 8;
const ML_MIN_GAP_MS = 2000;

interface MlSearchRow {
  title?: string;
  price?: { amount?: number; currency?: string };
  seller?: { name?: string };
}

/**
 * Production's hourly scans hit the bridge at :23 (chairs-hourly), :29 (autos-hourly), :47
 * (rentals-hourly) and :53 (equipar-hourly) past the hour (ecosystem.config.js) — quiet minutes are
 * :00-:18 and :33-:43, clear of the buffer around each. currency-autos' DAILY run (07:43 UTC) is a
 * ~2h sequential brand->model sweep of the same bridge, so the whole 07:35-10:00 UTC span is refused
 * outright regardless of minute.
 */
function isQuietMinute(date = new Date()): boolean {
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes >= 7 * 60 + 35 && totalMinutes <= 10 * 60) return false;
  return (minute >= 0 && minute <= 18) || (minute >= 33 && minute <= 43);
}

async function mlSearchOnce(params: Record<string, string>): Promise<{ status: number; rows: MlSearchRow[] } | null> {
  const query = new URLSearchParams({ country: "UY", limit: "50", ...params });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${ML_API}/search?${query}`, { signal: controller.signal });
    if (!response.ok) return { status: response.status, rows: [] };
    const json = (await response.json()) as { results?: MlSearchRow[] };
    return { status: response.status, rows: json.results ?? [] };
  } catch (error) {
    console.error(`  sin respuesta del puente ML: ${(error as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runMl(tally: Tally): Promise<void> {
  if (!isQuietMinute()) {
    const now = new Date();
    console.error(
      `Momento UTC actual ${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} ` +
        "está fuera de la ventana segura (minutos :00-:18 o :33-:43, y nunca entre 07:35 y 10:00 UTC). " +
        "Abortando sin pedir nada."
    );
    process.exitCode = 1;
    return;
  }

  const scans: Array<{ params: Record<string, string> }> = MOVILIDAD_CATEGORIES.flatMap((category) =>
    category.mlQueries.map((q) => ({ params: { q } }))
  ).slice(0, ML_MAX_SEARCHES);

  console.log(`${scans.length} búsquedas (tope ${ML_MAX_SEARCHES}), secuenciales, ${ML_MIN_GAP_MS}ms entre pedidos.`);

  for (let i = 0; i < scans.length; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, ML_MIN_GAP_MS));
    const { params } = scans[i]!;
    const result = await mlSearchOnce(params);
    if (!result) continue;
    if (result.status === 403 || result.status === 429) {
      console.error(
        `  búsqueda ${i + 1}/${scans.length} (${JSON.stringify(params)}): el puente respondió ${result.status}. ` +
          "DETENIENDO la corrida de inmediato, sin reintentar."
      );
      break;
    }
    for (const row of result.rows) {
      const title = String(row.title || "").trim();
      if (!title) continue;
      tally.classify(title, "", row.price?.currency || "?", Number(row.price?.amount) || 0, row.seller?.name || "Mercado Libre");
    }
    console.log(`  búsqueda ${i + 1}/${scans.length} (${JSON.stringify(params)}): status ${result.status}, ${result.rows.length} resultados.`);
  }
}

// ---------------------------------------------------------------------------------------------

(async () => {
  const tally = new Tally();
  if (storeKey === "ml") {
    await runMl(tally);
    tally.report();
    return;
  }

  const [store] = retailStores([storeKey]);
  if (!store) throw new Error(`tienda desconocida o deshabilitada: ${storeKey}`);

  switch (store.adapter) {
    case "woocommerce":
      await runWoo(store, tally);
      break;
    case "shopify":
      await runShopify(store, tally);
      break;
    default:
      throw new Error(`${store.adapter}: no implementado en este dry run (ninguna tienda de MOVILIDAD_STORE_KEYS lo usa).`);
  }
  tally.report();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
