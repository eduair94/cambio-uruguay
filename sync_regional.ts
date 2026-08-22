// The regional exchange-rate board for /cotizaciones-de-la-region and `GET /regional`.
//
// Reads thirteen public sources across Argentina, Brasil, Paraguay, Chile and
// Bolivia — four central banks among them — joins them with this site's own
// Uruguayan board, and stores one snapshot plus one daily point per market.
//
// Two modes:
//   * default — the live refresh. Every twenty minutes: fetch, validate, publish
//     the snapshot, append today's daily row for every market.
//   * `--backfill` — the daily history pass. Also pulls the series the
//     publishers hand out themselves (the seven Argentine dollars since 2011,
//     the Brazilian PTAX, Chile's observed dollar year by year) and upserts them.
//     Idempotent by (key, day), so re-running it costs time and nothing else.
//
// Properties this job must keep:
//   * a source that fails degrades the run, never fails it — the snapshot names
//     who did not answer;
//   * it refuses to publish a collapsed board over a healthy one;
//   * nothing is averaged across countries: every published figure keeps the
//     market and the publisher it came from.
import dotenv from "dotenv";
dotenv.config();

import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer, withTimeout } from "./classes/database";
import { backfillHistory, snapshotHistoryPoints } from "./classes/regional/history";
import { refreshRegional } from "./classes/regional/refresh";
import type { LocalRateRow } from "./classes/regional/sources/uy_local";
import {
  countRegionalHistory,
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

  const localRows = await loadLocalRows();
  const { snapshot, routes, runs } = await refreshRegional(localRows);

  for (const run of runs) {
    console.log(`[regional] ${run.ok ? "ok  " : "FAIL"} ${run.id.padEnd(18)} ${String(run.ms).padStart(6)}ms :: ${run.note}`);
  }
  if (snapshot.rejected.length) {
    for (const rejection of snapshot.rejected) {
      console.log(`[regional] descartada ${rejection.id} (${rejection.source}): ${rejection.reason}`);
    }
  }

  const saved = await saveRegionalSnapshot(snapshot);
  console.log(`[regional] snapshot: ${saved.reason}`);

  const dailyPoints = saved.saved ? snapshotHistoryPoints(snapshot) : [];
  let written = await saveRegionalHistory(dailyPoints);

  if (backfill) {
    const { points, notes } = await backfillHistory();
    for (const note of notes) console.log(`[regional] backfill ${note}`);
    written += await saveRegionalHistory(points);
  }

  const total = await countRegionalHistory();
  const best = routes
    .filter((route) => route.best)
    .map((route) => `${route.currency}: conviene ${route.best === "local" ? "comprar acá" : "llevar dólares"}`)
    .join(", ");

  console.log(
    `[regional] listo en ${Math.round((Date.now() - startedAt) / 1000)}s :: ` +
      `${snapshot.quotes.length} cotizaciones, ${snapshot.rejected.length} descartadas, ` +
      `${written} filas de serie escritas, ${total} en total`
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
