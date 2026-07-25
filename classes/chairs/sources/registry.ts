import type { ChairChannel } from "../types";

/**
 * Adapters, not scrapers-per-store. Almost every Uruguayan retailer runs one of two platforms:
 *
 *  - `fenicio`  — the Montevideo-built SaaS behind most local chains (assets on f.fcdn.app). It
 *                 publishes `/sitemap/catalogo-articulos.xml` and schema.org microdata on each PDP.
 *  - `shopify`  — `/products.json` gives the whole catalogue as JSON.
 *
 * Adding a store is therefore a few lines here, and a redesign of a storefront does not break us:
 * both adapters read contracts (sitemap, microdata, products.json) rather than markup.
 */
export type ChairStoreAdapter = "fenicio" | "shopify";

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
];

export const enabledChairStores = (): ChairStore[] => CHAIR_STORES.filter((store) => store.enabled);
