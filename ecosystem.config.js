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
      // ANCAP fuel prices (historical HTML table, no LLM). Twice a day (07:11 and 13:11 UTC)
      // because the government can publish a new decree at an unpredictable hour.
      name: "currency-combustibles",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_combustibles.js",
      cron_restart: "11 7,13 * * *",
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
    },    {
      // Daily household market for /equipar-casa-uruguay: what it costs to fill an empty home.
      // Reads the SAME sixteen storefronts, MercadoLibre and Marketplace the chair directory reads,
      // through the shared classes/retail harvester — one sweep per store, classified against all
      // thirty-eight categories at once.
      //
      // 12:47 UTC keeps a clear hour after currency-chairs (11:41): both hit the same hosts and the
      // same two bridges on :9656/:9657, and overlapping them would double the load on somebody
      // else's small shop for no gain.
      //
      // RETAIL_STORE_MAX_PDP is raised here and only here. The default of 260 product pages per
      // Fenicio store is right for one category and would truncate thirty-eight in sitemap order,
      // which silently biases every band toward whatever the store happens to list first.
      //
      // The WooCommerce/VTEX search cap is NOT set here: it is passed in code from sync_equipar.ts
      // (classes/equipar/budget.ts), because deploy-backend.sh only recreates a registered app when
      // its cron changes and a new env var would never reach the VPS.
      name: "currency-equipar",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_equipar.js",
      env: { RETAIL_STORE_MAX_PDP: "900" },
      cron_restart: "47 12 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly price-only refresh of the household catalogue, on half the search budget. Skips the
      // Fenicio storefronts for the same reason the chair job does: reading them is one request per
      // product page, which is fine once a day and abusive every hour. Minute 53 keeps it away from
      // currency-chairs-hourly at :23.
      name: "currency-equipar-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_equipar.js",
      args: "--fast",
      cron_restart: "53 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Daily phone-market harvest: MercadoLibre + the celulares storefronts in
      // classes/phones/spec.ts's PHONE_STORE_KEYS, turned into one row per phone MODEL
      // (brand+family+storage) with a price band per condition.
      //
      // 14:29 UTC = 11:29 Montevideo, clear of currency-chairs (11:41) and currency-equipar (12:47) —
      // both hit the same hosts and the same two bridges on :9656/:9657, and overlapping them would
      // double the load on somebody else's small shop for no gain.
      name: "currency-phones",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_phones.js",
      cron_restart: "29 14 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly price-only refresh: MercadoLibre only, 8 searches instead of the daily's 40, no
      // storefront sweep (a Fenicio store is read one product page at a time — fine once a day,
      // abusive every hour, same reasoning as currency-chairs-hourly/currency-equipar-hourly).
      //
      // Minute 37 is clear of every other hourly consumer of the shared ML bridge (:9656):
      // currency-chairs-hourly :23, currency-autos-hourly :29, currency-rentals-hourly :47,
      // currency-equipar-hourly :53. currency-autos is now on main too, and its DAILY run (07:43 UTC)
      // is not a single scan but a ~2h SEQUENTIAL brand->model sweep of the same bridge — a burst
      // against it makes the bridge fall back to its residential proxy for 10 MINUTES, for every job
      // that reads it, not just this one (measured 2026-09-17, docs/app/AUTOS.md). That is also why
      // this hourly run searches 8 terms and not 16: half the daily budget, same shared-bridge
      // caution as the daily's own 40-vs-full-catalogue restraint.
      name: "currency-phones-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_phones.js",
      args: "--fast",
      cron_restart: "37 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Daily monopatín/bicicleta-eléctrica market. Reuses the equipar catalog machinery end to end
      // via an injected registry (classes/movilidad/registry.ts, two categories) instead of forking
      // it — same shared retail harvester, same unit guard, same bands, same store-snapshot mechanics
      // for the hourly refresh below. Own collections (movilidaditems/movilidadmeta/
      // movilidadstoresnapshots), own budgets sized for two categories and five storefronts rather
      // than equipar's thirty-eight/sixteen (see sync_movilidad.ts).
      //
      // The other consumers of the shared MercadoLibre bridge (104.234.204.107:9656), so a future
      // schedule change here does not collide with them: sillas hourly :23, autos hourly :29 and its
      // ~2h sequential daily sweep at 07:43, celulares hourly :37 and daily 14:29, alquileres hourly
      // :47, equipar hourly :53 and daily 12:47. An hourly job is a minute of EVERY hour, so a daily
      // run at HH:47 would meet the rentals top-up once a day, every day: the daily sweep goes at
      // 15:33 (a minute no hourly job uses) and the hourly one at :07.
      name: "currency-movilidad",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_movilidad.js",
      cron_restart: "33 15 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly price-only refresh, on the smaller budget (sync_movilidad.ts). The daily run's store
      // snapshot fills in whatever this run's smaller search budget did not re-scan, same mechanism
      // as currency-equipar-hourly.
      name: "currency-movilidad-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_movilidad.js",
      args: "--fast",
      cron_restart: "7 * * * *",
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
      // Separate asking-price comparison: sales are sampled daily; rental data is read only.
      // Keep this source sweep away from the full rentals job and the hourly :47 top-up.
      name: "currency-property-opportunities",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-property-opportunities.sh",
      interpreter: "bash",
      cron_restart: "21 6 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      name: "currency-property-opportunities-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-property-opportunities.sh",
      interpreter: "bash",
      args: "--analyze-only",
      cron_restart: "17 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Used-car directory + opportunities (/autos-usados-uruguay): brand -> model sweep of
      // Mercado Libre through the :9656 bridge, after the rentals window that also uses it.
      name: "currency-autos",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-autos.sh",
      interpreter: "bash",
      cron_restart: "43 7 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly: only adverts published today, then re-analyse and republish. Never retires by
      // absence (a 404/410 on the advert's own page still retires it, in any mode).
      name: "currency-autos-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-autos.sh",
      interpreter: "bash",
      args: "--fast",
      cron_restart: "29 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // The advert's own page for the cars the directory already holds, by usefulness and on a budget:
      // the page is the only source of the VERSION (which decides what compares with what) and of the
      // DESCRIPTION (where the seller writes "tiene deuda de 52.000" or "chocado de atrás"). Minute 11
      // keeps it away from currency-autos-hourly (:29) and the other users of the ML bridge.
      name: "currency-autos-detail",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-autos-detail.sh",
      interpreter: "bash",
      cron_restart: "11 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Mercado Libre's price guide for the model-years the directory holds: the version catalogue
      // and a second opinion where our own sample is thin (it is ML's median, not a valuation).
      name: "currency-autos-guide",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_autos_guide.js",
      cron_restart: "13 5 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Weekly Uruguay OSM extract; services remain a local indexed snapshot between runs.
      name: "currency-property-services",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_property_services.js",
      cron_restart: "33 7 * * 0",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Luz por barrio: una foto del mapa UTEi (ECSE) cada 10 minutos al libro poweroutagedays de
      // la APP DB. UTE no guarda la historia; si nadie guarda las fotos, la frecuencia de cortes no
      // existe. Minuto 3: UTE refresca en los múltiplos de 10. Ver docs/app/PROPERTY_ZONE_SERVICES.md.
      name: "currency-power-outages",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_power_outages.js",
      cron_restart: "3-59/10 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Precomputed rental cohorts and official neighborhood context, independent of the API.
      name: "currency-property-zones",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_property_zones.js",
      node_args: "--max-old-space-size=512",
      cron_restart: "53 6 * * *",
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
      // Fichas de /tiendas-online-uruguay: por cada tienda del registro curado
      // (classes/stores/registry.ts) lee su home, la antigüedad del dominio (crt.sh, Wayback),
      // Trustpilot (:3029), Google Maps (:2221, sólo si el sitio de la ficha ES el dominio), las
      // menciones en r/uruguay y r/montevideo (Arctic Shift) y la presencia en los catálogos propios
      // → APP DB `storeprofiles`. Una fuente que falla conserva su último valor con su fecha vieja.
      // Cada tienda se guarda apenas se lee y sólo si alguna fuente externa contestó (un backfill de
      // Reddit de horas no pierde lo hecho); si las primeras 10 tiendas no obtuvieron ninguna
      // respuesta, las fuentes están caídas: corta sin escribir y sale con 1. Reddit se lee por
      // ventanas con cursor por tienda y un presupuesto de llamadas por corrida
      // (STORES_REDDIT_MAX_CALLS, 900 por defecto): el backfill de 24 meses lleva varias semanas.
      //
      // Domingos 07:17 UTC = 04:17 en Montevideo. Semanal porque reseñas y antigüedad se mueven en
      // semanas, y porque Arctic Shift pide ir despacio: recorrer las menciones de todo el registro
      // lleva su rato. Vecinos reales: currency-loan-tiers (domingos 07:23),
      // currency-property-services (domingos 07:33) y currency-property-opportunities-hourly (minuto
      // :17 de cada hora); ninguno usa los mismos servicios externos. Arctic Shift también lo lee
      // currency-charruadevs, pero a las 12:14. Minuto 17: no es múltiplo de 5. Necesita APP_MONGO_URI.
      //
      // Fix round 1 (I1): shares scripts/run-store-profiles.sh with currency-store-reddit — the two
      // load and rewrite the SAME APP DB `storeprofiles` documents, and a --reddit-only run can take
      // up to ~4h on the full call budget (measured ~16.7s/call × 900), long enough to still be
      // running when this weekly run starts. The wrapper's shared flock (STORES_LOCK_FILE) keeps
      // them from ever running together: this job WAITS (up to STORES_FULL_LOCK_WAIT_SECONDS,
      // 7200s) instead of racing or canceling the nightly job.
      name: "currency-store-profiles",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-store-profiles.sh",
      interpreter: "bash",
      cron_restart: "17 7 * * 0",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Task 13: nightly `--reddit-only` — same wrapper/script as currency-store-profiles, but it
      // asks Reddit only; site/age/trustpilot/google and the catalogue keep exactly last week's
      // value. Measured on Task 12: a store's 24-month Arctic Shift backfill costs ~90 calls (~25
      // min), so the weekly job's 900-call budget would need ~8 weeks to finish backfilling all 76
      // stores. Nightly does NOT spend the full 900-call budget, though: its own wall-clock cap
      // (STORES_REDDIT_MAX_MINUTES, 150 min) cuts it off first, and at ~16.7s/call (measured) that
      // is only ~540 calls/night (150*60/16.7 ≈ 540) — so the 76-store backfill (~90 calls each,
      // ~6,840 calls total) takes ~13 nights instead (6840/540 ≈ 12.7), not ~8. The other signals
      // stay weekly on purpose: Google Places (fetchGoogle) charges per call, and re-reading a
      // domain's age or Trustpilot every night would answer nothing new.
      //
      // 03:41 UTC = 00:41 in Montevideo, free of every other cron in this file. autorestart:false and
      // exec_mode:"fork" for the same reason as every other cron app here: pm2 must not turn "runs
      // once a night" into "runs forever". A store is only saved when Reddit itself progressed this
      // run (a new mention or a moved cursor) — a night with nothing new for a store writes nothing.
      //
      // Fix round 1 (I1, and rulings 2-3): shares the lock above with currency-store-profiles as the
      // NON-blocking side (`flock -n`) — if the weekly full run holds it, this job prints and exits 0
      // instead of waiting or racing it. It also skips a store whose 24-month backfill already
      // finished (`needsRedditBackfill` — the weekly job keeps that store's signal fresh from there)
      // and caps its own wall clock at STORES_REDDIT_MAX_MINUTES (default 150), independent of the
      // call budget, so retries/backoff on an unusually slow night cannot run it into the Sunday
      // weekly job's start.
      name: "currency-store-reddit",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-store-profiles.sh",
      interpreter: "bash",
      args: "--reddit-only",
      cron_restart: "41 3 * * *",
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
      // Termómetro del mercado IT (/mercado-it-uruguay): r/CharruaDevs desde Arctic Shift, cada post
      // y cada comentario "de mercado" clasificado con Gemini (postura −2…+2, tema, IA, relato),
      // votos vivos vía la API de Reddit y un snapshot en la base del APP. Diario 12:14 UTC: minuto
      // 14, fuera de los */5 de currency-sync; ~100 textos nuevos por día. Necesita APP_MONGO_URI y
      // la clave de Gemini.
      name: "currency-charruadevs",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_charruadevs.js",
      cron_restart: "14 12 * * *",
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
    {
      // Los precios oficiales del SIPC (MEF / Area Defensa del Consumidor), y el historico que
      // el Estado NO guarda: su API devuelve solo el precio de hoy con su fecha y no tiene
      // endpoint de serie, asi que nadie publica la evolucion. 215 POST a compararArticulo con
      // bbox nacional, 341 s y 75.858 observaciones en la corrida completa medida el 2026-09-07.
      // Diario y no mas seguido a proposito: la `fecha` que declara el origen tiene
      // granularidad de dia, asi que correr cada hora no agregaria una sola fila al ledger.
      // 03:12 UTC = 00:12 America/Montevideo: hueco libre, antes de rag-index (04:20) y del
      // barrido de alquileres (04:52).
      name: "currency-precios",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_precios.js",
      cron_restart: "12 3 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Plan D — /ciberlunes-y-black-friday-uruguay: ¿el descuento es real? Reads `pricewatchoffers`
      // (written by equipar and sillas today; never written here), classifies each offer seen TODAY
      // against its OWN last ~60 days, and publishes the day's snapshot to the NUXT APP's database
      // (`priceeventsnapshots`). 15:13 UTC ≈ 12:13 America/Montevideo: after currency-equipar (12:47
      // UTC) and the celulares harvest (14:29 UTC), so every vertical's point for today is already
      // written before this reads it. Needs APP_MONGO_URI.
      name: "currency-price-events",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_price_events.js",
      cron_restart: "13 15 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly recompute, but ONLY inside a CyberLunes/Black Friday window: `--event-only` checks
      // `classes/priceevents/calendar.ts`'s `activeEvent()` and exits 0 immediately — no database
      // connection at all — every hour of the year nothing is happening, and runs the same snapshot
      // build as the daily job the handful of days something is.
      name: "currency-price-events-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_price_events.js",
      args: "--event-only",
      cron_restart: "19 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Seguimiento de precios: una serie diaria por cohorte de alquileres, viviendas en venta y autos
      // usados, más la variación de la misma oferta (docs/app/MARKET_SERIES.md). Sólo LEE los catálogos
      // públicos de la APP DB, así que corre después de todas las cosechas completas (alquileres 04:52,
      // oportunidades 06:21, autos 07:43) y no toca el puente de ML. Needs APP_MONGO_URI.
      name: "currency-market-series",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_market_series.js",
      cron_restart: "3 13 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
