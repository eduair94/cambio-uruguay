import fs from "fs";
import { Cambio } from "./cambio";
import { origins } from "./origins";
import { publishPendingRateChanges } from "./rate_changes";

interface SyncOriginResult {
  origin: string;
  status: "success" | "error";
  duration: number;
  error?: string;
}

// Delay between processing each origin (ms) to reduce CPU spikes
const ORIGIN_DELAY_MS = 500;

// This job is a pm2 app on a `*/5 * * * *` cron RESTART, so the loop below runs
// under a hard 5-minute guillotine: whatever has not finished by then is killed
// mid-iteration, and the bookkeeping at the bottom (last_sync.txt) never runs.
// A healthy full pass over the 47 origins takes ~135s, so both bounds have wide
// headroom — they only ever bite when a scraper stalls. Without them a single
// hung origin starves every origin queued behind it AND makes /health report the
// whole API down, because /health infers liveness from last_sync.txt's mtime.
const DEFAULT_ORIGIN_TIMEOUT_MS = 45_000;
const DEFAULT_SYNC_BUDGET_MS = 240_000;

const msFromEnv = (name: string, fallback: number) => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Settle with `work`, or reject once `ms` elapses. The loser keeps running: a
 * stalled scraper holds nothing we need to unwind, and sync.ts exits the process
 * as soon as the loop returns.
 */
const withTimeout = <T>(work: Promise<T>, ms: number, label: string) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    const settle =
      (fn: (value: any) => void) =>
      (value: any) => {
        clearTimeout(timer);
        fn(value);
      };
    work.then(settle(resolve), settle(reject));
  });

const sync_cambios = async () => {
  const originTimeoutMs = msFromEnv("SYNC_ORIGIN_TIMEOUT_MS", DEFAULT_ORIGIN_TIMEOUT_MS);
  const budgetMs = msFromEnv("SYNC_BUDGET_MS", DEFAULT_SYNC_BUDGET_MS);
  const deadline = Date.now() + budgetMs;

  const syncResults: SyncOriginResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  const originKeys = Object.keys(origins);
  for (let i = 0; i < originKeys.length; i++) {
    const origin = originKeys[i];

    // Out of budget. Record the remainder as failures and fall through to the
    // write below: a run that quietly covers half the origins is indistinguishable
    // from a healthy one downstream, which is exactly how this failed silently.
    if (Date.now() >= deadline) {
      const unreached = originKeys.slice(i);
      for (const skipped of unreached) {
        syncResults.push({
          origin: skipped,
          status: "error",
          duration: 0,
          error: `Skipped: sync budget of ${budgetMs}ms exhausted`,
        });
        errorCount++;
      }
      console.error(`Sync budget of ${budgetMs}ms exhausted — skipped ${unreached.length} origins: ${unreached.join(", ")}`);
      break;
    }

    const startTime = Date.now();
    try {
      const cambio: Cambio = new (origins as any)[origin](origin);
      await withTimeout(Promise.resolve(cambio.sync_data()), originTimeoutMs, origin);
      const duration = Date.now() - startTime;
      syncResults.push({ origin, status: "success", duration });
      successCount++;
    } catch (e: any) {
      const duration = Date.now() - startTime;
      console.error(e);
      console.log(origin, e.message);
      syncResults.push({ origin, status: "error", duration, error: e.message || "Unknown error" });
      errorCount++;
    }

    // Throttle between origins to reduce CPU pressure
    if (i < originKeys.length - 1) {
      await delay(ORIGIN_DELAY_MS);
    }
  }

  const telegram = await publishPendingRateChanges().catch((error) => {
    console.error("Could not publish pending rate changes:", error);
    return { sent: 0, pending: 0 };
  });
  console.log(
    `Rate changes Telegram: ${telegram.sent} sent, ${telegram.pending} pending`
  );

  // Store the current date and time of the sync
  const date = new Date();
  const dateString = date.toISOString();
  const syncFilePath = "last_sync.txt";
  const syncResultsPath = "last_sync_results.json";

  try {
    fs.writeFileSync(syncFilePath, dateString, "utf8");
    console.log(`Sync completed at: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    console.log(`Sync timestamp saved to: ${syncFilePath}`);
    console.log(`Results: ${successCount} success, ${errorCount} errors out of ${syncResults.length} origins`);
  } catch (error) {
    console.error("Error saving sync timestamp:", error);
  }

  // Save detailed per-origin sync results
  try {
    const resultsData = {
      timestamp: dateString,
      summary: {
        total: syncResults.length,
        success: successCount,
        errors: errorCount,
      },
      origins: syncResults,
    };
    fs.writeFileSync(syncResultsPath, JSON.stringify(resultsData, null, 2), "utf8");
    console.log(`Sync results saved to: ${syncResultsPath}`);
  } catch (error) {
    console.error("Error saving sync results:", error);
  }

  console.log("Finish");
};

export { sync_cambios };

