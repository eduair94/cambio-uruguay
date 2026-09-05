// The rental harvest: enabled sources run in parallel and fail independently.
//
// Gallito's direct listings returned 403 to our identifying UA. El País ran as external_only for
// the same reason its terms give — until its operator authorised the import on 2026-09-05; that
// adapter now reads the portal's own search endpoints and `RENTALS_ELPAIS_ENABLED=0` returns it to
// external_only. Public HTML still does not authorize reuse anywhere: a person's permission does.
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
