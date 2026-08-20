// Dev probe: runs the rental harvesters with tiny page caps and prints what the dedupe did.
// Not part of the build (scripts/oneoff is excluded from tsconfig.production.json).
//
//   npx ts-node scripts/oneoff/rentals_probe.ts
import { buildRentalProperties } from "../../classes/rentals/dedupe";
import { harvestRentalMarket } from "../../classes/rentals/sources";

async function main(): Promise<void> {
  process.env.RENTALS_IC_MAX_PAGES = process.env.RENTALS_IC_MAX_PAGES || "3";
  process.env.RENTALS_ML_MAX_PAGES = process.env.RENTALS_ML_MAX_PAGES || "3";

  const usdUyu = Number(process.env.RENTALS_USD_UYU || 40);
  const harvest = await harvestRentalMarket("full", usdUyu);
  for (const run of harvest.runs) {
    console.log(`${run.ok ? "ok  " : "FAIL"} ${run.key.padEnd(14)} ${run.listings.length} :: ${run.note}`);
  }

  const properties = buildRentalProperties(harvest.listings, {
    usdUyu,
    today: new Date().toISOString().slice(0, 10),
    offerFirstSeen: new Map(),
    propertyFirstSeen: new Map(),
  });

  console.log(`\n${harvest.listings.length} avisos -> ${properties.length} propiedades`);
  const multi = properties.filter((property) => property.offers.length > 1);
  console.log(`${multi.length} propiedades con más de un aviso\n`);

  for (const property of properties.slice(0, 8)) {
    console.log(
      `- [${property.propertyType}] ${property.department}/${property.neighborhood || "?"} :: ${property.address || "sin dirección"} :: ` +
        `${property.bedrooms ?? "?"} dorm, ${property.area ?? "?"} m², $${property.priceUyu} :: ${property.sources.join("+")}`
    );
  }
  console.log("\nEjemplos unificados:");
  for (const property of multi.slice(0, 6)) {
    console.log(`- ${property.address || property.title} (${property.bedrooms ?? "?"} dorm)`);
    for (const offer of property.offers) {
      console.log(`    ${offer.source.padEnd(13)} ${offer.currency} ${offer.price} :: ${offer.url.slice(0, 90)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
