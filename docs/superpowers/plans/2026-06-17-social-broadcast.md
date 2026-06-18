# Social Broadcast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Report the Uruguayan exchange market across Telegram (interactive + daily push), Discord (interactive + daily push), and Twitter/X (daily post), with daily summaries and intraday big-move alerts, plus a beautiful multilingual Open Graph share card — reusing the existing `mcp/` tool handlers, the public API, and `AIService`.

**Architecture:** A new standalone ESM package `bots/` (sibling of `mcp/`) holds report generation, formatting, publishers, the subscriber store, the two interactive bots, and the daily/alert cron entries. It reuses `mcp/`'s `CambioApi` + pure tool handlers (`getRates`, `bestHouse`, `convert`, `getEvolution`, `getNews`, `dailySummary`) via a `file:../mcp` dependency. The multilingual OG work lives in the Nuxt app (`app/`).

**Tech Stack:** TypeScript (ESM/NodeNext), `telegraf` (Telegram), `discord.js` (Discord), `twitter-api-v2` (X), `mongoose` (subscribers + alert state), `vitest` (tests). Scheduling via pm2 `cron_restart`. Reuses `cambio-uruguay-mcp` (api + tools) and the public API `/ai/insights`.

## Global Constraints

- Module system: `bots/` and `mcp/` are ESM (`"type":"module"`, `moduleResolution: NodeNext`, `.js` import extensions). The CommonJS backend root is NOT imported by `bots/`.
- Every channel is feature-gated by env: missing creds → that channel is silently skipped (never throws).
- Data source of truth: public API `https://api.cambio-uruguay.com` via `mcp`'s `httpCambioApi` (includes `POST /ai/insights`).
- Timezone for schedules: America/Montevideo (UTC-3) → pm2 crons expressed in server UTC.
- Languages: es (default), en, pt. Per-user for DMs/commands; `DEFAULT_BROADCAST_LANG` for channels + Twitter.
- Twitter text ≤280 chars. `DRY_RUN=1` logs instead of sending. `FORCE=1` bypasses daily dedup.
- Currency rate convention is already encoded in `mcp/tools.ts` (buy a currency = lowest `sell`; sell = highest `buy`). Do not reinvent it.

---

## Phase A — Expose mcp as a library

### Task A1: Add library exports to the mcp package

**Files:**
- Modify: `mcp/package.json`
- Create: `mcp/src/lib.ts`

**Interfaces:**
- Produces: package subpath imports `cambio-uruguay-mcp/api`, `cambio-uruguay-mcp/tools`, `cambio-uruguay-mcp/news`, and a root `cambio-uruguay-mcp` re-export.

- [ ] **Step 1:** Create `mcp/src/lib.ts` re-exporting the public surface:

```ts
// Library entry: re-exports the reusable, network-agnostic surface so other
// packages in the repo (e.g. bots/) consume the same domain logic the MCP
// server exposes. The CLI/server stay in index.ts/server.ts.
export * from "./api.js";
export * from "./tools.js";
export * from "./news.js";
```

- [ ] **Step 2:** Add `exports` + `main`/`types` to `mcp/package.json` (keep `bin`):

```json
  "main": "dist/lib.js",
  "types": "dist/lib.d.ts",
  "exports": {
    ".": { "types": "./dist/lib.d.ts", "import": "./dist/lib.js" },
    "./api": { "types": "./dist/api.d.ts", "import": "./dist/api.js" },
    "./tools": { "types": "./dist/tools.d.ts", "import": "./dist/tools.js" },
    "./news": { "types": "./dist/news.d.ts", "import": "./dist/news.js" }
  },
```

Ensure `tsconfig.json` emits declarations (`"declaration": true`) so `.d.ts` exist.

- [ ] **Step 3:** Build mcp: `cd mcp && npm install && npm run build` → expect `dist/lib.js`, `dist/tools.js`, `dist/api.js`, `dist/news.js` present.
- [ ] **Step 4:** Commit: `git add mcp/package.json mcp/src/lib.ts mcp/tsconfig.json && git commit -m "feat(mcp): expose api/tools/news as library exports"`

---

## Phase B — bots package scaffold

### Task B1: Scaffold `bots/`

**Files:**
- Create: `bots/package.json`, `bots/tsconfig.json`, `bots/.gitignore`, `bots/vitest.config.ts`, `bots/.env.example`

**Interfaces:**
- Produces: an installable ESM package depending on `cambio-uruguay-mcp` (file:../mcp), `telegraf`, `discord.js`, `twitter-api-v2`, `mongoose`, `dotenv`.

- [ ] **Step 1:** `bots/package.json`:

```json
{
  "name": "cambio-uruguay-bots",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev:telegram": "tsx src/entries/telegram.ts",
    "dev:discord": "tsx src/entries/discord.ts",
    "daily": "tsx src/entries/daily_report.ts",
    "alerts": "tsx src/entries/alert_check.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "cambio-uruguay-mcp": "file:../mcp",
    "telegraf": "^4.16.3",
    "discord.js": "^14.16.3",
    "twitter-api-v2": "^1.18.2",
    "mongoose": "^8.7.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 2:** `bots/tsconfig.json` (NodeNext ESM, strict, declaration off):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3:** `bots/.gitignore` (`node_modules`, `dist`, `.env`), `bots/vitest.config.ts` (defaults), and `bots/.env.example` listing every env var from the spec config table.
- [ ] **Step 4:** Install: `cd bots && npm install` → expect success and `node_modules/cambio-uruguay-mcp` symlink.
- [ ] **Step 5:** Commit: `git add bots/ && git commit -m "chore(bots): scaffold ESM package reusing mcp"`

### Task B2: `bots/src/config.ts` — env + feature gates

**Files:** Create `bots/src/config.ts`, `bots/test/config.test.ts`

**Interfaces:**
- Produces: `loadConfig(): BotConfig` with `telegram?`, `discord?`, `twitter?`, `mongoUri?`, `defaultLang`, `reportCurrencies: string[]`, `alert: { thresholdPct, cooldownMin, currencies }`, `dryRun`, `force`, `apiBaseUrl`.

- [ ] **Step 1 (test):** assert that with no telegram env, `loadConfig().telegram` is `undefined`; with token+channel set, it is populated; defaults: `defaultLang==='es'`, `alert.thresholdPct===1`, `alert.cooldownMin===120`, `reportCurrencies===['USD','EUR','ARS','BRL']`.
- [ ] **Step 2:** run test → fails (no module).
- [ ] **Step 3:** implement `loadConfig` reading `process.env`, splitting CSV envs, numeric parsing with defaults, each channel object present only when its required vars exist.
- [ ] **Step 4:** run test → passes.
- [ ] **Step 5:** commit.

---

## Phase C — Formatting (pure, TDD)

### Task C1: `bots/src/format/i18n.ts` — labels + number/currency format

**Files:** Create `bots/src/format/i18n.ts`, `bots/test/i18n.test.ts`

**Interfaces:**
- Produces: `type Lang = 'es'|'en'|'pt'`; `normalizeLang(x?: string): Lang`; `L(lang): LabelSet` (buy/sell/spread/bestBuy/bestSell/news/updated/... strings); `fmtUYU(n, lang)`, `fmtNum(n, lang)`, `fmtPct(n)`.

- [ ] **Step 1 (test):** `normalizeLang('en-US')==='en'`, `normalizeLang('xx')==='es'`; `fmtUYU(40.5,'es')` contains `40,50`; `fmtPct(1.234)==='+1,23%'` and negative shows `-`.
- [ ] Steps 2–5: fail → implement (`Intl.NumberFormat('es-UY'|'en-US'|'pt-BR')`, label maps) → pass → commit.

### Task C2: `bots/src/format/messages.ts` — channel formatters (pure)

**Files:** Create `bots/src/format/messages.ts`, `bots/test/messages.test.ts`

**Interfaces:**
- Consumes: `RatesResult`, `BestHouseResult`, `ConvertResult`, `NewsItem`, `DailySummaryResult` (from `cambio-uruguay-mcp/tools`); `DailyReportData`, `AlertData` (Task F1).
- Produces: `formatRates(r, lang, style)`, `formatBest(r, lang)`, `formatConvert(r, lang)`, `formatNews(items, lang)`, `formatDailyTelegram(data, ai, lang)`, `formatDailyDiscord(...)`, `formatDailyTwitter(data, lang)`, `formatAlert(alert, lang, style)`. `style: 'telegram'|'discord'`.

- [ ] **Step 1 (test):** `formatDailyTwitter` output `.length <= 280` for a 4-currency payload; `formatRates` includes the currency code, best buy house name, and a `%` change; `formatAlert` includes an up/down arrow and the percentage.
- [ ] Steps 2–5: fail → implement pure string builders (Markdown for Telegram, plain/embeds text for Discord, compact for Twitter with hard 280 truncation helper) → pass → commit.

---

## Phase D — Publishers (feature-gated)

### Task D1: `bots/src/publish/telegram.ts`

**Files:** Create `bots/src/publish/telegram.ts`, `bots/test/telegram_publish.test.ts`

**Interfaces:**
- Produces: `class TelegramPublisher { constructor(cfg); isConfigured(): boolean; postChannel(text, opts?): Promise<void>; dmMany(recipients: {chatId, text}[], opts?): Promise<{sent, deactivated}> }`. Uses Telegram Bot API HTTP (`https://api.telegram.org/bot<token>/sendMessage`, `sendPhoto`). DM batching: chunk + delay to respect ~30 msg/s; 403 → report chatId as deactivated.

- [ ] **Step 1 (test):** inject a fake `fetch`; `dmMany` over 3 recipients where one returns `{ok:false, error_code:403}` returns `{sent:2, deactivated:[thatChatId]}`. `DRY_RUN` makes `postChannel` not call fetch.
- [ ] Steps 2–5: fail → implement with injectable `fetch` (default global) → pass → commit.

### Task D2: `bots/src/publish/discord.ts`

**Files:** Create `bots/src/publish/discord.ts`, `bots/test/discord_publish.test.ts`

**Interfaces:**
- Produces: `class DiscordPublisher { isConfigured(); postChannel(text, opts?) }` posting to `DISCORD_WEBHOOK_URL` (JSON `{content}` or multipart with image). DRY_RUN aware.

- [ ] Steps 1–5 (TDD with injected fetch): webhook POST shape asserted; DRY_RUN no-op → commit.

### Task D3: `bots/src/publish/twitter.ts`

**Files:** Create `bots/src/publish/twitter.ts`

**Interfaces:**
- Produces: `class TwitterPublisher { isConfigured(); tweet(text, imageBuffer?): Promise<void> }` using `twitter-api-v2` (`v1.uploadMedia` then `v2.tweet`). DRY_RUN logs.

- [ ] **Step 1:** implement thin wrapper; guard when not configured. (No unit test for the SDK call; covered by DRY_RUN manual run.) Keep all formatting in Task C2 so this file stays trivial.
- [ ] **Step 2:** commit.

### Task D4: `bots/src/publish/index.ts` — orchestrator

**Files:** Create `bots/src/publish/index.ts`

**Interfaces:**
- Consumes: D1–D3, F1 formatters.
- Produces: `publishDaily(data, aiByLang, image, cfg, subs)` and `publishAlert(alert, cfg)` — both run every configured channel under `Promise.allSettled`, log per-channel failures, never throw.

- [ ] **Step 1:** implement orchestrator. **Step 2:** commit.

---

## Phase E — Subscribers + alert state (Mongo)

### Task E1: subscriber model + store

**Files:** Create `bots/src/store/mongo.ts`, `bots/src/store/subscribers.ts`, `bots/test/subscribers.test.ts`

**Interfaces:**
- Produces: mongoose `connectMongo(uri)`; model `BotSubscriber { platform:'telegram'|'discord', chatId:string, language:string, active:boolean }` unique `(platform,chatId)`; `subscribe(p,chatId,lang)`, `unsubscribe(p,chatId)`, `setLanguage(p,chatId,lang)`, `listActive(p): Promise<{chatId,language}[]>`.
- Produces: `AlertState { currency:string, date:string, lastDirection, lastPct, lastAt }` + `shouldAlert(currency, pct, cfg): Promise<boolean>` (threshold + cooldown + new-band) and `recordAlert(...)`.

- [ ] **Step 1 (test):** unit-test `shouldAlert` pure decision separately (extract `decideAlert(prev, pct, cfg): boolean` pure helper) — below threshold → false; above threshold, no prev → true; within cooldown same direction → false; opposite direction past band → true.
- [ ] Steps 2–5: implement pure `decideAlert` + thin Mongo wrappers (Mongo parts not unit-tested) → pure test passes → commit.

---

## Phase F — Report generation (reuses mcp tools)

### Task F1: `bots/src/report/data.ts`

**Files:** Create `bots/src/report/data.ts`, `bots/test/report_data.test.ts`

**Interfaces:**
- Consumes: `CambioApi` + `getRates`, `getNews` from `cambio-uruguay-mcp`.
- Produces: types `CurrencyDelta`, `DailyReportData`, `AlertData`; `buildDailyData(api, cfg): Promise<DailyReportData>` (per currency: `getRates` today + `getEvolution` previous-day value → `changePct`; attach `getNews`); `buildAlertData(api, currency): Promise<AlertData|null>` (current best-sell vs the day's first evolution reading).

- [ ] **Step 1 (test):** with a fake `CambioApi` returning fixed rates + evolution, `buildDailyData` yields one `CurrencyDelta` per configured currency with correct `changePct` sign and best houses; `buildAlertData` returns `direction:'up'` when current > baseline by the right pct.
- [ ] Steps 2–5: fail → implement using mcp handlers → pass → commit.

### Task F2: `bots/src/report/ai.ts`

**Files:** Create `bots/src/report/ai.ts`

**Interfaces:**
- Consumes: `dailySummary` from `cambio-uruguay-mcp/tools`.
- Produces: `summarize(api, lang): Promise<string>` returning cleaned AI market summary; tolerates failure (returns `''` so the report still ships without prose).

- [ ] **Step 1:** implement try/catch wrapper. **Step 2:** commit.

---

## Phase G — Interactive bots

### Task G1: `bots/src/commands/router.ts` (platform-agnostic)

**Files:** Create `bots/src/commands/router.ts`, `bots/test/router.test.ts`

**Interfaces:**
- Consumes: mcp tools + Task C2 formatters + Task E1 store.
- Produces: `handleCommand(api, cfg, ctx): Promise<CommandReply>` where `ctx = { cmd, args, lang, platform, chatId }` and `CommandReply = { text, imageUrl? }`. Dispatch: `/dolar`→getRates USD, `/cotizacion`→getRates arg, `/mejor`→bestHouse, `/convertir`→convert, `/resumen`→dailySummary, `/historico`→getEvolution+dailySummary(currency), `/noticias`→getNews, `/suscribir`/`/desuscribir`/`/idioma`→store, `/start`/`/help`→static help. Unknown/invalid args → friendly localized usage text.

- [ ] **Step 1 (test):** with fake api + in-memory store, `handleCommand` for `{cmd:'mejor', args:['USD','compra']}` returns text containing a house name; `{cmd:'convertir', args:['100','USD','UYU']}` returns a number; unknown cmd returns help. Parsing of `compra|venta|buy|sell` covered.
- [ ] Steps 2–5: fail → implement dispatch (pure except store/api calls, both injected) → pass → commit.

### Task G2: `bots/src/entries/telegram.ts` (telegraf adapter, always-on)

**Files:** Create `bots/src/bot/telegram_adapter.ts`, `bots/src/entries/telegram.ts`

**Interfaces:**
- Consumes: G1 router, config, store.
- Produces: a telegraf bot that maps each command to `handleCommand`, resolves per-user lang (`ctx.from.language_code` → `normalizeLang`, overridable by stored `/idioma`), sends `text` (Markdown) and optional photo. Exits cleanly if `TELEGRAM_BOT_TOKEN` missing.

- [ ] **Step 1:** implement adapter + entry; register command list via `bot.telegram.setMyCommands`. **Step 2:** smoke via `DRY_RUN`/staging token (manual). **Step 3:** commit.

### Task G3: `bots/src/entries/discord.ts` (discord.js, always-on)

**Files:** Create `bots/src/bot/discord_adapter.ts`, `bots/src/entries/discord.ts`, `bots/src/bot/register_commands.ts`

**Interfaces:**
- Consumes: G1 router, config, store.
- Produces: slash-command registration (REST `applicationCommands`) + interaction handler routing to `handleCommand`; replies with text/embeds. Exits cleanly if `DISCORD_BOT_TOKEN` missing.

- [ ] **Step 1:** implement registration script + adapter + entry. **Step 2:** manual smoke. **Step 3:** commit.

---

## Phase H — Scheduled jobs

### Task H1: `bots/src/entries/daily_report.ts`

**Files:** Create `bots/src/entries/daily_report.ts`

**Interfaces:**
- Consumes: F1, F2, D4, E1, config.
- Produces: connect Mongo (if configured) → `buildDailyData` → `summarize` for each needed lang → fetch OG image (Task I1) → `publishDaily` (channels + DM subscribers + tweet) → exit 0. Daily dedup via an `AlertState`-style `JobRun` doc or Mongo key; `FORCE=1` overrides; `DRY_RUN=1` logs.

- [ ] **Step 1:** implement entry. **Step 2:** `DRY_RUN=1 npm run daily` → expect logged report, no sends. **Step 3:** commit.

### Task H2: `bots/src/entries/alert_check.ts`

**Files:** Create `bots/src/entries/alert_check.ts`

**Interfaces:**
- Consumes: F1 `buildAlertData`, E1 `decideAlert`/state, D4 `publishAlert`, config.
- Produces: for each `alert.currencies`: build alert data → `decideAlert` → if true publish + `recordAlert` → exit 0.

- [ ] **Step 1:** implement. **Step 2:** `DRY_RUN=1 npm run alerts` smoke. **Step 3:** commit.

---

## Phase I — Share image

### Task I1: `bots/src/report/image.ts`

**Files:** Create `bots/src/report/image.ts`

**Interfaces:**
- Produces: `ogImageUrl(lang, params): string` and `fetchImage(url): Promise<Buffer|null>` (used by Twitter; channels can pass URL). Points at the deployed Nuxt `/api/og-rate` (or `/api/og-daily` from Task J4) with the broadcast locale.

- [ ] **Step 1:** implement URL builder + fetch. **Step 2:** commit.

---

## Phase J — Multilingual Open Graph (Nuxt app)

### Task J1: localize `Cambio.vue`

**Files:** Modify `app/components/OgImage/Cambio.vue`

**Interfaces:**
- Produces: prop `locale?: 'es'|'en'|'pt'`; an internal `LABELS[locale]` map for the footer line ("+40 casas de cambio", "actualizado cada 10 min"), `rateLabel` ("DÓLAR USD"), and "compra" word; default title/subtitle per locale.

- [ ] **Step 1:** add `locale` prop + label map; replace hardcoded Spanish footer/labels with `LABELS[locale]` lookups (default `es`). **Step 2:** build `cd app && npm run build` (or dev) and render OG for one route per locale; verify no Spanish in en/pt. **Step 3:** commit.

### Task J2: pass localized strings from page callers

**Files:** Modify each `defineOgImageComponent('Cambio', …)` caller: `app/pages/acerca.vue`, `app/pages/comparar.vue`, `app/pages/casa/[origin].vue`, `app/pages/cotizacion/[moneda].vue`, `app/pages/convertir/index.vue`, `app/pages/convertir/[slug].vue`, `app/pages/blog/index.vue`, `app/pages/blog/[slug].vue`, `app/components/ToolShell.vue`, plus `app/app.vue` default.

**Interfaces:**
- Produces: every caller passes `title`/`subtitle`/`tag` via `t(...)` and `locale: (useI18n().locale.value)`.

- [ ] **Step 1:** audit each caller; replace hardcoded Spanish with `t()` keys (add missing keys to locale files for es/en/pt). **Step 2:** build + spot-check 3 routes × 3 locales. **Step 3:** commit.

### Task J3: localize OG/Twitter meta

**Files:** Modify the SEO meta layer (per-page `useSeoMeta` and/or `app/plugins/seo-utils.ts` / `nuxt.config.ts` i18n).

**Interfaces:**
- Produces: `og:locale` (`es_UY`/`en_US`/`pt_BR`) + `og:locale:alternate` emitted per localized route; localized `og:title`/`og:description`/`twitter:*`.

- [ ] **Step 1:** add `og:locale` + alternates (derive from i18n locales) and ensure titles/descriptions use `t()`. **Step 2:** assert in an e2e/head check for one route per locale. **Step 3:** commit.

### Task J4 (optional): `/api/og-daily` endpoint

**Files:** Create `app/server/api/og-daily.get.ts` (only if `og-rate` layout doesn't suit a daily card)

- [ ] Build a daily-card variant reusing the `Cambio` template with the day's headline deltas; otherwise skip and use `og-rate`.

---

## Phase K — Deploy wiring

### Task K1: pm2 entries

**Files:** Modify `ecosystem.config.js`

**Interfaces:**
- Produces: `currency-bot-telegram` + `currency-bot-discord` (always-on, `autorestart:true`, `script: bots/dist/entries/telegram.js` / `discord.js`); `currency-daily` (`cron_restart:"0 12 * * *"`, `autorestart:false`, `bots/dist/entries/daily_report.js`); `currency-alerts` (`cron_restart:"*/15 11-21 * * *"`, `autorestart:false`, `bots/dist/entries/alert_check.js`). Build step: `cd mcp && npm i && npm run build && cd ../bots && npm i && npm run build`.

- [ ] **Step 1:** add entries + document build/deploy in `bots/README.md`. **Step 2:** commit.

---

## Self-Review

- **Spec coverage:** Telegram interactive+daily+DM (G2/H1/E1) ✓; Discord interactive+daily (G3/H1) ✓; Twitter daily+image (D3/H1/I1) ✓; daily report (F1/F2/H1) ✓; big-move alerts (F1/E1/H2) ✓; subscribers (E1) ✓; per-user + channel languages (C1/G1/H1) ✓; multilingual OG (J1–J4) ✓; reuse mcp (A1 + F/G) ✓; feature-gating + DRY_RUN (B2/D*) ✓; tests for pure logic (C/E/F/G) ✓; pm2 (K1) ✓.
- **Placeholder scan:** none — each task names files, interfaces, and concrete steps; representative code given for non-obvious parts.
- **Type consistency:** reuses mcp exported types (`RatesResult`, `BestHouseResult`, `ConvertResult`, `NewsItem`, `DailySummaryResult`); new types (`DailyReportData`, `AlertData`, `BotConfig`, `CommandReply`) defined in F1/B2/G1 and consumed downstream.

## Out of scope (later)

Email newsletter (Spec 2); Twitter mention-replies; weekly recap.
