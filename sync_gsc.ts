// Daily Search Console pull (pm2 app `currency-gsc`).
//
// WHY THIS JOB EXISTS. Until it shipped, the only record of what people search for before they land
// here was a folder of CSVs somebody exported by hand on 2026-07-06. Two months later those files
// were describing a site that had tripled its impressions. Every content decision taken on them was
// taken blind, and — worse — Search Console deletes everything older than 16 months, so the history
// that makes "which casa page has been losing ground since March" answerable was quietly expiring.
//
// It writes two things into the APP database:
//   * `searchconsoledays`         the archive. One compact document per day, upserted, re-fetching
//                                 the last week each run because Google keeps revising recent days.
//   * `searchconsolesnapshots`    the computed dashboard, including the ranked opportunity list.
//
// Flags:
//   --backfill[=N]   also archive N days back (default 120), skipping days already stored. Search
//                    Console holds ~16 months, so `--backfill=480` run a few times fills the moat.
//   --no-inspect     skip the URL Inspection sample (saves 20 calls of the 2.000/day quota).
//   --dry-run        fetch and compute, print, write nothing.
//   --allow-thin     store a snapshot that looks like an upstream failure. Only for seeding.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { gscConfigProblem, listSites, siteUrl } from "./classes/gsc/client";
import { refreshSearchConsole } from "./classes/gsc/refresh";
import { countDays, loadSnapshot, saveDays, saveSnapshot, snapshotIsThin, storedDays } from "./classes/gsc/store";
import { notifyAdmin } from "./classes/notify";

function flagValue(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return 0;
  const [, raw] = hit.split("=");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!appDbConfigured() && !dryRun) {
    console.error(
      "[gsc] APP_MONGO_URI is not set — refusing to run. The snapshot and the day archive live in " +
        "the Nuxt app's database (copy the value from app/.env's MONGO_URI); writing them to the " +
        "backend database would leave the dashboard empty forever with no error anywhere."
    );
    process.exit(1);
  }

  const problem = gscConfigProblem();
  if (problem) {
    console.error(`[gsc] ${problem}. See docs/analytics/SEARCH_CONSOLE_API.md`);
    process.exit(1);
  }

  // Preflight: the difference between "the property is not shared with the service account" and
  // "the property identifier is wrong" is invisible in the 403 the query would return, and both are
  // one-line fixes that cost an hour each to diagnose from the wrong error.
  try {
    const sites = await listSites();
    const match = sites.find((s) => s.siteUrl === siteUrl());
    if (!match) {
      console.error(
        `[gsc] the service account can read [${sites.map((s) => s.siteUrl).join(", ") || "nothing"}] ` +
          `but GSC_SITE_URL is "${siteUrl()}". A domain property is written "sc-domain:example.com"; ` +
          `a URL-prefix property is written "https://example.com/".`
      );
      process.exit(1);
    }
    console.log(`[gsc] ${match.siteUrl} (${match.permissionLevel})`);
  } catch (e: any) {
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || String(e);
    console.error(`[gsc] could not list properties: ${detail}`);
    process.exit(1);
  }

  const wantsBackfill = process.argv.some((a) => a === "--backfill" || a.startsWith("--backfill="));
  const backfillDays = wantsBackfill ? flagValue("backfill", 120) || 120 : 0;
  const inspectSize = process.argv.includes("--no-inspect") ? 0 : 20;

  let alreadyStored = new Set<string>();
  if (backfillDays && !dryRun) {
    const from = new Date(Date.now() - (backfillDays + 3) * 86400000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    alreadyStored = await storedDays(from, to);
    console.log(`[gsc] backfill de ${backfillDays} días; ${alreadyStored.size} ya archivados, se saltean`);
  }

  try {
    const { snapshot, days } = await refreshSearchConsole({ backfillDays, alreadyStored, inspectSize });

    if (dryRun) {
      console.log(
        `[gsc] DRY RUN ${snapshot.window.startDate}..${snapshot.window.endDate}: ` +
          `${snapshot.totals.clicks} clics, ${snapshot.totals.impressions} impresiones, ` +
          `CTR ${(snapshot.totals.ctr * 100).toFixed(3)} %, posición ${snapshot.totals.position.toFixed(2)}`
      );
      console.log(`[gsc] ${snapshot.opportunities.length} oportunidades, ${days.length} días listos para archivar`);
      for (const o of snapshot.opportunities.slice(0, 15)) {
        console.log(`  [${o.kind}] ${o.subject} (+${o.potentialClicks}) — ${o.note}`);
      }
      for (const a of snapshot.alerts) console.log(`  ALERTA ${a.level}: ${a.message}`);
      process.exit(0);
    }

    const written = await saveDays(days);
    snapshot.archivedDays = await countDays();

    const previous = await loadSnapshot();
    if (snapshotIsThin(snapshot, previous) && !process.argv.includes("--allow-thin")) {
      console.warn(
        `[gsc] la corrida trajo ${snapshot.totals.impressions} impresiones contra ` +
          `${previous?.totals.impressions ?? 0} del snapshot guardado — se conserva el anterior. ` +
          `Casi siempre es una respuesta parcial de Google, no una caída real. Forzar con --allow-thin.`
      );
      process.exit(0);
    }

    await saveSnapshot(snapshot);
    console.log(
      `[gsc] ${snapshot.window.startDate}..${snapshot.window.endDate}: ${snapshot.totals.clicks} clics, ` +
        `${snapshot.totals.impressions} impresiones, CTR ${(snapshot.totals.ctr * 100).toFixed(3)} %, ` +
        `posición ${snapshot.totals.position.toFixed(2)} | ${snapshot.opportunities.length} oportunidades | ` +
        `${written} días escritos, ${snapshot.archivedDays} en el archivo | ` +
        `indexación ${snapshot.indexation.indexed}/${snapshot.indexation.checked}`
    );

    // Only alerts leave the process. The dashboard is pull; Telegram is for the things that mean
    // something broke, and a channel that also carries good news stops being read.
    const loud = snapshot.alerts.filter((a) => a.level !== "info");
    if (loud.length) {
      const body = loud.map((a) => `${a.level === "critical" ? "🔴" : "🟠"} ${a.message}`).join("\n");
      await notifyAdmin(`*Search Console* — ${snapshot.window.startDate}..${snapshot.window.endDate}\n${body}`);
    }
  } catch (e: any) {
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || String(e);
    console.error(`[gsc] refresh failed, keeping the previous snapshot: ${detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[gsc] sync failed", e);
  process.exit(1);
});
