// Moved to `classes/retail/sources/facebook.ts`. The harvester is bound to the chair spec.
import { CHAIR_SPEC } from "../spec";
import { harvestFacebookMarketplace as harvest } from "../../retail/sources/facebook";
import type { ChairSourceResult } from "./mercadolibre";

export const harvestFacebookMarketplace = (): Promise<ChairSourceResult> => harvest([CHAIR_SPEC]);
