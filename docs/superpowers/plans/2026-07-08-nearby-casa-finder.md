# Nearby Casa Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/casa-de-cambio-cerca-de-mi`, a mobile-first page that ranks nearby *casas de cambio only* (never bancos/fintechs) by a blended distance + rate + Google-rating score, with one-tap Google Maps / Waze navigation, featured via a new hero banner on the homepage.

**Architecture:** Two new pure utils (`nearbyCasas.ts` ranking, `directions.ts` link-building) reuse the existing `nearbyRates.ts`/`locations.ts`/`casasDirectory.ts` data layer. A new presentational `NearbyCasaCard.vue` renders each result; a new page wires geolocation + filters + the ranked list + an optional `LocationsMap.vue` toggle. `/mapa` and `LocationsMap.vue` are not modified.

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript, Vuetify, Vitest (unit), Playwright (e2e), `@nuxtjs/i18n` (es/en/pt).

## Global Constraints

- Every new branch's `origin` MUST be excluded unless it has a `CASAS_REPUTATION` entry with `category === 'casa'` — fail closed (spec: never label a banco/fintech as a casa de cambio).
- One row per casa, nearest branch only — never list the same casa's branches twice.
- Blended score weights: **45% rate / 35% distance / 20% Google rating**, rating defaults to neutral `3` when `googleRating` is `null`.
- Hours text shown only when the branch's `hours` string is non-empty; never fabricate an "open now" claim.
- Every new user-facing string ships in `es.json`, `en.json`, and `pt.json` (site is trilingual).
- `app/pages/mapa.vue` and `app/components/map/LocationsMap.vue` are used as-is (props/behavior unchanged) — do not edit them.
- New page's own inline map toggle reuses `LocationsMap.vue`'s **default** popup (Google Maps search link) — the new Maps/Waze deep-links only appear on the card buttons, not inside map popups. This is an accepted, intentional inconsistency (see spec Out of Scope).
- All commands below run from the repo root unless a step says otherwise; `app/` has its own `package.json`.

---

### Task 1: `nearbyCasas.ts` — ranking/filter/dedupe util (TDD)

**Files:**
- Create: `app/utils/nearbyCasas.ts`
- Test: `app/tests/unit/nearby-casas.test.ts`

**Interfaces:**
- Consumes: `haversineKm(a: LatLng, b: LatLng): number`, `type LatLng`, `type RatesByOrigin` from `app/utils/nearbyRates.ts` (existing, unchanged). `type CasaReputation` from `app/utils/casasDirectory.ts` (existing, unchanged) — has `code: string`, `category: 'casa'|'banco'|'fintech'`, `googleRating: number | null`.
- Produces: `rankNearbyCasas<T extends {origin: string; lat: number; lng: number}>(branches: T[], reputations: CasaReputation[], rates: RatesByOrigin, user: LatLng, radiusKm: number, currency: string, direction: 'buy'|'sell'): RankedCasa<T>[]` and `interface RankedCasa<T> { branch: T; casa: CasaReputation; distanceKm: number; rate: number; score: number }` — both used by Task 5 (the new page).

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/nearby-casas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rankNearbyCasas } from '../../utils/nearbyCasas'
import { buildRatesByOrigin } from '../../utils/nearbyRates'
import type { CasaReputation } from '../../utils/casasDirectory'

const user = { lat: -34.9011, lng: -56.1645 } // central Montevideo

function makeCasa(overrides: Partial<CasaReputation> & { code: string }): CasaReputation {
  return {
    name: overrides.code,
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote: null,
    founded: null,
    services: [],
    strengths: [],
    weaknesses: [],
    press: [],
    sources: [],
    ...overrides,
  }
}

describe('rankNearbyCasas', () => {
  it('excludes bancos and fintechs even when closest and best-rated', () => {
    const branches = [
      { origin: 'casaA', lat: -34.9055, lng: -56.1922, id: 'a' }, // ~1.7 km
      { origin: 'brou', lat: -34.9012, lng: -56.1646, id: 'bank' }, // ~0 km
      { origin: 'prex', lat: -34.9013, lng: -56.1647, id: 'fin' }, // ~0 km
    ]
    const reputations = [
      makeCasa({ code: 'casaA' }),
      makeCasa({ code: 'brou', category: 'banco', googleRating: 4.8 }),
      makeCasa({ code: 'prex', category: 'fintech', googleRating: 4.9 }),
    ]
    const rates = buildRatesByOrigin([
      { origin: 'casaA', code: 'USD', buy: 40.0, sell: 41.0 },
      { origin: 'brou', code: 'USD', buy: 45.0, sell: 45.5 },
      { origin: 'prex', code: 'USD', buy: 46.0, sell: 46.5 },
    ])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['casaA'])
  })

  it('excludes an origin with no reputation entry at all (fail closed)', () => {
    const branches = [{ origin: 'unknownOrigin', lat: -34.9012, lng: -56.1646, id: 'u' }]
    const rates = buildRatesByOrigin([{ origin: 'unknownOrigin', code: 'USD', buy: 50, sell: 51 }])
    const out = rankNearbyCasas(branches, [], rates, user, 10, 'USD', 'buy')
    expect(out).toEqual([])
  })

  it('dedupes multiple branches of the same casa, keeping the nearest', () => {
    const branches = [
      { origin: 'casaA', lat: -34.9080, lng: -56.2100, id: 'far' }, // ~4.2 km
      { origin: 'casaA', lat: -34.9055, lng: -56.1922, id: 'near' }, // ~1.7 km
    ]
    const reputations = [makeCasa({ code: 'casaA' })]
    const rates = buildRatesByOrigin([{ origin: 'casaA', code: 'USD', buy: 40, sell: 41 }])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out).toHaveLength(1)
    expect(out[0].branch.id).toBe('near')
  })

  it('weighs rate (45%) above distance (35%): best-rate-but-farther beats closer-but-worse-rate', () => {
    const branches = [
      { origin: 'closeButCheap', lat: -34.9055, lng: -56.1922, id: 'close' }, // ~1.7 km
      { origin: 'farButBest', lat: -34.9080, lng: -56.2100, id: 'far' }, // ~4.2 km
    ]
    const reputations = [makeCasa({ code: 'closeButCheap' }), makeCasa({ code: 'farButBest' })]
    const rates = buildRatesByOrigin([
      { origin: 'closeButCheap', code: 'USD', buy: 39.0, sell: 40.0 },
      { origin: 'farButBest', code: 'USD', buy: 41.0, sell: 42.0 },
    ])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['farButBest', 'closeButCheap'])
  })

  it('breaks a distance+rate tie using googleRating', () => {
    const branches = [
      { origin: 'rated', lat: -34.9055, lng: -56.1922, id: 'r' },
      { origin: 'unrated', lat: -34.9055, lng: -56.1922, id: 'u' },
    ]
    const reputations = [
      makeCasa({ code: 'rated', googleRating: 4.8, googleReviewCount: 100 }),
      makeCasa({ code: 'unrated', googleRating: null, googleReviewCount: null }),
    ]
    const rates = buildRatesByOrigin([
      { origin: 'rated', code: 'USD', buy: 40, sell: 41 },
      { origin: 'unrated', code: 'USD', buy: 40, sell: 41 },
    ])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['rated', 'unrated'])
  })

  it('excludes branches with no rate for the chosen currency', () => {
    const branches = [{ origin: 'casaA', lat: -34.9055, lng: -56.1922, id: 'a' }]
    const reputations = [makeCasa({ code: 'casaA' })]
    const out = rankNearbyCasas(branches, reputations, {}, user, 10, 'USD', 'buy')
    expect(out).toEqual([])
  })

  it('excludes branches outside the radius', () => {
    const branches = [{ origin: 'casaA', lat: -34.8350, lng: -55.9500, id: 'far' }] // ~21 km
    const reputations = [makeCasa({ code: 'casaA' })]
    const rates = buildRatesByOrigin([{ origin: 'casaA', code: 'USD', buy: 40, sell: 41 }])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out).toEqual([])
  })

  it('empty branches yields empty result', () => {
    expect(rankNearbyCasas([], [], {}, user, 10, 'USD', 'buy')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/nearby-casas.test.ts`
Expected: FAIL — `Cannot find module '../../utils/nearbyCasas'`.

- [ ] **Step 3: Write the implementation**

Create `app/utils/nearbyCasas.ts`:

```ts
import { haversineKm, type LatLng, type RatesByOrigin } from './nearbyRates'
import type { CasaReputation } from './casasDirectory'

export interface RankedCasa<T> {
  branch: T
  casa: CasaReputation
  distanceKm: number
  rate: number
  score: number
}

const NEUTRAL_RATING = 3
const WEIGHT_RATE = 0.45
const WEIGHT_DISTANCE = 0.35
const WEIGHT_RATING = 0.2

/**
 * Ranks casas de cambio (never bancos/fintechs) near the user by a blended
 * score of rate, distance and Google rating. Excludes any branch whose
 * origin has no CASAS_REPUTATION entry, or whose entry isn't category:'casa'
 * — fail closed so a bank/fintech is never shown as a casa de cambio.
 * Dedupes multiple branches of the same casa down to its nearest one.
 */
export function rankNearbyCasas<T extends { origin: string; lat: number; lng: number }>(
  branches: T[],
  reputations: CasaReputation[],
  rates: RatesByOrigin,
  user: LatLng,
  radiusKm: number,
  currency: string,
  direction: 'buy' | 'sell'
): RankedCasa<T>[] {
  const casaByCode = new Map(
    reputations.filter(r => r.category === 'casa').map(r => [r.code, r])
  )

  const nearestByOrigin = new Map<string, { branch: T; distanceKm: number; rate: number }>()
  for (const b of branches || []) {
    if (!casaByCode.has(b.origin)) continue
    const distanceKm = haversineKm(user, { lat: b.lat, lng: b.lng })
    if (distanceKm > radiusKm) continue
    const rate = rates[b.origin]?.[currency]?.[direction]
    if (rate == null || !(rate > 0)) continue
    const prev = nearestByOrigin.get(b.origin)
    if (!prev || distanceKm < prev.distanceKm) {
      nearestByOrigin.set(b.origin, { branch: b, distanceKm, rate })
    }
  }

  const entries = [...nearestByOrigin.entries()]
  if (entries.length === 0) return []

  const rateValues = entries.map(([, e]) => e.rate)
  const distanceValues = entries.map(([, e]) => e.distanceKm)
  const bestRate = direction === 'buy' ? Math.max(...rateValues) : Math.min(...rateValues)
  const worstRate = direction === 'buy' ? Math.min(...rateValues) : Math.max(...rateValues)
  const rateSpan = Math.abs(bestRate - worstRate)
  const minDistance = Math.min(...distanceValues)
  const maxDistance = Math.max(...distanceValues)
  const distanceSpan = maxDistance - minDistance

  const scored: RankedCasa<T>[] = entries.map(([origin, e]) => {
    const casa = casaByCode.get(origin)!
    const rateScore = rateSpan === 0 ? 1 : 1 - Math.abs(bestRate - e.rate) / rateSpan
    const distanceScore =
      distanceSpan === 0 ? 1 : 1 - (e.distanceKm - minDistance) / distanceSpan
    const ratingScore = (casa.googleRating ?? NEUTRAL_RATING) / 5
    const score =
      rateScore * WEIGHT_RATE + distanceScore * WEIGHT_DISTANCE + ratingScore * WEIGHT_RATING
    return { branch: e.branch, casa, distanceKm: e.distanceKm, rate: e.rate, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/nearby-casas.test.ts`
Expected: PASS — 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/utils/nearbyCasas.ts app/tests/unit/nearby-casas.test.ts
git commit -m "$(cat <<'EOF'
feat(nearby-casas): add blended distance/rate/rating ranking util

Pure rankNearbyCasas() joins branches to CASAS_REPUTATION by origin,
excludes bancos/fintechs and unclassified origins (fail closed),
dedupes to nearest branch per casa, and scores 45% rate / 35% distance
/ 20% Google rating (neutral 3 when unrated).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `directions.ts` — Google Maps / Waze link builder (TDD)

**Files:**
- Create: `app/utils/directions.ts`
- Test: `app/tests/unit/directions.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no deps).
- Produces: `googleMapsDirectionsUrl(lat: number, lng: number): string`, `wazeUrl(lat: number, lng: number): string` — both used by Task 4 (`NearbyCasaCard.vue`).

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/directions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { googleMapsDirectionsUrl, wazeUrl } from '../../utils/directions'

describe('googleMapsDirectionsUrl', () => {
  it('builds a directions URL from coordinates', () => {
    expect(googleMapsDirectionsUrl(-34.9011, -56.1645)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-34.9011,-56.1645'
    )
  })
})

describe('wazeUrl', () => {
  it('builds a Waze navigation URL from coordinates', () => {
    expect(wazeUrl(-34.9011, -56.1645)).toBe(
      'https://waze.com/ul?ll=-34.9011,-56.1645&navigate=yes'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/directions.test.ts`
Expected: FAIL — `Cannot find module '../../utils/directions'`.

- [ ] **Step 3: Write the implementation**

Create `app/utils/directions.ts`:

```ts
/** Google Maps turn-by-turn directions to a coordinate (not a text search). */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Waze navigation deep link to a coordinate. */
export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/directions.test.ts`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/utils/directions.ts app/tests/unit/directions.test.ts
git commit -m "$(cat <<'EOF'
feat(nearby-casas): add Google Maps / Waze directions URL builder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: i18n copy — `nearbyCasas` namespace + SEO keys (es/en/pt)

**Files:**
- Modify: `app/i18n/locales/json/es.json:79-80`, `app/i18n/locales/json/es.json:630-631`
- Modify: `app/i18n/locales/json/en.json:79-80`, `app/i18n/locales/json/en.json` (matching `mapaTitle`/`mapaDescription` lines)
- Modify: `app/i18n/locales/json/pt.json:79-80`, `app/i18n/locales/json/pt.json` (matching `mapaTitle`/`mapaDescription` lines)

**Interfaces:**
- Produces: i18n keys `nearbyCasas.title`, `.subtitle`, `.chooseCity`, `.sortSmart`, `.sortDistance`, `.sortRate`, `.noneInRadius`, `.noReviews`, `.viewOnMap`, `.hideMap`, `.getDirections`, `.openWaze`, `.homeBannerTitle`, `.homeBannerSubtitle`, `.homeBannerCta`, and `seo.nearbyCasasTitle`, `seo.nearbyCasasDescription` — consumed by Task 4, 5, and 6.

- [ ] **Step 1: Add the `nearbyCasas` block to `es.json`**

In `app/i18n/locales/json/es.json`, the `"map": { ... }` block ends at line 80 with `},` immediately followed by `"welcome": ...` on line 81. Insert a new top-level key right after it:

```json
  "map": {
    "nav": "Mapa",
    ...
    "withdrawCash": "Retiro de efectivo"
  },
  "nearbyCasas": {
    "title": "Encontrá la mejor casa de cambio cerca tuyo",
    "subtitle": "Combinamos distancia, cotización y reseñas de Google para recomendarte la mejor opción. Solo casas de cambio reales — nunca bancos ni fintech.",
    "chooseCity": "O elegí tu ciudad",
    "sortSmart": "Recomendado",
    "sortDistance": "Más cerca",
    "sortRate": "Mejor tasa",
    "noneInRadius": "No hay casas de cambio en ese radio. Probá ampliarlo.",
    "noReviews": "Sin reseñas",
    "viewOnMap": "Ver en el mapa",
    "hideMap": "Ocultar mapa",
    "getDirections": "Cómo llegar",
    "openWaze": "Abrir en Waze",
    "homeBannerTitle": "Encontrá la mejor casa de cambio cerca tuyo",
    "homeBannerSubtitle": "Distancia, cotización y reseñas en un solo lugar. Andá directo con Google Maps o Waze.",
    "homeBannerCta": "Buscar cerca de mí"
  },
  "welcome": "Encuentra la mejor cotización en el mercado, comparando entre más de 40 casas de cambio.",
```

- [ ] **Step 2: Add the SEO keys to `es.json`**

Find `"mapaTitle": "Mapa de casas de cambio en Uruguay | Cambio Uruguay",` and `"mapaDescription": "..."` (around line 630-631, inside the `"seo": { ... }` block) and add two sibling keys right after `mapaDescription`'s line:

```json
    "mapaTitle": "Mapa de casas de cambio en Uruguay | Cambio Uruguay",
    "mapaDescription": "Mapa interactivo de casas de cambio en Uruguay. Encontrá la sucursal más cercana y la mejor cotización del dólar a tu alrededor.",
    "nearbyCasasTitle": "Mejor Casa de Cambio Cerca de Mí en Uruguay | Cambio Uruguay",
    "nearbyCasasDescription": "Encontrá la casa de cambio real más cercana con mejor cotización y reseñas. Navegá directo con Google Maps o Waze. Sin bancos ni fintech."
```

(Keep whatever trailing comma the original `mapaDescription` line had, and make sure the new `nearbyCasasDescription` line's trailing comma matches what follows it in the file.)

- [ ] **Step 3: Repeat for `en.json`**

Same two insertions in `app/i18n/locales/json/en.json`:

```json
  "nearbyCasas": {
    "title": "Find the best exchange house near you",
    "subtitle": "We combine distance, exchange rate, and Google reviews to recommend the best option. Real exchange houses only — never banks or fintechs.",
    "chooseCity": "Or pick your city",
    "sortSmart": "Recommended",
    "sortDistance": "Closest",
    "sortRate": "Best rate",
    "noneInRadius": "No exchange houses within that radius. Try widening it.",
    "noReviews": "No reviews",
    "viewOnMap": "View on map",
    "hideMap": "Hide map",
    "getDirections": "Directions",
    "openWaze": "Open in Waze",
    "homeBannerTitle": "Find the best exchange house near you",
    "homeBannerSubtitle": "Distance, exchange rate, and reviews in one place. Go straight there with Google Maps or Waze.",
    "homeBannerCta": "Find near me"
  },
```

```json
    "nearbyCasasTitle": "Best Exchange House Near Me in Uruguay | Cambio Uruguay",
    "nearbyCasasDescription": "Find the closest real exchange house with the best rate and reviews. Navigate directly with Google Maps or Waze. No banks or fintechs."
```

- [ ] **Step 4: Repeat for `pt.json`**

Same two insertions in `app/i18n/locales/json/pt.json`:

```json
  "nearbyCasas": {
    "title": "Encontre a melhor casa de câmbio perto de você",
    "subtitle": "Combinamos distância, cotação e avaliações do Google para recomendar a melhor opção. Somente casas de câmbio reais — nunca bancos ou fintechs.",
    "chooseCity": "Ou escolha sua cidade",
    "sortSmart": "Recomendado",
    "sortDistance": "Mais perto",
    "sortRate": "Melhor cotação",
    "noneInRadius": "Não há casas de câmbio nesse raio. Tente ampliá-lo.",
    "noReviews": "Sem avaliações",
    "viewOnMap": "Ver no mapa",
    "hideMap": "Ocultar mapa",
    "getDirections": "Como chegar",
    "openWaze": "Abrir no Waze",
    "homeBannerTitle": "Encontre a melhor casa de câmbio perto de você",
    "homeBannerSubtitle": "Distância, cotação e avaliações em um só lugar. Vá direto com Google Maps ou Waze.",
    "homeBannerCta": "Buscar perto de mim"
  },
```

```json
    "nearbyCasasTitle": "Melhor Casa de Câmbio Perto de Mim no Uruguai | Cambio Uruguay",
    "nearbyCasasDescription": "Encontre a casa de câmbio real mais próxima com a melhor cotação e avaliações. Navegue direto com Google Maps ou Waze. Sem bancos ou fintechs."
```

- [ ] **Step 5: Verify all three files are still valid JSON**

Run: `cd app && node -e "['es','en','pt'].forEach(l => { JSON.parse(require('fs').readFileSync('i18n/locales/json/'+l+'.json','utf8')); console.log(l, 'OK') })"`
Expected: `es OK`, `en OK`, `pt OK` (a `SyntaxError` means a misplaced comma from the manual edit — fix it before continuing).

- [ ] **Step 6: Commit**

```bash
git add app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "$(cat <<'EOF'
feat(nearby-casas): add nearbyCasas i18n copy (es/en/pt)

Copy for the new nearby-casa-finder page, homepage banner, and SEO
meta tags, matching the existing map.* namespace conventions.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `NearbyCasaCard.vue` — result card component

**Files:**
- Create: `app/components/nearby/NearbyCasaCard.vue`

**Interfaces:**
- Consumes: `googleMapsDirectionsUrl`, `wazeUrl` from `app/utils/directions.ts` (Task 2); i18n keys `nearbyCasas.noReviews`, `.getDirections`, `.openWaze` (Task 3).
- Produces: component `NearbyCasaCard` with props `{ rank: number; name: string; distanceKm: number; rateLabel: string; currencyCode: string; googleRating: number | null; googleReviewCount: number | null; hours: string; address: string; locality: string; lat: number; lng: number }` — consumed by Task 5 (the new page). Root element carries `data-testid="nearby-casa-row"`; the name element carries `data-testid="nearby-casa-row-name"`; the two link buttons carry `data-testid="nearby-directions-link"` / `data-testid="nearby-waze-link"` — all four are asserted on by Task 8's e2e test.

- [ ] **Step 1: Write the component**

Create `app/components/nearby/NearbyCasaCard.vue`:

```vue
<template>
  <VCard class="nearby-casa-card pa-4 mb-3" variant="outlined" data-testid="nearby-casa-row">
    <div class="d-flex align-start ga-3">
      <span class="nearby-rank">{{ rank }}</span>
      <div class="flex-grow-1">
        <div class="d-flex align-center flex-wrap ga-2">
          <h3 class="text-subtitle-1 font-weight-bold mb-0" data-testid="nearby-casa-row-name">
            {{ name }}
          </h3>
          <span class="text-body-2">
            <template v-if="googleRating != null">
              <VIcon size="14" color="amber">mdi-star</VIcon>
              {{ googleRating.toFixed(1) }} ({{ googleReviewCount }})
            </template>
            <template v-else>{{ t('nearbyCasas.noReviews') }}</template>
          </span>
        </div>
        <div class="text-body-2 mt-1">
          {{ currencyCode }} {{ rateLabel }} · {{ distanceKm.toFixed(1) }} km
        </div>
        <div v-if="address" class="text-caption text-grey-lighten-1 mt-1">
          {{ address }}<template v-if="locality">, {{ locality }}</template>
        </div>
        <div v-if="hours" class="text-caption mt-1">
          <VIcon size="12">mdi-clock-outline</VIcon> {{ hours }}
        </div>
        <div class="d-flex ga-2 mt-3 flex-wrap">
          <VBtn
            :href="mapsHref"
            target="_blank"
            rel="noopener"
            color="primary"
            size="small"
            variant="flat"
            data-testid="nearby-directions-link"
          >
            <VIcon start size="16">mdi-google-maps</VIcon>{{ t('nearbyCasas.getDirections') }}
          </VBtn>
          <VBtn
            :href="wazeHref"
            target="_blank"
            rel="noopener"
            color="info"
            size="small"
            variant="outlined"
            data-testid="nearby-waze-link"
          >
            <VIcon start size="16">mdi-waze</VIcon>{{ t('nearbyCasas.openWaze') }}
          </VBtn>
        </div>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { googleMapsDirectionsUrl, wazeUrl } from '~/utils/directions'

interface Props {
  rank: number
  name: string
  distanceKm: number
  rateLabel: string
  currencyCode: string
  googleRating: number | null
  googleReviewCount: number | null
  hours: string
  address: string
  locality: string
  lat: number
  lng: number
}

const props = defineProps<Props>()
const { t } = useI18n()

const mapsHref = computed(() => googleMapsDirectionsUrl(props.lat, props.lng))
const wazeHref = computed(() => wazeUrl(props.lat, props.lng))
</script>

<style scoped>
.nearby-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `cd app && npm run lint`
Expected: no new errors from `app/components/nearby/NearbyCasaCard.vue` ([[typecheck-broken]] memory: `npm run typecheck` itself is known-broken in this repo — use `lint`, not `typecheck`).

- [ ] **Step 3: Commit**

```bash
git add app/components/nearby/NearbyCasaCard.vue
git commit -m "$(cat <<'EOF'
feat(nearby-casas): add NearbyCasaCard presentational component

Flat-props card (name/distance/rate/rating/hours + Maps/Waze buttons)
so it has no dependency on CasaReputation/MapBranch internals.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `casa-de-cambio-cerca-de-mi.vue` — the new page

**Files:**
- Create: `app/pages/casa-de-cambio-cerca-de-mi.vue`

**Interfaces:**
- Consumes: `rankNearbyCasas`, `type RankedCasa` (Task 1); `buildRatesByOrigin`, `type RatesByOrigin` from `app/utils/nearbyRates.ts` (existing); `CASAS_REPUTATION` from `app/utils/casasDirectory.ts` (existing); `type MapBranch` from `app/server/utils/locations.ts` (existing, type-only import); `NearbyCasaCard` (Task 4); `LocationsMap` from `app/components/map/LocationsMap.vue` (existing, unmodified); `getAllLocations`, `getProcessedExchangeData` from `useApiService()` (existing composable, auto-imported); i18n keys `map.currency`, `map.direction`, `map.radius`, `map.useMyLocation`, `map.haveForeign`, `map.needForeign`, `map.geoUnavailable`, `map.geoDenied`, `map.setLocationHint` (existing) plus the full `nearbyCasas.*` / `seo.nearbyCasas*` set (Task 3).
- Produces: route `/casa-de-cambio-cerca-de-mi` — linked by Task 6 (homepage banner) and Task 7 (footer).

- [ ] **Step 1: Write the page**

Create `app/pages/casa-de-cambio-cerca-de-mi.vue`:

```vue
<template>
  <v-container fluid class="pa-2 pa-sm-4 nearby-casas-page">
    <h1 class="text-h5 mb-2">{{ t('nearbyCasas.title') }}</h1>
    <p class="text-body-2 mb-4">{{ t('nearbyCasas.subtitle') }}</p>

    <v-row dense class="mb-2">
      <v-col cols="6" sm="4" md="3">
        <v-select
          v-model="currency"
          :items="currencyItems"
          :label="t('map.currency')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="6" sm="4" md="3">
        <v-select
          v-model="direction"
          :items="directionItems"
          :label="t('map.direction')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="4" md="3">
        <span class="text-caption">{{ t('map.radius') }}: {{ radiusKm }} km</span>
        <v-slider
          v-model="radiusKm"
          :min="1"
          :max="50"
          :step="1"
          hide-details
          density="compact"
          :aria-label="`${t('map.radius')} (km)`"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" :loading="locating" block @click="locate">
          <v-icon start>mdi-crosshairs-gps</v-icon>{{ t('map.useMyLocation') }}
        </v-btn>
      </v-col>
    </v-row>

    <v-alert
      v-if="geoError"
      type="warning"
      density="compact"
      class="mb-2"
      closable
      @click:close="geoError = ''"
    >
      {{ geoError }}
    </v-alert>

    <div v-if="!userLocation" class="mb-4">
      <p class="text-caption mb-1">{{ t('nearbyCasas.chooseCity') }}</p>
      <v-chip-group>
        <v-chip
          v-for="city in QUICK_CITIES"
          :key="city.name"
          size="small"
          variant="outlined"
          data-testid="nearby-city-chip"
          @click="setLocation(city.lat, city.lng)"
        >
          {{ city.name }}
        </v-chip>
      </v-chip-group>
    </div>

    <template v-if="userLocation">
      <v-btn-toggle
        v-model="sortMode"
        mandatory
        density="compact"
        color="primary"
        variant="outlined"
        divided
        class="mb-3"
      >
        <v-btn value="smart" size="small">{{ t('nearbyCasas.sortSmart') }}</v-btn>
        <v-btn value="distance" size="small">{{ t('nearbyCasas.sortDistance') }}</v-btn>
        <v-btn value="rate" size="small">{{ t('nearbyCasas.sortRate') }}</v-btn>
      </v-btn-toggle>

      <div v-if="sorted.length" class="nearby-list">
        <NearbyCasaCard
          v-for="(item, i) in sorted"
          :key="item.branch.id"
          :rank="i + 1"
          :name="item.casa.name"
          :distance-km="item.distanceKm"
          :rate-label="formatRate(item.rate)"
          :currency-code="currency"
          :google-rating="item.casa.googleRating"
          :google-review-count="item.casa.googleReviewCount"
          :hours="item.branch.hours"
          :address="item.branch.address"
          :locality="item.branch.locality"
          :lat="item.branch.lat"
          :lng="item.branch.lng"
        />
      </div>
      <v-alert v-else type="info" variant="tonal" density="comfortable">
        {{ t('nearbyCasas.noneInRadius') }}
      </v-alert>

      <div class="mt-4">
        <v-btn variant="outlined" @click="showMap = !showMap">
          <v-icon start>mdi-map</v-icon>
          {{ showMap ? t('nearbyCasas.hideMap') : t('nearbyCasas.viewOnMap') }}
        </v-btn>
        <LocationsMap
          v-if="showMap"
          :branches="mapBranches"
          :user-location="userLocation"
          :radius-km="radiusKm"
          height="60vh"
          class="mt-3"
        />
      </div>
    </template>
    <v-card v-else variant="outlined" class="pa-6 text-center">
      {{ t('map.setLocationHint') }}
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NearbyCasaCard from '~/components/nearby/NearbyCasaCard.vue'
import LocationsMap from '~/components/map/LocationsMap.vue'
import { buildRatesByOrigin, type RatesByOrigin } from '~/utils/nearbyRates'
import { rankNearbyCasas, type RankedCasa } from '~/utils/nearbyCasas'
import { CASAS_REPUTATION } from '~/utils/casasDirectory'
import type { MapBranch } from '~/server/utils/locations'

const { t, locale } = useI18n()
const { getAllLocations, getProcessedExchangeData } = useApiService()

const branches = ref<MapBranch[]>([])
const ratesByOrigin = ref<RatesByOrigin>({})

const currency = ref('USD')
const direction = ref<'buy' | 'sell'>('buy')
const radiusKm = ref(5)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const locating = ref(false)
const geoError = ref('')
const showMap = ref(false)
const sortMode = ref<'smart' | 'distance' | 'rate'>('smart')

// Quick-pick fallback when geolocation is denied/unavailable — tourist-friendly
// alternative to a silent Montevideo default (unlike /mapa, we don't force a
// location the user hasn't chosen; the empty-state prompt stays visible until
// they either geolocate or tap a chip).
const QUICK_CITIES = [
  { name: 'Montevideo', lat: -34.9011, lng: -56.1645 },
  { name: 'Punta del Este', lat: -34.967, lng: -54.95 },
  { name: 'Colonia del Sacramento', lat: -34.4626, lng: -57.84 },
  { name: 'Salto', lat: -31.3833, lng: -57.9667 },
]

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

const ranked = computed<RankedCasa<MapBranch>[]>(() => {
  if (!userLocation.value) return []
  return rankNearbyCasas(
    branches.value,
    CASAS_REPUTATION,
    ratesByOrigin.value,
    userLocation.value,
    radiusKm.value,
    currency.value,
    direction.value
  )
})

const sorted = computed(() => {
  const list = [...ranked.value]
  if (sortMode.value === 'distance') {
    list.sort((a, b) => a.distanceKm - b.distanceKm)
  } else if (sortMode.value === 'rate') {
    list.sort((a, b) => (direction.value === 'buy' ? b.rate - a.rate : a.rate - b.rate))
  }
  // 'smart' keeps rankNearbyCasas()'s own blended-score order.
  return list
})

const mapBranches = computed(() => sorted.value.map(item => item.branch))

function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(n)
}

function setLocation(lat: number, lng: number) {
  userLocation.value = { lat, lng }
  geoError.value = ''
}

function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = t('map.geoUnavailable')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      locating.value = false
    },
    () => {
      geoError.value = t('map.geoDenied')
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

const { data } = await useLazyAsyncData('nearby-casas-data', async () => {
  const [locs, processed] = await Promise.all([getAllLocations(), getProcessedExchangeData('')])
  return { locs, processed }
})
watch(
  data,
  d => {
    if (!d) return
    branches.value = (d.locs || []) as MapBranch[]
    ratesByOrigin.value = buildRatesByOrigin((d.processed?.exchangeData || []) as any[])
    if (currencyItems.value.length && !currencyItems.value.includes(currency.value)) {
      currency.value = currencyItems.value[0]
    }
  },
  { immediate: true }
)

useSeoMeta({
  title: () => t('seo.nearbyCasasTitle'),
  description: () => t('seo.nearbyCasasDescription'),
  ogTitle: () => t('seo.nearbyCasasTitle'),
  ogDescription: () => t('seo.nearbyCasasDescription'),
  twitterCard: 'summary_large_image',
})
defineOgImageComponent('Cambio', {
  title: () => t('seo.nearbyCasasTitle'),
  tag: 'Cerca de mí',
  locale: locale.value as 'es' | 'en' | 'pt',
})
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t('seo.nearbyCasasTitle'),
        numberOfItems: sorted.value.length,
      }),
    },
  ],
}))
</script>
```

- [ ] **Step 2: Typecheck / lint**

Run: `cd app && npm run lint`
Expected: no new errors from `app/pages/casa-de-cambio-cerca-de-mi.vue`.

- [ ] **Step 3: Manual verify**

Run: `cd app && npm run dev`, open `http://localhost:3000/casa-de-cambio-cerca-de-mi`. Confirm: page loads with title + subtitle, city chips appear before a location is set, clicking a chip populates a ranked list of casas only (no BROU/Itaú/Prex ever appear), each card shows distance/rate/rating/hours-if-present and two working "Cómo llegar"/"Abrir en Waze" links, the sort toggle re-orders the list, and "Ver en el mapa" renders `LocationsMap` with the same filtered branches.

- [ ] **Step 4: Commit**

```bash
git add app/pages/casa-de-cambio-cerca-de-mi.vue
git commit -m "$(cat <<'EOF'
feat(nearby-casas): add /casa-de-cambio-cerca-de-mi page

List-first mobile page: geolocate or pick a quick city, filter by
currency/direction/radius, blended-score ranked casa cards with
Maps/Waze buttons, optional map toggle reusing LocationsMap.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Homepage hero banner

**Files:**
- Modify: `app/pages/index.vue:555-557`

**Interfaces:**
- Consumes: route `/casa-de-cambio-cerca-de-mi` (Task 5); i18n keys `nearbyCasas.homeBannerTitle`, `.homeBannerSubtitle`, `.homeBannerCta` (Task 3); existing `localePath`, `t` (already in scope in `index.vue`'s `<script setup>`).

- [ ] **Step 1: Insert the banner section**

In `app/pages/index.vue`, the "Top Exchange Houses Section" closes with `</section>` on line 555, immediately followed by a comment starting `<!-- Promo video: ...` on line 557. Insert a new section between them:

```html
    </section>

    <!-- Nearby Casa Finder Banner - flagship tourist tool, links to the
         dedicated smart nearby-finder page. -->
    <section v-reveal class="nearby-finder-banner py-10">
      <VContainer>
        <VCard class="nearby-finder-card pa-6 pa-md-10" elevation="6">
          <VRow align="center">
            <VCol cols="12" md="8">
              <div class="d-flex align-center ga-3 mb-2">
                <VIcon color="primary" size="40">mdi-map-marker-radius</VIcon>
                <h2 class="text-h5 text-md-h4 font-weight-bold mb-0">
                  {{ t('nearbyCasas.homeBannerTitle') }}
                </h2>
              </div>
              <p class="text-body-1 mb-0">{{ t('nearbyCasas.homeBannerSubtitle') }}</p>
            </VCol>
            <VCol cols="12" md="4" class="text-center text-md-end">
              <VBtn
                :to="localePath('/casa-de-cambio-cerca-de-mi')"
                color="primary"
                size="large"
                class="px-6"
              >
                <VIcon start>mdi-crosshairs-gps</VIcon>
                {{ t('nearbyCasas.homeBannerCta') }}
              </VBtn>
            </VCol>
          </VRow>
        </VCard>
      </VContainer>
    </section>

    <!-- Promo video: short branded clip, lazy + autoplay-in-view (muted), the
         visitor can tap to unmute. Sits between the rates and the how-it-works
         steps so it reinforces "compare before you change" organically. -->
```

- [ ] **Step 2: Add the scoped style**

Find `index.vue`'s existing `<style scoped>` block (search for the first `<style` in the file) and add:

```css
.nearby-finder-card {
  border: 2px solid rgba(var(--v-theme-primary), 0.35);
}
```

- [ ] **Step 3: Typecheck / lint**

Run: `cd app && npm run lint`
Expected: no new errors from `app/pages/index.vue`.

- [ ] **Step 4: Manual verify**

Run: `cd app && npm run dev`, open `http://localhost:3000/`. Confirm the new banner renders right after the "Top Exchange Houses" grid and before the promo video, and its CTA button navigates to `/casa-de-cambio-cerca-de-mi`.

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue
git commit -m "$(cat <<'EOF'
feat(nearby-casas): feature the nearby finder on the homepage

New hero-style banner section (not folded into the existing 5-card
internal-links grid, since this is the flagship tourist tool) linking
to /casa-de-cambio-cerca-de-mi.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Footer link

**Files:**
- Modify: `app/components/Footer.vue:153-155`

**Interfaces:**
- Consumes: route `/casa-de-cambio-cerca-de-mi` (Task 5); existing `localePath` (already in scope in `Footer.vue`).

- [ ] **Step 1: Add the link**

In `app/components/Footer.vue`, right after the existing `/casas-de-cambio` link:

```html
          <NuxtLink :to="localePath('/casas-de-cambio')" class="footer-link text-caption">
            Casas de cambio
          </NuxtLink>
          <NuxtLink :to="localePath('/casa-de-cambio-cerca-de-mi')" class="footer-link text-caption">
            Cerca de mí
          </NuxtLink>
```

(Matches the surrounding links' convention of a hardcoded Spanish label, not an i18n key — every other `footer-links` entry does the same.)

- [ ] **Step 2: Manual verify**

Run: `cd app && npm run dev`, open any page, confirm the footer shows a "Cerca de mí" link that navigates to `/casa-de-cambio-cerca-de-mi`.

- [ ] **Step 3: Commit**

```bash
git add app/components/Footer.vue
git commit -m "$(cat <<'EOF'
feat(nearby-casas): add footer link to the nearby finder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: e2e smoke test

**Files:**
- Create: `app/tests/e2e/nearby-casas.spec.ts`

**Interfaces:**
- Consumes: the live page from Task 5, its `data-testid` hooks from Task 4/5 (`nearby-city-chip`, `nearby-casa-row`, `nearby-casa-row-name`, `nearby-directions-link`, `nearby-waze-link`).

- [ ] **Step 1: Write the test**

Create `app/tests/e2e/nearby-casas.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

test('nearby casa finder renders ranked results after picking a city', async ({ page }) => {
  await page.goto('/casa-de-cambio-cerca-de-mi')

  await expect(page.locator('h1')).toContainText(/cerca/i, { timeout: 90_000 })

  const chip = page.locator('[data-testid="nearby-city-chip"]').first()
  await expect(chip).toBeVisible({ timeout: 30_000 })
  await chip.click()

  await expect(async () => {
    const rows = await page.locator('[data-testid="nearby-casa-row"]').count()
    expect(rows).toBeGreaterThan(0)
  }).toPass({ timeout: 30_000 })

  const first = page.locator('[data-testid="nearby-casa-row"]').first()
  const mapsHref = await first.locator('[data-testid="nearby-directions-link"]').getAttribute('href')
  expect(mapsHref).toContain('google.com/maps/dir')
  const wazeHref = await first.locator('[data-testid="nearby-waze-link"]').getAttribute('href')
  expect(wazeHref).toContain('waze.com/ul')
})

test('nearby casa finder never lists a banco or fintech as a casa de cambio', async ({ page }) => {
  await page.goto('/casa-de-cambio-cerca-de-mi')

  const chip = page.locator('[data-testid="nearby-city-chip"]').first()
  await expect(chip).toBeVisible({ timeout: 30_000 })
  await chip.click()

  await expect(async () => {
    const rows = await page.locator('[data-testid="nearby-casa-row"]').count()
    expect(rows).toBeGreaterThan(0)
  }).toPass({ timeout: 30_000 })

  const names = await page.locator('[data-testid="nearby-casa-row-name"]').allTextContents()
  expect(names.some(n => /BROU|Ita[uú]|Prex/i.test(n))).toBe(false)
})
```

- [ ] **Step 2: Run the e2e test**

Run: `cd app && npx playwright test tests/e2e/nearby-casas.spec.ts`
Expected: PASS — 2 tests green. (Per [[exchange-map]] memory: headless Playwright does not mount the Leaflet map itself — this test doesn't open the map toggle, so that caveat doesn't apply here.)

- [ ] **Step 3: Commit**

```bash
git add app/tests/e2e/nearby-casas.spec.ts
git commit -m "$(cat <<'EOF'
test(nearby-casas): e2e coverage for the nearby finder page

Covers city-chip fallback, ranked-card rendering, Maps/Waze link
shape, and the banco/fintech exclusion guarantee end-to-end.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Full verification (after all tasks)

- [ ] Run: `cd app && npx vitest run` — full unit suite green.
- [ ] Run: `cd app && npm run lint` — no new errors.
- [ ] Run: `cd app && npx playwright test tests/e2e/nearby-casas.spec.ts tests/e2e/smoke.spec.ts` — new + existing smoke e2e green.
- [ ] Manual: homepage banner → new page → geolocate/city chip → ranked list → Maps and Waze buttons open correct coordinates → map toggle works — on an actual mobile viewport, not just desktop.
