// Prints what the last chair harvest actually stored, so the catalogue can be checked without a
// Mongo client: multi-platform chairs first (the whole point of the directory), then the rating
// signals behind the stars.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { ChairCatalogMetaModel } from "./../../classes/models/ChairCatalogMeta";
import { ChairCatalogProductModel } from "./../../classes/models/ChairCatalogProduct";

async function main(): Promise<void> {
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  const meta = await ChairCatalogMetaModel.findOne({ key: "uy-desk-chairs" }).lean();
  console.log(
    `meta: ${meta?.products} sillas · ${meta?.offers} ofertas · ${meta?.sellers} vendedores · USD ${meta?.usdUyu} · ${meta?.asOf}`
  );

  const products = (await ChairCatalogProductModel.find({}).lean()) as any[];
  const multi = products
    .map((product) => ({
      product,
      platforms: new Set(product.offers.map((offer: any) => offer.source)).size,
    }))
    .filter((row) => row.platforms > 1 || row.product.offers.length > 2)
    .sort((a, b) => b.platforms - a.platforms || b.product.offers.length - a.product.offers.length);

  console.log(`\n=== ${multi.length} sillas con más de una oferta comparable`);
  for (const { product, platforms } of multi.slice(0, 14)) {
    console.log(
      `\n${product.name}  [${platforms} plataforma(s), ${product.offers.length} ofertas, ${product.stars ?? "sin"} ★ de ${product.ratingCount}]`
    );
    for (const offer of product.offers.slice(0, 6)) {
      console.log(
        `    ${offer.source.padEnd(13)} ${offer.seller.slice(0, 26).padEnd(27)} ${offer.currency} ${String(offer.price).padStart(9)}  -> $${offer.priceUyu}  ${offer.condition}`
      );
    }
    for (const signal of product.ratingSignals || []) {
      console.log(`    signal ${signal.source.padEnd(13)} ${signal.stars}★ w=${signal.weight} :: ${signal.detail}`);
    }
  }

  const rated = products.filter((product) => product.stars !== null);
  console.log(`\n${rated.length}/${products.length} sillas con calificación`);
  console.log(
    `categorías: ${JSON.stringify(
      products.reduce((tally: Record<string, number>, product) => {
        tally[product.category] = (tally[product.category] || 0) + 1;
        return tally;
      }, {})
    )}`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
