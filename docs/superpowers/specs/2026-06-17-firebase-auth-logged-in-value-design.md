# Firebase Login + Logged-In Value — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation plan
**Scope:** Add Firebase authentication to cambio-uruguay and deliver durable value to logged-in users via favorites, saved tool results with rate drift, and (phase 2) rate alerts with push + email.

## Goal

Let users sign in and get a personalized, recurring-value experience on top of the exchange-rate comparison site:

1. **Favorites / watchlist** — save casas de cambio + currencies; personalized dashboard.
2. **Saved history + drift** — save a conversion or tool result, revisit later, and see how the rate moved since the day it was saved.
3. **Rate alerts** (phase 2) — set a target rate; get notified by web push + email when hit.

## Decisions (locked during brainstorming)

| Topic | Decision |
|-------|----------|
| Auth provider | Firebase Auth (Web SDK client + Admin server) |
| Sign-in methods | Google OAuth + email/password (verify + reset) + email magic link |
| Value features | Favorites + saved-history-with-drift + rate alerts |
| Notify channels (alerts) | Web push (FCM) **and** email |
| Email transport | Nodemailer + SMTP |
| User data store | MongoDB (Mongoose, already a dependency) |
| Delivery | Phased — Phase 1 ships auth + favorites + saved-history; Phase 2 adds alerts + notifications |

## Architecture

```
Browser (Nuxt 3 / Vue 3 / Vuetify / Pinia)
  │  Firebase Web SDK  → sign-in, holds ID token
  │  Authorization: Bearer <idToken>
  ▼
Nitro server  /api/me/*
  │  Firebase Admin → verifyIdToken() → uid   (requireUser)
  │  Mongoose models, always scoped by verified uid
  ▼
MongoDB (users, favorites, saved items, alerts)

External rate API (api.cambio-uruguay.com)
  /            live rates
  /evolution/{origin}/{currency}[/{type}]  history (drift sparkline, optional)
```

Reuses existing patterns: `runtimeConfig` for secrets/public config, Mongoose, Nitro `experimental.tasks` scheduled tasks (already enabled, see `nuxt.config.ts` `scheduledTasks`), Vuetify dialogs, `@nuxtjs/i18n` (es/en/pt).

### Why this shape

- **Token verified server-side on every request.** The client uid is never trusted; `requireUser(event)` calls `admin.auth().verifyIdToken(bearer)` and returns the uid used to scope all queries.
- **Firebase web config is public by design** (apiKey, authDomain, etc. are not secrets) → `runtimeConfig.public.firebase`.
- **Service account JSON is secret** → server-only `runtimeConfig`, supplied base64-encoded via env.
- **Drift needs no time-series storage**: snapshot the rate at save time, compare to a live re-fetch on view.

## Components

### Client

| Unit | Purpose | Depends on |
|------|---------|-----------|
| `plugins/firebase.client.ts` | Init Firebase app w/ public web config; `getAuth()`; wire `onAuthStateChanged` → auth store | `firebase`, runtimeConfig.public.firebase |
| `stores/auth.ts` (Pinia) | State: user {uid,email,name,photo}, idToken, loading, emailVerified. Actions: `signInWithGoogle`, `signInWithEmail`, `register`, `sendMagicLink`, `completeMagicLink`, `resetPassword`, `signOut` | Firebase Auth |
| `components/AuthDialog.vue` | Vuetify dialog, tabs: Google button / email+password / magic link. Handles verify + reset prompts | auth store |
| `components/AccountMenu.vue` | Header menu (LanguageMenu pattern): logged-out → login button; logged-in → avatar + menu (Mi cuenta, Favoritos, Guardados, Alertas, Salir) | auth store |
| `composables/useAuthFetch.ts` | Wrapper over `$fetch` that attaches `Authorization: Bearer <getIdToken()>` (auto-refresh) | auth store |
| `components/SaveResultButton.vue` | Shown only when logged-in. Props: {kind, toolSlug, title, inputs, result, snapshot}. POSTs to `/api/me/saved` | useAuthFetch |
| `components/FavoriteStar.vue` | Toggle star on rate-table rows / casa pages | useAuthFetch |
| `pages/cuenta/index.vue` | Dashboard: Favoritos, Guardados, Alertas (P2), Ajustes sections | useAuthFetch, guarded |
| `middleware/auth.ts` | Redirect to home/open AuthDialog if not authenticated | auth store |

### Server

| Unit | Purpose |
|------|---------|
| `server/utils/firebaseAdmin.ts` | Lazy-init Firebase Admin from base64 service-account env; export `adminAuth` |
| `server/utils/auth.ts` | `requireUser(event)` → verify bearer ID token → return {uid, email}; throw 401 otherwise |
| `server/utils/db.ts` | Mongoose connect singleton (reuse connection across invocations) |
| `server/models/User.ts` | uid (_id), email, name, settings{locale, defaultDirection, notify}, createdAt; (+ `fcmTokens[]` P2) |
| `server/models/Favorite.ts` | uid, type (casa\|currency\|pair), key, label, createdAt; unique index (uid, type, key) |
| `server/models/SavedItem.ts` | uid, kind (conversion\|tool), toolSlug, title, inputs{}, result{}, snapshot{origin, currency, direction, rate, capturedAt}, createdAt |
| `server/models/Alert.ts` (P2) | uid, currency, origin\|'any', direction (compra\|venta), op (<,>,<=,>=), target, channels{push,email}, active, lastFiredAt, createdAt |
| `server/api/me/favorites/*` | GET list, POST add, DELETE remove (uid-scoped) |
| `server/api/me/saved/*` | GET list, GET :id (with computed drift), POST add, DELETE remove |
| `server/api/me/profile.get.ts` | Ensure/return User doc on first sign-in |
| `server/api/me/alerts/*` (P2) | CRUD |
| `server/tasks/alerts/check.ts` (P2) | Scheduled task: fetch rates, eval active alerts, fire push+email, set lastFiredAt |
| `server/utils/mailer.ts` (P2) | Nodemailer SMTP transport + alert email template |
| `server/utils/push.ts` (P2) | FCM send to stored tokens; prune invalid tokens |

## Data Flow

### Sign-in
1. User clicks login → `AuthDialog` → chosen method → Firebase Auth resolves.
2. `onAuthStateChanged` updates `stores/auth.ts`.
3. First authenticated call hits `/api/me/profile` which upserts the `User` doc.

### Save a tool result (drift feature)
1. User runs `conversor-de-monedas` or `/convertir`; result rendered.
2. `<SaveResultButton>` posts `{kind, toolSlug, title, inputs, result, snapshot{origin, currency, direction, rate, capturedAt}}` to `/api/me/saved`.
3. On dashboard "Guardados", `GET /api/me/saved/:id` re-fetches the **current** rate for the same origin/currency/direction and returns `drift = (current - snapshot.rate) / snapshot.rate`. UI shows then-value, now-value, delta% (green ↑ / red ↓). Optional `/evolution` sparkline from save date.

### Favorites
1. `FavoriteStar` toggles → POST/DELETE `/api/me/favorites`.
2. Dashboard "Favoritos" lists saved keys and renders their live rates using the existing rate fetch.

### Alerts (Phase 2)
1. User creates alert in dashboard → POST `/api/me/alerts`.
2. Scheduled task `alerts:check` (~every 10 min) fetches live rates, evaluates each active alert's `op`/`target` against the matching origin/currency/direction.
3. On match: send web push (FCM) + email (Nodemailer), set `lastFiredAt`, de-dupe (don't refire until condition resets or cooldown elapses).

## Error Handling

- **401 / expired token** → client refreshes via `getIdToken(true)`; if still failing, sign out + reopen AuthDialog.
- **Unverified email** (email/password) → allow sign-in but gate write actions with a "verify your email" prompt; offer resend.
- **External rate API failure during drift compute** → return saved snapshot with `drift: null` + "rate unavailable" state, never error the whole list.
- **Mongo unavailable** → 503 with retry-friendly message; auth still works (read-only degraded).
- **Duplicate favorite** → unique index → treat as idempotent success.
- **FCM token invalid** (P2) → prune from `fcmTokens` on send failure.

## Config / Secrets

| Key | Visibility | Notes |
|-----|-----------|-------|
| `runtimeConfig.public.firebase` | public | apiKey, authDomain, projectId, appId, messagingSenderId |
| `FIREBASE_SERVICE_ACCOUNT` | secret | base64-encoded JSON, server `runtimeConfig` |
| `MONGO_URI` | secret | server `runtimeConfig` |
| `SMTP_*` (host, port, user, pass, from) | secret | Phase 2 |
| `FCM_VAPID_KEY` | public | Phase 2, web push |

## Testing

TDD where it pays off (Vitest already configured):

- **Pure functions:** drift calc (`(current - snapshot)/snapshot`, edge cases: zero, missing, negative) — unit, written first.
- **Auth store actions:** mock Firebase Auth; assert state transitions + error paths.
- **Server handlers:** mock `verifyIdToken` + mocked Mongoose models; assert uid-scoping (user A cannot read user B), validation, idempotent favorite.
- **E2E (Playwright smoke):** AuthDialog renders all three methods; `middleware/auth.ts` redirects unauthenticated `/cuenta`.

## Security

- ID token verified server-side on every `/api/me/*` request; uid taken only from the verified token.
- All Mongo queries scoped by that uid; cross-user access impossible by construction.
- Firebase web apiKey is public (not a secret) — safe to expose.
- Service account JSON + SMTP creds are server-only secrets via env/runtimeConfig.
- Light rate-limiting on `/api/me/*` writes.

## Phase Boundaries

**Phase 1 (implement now)**
- Firebase client init + auth store + AuthDialog (Google + email/pwd + magic link) + email verify + reset.
- Firebase Admin verify + `requireUser` + Mongo connect + `User` model + `/api/me/profile`.
- Favorites: model + API CRUD + `FavoriteStar` + dashboard list.
- Saved-history: model + API CRUD + `SaveResultButton` on currency tools + dashboard list with drift.
- Account page + `middleware/auth.ts` + header `AccountMenu`.
- i18n strings (es/en/pt).
- Tests: drift unit, auth store, server-handler uid-scoping, AuthDialog/middleware smoke.

**Phase 2 (later)**
- `Alert` model + CRUD UI + notify prefs in settings.
- FCM web push: service-worker messaging, store/prune `fcmTokens`, foreground/background handlers, VAPID key.
- Nodemailer SMTP `mailer.ts` + alert email template.
- `server/tasks/alerts/check.ts` scheduled task + cron entry, de-dupe/cooldown.

## Out of Scope (YAGNI)

- Portfolio tracking / P&L.
- Social/Apple sign-in (Google + email + magic link only).
- Drift on non-FX calculators (IRPF, IVA, etc.) — save inputs/result only, no rate drift.
- Cross-device push beyond web (no native apps).
