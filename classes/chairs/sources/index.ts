// Runs every source and reports what each one produced. A source that fails degrades the run,
// it never fails it: the directory keeps yesterday's offers for that seller and the page shows the
// gap instead of pretending the catalogue is complete.
import type { ChairListing, ChairSourceRun } from "../types";
import { harvestFacebookMarketplace } from "./facebook";
import { harvestFenicioStore } from "./fenicio";
import { harvestMercadoLibre, type ChairSourceResult } from "./mercadolibre";
import { enabledChairStores } from "./registry";
import { harvestShopifyStore } from "./shopify";

export interface ChairHarvest {
  listings: ChairListing[];
  runs: ChairSourceRun[];
}

const safely = async (task: () => Promise<ChairSourceResult>): Promise<ChairSourceResult> => {
  try {
    return await task();
  } catch (error) {
    return { listings: [], ok: false, note: `error: ${(error as Error).message}`.slice(0, 200) };
  }
};

export async function harvestChairMarket(): Promise<ChairHarvest> {
  const listings: ChairListing[] = [];
  const runs: ChairSourceRun[] = [];

  const record = (key: string, label: string, adapter: string, result: ChairSourceResult): void => {
    listings.push(...result.listings);
    runs.push({
      key,
      label,
      adapter,
      listings: result.listings.length,
      chairs: new Set(result.listings.map((listing) => listing.title.toLowerCase())).size,
      ok: result.ok,
      note: result.note,
    });
  };

  record("mercadolibre", "Mercado Libre Uruguay", "mercadolibre", await safely(harvestMercadoLibre));
  record("facebook", "Facebook Marketplace", "facebook", await safely(harvestFacebookMarketplace));

  for (const store of enabledChairStores()) {
    const result = await safely(() =>
      store.adapter === "shopify" ? harvestShopifyStore(store) : harvestFenicioStore(store)
    );
    record(store.key, store.name, store.adapter, result);
  }

  return { listings, runs };
}
