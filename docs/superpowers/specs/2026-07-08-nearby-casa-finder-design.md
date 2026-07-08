# "Mejor Casa de Cambio Cerca de Mí" — Smart Nearby Finder Design Spec

**Date:** 2026-07-08
**Status:** Approved (design), pending implementation plan
**Author:** brainstorming session

## Goal

A new, mobile-first, tourist-friendly page — featured prominently on the homepage —
that finds the **best casa de cambio near the user** using distance, live rate, and
reputation together, and lets them tap straight through to Google Maps or Waze
navigation. Financial entities (BROU, Itaú, Prex, and any future bank/fintech) must
never be presented as a "casa de cambio."

## Context (verified)

- `/mapa` (`app/pages/mapa.vue`) already ships: geolocation, radius slider, currency
  picker, buy/sell direction toggle, Leaflet map, and best-rate ranking via
  `app/utils/nearbyRates.ts` (`rankNearby`). It has **no** Waze link, **no**
  casa-vs-banco/fintech distinction, **no** reputation in the ranked list, and shows
  `hours` only inside the map popup, never in the list. Desktop-oriented md=8/4
  map+list split.
- `app/server/api/locations.get.ts` / `app/server/utils/locations.ts` (`MapBranch`):
  `{origin, id, name, dept, locality, address, phone, hours, lat, lng, mapUrl, source}`.
  **No type/category field anywhere in the location pipeline** (backend `bcu_suc`,
  `extra-locations.json`, and the ~45 per-origin scrapers in `classes/cambios/*.ts`
  all lack one).
- The **only** entity-type classification in the repo is
  `CASAS_REPUTATION[].category: 'casa' | 'banco' | 'fintech'` in
  `app/utils/casasDirectory.ts`, keyed by `code` (matches branch `origin`). 38
  entries: 35 `casa`, plus `brou`/`itau` (`banco`) and `prex` (`fintech`). Also
  carries `googleRating: number | null` and `googleReviewCount: number | null` per
  casa (aggregate, not per-branch).
- `Horarios`/`hours` is populated by exactly **one** of ~45 scrapers
  (`classes/cambios/cambilex.ts:62`); every other origin defaults to `""`
  (`classes/cambioInfo.ts:38`). No structured open/closed data exists — real
  "open now" logic is not feasible without a separate data-collection effort.
- No Waze link-builder exists anywhere (`grep` confirmed zero matches). Google Maps
  links are built ad hoc as **search** URLs (not directions) in two places:
  `app/pages/mapa.vue:190-192` and `app/components/map/LocationsMap.vue:109-111,163`.
- Homepage (`app/pages/index.vue`) has a 5-card "internal-links-section"
  (`VCard.internal-link-card`, lines ~675-777) linking to `/historico`,
  `/sucursales`, `/avanzado`, `/cotizacion`, `/indicadores`. No hero-style banner
  section currently exists; this feature gets a new one.
- Site is trilingual (ES/EN/PT) throughout; this page follows the same pattern
  (e.g. `/retirar-efectivo-uruguay`).

## Decisions (from brainstorm)

- **New standalone page**, not a revamp of `/mapa`. `/mapa` stays as the raw
  power-tool (all branches, all institutions); the new page is the curated,
  opinionated "just show me the best casa" experience.
- **Exclude bancos/fintech by default, no toggle** — the page is casas-de-cambio-only.
  Users wanting BROU/Itaú/Prex/bank branches use `/mapa`.
- **Hours: show text when available, omit otherwise.** No fabricated "open now"
  claim. Backfilling real hours data is a separate future effort.
- **Blended smart ranking**: distance + rate + Google rating combined into one score
  (not pure best-rate-first like `/mapa`), with a manual re-sort option.
- **List-first, mobile-first layout.** Map is secondary, behind a toggle.
- **Homepage: new hero-style banner**, not just another card in the existing grid.

## Architecture

### Component boundaries (each independently testable)

1. **`app/utils/nearbyCasas.ts`** (new, pure, TDD target)
   - Input: `MapBranch[]`, `RatesByOrigin`, `CASAS_REPUTATION`, user coords, radius,
     currency, direction.
   - Step 1 — **filter to casas only**: join each branch's `origin` to
     `CASAS_REPUTATION` by `code`; keep only `category === 'casa'`. Branches whose
     origin has no reputation entry at all are also excluded (fail closed — never
     show an unclassified origin as a "casa de cambio").
   - Step 2 — **dedupe to nearest branch per casa**: a chain with 5 branches
     contributes exactly one row (its closest branch within radius), so the list
     ranks *casas*, not raw branches.
   - Step 3 — **score**: normalize each of distance (closer = better, clamped to
     `radiusKm`), rate (relative to the best available rate in the result set), and
     `googleRating` (defaulted to a neutral 3.0 when null) to 0–1, weighted
     **45% rate / 35% distance / 20% rating**, descending sort.
   - Returns `{branch, casa (CasaReputation), distanceKm, rate, score}[]`, plus the
     raw per-field values so the UI can offer "sort by distance only" / "sort by
     rate only" without recomputing.
   - Reuses `haversineKm` and `RatesByOrigin`/`buildRatesByOrigin` from the existing
     `app/utils/nearbyRates.ts` rather than duplicating them.

2. **`app/utils/directions.ts`** (new, pure)
   - `googleMapsDirectionsUrl(lat, lng, label?)` →
     `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` (destination
     coords, not a text search — actually launches navigation).
   - `wazeUrl(lat, lng)` → `https://waze.com/ul?ll={lat},{lng}&navigate=yes`.
   - The two ad-hoc Google Maps URL builders in `mapa.vue` and `LocationsMap.vue`
     are left as-is (`/mapa` is untouched by this work, per Out of Scope below) —
     only the new page's cards call this util.

3. **New page `app/pages/casa-de-cambio-cerca-de-mi.vue`**
   - Control bar (compact, mobile-first): geolocate button with quick-pick city
     chips fallback (Montevideo / Punta del Este / Colonia / Salto) when geolocation
     is denied or unavailable, radius slider, currency picker (default USD), and the
     existing friendly buy/sell copy pattern from `/mapa`
     (`t('map.haveForeign')` / `needForeign`).
   - Sort control: "Recomendado" (blended score, default) / "Más cerca" / "Mejor tasa".
   - Result list: stacked full-width cards, one per casa —
     name, ★ rating + review count (or "Sin reseñas" when null), distance, rate
     badge, hours line (omitted when empty), and two primary-action buttons:
     **"Cómo llegar"** (Google Maps directions) and **"Abrir en Waze"**.
   - Map: collapsed by default behind a "Ver en mapa" toggle; when expanded, reuses
     `LocationsMap.vue` with the same filtered/deduped result set as pins.
   - Uses `nearbyCasas.ts` for ranking and `directions.ts` for the action buttons.

4. **Homepage banner** (`app/pages/index.vue`)
   - New standalone section (own `VRow`/`VCard`, visually distinct from the
     5-card `internal-links-section`), placed near the top — after the main rate
     table. Icon + heading ("Encontrá la mejor casa de cambio cerca tuyo") + one CTA
     button linking to the new page via `localePath`.

5. **Cross-cutting**
   - i18n strings in `app/i18n/locales/json` (es/en/pt).
   - SEO: page meta + JSON-LD (`ItemList`, similar precedent to `/mapa`), following
     the `/retirar-efectivo-uruguay` pattern for a tourist-facing page.
   - Nav/footer link to the new page.

### Data flow

```
/api/locations (MapBranch[]) ──────────────┐
                                            ├─► nearbyCasas.ts ─► ranked casa list
CASAS_REPUTATION (category+rating) ────────┤        │
                                            │        └─► directions.ts (per card)
getProcessedExchangeData() (rates) ────────┘
                                                        │
                                                        └─► LocationsMap.vue (toggle)
```

## Edge cases

- **Origin with no `CASAS_REPUTATION` entry**: excluded entirely (fail closed —
  matches the "never mislabel a bank as a casa" requirement; also protects against
  a future bank/fintech scraper being added without a reputation entry).
- **BROU-mirror casas** (`cambio_federal`/`cambio_argentino`/`cambio_romantico`):
  still `category:'casa'` in `CASAS_REPUTATION`, so they remain included even though
  their branches physically overlap BROU's — same precedent as `/mapa`.
- **No googleRating**: neutral 3.0 fed into the score; badge shows "Sin reseñas"
  instead of a star count.
- **Empty `hours`**: hours line omitted from the card entirely, no placeholder text.
- **No casa within radius**: hard-filtered out (same as `/mapa`'s actual `rankNearby`
  behavior) — the page shows a "no casas in that radius, try widening it" empty
  state rather than back-filling with out-of-radius results.
- **Geolocation denied**: quick-pick city chips fallback; if none chosen either,
  default to Montevideo center same as `/mapa`.
- **Missing rate for chosen currency**: casa excluded from that currency's ranking
  (not shown as rate 0), consistent with existing `rankNearby` behavior.

## Testing

- **Unit (TDD):** `nearbyCasas.ts` — category filter (excludes banco/fintech/
  unclassified), per-casa dedupe (nearest branch wins), score weighting/normalization,
  neutral-rating fallback, missing-rate skip, empty input.
- **Unit:** `directions.ts` — URL shape for both builders, fallback when coords
  missing.
- **e2e smoke:** load the new page, geolocate (or pick a city chip), confirm cards
  render with distance/rate/rating, confirm both action buttons produce correctly
  shaped URLs, confirm map toggle expands `LocationsMap` (accounting for the known
  headless-Playwright Leaflet-mount caveat — assert on data/DOM, not tile pixels).
- **Manual verify:** homepage banner links to the new page; page renders correctly
  on a real mobile viewport; tap-through to Google Maps and Waze actually opens
  navigation to the right coordinates.

## Out of scope (YAGNI)

- Real-time open/closed status (hours data is too sparse; text-when-available only).
- Backfilling hours data for the ~44 origins missing it (separate future effort).
- Per-branch ratings (rating is per-casa/aggregate, same as `casas-de-cambio.vue`).
- Editing/managing `/mapa` itself — it is untouched by this work.
- Routing/turn-by-turn navigation inside the app (link out to Maps/Waze instead).

## Build flow

Spec (this doc) → user review → `writing-plans` → `subagent-driven-development`
executing each task with a review checkpoint between steps.
