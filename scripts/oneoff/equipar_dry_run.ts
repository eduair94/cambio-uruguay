// Dry run: harvests one store (or ML) with the equipar specs and prints how each listing was
// classified. Writes NOTHING — no appdb import, no dotenv, no Mongo. Usage:
//
//   npx ts-node scripts/oneoff/equipar_dry_run.ts eldorado [categoria]
//   npx ts-node scripts/oneoff/equipar_dry_run.ts ml aire-acondicionado
//   npx ts-node scripts/oneoff/equipar_dry_run.ts tyt calefon --guard [--queries=80] [--usd=40]
//
// Budgets of 0 are real zeros for the shared harvester (`plan.slice(0, 0)`), so a store run never
// spends a MercadoLibre or Marketplace query. `--guard` is the exception: it spends ONE MercadoLibre
// search per category (what the production plan gives most categories) and runs the same unit guard
// the daily job runs, printing what it would drop. `--queries=N` is the store-search cap the job
// passes as `maxStoreQueries` (80 daily, 24 hourly; the adapters' default of 24 when absent).
// Each store row prints its currency: TYT's comes from the price its storefront renders, and the
// store run's note counts the rows whose currency was corrected or dropped.
import { harvestRetail } from "../../classes/retail/harvest";
import { retailStores } from "../../classes/retail/stores";
import { applyUnitGuard } from "../../classes/retail/unitGuard";
import { equiparSpecs } from "../../classes/equipar/classify";
import type { RetailListing } from "../../classes/retail/types";

const flags = process.argv.slice(2).filter((arg) => arg.startsWith("--"));
const [storeKey = "eldorado", only] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const flagValue = (name: string): string | undefined =>
  flags.find((flag) => flag.startsWith(`--${name}=`))?.slice(name.length + 3);
const guard = flags.includes("--guard");
const usdUyu = Number(flagValue("usd") || 40);
const maxStoreQueries = flagValue("queries") ? Number(flagValue("queries")) : undefined;

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
    maxMlScans: storeKey === "ml" ? 6 : guard ? specs.length : 0,
    maxFbQueries: 0,
    maxStoreQueries,
  });

  let listings = harvest.listings;
  if (guard) {
    const guarded = applyUnitGuard(listings, usdUyu);
    for (const drop of guarded.dropped) {
      console.log(
        `GUARDA descarta ${drop.sellerKey} en ${drop.spec}: mediana $${Math.round(drop.storeMedianUyu)} contra $${Math.round(drop.mlMedianUyu)} de ML (${drop.n} avisos)`
      );
    }
    if (!guarded.dropped.length) console.log(`GUARDA (usd ${usdUyu}): no descarta nada`);
    listings = guarded.listings;
  }

  for (const listing of listings) {
    if (guard && listing.source === "mercadolibre") continue;
    console.log(line(listing));
  }
  for (const run of harvest.runs) console.log(run.key, run.ok, run.listings, run.note);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
