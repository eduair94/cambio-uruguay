# Telegram Account Linking + Value-Adds — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design), pending implementation plan
**Scope:** Let a logged-in user link their Telegram account, receive rate alerts in Telegram, query their account from the bot, get a daily personalized summary, and create alerts from chat.

## Goal

Connect a user's Telegram chat to their Firebase user (uid) and use that link to deliver value:

1. **Alerts channel** — rate alerts delivered to the user's Telegram (alongside push + email).
2. **Account commands** — `/misalertas`, `/favoritos`, `/desvincular` answer about the user's own data.
3. **Daily personalized summary** — favorites' live rates + saved-item drift, once a day.
4. **Create from Telegram** — `/alerta USD compra 41` creates an alert from chat.

## Decisions (locked during brainstorming)

| Topic | Decision |
|-------|----------|
| Link mechanism | Deep-link code: app generates a short-lived code; user opens `t.me/<bot>?start=<code>`; bot confirms via app API |
| Bot ↔ app boundary | Bot calls the app's **internal API** (shared secret, keyed by Telegram chatId) for everything; the app owns all user data + alert/rate logic; the bot only formats |
| Scope | All four value-adds, phased (linking+alerts → commands+create → daily summary) |
| Telegram send (app) | App sends via the Bot API directly (`TELEGRAM_BOT_TOKEN`); no dependency on the `bots/` package for sending |

## Architecture

```
Browser /cuenta ──(user token)──▶ POST /api/me/telegram/link-code ──▶ TelegramLink{code,uid,TTL}
   shows  t.me/<BOT>?start=<code>

Telegram user ──/start <code>──▶ bots/ telegraf bot ──(x-telegram-secret)──▶ POST /api/telegram/link
                                                                              └▶ set User.telegramChatId

alerts:check (app cron) ─▶ runner ─▶ sendTelegram(chatId, msg)  [channels.telegram]
telegram:summary (app cron) ─▶ per linked user ─▶ sendTelegram(favorites + drift)

bot commands (/misalertas, /favoritos, /alerta) ─(secret, chatId)─▶ /api/telegram/{alerts,favorites,alert}
```

Reuses: existing `bots/` telegraf bot + command router (`bots/src/commands/router.ts`), the app's `requireUser`, Mongo (`connectDb`), `UserModel`/`AlertModel`/`FavoriteModel`, `alertRunner`, `bestRateFor`/`fetchCurrentRates`, `useSavedDrift` logic (server-side equivalent), Nitro `scheduledTasks`.

## Components

### App — data
- `User.telegramChatId: string | null` (new field).
- `Alert.channels.telegram: boolean` (new sub-field, default false).
- `TelegramLink` model: `{ code: string (unique), uid: string, createdAt: Date }` with a **TTL index** (`expireAfterSeconds: 600`).

### App — user-facing API (Firebase-token auth, uid-scoped)
- `POST /api/me/telegram/link-code` → creates a `TelegramLink`, returns `{ code, deepLink, botUsername }`.
- `GET /api/me/telegram/status` → `{ linked: boolean }` (from `User.telegramChatId`).
- `DELETE /api/me/telegram` → clears `User.telegramChatId`.

### App — internal API (shared-secret auth, keyed by chatId)
All require header `x-telegram-secret === TELEGRAM_BOT_SECRET`; return 401 otherwise. Never user-token.
- `POST /api/telegram/link` `{ code, chatId }` → validate code (exists, unedited), set `User.telegramChatId`, delete code, return `{ ok, linked: true }` or `{ ok:false, reason }`.
- `POST /api/telegram/unlink` `{ chatId }` → clear that user's `telegramChatId`.
- `GET /api/telegram/alerts?chatId=` → that user's alerts (lean), or `{ linked:false }`.
- `GET /api/telegram/favorites?chatId=` → that user's favorites + current best rates.
- `POST /api/telegram/alert` `{ chatId, currency, kind, op, target }` → create an alert for that user (reuses the same validation as `/api/me/alerts`).

### App — utils
- `server/utils/telegram.ts`: `sendTelegram(chatId: string, text: string): Promise<boolean>` via `https://api.telegram.org/bot<token>/sendMessage` (Markdown, link preview off); returns success; reads `TELEGRAM_BOT_TOKEN` from runtimeConfig. No-op (returns false) when token unset.
- `server/utils/telegramAuth.ts`: `requireBotSecret(event)` → throws 401 unless the secret header matches.
- `server/utils/telegramLink.ts`: `makeLinkCode()` (random base32, ~8 chars) — pure, testable.

### App — alert delivery
- `alertRunner` gains a `telegram` dep + the runner sends Telegram when `alert.channels.telegram` and contact has a `telegramChatId`. `runAlertsCheck` deps extend with `telegram(chatId, text)` and `getUserContacts` returns `telegramChatId`.

### App — daily summary
- `server/tasks/telegram/summary.ts` (`telegram:summary`, cron e.g. `0 11 * * *`): for each `User` with a `telegramChatId`, build a message from their favorites' live rates + saved-item drift, `sendTelegram`. Pure builder `buildSummary(favorites, saved, rates)` is unit-tested.

### Bot (`bots/`)
- `entries/telegram.ts`: handle `/start <code>` → call app `POST /api/telegram/link`; reply success/failure. Add `/misalertas`, `/favoritos`, `/alerta`, `/desvincular` to the command router → call the internal API → format. New env: `APP_BASE_URL`, `TELEGRAM_BOT_SECRET`. A thin `appClient` in the bot wraps the secret-authed calls.

### UI (`/cuenta`)
- A "Telegram" row in the Alertas panel (or a small account section): when not linked → "Vincular Telegram" button → fetches link-code → shows the deep link (opens `t.me`) + "esperando…"; polls `GET /api/me/telegram/status` until linked. When linked → "Telegram vinculado ✅" + "Desvincular".
- Alert create form: add a **Telegram** checkbox; disabled with a "Vinculá Telegram" hint when not linked.

## Data Flow

**Link:** user clicks → `link-code` → deep link → bot `/start code` → `POST /api/telegram/link` → `User.telegramChatId` set → UI poll flips to linked.

**Alert fires:** `alerts:check` → for each fired alert, for each enabled channel: push / email / **telegram** (`sendTelegram(user.telegramChatId, msg)`).

**Command `/misalertas`:** bot → `GET /api/telegram/alerts?chatId` (secret) → format list → reply.

**Daily summary:** `telegram:summary` cron → linked users → favorites + drift → `sendTelegram`.

## Error Handling

- **Invalid/expired code** → `/api/telegram/link` returns `{ ok:false, reason:'expired' }`; bot replies "El código venció, generá uno nuevo desde la web."
- **Not linked** on a command → internal API returns `{ linked:false }`; bot replies "Vinculá tu cuenta primero en cambio-uruguay.com/cuenta."
- **Telegram send failure** (bot blocked, chat not found) → `sendTelegram` returns false; alert runner ignores (other channels still fire); a persistent `chat not found`/`bot blocked` could clear `telegramChatId` (best-effort).
- **Missing config** (`TELEGRAM_BOT_TOKEN`/`SECRET` unset) → features degrade quietly: link-code still issued but bot can't confirm; `sendTelegram` no-ops.
- **Bad secret** on internal API → 401.

## Config / Secrets

| Key | Where | Notes |
|-----|-------|-------|
| `TELEGRAM_BOT_TOKEN` | app + bot | Bot API token (bot already has it) |
| `TELEGRAM_BOT_USERNAME` | app | for the deep link `t.me/<username>` |
| `TELEGRAM_BOT_SECRET` | app + bot | shared secret guarding the internal API |
| `APP_BASE_URL` | bot | e.g. `https://cambio-uruguay.com` |

## Testing

- `makeLinkCode` format/uniqueness (pure).
- `requireBotSecret` (accept/reject) — mocked event.
- `/api/telegram/link` handler: valid code links + deletes; expired/missing → `ok:false` (mocked models).
- `link-code` + `status` + `DELETE` handlers (uid-scoping, mocked).
- `alertRunner` Telegram branch fires for `channels.telegram` + chatId; skips when unlinked.
- `/api/telegram/alert` validation (reuses alert enum checks).
- `buildSummary` pure formatter.
- Bot: `appClient` + `/start` parse (light unit where feasible).

## Security

- Internal `/api/telegram/*` endpoints are **secret-gated**, never accept a Firebase token, and operate only by `telegramChatId` (no uid from the request body for user-facing writes beyond the linked mapping).
- Link codes are single-use, short-lived (TTL 10 min), random, and deleted on use.
- `User.telegramChatId` is the only cross-reference; clearing it fully unlinks.
- The bot secret is server-only; the deep link exposes only a disposable code.

## Phase Boundaries

- **Phase 1:** `telegramChatId` + `Alert.channels.telegram` + `TelegramLink` + `sendTelegram` + `requireBotSecret` + user-facing link-code/status/unlink + internal `link`/`unlink` + alerts Telegram channel in the runner + bot `/start` handler + UI link button & alert checkbox.
- **Phase 2:** internal `alerts`/`favorites`/`alert` endpoints + bot `/misalertas`, `/favoritos`, `/alerta`, `/desvincular`.
- **Phase 3:** `telegram:summary` cron + `buildSummary`.

## Out of Scope (YAGNI)

- Discord/Twitter account linking (Telegram only).
- Two-way conversational alert editing beyond simple commands.
- Group-chat linking (1 Telegram chat ↔ 1 user only).
