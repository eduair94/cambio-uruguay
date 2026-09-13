# Alquileres: precio por m² y comodidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let /alquileres-uruguay sort by price per m² (with a measured plausibility guard) and filter by published amenities (gym, pool, grill…).

**Architecture:** App-only change. Amenities are read from the InfoCasas labels the backend already stores in `offers[].details.amenities`, filtered in Mongo through the single shared `buildRentalFilter`. Price per m² is one rule with two forms (pure TS for the card, aggregation expression for the sort) proven equal by an in-test evaluator and by a read-only run against production Mongo.

**Tech Stack:** Nuxt 4 / Vue 3 / Vuetify 4, Mongoose aggregation, vitest, esbuild (verification bundle only).

**Spec:** `docs/superpowers/specs/2026-09-13-alquileres-precio-m2-comodidades-design.md`

## Global Constraints

- Only files under `app/` and `docs/` change. No root/backend change, no crawler change.
- `app/utils/` is a flat auto-import namespace: every new export is prefixed `rental`/`RENTAL_`.
- App style: no semicolons, single quotes, 2 spaces, width 100 (prettier via `npm run lint`).
- `npm run typecheck` is broken: verification is `npx vitest run` + `npm run lint` in `app/`. Type errors are NOT caught — every `RentalQuery` consumer must be read, not assumed.
- Absence is never a negative: amenity and price-per-m² copy says the data may be missing.
- URL param is `comodidades`; sort value is `precio-m2`.
- i18n strings: never use `|` or `@` (vue-i18n syntax). Pass the `$` inside the parameter.
- Commands run from the worktree `app/` directory (node_modules/.nuxt are junctions; do NOT run `nuxi prepare`, `nuxt build` or `npm run dev` there).

---

### Task 1: Amenity vocabulary

**Files:**
- Create: `app/utils/rentalAmenities.ts`
- Test: `app/tests/unit/rentalAmenities.test.ts`

**Interfaces:**
- Produces: `type RentalAmenity`, `RENTAL_AMENITY_PATTERNS: Record<RentalAmenity, string>`, `RENTAL_AMENITIES: readonly RentalAmenity[]`, `isRentalAmenity(v): v is RentalAmenity`, `normalizeRentalAmenities(input: unknown): RentalAmenity[]`, `rentalAmenityPublished(labels: readonly unknown[], amenity): boolean`, `rentalAmenityConditions(amenities): Array<Record<string, unknown>>` (each `{ 'offers.details.amenities': { $regex, $options: 'i' } }`).

- [ ] **Step 1: Write the failing test** (label table = real labels measured 2026-09-13)

```ts
import { describe, expect, it } from 'vitest'
import {
  RENTAL_AMENITIES,
  normalizeRentalAmenities,
  rentalAmenityConditions,
  rentalAmenityPublished,
  type RentalAmenity,
} from '~/utils/rentalAmenities'

const LABELS: Array<[string, RentalAmenity | null]> = [
  ['Aire acondicionado', 'aire'], ['Parrillero / Barbacoa', 'parrillero'],
  ['Balcón / Terraza', 'balcon'], ['Garaje', null], ['Lavadero', 'lavadero'],
  ['Ascensor', 'ascensor'], ['Se aceptan mascotas', null], ['Living comedor', null],
  ['Calefacción individual', 'calefaccion'], ['Gym', 'gimnasio'], ['Jardin / Patio', 'jardin'],
  ['Amueblada', null], ['Internet', null], ['Cochera', null], ['Balcón', 'balcon'],
  ['Piscina', 'piscina'], ['Terraza lavadero', 'lavadero'], ['Agua caliente central', null],
  ['Playroom', 'salon'], ['Calefacción', 'calefaccion'], ['Patio', 'jardin'], ['Sauna', 'sauna'],
  ['Salón de uso común', 'salon'], ['Estufa a leña', null], ['Losa radiante', 'calefaccion'],
  ['Barbacoa', 'parrillero'], ['Lavandería', 'lavadero'], ['Calefacción central', 'calefaccion'],
  ['Solárium', null], ['Previsión A.A.', null], ['Jacuzzi', null], ['Spa', 'sauna'],
]

describe('published labels → amenities', () => {
  it.each(LABELS)('%s → %s', (label, expected) => {
    expect(RENTAL_AMENITIES.filter(a => rentalAmenityPublished([label], a))).toEqual(
      expected ? [expected] : []
    )
  })
  it('ignores case and non-text values', () => {
    expect(rentalAmenityPublished(['GYM'], 'gimnasio')).toBe(true)
    expect(rentalAmenityPublished([null, 3, { name: 'Gym' }], 'gimnasio')).toBe(false)
  })
})

describe('amenity keys', () => {
  it('keeps known keys once, in the presentation order', () => {
    expect(normalizeRentalAmenities('piscina,gimnasio,jacuzzi,piscina')).toEqual(['gimnasio', 'piscina'])
    expect(normalizeRentalAmenities(['sauna', ' aire '])).toEqual(['aire', 'sauna'])
    expect(normalizeRentalAmenities(undefined)).toEqual([])
  })
  it('builds one whole-label condition per amenity', () => {
    expect(rentalAmenityConditions(['gimnasio'])).toEqual([
      { 'offers.details.amenities': { $regex: '^(gimnasio|gym)$', $options: 'i' } },
    ])
  })
})
```

- [ ] **Step 2:** `npx vitest run tests/unit/rentalAmenities.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `app/utils/rentalAmenities.ts` with patterns:
  gimnasio `^(gimnasio|gym)$`; piscina `^piscina( climatizada| abierta| cerrada)?$`;
  parrillero `^(parrillero|barbacoa)( ?/ ?(parrillero|barbacoa))?( individual| com[uú]n)?$`;
  ascensor `^ascensor(es)?$`; aire `^aire acondicionado$`; balcon `^(balc[oó]n|terraza|balc[oó]n ?/ ?terraza)$`;
  lavadero `^(lavadero|terraza lavadero|lavander[ií]a)$`; calefaccion `^(calefacci[oó]n( individual| central)?|losa radiante)$`;
  jardin `^(jard[ií]n|patio|jard[ií]n ?/ ?patio)$`; sauna `^(sauna|spa)$`; salon `^(sal[oó]n de uso com[uú]n|playroom)$`.
  `RENTAL_AMENITIES = Object.keys(RENTAL_AMENITY_PATTERNS)`; `normalizeRentalAmenities` splits commas, trims, returns `RENTAL_AMENITIES.filter(a => wanted.has(a))`; `rentalAmenityPublished` tests `new RegExp(pattern, 'i')` on string labels; header comment with source, measured counts, whole-label rule, absence ≠ negative.
- [ ] **Step 4:** re-run → PASS.
- [ ] **Step 5:** `git commit -m "feat(alquileres): vocabulario de comodidades publicadas"`

### Task 2: Query contract + Mongo filter

**Files:**
- Modify: `app/utils/rentals.ts` (import; `RentalQuery.amenities`; `normalizeRentalQuery`; `rentalQueryToParams`; `buildRentalFilter`)
- Test: `app/tests/unit/rentalAmenities.test.ts` (append)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `RentalQuery.amenities: RentalAmenity[]`; URL param `comodidades`; `buildRentalFilter` appends `rentalAmenityConditions(...)` to `nonLocation.$and` BEFORE the sedes block.

- [ ] **Step 1: Append failing tests**

```ts
import { buildRentalFilter, normalizeRentalQuery, rentalPublicStages, rentalQueryToParams } from '~/utils/rentals'
import { MUTUALISTA_SEDES } from '~/utils/mutualistaSedes'

describe('comodidades in the URL', () => {
  it('round-trips through the query contract', () => {
    const params = rentalQueryToParams(normalizeRentalQuery({ comodidades: 'piscina, gimnasio' }))
    expect(params.comodidades).toBe('gimnasio,piscina')
    expect(normalizeRentalQuery(params).amenities).toEqual(['gimnasio', 'piscina'])
    expect(rentalQueryToParams(normalizeRentalQuery({})).comodidades).toBeUndefined()
  })
})

describe('amenity filter', () => {
  it('requires every chosen amenity', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({ comodidades: 'gimnasio,piscina' }), 10)
    expect(filter.$and).toEqual(rentalAmenityConditions(['gimnasio', 'piscina']))
  })
  it('composes with the health-centre radius and the text search', () => {
    const sede = MUTUALISTA_SEDES[0]!
    const { filter } = buildRentalFilter(
      normalizeRentalQuery({ comodidades: 'gimnasio', sedes: String(sede.osmId), q: 'rambla' }), 10)
    const and = filter.$and as Array<Record<string, unknown>>
    expect(and).toHaveLength(2)
    expect(and[0]).toEqual(rentalAmenityConditions(['gimnasio'])[0])
    expect(and[1]!.$expr).toBeDefined()
    expect(Array.isArray(filter.$or)).toBe(true)
  })
  it('adds nothing without amenities', () => {
    expect(buildRentalFilter(normalizeRentalQuery({}), 10).filter.$and).toBeUndefined()
  })
  it('is enforced again after stale adverts are dropped', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({ comodidades: 'gimnasio' }), 10)
    const stages = rentalPublicStages(filter, 10) as Array<Record<string, any>>
    const matches = stages.filter(stage => stage.$match?.$and)
    const current = stages.findIndex(stage => stage.$set?.offers)
    expect(matches).toHaveLength(2)
    expect(stages.indexOf(matches[0]!)).toBeLessThan(current)
    expect(stages.indexOf(matches[1]!)).toBeGreaterThan(current)
  })
})
```

- [ ] **Step 2:** run → FAIL (`amenities` undefined).
- [ ] **Step 3: Implement** in `rentals.ts`:
  - `import { normalizeRentalAmenities, rentalAmenityConditions, type RentalAmenity } from './rentalAmenities'`
  - `RentalQuery`: after `guarantees`: `/** Comodidades pedidas (ver rentalAmenities.ts). Tienen que estar TODAS. */ amenities: RentalAmenity[]`
  - `normalizeRentalQuery`: `amenities: normalizeRentalAmenities(input.comodidades ?? input.amenities),`
  - `rentalQueryToParams`: after `garantia`: `if (query.amenities.length) params.comodidades = query.amenities.join(',')`
  - `buildRentalFilter`, before `// ── Cerca de una sede ──`:
    ```ts
    if (query.amenities.length) {
      const previos = Array.isArray(nonLocation.$and) ? (nonLocation.$and as unknown[]) : []
      nonLocation.$and = [...previos, ...rentalAmenityConditions(query.amenities)]
    }
    ```
- [ ] **Step 4:** run file + `tests/unit/rentalsCerca.test.ts` + `tests/unit/rentals.test.ts` → PASS.
- [ ] **Step 5:** commit `feat(alquileres): filtro de comodidades en la consulta compartida`

### Task 3: Price-per-m² rule

**Files:**
- Create: `app/utils/rentalPricePerM2.ts`
- Modify: `app/utils/rentals.ts` (`RentalSort`, `RENTAL_SORTS`, `rentalMongoSort`)
- Test: `app/tests/unit/rentalPricePerM2.test.ts`

**Interfaces:**
- Produces: `rentalPricePerM2(p: { propertyType: string; area: number | null; bedrooms: number | null; priceUyu: number }): number | null`, `rentalPricePerM2Expression()`, `rentalPricePerM2Stages()` (two `$set`: `_rentalPricePerM2`, `_rentalPricePerM2Unknown`), `RENTAL_PRICE_PER_M2_SORT_FIELDS = ['_rentalPricePerM2Unknown', '_rentalPricePerM2'] as const`; `rentalMongoSort('precio-m2') = { _rentalPricePerM2Unknown: 1, _rentalPricePerM2: 1, priceUyu: 1, key: 1 }`.

Rule: habitacion → null; area number in [15, 1_000_000]; priceUyu > 0; apartamento/casa also `area ≤ 100 + 80·max(0, bedrooms)` (400 without bedrooms) and value ≥ floor (apartamento 150, casa 100); others → value.

- [ ] **Step 1: Failing test** — measured case table (2 dorm 65 m² $29.000 → 446.15; 1 dorm 55.000 m² → null; 1 dorm 555 m² → null; 3 dorm 72 m² $8.300 → null; casa 4 dorm 305 m² $10.000 → null; casa 3 dorm 200 m² $22.000 → 110; habitacion → null; 1 m² → null; 14 m² → null; 15 m² 0 dorm $9.000 → 600; 400 m² no bedrooms $200.000 → 500; 401 → null; local 2.000 m² $150.000 → 75; area null → null; price 0 → null), a minimal aggregation evaluator (`$let $cond $and $or $not $in $isNumber $eq $gt $gte $lte $divide $add $multiply $max $switch`, BSON null < number, throws on unknown operators), parity of expression vs function over the case table and a 7 types × 13 areas × 5 bedrooms × 5 prices sweep, `rentalMongoSort('precio-m2')`, and `normalizeRentalQuery({ sort: 'precio-m2' }).sort === 'precio-m2'`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** the module (header comment with the 2026-09-13 measurements), add `'precio-m2'` to `RentalSort` and `{ value: 'precio-m2', label: 'Menor precio por m²' }` after `total` in `RENTAL_SORTS`, and the `rentalMongoSort` branch.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5:** commit `feat(alquileres): regla de precio por m² con guarda medida`

### Task 4: Endpoint sort wiring

**Files:**
- Modify: `app/server/api/rentals/index.get.ts`
- Test: `app/tests/unit/rentalsSortMemory.test.ts`

- [ ] **Step 1: Extend tests**: add `'../../../utils/rentalPricePerM2': rentalPricePerM2Module` to `capture` dependencies; add `'precio-m2'` to the first `it.each` (NOT the real-Mongo one); expected projection also spreads the price-per-m² fields when `sort === 'precio-m2'`; `items.at(-1)` equals `{ $unset: [...RENTAL_PRICE_PER_M2_SORT_FIELDS] }`; new test: the `$set` of `_rentalPricePerM2` comes after the offer `$set` of `matchingOffer` and before `$project`, and the median pipeline equals the `sort=precio` one.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement**: import `RENTAL_PRICE_PER_M2_SORT_FIELDS, rentalPricePerM2Stages`; after `...rentalDistanceStages(query)` add `...(query.sort === 'precio-m2' ? rentalPricePerM2Stages() : [])`; project the two fields when sorting by it; `$unset` them after `$limit` (before the distance unset).
- [ ] **Step 4:** run the file → PASS.
- [ ] **Step 5:** commit `feat(alquileres): la API ordena por precio por m²`

### Task 5: Saved-search alerts

**Files:**
- Modify: `app/utils/rentalAlerts.ts`, `app/components/rentals/RentalAlertSummary.vue`
- Test: `app/tests/unit/rentalAlerts.test.ts`

- [ ] **Step 1: Tests**: `normalizeRentalAlertFilters('rental-search', { comodidades: 'piscina,gimnasio' }).comodidades === 'gimnasio,piscina'`; array input accepted; `{ comodidades: 'gimnasio,jacuzzi' }` throws `unsupported_filter`.
- [ ] **Step 2:** run → FAIL (`unsupported_filter` for the key itself).
- [ ] **Step 3: Implement**: `'comodidades'` in `searchKeys` and `arrayKeys`; in the rental-search branch reject any comma part that is not `isRentalAmenity`; summary line `if (q.amenities.length) add('amenities', q.amenities.map(v => t(\`amenity-${v}\`)).join(' · '))`.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5:** commit `feat(alquileres): las alertas guardadas aceptan comodidades`

### Task 6: Interface

**Files:**
- Modify: `app/utils/rentalMessages.ts` (es/en/pt), `app/components/rentals/SearchFilters.vue`, `app/pages/alquileres-uruguay.vue`

- [ ] **Step 1: Messages** in each locale: `amenities`, `amenitiesHint`, `amenity-<key>` × 11, `'precio-m2'`, `pricePerM2SortHint`, `pricePerM2: '{price}/m²'`.
- [ ] **Step 2: Filters**: `copy()` clones `amenities`; `amenityItems`; multi-select after the checkboxes in "Características" + hint; `featureSummary` lists them; `advancedOpen` also opens with amenities.
- [ ] **Step 3: Page**: filter chip `comodidades`; sort hint for `precio-m2`; `pricePerM2Label(property)` appended to `specsLabel` (via `rentalPricePerM2`).
- [ ] **Step 4:** `npx vitest run` (whole app suite) + `npm run lint` → green; fix any spec-line assertions that now include `$ …/m²`.
- [ ] **Step 5:** commit `feat(alquileres): ordenar por m² y elegir comodidades en la página`

### Task 7: Real-Mongo verification + docs

- [ ] **Step 1:** esbuild bundle of an entry re-exporting `utils/rentals.ts`, `utils/rentalPricePerM2.ts`, `utils/rentalAmenities.ts` (cjs, node) into the scratchpad.
- [ ] **Step 2:** read-only VPS probe: for every public row, `rentalPricePerM2(row)` vs the `$set` expression (0 mismatches expected); per-type ranked counts; cheapest ranked rows; for each amenity, count via `buildRentalFilter` + `rentalPublicStages` vs an independent JS count over current offers.
- [ ] **Step 3:** update the spec's measured numbers to the final rule; add "## Precio por m² y comodidades — 13 de septiembre de 2026" at the top of `docs/app/RENTALS.md`.
- [ ] **Step 4:** commit `docs(alquileres): precio por m² y comodidades, medidos`

### Task 8: Integrate and deploy

- [ ] **Step 1:** full app suite + lint once more.
- [ ] **Step 2:** merge `feat/rental-m2-amenities` into `origin/main` from a temporary worktree, push `HEAD:main` (CI deploys the app because `app/**` changed).
- [ ] **Step 3:** after the deploy run finishes, verify production: `/api/rentals?sort=precio-m2&type=apartamento&department=Montevideo` returns ascending plausible values; `/api/rentals?comodidades=gimnasio` total ≈ measured; page renders the new sort, the amenity chip and `$ …/m²`.
