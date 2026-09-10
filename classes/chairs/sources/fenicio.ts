// Moved to `classes/retail/sources/fenicio.ts`. The harvester is bound to the chair spec.
import { CHAIR_SPEC } from "../spec";
import { harvestFenicioStore as harvest } from "../../retail/sources/fenicio";
import type { ChairSourceResult } from "./mercadolibre";
import type { ChairStore } from "./registry";

export const harvestFenicioStore = (store: ChairStore): Promise<ChairSourceResult> => harvest(store, [CHAIR_SPEC]);
