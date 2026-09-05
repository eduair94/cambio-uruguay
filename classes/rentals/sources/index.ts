// The rental harvest: enabled sources run in parallel and fail independently.
//
// Gallito's direct listings returned 403 to our identifying UA. El País is external_only:
// its terms prohibit automated extraction (reviewed 2026-09-05), so that adapter makes no
// network requests and contributes no adverts. Public HTML does not authorize reuse.
import { harvestFacebookMarketplace } from "./facebook";
import { harvestCasasweb } from "./casasweb";
import { harvestElpais } from "./elpais";
import { harvestInfoCasas } from "./infocasas";
import { harvestMercadoLibre } from "./mercadolibre";
import type { RentalSourceResult } from "./types";

export type { RentalSourceResult } from "./types";

export interface RentalHarvest {
  runs: RentalSourceResult[];
  listings: RentalSourceResult["listings"];
}

/**
 * `usdUyu` is passed in (not fetched here) because every source needs the SAME rate to decide
 * whether a price is a plausible monthly rent: two harvesters using two rates would disagree about
 * the same advert.
 */
export async function harvestRentalMarket(mode: "full" | "fast", usdUyu: number): Promise<RentalHarvest> {
  const runs = await Promise.all([
    harvestMercadoLibre(mode, usdUyu),
    harvestInfoCasas(mode, usdUyu),
    harvestFacebookMarketplace(mode, usdUyu),
    harvestCasasweb(mode, usdUyu),
    harvestElpais(mode, usdUyu),
  ]);

  return {
    runs,
    listings: runs.flatMap((run) => run.listings),
  };
}
