// Moved to `classes/retail/sources/mercadolibre.ts`. The harvester is bound to the chair spec.
import { CHAIR_SPEC } from "../spec";
import { harvestMercadoLibre as harvest } from "../../retail/sources/mercadolibre";
import type { RetailSourceResult } from "../../retail/types";

export type ChairSourceResult = RetailSourceResult;

export const harvestMercadoLibre = (): Promise<ChairSourceResult> => harvest([CHAIR_SPEC]);
