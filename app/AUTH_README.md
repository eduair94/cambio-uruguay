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
