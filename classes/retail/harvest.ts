// Runs every source and reports what each one produced. A source that fails degrades the run, it
// never fails it: the caller keeps yesterday's offers for that seller and the page shows the gap
// instead of pretending the catalogue is complete.
//
// The shape that matters here: a storefront is swept ONCE and every product is offered to every
// category spec. Reading a 40k-URL sitemap costs the same whether one category is looking or forty
// are, so household goods ride along with chairs at no extra request. MercadoLibre and Facebook are
// the opposite — they are searched per term, so they scale with the number of categories and take a
// budget.
import { harvestFacebookMarketplace } from "./sources/facebook";
import { harvestFenicioStore } from "./sources/fenicio";
import { harvestMercadoLibre } from "./sources/mercadolibre";
import { harvestShopifyStore } from "./sources/shopify";
import { harvestVtexStore } from "./sources/vtex";
import { harvestWooStore } from "./sources/woocommerce";
import type {
  CategorySpec,
  RetailListing,
  RetailSourceResult,
  RetailStore,
  RetailStoreAdapter,
} from "./types";

export interface RetailSourceRun {
  key: string;
  label: string;
  adapter: string;
  listings: number;
  ok: boolean;
  note: string;
}

export interface RetailHarvest {
  listings: RetailListing[];
  runs: RetailSourceRun[];
}

export interface HarvestOptions {
  stores: readonly RetailStore[];
  specs: readonly CategorySpec[];
  /**
   * The hourly pass: MercadoLibre, Facebook and the JSON catalogues only.
   *
   * A Fenicio store is read by opening one product page at a time — hundreds of requests across
   * small Uruguayan shops. Fine once a day, abusive every hour, so the hourly refresh leaves them
   * to the daily run and keeps the stored offers until then.
   */
  fast?: boolean;
  /** Cap on MercadoLibre searches for this run. Unlimited when absent. */
  maxMlScans?: number;
  /** Cap on Facebook Marketplace searches for this run. Unlimited when absent. */
  maxFbQueries?: number;
}

/** A store's `adapter` is the only thing that decides how it is read. */
const HARVESTERS: Record<
  RetailStoreAdapter,
  (store: RetailStore, specs: readonly CategorySpec[]) => Promise<RetailSourceResult>
> = {
  fenicio: harvestFenicioStore,
  shopify: harvestShopifyStore,
  woocommerce: harvestWooStore,
  vtex: harvestVtexStore,
};

const safely = async (task: () => Promise<RetailSourceResult>): Promise<RetailSourceResult> => {
  try {
    return await task();
  } catch (error) {
    return { listings: [], ok: false, note: `error: ${(error as Error).message}`.slice(0, 200) };
  }
};

export async function harvestRetail(options: HarvestOptions): Promise<RetailHarvest> {
  const { stores, specs, fast = false } = options;
  const listings: RetailListing[] = [];
  const runs: RetailSourceRun[] = [];

  const record = (key: string, label: string, adapter: string, result: RetailSourceResult): void => {
    listings.push(...result.listings);
    runs.push({
      key,
      label,
      adapter,
      listings: result.listings.length,
      ok: result.ok,
      note: result.note,
    });
  };

  record(
    "mercadolibre",
    "Mercado Libre Uruguay",
    "mercadolibre",
    await safely(() => harvestMercadoLibre(specs, options.maxMlScans))
  );
  record(
    "facebook",
    "Facebook Marketplace",
    "facebook",
    await safely(() => harvestFacebookMarketplace(specs, options.maxFbQueries))
  );

  for (const store of stores) {
    if (fast && store.adapter === "fenicio") {
      runs.push({
        key: store.key,
        label: store.name,
        adapter: store.adapter,
        listings: 0,
        ok: true,
        note: "omitida en el refresco horario; se actualiza en la corrida diaria",
      });
      continue;
    }
    const result = await safely(() => HARVESTERS[store.adapter](store, specs));
    record(store.key, store.name, store.adapter, result);
  }

  return { listings, runs };
}
