/**
 * /health infers liveness from `last_sync.txt`'s timestamp. That is enough to
 * catch a sync that never finishes, but not one that finishes having reached
 * only a handful of origins — sync_cambio.ts writes the timestamp either way, on
 * purpose, so the run's per-origin results are the only thing left that can tell
 * the two apart.
 */
export interface SyncRunSummary {
  total: number;
  success: number;
  errors: number;
}

/**
 * Bounds sync_cambio.ts enforces on its origin loop. They live here, away from
 * the loop's own imports, so a scraper can check its own worst case against the
 * slice it is allowed (see tests/prex_request_bounds.test.ts) without dragging
 * all 52 scraper modules into the test.
 *
 * A healthy full pass is ~135s over 47 origins, and the job is a pm2 app on a
 * `cron_restart` every 5 minutes — both numbers sit well inside that window and
 * only bite when something stalls.
 */
export const DEFAULT_ORIGIN_TIMEOUT_MS = 45_000;
export const DEFAULT_SYNC_BUDGET_MS = 240_000;

/**
 * Share of failed origins above which a fresh run is still not a healthy one.
 * A couple of casas erroring is the normal steady state (sites 403, go down for
 * maintenance, change markup); a quarter of them failing at once is not.
 */
export const PARTIAL_SYNC_ERROR_SHARE = 0.25;

/** True when the last run technically completed but covered too little to trust. */
export function isPartialSyncRun(summary?: SyncRunSummary | null): boolean {
  if (!summary) return false;
  const { total, errors } = summary;
  if (!Number.isFinite(total) || !Number.isFinite(errors) || total <= 0) return false;
  return errors / total > PARTIAL_SYNC_ERROR_SHARE;
}
