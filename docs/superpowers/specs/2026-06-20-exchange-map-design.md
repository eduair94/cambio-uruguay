# Exchange-House Map + "Best Rates Near You" — Design Spec

**Date:** 2026-06-20
**Status:** Approved (design), pending implementation plan
**Author:** brainstorming session

## Goal

Give users — especially tourists — an interactive OpenStreetMap of every exchange
house (casa de cambio) branch in Uruguay, and a tool to set a location + radius and
find the **best exchange rate available nearby** for a chosen currency.

## Context (verified)

- **Frontend:** Nuxt 3 (Vue 3, TS). Pages auto-routed from `app/pages/`.
- **Backend:** Express + Mongoose + Redis at repo root (`index.ts`, `classes/`),
  deployed as `https://api.cambio-uruguay.com`. Same git repo as the frontend.
- **Branch data:** MongoDB collection `bcu_suc`, populated nightly from BCU
  ("Información de Instituciones") via `classes/bcu_details.ts` / `get_locations.ts`.
  Fields: `id, origin, Nombre, NroSucursal, Departamento, Localidad, Direccion,
  Telefono, Horarios, latitude, longitude, map, status`.
- **Coverage:** ~500–550 branches across ~37 active casas; ~99% have valid
  lat/lng. Casas without branches: `prex` (digital), `bcu` (reference),
  `cambio_pando` (sync 403 at audit time).
- **Rates:** collection `cambio-uy`, keyed by **origin** (per-casa, NOT per-branch).
  A branch inherits its casa's current buy/sell. Exposed via existing
  `getProcessedExchangeData()` / `/localData`.
- **Map libs already installed:** `leaflet` 1.9.4, `@nuxtjs/leaflet` 1.2.6,
  `vue3-leaflet`, `@types/leaflet`. No map currently rendered anywhere.
- **Distance:** `geolib` already a root dependency; backend already supports
  optional `latitude`/`longitude` query params for distance on `/exchanges/:origin`.

## Decisions (from brainstorm)

- **Placement:** Both — a dedicated `/mapa` page AND an embedded mini-map on the
  per-casa `sucursales/[origin]/[[location]]` page.
- **Data depth:** Max effort — augment BCU data with OpenStreetMap + casa websites,
  manually cross-checked.
- **Tourist tool:** Full — geolocate/click + radius slider + currency picker +
  buy/sell direction + ranked results.
- **Tiles:** Standard OSM tiles now, behind a config switch; flag a tile-provider/CDN
  migration before heavy production traffic (OSM tile usage policy).

## Architecture

### Component boundaries (each independently testable)

1. **Backend `GET /locations`** (`index.ts` + a small handler in `classes/`)
   - One Mongo query: `bcu_suc.find({ latitude: {$exists,$ne:null}, status:1 })`.
   - Merge curated `data/extra-locations.json` (the Max-effort additions).
   - Project to a lightweight shape:
     `{origin, id, name, dept, locality, address, phone, hours, lat, lng, mapUrl, source}`
     where `source` ∈ `"bcu" | "osm" | "web"`.
   - Redis cache (key `locations:v1`, TTL ~600s), mirroring existing cache usage.
   - Pure projection/merge extracted into a function so it is unit-testable without Mongo.

2. **Curated dataset** `data/extra-locations.json`
   - Deliverable of the research phase. Same record shape as above (`source` ≠ `bcu`).
   - Committed and reviewable; never overwritten by the nightly BCU sync.

3. **Frontend composable** `getAllLocations()` in `app/composables/useApiService.ts`
   - Fetches `/locations`; returns typed array. Cached per existing patterns.

4. **Reusable map** `app/components/map/LocationsMap.client.vue`
   - Client-only Leaflet (SSR-safe). OSM tiles from a configurable URL
     (`runtimeConfig.public.tileUrl`, default OSM).
   - Marker **clustering** for 500+ pins via `leaflet.markercluster` (new dep).
   - Per-casa colored/branded markers; popup = name, address, hours, phone,
     that casa's current rate for the active currency, and a directions link.
   - Props: `branches`, `center?`, `radius?`, `highlightId?`, `activeCurrency?`.
   - Emits marker-click for the parent to sync the side panel.

5. **`/mapa` page** `app/pages/mapa.vue` — the Full tool
   - Control bar: **geolocate** button (or click map to drop a "you" pin),
     **radius slider** (km), **currency picker** (default USD), **buy/sell
     direction** toggle, optional casa filter.
   - Direction semantics (tourist-facing copy):
     - *I have USD, want pesos* → casa **buys** USD → rank by **highest buy**.
     - *I need USD* → casa **sells** USD → rank by **lowest sell**.
   - Side panel: branches within radius **ranked by best rate**; click → map flies
     to pin. Shows rate, distance, address, hours.
   - Uses `LocationsMap` + the ranking util.

6. **Ranking util** `app/utils/nearbyRates.ts` (+ `useNearbyRates` if composable needed)
   - Pure function: `(branches, ratesByOrigin, userCoords, radiusKm, currency, direction)`
     → sorted list with `{branch, distanceKm, rate}`. Uses `geolib`/haversine.
   - **TDD target** (distance filter, rate join, sort order, ties, missing-rate skip).

7. **Per-casa embed** — add a `LocationsMap` instance (that casa's branches only)
   to `app/pages/sucursales/[origin]/[[location]].vue`, above/aside the existing table.

8. **Cross-cutting**
   - i18n strings in `app/i18n/locales/json` (es/en/pt) — tourist tool so **en** matters.
   - SEO: page meta + JSON-LD `ItemList` (and/or `LocalBusiness` per branch) on `/mapa`.
   - Nav link + a link from `/sucursales` to `/mapa`.
   - Lazy-load Leaflet (client-only, dynamic) to protect bundle/LCP.

### Data flow

```
bcu_suc (Mongo) ─┐
                 ├─► /locations (Express, Redis-cached) ─► getAllLocations() ─┐
extra-locations ─┘                                                            │
                                                                              ├─► LocationsMap (pins)
cambio-uy rates ─► getProcessedExchangeData() ──────────────────────────────►│
                                                                              └─► nearbyRates() ─► ranked panel
```

## "Find more locations" — research phase (Max effort, subagent-driven)

1. **OSM Overpass**: query `amenity=bureau_de_change` and currency-exchange POIs
   within Uruguay's bbox/area. Collect name + coords + address tags.
2. **Gap fill**: for casas with missing/failed branch data, scrape the casa website
   for branch addresses; geocode via **Nominatim** (respect rate limits/UA policy).
3. **Dedupe**: drop OSM/web candidates that match an existing `bcu_suc` branch by
   proximity (~50 m) + fuzzy name. Keep only genuinely new points.
4. **Manual cross-check** each surviving candidate (name plausibility, coords on land
   in the right locality, not a duplicate).
5. **Emit** `data/extra-locations.json` with `source` provenance per record.

## Edge cases

- **BROU-mirror casas** (`cambio_federal`/`cambio_argentino`/`cambio_romantico`) share
  BROU's physical branches → overlapping pins, different rates. Keep each casa's own
  marker; clustering absorbs visual overlap. Do not merge them into one pin.
- **Casas without branches** (`prex`, `bcu`): excluded from the map; still appear in
  rate listings elsewhere. The "best rates near you" list notes if a top-rate casa is
  digital-only (no nearby branch).
- **Missing rate for a currency**: branch skipped in ranking (not shown as rate 0).
- **Geolocation denied**: fall back to click-to-set + a default center (Montevideo).
- **No branch within radius**: show nearest N regardless, with a "widen radius" hint.

## Testing

- **Unit (TDD):** `nearbyRates.ts` — distance filter, origin→rate join, buy vs sell
  sort, ties, missing-rate skip, empty input.
- **Unit:** `/locations` projection/merge function (BCU + extra, dedupe, shape).
- **Component smoke:** `LocationsMap` mounts client-only without SSR crash; renders
  N markers; popup content present.
- **Manual verify:** load `/mapa`, geolocate, set radius, switch currency/direction,
  confirm ranking matches the table; check per-casa embed.

## Out of scope (YAGNI)

- Per-branch rates (rates are per-casa; revisit only if data ever differentiates).
- Routing/turn-by-turn navigation (link out to Google/OSM directions instead).
- Real-time branch open/closed status beyond the stored `Horarios` string.
- Self-hosting a tile server (config switch only; provider migration deferred).

## Build flow

Spec (this doc) → user review → `writing-plans` → `subagent-driven-development`
executing each task with a review checkpoint between steps. The research phase runs
as its own reviewed subagent batch before/parallel to the UI work (UI can build
against BCU data while extras are curated).
