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
