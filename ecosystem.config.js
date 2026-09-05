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
      // Daily rental sweep for /alquileres-uruguay. Reads MercadoLibre (scraper service on :9656),
      // InfoCasas (its own server-rendered payload) and Facebook Marketplace (browser service on
      // :9657), merges the adverts into one row per PROPERTY and writes them to the NUXT APP's
      // MongoDB. 04:52 UTC ≈ 01:52 America/Montevideo on purpose: the full InfoCasas walk is ~900
      // page requests against one host, and it belongs in their quietest hour, not in ours.
      // Minute 52: not a multiple of 5.
      name: "currency-rentals",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-rentals.sh",
      interpreter: "bash",
      cron_restart: "52 4 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly top-up: only what the portals themselves sort as newest (InfoCasas `order=3`,
      // MercadoLibre `since=today`). A flat published at 9am is on the site by 10, at a fraction of
      // the requests. It NEVER prunes — it sees a slice of the market, and "not in this slice" is
      // not evidence that a flat is gone. Minute 47: clear of the other hourly jobs (6, 9, 23).
      name: "currency-rentals-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-rentals.sh",
      interpreter: "bash",
      args: "--fast",
      cron_restart: "47 * * * *",
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
      // Search Console pull: the query side of the traffic loop. GA4 says what visitors did once
      // they arrived; ONLY this says what they typed to get here, which page Google offered, and at
      // what position — the three numbers every content decision needs.
      //
      // Writes the APP database: `searchconsoledays` (one compact document per day, the ARCHIVE —
      // Search Console deletes everything past 16 months, so this collection is the only long
      // memory that will exist) and `searchconsolesnapshots` (the computed dashboard read by the
      // private /estadisticas-de-busqueda).
      //
      // 11:20 UTC ≈ 08:20 Montevideo. After currency-site-analytics (10:51) so the two Google jobs
      // never overlap, and well clear of the 10:37 banks-news Gemini run. The exact hour barely
      // matters: Search Console finalises a day ~3 days late, so every run reads settled data and
      // re-fetches the last week to absorb Google's own corrections.
      //
      // Needs APP_MONGO_URI and a service account with read access to the property
      // (docs/analytics/SEARCH_CONSOLE_API.md). Refuses to overwrite a good snapshot with a thin one.
      name: "currency-gsc",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_gsc.js",
      cron_restart: "20 11 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // La cola de qué escribir. Search Console es ciego a la demanda que el sitio NO captura
      // (sólo lista consultas donde ya aparece); esto cosecha el autocompletado uruguayo, descarta
      // lo que no es de las temáticas del sitio, mide contra el índice RAG propio si ya está
      // cubierto, mira el SERP de los mejores candidatos y ordena una cola revisable.
      //
      // NO PUBLICA NADA. La cola la lee una persona en /estadisticas-de-busqueda y decide.
      //
      // Semanal, domingos 06:40 UTC: el autocompletado se mueve en semanas, no en horas, y correrlo
      // a diario sólo gastaría cuota del servidor de SERP para reescribir la misma lista. Domingo
      // temprano porque no compite con ningún otro job (el más cercano es rag-index 04:20) y la
      // cobertura la mide contra el índice que ese job dejó fresco esa madrugada.
      //
      // Necesita APP_MONGO_URI. El SERP sale por `google_search_server` (:5112) en la misma máquina;
      // si no está, los candidatos quedan "dudoso" en vez de romper la corrida.
      name: "currency-search-demand",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_search_demand.js",
      cron_restart: "40 6 * * 0",
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
      // POR HORA, al minuto 6. Era cada doce minutos, con una ventana de ocho horas y un comentario
      // por corrida; ahora la ventana es de una semana y la corrida contesta hasta tres hilos
      // durmiendo entre uno y otro, así que una corrida puede durar media hora y dispararla cinco
      // veces en ese rato no agregaría nada. El minuto 6 la deja lejos del :00 de todo el mundo y
      // del :09 de su propio watcher.
      //
      // Las horas de silencio NO viven acá sino en `REDDIT_BOT_QUIET_HOURS_UTC` (03–10 UTC por
      // defecto, o sea 00–07 de Montevideo): el cron las apagaría igual, pero un rango de horas en
      // la línea del cron es invisible desde el código y ya pasó una vez que alguien mirara los
      // límites del bot sin encontrar por qué no publicaba de mañana.
      cron_restart: "6 * * * *",
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
    // LAS DOS APPS QUE ABRÍAN HILOS SE FUERON DE ACÁ (2026-08-19).
    //
    // `currency-reddit-social` comentaba sin enlace para juntar karma, y `currency-reddit-ask`
    // publicaba una pregunta por día en r/AskUruguayan. Las dos estaban apagadas desde que ese sub
    // baneó a la cuenta, y las dos dejaron de tener sentido el día que la cuenta pasó a ser una con
    // 1.165 de karma y nueve meses de antigüedad: el karma ya no hay que fabricarlo, y abrir hilos
    // es justo lo que hizo que un moderador mirara el historial y baneara. La cuenta SOLO COMENTA, y
    // eso no es una decisión del cron —que se cambia agregando otro cron— sino de `post.ts`, que se
    // niega a llamar a /api/submit sin REDDIT_BOT_ALLOW_POSTS=1.
    //
    // El código de los dos pases sigue en classes/redditbot/{ask,social}/ y sus entrypoints existen:
    // borrarlo sería perder la investigación de novedad y el medidor de karma, que costaron y que
    // sirven si algún día vuelve a hacer falta. Lo que no existe más es el cron que los dispara.
    //
    // En el VPS hay que sacarlas a mano una vez: `pm2 delete currency-reddit-social currency-reddit-ask`.
    // El deploy no borra apps, sólo arranca las que están en OTHER_APPS.
    {
      // La foto pública de lo que el bot contestó, para /estadisticas-reddit. Agrega el ledger y
      // escribe UN documento en la Mongo de la APP; no habla con Reddit ni gasta cuota de modelos.
      //
      // 39 minutos después del vigilante (que corre al :09 de cada hora): él es quien actualiza los
      // votos y el estado de cada comentario, así que contar antes de que corra es contar con los
      // números de ayer. Cada tres horas y no una vez por día porque la página muestra "cuántas
      // llevamos" y un contador que se mueve una vez al día se ve roto.
      name: "currency-reddit-stats",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_reddit_stats.js",
      cron_restart: "48 */3 * * *",
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
    {
      // Regional board for /cotizaciones-de-la-region and `GET /regional`: thirteen public
      // sources across Argentina, Brasil, Paraguay, Chile and Bolivia (four of them central
      // banks), joined with this site's own Uruguayan board.
      // Every 10 minutes because the job also writes the CHANGE LEDGER, and a ledger only ever sees
      // what it is looking at: its resolution IS this interval. The Argentine blue and the Brazilian
      // spot move through the whole trading day, so ten minutes is the difference between "the blue
      // moved twice today" and "the blue moved eleven times, and here is when".
      // One run is ~25 HTTP requests spread over fifteen hosts, each throttled per host inside
      // classes/regional/net.ts. Overlapping with currency-sync (*/5) costs nothing: different
      // collections, different upstreams.
      name: "currency-regional",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_regional.js",
      cron_restart: "*/10 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Same entrypoint with --backfill: also pulls the daily series the publishers hand out
      // themselves (the seven Argentine dollars since 2011, the Brazilian PTAX, Chile's
      // observed dollar year by year) and upserts them by (key, day). Idempotent, so a
      // re-run costs time and nothing else.
      // 05:09 UTC ≈ 02:09 America/Montevideo: after the rental sweep (04:52) and before the
      // content-gap job (05:35), and nowhere near the *:00/*:20/*:40 live refresh.
      name: "currency-regional-history",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_regional.js",
      args: "--backfill",
      cron_restart: "9 5 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
