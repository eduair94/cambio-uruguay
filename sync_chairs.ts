// Daily desk-chair market harvest for /sillas-escritorio-uruguay.
//
// Reads every source (MercadoLibre through the scraper service, the Uruguayan storefronts through
// their own sitemap/JSON contracts, Facebook Marketplace through the browser service), merges the
// listings into one row per chair, rates them with the evidence we have, and writes the catalogue
// to the APP database the Nuxt site reads.
//
// Two deliberate properties:
//   * A source that fails degrades the run, never fails it — yesterday's offers stay published and
//     the page shows which source is missing.
//   * The run refuses to publish an empty catalogue over a good one. A total outage keeps the last
//     known market rather than blanking the directory.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { buildChairCatalog, fetchUsdUyuRate } from "./classes/chairs/catalog";
import { harvestGlobalChairOpinions } from "./classes/chairs/sources/reddit_global";
import { harvestChairMarket } from "./classes/chairs/sources";
import { chairReviewFingerprint, synthesizeChairReviews } from "./classes/chairs/reviews";
import { identityForListing } from "./classes/chairs/normalize";
import { identifyChairsFromImages } from "./classes/chairs/vision";
import {
  loadChairTierSnapshot,
  loadPreviousChairCatalog,
  pruneRejectedChairs,
  saveChairCatalog,
} from "./classes/chairs/store";
import type { ChairCatalogMeta } from "./classes/chairs/types";

async function main(): Promise<void> {
  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI so a job can
  // never write the backend database by accident. Map it explicitly, exactly like sync_chair_tiers.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[chairs] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }

  const startedAt = Date.now();
  const [harvest, usdUyu, snapshot, stored] = await Promise.all([
    harvestChairMarket(),
    fetchUsdUyuRate(),
    loadChairTierSnapshot(),
    loadPreviousChairCatalog(),
  ]);

  for (const run of harvest.runs) {
    console.log(`[chairs] ${run.ok ? "ok " : "FAIL"} ${run.key.padEnd(16)} ${run.listings} listings :: ${run.note}`);
  }

  if (!usdUyu) {
    console.error("[chairs] no USD reference rate — refusing to publish prices that cannot be compared");
    process.exit(1);
  }
  if (!harvest.listings.length) {
    console.error("[chairs] every source came back empty — keeping the stored catalogue");
    process.exit(0);
  }

  // Listings nothing could name — Marketplace titles are routinely just "silla de escritorio" —
  // get one last chance: read the brand off the product photo. Guessed brands are restricted to
  // makers that actually sell here, so this can add a chair but never invent one.
  const vision = await identifyChairsFromImages(
    harvest.listings,
    (listing) => !identityForListing(listing).identified
  );
  if (vision.attempted || vision.cached) {
    console.log(
      `[chairs] visión: ${vision.identified} identificadas (${vision.attempted} consultas, ` +
        `${vision.cached} en caché, ${vision.rejected} descartadas)`
    );
  }

  // Rate premium models with international owner reviews too: r/CharruaDevs will never have a
  // meaningful sample on a Steelcase Leap, but r/OfficeChairs does.
  const draft = buildChairCatalog({
    listings: harvest.listings,
    snapshot,
    global: new Map(),
    usdUyu,
    previous: stored.previous,
  });
  const globalTargets = draft
    .filter((product) => product.brand && product.model)
    .sort((a, b) => b.sellers - a.sellers || (b.price?.median ?? 0) - (a.price?.median ?? 0))
    .map((product) => ({ slug: product.slug, brand: product.brand, model: product.model, name: product.name }));
  const global = await harvestGlobalChairOpinions(globalTargets);

  const products = buildChairCatalog({
    listings: harvest.listings,
    snapshot,
    global,
    usdUyu,
    previous: stored.previous,
  });
  if (!products.length) {
    console.error("[chairs] no identifiable chairs in this harvest — keeping the stored catalogue");
    process.exit(0);
  }

  const written = await synthesizeChairReviews(products, snapshot?.tiers ?? [], stored.reviews);
  for (const product of products) product.reviewFingerprint = chairReviewFingerprint(product);

  const meta: ChairCatalogMeta = {
    key: "uy-desk-chairs",
    asOf: new Date().toISOString(),
    usdUyu,
    products: products.length,
    offers: products.reduce((sum, product) => sum + product.offers.length, 0),
    sellers: new Set(products.flatMap((product) => product.offers.map((offer) => offer.sellerKey))).size,
    sources: harvest.runs,
  };
  await saveChairCatalog(products, meta);

  // A healthy run is the only safe moment to re-check the rows an older, looser filter admitted.
  const pruned =
    products.length >= 50
      ? await pruneRejectedChairs(new Set(products.map((product) => product.slug)))
      : [];
  if (pruned.length) console.log(`[chairs] retiradas ${pruned.length} entradas que hoy no pasarían el filtro`);

  console.log(
    `[chairs] ${meta.products} sillas, ${meta.offers} ofertas, ${meta.sellers} vendedores, ` +
      `${global.size} con reseñas internacionales, ${written} reseñas nuevas, USD ${usdUyu} ` +
      `(${Math.round((Date.now() - startedAt) / 1000)}s)`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[chairs] sync failed", error);
  process.exit(1);
});
