/**
 * Cluster-instance guard for the `currency-server` pm2 app.
 *
 * `currency-server` runs in pm2 CLUSTER mode with 2 instances (see
 * ecosystem.config.js) so `scripts/deploy-backend.sh` can `pm2 reload` and
 * roll instances one at a time — the API never goes down during a deploy.
 * pm2 sets the `NODE_APP_INSTANCE` env var to a per-instance string ("0",
 * "1", …) on every process it starts in cluster mode. In fork mode, or when
 * the app is run directly (`ts-node index.ts`, `npm run dev`, a local test
 * run), pm2 never sets it, so it is `undefined`.
 *
 * ⚠️ USE THIS FOR ANY SCHEDULED OR ONCE-PER-BOOT WORK IN THE API PROCESS.
 * Wrap it in `isPrimaryInstance()`, or it runs once PER INSTANCE — today
 * that means twice, silently — double-writing Mongo, double-posting to
 * Telegram/Discord, or double-spending a rate-limited external API quota.
 * Nothing like that exists in index.ts today (its only recurring-looking
 * timers are request-scoped AbortController timeouts in index.ts and
 * classes/ai_service.ts, which fire once per request and are harmless
 * per-instance); this guard exists so the NEXT thing added here doesn't
 * quietly become a bug the day cluster mode is turned on.
 *
 * PREFER THE STANDING RULE OVER THIS GUARD: new scheduled work belongs in
 * its own pm2 cron app — see `sync_aduana.ts` + the `currency-aduana` entry
 * in ecosystem.config.js (`cron_restart` + `autorestart: false`, single
 * fork instance) — not inside the API process at all. Reach for
 * `isPrimaryInstance()` only when a job genuinely cannot be its own pm2 app
 * (e.g. it must run in-process against already-warm state).
 *
 * tests/no_scheduler_in_api.test.ts enforces the rule: it fails the build if
 * a recurring scheduler (`setInterval(`, `node-cron`, `cron.schedule(`,
 * `.schedule(`) shows up anywhere in index.ts or the classes/ modules it
 * imports, unless the call site is guarded by `isPrimaryInstance()`.
 */
export function isPrimaryInstance(): boolean {
  const instance = process.env.NODE_APP_INSTANCE;
  // Unset → fork mode / local dev / test run → always primary.
  // "0" → first cluster instance → primary. Any other value ("1", "2", …) → secondary.
  return instance === undefined || instance === "0";
}
