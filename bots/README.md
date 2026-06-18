# cambio-uruguay-bots

Telegram + Discord bots and a Twitter/X daily poster for [cambio-uruguay.com](https://cambio-uruguay.com):

- **Daily report** — once a day, an AI market summary + per-currency deltas + news to every configured channel, plus DMs to opt-in subscribers, plus a tweet.
- **Intraday alerts** — when a watched currency moves beyond a threshold vs the previous day (with cooldown/dedup).
- **Interactive bots** — `/dolar`, `/cotizacion`, `/mejor`, `/convertir`, `/resumen`, `/historico`, `/noticias`, `/suscribir`, `/desuscribir`, `/idioma`.

Reuses the [`cambio-uruguay-mcp`](../mcp) tool handlers and the public API (`/`, `/evolution`, `/localData`, `/ai/insights`). Every channel is **feature-gated**: with no credentials, that channel is silently skipped. `DRY_RUN=1` logs instead of sending.

## Setup

```bash
cd mcp  && npm ci && npm run build   # bots depend on mcp's built output
cd ../bots && npm ci && npm run build
cp .env.example .env                 # fill in the creds you have
```

See [.env.example](./.env.example) for every variable.

| Channel | Required env |
| --- | --- |
| Telegram | `TELEGRAM_BOT_TOKEN` (BotFather), `TELEGRAM_CHANNEL_ID` (e.g. `@cambio_uruguay`) |
| Discord | `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID` (bot), `DISCORD_WEBHOOK_URL` (daily channel post) |
| Twitter/X | `TWITTER_APP_KEY`/`_SECRET`, `TWITTER_ACCESS_TOKEN`/`_SECRET` (OAuth 1.0a, read+write) |
| Subscribers | `MONGO_URI` (per-user `/suscribir` DMs + alert dedup) |

Tuning: `DEFAULT_BROADCAST_LANG` (es), `REPORT_CURRENCIES`, `ALERT_CURRENCIES`, `ALERT_THRESHOLD_PCT` (1), `ALERT_COOLDOWN_MIN` (120), `OG_IMAGE_URL`.

## Run

```bash
# Preview without sending (uses live data + AI):
DRY_RUN=1 npm run daily
DRY_RUN=1 npm run alerts

# Register Discord slash commands once (after changing them):
npm run register:discord

# Dev (tsx, no build):
npm run dev:telegram
npm run dev:discord
```

## Production (pm2)

Entries are wired in the repo-root `ecosystem.config.js`:

- `currency-bot-telegram`, `currency-bot-discord` — always-on (interactive).
- `currency-daily` — cron `0 12 * * *` (09:00 America/Montevideo).
- `currency-alerts` — cron `*/15 11-21 * * *` (market hours).

```bash
pm2 start ecosystem.config.js --only currency-bot-telegram,currency-bot-discord,currency-daily,currency-alerts
```

## Architecture

```
report core (data + ai, reuses mcp) ──► formatters (es/en/pt) ──► publishers (tg/discord/x)
        ▲                                                              ▲
   public API + AI                                            cron entries + interactive bots
```

- `src/report/` — build daily/alert data, AI summary, share image.
- `src/format/` — pure i18n + channel message formatters (unit-tested).
- `src/publish/` — per-channel publishers + fan-out orchestrator (`Promise.allSettled`).
- `src/store/` — Mongo subscriber store + alert/job dedup (+ pure `decideAlert`).
- `src/commands/` — platform-agnostic command router (unit-tested).
- `src/entries/` — pm2 process entry points.

`npm test` runs the vitest suite (formatters, config, alert decision, report data, router, publishers).
