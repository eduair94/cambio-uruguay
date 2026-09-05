// The rental harvest: every portal, in parallel, each free to fail on its own.
//
// Gallito's direct listing endpoint currently blocks our identifying UA (403). Its public
// Inmuebles El País category pages provide a separate permitted, explicitly partial read path.
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
