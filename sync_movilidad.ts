// Daily monopatín/bicicleta-eléctrica harvest for the movilidad directory.
//
// Reuses the equipar catalog machinery end to end via an injected registry (see
// `BuildCatalogInput.registry` in `classes/equipar/catalog.ts` and `classes/movilidad/registry.ts`):
// the same shared retail harvester, the same unit guard, the same bands/regimes, the same
// store-snapshot mechanics for the hourly refresh. Only the registry (two categories, not
// thirty-eight), the store list, the harvest budgets and where things are stored differ.
//
// Same two properties equipar's job protects, and for the same reason: a source that fails degrades
// the run rather than failing it, and a run that priced almost nothing never overwrites a catalogue
// that was correct yesterday.
//
// Unlike sync_equipar.ts, this file does not call `process.exit` from inside `main()`: every refusal
// is a thrown Error, `main()` is exported, and the actual process only runs (and only ever exits
// once, with the APP DB connection closed) behind `require.main === module` — so a test can import
// `main` and call it directly, against mocked collaborators, without spawning a real process or
// touching a real database.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { buildEquiparCatalog, uncoveredCategories } from "./classes/equipar/catalog";
import { buildEquiparListings } from "./classes/equipar/listings";
import { specsFor } from "./classes/equipar/classify";
import { mergeStoreSnapshot } from "./classes/equipar/storeSnapshot";
import { MOVILIDAD_CATEGORIES, MOVILIDAD_STORE_KEYS } from "./classes/movilidad/registry";
import {
  countStoredItems,
  loadPreviousItems,
  loadStoreSnapshot,
  saveMovilidadCatalog,
  saveMovilidadListings,
  saveStoreSnapshot,
  withHistory,
  type PreviousItem,
} from "./classes/movilidad/store";
import type { MovilidadMeta } from "./classes/movilidad/types";
import { recordPricewatch } from "./classes/pricewatch/record";
import { harvestRetail } from "./classes/retail/harvest";
import { retailStores } from "./classes/retail/stores";
import { applyUnitGuard } from "./classes/retail/unitGuard";

/**
 * How much of the shared retail harvester one run may spend.
 *
 * Equipar's budgets (classes/equipar/budget.ts, ~70/26/80) are sized for thirty-eight categories
 * across sixteen storefronts. This registry has two categories and five storefronts — the equivalent
 * of one or two equipar categories' worth of search terms — so the same generosity would just spend
 * more of the shared MercadoLibre/Facebook bridge's budget for no extra coverage. Fixed in code, like
 * equipar's: `scripts/deploy-backend.sh` only recreates a registered app when its cron changes, so a
 * pm2 env var added later would silently never reach the VPS.
 */
const ML_MAX_SCANS = { fast: 6, daily: 16 } as const;
const FB_MAX_QUERIES = { fast: 2, daily: 6 } as const;
const STORE_MAX_QUERIES = { fast: 6, daily: 16 } as const;

/** A run that priced fewer than this fraction of what was stored is an outage, not a market. */
const THIN_RUN_FLOOR = 0.4;

export async function main(): Promise<void> {
  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI so a job can
  // never write the backend database by accident. Map it explicitly, exactly like sync_equipar —
  // except guarded against Node's `process.env.X = undefined` quirk: assigning `undefined` coerces
  // to the STRING "undefined" (env vars are always strings), which would make `appDbConfigured()`
  // return true even with neither variable set. Only assign when there is a real value to fall back to.
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) {
    process.env.APP_MONGO_URI = process.env.MONGO_URI;
  }

  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");

  if (!dryRun && !appDbConfigured()) {
    throw new Error("[movilidad] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong database");
  }
  if (dryRun) {
    // Never connects, whether or not APP_MONGO_URI happens to be set — every store.ts call below is
    // skipped outright rather than pointed at a database and told not to write.
    console.log(
      `[movilidad] --dry-run: no se toca ninguna base (APP_MONGO_URI ${appDbConfigured() ? "está configurada, pero" : "no está configurada;"} no se conecta)`
    );
  }

  const startedAt = Date.now();
  const specs = specsFor(MOVILIDAD_CATEGORIES);
  const stores = retailStores(MOVILIDAD_STORE_KEYS);

  const [harvest, usdUyu, previous, storedCount, storeSnapshot] = await Promise.all([
    harvestRetail({
      stores,
      specs,
      fast,
      maxMlScans: fast ? ML_MAX_SCANS.fast : ML_MAX_SCANS.daily,
      maxFbQueries: fast ? FB_MAX_QUERIES.fast : FB_MAX_QUERIES.daily,
      maxStoreQueries: fast ? STORE_MAX_QUERIES.fast : STORE_MAX_QUERIES.daily,
    }),
    fetchUsdUyuRate(),
    dryRun ? Promise.resolve(new Map<string, PreviousItem>()) : loadPreviousItems(),
    dryRun ? Promise.resolve(0) : countStoredItems(),
    // Only the hourly run reads it, and never in a dry run. A snapshot that cannot be read leaves the
    // hourly run exactly as it was before the snapshot existed; it never fails the run.
    !dryRun && fast
      ? loadStoreSnapshot().catch((error) => {
          console.error("[movilidad] no se pudo leer la foto de tiendas de la diaria", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  for (const run of harvest.runs) {
    console.log(`[movilidad] ${run.ok ? "ok " : "FAIL"} ${run.key.padEnd(14)} ${run.listings} avisos :: ${run.note}`);
  }

  if (!usdUyu) {
    throw new Error("[movilidad] no USD reference rate — refusing to publish prices that cannot be compared");
  }

  // Backstop for a store whose declared unit or currency lies. See classes/retail/unitGuard.ts.
  const guarded = applyUnitGuard(harvest.listings, usdUyu);
  for (const drop of guarded.dropped) {
    console.log(
      `[movilidad] unidad: ${drop.sellerKey} en ${drop.spec} mediana $${drop.storeMedianUyu} contra $${drop.mlMedianUyu} de ML — descartada`
    );
    const run = harvest.runs.find((candidate) => candidate.key === drop.sellerKey);
    if (run) run.note += `, descartada en ${drop.spec} por unidad`;
  }

  // Same merge as equipar's hourly run: fresh listings always win, a snapshot row older than 36 h is
  // ignored, and MercadoLibre/Marketplace never come from the snapshot.
  let listings = guarded.listings;
  if (fast && storeSnapshot) {
    const merged = mergeStoreSnapshot(listings, storeSnapshot.listings, Date.now());
    console.log(
      `[movilidad] foto de tiendas del ${storeSnapshot.generatedAt}: ${merged.fromSnapshot} avisos sumados, ${merged.stale} vencidos`
    );
    listings = merged.listings;
  } else if (fast && !dryRun) {
    console.log("[movilidad] sin foto de tiendas de la diaria: se publica sólo lo leído en esta corrida");
  }

  const items = buildEquiparCatalog({ listings, usdUyu, registry: MOVILIDAD_CATEGORIES });
  const priced = items.filter((item) => item.newBand || item.usedBand);

  // A run that priced almost nothing against a real stored catalogue is an outage, not a market —
  // publishing it would blank a page that was correct yesterday. A first run has nothing stored yet,
  // so it can never trip this: `storedCount` is 0 and the guard requires it to be positive.
  if (storedCount > 0 && priced.length < storedCount * THIN_RUN_FLOOR) {
    throw new Error(
      `[movilidad] sólo ${priced.length} ítems con precio contra ${storedCount} guardados — se conserva el catálogo anterior`
    );
  }

  console.log(
    `[movilidad] ${items.length} ítems (${priced.length} con precio) de ${MOVILIDAD_CATEGORIES.length} categorías, ${listings.length} avisos, ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );

  if (dryRun) {
    console.log("[movilidad] --dry-run: no se escribe nada");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const stored = withHistory(items, previous, today);

  const meta: MovilidadMeta = {
    generatedAt: new Date().toISOString(),
    usdUyu,
    listings: listings.length,
    items: items.length,
    runs: harvest.runs,
    uncovered: uncoveredCategories(items, MOVILIDAD_CATEGORIES),
  };

  await saveMovilidadCatalog(stored, meta);

  // Una fila por aviso para el directorio con filtros de las dos páginas. Mismo `registry` que el
  // catálogo, así que una fila guardada acá es una fila que la banda contó allá. Try/catch propio:
  // un fallo escribiendo el directorio nunca puede costar el catálogo recién guardado, y las dos
  // corridas (diaria y horaria) lo escriben — cada aviso con el `observedAt` que realmente tiene.
  try {
    const built = buildEquiparListings({ listings, usdUyu, registry: MOVILIDAD_CATEGORIES });
    const saved = await saveMovilidadListings(built.rows, today);
    console.log(
      `[movilidad] avisos: ${saved.written} escritos, ${saved.pruned} podados, ${built.rejected} rechazados por la banda, ${built.suspect} sospechosos`
    );
  } catch (error) {
    console.error("[movilidad] no se pudo guardar el directorio de avisos", error);
  }

  // Own try/catch: a failure recording history must never cost the catalogue that was just saved.
  // Recorded over `guarded.listings` (pre-merge, unit-guarded), not the possibly snapshot-merged
  // `listings` — a fast run's snapshot rows were not observed THIS run, and giving them today's date
  // would fake a price point that was never actually seen today.
  try {
    const pw = await recordPricewatch(guarded.listings, "movilidad");
    console.log(`[movilidad] pricewatch ${pw.written} ofertas, ${pw.pruned} vencidas borradas`);
  } catch (error) {
    console.error("[movilidad] no se pudo registrar el historial de precios", error);
  }

  // Only the daily run writes the store snapshot, and only after a successful publish (a thin run
  // already threw above). Own try/catch, like pricewatch: the catalogue is already saved, and a
  // failed snapshot write only costs the hourly run its store side until tomorrow.
  if (!fast) {
    const storeListings = guarded.listings.filter((listing) => listing.source === "store");
    try {
      const snapshot = await saveStoreSnapshot(storeListings, meta.generatedAt);
      console.log(
        `[movilidad] foto de tiendas: ${storeListings.length} avisos, ${(snapshot.bytes / 1024 / 1024).toFixed(2)} MB` +
          (snapshot.saved ? "" : " — supera el tope, se conserva la anterior")
      );
    } catch (error) {
      console.error("[movilidad] no se pudo guardar la foto de tiendas; la horaria usa la anterior", error);
    }
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  main()
    .then(async () => {
      // Never opened a connection during a dry run (every store.ts call above was skipped), so never
      // try to close one either — appConnection() would create one just to close it.
      if (!dryRun && appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[movilidad] fallo", error);
      if (!dryRun && appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
