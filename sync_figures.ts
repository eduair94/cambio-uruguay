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

async function main(): Promise<void> {
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
