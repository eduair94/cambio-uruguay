// Uruguay's key national figures (pm2 app `currency-figures`, daily 09:52 UTC ≈ 06:52
// America/Montevideo). Never blanks the stored figures on a failure — a failed refresh just
// means the previous good figures (or the verified baseline) keep serving.
//
// The DRIFT WATCHDOG is NOT here — it stayed in the app (nitro task figures:drift), because it
// needs the app's Telegram config and its own dedupe state, and it spends no Gemini call.
import dotenv from "dotenv";
dotenv.config();

import { geminiConfigured } from "./classes/gemini";
import { refreshUyFigures } from "./classes/figures/refresh";
import { saveFigures } from "./classes/figures/store";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  // classes/figures/store.ts reads/writes through the default mongoose connection
  // (MongooseServer.getInstance), which nothing else in this process ever opens — without this,
  // every Mongo call below buffers and times out after 10s, silently.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[figures] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  if (!geminiConfigured()) {
    console.warn("[figures] no GEMINI_API_KEY — nothing to do, keeping the stored figures");
    process.exit(0);
  }
  try {
    const figures = await refreshUyFigures();
    if (!figures.updated.length) {
      console.warn("[figures] nothing usable found, keeping the previous figures");
      process.exit(0);
    }
    await saveFigures(figures);
    console.log(`[figures] updated: ${figures.updated.join(", ")}`);
  } catch (e) {
    console.error("[figures] refresh failed, keeping the previous figures", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[figures] sync failed", e);
  process.exit(1);
});
