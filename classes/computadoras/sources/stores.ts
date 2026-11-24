// Tiendas uruguayas de componentes con un catálogo legible: el precio NUEVO de cada pieza además del
// de Mercado Libre.
//
// Relevadas el 23/11/2026 (docs/app/COMPUTADORAS.md): de veinte tiendas de informática, nueve corren
// WooCommerce con la Store API pública (`/wp-json/wc/store/v1/products?search=`), todas en dólares y
// con robots que no excluye esa ruta. El adaptador es el de `classes/retail/` (el mismo de sillas y
// equipar): lee la moneda que la tienda DIBUJA, no la que declara la API, y divide por
// `currency_minor_unit` (2 en Thot y Tecsys, 0 en Laaca y Aslan). Las demás (nopCommerce, Sublime,
// Nibiru, Wix, Fenicio con diez componentes) quedan afuera hasta que valga la pena un lector propio.
import { harvestWooStore } from "../../retail/sources/woocommerce";
import type { CategorySpec, RetailListing, RetailStore } from "../../retail/types";
import { isBareCase } from "../parts";
import { readComputerSpecs } from "../specs";
import type { PartKind } from "../types";

export const PART_STORES: readonly RetailStore[] = [
  { key: "thot", name: "Thot Computación", baseUrl: "https://thotcomputacion.com.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "tecsys", name: "Tecsys", baseUrl: "https://tecsys.com.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "zonic", name: "Zonic", baseUrl: "https://zonic.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "digitalworld-pc", name: "Digital World", baseUrl: "https://digitalworld.com.uy", adapter: "woocommerce", channel: "importer", expectCurrency: "USD", enabled: true },
  { key: "laaca", name: "Laaca", baseUrl: "https://laaca.com.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "lidertek", name: "Lidertek", baseUrl: "https://lidertek.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "aslan", name: "Aslan Store", baseUrl: "https://aslanstoreuy.com", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "pcparts", name: "PC Parts", baseUrl: "https://pcparts.com.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
  { key: "obsidian", name: "Obsidian", baseUrl: "https://obsidian.uy", adapter: "woocommerce", channel: "local-store", expectCurrency: "USD", enabled: true },
];

/** Qué pieza es un producto de tienda: el mismo lector que el directorio, sin categoría de ML. */
const isKind = (kind: PartKind) => (title: string): boolean => readComputerSpecs({ title }).kind === kind;

export const PART_SPECS: readonly CategorySpec[] = [
  { key: "cpu", accept: isKind("cpu"), storeQueries: ["procesador", "ryzen", "core i5", "core i7", "core i3"] },
  { key: "gpu", accept: isKind("gpu"), storeQueries: ["placa de video", "rtx", "radeon rx", "geforce"] },
  { key: "ram", accept: isKind("ram"), storeQueries: ["memoria ram", "ddr4", "ddr5"] },
  { key: "storage", accept: isKind("storage"), storeQueries: ["ssd", "nvme", "disco duro"] },
  { key: "motherboard", accept: isKind("motherboard"), storeQueries: ["motherboard", "placa madre"] },
  { key: "psu", accept: isKind("psu"), storeQueries: ["fuente"] },
  { key: "case", accept: (title) => isBareCase(title), storeQueries: ["gabinete"] },
];

export interface StoreRun {
  key: string;
  name: string;
  ok: boolean;
  listings: number;
  note: string;
}

/** Cada tienda una vez por corrida diaria, en secuencia; una caída no tira las demás. */
export async function harvestPartStores(maxQueries = 19): Promise<{ listings: RetailListing[]; runs: StoreRun[] }> {
  const listings: RetailListing[] = [];
  const runs: StoreRun[] = [];
  for (const store of PART_STORES.filter((entry) => entry.enabled)) {
    try {
      const result = await harvestWooStore(store, PART_SPECS, { maxQueries });
      listings.push(...result.listings.filter((listing) => listing.available !== false));
      runs.push({ key: store.key, name: store.name, ok: result.ok, listings: result.listings.length, note: result.note });
    } catch (error) {
      runs.push({ key: store.key, name: store.name, ok: false, listings: 0, note: `error: ${String((error as Error)?.message ?? error).slice(0, 160)}` });
    }
  }
  return { listings, runs };
}
