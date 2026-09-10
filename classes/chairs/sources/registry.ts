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

export const CHAIR_STORES: ChairStore[] = RETAIL_STORES.map((store) => ({
  ...store,
  ...CHAIR_OVERRIDES[store.key],
}));

export const enabledChairStores = (): ChairStore[] => retailStores(undefined, CHAIR_OVERRIDES);
