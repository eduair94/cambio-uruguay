// Dry run for PHONE_SPEC: harvests one store (or MercadoLibre) and prints how every candidate
// title was classified. Writes NOTHING — no appdb import, no dotenv, no Mongo. Usage:
//
//   npx ts-node scripts/oneoff/phones_dry_run.ts zonatecno [--limit=150]
//   npx ts-node scripts/oneoff/phones_dry_run.ts claro [--limit=150]
//   npx ts-node scripts/oneoff/phones_dry_run.ts digitalworld
//   npx ts-node scripts/oneoff/phones_dry_run.ts ml
//
// Copies the SHAPE of scripts/oneoff/equipar_dry_run.ts (one-off, category-spec-driven, no Mongo),
// but does not call `harvestRetail`/the adapters in `classes/retail/sources/*` directly: those
// adapters classify with `spec.accept()` INTERNALLY and only ever return the listings that passed —
// a rejected title is dropped before it reaches the caller, so there is no way to report "20 most
// frequent rejected titles" or a "sin identidad" count from their output alone. This script
// reimplements each adapter's own request shape (same sitemap/Store-API/products.json contracts,
// same shared `classes/retail/net` throttling) but classifies every candidate itself, so nothing
// is thrown away before it can be counted.
//
// A store run is capped with `--limit` (default 150) to the number of product PAGES it opens —
// "be gentle" per the task brief: the shared net layer in classes/retail/net.ts already throttles
// one request at a time per host with a minimum gap, this cap just keeps the SWEEP itself small.
//
// The "ml" run does NOT reuse `harvestMercadoLibre` either, and for a stronger reason: that bridge
// (104.234.204.107:9656) is SHARED with the production chairs/equipar/autos jobs, which hit it in
// bursts of dozens of scans at :23/:47/:53 past the hour. A burst from this one-off script that
// trips the bridge's rate limiter pushes EVERY job onto a 10-minute proxy fallback, not just this
// one. So the ml run: at most 8 searches, strictly sequential (one in flight, ever), at least 2
// seconds between requests, and it refuses to even start outside the two windows production does
// not touch the bridge (UTC minute :00-:18 or :28-:43). A 403/429 from the bridge stops the run
// immediately — it is never retried, on the same reasoning `classes/claude.ts` never retries a 429
// against the shared Claude endpoint (see classes/AGENTS.md): a retry against a rate limiter spends
// budget to earn another rejection.
import { identifyPhone, isPhoneTitle, phoneConditionFromTitle } from "../../classes/phones/identify";
import { fetchJson, fetchText, readSitemap } from "../../classes/retail/net";
import { parseStructuredProduct } from "../../classes/retail/sources/structured";
import { parseWooProducts, wooPricing } from "../../classes/retail/sources/woocommerce";
import { detectShopifyCurrency } from "../../classes/retail/sources/shopify";
import { retailStores } from "../../classes/retail/stores";
import { PHONE_SPEC } from "../../classes/phones/spec";
import type { RetailStore } from "../../classes/retail/types";

const argv = process.argv.slice(2);
const flags = argv.filter((arg) => arg.startsWith("--"));
const [storeKey = "ml"] = argv.filter((arg) => !arg.startsWith("--"));
const flagValue = (name: string): string | undefined =>
  flags.find((flag) => flag.startsWith(`--${name}=`))?.slice(name.length + 3);
const limit = Number(flagValue("limit") || 150);

type SourceCondition = "new" | "refurbished" | "used" | "unknown";

interface AcceptedRow {
  key: string;
  condition: string;
  currency: string;
  price: number;
  sellerName: string;
  title: string;
}

/** Every candidate title goes through exactly one of these three buckets, counted as it happens. */
class Tally {
  accepted: AcceptedRow[] = [];
  private noIdentityTitles = new Set<string>();
  private rejectedCounts = new Map<string, number>();

  classify(title: string, sourceCondition: SourceCondition, currency: string, price: number, sellerName: string): void {
    const clean = title.trim();
    if (!clean) return;
    if (!isPhoneTitle(clean)) {
      this.rejectedCounts.set(clean, (this.rejectedCounts.get(clean) ?? 0) + 1);
      return;
    }
    const identity = identifyPhone(clean);
    if (!identity) {
      this.noIdentityTitles.add(clean);
      return;
    }
    this.accepted.push({
      key: identity.key,
      condition: phoneConditionFromTitle(clean, sourceCondition),
      currency,
      price,
      sellerName,
      title: clean,
    });
  }

  report(): void {
    for (const row of this.accepted) {
      console.log([row.key, row.condition, `${row.currency} ${row.price}`, row.sellerName, row.title].join(" | "));
    }
    const topRejected = [...this.rejectedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log(
      `\n${this.accepted.length} aceptados, ${this.noIdentityTitles.size} títulos sin identidad completa ` +
        `(marca reconocida, sin almacenamiento legible), ${this.rejectedCounts.size} títulos distintos rechazados ` +
        `(no parecen celular).`
    );
    console.log(`Top ${topRejected.length} títulos rechazados más frecuentes:`);
    for (const [title, count] of topRejected) console.log(`  ${count}x ${title}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Fenicio (claro, zonatecno, nstore, zonalaptop, market, magiccenter, dimm, …)
// ---------------------------------------------------------------------------------------------

async function fenicioProductUrls(store: RetailStore): Promise<string[]> {
  const direct = await readSitemap(`${store.baseUrl}/sitemap/catalogo-articulos.xml`);
  if (direct.length) return direct;
  const index = await readSitemap(`${store.baseUrl}/sitemap`);
  return index.filter((url) => /catalogo|articulo|producto/i.test(url));
}

async function runFenicio(store: RetailStore, tally: Tally): Promise<void> {
  const urls = await fenicioProductUrls(store);
  const hint = PHONE_SPEC.urlHint;
  const candidates = urls.filter((url) => !hint || hint.test(url)).slice(0, limit);
  console.log(`${urls.length} URLs en el sitemap, ${candidates.length} candidatos por urlHint (--limit=${limit}).`);
  for (const url of candidates) {
    const html = await fetchText(url, { retries: 1 });
    if (!html) continue;
    const product = parseStructuredProduct(html);
    if (!product) continue;
    tally.classify(product.name, product.condition, product.currency || "?", product.price ?? 0, store.name);
  }
}

// ---------------------------------------------------------------------------------------------
// WooCommerce (digitalworld, thotcomputacion, tyt, …)
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

async function runWoo(store: RetailStore, tally: Tally): Promise<void> {
  const queries = PHONE_SPEC.storeQueries ?? [];
  let scanned = 0;
  let pagesOpened = 0;
  for (const query of queries) {
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
        const pricing = wooPricing(product);
        const currency = pricing && !("dropped" in pricing) ? pricing.currency : "?";
        const price = pricing && !("dropped" in pricing) ? pricing.price : 0;
        tally.classify(title, "new", currency, price, store.name);
      }
      if (products.length < 100) break;
    }
  }
  console.log(`${scanned} productos revisados en ${queries.length} búsquedas, ${pagesOpened} páginas (--limit=${limit}).`);
}

// ---------------------------------------------------------------------------------------------
// Shopify (covercompany, armo, grassi)
// ---------------------------------------------------------------------------------------------

interface ShopifyListRow {
  title?: string;
  variants?: Array<{ price?: string }>;
}

async function runShopify(store: RetailStore, tally: Tally): Promise<void> {
  const currency = await detectShopifyCurrency(store.baseUrl);
  console.log(`Moneda detectada por Shopify.currency: ${currency ?? "desconocida (se omitiría en producción)"}.`);
  let scanned = 0;
  for (let page = 1; page <= 8 && page <= Math.ceil(limit / 250); page++) {
    const payload = await fetchJson<{ products?: ShopifyListRow[] }>(`${store.baseUrl}/products.json?limit=250&page=${page}`, {
      retries: 2,
      timeoutMs: 30_000,
    });
    const products = payload?.products;
    if (!products || !products.length) break;
    scanned += products.length;
    for (const product of products) {
      const title = String(product.title || "").trim();
      if (!title) continue;
      const variant = (product.variants || []).find((entry) => Number(entry.price) > 0);
      tally.classify(title, "new", currency ?? "?", Number(variant?.price) || 0, store.name);
    }
    if (products.length < 250) break;
  }
  console.log(`${scanned} productos revisados.`);
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
  condition?: string;
  price?: { amount?: number; currency?: string };
  seller?: { name?: string };
}

/** Same mapping classes/retail/sources/mercadolibre.ts uses for `condition`. */
function mlConditionOf(value: string | undefined): SourceCondition {
  const normalized = (value || "").toLowerCase();
  if (normalized === "new" || normalized === "nuevo") return "new";
  if (normalized === "used" || normalized === "usado") return "used";
  if (normalized.includes("refurb") || normalized.includes("reacondicionado")) return "refurbished";
  return "unknown";
}

/**
 * Production's scans hit the bridge at :23 (chairs-hourly), :47 (rentals-hourly) and :53
 * (equipar-hourly) past the hour (see ecosystem.config.js). Anywhere else in the hour is quiet.
 */
function isQuietMinute(date = new Date()): boolean {
  const minute = date.getUTCMinutes();
  return (minute >= 0 && minute <= 18) || (minute >= 28 && minute <= 43);
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
    const minute = new Date().getUTCMinutes();
    console.error(
      `Minuto UTC actual :${String(minute).padStart(2, "0")} está fuera de la ventana segura (:00-:18 o :28-:43). ` +
        "El puente de ML lo comparten los jobs de producción (chairs-hourly :23, rentals-hourly :47, equipar-hourly :53); " +
        "correr ahora arriesga un 429/403 que le cuesta 10 minutos de proxy a TODOS los jobs. Abortando sin pedir nada."
    );
    process.exitCode = 1;
    return;
  }

  const scans: Array<{ params: Record<string, string> }> = [
    ...(PHONE_SPEC.mlQueries ?? []).map((q) => ({ params: { q } })),
    ...(PHONE_SPEC.mlCategories ?? []).map((category) => ({
      params: { q: PHONE_SPEC.mlCategoryQuery ?? "", category },
    })),
  ].slice(0, ML_MAX_SEARCHES);

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
      tally.classify(title, mlConditionOf(row.condition), row.price?.currency || "?", Number(row.price?.amount) || 0, row.seller?.name || "Mercado Libre");
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
    case "fenicio":
      await runFenicio(store, tally);
      break;
    case "woocommerce":
      await runWoo(store, tally);
      break;
    case "shopify":
      await runShopify(store, tally);
      break;
    case "vtex":
      throw new Error("vtex: ninguna tienda de PHONE_STORE_KEYS usa este adaptador; no implementado en este dry run.");
  }
  tally.report();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
