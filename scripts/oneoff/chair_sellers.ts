// Ranks the MercadoLibre sellers behind the chairs we already have. Each one is a Uruguayan shop
// that may also run its own storefront — a far better source of integration candidates than a
// web search, because these sellers demonstrably stock chairs today.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { ChairCatalogProductModel } from "../../classes/models/ChairCatalogProduct";

async function main(): Promise<void> {
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  const products = (await ChairCatalogProductModel.find({}).select({ offers: 1 }).lean()) as any[];
  const tally = new Map<string, { listings: number; source: string }>();
  for (const product of products) {
    for (const offer of product.offers ?? []) {
      const row = tally.get(offer.seller) ?? { listings: 0, source: offer.source };
      row.listings++;
      tally.set(offer.seller, row);
    }
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1].listings - a[1].listings);
  for (const [seller, row] of ranked.slice(0, 30)) {
    console.log(String(row.listings).padStart(3), row.source.padEnd(13), seller);
  }
  console.log(`\n${ranked.length} vendedores distintos`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
