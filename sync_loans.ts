// Daily lender-TEA refresh (pm2 app `currency-loans`, 08:47 UTC ≈ 05:47 America/Montevideo).
//
// Fallback chain: cheap regex parser first (oca/pronto/cash), then Gemini for everyone else. Both
// legs degrade to ok:false rather than throwing; applyLoanScrapeResults only overwrites a lender's
// TEA on a fresh successful result, so a bad run just means yesterday's rate keeps serving.
import dotenv from "dotenv";
dotenv.config();

import { refreshAllLenderRates } from "./classes/loans/refresh";
import { applyLoanScrapeResults } from "./classes/loans/store";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  // classes/loans/store.ts reads/writes through the default mongoose connection
  // (MongooseServer.getInstance), which nothing else in this process ever opens — without this,
  // every Mongo call below buffers and times out after 10s, silently.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[loans] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  try {
    const results = await refreshAllLenderRates();
    const updated = await applyLoanScrapeResults(results);
    console.log(`[loans] updated ${updated}/${results.length} lenders`);
  } catch (e) {
    console.error("[loans] sync failed, previous rates untouched", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[loans] sync failed", e);
  process.exit(1);
});
