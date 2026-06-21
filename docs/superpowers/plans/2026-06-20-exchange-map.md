# Exchange-House Map + "Best Rates Near You" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an interactive OpenStreetMap of every casa-de-cambio branch in Uruguay plus a tourist tool that ranks the best exchange rate within a chosen radius.

**Architecture:** A thin Express endpoint `/locations` returns all geocoded branches from Mongo (`bcu_suc`). A Nuxt Nitro route `/api/locations` fetches that, merges a curated `extra-locations.json` (the Max-effort additions), and caches the unified list. The `/mapa` page renders the list with Leaflet (clustered markers), joins it with existing per-casa rates by `origin`, and ranks nearby branches with a pure, unit-tested util. A reusable client-only `LocationsMap` component is also embedded on per-casa branch pages.

**Tech Stack:** Nuxt 4 / Vue 3 (`<script setup lang="ts">`), Vuetify 3.9 (V-prefixed components, explicit imports — no auto-import), Leaflet 1.9 + `leaflet.markercluster` (new dep), `@nuxtjs/i18n` (es/en/pt), vitest (app unit tests), Express + Mongoose + Redis (backend at repo root).

## Global Constraints

- Frontend components use `<script setup lang="ts">`, props via `defineProps<Props>()`, Vuetify V-prefixed components, and **explicit** component imports (`import X from '~/components/...'`). No component auto-import.
- All user-facing strings go through `useI18n()` `t('...')` with keys added to all three of `app/i18n/locales/json/{es,en,pt}.json`.
- Backend routes use `server.getJson("path", async (req: Request): Promise<any> => {...})` and cache via `redisCache.getOrSet(key, fetcher, ttlSeconds)`. Cache keys use `resource:param` style.
- App unit tests live in `app/tests/unit/**/*.{test,spec}.ts`, run with `npm run test` (= `vitest run`) from `app/`, node environment, `globals: true`. Tested logic must be free of Nuxt auto-imports.
- The backend (repo root) has **no** test runner; backend changes are verified by manual `curl`. Put all unit-testable logic in `app/`.
- App package has **no** geolib — implement haversine inline. App has **no** markercluster — add `leaflet.markercluster` + `@types/leaflet.markercluster`.
- Default tile URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, overridable via `runtimeConfig.public.tileUrl`. Attribution `© OpenStreetMap contributors` is mandatory on every map.
- Production site URL `https://cambio-uruguay.com`; backend API `https://api.cambio-uruguay.com`.
- Commit after each task's tests pass.

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `classes/cambioInfo.ts` | add `getMapLocations()` (geocoded branch query + lightweight projection) | Modify |
| `index.ts` | register `GET /locations` route | Modify |
| `app/server/utils/locations.ts` | pure `projectBcuBranch`, `buildLocations` (merge + dedupe) | Create |
| `app/server/data/extra-locations.json` | curated Max-effort additions (research deliverable) | Create |
| `app/server/api/locations.get.ts` | Nitro route: fetch backend + merge extras + cache | Create |
| `app/composables/useApiService.ts` | add `getAllLocations()` | Modify |
| `app/utils/nearbyRates.ts` | pure `haversineKm`, `rankNearby`, `buildRatesByOrigin` | Create |
| `app/components/map/LocationsMap.vue` | reusable client-only Leaflet map (clustered) | Create |
| `app/pages/mapa.vue` | the `/mapa` page: controls + map + ranked panel | Create |
| `app/pages/sucursales/[origin]/[[location]].vue` | embed a per-casa mini-map | Modify |
| `app/i18n/locales/json/{es,en,pt}.json` | `map.*` + `seo.mapa*` strings | Modify |
| `app/nuxt.config.ts` | add `public.tileUrl` | Modify |
| `app/components/AppNavigation*` / nav source | link to `/mapa` | Modify |
| `app/tests/unit/locations.test.ts` | tests for merge util | Create |
| `app/tests/unit/nearby-rates.test.ts` | tests for ranking util | Create |

---

### Task 1: Backend `/locations` endpoint

**Files:**
- Modify: `classes/cambioInfo.ts` (add method near `getAllMarkets`, ~line 17-22)
- Modify: `index.ts` (register route near the `localData` route, ~line 1254)

**Interfaces:**
- Produces: `GET https://api.cambio-uruguay.com/locations` → array of
  `{ origin, id, name, dept, locality, address, phone, hours, lat, lng, mapUrl }`
  (only branches with numeric lat/lng and `status !== 0`).

- [ ] **Step 1: Add `getMapLocations()` to `CambioInfo`**

In `classes/cambioInfo.ts`, add this method right after `getMarkets` (after line 22):

```typescript
  async getMapLocations(): Promise<any[]> {
    const sucs = await this.db_suc.allEntries({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
      status: { $ne: 0 },
    });
    return sucs
      .map((s: any) => ({
        origin: s.origin,
        id: s.id,
        name: s.Nombre || "",
        dept: s.Departamento || "",
        locality: s.Localidad || "",
        address: s.Direccion || "",
        phone: s.Telefono || "",
        hours: s.Horarios || "",
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        mapUrl: s.map || "",
      }))
      .filter((b: any) => !isNaN(b.lat) && !isNaN(b.lng) && b.lat !== 0 && b.lng !== 0);
  }
```

- [ ] **Step 2: Register the route in `index.ts`**

Add directly after the `localData` route (after line 1257):

```typescript
server.getJson("locations", async (req: Request): Promise<any> => {
  return await redisCache.getOrSet("locations", () => cambio_info.getMapLocations(), 600);
});
```

- [ ] **Step 3: Build the backend to verify it compiles**

Run (from repo root): `npx tsc --noEmit`
Expected: no new errors referencing `cambioInfo.ts` or `index.ts`. (Pre-existing unrelated errors, if any, are acceptable — compare against a clean `git stash` baseline only if unsure.)

- [ ] **Step 4: Commit**

```bash
git add classes/cambioInfo.ts index.ts
git commit -m "feat(api): add GET /locations returning all geocoded branches"
```

> Note: live verification (`curl https://api.cambio-uruguay.com/locations`) happens after the backend is deployed. Until then, Task 3's Nitro route is tested against the live endpoint only after deploy; before deploy it is exercised with a stub (see Task 3 Step 5).

---

### Task 2: Nitro merge util (`app/server/utils/locations.ts`) — TDD

**Files:**
- Create: `app/server/utils/locations.ts`
- Test: `app/tests/unit/locations.test.ts`

**Interfaces:**
- Produces:
  - `interface MapBranch { origin: string; id: string; name: string; dept: string; locality: string; address: string; phone: string; hours: string; lat: number; lng: number; mapUrl: string; source: 'bcu' | 'osm' | 'web' }`
  - `projectBackendBranch(raw: any): MapBranch | null` — tags `source:'bcu'`, returns `null` for invalid coords.
  - `buildLocations(backend: any[], extra: MapBranch[]): MapBranch[]` — projects backend rows, appends extras, drops extras whose coords sit within ~60 m of an existing same-origin backend branch.
- Consumes (Task 3): both functions.

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/locations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { projectBackendBranch, buildLocations, type MapBranch } from '../../server/utils/locations'

const raw = {
  origin: 'brou', id: '1001-1', name: 'Sucursal Centro', dept: 'MONTEVIDEO',
  locality: 'Montevideo', address: '18 de Julio 1000', phone: '1234', hours: 'L-V 13-18',
  lat: -34.9, lng: -56.18, mapUrl: 'https://maps/x',
}

describe('projectBackendBranch', () => {
  it('projects a valid branch and tags source bcu', () => {
    const b = projectBackendBranch(raw)
    expect(b).not.toBeNull()
    expect(b!.origin).toBe('brou')
    expect(b!.name).toBe('Sucursal Centro')
    expect(b!.lat).toBeCloseTo(-34.9)
    expect(b!.source).toBe('bcu')
  })

  it('returns null when coords are missing or zero', () => {
    expect(projectBackendBranch({ ...raw, lat: 0, lng: 0 })).toBeNull()
    expect(projectBackendBranch({ ...raw, lat: undefined })).toBeNull()
  })
})

describe('buildLocations', () => {
  const extraFar: MapBranch = {
    origin: 'gales', id: 'osm-1', name: 'OSM Gales', dept: '', locality: '', address: '',
    phone: '', hours: '', lat: -34.0, lng: -55.0, mapUrl: '', source: 'osm',
  }
  const extraDup: MapBranch = {
    origin: 'brou', id: 'osm-2', name: 'OSM dup of Centro', dept: '', locality: '', address: '',
    phone: '', hours: '', lat: -34.9001, lng: -56.1801, mapUrl: '', source: 'osm',
  }

  it('keeps backend branches plus far-away extras', () => {
    const out = buildLocations([raw], [extraFar])
    expect(out).toHaveLength(2)
    expect(out.find(b => b.id === 'osm-1')).toBeTruthy()
  })

  it('drops an extra that duplicates a same-origin backend branch by proximity', () => {
    const out = buildLocations([raw], [extraDup])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1001-1')
  })

  it('skips invalid backend rows', () => {
    const out = buildLocations([{ ...raw, lat: 0, lng: 0 }], [extraFar])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('osm-1')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `app/`): `npm run test -- locations`
Expected: FAIL — cannot find module `../../server/utils/locations`.

- [ ] **Step 3: Implement `app/server/utils/locations.ts`**

```typescript
export interface MapBranch {
  origin: string
  id: string
  name: string
  dept: string
  locality: string
  address: string
  phone: string
  hours: string
  lat: number
  lng: number
  mapUrl: string
  source: 'bcu' | 'osm' | 'web'
}

const str = (v: any): string => (v === undefined || v === null ? '' : String(v))

export function projectBackendBranch(raw: any): MapBranch | null {
  const lat = Number(raw?.lat)
  const lng = Number(raw?.lng)
  if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) return null
  return {
    origin: str(raw.origin),
    id: str(raw.id),
    name: str(raw.name),
    dept: str(raw.dept),
    locality: str(raw.locality),
    address: str(raw.address),
    phone: str(raw.phone),
    hours: str(raw.hours),
    lat,
    lng,
    mapUrl: str(raw.mapUrl),
    source: 'bcu',
  }
}

// Rough metres between two lat/lng points (equirectangular approximation — fine for ~tens of metres).
function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat = ((aLat + bLat) / 2) * (Math.PI / 180)
  const x = dLng * Math.cos(lat)
  return Math.sqrt(dLat * dLat + x * x) * R
}

const DEDUPE_METRES = 60

export function buildLocations(backend: any[], extra: MapBranch[]): MapBranch[] {
  const projected = (backend || [])
    .map(projectBackendBranch)
    .filter((b): b is MapBranch => b !== null)

  const kept: MapBranch[] = [...projected]
  for (const e of extra || []) {
    const lat = Number(e.lat)
    const lng = Number(e.lng)
    if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) continue
    const dup = projected.some(
      p => p.origin === e.origin && metresBetween(p.lat, p.lng, lat, lng) < DEDUPE_METRES
    )
    if (!dup) kept.push({ ...e, lat, lng })
  }
  return kept
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `app/`): `npm run test -- locations`
Expected: PASS (3 + 2 assertions across the suites).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/locations.ts app/tests/unit/locations.test.ts
git commit -m "feat(map): add tested locations merge/dedupe util"
```

---

### Task 3: Nitro `/api/locations` route + extra-locations seed

**Files:**
- Create: `app/server/data/extra-locations.json`
- Create: `app/server/api/locations.get.ts`

**Interfaces:**
- Consumes: `buildLocations` (Task 2); backend `GET /locations` (Task 1).
- Produces: `GET /api/locations` (same-origin Nitro) → `MapBranch[]` JSON.

- [ ] **Step 1: Create the seed data file**

Create `app/server/data/extra-locations.json` with an empty array (Task 11 fills it):

```json
[]
```

- [ ] **Step 2: Create the Nitro route**

Create `app/server/api/locations.get.ts`:

```typescript
import { defineCachedEventHandler } from '#imports'
import { buildLocations, type MapBranch } from '../utils/locations'
import extra from '../data/extra-locations.json'

// Cached 10 min at the edge of the Nitro server; the backend itself also caches 10 min.
export default defineCachedEventHandler(
  async () => {
    const config = useRuntimeConfig()
    const base = config.apiBaseServer || config.public.apiBase
    let backend: any[] = []
    try {
      backend = await $fetch<any[]>('/locations', { baseURL: base })
    } catch (err) {
      console.error('[/api/locations] backend fetch failed:', err)
      backend = []
    }
    return buildLocations(backend, extra as MapBranch[])
  },
  { maxAge: 600, name: 'locations', getKey: () => 'all' }
)
```

- [ ] **Step 3: Typecheck**

Run (from `app/`): `npm run typecheck`
Expected: no errors in `server/api/locations.get.ts` or `server/utils/locations.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/server/data/extra-locations.json app/server/api/locations.get.ts
git commit -m "feat(map): add /api/locations Nitro route merging backend + extras"
```

- [ ] **Step 5: Manual smoke (after `npm run dev`)**

Run (from `app/`): `npm run dev`, then in another shell: `curl http://localhost:3000/api/locations | head -c 400`
Expected: a JSON array of branch objects (non-empty once the backend `/locations` is deployed; empty `[]` is acceptable pre-deploy and means the route works but the backend route is not yet live). Stop dev server when done.

---

### Task 4: Frontend composable `getAllLocations()`

**Files:**
- Modify: `app/composables/useApiService.ts` (add function + export)

**Interfaces:**
- Consumes: `GET /api/locations`.
- Produces: `getAllLocations(): Promise<MapBranch[]>` returned from `useApiService()`.

- [ ] **Step 1: Add the function**

In `app/composables/useApiService.ts`, add near `getLocalData` (after line 119):

```typescript
  const getAllLocations = async (): Promise<any[]> => {
    try {
      return await $fetch('/api/locations')
    } catch (error) {
      console.error('Error fetching map locations:', error)
      return []
    }
  }
```

- [ ] **Step 2: Export it**

Find the `return { ... }` object at the end of `useApiService` and add `getAllLocations,` to the returned members (alongside `getLocalData`, `getProcessedExchangeData`, etc.).

- [ ] **Step 3: Typecheck**

Run (from `app/`): `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/composables/useApiService.ts
git commit -m "feat(map): expose getAllLocations() composable"
```

---

### Task 5: Ranking util `app/utils/nearbyRates.ts` — TDD

**Files:**
- Create: `app/utils/nearbyRates.ts`
- Test: `app/tests/unit/nearby-rates.test.ts`

**Interfaces:**
- Produces:
  - `haversineKm(a: {lat:number; lng:number}, b: {lat:number; lng:number}): number`
  - `type RateLite = { buy: number | null; sell: number | null }`
  - `type RatesByOrigin = Record<string, Record<string, RateLite>>`
  - `buildRatesByOrigin(rows: Array<{origin:string; code:string; buy:number|null; sell:number|null}>): RatesByOrigin`
  - `interface RankedBranch<T> { branch: T; distanceKm: number; rate: number }`
  - `rankNearby<T extends {origin:string; lat:number; lng:number}>(branches: T[], rates: RatesByOrigin, user: {lat:number;lng:number}, radiusKm: number, currency: string, direction: 'buy'|'sell'): RankedBranch<T>[]`
- Consumes (Task 7): all of the above.

Semantics: `direction:'buy'` = casa buys the tourist's foreign currency → sort by `rate` **descending** (higher is better). `direction:'sell'` = casa sells foreign currency to the tourist → sort by `rate` **ascending** (lower is better). Branches outside `radiusKm`, or with no positive rate for the currency, are excluded.

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/nearby-rates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { haversineKm, buildRatesByOrigin, rankNearby } from '../../utils/nearbyRates'

const user = { lat: -34.9011, lng: -56.1645 } // central Montevideo

const branches = [
  { origin: 'itau', lat: -34.9055, lng: -56.1922, id: 'a' },   // ~1.7 km
  { origin: 'brou', lat: -34.9080, lng: -56.2100, id: 'b' },   // ~4.2 km
  { origin: 'gales', lat: -34.8350, lng: -55.9500, id: 'c' },  // ~21 km (out of 10km radius)
  { origin: 'norate', lat: -34.9012, lng: -56.1646, id: 'd' }, // ~0 km but no USD rate
]

const rows = [
  { origin: 'itau', code: 'USD', buy: 39.8, sell: 41.0 },
  { origin: 'brou', code: 'USD', buy: 39.7, sell: 40.5 },
  { origin: 'gales', code: 'USD', buy: 40.1, sell: 40.2 },
  { origin: 'itau', code: 'EUR', buy: 44.0, sell: 46.0 },
]

describe('haversineKm', () => {
  it('is ~0 for identical points', () => {
    expect(haversineKm(user, user)).toBeCloseTo(0, 5)
  })
  it('computes a known distance within tolerance', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(d).toBeGreaterThan(111) // ~111.3 km per degree of longitude at equator
    expect(d).toBeLessThan(112)
  })
})

describe('buildRatesByOrigin', () => {
  it('indexes by origin then code', () => {
    const r = buildRatesByOrigin(rows)
    expect(r.itau.USD.buy).toBe(39.8)
    expect(r.itau.EUR.sell).toBe(46.0)
  })
})

describe('rankNearby', () => {
  const rates = buildRatesByOrigin(rows)

  it('buy direction: within radius, sorted by highest buy, excludes far + no-rate', () => {
    const out = rankNearby(branches, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['itau', 'brou'])
    expect(out[0].rate).toBe(39.8)
    expect(out[0].distanceKm).toBeGreaterThan(0)
  })

  it('sell direction: sorted by lowest sell', () => {
    const out = rankNearby(branches, rates, user, 10, 'USD', 'sell')
    expect(out.map(o => o.branch.origin)).toEqual(['brou', 'itau'])
    expect(out[0].rate).toBe(40.5)
  })

  it('excludes branches whose casa has no rate for the currency', () => {
    const out = rankNearby(branches, rates, user, 10, 'USD', 'buy')
    expect(out.find(o => o.branch.origin === 'norate')).toBeUndefined()
  })

  it('empty when radius is tiny', () => {
    expect(rankNearby(branches, rates, user, 0.0001, 'USD', 'buy')).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `app/`): `npm run test -- nearby-rates`
Expected: FAIL — cannot find module `../../utils/nearbyRates`.

- [ ] **Step 3: Implement `app/utils/nearbyRates.ts`**

```typescript
export interface LatLng {
  lat: number
  lng: number
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371 // km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type RateLite = { buy: number | null; sell: number | null }
export type RatesByOrigin = Record<string, Record<string, RateLite>>

export function buildRatesByOrigin(
  rows: Array<{ origin: string; code: string; buy: number | null; sell: number | null }>
): RatesByOrigin {
  const out: RatesByOrigin = {}
  for (const r of rows || []) {
    if (!r || !r.origin || !r.code) continue
    if (!out[r.origin]) out[r.origin] = {}
    out[r.origin][r.code] = { buy: r.buy ?? null, sell: r.sell ?? null }
  }
  return out
}

export interface RankedBranch<T> {
  branch: T
  distanceKm: number
  rate: number
}

export function rankNearby<T extends { origin: string; lat: number; lng: number }>(
  branches: T[],
  rates: RatesByOrigin,
  user: LatLng,
  radiusKm: number,
  currency: string,
  direction: 'buy' | 'sell'
): RankedBranch<T>[] {
  const out: RankedBranch<T>[] = []
  for (const b of branches || []) {
    const distanceKm = haversineKm(user, { lat: b.lat, lng: b.lng })
    if (distanceKm > radiusKm) continue
    const rate = rates[b.origin]?.[currency]?.[direction]
    if (rate == null || !(rate > 0)) continue
    out.push({ branch: b, distanceKm, rate })
  }
  out.sort((x, y) => (direction === 'buy' ? y.rate - x.rate : x.rate - y.rate))
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `app/`): `npm run test -- nearby-rates`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add app/utils/nearbyRates.ts app/tests/unit/nearby-rates.test.ts
git commit -m "feat(map): add tested nearby-rate ranking util"
```

---

### Task 6: `LocationsMap` component (client-only, clustered)

**Files:**
- Modify: `app/package.json` (add `leaflet.markercluster`, `@types/leaflet.markercluster`)
- Create: `app/components/map/LocationsMap.vue`

**Interfaces:**
- Consumes (Task 7 & 10): props `branches: MapBranch[]`, `center?: [number, number]`, `zoom?: number`, `userLocation?: {lat:number;lng:number} | null`, `radiusKm?: number`, `highlightId?: string | null`, `popupFor?: (b: MapBranch) => string`. Emits `marker-click` with the branch.
- The component imports Leaflet + markercluster **dynamically inside `onMounted`** so SSR never touches `window`.

- [ ] **Step 1: Add the cluster dependency + tile-URL config**

Run (from `app/`):
```bash
npm install leaflet.markercluster@^1.5.3
npm install -D @types/leaflet.markercluster@^1.5.4
```
Expected: both added to `app/package.json`; `node_modules/leaflet.markercluster` exists.

Then in `app/nuxt.config.ts`, inside `runtimeConfig.public` (after the `apiBase` line, ~line 595), add the configurable tile URL (the "free OSM now, switch later" lever):
```typescript
    // Leaflet tile source. Default = public OSM tiles (fine for low traffic).
    // Switch to a tile-provider/CDN URL via NUXT_PUBLIC_TILE_URL before heavy traffic
    // (OSM's tile usage policy forbids heavy use of its public tiles).
    tileUrl: process.env.NUXT_PUBLIC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
```

- [ ] **Step 2: Create the component**

Create `app/components/map/LocationsMap.vue`:

```vue
<template>
  <client-only>
    <div ref="el" class="locations-map" :style="{ height }" />
    <template #fallback>
      <div class="locations-map locations-map--loading" :style="{ height }">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </template>
  </client-only>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

interface Branch {
  origin: string
  id: string
  name: string
  dept: string
  locality: string
  address: string
  phone: string
  hours: string
  lat: number
  lng: number
  mapUrl: string
  source: string
}

interface Props {
  branches: Branch[]
  center?: [number, number]
  zoom?: number
  height?: string
  userLocation?: { lat: number; lng: number } | null
  radiusKm?: number
  highlightId?: string | null
  popupFor?: (b: Branch) => string
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [-34.9011, -56.1645], // Montevideo
  zoom: 7,
  height: '70vh',
  userLocation: null,
  radiusKm: 0,
  highlightId: null,
  popupFor: undefined,
})

const emit = defineEmits<{ 'marker-click': [branch: Branch] }>()

const config = useRuntimeConfig()
const tileUrl =
  (config.public as any).tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const el = ref<HTMLElement | null>(null)
let L: any = null
let map: any = null
let cluster: any = null
let userMarker: any = null
let radiusCircle: any = null
const markersById = new Map<string, any>()

// Stable colour per origin (hash → hue) so each casa is visually distinct.
function colorFor(origin: string): string {
  let h = 0
  for (let i = 0; i < origin.length; i++) h = (h * 31 + origin.charCodeAt(i)) % 360
  return `hsl(${h}, 70%, 45%)`
}

function pinIcon(origin: string, highlighted: boolean) {
  const c = colorFor(origin)
  const size = highlighted ? 18 : 12
  return L.divIcon({
    className: 'casa-pin',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function defaultPopup(b: Branch): string {
  const esc = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const dir = b.mapUrl
    ? b.mapUrl
    : `https://www.google.com/maps/search/${encodeURIComponent(`${b.name} ${b.address} ${b.locality}`)}`
  return `<strong>${esc(b.name || b.origin)}</strong><br>${esc(b.address)}<br>${esc(b.locality)}, ${esc(b.dept)}` +
    (b.hours ? `<br><em>${esc(b.hours)}</em>` : '') +
    (b.phone ? `<br>📞 ${esc(b.phone)}` : '') +
    `<br><a href="${dir}" target="_blank" rel="noopener">Cómo llegar →</a>`
}

async function init() {
  if (!el.value) return
  L = await import('leaflet')
  await import('leaflet.markercluster')
  await import('leaflet/dist/leaflet.css')
  await import('leaflet.markercluster/dist/MarkerCluster.css')
  await import('leaflet.markercluster/dist/MarkerCluster.Default.css')

  map = L.map(el.value, { scrollWheelZoom: true }).setView(props.center, props.zoom)
  L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  cluster = (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 })
  map.addLayer(cluster)
  renderMarkers()
  renderUser()
}

function renderMarkers() {
  if (!cluster) return
  cluster.clearLayers()
  markersById.clear()
  const popup = props.popupFor || defaultPopup
  for (const b of props.branches) {
    const m = L.marker([b.lat, b.lng], { icon: pinIcon(b.origin, b.id === props.highlightId) })
    m.bindPopup(popup(b))
    m.on('click', () => emit('marker-click', b))
    markersById.set(b.id, m)
    cluster.addLayer(m)
  }
}

function renderUser() {
  if (!map) return
  if (userMarker) { map.removeLayer(userMarker); userMarker = null }
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null }
  if (!props.userLocation) return
  const ll: [number, number] = [props.userLocation.lat, props.userLocation.lng]
  userMarker = L.circleMarker(ll, { radius: 7, color: '#1976d2', fillColor: '#1976d2', fillOpacity: 1 }).addTo(map)
  if (props.radiusKm && props.radiusKm > 0) {
    radiusCircle = L.circle(ll, { radius: props.radiusKm * 1000, color: '#1976d2', weight: 1, fillOpacity: 0.05 }).addTo(map)
    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] })
  } else {
    map.setView(ll, 13)
  }
}

// Public-ish helper the page can call by ref to focus a branch.
function focusBranch(id: string) {
  const m = markersById.get(id)
  if (m && map && cluster) {
    cluster.zoomToShowLayer(m, () => m.openPopup())
  }
}
defineExpose({ focusBranch })

onMounted(init)
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })

watch(() => props.branches, () => renderMarkers(), { deep: false })
watch(() => [props.userLocation, props.radiusKm], () => renderUser(), { deep: true })
watch(() => props.highlightId, () => renderMarkers())
</script>

<style scoped>
.locations-map {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  z-index: 0;
}
.locations-map--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
}
</style>
```

- [ ] **Step 3: Typecheck**

Run (from `app/`): `npm run typecheck`
Expected: no errors in `LocationsMap.vue`. (If `markerClusterGroup` typing complains, the `(L as any)` cast already guards it.)

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/components/map/LocationsMap.vue
git commit -m "feat(map): add reusable clustered LocationsMap component"
```

---

### Task 7: `/mapa` page — full tourist tool

**Files:**
- Create: `app/pages/mapa.vue`

**Interfaces:**
- Consumes: `getAllLocations`, `getProcessedExchangeData` (from `useApiService`); `buildRatesByOrigin`, `rankNearby` (Task 5); `LocationsMap` (Task 6); `map.*` + `seo.mapa*` i18n keys (Task 8).

- [ ] **Step 1: Create the page**

Create `app/pages/mapa.vue`:

```vue
<template>
  <v-container fluid class="pa-2 pa-sm-4">
    <h1 class="text-h5 mb-2">{{ t('map.title') }}</h1>
    <p class="text-body-2 mb-4">{{ t('map.subtitle') }}</p>

    <v-row dense class="mb-2">
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="currency"
          :items="currencyItems"
          :label="t('map.currency')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="direction"
          :items="directionItems"
          :label="t('map.direction')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="px-1">
          <span class="text-caption">{{ t('map.radius') }}: {{ radiusKm }} km</span>
          <v-slider v-model="radiusKm" :min="1" :max="50" :step="1" hide-details density="compact" />
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3" class="d-flex align-center">
        <v-btn color="primary" :loading="locating" block @click="locate">
          <v-icon start>mdi-crosshairs-gps</v-icon>{{ t('map.useMyLocation') }}
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="geoError" type="warning" density="compact" class="mb-2" closable @click:close="geoError = ''">
      {{ geoError }}
    </v-alert>

    <v-row>
      <v-col cols="12" md="8">
        <LocationsMap
          ref="mapRef"
          :branches="branches"
          :user-location="userLocation"
          :radius-km="userLocation ? radiusKm : 0"
          :highlight-id="highlightId"
          :popup-for="popupFor"
          height="72vh"
          @marker-click="onMarkerClick"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="outlined" class="ranked-panel">
          <v-card-title class="text-subtitle-1">
            {{ userLocation ? t('map.bestNearby') : t('map.setLocationPrompt') }}
          </v-card-title>
          <v-card-text v-if="userLocation && ranked.length" class="pa-0">
            <v-list density="compact">
              <v-list-item
                v-for="(r, i) in ranked"
                :key="r.branch.id"
                :active="r.branch.id === highlightId"
                @click="focus(r.branch.id)"
              >
                <template #prepend>
                  <span class="rank-num">{{ i + 1 }}</span>
                </template>
                <v-list-item-title>
                  {{ nameFor(r.branch.origin) }} — {{ formatRate(r.rate) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ r.branch.locality }} · {{ r.distanceKm.toFixed(1) }} km
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-text v-else-if="userLocation">
            {{ t('map.noneInRadius') }}
          </v-card-text>
          <v-card-text v-else>
            {{ t('map.setLocationHint') }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LocationsMap from '~/components/map/LocationsMap.vue'
import { buildRatesByOrigin, rankNearby, type RatesByOrigin } from '~/utils/nearbyRates'

const { t, locale } = useI18n()
const { getAllLocations, getProcessedExchangeData } = useApiService()

const branches = ref<any[]>([])
const ratesByOrigin = ref<RatesByOrigin>({})
const localData = ref<Record<string, any>>({})

const currency = ref('USD')
const direction = ref<'buy' | 'sell'>('buy')
const radiusKm = ref(5)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const highlightId = ref<string | null>(null)
const locating = ref(false)
const geoError = ref('')
const mapRef = ref<any>(null)

// Currencies actually present in today's rate data, USD first.
const currencyItems = computed(() => {
  const set = new Set<string>()
  for (const o of Object.keys(ratesByOrigin.value)) {
    for (const c of Object.keys(ratesByOrigin.value[o])) set.add(c)
  }
  const arr = Array.from(set)
  arr.sort((a, b) => (a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b)))
  return arr
})

const directionItems = computed(() => [
  { title: t('map.haveForeign', { c: currency.value }), value: 'buy' },
  { title: t('map.needForeign', { c: currency.value }), value: 'sell' },
])

const ranked = computed(() => {
  if (!userLocation.value) return []
  return rankNearby(branches.value, ratesByOrigin.value, userLocation.value, radiusKm.value, currency.value, direction.value)
})

function nameFor(origin: string): string {
  return localData.value[origin]?.name || origin
}
function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(n)
}
function popupFor(b: any): string {
  const rate = ratesByOrigin.value[b.origin]?.[currency.value]
  const esc = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const dir = b.mapUrl || `https://www.google.com/maps/search/${encodeURIComponent(`${b.name} ${b.address} ${b.locality}`)}`
  const rateLine = rate
    ? `<br>${currency.value}: ${t('compra')} ${rate.buy ?? '—'} / ${t('venta')} ${rate.sell ?? '—'}`
    : ''
  return `<strong>${esc(nameFor(b.origin))}</strong><br>${esc(b.address)}<br>${esc(b.locality)}, ${esc(b.dept)}` +
    (b.hours ? `<br><em>${esc(b.hours)}</em>` : '') +
    rateLine +
    `<br><a href="${dir}" target="_blank" rel="noopener">${t('map.directions')} →</a>`
}

function onMarkerClick(b: any) {
  highlightId.value = b.id
}
function focus(id: string) {
  highlightId.value = id
  mapRef.value?.focusBranch(id)
}
function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = t('map.geoUnavailable')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      locating.value = false
    },
    () => {
      geoError.value = t('map.geoDenied')
      userLocation.value = { lat: -34.9011, lng: -56.1645 } // fallback: Montevideo
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// Load data (client-side; the list is large and not needed for SSR/SEO body).
const { data } = await useLazyAsyncData('mapa-data', async () => {
  const [locs, processed] = await Promise.all([getAllLocations(), getProcessedExchangeData('')])
  return { locs, processed }
})
watch(
  data,
  (d) => {
    if (!d) return
    branches.value = d.locs || []
    ratesByOrigin.value = buildRatesByOrigin((d.processed?.exchangeData || []) as any[])
    localData.value = d.processed?.localData || {}
  },
  { immediate: true }
)

useSeoMeta({
  title: () => t('seo.mapaTitle'),
  description: () => t('seo.mapaDescription'),
  ogTitle: () => t('seo.mapaTitle'),
  ogDescription: () => t('seo.mapaDescription'),
  twitterCard: 'summary_large_image',
})
defineOgImageComponent('Cambio', {
  title: () => t('seo.mapaTitle'),
  tag: 'Mapa',
  locale: locale.value as 'es' | 'en' | 'pt',
})
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t('seo.mapaTitle'),
        numberOfItems: branches.value.length,
      }),
    },
  ],
}))
</script>

<style scoped>
.ranked-panel {
  max-height: 72vh;
  overflow-y: auto;
}
.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  font-size: 12px;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run (from `app/`): `npm run typecheck`
Expected: no errors in `mapa.vue`. (If `useApiService`/`useI18n`/`useLazyAsyncData`/`useSeoMeta`/`defineOgImageComponent` are reported undefined, confirm they are Nuxt auto-imports used elsewhere — they are, per existing pages.)

- [ ] **Step 3: Manual verify (after `npm run dev`)**

Load `http://localhost:3000/mapa`. Confirm: map renders with clustered pins; selecting a currency/direction works; "Use my location" drops a marker + radius circle and the right panel lists nearby branches ranked by rate; clicking a list item focuses the pin. Stop dev server when done.

- [ ] **Step 4: Commit**

```bash
git add app/pages/mapa.vue
git commit -m "feat(map): add /mapa page with best-rates-near-you tool"
```

---

### Task 8: i18n strings (es/en/pt)

**Files:**
- Modify: `app/i18n/locales/json/es.json`
- Modify: `app/i18n/locales/json/en.json`
- Modify: `app/i18n/locales/json/pt.json`

**Interfaces:**
- Produces keys consumed by Tasks 7, 9, 10: `map.title`, `map.subtitle`, `map.currency`, `map.direction`, `map.radius`, `map.useMyLocation`, `map.bestNearby`, `map.setLocationPrompt`, `map.setLocationHint`, `map.noneInRadius`, `map.haveForeign`, `map.needForeign`, `map.directions`, `map.geoUnavailable`, `map.geoDenied`, `map.nav`, `map.viewOnMap`, and `seo.mapaTitle`, `seo.mapaDescription`. (`compra`/`venta` already exist.)

- [ ] **Step 1: Add the `map` block + seo keys to `es.json`**

Insert a top-level `"map"` object (mirroring the existing nested style) and add the two `seo.mapa*` keys inside the existing `"seo"` object:

```json
"map": {
  "nav": "Mapa",
  "title": "Mapa de casas de cambio en Uruguay",
  "subtitle": "Encontrá la casa de cambio más cercana y la mejor cotización a tu alrededor.",
  "currency": "Moneda",
  "direction": "Operación",
  "radius": "Radio",
  "useMyLocation": "Usar mi ubicación",
  "bestNearby": "Mejores cotizaciones cerca",
  "setLocationPrompt": "Elegí tu ubicación",
  "setLocationHint": "Tocá «Usar mi ubicación» para ver las mejores cotizaciones cerca tuyo.",
  "noneInRadius": "No hay sucursales en ese radio. Probá ampliarlo.",
  "haveForeign": "Tengo {c} (vender)",
  "needForeign": "Necesito {c} (comprar)",
  "directions": "Cómo llegar",
  "geoUnavailable": "La geolocalización no está disponible en este dispositivo.",
  "geoDenied": "No pudimos obtener tu ubicación. Usamos Montevideo por defecto.",
  "viewOnMap": "Ver en el mapa"
}
```
And inside `"seo"`:
```json
"mapaTitle": "Mapa de casas de cambio en Uruguay | Cambio Uruguay",
"mapaDescription": "Mapa interactivo de casas de cambio en Uruguay. Encontrá la sucursal más cercana y la mejor cotización del dólar a tu alrededor."
```

- [ ] **Step 2: Add the English equivalents to `en.json`**

```json
"map": {
  "nav": "Map",
  "title": "Map of exchange houses in Uruguay",
  "subtitle": "Find the nearest exchange house and the best rate around you.",
  "currency": "Currency",
  "direction": "Operation",
  "radius": "Radius",
  "useMyLocation": "Use my location",
  "bestNearby": "Best rates nearby",
  "setLocationPrompt": "Pick your location",
  "setLocationHint": "Tap “Use my location” to see the best rates around you.",
  "noneInRadius": "No branches within that radius. Try widening it.",
  "haveForeign": "I have {c} (sell)",
  "needForeign": "I need {c} (buy)",
  "directions": "Directions",
  "geoUnavailable": "Geolocation is not available on this device.",
  "geoDenied": "We couldn't get your location. Defaulting to Montevideo.",
  "viewOnMap": "View on map"
}
```
And inside `"seo"`:
```json
"mapaTitle": "Map of exchange houses in Uruguay | Cambio Uruguay",
"mapaDescription": "Interactive map of exchange houses in Uruguay. Find the nearest branch and the best US dollar rate around you."
```

- [ ] **Step 3: Add the Portuguese equivalents to `pt.json`**

```json
"map": {
  "nav": "Mapa",
  "title": "Mapa de casas de câmbio no Uruguai",
  "subtitle": "Encontre a casa de câmbio mais próxima e a melhor cotação perto de você.",
  "currency": "Moeda",
  "direction": "Operação",
  "radius": "Raio",
  "useMyLocation": "Usar minha localização",
  "bestNearby": "Melhores cotações por perto",
  "setLocationPrompt": "Escolha sua localização",
  "setLocationHint": "Toque em “Usar minha localização” para ver as melhores cotações perto de você.",
  "noneInRadius": "Não há agências nesse raio. Tente ampliá-lo.",
  "haveForeign": "Tenho {c} (vender)",
  "needForeign": "Preciso de {c} (comprar)",
  "directions": "Como chegar",
  "geoUnavailable": "A geolocalização não está disponível neste dispositivo.",
  "geoDenied": "Não foi possível obter sua localização. Usando Montevidéu por padrão.",
  "viewOnMap": "Ver no mapa"
}
```
And inside `"seo"`:
```json
"mapaTitle": "Mapa de casas de câmbio no Uruguai | Cambio Uruguay",
"mapaDescription": "Mapa interativo de casas de câmbio no Uruguai. Encontre a agência mais próxima e a melhor cotação do dólar perto de você."
```

- [ ] **Step 4: Validate JSON**

Run (from `app/`): `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('i18n/locales/json/'+l+'.json','utf8')))" && echo OK`
Expected: prints `OK` (no JSON syntax errors).

- [ ] **Step 5: Commit**

```bash
git add app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(map): add es/en/pt strings for the map page"
```

---

### Task 9: Navigation link to `/mapa`

**Files:**
- Modify: the site navigation source (locate it in Step 1)

**Interfaces:**
- Consumes: `map.nav` (Task 8).

- [ ] **Step 1: Locate the nav menu**

Run (from `app/`): search for the existing `sucursalesMenu` nav entry to find where menu items are defined.
Run: `grep -rn "sucursalesMenu" app --include=*.vue --include=*.ts`
Expected: one or more component/composable files listing nav items. Open the primary one.

- [ ] **Step 2: Add a `/mapa` entry**

Mirror the existing `sucursales` entry's shape (title via `t('map.nav')`, route `/mapa`, an `mdi-map-marker-radius` icon if icons are used). Place it adjacent to the `sucursales` entry.

- [ ] **Step 3: Add a CTA link from `/sucursales`**

In `app/pages/sucursales/index.vue`, add a prominent button near the top linking to `/mapa`:
```vue
<v-btn color="primary" variant="tonal" to="/mapa" class="mb-4">
  <v-icon start>mdi-map-marker-radius</v-icon>{{ t('map.viewOnMap') }}
</v-btn>
```
(Ensure `const { t } = useI18n()` exists in that page; it does — it already uses translations.)

- [ ] **Step 4: Manual verify + commit**

Load `/` and `/sucursales`, confirm the Map link appears and routes to `/mapa`.
```bash
git add -A app
git commit -m "feat(map): link to /mapa from nav and sucursales"
```

---

### Task 10: Embed a per-casa mini-map on the branch page

**Files:**
- Modify: `app/pages/sucursales/[origin]/[[location]].vue`

**Interfaces:**
- Consumes: `LocationsMap` (Task 6). Reuses the page's existing `branchesData` (already has `latitude`/`longitude`/`Nombre`/`Direccion`/etc.).

- [ ] **Step 1: Import the component**

In the `<script setup>` of `[[location]].vue`, add near the other imports:
```typescript
import LocationsMap from '~/components/map/LocationsMap.vue'
```

- [ ] **Step 2: Add a computed adapter from `branchesData` to map branches**

The page's `branchesData` rows use BCU field names; map the geocoded ones to the `LocationsMap` shape:
```typescript
const mapBranches = computed(() =>
  (branchesData.value || [])
    .filter((s: any) => s.latitude && s.longitude)
    .map((s: any) => ({
      origin,
      id: String(s.id ?? `${origin}-${s.NroSucursal}`),
      name: s.Nombre || '',
      dept: s.Departamento || '',
      locality: s.Localidad || '',
      address: s.Direccion || '',
      phone: s.Telefono || '',
      hours: s.Horarios || '',
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      mapUrl: s.map || '',
      source: 'bcu',
    }))
)
```

- [ ] **Step 3: Render the map above the table**

In the template, inside the existing `<v-row>` (before the `<v-col cols="12">` that holds the table), add:
```vue
<v-col v-if="mapBranches.length" cols="12">
  <LocationsMap :branches="mapBranches" :zoom="mapBranches.length === 1 ? 14 : 10" height="50vh" />
</v-col>
```

- [ ] **Step 4: Typecheck + manual verify**

Run (from `app/`): `npm run typecheck` (expect no new errors), then load `http://localhost:3000/sucursales/brou` and confirm a mini-map with that casa's branches renders above the table.

- [ ] **Step 5: Commit**

```bash
git add "app/pages/sucursales/[origin]/[[location]].vue"
git commit -m "feat(map): embed per-casa mini-map on branch pages"
```

---

### Task 11: Populate `extra-locations.json` (Max-effort research) — subagent batch

This is a data-gathering task, not code. It runs as its own reviewed batch of subagents and writes the curated additions into `app/server/data/extra-locations.json` (shape = `MapBranch` from Task 2, with `source: 'osm'` or `'web'`). It can start once Task 1 is deployed (so existing coords are queryable for dedupe) and runs in parallel with Tasks 4–10.

**Interfaces:**
- Consumes: live `GET /locations` (existing coords, for dedupe); OpenStreetMap Overpass; Nominatim.
- Produces: a reviewed JSON array merged by Task 3's route.

- [ ] **Step 1: Snapshot existing coverage**

Fetch the current geocoded set to dedupe against:
`curl -s https://api.cambio-uruguay.com/locations > /tmp/existing-locations.json`
Record the count and the distinct origins present.

- [ ] **Step 2: Query OpenStreetMap Overpass for currency-exchange POIs in Uruguay**

Use the Overpass API with a Uruguay area filter, e.g.:
```
[out:json][timeout:60];
area["ISO3166-1"="UY"][admin_level=2]->.uy;
(
  node["amenity"="bureau_de_change"](area.uy);
  way["amenity"="bureau_de_change"](area.uy);
  node["office"="financial"]["name"~"cambio",i](area.uy);
);
out center tags;
```
Collect `{ name, lat, lng, address tags }` for each result.

- [ ] **Step 3: Gap-fill casas with missing/failed branch data via their websites**

For any active casa absent from `/locations` (e.g. a casa whose sync failed, like `cambio_pando` at audit time), open the casa website (`localData[origin].website` from `/localData`), extract branch addresses, and geocode each via Nominatim (respect the 1 req/s + User-Agent policy). Map each to the correct `origin`.

- [ ] **Step 4: Dedupe against existing data**

Drop any candidate within ~60 m of an existing same-origin branch (Task 2's `buildLocations` enforces this at runtime, but dedupe here too to keep the file clean). For OSM POIs that cannot be confidently attributed to a known `origin`, either map to the best-matching casa by name or **omit** (do not invent an origin).

- [ ] **Step 5: Manual cross-check each surviving candidate**

For every addition verify: the coordinates fall on land in the stated locality; the name is a plausible casa; it is not a duplicate of an existing pin under a different label. Discard anything uncertain.

- [ ] **Step 6: Write the curated file**

Replace `app/server/data/extra-locations.json` contents with the validated array. Each record MUST have all `MapBranch` fields and a truthful `source` (`'osm'` or `'web'`). Use a stable unique `id` per record (e.g. `osm-<osmid>` or `web-<origin>-<n>`).

- [ ] **Step 7: Verify the merge end-to-end**

Run (from `app/`): `npm run test -- locations` (must still pass), then `npm run dev` and `curl http://localhost:3000/api/locations | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);console.log('total',a.length,'extra',a.filter(b=>b.source!=='bcu').length)})"`.
Expected: total = BCU count + accepted extras; extras count matches the curated file.

- [ ] **Step 8: Commit**

```bash
git add app/server/data/extra-locations.json
git commit -m "data(map): add cross-checked OSM/website exchange locations"
```

---

## Self-Review

**Spec coverage:**
- Map of all branches → Tasks 1–7 (data) + 6/7/10 (render). ✓
- Both placements (`/mapa` + per-casa embed) → Tasks 7 & 10. ✓
- Best-rates-near-you (geolocate + radius + currency + direction + ranked) → Tasks 5 & 7. ✓
- Max-effort more locations → Task 11. ✓
- Tiles: free OSM now + config switch → `runtimeConfig.public.tileUrl` in Task 6/7 (add the key in nuxt.config — see note below). ✓
- BROU-mirror casas separate pins → inherent (each row keeps its `origin`; dedupe only drops same-origin near-duplicates). ✓
- i18n es/en/pt → Task 8. ✓
- SEO meta + ItemList → Task 7. ✓
- TDD for ranking + merge → Tasks 2 & 5. ✓

**Gap found & fixed:** Task 6/7 read `config.public.tileUrl` but no task adds it to `nuxt.config.ts`. Add this micro-step to Task 6 Step 1 (alongside installing markercluster): in `app/nuxt.config.ts`, inside `runtimeConfig.public`, add `tileUrl: process.env.NUXT_PUBLIC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',`. (Falls back at runtime even if omitted, but add it so the switch is real.)

**Placeholder scan:** No TBD/TODO; all code blocks complete.

**Type consistency:** `MapBranch` defined once (Task 2), imported by Tasks 3/6(shape mirrored)/10. `rankNearby` generic over `{origin,lat,lng}` so the page's branch objects satisfy it. `buildRatesByOrigin` input matches `getProcessedExchangeData().exchangeData` rows (`{origin, code, buy, sell}`). `focusBranch` exposed in Task 6, called in Task 7 — names match.

## Execution

Backend (Task 1) must be deployed for `/api/locations` to return real data and for Task 11 dedupe; Tasks 2–10 can be built and unit-verified before that deploy (the Nitro route degrades to `[]`). Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10, with 11 running in parallel after 1 is deployed.
