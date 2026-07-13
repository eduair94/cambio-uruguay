// Move explanations for /por-que-sube-el-dolar and the histórico chart markers (pm2 app
// `currency-explain`, 10:07 UTC ≈ 07:07 America/Montevideo — comfortably after nitro's
// drivers:daily at 09:15 UTC, which still ingests the driver snapshots and archives the news this
// job reads).
//
// Writes `moveexplanations` in the NUXT APP's database (classes/appdb.ts) — an ARCHIVE that also
// holds rows a human researched by hand via POST /api/analysis/backfill. Never truncated. Refuses
// to run without APP_MONGO_URI, for the same reason sync_predictions.ts does.
//
// The decoupling risk, stated plainly: today's drivers:daily runs the explanation in the SAME
// process, immediately after the ingest, so it always sees fresh drivers. Now there is a ~52
// minute gap and two processes. If drivers:daily fails or is slow, this job attributes the move
// using yesterday's driver snapshot and the attribution is weaker (or empty) — it still records
// the move and the narrative. It is idempotent: re-running it later that day
// (`node dist/sync_explain.js`) repairs the row.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { recordTodayExplanation } from "./classes/explain/refresh";
import { DriverSnapshotModel } from "./classes/models/DriverSnapshot";

// Same list as the app's EXPLAINED_CURRENCIES (app/server/tasks/drivers/daily.ts) — comment there
// explains why the currency lists differ (news is USD-only, drivers/explanations are USD+EUR+ARS).
const EXPLAINED_CURRENCIES = ["USD", "EUR", "ARS"];

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[explain] APP_MONGO_URI is not set — refusing to run. Writing this collection to the " +
        "wrong database would fork the move-explanation archive silently. Set APP_MONGO_URI " +
        "(copy from app/.env's MONGO_URI) before this job may run."
    );
    process.exit(1);
  }

  try {
    const latest = await DriverSnapshotModel.findOne({}).sort({ date: -1 }).lean();
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const latestDate = (latest as unknown as { date?: string } | null)?.date;
    if (latestDate && latestDate < today) {
      console.warn(
        `[explain] newest DriverSnapshot (${latestDate}) is older than today (${today}) — ` +
          "drivers:daily may not have run yet; attribution for today will be weak or empty."
      );
    }
  } catch (e) {
    console.warn("[explain] could not check DriverSnapshot freshness (non-fatal)", e);
  }

  let ok = 0;
  for (const currency of EXPLAINED_CURRENCIES) {
    try {
      const { recorded, date } = await recordTodayExplanation(currency);
      console.log(`[explain] ${currency}: recorded=${recorded} date=${date}`);
      if (recorded) ok++;
    } catch (e) {
      console.error(`[explain] ${currency} failed`, e);
    }
  }
  console.log(`[explain] done: ${ok}/${EXPLAINED_CURRENCIES.length} currencies recorded`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[explain] sync failed", e);
  process.exit(1);
});
