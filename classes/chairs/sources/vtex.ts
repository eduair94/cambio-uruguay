// Moved to `classes/retail/sources/vtex.ts`. Pure parsers re-exported unchanged; the harvester is
// bound to the chair spec.
import { CHAIR_SPEC } from "../spec";
import { harvestVtexStore as harvest } from "../../retail/sources/vtex";
import type { ChairSourceResult } from "./mercadolibre";
import type { ChairStore } from "./registry";

export { decodeEntities, detectVtexCurrency, readVtexCurrency, vtexBrand, vtexOffer, vtexPrice } from "../../retail/sources/vtex";

export const harvestVtexStore = (store: ChairStore): Promise<ChairSourceResult> => harvest(store, [CHAIR_SPEC]);
