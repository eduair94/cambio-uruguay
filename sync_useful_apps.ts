// Weekly store snapshot (pm2 app `currency-useful-apps`) for /apps-utiles-uruguay. Reads the public
// Google Play and App Store listing of every app in classes/usefulapps/catalog.ts — icon, rating,
// number of ratings, last version and whether the listing still exists in Uruguay — and writes ONE
// document (`usefulappssnapshots`) into the NUXT APP's database, which /api/useful-apps/stores
// serves to the page.
//
// Only the two listing pages each store's robots.txt allows (classes/usefulapps/stores.ts).
// Never blanks the stored snapshot: if the first 10 apps get no answer the stores are down (or we
// are blocked) and nothing is written; a run where more than half the requests failed, or that got
// answers for less than half of the previous run, is refused too. A failed read keeps the previous
// value WITH ITS OLD DATE, and the page stops trusting it after 60 days.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { buildUsefulAppsSnapshot, usefulAppsRunIsThin } from "./classes/usefulapps/refresh";
import { loadUsefulApps, saveUsefulApps } from "./classes/usefulapps/store";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[useful-apps] APP_MONGO_URI is not set — refusing to run. The snapshot lives in the Nuxt " +
        "app's database (copy the value from app/.env's MONGO_URI); writing it to the backend " +
        "database would leave /apps-utiles-uruguay without icons forever with no error anywhere."
    );
    process.exit(1);
  }

  try {
    const previous = await loadUsefulApps();
    const snapshot = await buildUsefulAppsSnapshot({ previous });
    const { apps, fresh, missing, failed } = snapshot.counts;
    console.log(
      `[useful-apps] ${apps} apps · ${fresh} fichas leídas · ${missing} ausentes (404) · ${failed} fallidas`
    );
    for (const [id, signals] of Object.entries(snapshot.apps)) {
      for (const store of ["android", "ios"] as const) {
        if (signals[store]?.status === "missing") {
          const name = store === "android" ? "Google Play" : "el App Store";
          console.warn(`[useful-apps] ${id}: ya no está en ${name} de Uruguay`);
        }
      }
    }
    for (const change of snapshot.developerChanges) {
      console.warn(
        `[useful-apps] ${change.id} (${change.store}): el desarrollador era «${change.expected}» ` +
          `y ahora es «${change.found}» — revisar el catálogo`
      );
    }

    const refusal = usefulAppsRunIsThin(snapshot, previous);
    if (refusal) {
      console.error(`[useful-apps] ${refusal}; no se pisa el snapshot anterior.`);
      process.exit(1);
    }

    await saveUsefulApps(snapshot);
    console.log(`[useful-apps] guardado ${snapshot.capturedAt.toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error("[useful-apps] falló:", err);
    process.exit(1);
  }
}

void main();
