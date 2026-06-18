# Multi-channel access hub + Telegram newsletter delivery + Discord login

Date: 2026-06-18
Status: Approved (design)
Branch: `feat/multichannel-access-discord-login`

## Overview

Three independent modules that make every way to consume cambio-uruguay
discoverable, let linked users receive the daily newsletter over Telegram, and
add "Sign in with Discord". Each module ships independently; sequence A → B → C
(C is gated on the owner creating a Discord application).

### Goals
- A. One page (`/conectar`) + footer/header links surfacing every channel: Web, API, MCP, Telegram bot, Telegram channel, Discord, Newsletter, RSS/Blog.
- B. Logged-in + Telegram-linked users choose newsletter delivery: email, Telegram, or both.
- C. "Continuar con Discord" login via server-side Discord OAuth2 → Firebase custom token.

### Non-goals
- Un-gating personal features (alerts/favorites stay login-only — confirmed with owner).
- Running the Discord *bot* / community automation (deferred; only login + optional invite link now).
- Changing the anonymous email newsletter double-opt-in flow.

### Existing state (verified 2026-06-18)
- MCP server live + public at `https://mcp.cambio-uruguay.com/mcp` (`/health` → 200). MCP docs (npm, GitHub, copyable client config) already on `pages/acerca.vue`.
- Telegram account linking built + deployed: `components/account/TelegramLink.vue` → `/api/me/telegram/link-code` → bot `/start <code>` → `/api/telegram/link` (secret-auth) → `UserModel.telegramChatId`. Daily `telegram:summary` task DMs linked users.
- Footer (`components/Footer.vue`) links the Telegram **bot** but not the **channel**; no MCP/Discord links.
- Auth (`stores/auth.ts`): Google popup, email/password, magic-link, anonymous guest. No Discord. Firebase Web SDK; Firebase Admin present server-side (`server/utils/firebaseAdmin.ts`).
- `UserModel` (`server/models/User.ts`) is firebase-uid-keyed with `email`, `name`, `photo`, `settings.locale`, `fcmTokens`, `telegramChatId`.
- `newsletter:daily` task builds one digest per language via `buildDigestData(lang)` + `buildDailyEmail`, sends to confirmed `NewsletterSubscriber` (email-keyed). Per-day dedup marker `NewsletterRun`. SMTP-gated; `DRY_RUN=1` logs.

---

## Module A — Discoverability hub

### A1. Shared MCP config component
Extract the MCP client-config snippet currently inline in `pages/acerca.vue`
(lines ~170–216, 295–319) into `components/McpConfigCard.vue`:
- Props: none (config is constant).
- Renders: title, short description, npm link, GitHub source link, read-only config textarea (`{ mcpServers: { 'cambio-uruguay': { url: 'https://mcp.cambio-uruguay.com/mcp' } } }`), copy button with copied-state.
- `acerca.vue` and `conectar.vue` both consume it. `acerca.vue` refactored to use the component (no behavior change).

### A2. `/conectar` page
- `pages/conectar.vue`, localized route via `@nuxtjs/i18n` (es default, en/pt).
- Card grid (`VRow`/`VCol`, reuse existing card styling / ToolShell conventions). One card per channel:

  | Card | Icon | CTA |
  |---|---|---|
  | Web app | mdi-web | `/` |
  | API | mdi-api | `https://api.cambio-uruguay.com/api-docs` |
  | MCP (AI assistants) | mdi-robot-happy | `<McpConfigCard>` (inline) + `/acerca` |
  | Telegram bot | mdi-telegram | `https://t.me/cambio_uruguay_bot` |
  | Telegram channel | mdi-bullhorn | `https://t.me/cambio_uruguay` |
  | Discord | mdi-discord | "Iniciar sesión con Discord" (→ `/api/auth/discord/start`) + invite if `DISCORD_INVITE_URL` set |
  | Newsletter | mdi-email-newsletter | `/newsletter` |
  | Blog / RSS | mdi-rss | `/blog` |

- SEO: `useSeoMeta` title/description per locale; add to `@nuxtjs/sitemap` config; internal links from footer + header.
- `DISCORD_INVITE_URL` exposed via `runtimeConfig.public.discordInviteUrl` (empty → card shows login only, omit invite button).

### A3. Footer + header links
- `components/Footer.vue`: add icon buttons for Telegram **channel** (mdi-bullhorn), MCP (mdi-robot-happy → `/conectar` or `/acerca#mcp`), Discord (mdi-discord → `/conectar`). Add `Conectar` to footer nav `<nav>`.
- Header/nav menu: add `Conectar` entry (follow existing nav pattern; locate primary nav component during implementation).

### A4. i18n
- New keys under `conectar.*` and `siguenos.channel`/`siguenos.discord`/`siguenos.mcp` in `i18n/locales/{es,en,pt}.*`. All three locales filled (no English fallback gaps).

---

## Module B — Newsletter channel choice

### B1. Data model
Extend `UserModel`:
```ts
newsletter: {
  email: { type: Boolean, default: false },
  telegram: { type: Boolean, default: false },
}
```
Anonymous email subscribers (`NewsletterSubscriber`) unchanged. A logged-in user
opting into email newsletter is represented by upserting a **confirmed**
`NewsletterSubscriber` for their verified email (no double opt-in — they are
authenticated); opting out sets that subscriber to `unsubscribed`.

### B2. API — `server/api/me/newsletter.*`
- `GET /api/me/newsletter` (authed via existing auth util): returns `{ email, telegram, telegramLinked }`.
- `PUT /api/me/newsletter` body `{ email?: boolean, telegram?: boolean }`:
  - Updates `UserModel.newsletter`.
  - `email` change syncs the user's `NewsletterSubscriber` (upsert confirmed / mark unsubscribed) keyed by the user email; requires a non-null verified email (else 422).
  - `telegram:true` requires `telegramChatId` set (else 409 `telegram-not-linked`).

### B3. Task — extend `newsletter:daily`
After the existing email send loop:
- Query `UserModel.find({ 'newsletter.telegram': true, telegramChatId: { $ne: null } })`.
- For each, send a Telegram-formatted digest via `sendTelegram(chatId, msg)`.
- `msg` from new pure formatter `buildDailyTelegram(digest: DigestData, lang)` in `server/utils/newsletter.ts` (Markdown; same numbers/sections as `buildDailyEmail`). Reuses `digestByLang` already built per language.
- Honors `DRY_RUN` (log instead of send) and the shared per-day `NewsletterRun` dedup marker. Returns `{ emailsSent, telegramSent }`.

### B4. UI — account Newsletter panel
- `components/account/NewsletterPanel.vue`, placed in `/cuenta` next to `TelegramLink`/`AlertsPanel`.
- Two `VSwitch`es: Email, Telegram. Telegram disabled with hint ("Vinculá tu Telegram primero") until `telegramLinked`. Reads/writes `/api/me/newsletter` via `useAuthFetch`.
- A `/newsletter` page link nudges logged-in users to the panel for channel choice.

### B5. Tests
- Unit: `buildDailyTelegram` formats numbers/sections per language (vitest, alongside existing newsletter util tests).
- API smoke: PUT telegram without link → 409; with link → persists.

---

## Module C — Discord login (Firebase custom token)

Firebase Auth has no native Discord provider and Discord is not a clean OIDC
provider; the robust pattern is server-side OAuth2 + Firebase Admin custom token.

### C1. Owner-provided credentials
Discord Developer Portal → application + OAuth2:
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- Redirect URI: `https://cambio-uruguay.com/api/auth/discord/callback`
- Scopes: `identify email`
Added to `app/.env` + `runtimeConfig.discord = { clientId, clientSecret, redirectUri }` (server-only; never in `public`).

### C2. Server routes (Nitro)
- `GET /api/auth/discord/start`:
  - Generate random `state` nonce; set signed, `httpOnly`, `SameSite=Lax`, 10-min cookie `dc_state`.
  - 302 → `https://discord.com/oauth2/authorize?response_type=code&client_id=...&scope=identify%20email&redirect_uri=...&state=...&prompt=consent`.
- `GET /api/auth/discord/callback`:
  - Verify `state` matches `dc_state` cookie (else 400); clear cookie.
  - POST `https://discord.com/api/oauth2/token` (code → access_token).
  - GET `https://discord.com/api/users/@me` → `{ id, email, verified, username, global_name, avatar }`.
  - Resolve Firebase uid:
    - If `email` present and `verified`: `admin.auth().getUserByEmail(email)` → use that uid (links Discord to existing account); on `auth/user-not-found` → `createUser({ email, displayName, photoURL })`.
    - If no email: `createUser`/`getUser` keyed by deterministic uid `discord:<id>`.
  - Persist Discord mapping + profile on `UserModel` (`discordId`, fill `name`/`photo` if empty).
  - `admin.auth().createCustomToken(uid)` → 302 → `/cuenta?ct=<token>`.
- Errors → 302 `/cuenta?authError=discord`.

### C3. Client
- `AuthDialog.vue`: add "Continuar con Discord" button (mdi-discord) → `window.location.href = localePath('/api/auth/discord/start')` (full nav, not fetch).
- New plugin `plugins/discordToken.client.ts`: on load, if `route.query.ct`, `signInWithCustomToken(fbAuth(), ct)` then strip `ct` from URL (replaceState). Surface `authError` query to the auth store notice.
- `stores/auth.ts`: add `signInWithCustomToken` import passthrough if needed (or handle entirely in plugin).

### C4. Data model
Extend `UserModel` with `discordId: { type: String, default: null }` (indexed, sparse) for account-linking lookups.

### C5. Security
- `state` nonce verified against signed cookie (CSRF).
- Redirect target hard-fixed to own origin (`/cuenta`), no open redirect.
- Client secret + token exchange server-only.
- Custom token is short-lived + single-use by Firebase; only minted after verified Discord identity.
- Only trust Discord `email` when `verified === true` for account-linking; otherwise treat as Discord-only identity (`discord:<id>`).

### C6. Tests
- Unit: state generate/verify; uid-resolution branch logic (mock Admin) — verified email links, unverified/no-email creates discord-scoped user.

---

## Cross-cutting
- i18n es/en/pt for every new string; default Spanish.
- No new heavy deps: native `fetch` for Discord; Firebase Admin already present.
- Lint/test gates: `npm run lint`, app vitest, bots vitest stay green.

## Rollout / deploy
- Branch → PR → merge to main. Deploy per `memory/deploy.md`: build `app/` (`npm run build`), `pm2 reload cambio-uruguay`.
- New env on server before C goes live: `DISCORD_CLIENT_ID/SECRET`, `DISCORD_REDIRECT_URI`, optional `DISCORD_INVITE_URL`.
- A + B need no new secrets.

## Prerequisites (owner)
- C: create Discord application, provide client id/secret, set redirect URI.
- A: optional Discord server invite URL (`DISCORD_INVITE_URL`); omit → login-only card.
