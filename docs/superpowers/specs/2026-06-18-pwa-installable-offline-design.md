# PWA: Installable + Rich Offline — Design Spec

**Date:** 2026-06-18
**Status:** Approved
**Site:** cambio-uruguay (Nuxt 3 / Vue 3 script-setup / Vuetify 3 / Pinia / @nuxtjs/i18n)

## Goal

Ship a genuinely installable PWA with rich offline support: one service worker that handles **both** Workbox offline caching **and** Firebase Cloud Messaging (FCM) push, plus modern install / update / offline UX, with the last-seen exchange rates surviving a full offline reload.

## Problem

The base PWA is already configured (`@vite-pwa/nuxt` with `generateSW`, autoUpdate, manifest, icons, Workbox runtimeCaching for fonts + `/api/*` NetworkFirst). But two service workers register at scope `/`:

- `/sw.js` — vite-pwa generated Workbox SW (`registerType: 'autoUpdate'`)
- `/firebase-messaging-sw.js` — FCM background handler, registered manually in `usePushNotifications.ts`

Both default to scope `/`, so they clobber each other's registration — whichever registers last controls the page. Result: offline caching and push can't both work reliably. This is the central defect to fix.

Additionally, offline today relies only on Workbox NetworkFirst `/api/*` caching: a route never visited before going offline shows blank. There is no install button, no update prompt, no offline indicator.

## Architecture

### Unit 1 — Unified service worker (the core fix)

**Chosen approach (A):** keep `generateSW`; inject the FCM handler into the generated SW via Workbox `importScripts`.

- New `app/public/firebase-messaging-extra.js` holds the FCM init + `onBackgroundMessage` + `notificationclick` logic currently in `firebase-messaging-sw.js`.
- `nuxt.config.ts` → `@vite-pwa/nuxt` `workbox.importScripts: ['firebase-messaging-extra.js']`.
- Delete `app/public/firebase-messaging-sw.js`.
- `app/composables/usePushNotifications.ts`: stop registering its own SW; obtain the vite-pwa registration (`await navigator.serviceWorker.ready`) and pass it to `getToken({ serviceWorkerRegistration })`. This keeps FCM token retrieval bound to the single SW.

The existing `workbox.runtimeCaching` config is untouched — lowest regression risk on caching and push.

**Rejected approach (B):** switch to `injectManifest` with a hand-written SW. More control but rewrites the working runtimeCaching block and risks breaking push. Not warranted.

### Unit 2 — Rich offline data (rates snapshot)

- `app/utils/ratesSnapshot.ts` — pure, tested:
  - `saveSnapshot(rows)`: writes `{ v: SNAPSHOT_VERSION, ts: Date.now(), rows }` to `localStorage` under a fixed key.
  - `loadSnapshot()`: returns `{ ts, rows } | null`; returns `null` on missing, JSON-parse error, or version mismatch.
  - `snapshotAgeLabel(ts, now?)`: returns a short `HH:MM`-style timestamp/label for display.
- Integrate into `useExchangeRates` (or a thin `useRatesSnapshot` composable): on a successful rates load, call `saveSnapshot`; when the fetch fails or the device is offline and `rows` is empty, hydrate `rows` from `loadSnapshot()` and expose an `usingSnapshot` flag + snapshot `ts`.
- Storage choice: `localStorage` (rows payload is a few KB) — IndexedDB is overkill here.

### Unit 3 — UX layer

All user-facing strings keyed in es/en/pt under a new `pwa` i18n block (identical keys across locales).

- `app/composables/useOnline.ts` — reactive `online` boolean from `navigator.onLine` + `online`/`offline` events; SSR-safe (defaults to `true` on server).
- `app/components/OfflineBanner.vue` — shows when offline: "Sin conexión · datos guardados HH:MM" (uses snapshot `ts`). Mounted app-wide in `app/layouts/default.vue`, wrapped in `<ClientOnly>`.
- `app/components/PwaInstallButton.vue` — captures `beforeinstallprompt` (preventDefault + stash event), renders a custom "Instalar app" button that calls `prompt()`; hidden when already installed (`matchMedia('(display-mode: standalone)')`) or when no prompt event is available. Mounted in `AccountMenu` and/or footer.
- `app/components/PwaUpdatePrompt.vue` — switch `registerType` from `'autoUpdate'` to `'prompt'`; use vite-pwa `useRegisterSW()`; when `needRefresh`, show a `VSnackbar` "Nueva versión disponible — Actualizar" that calls `updateServiceWorker(true)`. Mounted app-wide in `default.vue`.

### Data flow

1. App loads → `useExchangeRates` fetches `/api/*` (Workbox NetworkFirst, 5 min). On success → `saveSnapshot(rows)`.
2. Offline reload → SW serves precached app shell + cached `/api/*` if present; if the API isn't cached or fails, the composable hydrates `rows` from `loadSnapshot()` and sets `usingSnapshot=true`.
3. `OfflineBanner` reads `useOnline()` + snapshot `ts` → renders the offline + "datos guardados HH:MM" notice.
4. Background push → unified SW (`firebase-messaging-extra.js` handler) shows the notification.
5. New deploy → SW update detected → `PwaUpdatePrompt` snackbar → user taps Actualizar → reload onto new SW.

## Error handling

- Snapshot missing / corrupt JSON / version mismatch → `loadSnapshot()` returns `null`; app behaves as no-cache (no crash).
- `beforeinstallprompt` never fires (already installed, unsupported browser, iOS Safari) → install button stays hidden. No error surfaced.
- FCM registration: if `navigator.serviceWorker.ready` rejects or messaging unsupported → push silently unavailable (existing `isSupported()` guard retained); rest of PWA unaffected.
- SW update flow: `prompt` mode means no silent reload; if the user ignores the toast, the old SW keeps serving until next visit.

## Testing

- **Unit (Vitest):** `ratesSnapshot.ts` — save→load round-trip, `null` on absent, `null` on corrupt JSON, `null` on version mismatch, `snapshotAgeLabel` formatting. `useOnline` reactive toggle where pure-testable.
- **e2e (Playwright):** install button visibility via a mocked `beforeinstallprompt` dispatch; offline banner appears and rates render from snapshot via `context.setOffline(true)` after a warm load.
- **Manual / Lighthouse:** PWA installability audit passes (manifest valid, SW controls page, icons present) post-deploy; verify push still fires after SW unification (the explicit risk to confirm before declaring done).

## Constraints (global)

- Curated Vuetify registry: every component used in a template must be registered in `app/plugins/vuetify.ts` (VSnackbar / VBtn / VIcon / VAlert already registered — verify before use).
- Data-fetching / browser-API modules mounted on SSR pages must be wrapped in `<ClientOnly>` to avoid hydration mismatch.
- i18n key parity across es/en/pt is mandatory (a missing key renders the raw key in production).
- Up/down or status conveyed by icon + text, never color alone.
- Reuse existing utils (`useExchangeRates`, `formatNumber`) — do not duplicate.
- FCM credentials/config already live in `firebase-messaging-sw.js`; move them verbatim into `firebase-messaging-extra.js`.

## Out of scope (YAGNI)

- IndexedDB persistence, background sync, periodic background fetch of rates.
- Offline write/queueing of user actions (favorites/alerts) — online-only as today.
- iOS custom install instructions page (browser limitation; button simply hides).
