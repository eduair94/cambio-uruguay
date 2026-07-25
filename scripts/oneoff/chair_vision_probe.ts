// Feasibility probe for the image-based identification: takes real listings that TEXT could not
// identify and prints what the model reads off each photo, accepted or not.
//   npm run chair_vision_probe -- [limit] [ml|fb]
//
// Facebook Marketplace is the source this exists for: its titles are routinely just "silla de
// escritorio", so every listing arrives unidentified and the photo is the only evidence there is.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { harvestFacebookMarketplace } from "../../classes/chairs/sources/facebook";
import { harvestMercadoLibre } from "../../classes/chairs/sources/mercadolibre";
import { identityForListing } from "../../classes/chairs/normalize";
import { identifyChairsFromImages } from "../../classes/chairs/vision";

async function main(): Promise<void> {
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  const limit = Number(process.argv[2] || 8);
  const source = (process.argv[3] || "ml").toLowerCase();
  process.env.CHAIR_VISION_LIMIT = String(limit);

  const harvest = source.startsWith("fb")
    ? await harvestFacebookMarketplace()
    : await harvestMercadoLibre();
  const unnamed = harvest.listings.filter((listing) => !identityForListing(listing).identified);
  console.log(
    `[${source}] ok=${harvest.ok} :: ${harvest.note}\n${harvest.listings.length} listings, ${unnamed.length} sin identificar por texto`
  );

  const before = unnamed.slice(0, limit).map((listing) => ({ id: listing.listingId, title: listing.title }));
  const stats = await identifyChairsFromImages(unnamed, () => true);

  for (const row of before) {
    const listing = unnamed.find((entry) => entry.listingId === row.id)!;
    const identity = identityForListing(listing);
    console.log(
      `\n${row.title.slice(0, 78)}\n   -> ${identity.identified ? `${identity.brand} | ${identity.model}` : "sigue sin identificar"}`
    );
  }
  console.log(`\n${JSON.stringify(stats)}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
