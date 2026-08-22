// The regional exchange-rate board for /cotizaciones-de-la-region and `GET /regional`.
//
// Reads twenty-one public sources across Argentina, Brasil, Paraguay, Chile and
// Bolivia — five central banks among them — joins them with this site's own
// Uruguayan board, and writes three things:
//
//   * the snapshot (what every market is worth right now),
//   * one daily point per market (the day's close),
//   * and one row per PRICE CHANGE, however small.
//
// The third is the one that cannot be reconstructed later: the daily row is
// overwritten on every run, so by the end of the day everything that happened
// inside it is gone unless it was written down when it happened.
//
// Two modes:
//   * default — the live refresh. Every ten minutes: fetch, validate, publish
//     the snapshot, append today's daily row and every movement since the last
//     look.
//   * `--backfill` — the daily history pass. Also pulls the series the
//     publishers hand out themselves (the seven Argentine dollars since 2011,
//     the BCRA reference since 1996, the Brazilian PTAX since the Plano Real,
//     Chile's observed dollar since 1984) and walks the two archives that only
//     answer one day at a time: the Paraguayan central bank's, and our own
//     Uruguayan board since December 2022. Idempotent by (key, day), so
//     re-running it costs time and nothing else.
//
// Properties this job must keep:
//   * a source that fails degrades the run, never fails it — the snapshot names
//     who did not answer;
//   * it refuses to publish a collapsed board over a healthy one;
//   * nothing is averaged across countries: every published figure keeps the
//     market and the publisher it came from.
import dotenv from "dotenv";
dotenv.config();

import moment from "moment-timezone";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer, withTimeout } from "./classes/database";
import { detectRegionalChanges, summariseChanges } from "./classes/regional/changes";
import { backfillPyReferencial, backfillUyBoard } from "./classes/regional/deep_history";
import { backfillHistory, snapshotHistoryPoints } from "./classes/regional/history";
import { refreshRegional } from "./classes/regional/refresh";
import type { LocalRateRow } from "./classes/regional/sources/uy_local";
import {
  countRegionalChanges,
  countRegionalHistory,
  loadHistoryDays,
  loadRegionalStates,
  saveRegionalChanges,
  saveRegionalHistory,
  saveRegionalSnapshot,
} from "./classes/regional/store";

/** Today's Uruguayan board, or an empty list if it cannot be read. */
async function loadLocalRows(): Promise<LocalRateRow[]> {
  try {
    const rows = await cambio_info.get_data();
    return (rows as unknown as LocalRateRow[]) || [];
  } catch (error) {
    console.error("[regional] no se pudo leer el tablero uruguayo:", error);
    return [];
  }
}

async function main(): Promise<void> {
  // Required first: classes/regional/store.ts binds to the default mongoose
  // connection, which nothing opens on its own. Without this every write buffers
  // for ten seconds and the job exits reporting success (see
  // tests/sync/connect_tripwire.test.ts).
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15_000);
  } catch (error) {
    console.error("[regional] sin conexión a Mongo:", error);
    process.exit(1);
  }

  const backfill = process.argv.includes("--backfill");
  const startedAt = Date.now();
  const observedAt = new Date();

  const [localRows, previousStates] = await Promise.all([loadLocalRows(), loadRegionalStates()]);
  const { snapshot, routes, runs } = await refreshRegional(localRows);

  for (const run of runs) {
    console.log(`[regional] ${run.ok ? "ok  " : "FAIL"} ${run.id.padEnd(20)} ${String(run.ms).padStart(6)}ms :: ${run.note}`);
  }
  for (const rejection of snapshot.rejected) {
    console.log(`[regional] descartada ${rejection.id} (${rejection.source}): ${rejection.reason}`);
  }

  const saved = await saveRegionalSnapshot(snapshot);
  console.log(`[regional] snapshot: ${saved.reason}`);

  // El ledger: cada diferencia contra la última lectura, sin umbral mínimo.
  let movements = 0;
  if (saved.saved) {
    const changes = detectRegionalChanges(snapshot.quotes, previousStates, observedAt);
    movements = await saveRegionalChanges(changes);
    console.log(`[regional] movimientos: ${summariseChanges(changes)}`);
    for (const change of changes.slice(0, 8)) {
      console.log(
        `[regional]   ${change.key.padEnd(28)} ${change.previousAvg} -> ${change.avg} (${change.changePct > 0 ? "+" : ""}${change.changePct.toFixed(4)} %)`
      );
    }
  }

  const dailyPoints = saved.saved ? snapshotHistoryPoints(snapshot) : [];
  let written = await saveRegionalHistory(dailyPoints);

  if (backfill) {
    const { points, notes } = await backfillHistory();
    for (const note of notes) console.log(`[regional] backfill ${note}`);
    written += await saveRegionalHistory(points);

    // Los dos archivos que sólo contestan de a un día: se recorren con
    // presupuesto y saltando lo que ya está guardado.
    const [pyDays, uyDays] = await Promise.all([
      loadHistoryDays("PY:referencial:USDPYG"),
      loadHistoryDays("UY:casas:USDUYU"),
    ]);

    const py = await backfillPyReferencial(pyDays, moment.tz("America/Asuncion").format("YYYY-MM-DD"));
    console.log(`[regional] backfill PY referencial: ${py.note}`);
    written += await saveRegionalHistory(py.points);

    const uy = await backfillUyBoard(uyDays, moment.tz("America/Montevideo").format("YYYY-MM-DD"));
    console.log(`[regional] backfill UY tablero propio: ${uy.note}`);
    written += await saveRegionalHistory(uy.points);
  }

  const [total, ledger] = await Promise.all([countRegionalHistory(), countRegionalChanges()]);
  const best = routes
    .filter((route) => route.best)
    .map((route) => `${route.currency}: conviene ${route.best === "local" ? "comprar acá" : "llevar dólares"}`)
    .join(", ");

  console.log(
    `[regional] listo en ${Math.round((Date.now() - startedAt) / 1000)}s :: ` +
      `${snapshot.quotes.length} cotizaciones, ${snapshot.rejected.length} descartadas, ` +
      `${written} filas de serie escritas (${total} en total), ${movements} movimientos (${ledger} en el ledger)`
  );
  if (best) console.log(`[regional] rutas :: ${best}`);

  // A snapshot that could not be published is a failed run even though nothing
  // threw: pm2 must not report success while the board goes stale.
  process.exit(saved.saved ? 0 : 1);
}

main().catch((error) => {
  console.error("[regional] falló:", error);
  process.exit(1);
});
