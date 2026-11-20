// The MercadoLibre harvest behind /productos-que-te-cambian-la-vida-uruguay: what r/uruguay named in
// the thread «¿Qué producto les cambió la vida?» (19/11/2026), with today's price.
//
// Third consumer of the equipar catalog machinery through an injected registry (after equipar and
// movilidad): the same shared retail harvester, the same bands, regimes, variants and new/used split.
// Only the registry (classes/productosvida/registry.ts, 26 categories), the source (MercadoLibre only:
// no storefronts, no Facebook, no pricewatch) and where things are stored differ.
//
// Shaped like sync_movilidad.ts: every refusal is a thrown Error, `main()` is exported, and the
// process only exits behind `require.main === module`, so a test can call `main()` against mocked
// collaborators.
//
// The bridge budget: 33 searches × 2 pages (≤ 66 requests) in the :13–:21 gap of the shared bridge,
// with no new page after 6 minutes from process start. pm2 launches a cron app the moment it is
// registered, recreated or resurrected, at any minute, so outside :13–:14 of 00/04/16/20 UTC `main()`
// leaves one log line and exits without a request or a connection.
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "app/.env", quiet: true });

import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { buildEquiparCatalog, uncoveredCategories } from "./classes/equipar/catalog";
import { specsFor } from "./classes/equipar/classify";
import { buildEquiparListings } from "./classes/equipar/listings";
import {
  PRODUCTOS_VIDA_CATEGORIES,
  PRODUCTOS_VIDA_META_KEY,
  PRODUCTOS_VIDA_ML_DEADLINE_MS,
  PRODUCTOS_VIDA_ML_MAX_SCANS,
  PRODUCTOS_VIDA_ML_PAGES_PER_QUERY,
  PRODUCTOS_VIDA_WINDOW,
  productosVidaBridgeWindowOpen,
} from "./classes/productosvida/registry";
import {
  countPricedRecentItems,
  loadPreviousItems,
  PRODUCTOS_VIDA_RECENT_DAYS,
  saveProductosVidaCatalog,
  saveProductosVidaListings,
  withHistory,
  type PreviousItem,
} from "./classes/productosvida/store";
import type { ProductosVidaMeta } from "./classes/productosvida/types";
import { harvestRetail } from "./classes/retail/harvest";
import { applyUnitGuard } from "./classes/retail/unitGuard";

/** A run that priced fewer than this fraction of what was stored is an outage, not a market. */
const THIN_RUN_FLOOR = 0.4;

const TAG = "[productos-vida]";

export type ProductosVidaRunResult = "ran" | "outside-window";

export async function main(): Promise<ProductosVidaRunResult> {
  // First thing: the 6-minute clock counts from here, so a slow rate fetch eats into it instead of
  // pushing the last bridge page later.
  const startedAt = Date.now();

  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI. Mapped only when
  // there is a real value (assigning `undefined` would store the STRING "undefined"), as in movilidad.
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) {
    process.env.APP_MONGO_URI = process.env.MONGO_URI;
  }

  const dryRun = process.argv.includes("--dry-run");
  const jsonPath = process.argv.find((arg) => arg.startsWith("--json="))?.slice("--json=".length) || null;
  const ignoreWindow = process.argv.includes("--ignore-window");

  if (!dryRun && !appDbConfigured()) {
    throw new Error(`${TAG} APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong database`);
  }

  // A launch outside the bridge window (deploy registration, drift recreation, `pm2 resurrect`) leaves
  // this one line and nothing else: no rate fetch, no bridge request, no connection. A dry run is
  // started by hand at a time the operator picks, so it does not look at the window.
  if (!dryRun && !ignoreWindow && !productosVidaBridgeWindowOpen(new Date())) {
    const hours = PRODUCTOS_VIDA_WINDOW.hours.join("/");
    console.log(
      `${TAG} fuera de la ventana del puente (:${PRODUCTOS_VIDA_WINDOW.fromMinute}–:${PRODUCTOS_VIDA_WINDOW.toMinute} de ${hours} UTC): no se cosecha`
    );
    return "outside-window";
  }

  if (dryRun) {
    console.log(
      `${TAG} --dry-run: no se toca ninguna base (APP_MONGO_URI ${appDbConfigured() ? "está configurada, pero" : "no está configurada;"} no se conecta)`
    );
  }

  // Before any bridge request: a run that cannot convert dollars must not spend the budget first.
  const usdUyu = await fetchUsdUyuRate();
  if (!usdUyu) {
    throw new Error(`${TAG} no USD reference rate — refusing to spend the bridge on prices that cannot be compared`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const [harvest, previous, storedCount] = await Promise.all([
    harvestRetail({
      stores: [],
      specs: specsFor(PRODUCTOS_VIDA_CATEGORIES),
      maxFbQueries: 0,
      maxMlScans: PRODUCTOS_VIDA_ML_MAX_SCANS,
      mlMaxPagesPerQuery: PRODUCTOS_VIDA_ML_PAGES_PER_QUERY,
      mlDeadlineAt: startedAt + PRODUCTOS_VIDA_ML_DEADLINE_MS,
    }),
    dryRun ? Promise.resolve(new Map<string, PreviousItem>()) : loadPreviousItems(),
    dryRun ? Promise.resolve(0) : countPricedRecentItems(today),
  ]);

  for (const run of harvest.runs) {
    console.log(`${TAG} ${run.ok ? "ok " : "FAIL"} ${run.key.padEnd(14)} ${run.listings} avisos :: ${run.note}`);
  }

  // MercadoLibre is the only source: without it there is nothing to publish, not even on a first run
  // (an empty first catalogue would read as "nothing exists" until the next good run).
  const ml = harvest.runs.find((run) => run.key === "mercadolibre");
  if (!ml?.ok) {
    throw new Error(`${TAG} Mercado Libre no respondió (${ml?.note ?? "sin corrida"}) — no se escribe nada`);
  }

  // A no-op without storefronts (it compares a store's median against ML's), kept on purpose: the day
  // a store is added here, the guard is already in place.
  const guarded = applyUnitGuard(harvest.listings, usdUyu);
  const listings = guarded.listings;

  const items = buildEquiparCatalog({ listings, usdUyu, registry: PRODUCTOS_VIDA_CATEGORIES });
  // NEW bands only, matching `countPricedRecentItems`: the page publishes only new bands.
  const priced = items.filter((item) => item.newBand).length;

  // Never true on a first run: `storedCount` is 0 there.
  if (storedCount > 0 && priced < storedCount * THIN_RUN_FLOOR) {
    throw new Error(
      `${TAG} sólo ${priced} ítems con banda nueva contra ${storedCount} guardados en ${PRODUCTOS_VIDA_RECENT_DAYS} días — se conserva el catálogo anterior`
    );
  }

  const stored = withHistory(items, previous, today);

  const meta: ProductosVidaMeta = {
    generatedAt: new Date().toISOString(),
    usdUyu,
    listings: listings.length,
    items: items.length,
    runs: harvest.runs.filter((run) => run.key === "mercadolibre"),
    uncovered: uncoveredCategories(items, PRODUCTOS_VIDA_CATEGORIES),
  };

  const built = buildEquiparListings({ listings, usdUyu, registry: PRODUCTOS_VIDA_CATEGORIES });

  console.log(
    `${TAG} ${items.length} ítems (${priced} con banda nueva) de ${PRODUCTOS_VIDA_CATEGORIES.length} categorías, ${listings.length} avisos, ${built.rows.length} filas, ${((Date.now() - startedAt) / 1000).toFixed(1)}s` +
      (meta.uncovered.length ? ` — sin banda: ${meta.uncovered.join(", ")}` : "")
  );

  if (dryRun) {
    if (jsonPath) {
      mkdirSync(dirname(jsonPath), { recursive: true });
      writeFileSync(
        jsonPath,
        JSON.stringify({ meta: { ...meta, key: PRODUCTOS_VIDA_META_KEY }, items: stored, listings: built.rows }, null, 2)
      );
      console.log(`${TAG} --dry-run: escrito ${jsonPath}`);
    }
    console.log(`${TAG} --dry-run: no se escribe nada en la base`);
    return "ran";
  }

  await saveProductosVidaCatalog(stored, meta);

  // Own try/catch: a failure writing the listing rows (v2 material, not read by the page) must never
  // cost the catalogue that was just saved.
  try {
    const saved = await saveProductosVidaListings(built.rows, today);
    console.log(
      `${TAG} avisos: ${saved.written} escritos, ${saved.pruned} podados, ${built.rejected} rechazados por la banda, ${built.suspect} sospechosos`
    );
  } catch (error) {
    console.error(`${TAG} no se pudieron guardar las filas de avisos`, error);
  }

  return "ran";
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  main()
    .then(async (result) => {
      // An out-of-window start and a dry run never opened a connection, so never close one either:
      // appConnection() would create one just to close it.
      if (!dryRun && result === "ran" && appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async (error) => {
      console.error(`${TAG} fallo`, error);
      if (!dryRun && appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
