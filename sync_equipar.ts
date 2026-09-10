// Daily household-market harvest for /equipar-casa-uruguay.
//
// Reads the same Uruguayan retail the chair directory reads — sixteen storefronts through their own
// published contracts, MercadoLibre through the scraper service, Facebook Marketplace through the
// browser service — and turns it into "what does it cost to fill an empty home".
//
// Three deliberate properties:
//   * A source that fails degrades the run, never fails it. Yesterday's prices stay published and
//     the page shows which source is missing.
//   * The run refuses to publish an empty catalogue over a good one. A total outage keeps the last
//     known market rather than blanking the page.
//   * A basket total travels with the list of what could NOT be priced. A total that quietly skips
//     the fridge is lower than the truth and reads as a better deal.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { buildBaskets } from "./classes/equipar/basket";
import { buildEquiparCatalog, uncoveredCategories } from "./classes/equipar/catalog";
import { equiparSpecs } from "./classes/equipar/classify";
import { EQUIPAR_CATEGORIES } from "./classes/equipar/registry";
import {
  countStoredItems,
  loadPreviousItems,
  saveEquiparCatalog,
  withHistory,
} from "./classes/equipar/store";
import type { EquiparMeta } from "./classes/equipar/types";
import { harvestRetail } from "./classes/retail/harvest";
import { retailStores } from "./classes/retail/stores";

/**
 * How many MercadoLibre searches and Marketplace searches one run may spend.
 *
 * Storefronts are swept once and classified against every category, so they do not scale with the
 * catalogue. These two do — they are searched per term — so they take a budget, and the plan is
 * ordered by the registry, which puts the fridge, the washing machine and the mattress first. A run
 * that hits the ceiling loses the tea towels, never the line that decides the total.
 */
const ML_BUDGET = Number(process.env.EQUIPAR_ML_MAX_SCANS || 70);
const FB_BUDGET = Number(process.env.EQUIPAR_FB_MAX_QUERIES || 26);

async function main(): Promise<void> {
  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI so a job can
  // never write the backend database by accident. Map it explicitly, exactly like sync_chairs.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[equipar] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }

  // Hourly price refresh vs the full daily run. Fast mode leaves the Fenicio stores alone: they are
  // read one product page at a time, which is fine once a day and abusive every hour.
  const fast = process.argv.includes("--fast") || process.env.EQUIPAR_FAST === "1";

  const startedAt = Date.now();
  const specs = equiparSpecs();

  const [harvest, usdUyu, previous, storedCount] = await Promise.all([
    harvestRetail({
      stores: retailStores(),
      specs,
      fast,
      maxMlScans: fast ? Math.round(ML_BUDGET / 2) : ML_BUDGET,
      maxFbQueries: fast ? Math.round(FB_BUDGET / 2) : FB_BUDGET,
    }),
    fetchUsdUyuRate(),
    loadPreviousItems(),
    countStoredItems(),
  ]);

  for (const run of harvest.runs) {
    console.log(`[equipar] ${run.ok ? "ok " : "FAIL"} ${run.key.padEnd(16)} ${run.listings} avisos :: ${run.note}`);
  }

  if (!usdUyu) {
    console.error("[equipar] no USD reference rate — refusing to publish prices that cannot be compared");
    process.exit(1);
  }

  const items = buildEquiparCatalog({ listings: harvest.listings, usdUyu });
  const priced = items.filter((item) => item.newBand || item.usedBand);

  // A run that priced almost nothing is an outage, not a market. Publishing it would blank a page
  // that was correct yesterday.
  if (!priced.length || (storedCount > 0 && priced.length < storedCount * 0.4)) {
    console.error(
      `[equipar] sólo ${priced.length} ítems con precio contra ${storedCount} guardados — se conserva el catálogo anterior`
    );
    process.exit(1);
  }

  const baskets = buildBaskets(items, usdUyu);
  const today = new Date().toISOString().slice(0, 10);
  const stored = withHistory(items, previous, today);

  const meta: EquiparMeta = {
    generatedAt: new Date().toISOString(),
    usdUyu,
    listings: harvest.listings.length,
    items: items.length,
    runs: harvest.runs,
    baskets,
    uncovered: uncoveredCategories(items),
  };

  await saveEquiparCatalog(stored, meta);

  for (const basket of baskets) {
    console.log(
      `[equipar] canasta ${basket.label.padEnd(9)} $${basket.totalUyu.toLocaleString("es-UY")}` +
        (basket.complete ? " (completa)" : ` (parcial, faltan ${basket.missing.length}: ${basket.missing.map((row) => row.label).join(", ")})`)
    );
  }
  console.log(
    `[equipar] ${items.length} ítems de ${EQUIPAR_CATEGORIES.length} categorías, ${harvest.listings.length} avisos, ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[equipar] fallo", error);
  process.exit(1);
});
