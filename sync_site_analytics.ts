// Daily public site-analytics snapshot (pm2 app `currency-site-analytics`, 10:51 UTC ≈ 07:51
// America/Montevideo). Reads the GA4 Data API and writes ONE aggregate document
// (`siteanalyticssnapshots`) into the NUXT APP's database, which /api/site-analytics serves to
// /estadisticas-del-sitio.
//
// Why a backend cron and not a Nitro task: currency-server runs as a pm2 cluster of 2, and the app
// is the surface that must stay cheap. This job holds the only Google credentials in play and is
// the only process that talks to Google Analytics.
//
// Setup (one time, click by click): docs/analytics/GA4_DATA_API.md.
//
// Never blanks the stored snapshot: a failed run leaves yesterday's numbers serving. Only the
// `--allow-empty` flag lets an all-zero snapshot be written, and that exists purely so a brand-new
// property can be seeded on purpose.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { ga4ConfigProblem } from "./classes/site-analytics/ga4";
import { refreshSiteAnalytics, snapshotIsEmpty } from "./classes/site-analytics/refresh";
import { saveSiteAnalytics } from "./classes/site-analytics/store";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[site-analytics] APP_MONGO_URI is not set — refusing to run. The snapshot lives in the Nuxt " +
        "app's database (copy the value from app/.env's MONGO_URI); writing it to the backend " +
        "database would leave /estadisticas-del-sitio empty forever with no error anywhere."
    );
    process.exit(1);
  }

  const problem = ga4ConfigProblem();
  if (problem) {
    console.error(`[site-analytics] ${problem}. See docs/analytics/GA4_DATA_API.md`);
    process.exit(1);
  }

  try {
    const snapshot = await refreshSiteAnalytics();
    if (snapshotIsEmpty(snapshot) && !process.argv.includes("--allow-empty")) {
      console.warn(
        "[site-analytics] GA4 answered with zero traffic for the whole window — keeping the previous " +
          "snapshot. That is almost always a wrong GA4_PROPERTY_ID or a service account without " +
          "Viewer access, not a quiet month. Re-run with --allow-empty to store it anyway."
      );
      process.exit(0);
    }
    await saveSiteAnalytics(snapshot);
    console.log(
      `[site-analytics] ${snapshot.range.start}..${snapshot.range.end}: ` +
        `${snapshot.totals.activeUsers} users, ${snapshot.totals.sessions} sessions, ` +
        `${snapshot.totals.screenPageViews} views, ${snapshot.topPages.length} pages, ` +
        `${snapshot.daily.length} days of series`
    );
  } catch (e: any) {
    // Google answers 403 for "API not enabled" and for "service account has no access" alike, so
    // echo the body: it is the only thing that tells the two apart.
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || String(e);
    console.error(`[site-analytics] refresh failed, keeping the previous snapshot: ${detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[site-analytics] sync failed", e);
  process.exit(1);
});
