// Dry run: harvests one store (or ML) with the equipar specs and prints how each listing was
// classified. Writes NOTHING — no appdb import, no dotenv, no Mongo. Usage:
//
//   npx ts-node scripts/oneoff/equipar_dry_run.ts eldorado [categoria]
//   npx ts-node scripts/oneoff/equipar_dry_run.ts ml aire-acondicionado
//   npx ts-node scripts/oneoff/equipar_dry_run.ts tyt calefon --resolve [--usd=40]
//
// Budgets of 0 are real zeros for the shared harvester (`plan.slice(0, 0)`), so a store run never
// spends a MercadoLibre or Marketplace query. `--resolve` is the exception: it spends 6 MercadoLibre
// searches to build the per-category band and runs the per-listing unit resolver the daily job runs
// (resolveAmbiguousUnits), then prints what it kept, rescaled and dropped for flagged sellers.
// The store-query cap is the adapters' default (24) unless RETAIL_WOO_MAX_QUERIES /
// RETAIL_VTEX_MAX_QUERIES are set in the environment, like the daily pm2 app does.
import { harvestRetail } from "../../classes/retail/harvest";
import { retailStores } from "../../classes/retail/stores";
import { resolveAmbiguousUnits } from "../../classes/retail/unitGuard";
import { equiparSpecs } from "../../classes/equipar/classify";
import type { RetailListing } from "../../classes/retail/types";

const flags = process.argv.slice(2).filter((arg) => arg.startsWith("--"));
const [storeKey = "eldorado", only] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const resolve = flags.includes("--resolve");
const usdUyu = Number(flags.find((flag) => flag.startsWith("--usd="))?.slice("--usd=".length) || 40);

const line = (listing: RetailListing): string =>
  [
    listing.attributes.CATEGORY_SPEC,
    `${listing.source === "mercadolibre" ? "ML" : listing.sellerKey} ${listing.currency} ${listing.price}`,
    listing.brand,
    listing.model,
    listing.title,
    listing.attributes.PRODUCT_TYPE ?? "",
  ].join(" | ");

(async () => {
  const specs = equiparSpecs().filter((spec) => !only || spec.key === only);
  if (!specs.length) throw new Error(`categoría desconocida: ${only}`);
  const stores = storeKey === "ml" ? [] : retailStores([storeKey]);
  if (storeKey !== "ml" && !stores.length) throw new Error(`tienda desconocida o deshabilitada: ${storeKey}`);

  const harvest = await harvestRetail({
    stores,
    specs,
    maxMlScans: storeKey === "ml" || resolve ? 6 : 0,
    maxFbQueries: 0,
  });

  let listings = harvest.listings;
  if (resolve) {
    const ambiguous = new Set(stores.filter((store) => store.priceUnitAmbiguous).map((store) => store.key));
    const result = resolveAmbiguousUnits(listings, usdUyu, ambiguous);
    const after = new Map(result.listings.map((listing) => [listing.listingId, listing]));
    for (const listing of listings) {
      if (listing.source !== "store" || !ambiguous.has(listing.sellerKey)) continue;
      const kept = after.get(listing.listingId);
      if (!kept) console.log(`DESCARTADO  ${listing.price} | ${listing.title}`);
      else if (kept.price !== listing.price) console.log(`REESCALADO  ${listing.price} -> ${kept.price} | ${listing.title}`);
      else console.log(`SE DEJA     ${listing.price} | ${listing.title}`);
    }
    console.log(`resolver (usd ${usdUyu}): ${result.rescaled} reescalados, ${result.dropped} descartados`);
    listings = result.listings;
  }

  for (const listing of listings) console.log(line(listing));
  for (const run of harvest.runs) console.log(run.key, run.ok, run.listings, run.note);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
