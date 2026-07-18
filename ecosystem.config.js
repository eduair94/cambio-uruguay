module.exports = {
  apps: [
    {
      name: "currency-sync",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync.js",
      cron_restart: "*/5 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    // {
    //   name: "currency-bcu-sync",
    //   autorestart: false,
    //   exec_mode: "fork",
    //   script: "dist/get_bcu_details.js",
    //   cron_restart: "0 0 * * *",
    //   log_date_format: "YYYY-MM-DD HH:mm Z",
    // },
    {
      // Customs problem hub for /problemas-con-la-aduana-uruguay: Reddit corpus + AI labels every
      // run, legal facts re-checked against the norm (the AI can flag a change, never publish one).
      // Mondays 09:30 UTC ≈ 06:30 America/Montevideo — after the courier sync, so the two jobs do
      // not compete for the same Reddit rate limit.
      name: "currency-aduana",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_aduana.js",
      // Mondays 09:30 UTC (≈ 06:30 America/Montevideo). The courier sync harvests Reddit DAILY at
      // 08:15, and reddit.ts's throttle is per-process — two pm2 apps do not share a rate-limit
      // queue. 75 minutes of clearance is best-effort spacing, not a guarantee: if they do overlap,
      // both eat 429s, the harvest catch keeps the stored corpus, and nothing is blanked.
      cron_restart: "30 9 * * 1",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Daily boost of the aduana sync, but ONLY inside the Oct-decree window (2026-09-01..2026-11-01):
      // sync_aduana_daily.ts gates on the date and no-ops outside it, so this needs no turning off
      // after November. 09:40 UTC — 10 min after the weekly Monday run, and the sync is idempotent, so
      // the one in-window Monday where both fire changes nothing. Must be in OTHER_APPS in
      // scripts/deploy-backend.sh or it never starts on the VPS.
      name: "currency-aduana-daily",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_aduana_daily.js",
      cron_restart: "40 9 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Bank/fintech news briefing for /mejores-bancos-uruguay (3 languages).
      // Daily 10:37 UTC ≈ 07:37 America/Montevideo. Minute 37 is deliberately NOT a multiple of 5
      // (currency-sync runs */5) and sits after nitro's reddit:sentiment (10:10) so the two never
      // contend. This is the heaviest Gemini job in the fleet (~36 grounded calls per run).
      name: "currency-banks-news",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_banks_news.js",
      cron_restart: "37 10 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Uruguay's key national figures (salario mínimo, BPC, boleto STM, inflación) via grounded
      // search. Daily 09:52 UTC ≈ 06:52 America/Montevideo. Minute 52: not a multiple of 5.
      // The DRIFT WATCHDOG is not here — it stayed in the app (nitro task figures:drift), because
      // it needs the app's Telegram config and its own dedupe state, and it spends no Gemini call.
      name: "currency-figures",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_figures.js",
      cron_restart: "52 9 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Cost-of-living live figures (salario mínimo, boleto STM, alquileres típicos) for
      // /herramientas/costo-de-vida. Only the validated figures are stored — the arithmetic that
      // turns them into a full cost model stays in the app (COST_MODEL). Daily 09:43 UTC ≈ 06:43
      // America/Montevideo. Minute 43: not a multiple of 5.
      name: "currency-costs",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_costs.js",
      cron_restart: "43 9 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Quarterly AI reading of the most-consulted money topics for the app's /mapa-de-temas.
      // Reads the topic ranking from the NUXT APP's database (classes/appdb.ts, `reddittopics`) and
      // writes its own analysis to the backend DB (`temas_analysis_data`). The cron fires DAILY at
      // 11:17 UTC ≈ 08:17 America/Montevideo, but sync_temas_analysis.ts self-gates to 90 days on
      // the stored `asOf`, so it only spends a Gemini call once a quarter. Minute 17: not a multiple
      // of 5 (clear of currency-sync), and after nitro's reddit:sentiment (10:10) so the topic
      // snapshot it reads is already refreshed for the day. Refuses to run without APP_MONGO_URI.
      name: "currency-temas-analysis",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_temas_analysis.js",
      cron_restart: "17 11 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // BCU usury caps (topes de usura) for /saldar-deudas-uruguay. Monthly on the 1st, 10:13 UTC
      // ≈ 07:13 America/Montevideo. Minute 13: not a multiple of 5.
      name: "currency-debt-relief",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_debt_relief.js",
      cron_restart: "13 10 1 * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Daily AI directional lean + external forecast comparison per live currency, for the
      // PricePredictionCard on /historico. Writes `pricepredictions` in the NUXT APP's database
      // (classes/appdb.ts, APP_MONGO_URI) — the SAME collection
      // app/server/api/predictions/[currency].get.ts already reads; that route is untouched. This
      // is a ledger (one doc per currency+date, unique) kept forever to score past forecasts — it
      // is never regenerated and never truncated. Refuses to run without APP_MONGO_URI set.
      // Daily 09:23 UTC ≈ 06:23 America/Montevideo. Minute 23: not a multiple of 5.
      name: "currency-predictions",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_predictions.js",
      cron_restart: "23 9 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Move explanations for /por-que-sube-el-dolar and the histórico chart markers.
      // 10:07 UTC ≈ 07:07 America/Montevideo — comfortably AFTER nitro's drivers:daily (09:15
      // UTC), which still ingests the driver snapshots and archives the news this job reads.
      // Minute 7: not a multiple of 5. Clear of currency-aduana (Mondays 09:30) so two Gemini
      // jobs never overlap.
      //
      // Writes `moveexplanations` in the NUXT APP's database (classes/appdb.ts) — an ARCHIVE
      // that also holds rows a human researched by hand via POST /api/analysis/backfill. Never
      // truncated.
      name: "currency-explain",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_explain.js",
      cron_restart: "7 10 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Lender TEA refresh (bancos/financieras/cooperativas/fintech) for /prestamos-uruguay.
      // Fallback chain: regex parser first (oca/pronto/cash), Gemini-grounded lookup for the rest
      // (host-gated to the lender's own resolved domain). Daily 08:47 UTC ≈ 05:47
      // America/Montevideo. Minute 47: not a multiple of 5. The old nitro `loans:scrape` ran 08:45,
      // which IS a multiple of 5 and therefore raced currency-sync every single day.
      name: "currency-loans",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_loans.js",
      cron_restart: "47 8 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Cluster mode, 2 instances: `pm2 reload` (scripts/deploy-backend.sh) then
      // rolls instances one at a time, so a deploy never takes the API down.
      // Safe because the API path writes nothing to disk — ProxyFileService is
      // only used by the aguerrebere/pando scrapers, which run in the separate
      // currency-sync process, and sync_cambio.ts's file writes live in that
      // same job, not the server. Mongo and Redis hold all shared state.
      name: "currency-server",
      autorestart: true,
      exec_mode: "cluster",
      instances: 2,
      script: "dist/index.js",
    },
    {
      name: "currency-sheet",
      autorestart: true,
      exec_mode: "fork",
      script: "dist/sync_sheet.js",
    },
    {
      // Open-source MCP server (Streamable-HTTP). Build first: `cd mcp && npm ci && npm run build`.
      name: "currency-mcp",
      autorestart: true,
      exec_mode: "fork",
      cwd: "./mcp",
      script: "dist/index.js",
      env: {
        MCP_TRANSPORT: "http",
        MCP_HTTP_PORT: "8788",
        API_BASE_URL: "https://api.cambio-uruguay.com",
      },
    },
    // Social bots. Build first: `cd mcp && npm ci && npm run build && cd ../bots && npm ci && npm run build`.
    // All read env from bots/.env (see bots/.env.example); each process is a no-op without its creds.
    {
      // Telegram interactive bot (long-poll). Single instance only.
      name: "currency-bot-telegram",
      autorestart: true,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/telegram.js",
    },
    {
      // Discord interactive bot (gateway). Register slash commands once: `npm run register:discord`.
      name: "currency-bot-discord",
      autorestart: true,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/discord.js",
    },
    {
      // Daily report — 09:00 America/Montevideo (12:00 UTC).
      name: "currency-daily",
      autorestart: false,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/daily_report.js",
      cron_restart: "0 12 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Intraday big-move alerts — every 15 min, ~08:00–18:00 America/Montevideo.
      name: "currency-alerts",
      autorestart: false,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/alert_check.js",
      cron_restart: "*/15 11-21 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
