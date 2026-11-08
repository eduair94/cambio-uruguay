# Auth & Logged-In Features (Phase 1)

## Required environment variables

See `.env.example`. Public Firebase web config (`NUXT_PUBLIC_FIREBASE_*`), plus
server secrets `FIREBASE_SERVICE_ACCOUNT` (base64 of the service-account JSON)
and `MONGO_URI`.

## Firebase console setup

1. Create a Firebase project; add a Web app → copy the web config into the
   `NUXT_PUBLIC_FIREBASE_*` vars.
2. Authentication → Sign-in method → enable **Google**, **Email/Password**, and
   **Email link (passwordless)**.
3. Authentication → Settings → Authorized domains → add `cambio-uruguay.com` and
   `localhost`.
4. Project settings → Service accounts → Generate new private key →
   `base64 -w0 key.json` → `FIREBASE_SERVICE_ACCOUNT`.

If `NUXT_PUBLIC_FIREBASE_API_KEY` is empty the auth plugin no-ops, so the site
runs exactly as before (the login button simply does nothing useful).

## Features

- Login (Google / email+password / magic link) via the header account menu.
- Favorites: star casas in the rate table; view them under `/cuenta`.
- Saved results: save a currency conversion (`conversor-de-monedas` and
  `/convertir/*`); `/cuenta` shows the rate drift since the day it was saved.

## Architecture

- Client: Firebase Web SDK issues an ID token (`stores/auth.ts`,
  `plugins/firebase.client.ts`). `composables/useAuthFetch.ts` attaches it as a
  bearer credential.
- Server: every `/api/me/*` route calls `requireUser(event)`
  (`server/utils/auth.ts`) which verifies the token with Firebase Admin and
  returns the uid. All MongoDB queries are scoped by that verified uid — the
  client uid is never trusted.
- Drift is computed on the client by comparing the stored rate snapshot to
  today's live best rate from `useExchangeRates` (`composables/useSavedDrift.ts`),
  so the server stays pure CRUD.

## Tests

- Unit (Vitest, Nuxt-free): `requireUser`, models, `/api/me/*` handlers
  (uid-scoping), auth store, drift calc — `npm run test`.
- Components/pages are validated by `npm run typecheck`; a Playwright smoke test
  lives in `tests/e2e/account.spec.ts`.

## Phase 2 (not yet implemented)

Rate alerts with web push (FCM) + email (Nodemailer/SMTP) and the
`alerts:check` scheduled task. See
`docs/superpowers/specs/2026-06-17-firebase-auth-logged-in-value-design.md`.

## Telegram account linking

Users link Telegram under `/cuenta` → Alertas → "Vincular Telegram": the app
issues a short-lived code, the user opens `t.me/<bot>?start=<code>`, the telegraf
bot confirms via the secret-authenticated internal API, and `User.telegramChatId`
is set. Alerts can then fire a Telegram channel, the bot answers `/misalertas`,
`/favoritos`, `/alerta USD compra 41`, `/desvincular`, and a daily
`telegram:summary` task DMs linked users.

Env (app): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_SECRET`.
Env (bot `bots/.env`): `TELEGRAM_BOT_SECRET` (same) + `APP_BASE_URL`. The
internal `/api/telegram/*` API is gated by `x-telegram-secret`, keyed by chatId
(never a Firebase token); link codes are single-use with a 10-min Mongo TTL. Bot
runs as pm2 `cu-telegram-bot` (`bots/dist/entries/telegram.js`). Design/plan:
`docs/superpowers/specs/2026-06-18-telegram-account-linking-design.md`.

## Discord login

`/api/auth/discord/start` → Discord OAuth2 → `/api/auth/discord/callback`, which
resolves the Firebase account (`server/utils/discordAuth.ts` `resolveDiscordUid`)
and hands a custom token back as `/cuenta?ct=…`; `plugins/discordToken.client.ts`
signs in with it and removes it from the address bar through the router (never a
raw `history.replaceState`: the token came back with Back and reached GA4).
Design: `docs/superpowers/specs/2026-06-18-multichannel-access-discord-login-design.md`.

- A verified Discord address links to the existing account with that address
  **only if that account's address is verified** (2026-11-08). An email/password
  sign-up can use anyone's address and its creator keeps the password, so a
  Discord login never takes such an account over: the callback redirects with
  `authError=discord-unverified` and the dialog tells the visitor to verify the
  address first, or to take the account with "forgot password" if they did not
  open it. Nothing is linked and no second account is created.
- A verified address with no account creates one with `emailVerified: true`. The
  one account the callback had created before that flag existed was marked
  verified by hand the same day (its address had been verified by Discord: the
  email branch has always required it).
- The callback's error codes become dialog messages (`auth.discordError`,
  `auth.discordUnverified`), written after the scrub navigation: that navigation
  runs the `/cuenta` auth middleware, whose `openDialog()` clears `store.error`.
  Only the plugin's own codes count (an own-property lookup: `?authError=constructor`
  found an inherited member).
- The `users` row keeps Discord's address only when Discord verified it: the
  account switches fall back to that row. And the newsletter switch changes the
  subscriber list only for a verified address, in both directions (switching off
  used to unsubscribe whatever address the account carried).
- Not done, pre-existing (2026-11-08 review): the `?ct=` hand-off is not bound to
  the browser that started the flow, so a link carrying a fresh custom token signs
  the visitor into someone else's account (login CSRF). The fix is to hand the
  token over in a short-lived `__Host-` cookie set by the state-checked callback
  instead of the URL; it was left out because the happy path cannot be checked
  end to end without a Discord account.
