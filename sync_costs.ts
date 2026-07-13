// Cost-of-living live figures (pm2 app `currency-costs`, daily 09:43 UTC ≈ 06:43
// America/Montevideo). Never blanks the stored figures on a failure — a failed refresh just
// means the previous good figures (or the app's own baseline) keep serving.
import dotenv from "dotenv";
dotenv.config();

import { geminiConfigured } from "./classes/gemini";
import { refreshLiveCosts } from "./classes/costs/refresh";
import { saveCosts } from "./classes/costs/store";

async function main(): Promise<void> {
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
