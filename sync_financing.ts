// Financing live figures for /conviene-comprar-en-cuotas (pm2 app `currency-financing`, weekly
// Mondays 10:20 UTC ≈ 07:20 America/Montevideo). These are policy rates and bank boards, not
// prices — they move on a scale of weeks, so a weekly cadence is enough. Never blanks the stored
// figures on a failure — a failed refresh just means the previous good figures (or the app's own
// baseline) keep serving.
import dotenv from "dotenv";
dotenv.config();

import { geminiConfigured } from "./classes/gemini";
import { refreshLiveFinancing } from "./classes/financing/refresh";
import { saveFinancing } from "./classes/financing/store";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  // classes/financing/store.ts reads/writes through the default mongoose connection
  // (MongooseServer.getInstance), which nothing else in this process ever opens — without this,
  // every Mongo call below buffers and times out after 10s, silently (connect_tripwire.test.ts).
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[financing] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  if (!geminiConfigured()) {
    console.warn("[financing] no GEMINI_API_KEY — nothing to do, keeping the stored figures");
    process.exit(0);
  }
  try {
    const live = await refreshLiveFinancing();
    if (!live.updated.length) {
      console.warn("[financing] nothing usable found, keeping the previous figures");
      process.exit(0);
    }
    await saveFinancing(live);
    console.log(`[financing] updated: ${live.updated.join(", ")}`);
  } catch (e) {
    console.error("[financing] refresh failed, keeping the previous figures", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[financing] sync failed", e);
  process.exit(1);
});
