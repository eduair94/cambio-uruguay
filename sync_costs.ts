// Cost-of-living live figures (pm2 app `currency-costs`, daily 09:43 UTC ≈ 06:43
// America/Montevideo). Never blanks the stored figures on a failure — a failed refresh just
// means the previous good figures (or the app's own baseline) keep serving.
import dotenv from "dotenv";
dotenv.config();

import { geminiConfigured } from "./classes/gemini";
import { refreshLiveCosts } from "./classes/costs/refresh";
import { saveCosts } from "./classes/costs/store";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  // classes/costs/store.ts reads/writes through the default mongoose connection
  // (MongooseServer.getInstance), which nothing else in this process ever opens — without this,
  // every Mongo call below buffers and times out after 10s, silently.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[costs] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  if (!geminiConfigured()) {
    console.warn("[costs] no GEMINI_API_KEY — nothing to do, keeping the stored figures");
    process.exit(0);
  }
  try {
    const live = await refreshLiveCosts();
    if (!live.updated.length) {
      console.warn("[costs] nothing usable found, keeping the previous figures");
      process.exit(0);
    }
    await saveCosts(live);
    console.log(`[costs] updated: ${live.updated.join(", ")}`);
  } catch (e) {
    console.error("[costs] refresh failed, keeping the previous figures", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[costs] sync failed", e);
  process.exit(1);
});
