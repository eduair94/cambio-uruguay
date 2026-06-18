# PWA: Installable + Rich Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the two competing service workers into one (Workbox offline + FCM push) and add a rates snapshot so the last-seen exchange rates survive a fully offline reload, with a clear "saved data" indicator.

**Architecture:** A pure `ratesSnapshot` util persists the processed exchange payload to `localStorage`; `useApiService.getProcessedExchangeData('')` saves on success and restores on failure. The existing `PWANetworkStatus` banner gains a "datos guardados HH:MM" line. The FCM background handler moves into a file imported by the generated Workbox SW (`workbox.importScripts`), and `usePushNotifications` binds to that single SW registration; the standalone `firebase-messaging-sw.js` is deleted.

**Tech Stack:** Nuxt 3, Vue 3 (script setup), Vuetify 3, `@vite-pwa/nuxt` (generateSW), Workbox, Firebase Cloud Messaging (compat), Vitest (node env), Playwright (dev server, port 3311).

## Global Constraints

- Curated Vuetify registry: every component used in a template must be registered in `app/plugins/vuetify.ts` (VSnackbar, VBtn, VIcon already registered — no new components needed).
- i18n key parity across `app/i18n/locales/json/{es,en,pt}.json` is mandatory; a missing key renders the raw key in production.
- Vitest environment is **node** — there is NO `localStorage` in tests. Pure util functions MUST accept an injectable `storage` parameter so tests pass a fake; the default is `globalThis.localStorage`.
- Status (offline / saved data) conveyed by icon + text, never color alone.
- Reuse existing UX: install/update/offline-snackbar UI already exists (`PWAInstallBanner.vue` mounted in `default.vue`, `PWANetworkStatus.vue` mounted in `app.vue`, full `pwa` i18n block). Do NOT rebuild these — extend `PWANetworkStatus` only.
- Keep `registerType: 'autoUpdate'` (the shipped `PWAInstallBanner` already handles update UX). Do NOT switch to `'prompt'`.
- FCM config/credentials must be copied **verbatim** from `app/public/firebase-messaging-sw.js` into the new `firebase-messaging-extra.js`.
- Snapshot localStorage key: `cu:rates-snapshot:v1`; version constant `SNAPSHOT_VERSION = 1`.

---

## File Structure

- `app/utils/ratesSnapshot.ts` (create) — pure snapshot save/load/age + result-resolution helper.
- `app/tests/unit/rates-snapshot.test.ts` (create) — unit tests for the above.
- `app/composables/useApiService.ts` (modify, `getProcessedExchangeData` ~lines 187-229) — save snapshot on success / restore on failure for the current date.
- `app/components/PWANetworkStatus.vue` (modify) — add "saved data HH:MM" line when offline and a snapshot exists.
- `app/i18n/locales/json/{es,en,pt}.json` (modify) — add `pwa.savedDataAt`, `pwa.showingSavedData`.
- `app/public/firebase-messaging-extra.js` (create) — FCM background handler, imported by the Workbox SW.
- `app/nuxt.config.ts` (modify, `@vite-pwa/nuxt` `workbox` block ~line 305) — add `importScripts: ['firebase-messaging-extra.js']`.
- `app/public/firebase-messaging-sw.js` (delete).
- `app/composables/usePushNotifications.ts` (modify) — register against the vite-pwa SW instead of `firebase-messaging-sw.js`.
- `app/tests/e2e/pwa-offline.spec.ts` (create) — offline-notice e2e.

---

### Task 1: ratesSnapshot pure util + tests

**Files:**
- Create: `app/utils/ratesSnapshot.ts`
- Test: `app/tests/unit/rates-snapshot.test.ts`

**Interfaces:**
- Consumes: nothing (pure, leaf util).
- Produces:
  - `SNAPSHOT_VERSION: number` (= 1), `SNAPSHOT_KEY: string` (= `'cu:rates-snapshot:v1'`)
  - `interface RatesSnapshotPayload { exchangeData: unknown[]; localData?: unknown; locations?: unknown[] }`
  - `interface RatesSnapshot extends RatesSnapshotPayload { v: number; ts: number }`
  - `interface ExchangeResultLike { error: unknown; exchangeData: unknown[]; localData?: unknown; locations?: unknown[]; fromSnapshot?: boolean; snapshotTs?: number | null }`
  - `saveSnapshot(payload: RatesSnapshotPayload, storage?: StorageLike | null): void`
  - `loadSnapshot(storage?: StorageLike | null): RatesSnapshot | null`
  - `snapshotAgeLabel(ts: number): string` → `"HH:MM"` (24h, local)
  - `resolveExchangeResult(live: ExchangeResultLike, snapshot: RatesSnapshot | null): ExchangeResultLike`

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/rates-snapshot.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSnapshot,
  loadSnapshot,
  snapshotAgeLabel,
  resolveExchangeResult,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
} from '../../utils/ratesSnapshot'

// Minimal in-memory localStorage fake (vitest runs in node env: no real localStorage).
function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    _map: m,
  }
}

describe('saveSnapshot / loadSnapshot', () => {
  let store: ReturnType<typeof fakeStorage>
  beforeEach(() => {
    store = fakeStorage()
  })

  it('round-trips a payload and stamps version + ts', () => {
    saveSnapshot({ exchangeData: [{ a: 1 }], localData: { x: 1 }, locations: ['MVD'] }, store)
    const snap = loadSnapshot(store)
    expect(snap).not.toBeNull()
    expect(snap!.v).toBe(SNAPSHOT_VERSION)
    expect(typeof snap!.ts).toBe('number')
    expect(snap!.exchangeData).toEqual([{ a: 1 }])
    expect(snap!.locations).toEqual(['MVD'])
  })

  it('does not save an empty exchangeData payload', () => {
    saveSnapshot({ exchangeData: [] }, store)
    expect(store.getItem(SNAPSHOT_KEY)).toBeNull()
  })

  it('returns null when nothing stored', () => {
    expect(loadSnapshot(store)).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    store.setItem(SNAPSHOT_KEY, '{not valid json')
    expect(loadSnapshot(store)).toBeNull()
  })

  it('returns null on version mismatch', () => {
    store.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ v: 999, ts: Date.now(), exchangeData: [{ a: 1 }] })
    )
    expect(loadSnapshot(store)).toBeNull()
  })

  it('returns null when no storage is available', () => {
    saveSnapshot({ exchangeData: [{ a: 1 }] }, null)
    expect(loadSnapshot(null)).toBeNull()
  })
})

describe('snapshotAgeLabel', () => {
  it('formats as HH:MM 24h', () => {
    const label = snapshotAgeLabel(Date.now())
    expect(label).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
  })
})

describe('resolveExchangeResult', () => {
  const snap = { v: 1, ts: 123, exchangeData: [{ s: 1 }], localData: { l: 1 }, locations: ['X'] }

  it('keeps live data when present and error-free', () => {
    const live = { error: null, exchangeData: [{ a: 1 }], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, snap)
    expect(r.exchangeData).toEqual([{ a: 1 }])
    expect(r.fromSnapshot).toBe(false)
    expect(r.snapshotTs).toBeNull()
  })

  it('falls back to snapshot when live is empty and a snapshot exists', () => {
    const live = { error: null, exchangeData: [], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, snap)
    expect(r.exchangeData).toEqual([{ s: 1 }])
    expect(r.fromSnapshot).toBe(true)
    expect(r.snapshotTs).toBe(123)
    expect(r.error).toBeNull()
  })

  it('falls back to snapshot when live errored', () => {
    const live = { error: { message: 'boom' }, exchangeData: [], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, snap)
    expect(r.fromSnapshot).toBe(true)
    expect(r.exchangeData).toEqual([{ s: 1 }])
  })

  it('returns live unchanged when empty and no snapshot', () => {
    const live = { error: null, exchangeData: [], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, null)
    expect(r.exchangeData).toEqual([])
    expect(r.fromSnapshot).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app; npx vitest run tests/unit/rates-snapshot.test.ts`
Expected: FAIL — `Cannot find module '../../utils/ratesSnapshot'`.

- [ ] **Step 3: Write the implementation**

Create `app/utils/ratesSnapshot.ts`:

```ts
export const SNAPSHOT_VERSION = 1
export const SNAPSHOT_KEY = 'cu:rates-snapshot:v1'

export interface RatesSnapshotPayload {
  exchangeData: unknown[]
  localData?: unknown
  locations?: unknown[]
}

export interface RatesSnapshot extends RatesSnapshotPayload {
  v: number
  ts: number
}

export interface ExchangeResultLike {
  error: unknown
  exchangeData: unknown[]
  localData?: unknown
  locations?: unknown[]
  fromSnapshot?: boolean
  snapshotTs?: number | null
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage
    return ls ?? null
  } catch {
    // Access to localStorage can throw in some privacy modes / sandboxes.
    return null
  }
}

export function saveSnapshot(
  payload: RatesSnapshotPayload,
  storage: StorageLike | null = defaultStorage()
): void {
  if (!storage) return
  if (!payload || !Array.isArray(payload.exchangeData) || payload.exchangeData.length === 0) return
  const snap: RatesSnapshot = { v: SNAPSHOT_VERSION, ts: Date.now(), ...payload }
  try {
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(snap))
  } catch {
    // Quota or serialization errors are non-fatal — offline cache is best-effort.
  }
}

export function loadSnapshot(
  storage: StorageLike | null = defaultStorage()
): RatesSnapshot | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(SNAPSHOT_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const p = parsed as Partial<RatesSnapshot> | null
  if (!p || p.v !== SNAPSHOT_VERSION || typeof p.ts !== 'number') return null
  if (!Array.isArray(p.exchangeData) || p.exchangeData.length === 0) return null
  return p as RatesSnapshot
}

export function snapshotAgeLabel(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function resolveExchangeResult(
  live: ExchangeResultLike,
  snapshot: RatesSnapshot | null
): ExchangeResultLike {
  const liveOk =
    !!live && !live.error && Array.isArray(live.exchangeData) && live.exchangeData.length > 0
  if (liveOk) return { ...live, fromSnapshot: false, snapshotTs: null }
  if (snapshot) {
    return {
      error: null,
      exchangeData: snapshot.exchangeData,
      localData: snapshot.localData,
      locations: snapshot.locations ?? [],
      fromSnapshot: true,
      snapshotTs: snapshot.ts,
    }
  }
  return { ...live, fromSnapshot: false, snapshotTs: null }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app; npx vitest run tests/unit/rates-snapshot.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add app/utils/ratesSnapshot.ts app/tests/unit/rates-snapshot.test.ts
git commit -m "feat(pwa): rates snapshot pure util (save/load/resolve) + tests"
```

---

### Task 2: Snapshot save/restore in getProcessedExchangeData

**Files:**
- Modify: `app/composables/useApiService.ts` (`getProcessedExchangeData`, ~lines 187-229)

**Interfaces:**
- Consumes from Task 1: `saveSnapshot`, `loadSnapshot`, `resolveExchangeResult`.
- Produces: same return shape as today plus optional `fromSnapshot?: boolean` and `snapshotTs?: number | null` fields (additive; existing callers ignore them).

- [ ] **Step 1: Add the import**

At the top of `app/composables/useApiService.ts`, add (Nuxt auto-imports utils, but import explicitly to be safe and keep it greppable):

```ts
import { saveSnapshot, loadSnapshot, resolveExchangeResult } from '~/utils/ratesSnapshot'
```

- [ ] **Step 2: Replace the body of `getProcessedExchangeData`**

Replace the existing function (the `const getProcessedExchangeData = async (date: string) => { ... }` block, ~lines 187-230) with:

```ts
  const getProcessedExchangeData = async (date: string) => {
    const isCurrent = date === ''
    try {
      const { exchangeData, localData } = await getExchangeDataWithLocal(date)

      // Check for errors in the response
      const exchangeError = exchangeData?.error
      const localDataError = localData?.error

      const live = exchangeError || localDataError
        ? {
            error: exchangeError,
            exchangeData: [] as any[],
            localData: localDataError ? {} : localData,
            locations: localDataError ? [] : getLocations(localData),
          }
        : {
            error: null,
            exchangeData: processExchangeData(exchangeData, localData),
            localData,
            locations: getLocations(localData),
          }

      // Snapshot only applies to the current day's rates (date === '').
      if (!isCurrent) return live
      if (import.meta.client && live.error == null && live.exchangeData.length > 0) {
        saveSnapshot({
          exchangeData: live.exchangeData,
          localData: live.localData,
          locations: live.locations,
        })
        return resolveExchangeResult(live, null)
      }
      return resolveExchangeResult(live, import.meta.client ? loadSnapshot() : null)
    } catch (error: any) {
      console.error('API Error for date', date, ':', error)

      // Create detailed error response
      const errorResponse = {
        message: error?.message || 'An error occurred while fetching exchange data',
        status: error?.status || null,
        statusText: error?.statusText || null,
        data: error?.data || null,
        stack: error?.stack || null,
        originalError: error,
      }

      // Offline / network failure for today: serve the last good snapshot if we have one.
      if (isCurrent && import.meta.client) {
        const snap = loadSnapshot()
        if (snap) {
          return resolveExchangeResult(
            { error: errorResponse, exchangeData: [], localData: {}, locations: [] },
            snap
          )
        }
      }

      return {
        exchangeData: [],
        localData: {},
        locations: [],
        error: errorResponse,
      }
    }
  }
```

- [ ] **Step 3: Run the full unit suite (no regressions)**

Run: `cd app; npx vitest run`
Expected: PASS — same count as before plus Task 1's tests (no new unit test here; this is integration glued onto Task 1's tested helpers).

- [ ] **Step 4: Typecheck the touched file**

Run: `cd app; npx nuxt typecheck 2>&1 | Select-String -Pattern "useApiService|ratesSnapshot"`
Expected: no output (no new type errors in the touched files). If `nuxt typecheck` panics internally (known vue-tsc flake), confirm no error lines mention `useApiService`/`ratesSnapshot` and proceed.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useApiService.ts
git commit -m "feat(pwa): persist + restore today's rates snapshot in getProcessedExchangeData"
```

---

### Task 3: Offline "saved data" indicator in PWANetworkStatus

**Files:**
- Modify: `app/components/PWANetworkStatus.vue`
- Modify: `app/i18n/locales/json/{es,en,pt}.json`

**Interfaces:**
- Consumes from Task 1: `loadSnapshot`, `snapshotAgeLabel`.
- Produces: no exported API (UI only).

- [ ] **Step 1: Add i18n keys (all three locales, identical keys)**

In `app/i18n/locales/json/es.json`, inside the existing `"pwa"` block, add:

```json
    "showingSavedData": "Sin conexión · mostrando datos guardados",
    "savedDataAt": "Datos guardados a las {time}"
```

In `app/i18n/locales/json/en.json`, inside `"pwa"`:

```json
    "showingSavedData": "Offline · showing saved data",
    "savedDataAt": "Saved at {time}"
```

In `app/i18n/locales/json/pt.json`, inside `"pwa"`:

```json
    "showingSavedData": "Sem conexão · mostrando dados salvos",
    "savedDataAt": "Dados salvos às {time}"
```

(Place each pair after an existing `pwa` key, e.g. right after `"offline"`. Mind trailing commas so the JSON stays valid.)

- [ ] **Step 2: Extend the offline snackbar to show the snapshot time**

In `app/components/PWANetworkStatus.vue`, replace the offline `v-snackbar` body (the first snackbar) so it shows the saved-data line when a snapshot exists. New template for that snackbar:

```html
    <v-snackbar v-model="showOfflineSnackbar" :timeout="-1" color="error" bottom left>
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-wifi-off</v-icon>
        <div>
          <div>{{ savedAtLabel ? $t('pwa.showingSavedData') : $t('pwa.offline') }}</div>
          <div v-if="savedAtLabel" class="text-caption">{{ savedAtLabel }}</div>
        </div>
      </div>
      <template #actions="{ isActive }">
        <v-btn color="white" text v-bind="isActive" @click="showOfflineSnackbar = false">
          {{ $t('pwa.dismiss') }}
        </v-btn>
      </template>
    </v-snackbar>
```

In the `<script setup lang="ts">`, add the snapshot lookup. Add the import and a `savedAtLabel` ref computed on mount (avoid SSR access to localStorage):

```ts
import { loadSnapshot, snapshotAgeLabel } from '~/utils/ratesSnapshot'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const savedAtLabel = ref('')

const refreshSavedLabel = () => {
  const snap = loadSnapshot()
  savedAtLabel.value = snap ? t('pwa.savedDataAt', { time: snapshotAgeLabel(snap.ts) }) : ''
}
```

In the existing `handleOffline` method, call `refreshSavedLabel()` so the label is current when going offline:

```ts
const handleOffline = () => {
  showOnlineSnackbar.value = false
  refreshSavedLabel()
  showOfflineSnackbar.value = true
}
```

And in `setupNetworkListeners`, when the initial state is already offline, also refresh the label before showing:

```ts
    // Check initial status only on client side
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      refreshSavedLabel()
      showOfflineSnackbar.value = true
    }
```

- [ ] **Step 3: Verify Vuetify registry**

Confirm `VIcon` is registered in `app/plugins/vuetify.ts` (it is). `mdi-wifi-off` is a standard MDI icon (mdi font already loaded). No registry change needed.

- [ ] **Step 4: Run the full unit suite + i18n parity**

Run: `cd app; npx vitest run`
Expected: PASS, including the i18n parity test (proves `showingSavedData` + `savedDataAt` exist in all three locales).

- [ ] **Step 5: Commit**

```bash
git add app/components/PWANetworkStatus.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(pwa): show 'saved data HH:MM' on the offline banner"
```

---

### Task 4: Unify the service worker (Workbox + FCM)

**Files:**
- Create: `app/public/firebase-messaging-extra.js`
- Modify: `app/nuxt.config.ts` (`@vite-pwa/nuxt` `workbox` block, ~line 305)
- Delete: `app/public/firebase-messaging-sw.js`
- Modify: `app/composables/usePushNotifications.ts`

**Interfaces:**
- Consumes: the generated Workbox SW (`/sw.js`) which will `importScripts('firebase-messaging-extra.js')`.
- Produces: a single SW registration that serves offline caching AND background push.

- [ ] **Step 1: Create the FCM handler imported by the Workbox SW**

Create `app/public/firebase-messaging-extra.js` with the FCM logic copied **verbatim** from the current `firebase-messaging-sw.js` (same config, same handlers):

```js
/* global importScripts, firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAk9gmrq82O1v_jHtkTE8Ubf3nk9JN2Avg',
  authDomain: 'cambiouruguay-d69e9.firebaseapp.com',
  projectId: 'cambiouruguay-d69e9',
  messagingSenderId: '473510862323',
  appId: '1:473510862323:web:07d3e4888e1a040d50c686',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const n = payload.notification || {}
  self.registration.showNotification(n.title || 'Cambio Uruguay', {
    body: n.body || '',
    icon: '/android-chrome-192x192.png',
    data: { url: 'https://cambio-uruguay.com/cuenta' },
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/cuenta'))
})
```

- [ ] **Step 2: Tell Workbox to import it into the generated SW**

In `app/nuxt.config.ts`, inside the `@vite-pwa/nuxt` `workbox: { ... }` object (the one starting ~line 305 with `navigateFallback: '/'`), add an `importScripts` entry as the first property:

```ts
        workbox: {
          importScripts: ['firebase-messaging-extra.js'],
          navigateFallback: '/',
          globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB max
          runtimeCaching: [
            // ...unchanged...
          ],
        },
```

(Leave every other workbox property exactly as-is — only add the `importScripts` line.)

- [ ] **Step 3: Delete the standalone FCM service worker**

```bash
git rm app/public/firebase-messaging-sw.js
```

- [ ] **Step 4: Point push registration at the unified SW**

In `app/composables/usePushNotifications.ts`, replace the `swReg` acquisition. Replace this line:

```ts
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
```

with:

```ts
    // Bind FCM to the single vite-pwa Workbox SW (which importScripts the FCM
    // handler). In dev the PWA module is disabled, so fall back to any existing
    // registration; if there is none, push is unavailable.
    const { $pwa } = useNuxtApp() as { $pwa?: { getSWRegistration?: () => ServiceWorkerRegistration | undefined } }
    const swReg =
      $pwa?.getSWRegistration?.() ?? (await navigator.serviceWorker.getRegistration())
    if (!swReg) return 'unsupported'
```

The subsequent `getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg })` call is unchanged and now receives the unified registration.

- [ ] **Step 5: Verify the production build emits one SW that imports the FCM handler**

Run: `cd app; npx nuxt build 2>&1 | Select-String -Pattern "sw.js|workbox|precache" | Select-Object -First 5`
Then confirm the generated SW imports the FCM file:

Run: `Select-String -Path app/.output/public/sw.js -Pattern "firebase-messaging-extra" -SimpleMatch`
Expected: at least one match (the `importScripts('firebase-messaging-extra.js')` injected by Workbox). Also confirm `app/.output/public/firebase-messaging-extra.js` exists and `app/.output/public/firebase-messaging-sw.js` does NOT.

- [ ] **Step 6: Commit**

```bash
git add app/public/firebase-messaging-extra.js app/nuxt.config.ts app/composables/usePushNotifications.ts
git commit -m "fix(pwa): unify Workbox + FCM into one service worker; drop standalone firebase-messaging-sw"
```

---

### Task 5: Offline-notice e2e + verification

**Files:**
- Create: `app/tests/e2e/pwa-offline.spec.ts`

**Interfaces:**
- Consumes: the running dev server (port 3311) and the snapshot key `cu:rates-snapshot:v1`.
- Produces: nothing (test only).

**Note on scope:** the dev server disables the PWA SW, so a true offline *reload* cannot be exercised in dev. This e2e verifies the new user-visible signal — the offline "saved data" banner — by seeding a snapshot and dispatching the browser `offline` event. Full offline rendering is verified manually on the production build (see plan verification).

- [ ] **Step 1: Write the e2e test**

Create `app/tests/e2e/pwa-offline.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('offline banner shows the saved-data time when a snapshot exists', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Seed a rates snapshot, then simulate going offline.
  await page.evaluate(() => {
    localStorage.setItem(
      'cu:rates-snapshot:v1',
      JSON.stringify({ v: 1, ts: Date.now(), exchangeData: [{ a: 1 }], localData: {}, locations: [] })
    )
    window.dispatchEvent(new Event('offline'))
  })

  // The offline banner shows the saved-data line (es/en/pt copy all match this regex).
  await expect(
    page.getByText(/datos guardados|saved at|dados salvos|mostrando datos guardados|showing saved data|mostrando dados salvos/i).first()
  ).toBeVisible()

  expect(errors).toEqual([])
})
```

- [ ] **Step 2: Run the e2e test**

Run: `cd app; npx playwright test tests/e2e/pwa-offline.spec.ts`
Expected: PASS (1 test). If the dev server is not already running, Playwright starts it (`reuseExistingServer: true`).

- [ ] **Step 3: Commit**

```bash
git add app/tests/e2e/pwa-offline.spec.ts
git commit -m "test(pwa): e2e for the offline saved-data banner"
```

---

## Plan Verification (after all tasks)

1. `cd app; npx vitest run` — full unit suite green (includes new snapshot tests + i18n parity).
2. `cd app; npx nuxt build` — builds clean; `app/.output/public/sw.js` contains `importScripts('firebase-messaging-extra.js')`; `firebase-messaging-extra.js` present; `firebase-messaging-sw.js` absent.
3. Manual (prod build, `node app/.output/server/index.mjs` or on the deployed server):
   - Load home once online (snapshot saved), then DevTools → Network → Offline → reload: the rate table renders cached rows and the offline banner reads "datos guardados HH:MM".
   - Lighthouse PWA audit: installable (manifest valid, SW controls page).
   - **Push regression check (the explicit risk):** enable notifications from `/cuenta`, confirm `getToken` returns a token (bound to `/sw.js`) and a test push shows a background notification. This proves the SW unification didn't break FCM.

---

## Self-Review

**Spec coverage:**
- SW unification (spec Unit 1) → Task 4. ✅
- Rates snapshot rich offline (spec Unit 2) → Tasks 1-2. ✅
- Offline indicator with timestamp (spec Unit 3, offline banner) → Task 3. ✅
- Install button / update prompt (spec Unit 3) → already exist (`PWAInstallBanner`); reused, not rebuilt (documented in Global Constraints). ✅
- Testing (spec) → Task 1 unit, Task 5 e2e, manual/Lighthouse in Plan Verification. ✅
- Deviation from spec: spec proposed switching `registerType` to `'prompt'` and adding new `PwaInstallButton`/`PwaUpdatePrompt` components. Discovery showed these already exist as `PWAInstallBanner` with its own update detection under `autoUpdate`. To avoid regressing shipped UX, this plan keeps `autoUpdate` and reuses the existing components. This is a controller decision recorded here for the reviewer.

**Placeholder scan:** none — every code step has complete code.

**Type consistency:** `RatesSnapshot`/`ExchangeResultLike`/`saveSnapshot`/`loadSnapshot`/`resolveExchangeResult`/`snapshotAgeLabel` names are identical across Tasks 1-3 and the test. Snapshot key `cu:rates-snapshot:v1` identical in util, Task 2, Task 3, and Task 5. `$pwa.getSWRegistration()` matches the verified `@vite-pwa/nuxt` injection API.
