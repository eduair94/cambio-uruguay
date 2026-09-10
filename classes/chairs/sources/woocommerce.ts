// Moved to `classes/retail/sources/woocommerce.ts`. The pure parsers are re-exported unchanged; the
// harvester is bound to the chair spec so callers here keep their old signature.
import { CHAIR_SPEC } from "../spec";
import { harvestWooStore as harvest } from "../../retail/sources/woocommerce";
import type { ChairSourceResult } from "./mercadolibre";
import type { ChairStore } from "./registry";

export { parseWooProducts, wooPrice } from "../../retail/sources/woocommerce";

export const harvestWooStore = (store: ChairStore): Promise<ChairSourceResult> => harvest(store, [CHAIR_SPEC]);
