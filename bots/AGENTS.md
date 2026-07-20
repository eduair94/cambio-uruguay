# bots/ — AGENTS

Telegram + Discord bots and a Twitter/X daily poster for cambio-uruguay.com. Read `bots/README.md` first — this file is only the essentials not to miss.

## Layout
- Own `package.json` (`type: module`, private), own `tsconfig` build. NOT part of the app or root-backend build.
- Depends on the sibling **mcp** package: `"cambio-uruguay-mcp": "file:../mcp"`. Reuses its tool handlers + the public API (`/`, `/evolution`, `/localData`, `/ai/insights`). **Build mcp before bots.**
- Source in `src/`; role map is in README "Architecture" (`report/`, `format/`, `publish/`, `store/`, `commands/`, `entries/`).
- pm2 entrypoints: `src/entries/{telegram,discord,daily_report,alert_check}.ts` → compiled to `dist/entries/*.js`.
- Discord slash-cmd registrar: `src/bot/register_commands.ts` (`npm run register:discord`).

## Build / run / test
```bash
cd mcp  && npm ci && npm run build      # REQUIRED first — bots import mcp's dist
cd ../bots && npm ci && npm run build   # tsc -p tsconfig.json → dist/
npm test                                # vitest run (test/*.test.ts)
```
Dev (tsx, no build): `npm run dev:telegram`, `npm run dev:discord`, `npm run daily`, `npm run alerts`.

## Env / feature-gating (the big gotcha)
- All processes read `bots/.env` (dotenv). See `bots/.env.example` for every var.
- **Every channel is feature-gated: with no creds, that channel/process is silently a NO-OP.** A "working" run that sends nothing usually means missing creds, not a bug.
- `DRY_RUN=1` logs instead of sending — use it to preview daily/alerts against live data + AI.
- Key creds: Telegram `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL_ID`; Discord `DISCORD_BOT_TOKEN`/`DISCORD_APP_ID`/`DISCORD_WEBHOOK_URL`; Twitter OAuth 1.0a `TWITTER_APP_KEY`/`_SECRET`/`TWITTER_ACCESS_TOKEN`/`_SECRET`; subscribers + alert dedup need `MONGO_URI`.

## pm2 (root `ecosystem.config.js`, all `cwd: ./bots`)
| app | script | schedule |
| --- | --- | --- |
| `currency-bot-telegram` | `dist/entries/telegram.js` | always-on, single instance (long-poll) |
| `currency-bot-discord` | `dist/entries/discord.js` | always-on (gateway) |
| `currency-daily` | `dist/entries/daily_report.js` | cron `0 12 * * *` (09:00 America/Montevideo) |
| `currency-alerts` | `dist/entries/alert_check.js` | cron `*/15 11-21 * * *` (market hours) |

After changing Discord slash commands, run `npm run register:discord` once.

## Deploy
- **Separate deploy surface.** `scripts/deploy-backend.sh` explicitly excludes `bots/` (and `mcp/`) — own cwd, own build, out of scope. Pushing to main does NOT auto-deploy bots; build + `pm2 reload` them manually on the VPS.
