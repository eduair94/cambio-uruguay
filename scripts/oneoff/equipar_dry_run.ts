// Dry run: harvests one store (or ML) with the equipar specs and prints how each listing was
// classified. Writes NOTHING — no appdb import, no dotenv, no Mongo. Usage:
//
//   npx ts-node scripts/oneoff/equipar_dry_run.ts eldorado [categoria]
//   npx ts-node scripts/oneoff/equipar_dry_run.ts ml aire-acondicionado
//
// Budgets of 0 are real zeros for the shared harvester (`plan.slice(0, 0)`), so a store run never
// spends a MercadoLibre or Marketplace query. ML itself is only reachable where its scraper
// service runs (the VPS), so "ml" from a laptop reports an unreachable source and nothing else.
import { harvestRetail } from "../../classes/retail/harvest";
import { retailStores } from "../../classes/retail/stores";
import { equiparSpecs } from "../../classes/equipar/classify";

const [storeKey = "eldorado", only] = process.argv.slice(2);

(async () => {
  const specs = equiparSpecs().filter((spec) => !only || spec.key === only);
  if (!specs.length) throw new Error(`categoría desconocida: ${only}`);
  const stores = storeKey === "ml" ? [] : retailStores([storeKey]);
  if (storeKey !== "ml" && !stores.length) throw new Error(`tienda desconocida o deshabilitada: ${storeKey}`);

  const harvest = await harvestRetail({
    stores,
    specs,
    maxMlScans: storeKey === "ml" ? 6 : 0,
    maxFbQueries: 0,
  });
  for (const listing of harvest.listings) {
    console.log(
      listing.attributes.CATEGORY_SPEC,
      "|",
      listing.currency,
      listing.price,
      "|",
      listing.brand,
      "|",
      listing.model,
      "|",
      listing.title,
      "|",
      listing.attributes.PRODUCT_TYPE ?? ""
    );
  }
  for (const run of harvest.runs) console.log(run.key, run.ok, run.listings, run.note);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
