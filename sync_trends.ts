// Hourly trends snapshot (pm2 app `currency-trends`). Reads Google Trends' Uruguay RSS, Google
// News' Uruguayan economy feed and the hot listings of the Uruguayan subs, classifies each row as
// money / maybe / not, and writes ONE aggregate document (`trendssnapshots`) into the NUXT APP's
// database, which /api/trends serves to /tendencias-uruguay.
//
// Why a backend cron and not a Nitro task: the app runs as a pm2 cluster of 2, so every
// scheduledTask there fires twice (see docs and classes/cluster.ts). This job is single-instance by
// construction.
//
// Never blanks the stored snapshot: if every source fails, the previous document keeps serving and
// the process exits non-zero so pm2 logs show it. `--allow-empty` exists only to seed a brand-new
// database on purpose.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { buildTrendsSnapshot, snapshotIsEmpty } from "./classes/trends/refresh";
import { saveTrends } from "./classes/trends/store";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[trends] APP_MONGO_URI is not set — refusing to run. The snapshot lives in the Nuxt app's " +
        "database (copy the value from app/.env's MONGO_URI); writing it to the backend database " +
        "would leave /tendencias-uruguay empty forever with no error anywhere."
    );
    process.exit(1);
  }

  const allowEmpty = process.argv.includes("--allow-empty");

  try {
    const snapshot = await buildTrendsSnapshot();
    const { searches, reddit, news } = snapshot.counts;
    console.log(
      `[trends] búsquedas ${searches} (${snapshot.counts.moneySearches} de plata) · reddit ${reddit} ` +
        `(${snapshot.counts.moneyReddit} de plata) · noticias ${news}`
    );

    for (const [name, status] of Object.entries(snapshot.sources)) {
      if (!status.ok) console.warn(`[trends] fuente caída: ${name} — ${status.error}`);
    }

    if (snapshotIsEmpty(snapshot) && !allowEmpty) {
      console.error(
        "[trends] las tres fuentes vinieron vacías; no se pisa el snapshot anterior. " +
          "Usá --allow-empty sólo para sembrar una base nueva."
      );
      process.exit(1);
    }

    await saveTrends(snapshot);
    console.log(`[trends] guardado ${snapshot.capturedAt.toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error("[trends] falló:", err);
    process.exit(1);
  }
}

void main();
