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
      // Financing live figures (TPM, inflación, plazo fijo/fondo en pesos, tope de usura) for the
      // app's /conviene-comprar-en-cuotas. Weekly Mondays 10:20 UTC ≈ 07:20 America/Montevideo —
      // these are policy rates and bank boards, not prices, so a weekly cadence is enough. Minute
      // 20 is not a multiple of 5 (clear of currency-sync). Must be in OTHER_APPS in
      // scripts/deploy-backend.sh or it never starts on the VPS.
      name: "currency-financing",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_financing.js",
      cron_restart: "20 10 * * 1",
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
      // Weekly r/CharruaDevs desktop-chair evidence refresh. Harvests Reddit with the existing
      // OAuth client, asks backend Gemini for post/comment/reply labels plus sourced pros/cons,
      // computes tiers deterministically, and writes the public snapshot to the NUXT APP's MongoDB.
      // Sundays 12:31 UTC ≈ 09:31 America/Montevideo; low cadence respects both provider quotas.
      name: "currency-chair-tiers",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_chair_tiers.js",
      env: { GEMINI_MIN_INTERVAL_MS: "10000" },
      cron_restart: "31 12 * * 0",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Daily desk-chair market harvest for the /sillas-escritorio-uruguay directory. Reads
      // MercadoLibre (scraper service on :9656), the Uruguayan storefronts through their own
      // sitemap/products.json contracts, and Facebook Marketplace (browser service on :9657);
      // merges every listing into one row per chair and writes the catalogue to the NUXT APP's
      // MongoDB. 11:41 UTC ≈ 08:41 America/Montevideo, after the stores publish overnight price
      // changes and clear of the other Gemini jobs. Minute 41: not a multiple of 5.
      name: "currency-chairs",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_chairs.js",
      env: { GEMINI_MIN_INTERVAL_MS: "10000" },
      cron_restart: "41 11 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly price refresh for the chair directory: MercadoLibre + the Shopify catalogues,
      // no LLM and no Reddit. Prices move during the day; reviews and photo identification do
      // not, and both cost provider quota per call. The Fenicio storefronts are deliberately
      // left to the daily run above — reading them means one request per product page, which is
      // fine once a day and abusive every hour. Minute 23: off the top of the hour.
      name: "currency-chairs-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_chairs.js",
      args: "--fast",
      cron_restart: "23 * * * *",
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
      // BCU "Tasas medias de interés" (Ley 18.212). DIARIO a propósito, aunque el BCU publique
      // una vez por mes: la tabla entra en vigencia el día 1 y el comunicado aparece en un día
      // impredecible del mes anterior, así que una corrida diaria (una sola llamada) la agarra
      // el día que sale. Una corrida que no encuentra nada nuevo no escribe nada.
      name: "currency-bcu-rates",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_bcu_rates.js",
      cron_restart: "27 9 * * *",
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
      // Bankos discount-map snapshot for /descuentos-con-tarjeta-uruguay. Pulls the whole country's
      // bank/card discounts (brands + GeoJSON locations + per-bank discount text) from the Bankos
      // backend and upserts ONE row (`bankossnapshots.key:"latest"`) in the NUXT APP's database
      // (classes/appdb.ts, APP_MONGO_URI) — the outage fallback app/server/api/bankos/discounts.get.ts
      // serves when the live Bankos API (Render free tier, cold-starts) is down. NOT a ledger: a
      // single upserted row, and buildSnapshot() throws on a thin pull so a bad day keeps the last
      // good snapshot. No Gemini, no default-DB access. Daily 08:33 UTC ≈ 05:33 America/Montevideo;
      // minute 33 (not a multiple of 5), before the 09:xx cluster.
      name: "currency-bankos",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_bankos.js",
      cron_restart: "33 8 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Public site-analytics snapshot for /estadisticas-del-sitio: GA4 Data API → the NUXT APP's
      // database (`siteanalyticssnapshots`). Aggregate only — totals, day buckets, top-N
      // breakdowns, page paths without their query string. Daily 10:51 UTC ≈ 07:51
      // America/Montevideo. Minute 51: not a multiple of 5, and clear of currency-explain (10:07)
      // and currency-banks-news (10:37) so the box is never running two API jobs at once.
      //
      // The window ends YESTERDAY (GA4's today is partial), so running later in the day buys
      // nothing; running before ~04:00 property time risks GA4 still processing the last day.
      // Needs GA4_PROPERTY_ID + a service account — see docs/analytics/GA4_DATA_API.md.
      name: "currency-site-analytics",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_site_analytics.js",
      cron_restart: "51 10 * * *",
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
      // Weekly lender-FACT refresh for the /mejores-prestamos-uruguay tier list. Different job
      // from currency-loans above and not a duplicate of it: that one chases a single number (the
      // TEA) daily, this one re-reads the things that decide the RANKING — whether the lender
      // still lends to people with Clearing marks, whether the insurance is compulsory, whether
      // you can cancel early — which live in terms-and-conditions pages that a grounded one-shot
      // lookup cannot reach. Uses the private Claude endpoint (WebSearch + WebFetch), verifies
      // every citation itself, and writes one snapshot row to the NUXT APP's MongoDB.
      //
      // Sundays 07:23 UTC ≈ 04:23 America/Montevideo: weekly because these facts move on the scale
      // of months and each run spends ~25 calls of a quota shared with a human; 07:23 to sit clear
      // of currency-content-gaps (05:35) and well before the Reddit jobs wake at 11:00. Minute 23:
      // not a multiple of 5, so it never races currency-sync. Refuses to run without APP_MONGO_URI
      // or without CLAUDE_AGENT_API_KEY.
      name: "currency-loan-tiers",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_loan_tiers.js",
      cron_restart: "23 7 * * 0",
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
    {
      // One evergreen guide to X — Mon/Wed/Fri 11:00 America/Montevideo (14:00
      // UTC), two hours after the daily report so the two never land together.
      //
      // Posts NOTHING until `CONTENT_PROMO_ENABLED=1` is set in bots/.env: the
      // Twitter credentials are already on the box for the daily report, so
      // without that second flag this app would start posting to a real audience
      // the moment pm2 picked it up. Until then it logs the tweet it would send.
      name: "currency-content-promo",
      autorestart: false,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/content_promo.js",
      cron_restart: "0 14 * * 1,3,5",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // RAG index of the public site: crawl the sitemap, chunk the readable text, embed what
      // changed. Writes `ragchunks` to the APP database (the Mongo on this box), so it needs
      // APP_MONGO_URI. 04:20 UTC ≈ 01:20 America/Montevideo — the quietest hour, and it reads our
      // own Nitro server at concurrency 4 for about ten minutes.
      name: "currency-rag-index",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_rag_index.js",
      cron_restart: "20 4 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // The Reddit answering bot. Every 12 minutes, 11:00–23:59 UTC (08:00–20:59 America/
      // Montevideo) — the hours when the subs are awake and a comment gets read.
      //
      // Answers AT MOST ONE thread per run and is capped again per day / per sub / per page in
      // classes/redditbot/limits.ts. Posts NOTHING until `REDDIT_BOT_ENABLED=1` AND
      // `REDDIT_BOT_DRY_RUN=0` are both set alongside the bot's own Reddit credentials: same
      // two-gate reasoning as currency-content-promo, because deploying the file must not be what
      // starts talking to strangers.
      name: "currency-reddit-bot",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_reddit_bot.js",
      cron_restart: "*/12 11-23 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Reads back the score of every comment posted in the last 72 h, and pauses the bot for 48 h
      // if three of them were removed or downvoted inside a day. This is the half that makes
      // auto-posting safe: without it, a miscalibrated threshold keeps producing six comments a day
      // until a human notices.
      name: "currency-reddit-bot-watch",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_reddit_bot_watch.js",
      cron_restart: "9 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Comentarios comunes, sin un solo enlace, para que la cuenta deje de ser una cuenta de ayer.
      //
      // Varios subs uruguayos borran por AutoModerator lo que escribe una cuenta sin karma: los dos
      // primeros comentarios del bot volvieron [removed] en r/uruguay y en r/Burises el mismo día
      // que uno en r/test se veía perfecto. Mientras eso siga así, currency-reddit-bot publica para
      // nadie. Este pase escribe como máximo uno por corrida, en hilos que NO son nuestro tema, y
      // SE APAGA SOLO al llegar a REDDIT_SOCIAL_KARMA_TARGET — comentar de más pasado ese punto es
      // riesgo sin beneficio. Hereda los dos interruptores de currency-reddit-bot.
      //
      // Cada 45 minutos entre 12:00 y 23:59 UTC, desfasado de los :00 y :12 del bot de respuestas
      // para que las dos apps no golpeen la API de Reddit en el mismo minuto.
      name: "currency-reddit-social",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_reddit_social.js",
      cron_restart: "5,50 12-23 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Una pregunta por día en r/AskUruguayan. No enlaza nada.
      //
      // Investiga ANTES de escribir: lee nuevos + calientes + top del mes + top del año del sub,
      // busca en la web de qué se habla en Uruguay esta semana, y recién ahí pide tres candidatas.
      // Cada una se mide contra los títulos que ya existen (classes/redditbot/ask/novelty.ts) —
      // pedirle originalidad a un modelo sin mostrarle lo publicado devuelve la pregunta obvia, que
      // es obvia porque el sub ya la contestó tres veces.
      //
      // Es la ÚNICA llamada a Opus del fleet, y se justifica: una por día contra las 200 diarias
      // que el endpoint comparte con el uso interactivo de una persona.
      //
      // Interruptores PROPIOS (REDDIT_ASK_ENABLED=1 + REDDIT_ASK_DRY_RUN=0), no los del bot de
      // comentarios: publicar un hilo se ve mucho más que comentar en uno ajeno, y encender una
      // cosa no puede encender la otra.
      //
      // Cada media hora entre las 12 y las 23 UTC (9 a 20 de Montevideo), y no una vez por día,
      // porque la corrida hace DOS cosas: publica —como mucho una vez, con 20 h de separación— y
      // barre. El barrido retira el post que pasó una hora sin un solo comentario ni un solo voto,
      // porque un perfil lleno de preguntas con cero respuestas es, para cualquiera que lo abra,
      // exactamente lo que parece. Y como retirar libera el lugar, el reemplazo sale en esa misma
      // corrida. El tope de REDDIT_ASK_MAX_PER_DAY cuenta las retiradas: sin eso, un día en que
      // nada engancha serían doce publicadas y borradas, que se lee mucho peor que una ignorada.
      // Una corrida sin nada que hacer no gasta nada — el freno está antes de la investigación.
      name: "currency-reddit-ask",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_reddit_ask.js",
      cron_restart: "*/30 12-23 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Clusters the questions the bot could not answer and writes a researched DRAFT (never a
      // page) to docs/reddit-gaps/ when four or more threads ask the same thing. 05:35 UTC.
      name: "currency-content-gaps",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_content_gaps.js",
      cron_restart: "35 5 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // What Uruguay is searching and talking about right now: Google Trends' UY daily RSS +
      // Google News' UY economy feed + the hot listings of the Uruguayan subs, classified
      // money / maybe / no, into the APP database (`trendssnapshots`) for /tendencias-uruguay.
      // Needs APP_MONGO_URI and refuses to run without it.
      //
      // Every 3 hours at minute 8: Google's daily list turns over during the day and the Reddit
      // hot listing moves faster than that, but nothing here changes minute to minute. Minute 8
      // keeps it off the */5 of currency-sync.
      name: "currency-trends",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_trends.js",
      cron_restart: "8 */3 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Videos de economía (/videos-de-economia-uruguay). Reads the public YouTube Atom feed of
      // every channel in classes/videos/channels.ts — no API key, no quota — so it is cheap enough
      // to run four times a day. Offset from the other :00 jobs so the box is not doing everything
      // at once. Needs APP_MONGO_URI: the snapshot lives in the Nuxt app's database.
      name: "currency-videos",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_videos.js",
      cron_restart: "26 */6 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
