// Moved to `classes/retail/sources/facebook.ts`. The harvester is bound to the chair spec.
import { CHAIR_SPEC } from "../spec";
import { harvestFacebookMarketplace as harvest } from "../../retail/sources/facebook";
import type { ChairSourceResult } from "./mercadolibre";

/**
 * The daily run reads each search 30 scrolls deep instead of 8. A Marketplace title rarely names the
 * chair, so few cards become an offer of a catalogue row, but depth is where the named ones are:
 * measured 2026-10-14 on four of the six searches, 3 identified chairs in the first 8 scrolls and 19
 * (Cougar Armor, Corsair T3 Rush, DXRacer…) in 30, none of the searches ended. Six at ~80 s.
 */
const DAILY_DEPTH = { maxScrolls: 30, minutes: 15 } as const;

export const harvestFacebookMarketplace = (fast = false): Promise<ChairSourceResult> =>
  harvest([CHAIR_SPEC], undefined, { fast, ...(fast ? {} : { depth: DAILY_DEPTH }) });
