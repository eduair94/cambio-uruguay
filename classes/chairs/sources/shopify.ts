// Moved to `classes/retail/sources/shopify.ts`. The harvester is bound to the chair spec.
import { CHAIR_SPEC } from "../spec";
import { harvestShopifyStore as harvest } from "../../retail/sources/shopify";
import type { ChairSourceResult } from "./mercadolibre";
import type { ChairStore } from "./registry";

export { detectShopifyCurrency } from "../../retail/sources/shopify";

export const harvestShopifyStore = (store: ChairStore): Promise<ChairSourceResult> => harvest(store, [CHAIR_SPEC]);
