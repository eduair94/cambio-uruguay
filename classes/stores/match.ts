// Resolves a seller display name (as shown on ML/other storefronts) to a curated store key.
//
// Deliberately excluded: the literal seller label "Mercado Libre". On Full/managed listings ML
// itself shows up as the seller of record, and that says nothing about which real company is
// behind the product — it is the platform's own fulfillment label, not a store. So even though
// "Mercado Libre" is (correctly) an alias of the `mercado-libre` marketplace entry itself, that
// specific normalized string is kept out of the lookup index on purpose.
import { STORES, storeNorm } from "./registry";

const EXCLUDED_ALIAS_NORMS = new Set<string>([storeNorm("Mercado Libre")]);

const ALIAS_INDEX: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const store of STORES) {
    for (const alias of store.aliases) {
      const norm = storeNorm(alias);
      if (!norm || EXCLUDED_ALIAS_NORMS.has(norm)) continue;
      if (!index.has(norm)) index.set(norm, store.key);
    }
  }
  return index;
})();

const RETAIL_KEY_INDEX: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const store of STORES) {
    if (store.retailStoreKey) index.set(store.retailStoreKey, store.key);
  }
  return index;
})();

export function storeKeyForSeller(sellerName: string, sellerKey?: string): string | null {
  const norm = storeNorm(sellerName);
  if (norm) {
    const byAlias = ALIAS_INDEX.get(norm);
    if (byAlias) return byAlias;
  }
  if (sellerKey) {
    const byRetail = RETAIL_KEY_INDEX.get(sellerKey);
    if (byRetail) return byRetail;
  }
  return null;
}
