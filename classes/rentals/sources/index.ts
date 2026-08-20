// The rental harvest: every portal, in parallel, each free to fail on its own.
//
// Gallito is NOT here. Its listing pages are an ASP.NET WebForms app that renders the results with
// a client-side postback, so there is no server-rendered card and no JSON contract to read — only
// a reverse-engineered `__doPostBack` sequence that breaks on their next deploy. Documented in
// docs/app/RENTALS.md rather than half-implemented.
import { harvestFacebookMarketplace } from "./facebook";
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
  ]);

  return {
    runs,
    listings: runs.flatMap((run) => run.listings),
  };
}
