// Precios de combustibles de ANCAP (pm2 `currency-combustibles`, 07:11 y 13:11 UTC). Lee la tabla
// histórica pública, la valida y la guarda. No usa Gemini. Nunca borra lo guardado en un fallo.
import dotenv from "dotenv";
dotenv.config();

import { refreshFuelPrices } from "./classes/combustibles/refresh";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[combustibles] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }
  try {
    const summary = await refreshFuelPrices();
    console.log(`[combustibles] ${summary.rows} vigencias, última ${summary.latestFrom}, ${summary.inserted} nuevas`);
  } catch (e) {
    console.error("[combustibles] refresh failed, keeping the previous rows", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[combustibles] sync failed", e);
  process.exit(1);
});
