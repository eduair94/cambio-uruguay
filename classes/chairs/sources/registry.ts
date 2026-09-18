// The store list moved to `classes/retail/stores.ts` when the harvester stopped being about chairs.
// What stays here is the chair directory's view of it: which stores it reads, and the one setting
// that is a property of the CALLER rather than of the store — Grassi's catalogue is large and only
// its `sillas-de-oficina` collection is worth scanning for this directory.
import { RETAIL_STORES, retailStores } from "../../retail/stores";
import type { RetailStore, RetailStoreAdapter } from "../../retail/types";

export type ChairStoreAdapter = RetailStoreAdapter;
export type ChairStore = RetailStore;

const CHAIR_OVERRIDES: Record<string, Partial<RetailStore>> = {
  grassi: { collections: ["sillas-de-oficina"] },
};

/**
 * Every store the chair directory read BEFORE `classes/retail/stores.ts` grew a second category
 * (celulares, 2026-09-17). `retailStores()` with no keys returns every ENABLED store in the shared
 * registry — fine while the registry only held furniture/appliance sellers, wrong the moment a
 * phone-only store (claro, zonatecno, …) joins it: without this allowlist the chair job would start
 * sweeping seven storefronts it has no chair spec that could ever accept, for nothing. New stores
 * belong to the consumers that actually want them, never to "everyone by default".
 */
export const CHAIR_STORE_KEYS: readonly string[] = [
  "bertoni",
  "divino",
  "electroventas",
  "lacuevamuebles",
  "clemur",
  "soysantander",
  "dimm",
  "armo",
  "grassi",
  "covercompany",
  "americanmesh",
  "prontometal",
  "puntounion",
  "tyt",
  "ufficio",
  "eldorado",
];

export const CHAIR_STORES: ChairStore[] = RETAIL_STORES.filter((store) => CHAIR_STORE_KEYS.includes(store.key)).map(
  (store) => ({
    ...store,
    ...CHAIR_OVERRIDES[store.key],
  })
);

export const enabledChairStores = (): ChairStore[] => retailStores(CHAIR_STORE_KEYS, CHAIR_OVERRIDES);
