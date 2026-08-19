// BCU "Tasas medias de interés" (pm2 app `currency-bcu-rates`).
//
// Runs DAILY even though the BCU publishes monthly: the table takes effect on the 1st, the
// comunicado lands on an unpredictable day of the preceding month, and one PDF fetch a day is
// nothing next to the cost of serving a superseded cap on a page that tells people what they
// will be charged. A run that finds nothing new writes only the `asOf` stamp.
//
// Source is the official BCU PDF, parsed deterministically — no LLM, no API key.
// Never blanks the stored table on a failure — a failed refresh just means the previous good
// table (or the verified baseline in classes/bcurates/table.ts) keeps serving.
import dotenv from "dotenv";
dotenv.config();

import { refreshBcuRates } from "./classes/bcurates/refresh";
import { loadBcuRates, saveBcuRates } from "./classes/bcurates/store";
import { isStale } from "./classes/bcurates/table";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  // classes/bcurates/store.ts reads/writes through the default mongoose connection
  // (MongooseServer.getInstance), which nothing else in this process ever opens — without this,
  // every Mongo call below buffers and times out after 10s, silently.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[bcu-rates] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  try {
    const previous = await loadBcuRates();
    const now = new Date().toISOString();
    const { table, updated, problems } = await refreshBcuRates(previous, now);

    if (updated) {
      await saveBcuRates(table);
      console.log(`[bcu-rates] updated to ${table.periodo} (vigente ${table.vigenteDesde})`);
    } else if (problems.length) {
      console.warn(`[bcu-rates] keeping the previous table: ${problems.join("; ")}`);
    } else {
      // Confirmed unchanged — persist the refreshed `asOf` so the page can show when it last
      // verified the table, not just when it last changed.
      await saveBcuRates(table);
      console.log(`[bcu-rates] confirmed unchanged (${table.periodo})`);
    }

    if (isStale(table, new Date())) {
      console.warn(
        `[bcu-rates] WARNING: the served table took effect on ${table.vigenteDesde}, which is more than a month ago — the BCU publishes monthly, so this is probably superseded.`
      );
    }
  } catch (e) {
    console.error("[bcu-rates] refresh failed, keeping the previous table", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[bcu-rates] sync failed", e);
  process.exit(1);
});
