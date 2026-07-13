// BCU usury caps (pm2 app `currency-debt-relief`, monthly on the 1st, 10:13 UTC ≈ 07:13
// America/Montevideo). Never blanks the stored caps on a failure — a failed refresh just means
// the previous good caps (or the verified baseline) keep serving for up to a month.
import dotenv from "dotenv";
dotenv.config();

import { geminiConfigured } from "./classes/gemini";
import { refreshLiveDebtRelief } from "./classes/debt/refresh";
import { saveDebtRelief } from "./classes/debt/store";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  // classes/debt/store.ts reads/writes through the default mongoose connection
  // (MongooseServer.getInstance), which nothing else in this process ever opens — without this,
  // every Mongo call below buffers and times out after 10s, silently.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[debt-relief] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  if (!geminiConfigured()) {
    console.warn("[debt-relief] no GEMINI_API_KEY — nothing to do, keeping the stored caps");
    process.exit(0);
  }
  try {
    const live = await refreshLiveDebtRelief();
    if (!live.updated.length) {
      console.warn("[debt-relief] nothing usable found, keeping the previous caps");
      process.exit(0);
    }
    await saveDebtRelief(live);
    console.log(`[debt-relief] updated: ${live.updated.join(", ")}`);
  } catch (e) {
    console.error("[debt-relief] refresh failed, keeping the previous caps", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[debt-relief] sync failed", e);
  process.exit(1);
});
