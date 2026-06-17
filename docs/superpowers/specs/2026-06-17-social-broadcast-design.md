# Social Broadcast — Daily Reports, Alerts & Interactive Bots (Spec 1)

**Date:** 2026-06-17
**Status:** Approved design, pre-implementation
**Scope:** Push channels — Telegram + Discord (interactive) and Twitter/X (broadcast), plus a **multilingual Open Graph embed** (beautiful localized share card + meta) reused by both the website and the bots' posts, plus an **open-source MCP server** that exposes the same data to AI assistants as a pull/interactive surface (hosted + `npx`). Email newsletter is a **separate** later spec (Spec 2).

## Goal

Report the Uruguayan exchange market daily across owned social channels using AI: a once-a-day summary, intraday big-move alerts, and interactive bots that answer rate queries on demand. Reuses existing AI, news, data, Redis, and Mongo infrastructure. Every channel is independently feature-gated by environment variables (no creds → that channel is silently skipped).

## Non-goals (out of scope for Spec 1)

- Email newsletter (subscriber list, signup/unsubscribe UI, double opt-in, email provider) → **Spec 2**.
- Interactive Twitter/X (mention replies, DMs) — X is broadcast-only here.
- Weekly recap (can be added later; daily + alerts only now).

## Existing infrastructure reused

- **AI:** `classes/ai_service.ts` — OpenAI-compatible singleton, env-configured (`AI_BASE_URL`/`AI_API_KEY`/`AI_MODEL`), Redis-cached, multilingual (es/en/pt). Add a `daily_report` prompt path.
- **News:** Google News RSS source. `app/server/utils/news.ts` is Nuxt-side; the backend gets a small sibling `fetchNews()` (same feeds/parsing) under `classes/report/`.
- **Data:** existing Express API (`/`, `/evolution/:origin/:currency`, `/localData`) is the single source of truth for rates/evolution/house names.
- **Cron pattern:** standalone TS scripts compiled to `dist/*.js`, scheduled by pm2 `cron_restart` in `ecosystem.config.js` (e.g. `sync.ts`). Always-on processes use the plain pm2 `apps` entry (e.g. `currency-server`).
- **Redis:** `classes/redis_cache.ts` for AI cache, alert state, and dedup.
- **Mongo:** Mongoose via `classes/database.ts` for the subscriber collection.
- **Image:** Nuxt OG-image infra (`app/server/api/og-rate.get.ts`, `defineOgImageComponent`).
- **Errors:** Sentry (`sentry.ts`, `sentryInit()`).

## Architecture

Generate the report **once**, then fan out to N **publishers**. Cron scripts publish via stateless HTTP; always-on bot processes only handle interactive commands.

```
                ┌─────────────────────────────┐
 data + news →  │  report core (pure-ish)     │ → DailyReportData / AlertData
                │  build · ai-summarize · fmt │
                └──────────────┬──────────────┘
        ┌──────────────────────┼───────────────────────┐
   cron scripts            publishers              always-on bots
  daily_report.ts     telegram / discord /        bot_telegram.ts
  alert_check.ts      twitter (HTTP, gated)        bot_discord.ts
       │                     │                          │
   generate+publish    stateless sends            interactive commands
```

Rationale: Telegram Bot API `sendMessage` and Discord webhooks are stateless HTTP — any process holding the token/URL can post. Only Telegram long-polling (`getUpdates`) must be single-instance, so it lives alone in `bot_telegram.ts`. This keeps scheduled publishing decoupled from the interactive processes and matches the existing cron-script + always-on split.

## Components

### `classes/report/` — report core (pure-ish, unit-tested)

- `news.ts` — backend `fetchNews(limit)`, mirroring `app/server/utils/news.ts` feeds/parsing.
- `report_data.ts`
  - `buildDailyData(): Promise<DailyReportData>` — for each `REPORT_CURRENCIES`, pull today + previous business day via the API; compute market avg buy/sell, best buy house, best sell house, lowest spread, and % change vs previous day. Attach top N news items.
  - `buildAlertData(currency): Promise<AlertData | null>` — current value vs the day's first reading (baseline); returns move % and direction, or `null` if no data.
- `report_ai.ts` — `summarize(data, lang): Promise<string>` — builds a `daily_report` prompt from `DailyReportData`, calls `AIService`, Redis-cached per `date+lang`.
- `report_format.ts` — pure formatters, no IO:
  - `formatTelegram(data, aiText, lang)` — HTML/Markdown, full.
  - `formatDiscord(data, aiText, lang)` — Discord markdown/embed fields.
  - `formatTwitter(data, lang)` — ≤280 chars: top currencies' deltas + best house + short link.
  - `formatAlert(alert, lang)` — concise one-liner per platform.

Data shapes (illustrative):

```ts
interface CurrencyDelta {
  code: string            // "USD"
  avgBuy: number; avgSell: number
  changePct: number       // vs previous business day, sell side
  bestBuy: { house: string; rate: number }
  bestSell: { house: string; rate: number }
  lowestSpread: { house: string; spread: number }
}
interface DailyReportData {
  date: string
  currencies: CurrencyDelta[]
  news: NewsItem[]
}
interface AlertData {
  code: string; current: number; baseline: number
  changePct: number; direction: "up" | "down"
}
```

### `classes/publishers/` — channel adapters (each `isConfigured()`-gated)

- `telegram_publisher.ts` — `postToChannel(html, image?)` to `TELEGRAM_CHANNEL_ID`; `dmSubscribers(textByLang, image?)` over active Telegram subscribers, batched to respect ~30 msg/s (chunk + small delay; drop+deactivate subscribers that return 403).
- `discord_publisher.ts` — `postToChannel(payload, image?)` via `DISCORD_WEBHOOK_URL`.
- `twitter_publisher.ts` — `tweet(text, imageBuffer?)` via `twitter-api-v2` (v1.1 media upload + v2 tweet; OAuth 1.0a).

All publisher entry points are wrapped by callers in `Promise.allSettled` so one failing channel never blocks the others. `DRY_RUN=1` makes every publisher log instead of send.

### `classes/bots/` — interactive command logic

- `commands.ts` — platform-agnostic handlers returning `{ text, imageUrl? }`. One function per command, sharing the report core, the Express API, and the existing convert util:
  - `/start`, `/help` — onboarding + command list.
  - `/dolar` — USD best buy/sell + spread.
  - `/cotizacion <moneda>` — any currency current rates.
  - `/mejor <moneda> [compra|venta]` — best house to buy/sell now.
  - `/convertir <monto> <de> <a>` — converter (reuse `app/utils/convert.ts` logic; extract a shared pure helper if needed).
  - `/resumen` — daily AI summary on demand.
  - `/historico <moneda>` — AI trend analysis.
  - `/noticias` — latest headlines.
  - `/suscribir`, `/desuscribir` — opt in/out of daily DM push.
  - `/idioma <es|en|pt>` — set per-user language.
- `telegram_bot.ts` — `telegraf` adapter: routes commands → `commands.ts`, sends results. Per-user language from Telegram `language_code` unless overridden by `/idioma`.
- `discord_bot.ts` — `discord.js` slash-command adapter over the same `commands.ts`.

### Subscribers (Mongo)

- Mongoose model `BotSubscriber { platform: 'telegram'|'discord', chatId: string, language: string, active: boolean, createdAt: Date }`, unique on `(platform, chatId)`.
- `subscribers.ts` — `subscribe`, `unsubscribe`, `setLanguage`, `listActive(platform)`.

### Scheduled jobs (root → `dist`, pm2)

- `daily_report.ts` — connect Mongo → `buildDailyData()` → for each needed language `summarize()` → publish to channels + DM subscribers + tweet (with image) → set Redis `report:daily:<date>` → exit. If the dedup key exists, skip (manual re-run via `FORCE=1`).
- `alert_check.ts` — for each `ALERT_CURRENCIES`: `buildAlertData()`; if `|changePct| > ALERT_THRESHOLD_PCT` and the last alert for that currency/day is older than `ALERT_COOLDOWN_MIN` and crosses a new threshold band → publish alert + update Redis `alert:<currency>:<date>` → exit.

### Always-on processes (pm2)

- `bot_telegram.ts`, `bot_discord.ts` — start only if their token env is present; otherwise log and exit cleanly.

## Open Graph embed (multilingual) + share image

When the bots post links to the site — and whenever any page is shared on social/messaging — the preview card must be **beautiful and localized** to the page's language. The existing OG template `app/components/OgImage/Cambio.vue` is visually strong but **hardcoded Spanish**: footer copy ("+40 casas de cambio", "actualizado cada 10 min"), rate labels ("DÓLAR USD", "compra"), and default title/subtitle are all es-only, and pages pass Spanish strings regardless of locale.

Work required:

1. **Localize the OG image content (es/en/pt).**
   - `Cambio.vue` accepts a `locale` prop and resolves its remaining hardcoded strings (footer line, rate label, "compra" word, defaults) from a small per-locale label map inside the component. Satori renders server-side, so labels must be passed in, not read from a runtime i18n composable.
   - Every page's `defineOgImageComponent('Cambio', …)` passes **translated** `title`/`subtitle`/`tag` via the page's `t()` and the current `locale`. Audit all current callers (`acerca`, `comparar`, `casa/[origin]`, `cotizacion/[moneda]`, `convertir/*`, `blog/*`, `ToolShell`, etc.) so none leak Spanish into en/pt previews.
2. **Localize the OG/Twitter meta per locale.**
   - Ensure `og:locale` (e.g. `es_UY`, `en_US`, `pt_BR`) and `og:locale:alternate` are emitted per localized route, alongside localized `og:title`/`og:description`/`twitter:*`. hreflang alternates already exist; this completes the locale signalling so the right-language card shows per audience.
3. **Reuse as the bots' share/daily image.** Publishers fetch the localized PNG from the deployed Nuxt site (`/api/og-rate` or a new `/api/og-daily` for the day's headline deltas) with the broadcast/user locale, and attach it to tweets/posts. No new rendering stack in the backend — the Nuxt OG pipeline is the single image source.

Polish pass on `Cambio.vue` is in scope (spacing/contrast/locale-aware layout); a full redesign is not.

## MCP server (open source, hosted + npx)

**Why.** Beyond social channels (push) and the raw REST API (JSON), expose the same market data through the **Model Context Protocol** so any AI assistant — Claude Desktop, Cursor, Cline, ChatGPT, etc. — can answer live Uruguayan exchange-rate questions, convert amounts, and pull trends/news on demand. This is a *pull/interactive* surface (like the bots), and it ships as a standalone open-source package so third parties run it themselves or just point at the hosted endpoint. Reaching the AI-assistant ecosystem is itself a distribution/SEO channel: the project becomes the canonical UY-rates tool LLMs reach for.

**Data source.** Read-only wrapper over the existing Express API (single source of truth) — no DB, scraper, or credential access. Same API base the bots use. Reuses the report core (`report_data`, `report_ai`, `news`) and the shared convert helper, so MCP tools and the bot commands stay in lockstep.

**Two transports, one server.** `MCP_TRANSPORT` selects the mode from a single entry (`mcp_server.ts`):
- **stdio** — local clients via `npx cambio-uruguay-mcp`; paste a snippet into Claude Desktop / Cursor config. Zero infra, no keys.
- **Streamable HTTP** — a public hosted endpoint (e.g. `https://mcp.cambio-uruguay.com`) so anyone adds the URL with nothing to install. Stateless, read-only, rate-limited; runs as an always-on pm2 process (`currency-mcp`).

### Tools (mirror the API + bot commands)

- `list_houses` — all casas de cambio + metadata.
- `get_rates(currency)` — current buy/sell per house, market avg, spread, best buy/sell.
- `best_house(currency, side?)` — best house to buy or sell now.
- `convert(amount, from, to, side?)` — converted amount at best/avg rate (shared convert helper).
- `get_evolution(origin, currency)` — historical series (wraps `/evolution/:origin/:currency`).
- `get_news(limit?)` — latest market headlines.
- `daily_summary(lang?)` — AI market summary (reuses `report_ai.summarize`, Redis-cached, es/en/pt).

### Resources & prompts (optional, low cost)

- Resources: `rates://current` and `casa://{origin}` for browsable snapshots.
- Prompt: `analizar-dolar-hoy` — pre-wired template chaining `get_rates` + `get_news` + `daily_summary` for a one-shot "how's the dollar today" answer.

Tool handlers are **pure over an injected fetcher** → unit-tested like the formatters; **MCP Inspector** for manual smoke. No auth on the public endpoint (read-only public data); abuse handled by rate limiting. The server is feature-gated like every other surface: with no `MCP_*` config it simply isn't started.

### Packaging & distribution (open source)

- Published to npm as `cambio-uruguay-mcp` with a `bin` (so `npx cambio-uruguay-mcp` just works), **MIT-licensed**, source in the monorepo under `mcp/` (its own `package.json`, built independently of the Nuxt app).
- README ships ready-to-paste Claude Desktop / Cursor / Cline configs for both stdio and the hosted URL.
- Submitted to the public MCP registries (the official `modelcontextprotocol/servers` list, `mcp.so`, Smithery, Glama) for discoverability — the "available to be used" goal.

SDK: `@modelcontextprotocol/sdk` (TypeScript).

## Configuration (all env, feature-gated)

| Var | Purpose | Default |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot + sends | — (gates Telegram) |
| `TELEGRAM_CHANNEL_ID` | Daily channel target | — |
| `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID` | Discord slash commands | — (gates Discord bot) |
| `DISCORD_WEBHOOK_URL` | Daily channel post | — (gates Discord posts) |
| `TWITTER_APP_KEY`/`_SECRET`, `TWITTER_ACCESS_TOKEN`/`_SECRET` | X API (OAuth 1.0a) | — (gates Twitter) |
| `ALERT_THRESHOLD_PCT` | Big-move alert threshold | `1` |
| `ALERT_COOLDOWN_MIN` | Min minutes between alerts/currency | `120` |
| `ALERT_CURRENCIES` | Currencies to watch | `USD,EUR,ARS,BRL` |
| `REPORT_CURRENCIES` | Currencies in daily report | `USD,EUR,ARS,BRL` |
| `DEFAULT_BROADCAST_LANG` | Channel + Twitter language | `es` |
| `DRY_RUN` | Log instead of send | unset |
| `FORCE` | Bypass daily dedup | unset |
| `MCP_TRANSPORT` | `stdio` or `http` | `stdio` |
| `MCP_HTTP_PORT` | Hosted Streamable-HTTP port | `8788` |
| `MCP_PUBLIC_URL` | Advertised endpoint (docs/registry) | — |
| `API_BASE_URL` | Express API base the MCP/bots call | local API |

Reuses existing `AI_*`, Redis, and Mongo connection envs.

## Scheduling (America/Montevideo, UTC-3 → server UTC)

- Daily: pm2 `cron_restart: "0 12 * * *"` (09:00 local).
- Alerts: pm2 `cron_restart: "*/15 11-21 * * *"` (~08:00–18:00 local market window).
- pm2 `apps` additions: `currency-bot-telegram`, `currency-bot-discord`, `currency-mcp` (always-on, `autorestart: true`); `currency-daily`, `currency-alerts` (`autorestart: false`, cron).

## Languages

Per-user language for DMs/commands (Telegram `language_code` or `/idioma`, stored on the subscriber). Public channel posts and tweets use `DEFAULT_BROADCAST_LANG`. AI summaries produced per needed language via the existing multilingual `AIService`.

## Error handling, idempotency, safety

- Publishers isolated via `Promise.allSettled`; per-channel failures logged to Sentry, never fatal.
- Daily dedup: Redis `report:daily:<date>`. Alert dedup/cooldown: Redis `alert:<currency>:<date>`.
- Telegram DM 403 (blocked) → mark subscriber `active: false`.
- `DRY_RUN=1` for safe local/staging runs (no external sends).
- Jobs `process.exit` on completion; Sentry wraps the top-level.

## Testing

- **Unit (vitest):** formatters (`report_format.ts`), delta math (`report_data` pure parts behind an injected fetcher), alert threshold/cooldown logic, subscriber CRUD (mocked model), Twitter 280-char truncation. Follow the existing pure-function test style (`app/tests/unit/comparison.test.ts`). Network/IO behind interfaces.
- **Manual:** `DRY_RUN=1` end-to-end of `daily_report.ts` and `alert_check.ts`; a staging Telegram channel/bot for live smoke.
- **MCP:** unit-test tool handlers (pure, injected fetcher) alongside the formatters; **MCP Inspector** against both stdio and HTTP transports; smoke each tool from a real client config (Claude Desktop) before npm publish.
- **OG embed:** snapshot/visual check of the rendered OG PNG for each locale (es/en/pt) — no Spanish leaking into en/pt; assert localized `og:title`/`og:description`/`og:locale` in each localized route's head (extend existing e2e where practical).

## New dependencies

`telegraf`, `discord.js`, `twitter-api-v2`, `@modelcontextprotocol/sdk` (the last isolated in the `mcp/` package). Scheduling handled by pm2 (no in-process cron lib).

## File layout (new)

```
classes/
  report/{news,report_data,report_ai,report_format,subscribers}.ts
  publishers/{telegram_publisher,discord_publisher,twitter_publisher}.ts
  bots/{commands,telegram_bot,discord_bot}.ts
  mcp/{tools,resources}.ts   # MCP handlers over the report core (pure, unit-tested)
  models/bot_subscriber.ts
daily_report.ts            # cron
alert_check.ts             # cron
bot_telegram.ts            # always-on entry
bot_discord.ts             # always-on entry
mcp_server.ts              # always-on entry; MCP_TRANSPORT → stdio | streamable-http
tests/ (vitest for the pure modules)

mcp/ (standalone open-source package — published to npm, MIT)
  package.json             # bin: cambio-uruguay-mcp; deps: @modelcontextprotocol/sdk
  README.md                # client configs (Claude Desktop / Cursor / Cline), stdio + hosted
  LICENSE                  # MIT
  src → re-exports classes/mcp + mcp_server (or thin copy); builds to dist independently

app/ (frontend — multilingual OG)
  components/OgImage/Cambio.vue     # + locale prop & per-locale label map (edit)
  server/api/og-daily.get.ts        # daily-card image (only if og-rate insufficient)
  pages/**                          # defineOgImageComponent callers pass localized title/subtitle/tag + locale
  + og:locale / og:locale:alternate in SEO meta per localized route
```

## Open implementation notes

- Confirm whether `app/utils/convert.ts` exposes a pure conversion usable from the backend, or extract a shared helper.
- Confirm `og-rate` output suits a daily card before deciding to add `og-daily`.
- The backend currently has no vitest setup; add a minimal one (or colocate pure modules tested from the existing `app` vitest if import paths allow).
- Decide how the published `mcp/` package consumes the report core: import the compiled `classes/` output, a thin re-export, or a small copied subset — the package must stay installable standalone via `npx` without pulling the whole backend.
- Confirm the hosted MCP endpoint's home (subdomain `mcp.cambio-uruguay.com` vs `/mcp` path) and the rate-limit budget for anonymous public traffic.
