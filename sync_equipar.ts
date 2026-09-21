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
import { buildEquiparListings } from "./classes/equipar/listings";
import { equiparSpecs } from "./classes/equipar/classify";
import { EQUIPAR_CATEGORIES } from "./classes/equipar/registry";
import {
  countStoredItems,
  loadPreviousItems,
  loadStoreSnapshot,
  saveEquiparCatalog,
  saveEquiparListings,
  saveStoreSnapshot,
  withHistory,
} from "./classes/equipar/store";
import type { EquiparMeta } from "./classes/equipar/types";
import { harvestRetail } from "./classes/retail/harvest";
import { retailStores } from "./classes/retail/stores";
import { applyUnitGuard } from "./classes/retail/unitGuard";
import { EQUIPAR_STORE_KEYS, EQUIPAR_STORE_QUERIES } from "./classes/equipar/budget";
import { mergeStoreSnapshot } from "./classes/equipar/storeSnapshot";
import { recordPricewatch } from "./classes/pricewatch/record";

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
  const stores = retailStores(EQUIPAR_STORE_KEYS);

  const [harvest, usdUyu, previous, storedCount, storeSnapshot] = await Promise.all([
    harvestRetail({
      stores,
      specs,
      fast,
      maxMlScans: fast ? Math.round(ML_BUDGET / 2) : ML_BUDGET,
      maxFbQueries: fast ? Math.round(FB_BUDGET / 2) : FB_BUDGET,
      maxStoreQueries: fast ? EQUIPAR_STORE_QUERIES.fast : EQUIPAR_STORE_QUERIES.daily,
    }),
    fetchUsdUyuRate(),
    loadPreviousItems(),
    countStoredItems(),
    // Only the hourly run reads it. A snapshot that cannot be read leaves the hourly run exactly as
    // it was before the snapshot existed; it never fails the run.
    fast
      ? loadStoreSnapshot().catch((error) => {
          console.error("[equipar] no se pudo leer la foto de tiendas de la diaria", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  for (const run of harvest.runs) {
    console.log(`[equipar] ${run.ok ? "ok " : "FAIL"} ${run.key.padEnd(16)} ${run.listings} avisos :: ${run.note}`);
  }

  if (!usdUyu) {
    console.error("[equipar] no USD reference rate — refusing to publish prices that cannot be compared");
    process.exit(1);
  }

  // Backstop for the NEXT store whose declared unit or currency lies (TYT's lying currency is read
  // off its rendered price in the adapter — see classes/retail/unitGuard.ts for the story).
  const guarded = applyUnitGuard(harvest.listings, usdUyu);
  for (const drop of guarded.dropped) {
    console.log(
      `[equipar] unidad: ${drop.sellerKey} en ${drop.spec} mediana $${drop.storeMedianUyu} contra $${drop.mlMedianUyu} de ML — descartada`
    );
    const run = harvest.runs.find((candidate) => candidate.key === drop.sellerKey);
    if (run) run.note += `, descartada en ${drop.spec} por unidad`;
  }

  // The hourly run skips the Fenicio stores and searches 24 terms instead of 80, and each item is
  // replaced whole on save — so it completes the store side with the daily run's snapshot (fresh
  // listings win, rows older than 36 h are ignored, MercadoLibre and Marketplace never come from it).
  // The snapshot rows already passed the unit guard against the daily run's larger ML sample.
  let listings = guarded.listings;
  if (fast && storeSnapshot) {
    const merged = mergeStoreSnapshot(listings, storeSnapshot.listings, Date.now());
    console.log(
      `[equipar] foto de tiendas del ${storeSnapshot.generatedAt}: ${merged.fromSnapshot} avisos sumados, ${merged.stale} vencidos`
    );
    listings = merged.listings;
  } else if (fast) {
    console.log("[equipar] sin foto de tiendas de la diaria: se publica sólo lo leído en esta corrida");
  }

  const items = buildEquiparCatalog({ listings, usdUyu });
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
    listings: listings.length,
    items: items.length,
    runs: harvest.runs,
    baskets,
    uncovered: uncoveredCategories(items),
  };

  await saveEquiparCatalog(stored, meta);

  // The directory behind /equipar-casa-uruguay/productos: one row per listing the band kept, over
  // the SAME merged `listings` the catalogue was built from — a snapshot row keeps the day it was
  // really observed (its own `observedAt`), so the hourly run never fakes a sighting of a store
  // listing it did not read. Own try/catch: a failure here never costs the catalogue just saved.
  try {
    const built = buildEquiparListings({ listings, usdUyu });
    const saved = await saveEquiparListings(built.rows, today);
    console.log(
      `[equipar] avisos: ${saved.written} escritos, ${saved.pruned} podados, ${built.rejected} rechazados por la banda, ${built.suspect} sospechosos`
    );
  } catch (error) {
    console.error("[equipar] no se pudo guardar el directorio de avisos", error);
  }

  // Own try/catch: a failure recording history must never cost the catalogue that was just saved.
  // Recorded over `guarded.listings` (pre-merge, unit-guarded) rather than the possibly
  // snapshot-merged `listings` — a fast run's snapshot rows were not observed THIS run, and giving
  // them today's date would fake a price point that was never actually seen today.
  try {
    const pw = await recordPricewatch(guarded.listings, "equipar");
    console.log(`[equipar] pricewatch ${pw.written} ofertas, ${pw.pruned} vencidas borradas`);
  } catch (error) {
    console.error("[equipar] no se pudo registrar el historial de precios", error);
  }

  // Only the daily run writes the store snapshot, and only after it published: a thin run already
  // exited above, so it can never overwrite a good snapshot either. Own try/catch, like pricewatch:
  // the catalogue is already saved, and a failed snapshot write only costs the hourly runs their
  // store side until tomorrow — it must not turn a published run into exit 1.
  if (!fast) {
    const storeListings = guarded.listings.filter((listing) => listing.source === "store");
    try {
      const snapshot = await saveStoreSnapshot(storeListings, meta.generatedAt);
      console.log(
        `[equipar] foto de tiendas: ${storeListings.length} avisos, ${(snapshot.bytes / 1024 / 1024).toFixed(2)} MB` +
          (snapshot.saved ? "" : " — supera el tope, se conserva la anterior")
      );
    } catch (error) {
      console.error("[equipar] no se pudo guardar la foto de tiendas; la horaria usa la anterior", error);
    }
  }

  for (const basket of baskets) {
    console.log(
      `[equipar] canasta ${basket.label.padEnd(9)} $${basket.totalUyu.toLocaleString("es-UY")}` +
        (basket.complete ? " (completa)" : ` (parcial, faltan ${basket.missing.length}: ${basket.missing.map((row) => row.label).join(", ")})`)
    );
  }
  console.log(
    `[equipar] ${items.length} ítems de ${EQUIPAR_CATEGORIES.length} categorías, ${listings.length} avisos, ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[equipar] fallo", error);
  process.exit(1);
});
