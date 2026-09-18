// How much of other people's storefronts one household-market run may search.
//
// WooCommerce and VTEX stores filter server-side, so the adapters send the registry's deduplicated
// `storeQueries` in REGISTRY ORDER and stop at a cap. At the adapters' default of 24 the list
// stopped at "olla": sartén, cubiertos, vajilla, vasos, sábanas, toallas, limpieza and tacho — most
// of tier S — were never searched on El Dorado or the five WooCommerce stores.
//
// The cap is passed in code (harvestRetail's `maxStoreQueries`) and never as a pm2 env var:
// scripts/deploy-backend.sh only recreates a registered app when its cron changes, so a new env in
// ecosystem.config.js would silently never reach the VPS.
export const EQUIPAR_STORE_QUERIES = {
  /** Every deduplicated store query in the registry (about 71) fits. Once a day. */
  daily: 80,
  /**
   * The hourly refresh runs 23 times a day against small shops, so it keeps the adapters' default.
   * What it does not search is not lost: the fast run merges the daily run's store snapshot
   * (storeSnapshot.ts), so those categories keep yesterday's store offers until the next daily run.
   */
  fast: 24,
} as const;

/**
 * The storefronts this directory actually reads. `retailStores()` with no keys returns every
 * ENABLED store in the shared `classes/retail` registry — fine while that registry only held
 * furniture/appliance sellers, wrong the moment a phone-only store (claro, zonatecno, nstore,
 * zonalaptop, market, digitalworld — added 2026-09-17 for `classes/phones`) joins it: without this
 * allowlist `sync_equipar.ts` would start sweeping storefronts no household-goods category could
 * ever accept, for nothing. Same 16 stores the chair directory reads
 * (`classes/chairs/sources/registry.ts`'s `CHAIR_STORE_KEYS`) plus `magiccenter`, which the
 * directorios-de-producto plan calls out by name: it carries appliances alongside its phones.
 */
export const EQUIPAR_STORE_KEYS: readonly string[] = [
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
  "magiccenter",
];
