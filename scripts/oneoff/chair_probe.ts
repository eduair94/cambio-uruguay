// Dev probe for the chair market harvesters — runs one source (or all of them) without touching
// Mongo, Gemini or the snapshot, and prints what came back. Use it after changing an adapter:
//
//   npm run chair_probe                 # every source
//   npm run chair_probe -- bertoni      # a single registry key ("mercadolibre" / "facebook" too)
import dotenv from "dotenv";
dotenv.config();

import { harvestFacebookMarketplace } from "../../classes/chairs/sources/facebook";
import { harvestFenicioStore } from "../../classes/chairs/sources/fenicio";
import { harvestMercadoLibre } from "../../classes/chairs/sources/mercadolibre";
import { CHAIR_STORES } from "../../classes/chairs/sources/registry";
import { harvestShopifyStore } from "../../classes/chairs/sources/shopify";
import { harvestWooStore } from "../../classes/chairs/sources/woocommerce";
import { groupListings, identityForListing } from "../../classes/chairs/normalize";
import type { ChairListing } from "../../classes/chairs/types";

async function run(): Promise<void> {
  const only = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
  const wanted = (key: string): boolean => !only.length || only.includes(key);
  const listings: ChairListing[] = [];

  if (wanted("mercadolibre")) {
    const result = await harvestMercadoLibre();
    console.log(`\n[mercadolibre] ok=${result.ok} listings=${result.listings.length} :: ${result.note}`);
    listings.push(...result.listings);
  }
  if (wanted("facebook")) {
    const result = await harvestFacebookMarketplace();
    console.log(`\n[facebook] ok=${result.ok} listings=${result.listings.length} :: ${result.note}`);
    listings.push(...result.listings);
  }
  for (const store of CHAIR_STORES) {
    if (!wanted(store.key)) continue;
    const result = await (store.adapter === "shopify"
      ? harvestShopifyStore(store)
      : store.adapter === "woocommerce"
        ? harvestWooStore(store)
        : harvestFenicioStore(store));
    console.log(`\n[${store.key}] ok=${result.ok} listings=${result.listings.length} :: ${result.note}`);
    for (const listing of result.listings.slice(0, 6)) {
      const identity = identityForListing(listing);
      console.log(
        `    ${listing.currency} ${String(listing.price).padStart(9)}  ${identity.identified ? identity.name : "(sin identificar)"}  <- ${listing.title.slice(0, 70)}`
      );
    }
    listings.push(...result.listings);
  }

  const groups = groupListings(listings);
  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log(`\n=== ${listings.length} listings -> ${groups.size} chairs`);
  for (const [key, rows] of ranked.slice(0, 25)) {
    const sellers = new Set(rows.map((row) => row.sellerName)).size;
    console.log(`  ${String(rows.length).padStart(3)} listings / ${sellers} sellers  ${key}`);
  }
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
