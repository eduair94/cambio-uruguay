// Daily AI directional lean + external forecast comparison per live currency (pm2 app
// `currency-predictions`, 09:23 UTC ≈ 06:23 America/Montevideo).
//
// Writes `pricepredictions` in the NUXT APP's database (classes/appdb.ts) — the same rows
// app/server/api/predictions/[currency].get.ts already reads. This is a LEDGER: one doc per
// (currency, date), unique, kept forever so past forecasts can be scored. It is never regenerated
// and never truncated. Refuses to run without APP_MONGO_URI — a job that "just writes
// PricePrediction" without that check would write it to the WRONG database, forking the ledger
// silently, and nobody would notice for weeks.
//
// Each currency is its own try/catch — a single bad currency can't block the rest, exactly like
// the app's predictions:daily task did.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { listActiveCurrencies, recordTodayPrediction } from "./classes/predictions/refresh";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[predictions] APP_MONGO_URI is not set — refusing to run. Writing this collection to the " +
        "wrong database would fork the prediction ledger silently. Set APP_MONGO_URI (copy from " +
        "app/.env's MONGO_URI) before this job may run."
    );
    process.exit(1);
  }

  const currencies = await listActiveCurrencies();
  console.log(`[predictions] ${currencies.length} active currencies: ${currencies.join(", ")}`);

  let ok = 0;
  for (const currency of currencies) {
    try {
      const { recorded, date } = await recordTodayPrediction(currency);
      console.log(`[predictions] ${currency}: recorded=${recorded} date=${date}`);
      if (recorded) ok++;
    } catch (e) {
      console.error(`[predictions] ${currency} failed`, e);
    }
  }
  console.log(`[predictions] done: ${ok}/${currencies.length} currencies recorded`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[predictions] sync failed", e);
  process.exit(1);
});
