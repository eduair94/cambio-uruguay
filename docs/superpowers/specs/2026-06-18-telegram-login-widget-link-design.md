# Telegram Login Widget — One-Click Account Link (link-only)

**Date:** 2026-06-18
**Status:** Approved
**Site:** cambio-uruguay (Nuxt 3 / Vue 3 script-setup / Vuetify 3 / @nuxtjs/i18n / Firebase auth / MongoDB)

## Goal

Let a logged-in user link their Telegram account in one click via the **Telegram Login Widget** ("Log in with Telegram"), instead of the current manual flow (generate code → open bot → `/start <code>`). The existing code flow stays as a fallback. After linking, alerts / newsletter / daily summary deliver over Telegram as today.

## Why a widget (not OAuth2)

Telegram has no OAuth2. Its login primitive is the **Login Widget**: a Telegram-hosted button that, after the user authorizes, returns a signed payload `{ id, first_name, last_name?, username?, photo_url?, auth_date, hash }`. Authenticity is verified server-side: build a `data_check_string` from all fields except `hash` (sorted by key, `key=value` joined by `\n`), derive `secret = SHA256(bot_token)` (raw bytes), compute `HMAC_SHA256(data_check_string, secret)`, and compare its hex to `hash` (timing-safe). The widget's `id` is the user's private chat id, so it maps directly onto the existing `user.telegramChatId` — the same field the code flow writes. Status and unlink endpoints therefore work unchanged.

This is **link-only** (chosen over login-parity with Discord): the widget runs only for an already-authenticated user and records their Telegram id; it does not mint a Firebase session.

## Architecture

### Unit 1 — `verifyTelegramAuth` (pure, tested)

Add to `app/server/utils/telegramAuth.ts` (keep existing `requireBotSecret`):

```ts
export interface TelegramAuthData {
  id: number | string
  auth_date: number | string
  hash: string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  [k: string]: unknown
}

// Returns true iff the HMAC matches AND auth_date is within maxAgeSeconds.
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
  maxAgeSeconds?: number,
  now?: number
): boolean
```

- Reject when `botToken` is empty, `hash` missing, or `auth_date` older than `maxAgeSeconds` (default 86400).
- `data_check_string`: every key except `hash` whose value is not `undefined`/`null`, sorted ascending, formatted `key=value`, joined with `\n`.
- `secret = createHash('sha256').update(botToken).digest()` (Buffer); `hmac = createHmac('sha256', secret).update(dcs).digest('hex')`; timing-safe compare to `data.hash`.
- Pure, no I/O — unit-testable with a fixture token where the test computes the expected hash itself.

### Unit 2 — `POST /api/me/telegram/link-widget` (authed)

New `app/server/api/me/telegram/link-widget.post.ts`, mirroring the auth/db patterns of the existing `link-code.post.ts`:

- `const { uid } = await requireUser(event)` (401 if unauthenticated).
- Read body as the widget payload. `const token = useRuntimeConfig().telegram?.token`.
- If `!token` → 503 "Telegram not configured".
- `if (!verifyTelegramAuth(body, token)) throw createError({ statusCode: 400, statusMessage: 'invalid telegram signature' })`.
- `await connectDb(); await UserModel.updateOne({ _id: uid }, { $set: { telegramChatId: String(body.id) } })`.
- Return `{ ok: true, linked: true, username: body.username ?? null }`.

### Unit 3 — Client widget in `TelegramLink.vue`

For a logged-in, **unlinked** user, render the Telegram Login Widget as the primary action; demote the existing code flow to a collapsible "or link with a code" fallback.

- Mount the widget client-only: create a `<script src="https://telegram.org/js/telegram-widget.js?22">` with attributes `data-telegram-login="<botUsername>"`, `data-size="large"`, `data-radius="8"`, `data-request-access="write"`, `data-onauth="onTelegramAuth(user)"`, appended into a template `ref` container on mount; remove on unmount.
- `data-request-access="write"` asks the user to allow the bot to message them, so DMs work without a prior `/start`. If declined, the id still links and we show the existing "open bot & Start" hint.
- Define the callback (e.g. `window.onTelegramAuth = (user) => …`) that POSTs `user` to `/api/me/telegram/link-widget` via `useAuthFetch().authFetch`, then calls the existing `refresh()` so the card flips to "linked".
- Bot username comes from new public config (Unit 4). If it is empty (widget can't render), show only the code fallback.

### Unit 4 — Public bot username config

`app/nuxt.config.ts` `runtimeConfig.public`: add `telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || ''`. The bot username is public; the token stays private under `runtimeConfig.telegram.token`.

### Unit 5 — i18n

Add keys to the existing `tg` block in `app/i18n/locales/json/{es,en,pt}.json` (identical keys across locales): a label for the widget action context and the "or link with a code" toggle, plus a success/failure snackbar message. Reuse existing `tg.*` keys where they already fit.

## Data flow

1. Logged-in user on `/cuenta` → `TelegramLink.vue` renders the widget (bot username from public config).
2. User clicks → Telegram popup → authorizes (+ optionally grants write access) → widget invokes `onTelegramAuth(user)`.
3. Callback POSTs `user` with the Firebase Bearer token (`authFetch`) → `link-widget` endpoint.
4. Endpoint verifies `hash` + freshness → sets `telegramChatId = id` → returns ok.
5. `refresh()` re-reads `/api/me/telegram/status` → card shows "linked"; alerts/newsletter now deliver over Telegram.

## Error handling

- Unauthenticated POST → 401 (`requireUser`).
- Bad/forged signature or stale `auth_date` → 400, no detail leaked beyond "invalid telegram signature".
- Missing bot token server-side → 503.
- Widget script fails / bot domain not registered → widget stays blank; the code fallback remains usable.
- Write access declined → link still succeeds; "open bot & press Start" hint shown for DM delivery.

## Testing

- **Unit (Vitest, node):** `verifyTelegramAuth` — (a) valid payload passes (test computes the expected hash with a fixture token), (b) tampered field fails, (c) wrong/missing `hash` fails, (d) stale `auth_date` fails, (e) empty token fails.
- **API unit:** `link-widget` endpoint — rejects bad signature (400) and unauthenticated (401); on a valid payload writes `telegramChatId`. Follow the existing `app/tests/unit/api-telegram-*.test.ts` style (mock `requireUser`/`UserModel`).
- **Manual (prod):** with the bot domain set, link a real account via the widget end-to-end; confirm a test alert/summary DMs the user.

## Constraints (global)

- Reuse the existing `telegramChatId` field, `TelegramLink` status/unlink endpoints, and `tg.*` i18n block — do not duplicate.
- Curated Vuetify registry: any component used in `TelegramLink.vue`'s template must be registered in `app/plugins/vuetify.ts` (it already uses VCard/VBtn/VChip/VIcon/VProgressCircular — all registered). Widget mounting is client-only to avoid SSR/hydration issues.
- i18n key parity across es/en/pt is mandatory.
- The bot token used for HMAC verification must come from `runtimeConfig.telegram.token` (server-only); never expose it client-side.
- HMAC compare must be timing-safe; `auth_date` freshness enforced (default 24h).

## Infra prerequisite (done by maintainer)

Bot domain registered via **@BotFather `/setdomain` → cambio-uruguay.com** (confirmed done). `TELEGRAM_BOT_USERNAME` already present in server env.

## Out of scope (YAGNI)

- Telegram as a login/sign-up provider (login-parity with Discord) — explicitly deferred; this is link-only.
- Migrating existing code-linked users; removing the code flow.
- Changing how messages are sent (alerts/newsletter/summary senders are unchanged).
