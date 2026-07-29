import type { ChairChannel } from "../types";

/**
 * Adapters, not scrapers-per-store. Every Uruguayan retailer we can read runs one of four
 * platforms:
 *
 *  - `fenicio`     — the Montevideo-built SaaS behind most local chains (assets on f.fcdn.app). It
 *                    publishes `/sitemap/catalogo-articulos.xml` and schema.org microdata per PDP.
 *  - `shopify`     — `/products.json` gives the whole catalogue as JSON.
 *  - `woocommerce` — the public Store API, `/wp-json/wc/store/v1/products`.
 *  - `vtex`        — the legacy catalogue API, `/api/catalog_system/pub/products/search`.
 *
 * Adding a store is therefore a few lines here, and a redesign of a storefront does not break us:
 * every adapter reads a published contract rather than markup.
 */
export type ChairStoreAdapter = "fenicio" | "shopify" | "woocommerce" | "vtex";

export interface ChairStore {
  key: string;
  name: string;
  baseUrl: string;
  adapter: ChairStoreAdapter;
  channel: ChairChannel;
  /**
   * Only a fallback for the sanity check — the real currency is read from the storefront at run
   * time. A store whose currency cannot be established is skipped, never guessed: publishing a
   * USD price as UYU (or the reverse) is a 40x error.
   */
  expectCurrency?: "UYU" | "USD";
  /** Shopify only: restrict the scan to these collection handles instead of the whole catalogue. */
  collections?: string[];
  enabled: boolean;
  note?: string;
}

export const CHAIR_STORES: ChairStore[] = [
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
    collections: ["sillas-de-oficina"],
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
  // WooCommerce: five sellers that already appear behind our MercadoLibre listings and run
  // the same platform, so one adapter reads all of them through the public Store API.
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
    // A supermarket, and the only VTEX storefront in the directory. Its two gaming chairs sit in
    // the computer-peripherals aisle next to the mice; everything else it calls a "silla" is a
    // garden, beach or camping chair the desk-chair filter drops.
    key: "eldorado",
    name: "El Dorado",
    baseUrl: "https://www.eldorado.com.uy",
    adapter: "vtex",
    channel: "local-store",
    expectCurrency: "UYU",
    enabled: true,
  },
];

export const enabledChairStores = (): ChairStore[] => CHAIR_STORES.filter((store) => store.enabled);
