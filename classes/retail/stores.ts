// Every Uruguayan storefront we can read, and how. Adapters, not scrapers-per-store: almost every
// retailer here runs one of four platforms, each of which publishes a machine-readable contract.
//
//  - `fenicio`     — the Montevideo-built SaaS behind most local chains (assets on f.fcdn.app). It
//                    publishes `/sitemap/catalogo-articulos.xml` and schema.org microdata per PDP.
//  - `shopify`     — `/products.json` gives the whole catalogue as JSON.
//  - `woocommerce` — the public Store API, `/wp-json/wc/store/v1/products`.
//  - `vtex`        — the legacy catalogue API, `/api/catalog_system/pub/products/search`.
//
// Adding a store is a few lines here, and a storefront redesign does not break us: every adapter
// reads a published contract rather than markup.
//
// The list is deliberately shared across consumers. A store that sells no fridges costs a caller
// nothing — its `accept` rejects every row — and the same Divino sitemap serves the chair directory
// and the household one from one sweep.
import type { RetailStore } from "./types";

export const RETAIL_STORES: RetailStore[] = [
  {
    key: "bertoni",
    name: "Bertoni",
    baseUrl: "https://bertoni.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "Distribuidor oficial Herman Miller en Uruguay.",
  },
  {
    key: "divino",
    name: "Divino",
    baseUrl: "https://www.divino.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
    note: "Cadena de muebles y electrodomésticos.",
  },
  {
    key: "electroventas",
    name: "Electroventas",
    baseUrl: "https://electroventas.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    key: "lacuevamuebles",
    name: "La Cueva Muebles",
    baseUrl: "https://www.lacuevamuebles.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    key: "clemur",
    name: "Clemur",
    baseUrl: "https://www.clemur.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    // Same Fenicio platform as the chains above. Its /sitemap/catalogo-articulos.xml times out
    // where the others answer, so the adapter falls back to the sitemap index; if that also
    // fails the run reports the gap instead of quietly dropping the store.
    key: "soysantander",
    name: "Tienda Santander",
    baseUrl: "https://tienda.soysantander.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    // Found by ranking the MercadoLibre sellers behind the chairs already in the catalogue:
    // DIMM sells 10 of them there and runs the same Fenicio platform, so it costs a registry
    // entry and no new code.
    key: "dimm",
    name: "DIMM",
    baseUrl: "https://dimm.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
  },
  {
    key: "armo",
    name: "Armo",
    baseUrl: "https://armo.uy",
    adapter: "shopify",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "Especialista en sillas ergonómicas de oficina.",
  },
  {
    key: "grassi",
    name: "Grassi",
    baseUrl: "https://grassi.uy",
    adapter: "shopify",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
  },
  {
    key: "covercompany",
    name: "Cover Company",
    baseUrl: "https://covercompany.com.uy",
    adapter: "shopify",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  // WooCommerce: sellers that already appear behind our MercadoLibre listings and run the same
  // platform, so one adapter reads all of them through the public Store API.
  {
    key: "americanmesh",
    name: "American Mesh",
    baseUrl: "https://americanmesh.com.uy",
    adapter: "woocommerce",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    key: "prontometal",
    name: "Prontometal",
    baseUrl: "https://prontometal.com.uy",
    adapter: "woocommerce",
    channel: "local-store",
    // Its Store API publishes `currency_code: "USD"` with `currency_minor_unit: 0`, so the integer
    // IS the price: "229" is USD 229.
    expectCurrency: "USD",
    enabled: true,
    note: "Fabricante local de sillas ergonómicas (línea Di Trevi).",
  },
  {
    key: "puntounion",
    name: "Punto Unión",
    baseUrl: "https://puntounion.com.uy",
    adapter: "woocommerce",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    key: "tyt",
    name: "TYT",
    baseUrl: "https://tyt.com.uy",
    adapter: "woocommerce",
    channel: "local-store",
    expectCurrency: "UYU",
    // No per-store price flag. TYT's minor unit is honest; its `currency_code` is not: it says "UYU"
    // on every product while the storefront renders 149 of 515 in dollars ("15900" is USD 159,00,
    // not $ 15.900 and not $ 159). The adapter reads the rendered currency from `price_html`; see
    // wooPricing in sources/woocommerce.ts. Measured 2026-09-16.
    enabled: true,
  },
  {
    key: "ufficio",
    name: "Ufficio Equipamientos",
    baseUrl: "https://ufficio.com.uy",
    adapter: "woocommerce",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  {
    // A supermarket, and the only VTEX storefront in the registry. Cheap to read and it carries
    // the small-appliance and kitchenware aisles the furniture chains do not.
    key: "eldorado",
    name: "El Dorado",
    baseUrl: "https://www.eldorado.com.uy",
    adapter: "vtex",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
  // Phone specialists and phone-carrying general electronics stores, added for
  // `classes/phones` (celulares). Same Fenicio/WooCommerce platforms as the furniture/appliance
  // chains above, but NOT read by the same jobs: registering a store here only makes it available
  // to `retailStores(keys)` — it does not enroll it in chairs' or equipar's daily sweep, which each
  // pass their OWN explicit allowlist (`CHAIR_STORE_KEYS`, `EQUIPAR_STORE_KEYS`) precisely so a
  // store added for one category never silently costs another category extra requests. Verified
  // 2026-09-17: platform reachable, currency read off a real product page/row, at least one real
  // phone URL/listing found (not just an accessory). See the doc comment on `PHONE_STORE_KEYS` in
  // `classes/phones/spec.ts` for the measurements, including the two candidates (`thotcomputacion`,
  // and already-registered `tyt`) that were measured OUT for carrying zero phones despite answering
  // every request cleanly.
  {
    key: "claro",
    name: "Tienda Claro",
    baseUrl: "https://tienda.claro.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
    note: "85 URLs de celular en el sitemap (2026-09-17); PDP de muestra en UYU.",
  },
  {
    key: "zonatecno",
    name: "Zonatecno",
    baseUrl: "https://www.zonatecno.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "245 URLs de celular en el sitemap (2026-09-17); PDP de muestra en USD.",
  },
  {
    key: "nstore",
    name: "nStore",
    baseUrl: "https://nstore.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "76 URLs de celular en el sitemap (2026-09-17), varios accesorios Samsung mezclados; PDP de muestra en USD.",
  },
  {
    key: "zonalaptop",
    name: "Zonalaptop",
    baseUrl: "https://zonalaptop.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "Sobre todo notebooks; 4 URLs de celular en el sitemap (2026-09-17). PDP de muestra en USD.",
  },
  {
    key: "market",
    name: "Market",
    baseUrl: "https://www.market.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
    note: "233 URLs de celular en el sitemap (2026-09-17); PDP de muestra en UYU.",
  },
  {
    key: "magiccenter",
    name: "Magic Center",
    baseUrl: "https://magiccenter.com.uy",
    adapter: "fenicio",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "Vende también electrodomésticos (equipar lo aprovecha); 9 URLs de celular en el sitemap (2026-09-17). PDP de muestra en USD.",
  },
  {
    key: "digitalworld",
    name: "Digital World",
    baseUrl: "https://digitalworld.com.uy",
  // ---------------------------------------------------------------- movilidad eléctrica
  // Four stores added for classes/movilidad/ (monopatines y bicicletas eléctricas). Measured
  // 2026-09-17 via the WooCommerce Store API / Shopify `products.json` directly, THEN re-measured
  // through the real `matchesCategory()` gate before deciding `MOVILIDAD_STORE_KEYS` — see
  // classes/movilidad/registry.ts for why two of the four (marked below) are registered here but not
  // in that list.
  {
    key: "delcar",
    name: "Delcar Motos",
    baseUrl: "https://delcar.com.uy",
    adapter: "woocommerce",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note: "Store API con currency_minor_unit: 2; search=iphone devuelve iPhone 16/16 Plus reales (2026-09-17).",
    note:
      "Medido 2026-09-17: 205 productos (WooCommerce, USD), de los cuales 88 motos, 9 bicicletas eléctricas (S-PRO) y 3 monopatines eléctricos (XIAOMI, MISTYLE) — todos titulados '… Eléctric[oa] …', así que pasan el filtro de título tal cual está. En MOVILIDAD_STORE_KEYS.",
  },
  {
    key: "superbikers",
    name: "Super Bikers",
    baseUrl: "https://superbikers.uy",
    adapter: "woocommerce",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note:
      "Medido 2026-09-17: 99 productos (WooCommerce, USD), 2 monopatines eléctricos (Go-Green Concept/Zero, categoría propia 'Eléctricas'), el resto motos a nafta. Sin bicicletas eléctricas. En MOVILIDAD_STORE_KEYS.",
  },
  {
    key: "voltbike",
    name: "Voltbike",
    baseUrl: "https://voltbike.uy",
    adapter: "shopify",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note:
      "Medido 2026-09-17: 89 productos (Shopify, USD): 5 bicicletas eléctricas y 1 motopatín reales, pero SUS TÍTULOS son nombres de modelo puros ('SuperVolt', 'Muche', 'Monopatin Air') sin la palabra 'bicicleta'/'monopatín' NI 'eléctrica' — sólo lo dicen el product_type y los tags de Shopify, que matchesCategory() sólo lee para excluir, nunca para incluir (classes/movilidad/registry.ts). Con el filtro de título estricto que exige 'eléctrico' (necesario para rechazar un monopatín/bicicleta sin motor, ver el spec) esta tienda no aporta ningún producto real a la corrida — confirmado con classes/movilidad/registry.ts + scripts/oneoff/movilidad_dry_run.ts. Registrada para otros consumidores futuros; FUERA de MOVILIDAD_STORE_KEYS.",
  },
  {
    key: "loopbikes",
    name: "Loop",
    baseUrl: "https://shop.loop-bikes.com",
    adapter: "shopify",
    channel: "local-store",
    expectCurrency: "USD",
    enabled: true,
    note:
      "Medido 2026-09-17: 135 productos (Shopify, USD): 13 bicicletas eléctricas reales (Loop Cruiser, Michael Blast Outsider/Vacay/Soda Bike/Greaser, Loop Slim/Kids/X350/K1…), todas tituladas por marca y modelo, sin la palabra 'bicicleta' ni 'eléctrica' en el título — mismo caso que voltbike, misma nota. 89 de sus 135 productos son repuestos (ya cubiertos por NOT_A_PRODUCT). FUERA de MOVILIDAD_STORE_KEYS por la misma razón que voltbike.",
  },
];

const BY_KEY = new Map(RETAIL_STORES.map((store) => [store.key, store]));

/**
 * Resolves a consumer's store list. `overrides` patches one store for one caller without editing
 * the shared registry — the chair directory scans a single Grassi collection, the household one
 * wants the whole catalogue, and neither is a property of the store itself.
 */
export function retailStores(
  keys?: readonly string[],
  overrides: Readonly<Record<string, Partial<RetailStore>>> = {}
): RetailStore[] {
  const chosen = keys?.length
    ? keys.map((key) => BY_KEY.get(key)).filter((store): store is RetailStore => Boolean(store))
    : RETAIL_STORES;
  return chosen.filter((store) => store.enabled).map((store) => ({ ...store, ...overrides[store.key] }));
}
