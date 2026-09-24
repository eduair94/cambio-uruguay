# ¿Qué auto usado comprar? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A form-driven advisor page `/que-auto-comprar-uruguay` that recommends concrete used-car model + year candidates from the live directory, with monthly cost of ownership (fuel, patente, SOA, maintenance, depreciation), a measured spare-parts price index, safety, space and a pre-purchase checklist.

**Architecture:** The daily/hourly `currency-autos` run builds a per-model advisor snapshot (`caradvisorsnapshots`) from the same comparable adverts as the market report, merging the latest spare-parts measurements that a new daily job (`currency-autos-parts`) collects from Mercado Libre through the `:9656` bridge. The app serves `GET /api/cars/advisor`, which scores that cached snapshot against the query with a pure function (`app/utils/carAdvisor.ts`) and curated, dated figures (`app/utils/carAdvisorFigures.ts`). The page keeps its answers in the URL and renders SSR.

**Tech Stack:** Root: TypeScript 4.9 CommonJS, mongoose (APP DB via `classes/appdb.ts`), vitest. App: Nuxt 4, Vuetify 4, vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-que-auto-comprar-design.md`

## Global Constraints

- Every published number is measured, comes from a dated norm with URL, or is labelled "Supuesto del sitio".
- Patente 2026 (TOS SUCIVE art. 2.1, 8, 31): usados 4,5 % of market value; eléctricos usados 2,25 % of value sin IVA (IVA 22 %); floor $ 8.770,10 for models ≥ 1992; USD at $ 41,826; bonus 20 % paying the year at once or 10 % paying each cuota on time, not cumulative. No hybrid rate.
- SOA $ 7.238 (BCU prima promedio 2026-2027), maintenance $ 12.000/yr + $ 2/km (site assumption) — reuse `TRANSPORT_MODE_ASSUMPTIONS.auto`.
- EV: 16 kWh/100 km (site assumption) × UTE simple 101-600 kWh with IVA.
- Latin NCAP stars only from entries verified on latinncap.com, only inside the years the result covers.
- Filter combinations are `noindex, follow`; clean URL indexable.
- Repo is public: no revenue figures anywhere.
- New pm2 app → `ecosystem.config.js` + `OTHER_APPS` in `scripts/deploy-backend.sh`.
- Root tests never import from `app/`.
- Backend public types and `app/utils/carsPublic.ts` stay token-identical (`tests/autos/contracts.test.ts`).
- Use `id`/`slug`, never a field named with the English word for "clave" holding digits (gitleaks).

## Review Focus

- A budget below every model's cheapest year → the page says so and suggests the minimum budget, never an empty silent list. (Task 6 test "budget too low".)
- A model whose parts were never measured → no parts claim, neutral score, "sin relevamiento" copy. (Task 6 test "missing parts is neutral".)
- A Latin NCAP entry that covers 2020+ must not apply to a 2016 candidate of the same model. (Task 5 test.)
- Parts title matching: "208" must not match "2008"/"308", "C4" must not match when the model is "C4 Cactus" only as "C4". (Task 2 tests.)
- Malformed query strings (negative budget, unknown enums, 20 priorities) normalize to safe defaults without throwing. (Task 6 test.)

---

### Task 1: Public wire types (backend + app mirror)

**Files:**
- Modify: `classes/autos/publicTypes.ts` (append), `app/utils/carsPublic.ts` (append, prettier style)
- Test: `tests/autos/contracts.test.ts` (existing, must stay green)

**Produces:** `PublicCarPartKey`, `PublicCarPartPrice`, `PublicCarAdvisorParts`, `PublicCarAdvisorYear`, `PublicCarAdvisorVariant`, `PublicCarAdvisorShare`, `PublicCarAdvisorModel`, `PublicCarAdvisorSnapshotData`, `PublicCarAdvisorSnapshot` exactly as in the spec discussion:

```ts
export type PublicCarPartKey = "pastillas" | "filtro_aceite" | "amortiguador" | "embrague" | "distribucion" | "optica";
export interface PublicCarPartPrice { key: PublicCarPartKey; median: number; offers: number; }
export interface PublicCarAdvisorParts { readAt: string; index: number | null; offers: number; parts: PublicCarPartPrice[]; }
export interface PublicCarAdvisorYear { year: number; n: number; p25: number; median: number; p75: number; kmMedian: number | null; }
export interface PublicCarAdvisorVariant { fuel: PublicCarFuel; transmission: PublicCarTransmission; adverts: number; litersPer100Km: number | null; consumptionDeclaredShare: number | null; years: PublicCarAdvisorYear[]; }
export interface PublicCarAdvisorShare { share: number; n: number; }
export interface PublicCarAdvisorModel { marketSlug: string; brand: string; model: string; brandSlug: string; modelSlug: string; adverts: number; sellers: number; body: PublicCarBodyType | null; bodyShare: number | null; specsN: number; seats: number | null; trunkL: number | null; lengthMm: number | null; powerHp: number | null; fourByFour: PublicCarAdvisorShare | null; abs: PublicCarAdvisorShare | null; airbags: PublicCarAdvisorShare | null; esc: PublicCarAdvisorShare | null; isofix: PublicCarAdvisorShare | null; annualDrop: number | null; dealerShare: number; declaredRiskShare: number; variants: PublicCarAdvisorVariant[]; parts: PublicCarAdvisorParts | null; }
export interface PublicCarAdvisorSnapshotData { typicalDrop: number | null; partsBaseline: PublicCarPartPrice[]; models: PublicCarAdvisorModel[]; }
export interface PublicCarAdvisorSnapshot { version: 1; generatedAt: string; usdUyu: number; data: PublicCarAdvisorSnapshotData; }
```

- [ ] Step 1: append to both files (app copy with single quotes, no semicolons).
- [ ] Step 2: `npx vitest run tests/autos/contracts.test.ts` → PASS.
- [ ] Step 3: commit `feat(autos): tipos públicos del asesor de compra`.

### Task 2: Spare-parts basket, title matching and index (pure)

**Files:**
- Create: `classes/autos/repuestos.ts`
- Test: `tests/autos/repuestos.test.ts`

**Produces:**
- `CAR_PARTS: ReadonlyArray<{ key: PublicCarPartKey; label: string; category: string; query: string; perUnit: boolean; front: boolean }>` (six rows of the spec table; `query` is the words before brand/model, e.g. `"pastillas freno"`).
- `partsModelTokens(brand: string, model: string): { model: string[]; brand: string[] }` — folded words; drops generic words (`plus` is kept, `new|nuevo|sedan|hatch|hatchback|cabina|doble|simple|pick|up` only when not the whole name); brand aliases (`volkswagen→vw`, `chevrolet→gm|chevy`, `mercedes-benz→mercedes|mb`, `citroen`).
- `partTitleMatches(title: string, tokens, part): boolean` — every model token as a whole word; brand/alias required when the longest model token has ≤ 3 chars; rejects `tras(era|eras|ero)` when `part.front`; rejects `\b(par|x ?2|kit|juego|set)\b` when `part.perUnit`.
- `summarizePart(prices: number[], sellers: string[]): { median; p25; p75; offers; sellers } | null` — null under 3 offers.
- `partsIndex(records: CarPartsRecord[]): { baseline: PublicCarPartPrice[]; byModel: Map<string, PublicCarAdvisorParts> }` with `CarPartsRecord = { marketSlug: string; brand: string; model: string; readAt: string; parts: Array<{ key: PublicCarPartKey; median: number; p25: number; p75: number; offers: number; sellers: number }> }`. Baseline per key = median of the model medians. Model index = geometric mean of ratios over parts it has, null under 3 parts; rounded to 3 decimals. `offers` = sum of offers.

Tests (write first, see them fail, implement, see them pass):
- `partTitleMatches("Amortiguador Delantero Der Peugeot 2008 1.2", tokens("Peugeot","208"), amortiguador)` → false; `"Amortiguador Delantero Izq Peugeot 208 1.2 12-20 Cofap"` → true; `"Amortiguador Delantero Der Peugeot 308"` → false.
- `"Pastilla Freno Citroen C4 06- Por Santa Cruz"` vs Citroën C4 Cactus → false; `"Pastillas Freno Delanteras Citroen C4 Cactus 2014 Al 2018"` → true; `"Pastillas Freno Brembo Citroën C4 Cactus Trasera"` → false.
- `"Kit Embrague Vw Up 1.0 190mm"` vs Volkswagen Up! → true; `"Kit Embrague Volkswagen Saveiro 1.6"` → false; a title with "Pick Up" but no brand for Up! → false.
- `"Kit Faros Delanteros Toyota Hilux Set X2"` (optica, perUnit) → false; `"Optico Delantero Toyota Hilux 2021-2024"` → true.
- `summarizePart([100,200], …)` → null; `[100,200,300,400]` → median 250.
- `partsIndex`: two models, model A twice the baseline on 3 parts → index ≈ 2/√… computed exactly; model with 2 parts → index null but parts listed.

- [ ] Steps: failing tests → implement → pass → commit `feat(autos): canasta de repuestos y su índice`.

### Task 3: Parts harvest job

**Files:**
- Create: `classes/autos/repuestosHarvest.ts`, `classes/models/CarPartsPrice.ts`, `sync_autos_parts.ts`
- Modify: `classes/autos/store.ts` (add `loadCarPartsRecords()`, `saveCarPartsRecords()`), `ecosystem.config.js` (app `currency-autos-parts`, `11 2 * * *`), `scripts/deploy-backend.sh` (`OTHER_APPS` += `currency-autos-parts`), `tests/autos/deploy.test.ts` if it enumerates apps
- Test: `tests/autos/repuestosHarvest.test.ts`

**Consumes:** Task 2 (`CAR_PARTS`, `partsModelTokens`, `partTitleMatches`, `summarizePart`, `CarPartsRecord`).

**Produces:**
- `partsSearchUrl(part, brand, model, apiBase = mlCarsApiBase()): string` → `${apiBase}/search?country=UY&limit=50&q=<query brand model>&category=<part.category>`.
- `planPartsTargets(models: Array<{ marketSlug; brand; model; adverts }>, previous: Map<string, CarPartsRecord>, now: Date, maxAgeDays = 7): targets` — never-read first, then oldest `readAt`, skipping fresher than `maxAgeDays`; ties by adverts desc.
- `harvestParts(targets, { usdUyu, gapMs, maxDurationMs, fetchPage, now }): Promise<{ records: CarPartsRecord[]; requests: number; note: string | null }>` — for each target, six searches; UYU as is, USD × usdUyu; dedupe by result id; 3 consecutive null pages → stop with note `puente sin respuesta`; budget exhausted → note `presupuesto agotado`; only complete targets (all six searches answered) become records.
- `sync_autos_parts.ts`: flags `--dry-run`, `--models=a,b`; targets from the latest `caradvisorsnapshots` models (fallback: `carcatalogmetas` `uy-cars` `meta.models`); writes records + `carharvestmetas` `uy-cars-parts` (`finishedAt, targets, due, requests, written, note, ok`). Dry run prints the first 5 records.

Tests: plan ordering (never-read first, stale over fresh, fresh skipped); `harvestParts` with a fake `fetchPage` returning fixtures → record medians in UYU with a USD row converted; three nulls → note and no partial record; `partsSearchUrl` contains `category=MLU62414`.

- [ ] Steps: failing tests → implement → pass → `npx tsc -p tsconfig.production.json --noEmit` → commit `feat(autos): relevamiento diario de repuestos (currency-autos-parts)`.

### Task 4: Advisor snapshot builder + wiring into `sync_autos.ts`

**Files:**
- Create: `classes/autos/advisor.ts`, `classes/models/CarAdvisorSnapshot.ts`
- Modify: `classes/autos/store.ts` (`saveCarAdvisorSnapshot`, `loadCarAdvisorModels` for the parts job), `sync_autos.ts` (build after the report, save with the report, include in `--report` file)
- Test: `tests/autos/advisor.test.ts`

**Consumes:** `reportable`, `annualDropOf`, `depreciationOf` (report.ts), `carSpecsOf` (specs.ts), `declaredRisks` (risk.ts), `quantile` (stats.ts), Task 2 `partsIndex`.

**Produces:** `CAR_ADVISOR_POLICY = { minimumAdverts: 12, minimumVariantAdverts: 6, minimumYearAdverts: 3 }` and `buildCarAdvisor(listings: readonly CarListing[], options: { maxYear: number; parts: readonly CarPartsRecord[]; typicalDrop: number | null }): PublicCarAdvisorSnapshotData`.

Rules: `reportable` rows only, GNC excluded from variants; variant = fuel×transmission non-null; years with n ≥ 3 sorted desc; `litersPer100Km` median of `fuelEconomy.litersPer100Km` rounded to 0.1; `consumptionDeclaredShare` = basis `advert` / with economy; body = most common `body.type` with its share; specs from `carSpecsOf(detail)`: seats/trunk/length/power medians over non-null; shares = yes/(yes+no) with `n ≥ 3` else null; `fourByFour` from drivetrain ∈ {4x4, integral} over non-null drivetrains; `annualDrop` via the report's recta; models sorted by adverts desc; typicalDrop passed from `carReportTypicalDrop`-equivalent (median of report models' annualDrop).

Tests: fixture of synthetic `CarListing`s → a model under 12 adverts is excluded; a variant under 6 is excluded; a year with 2 adverts is excluded; consumption median; airbags share with 2 yes + 1 no = 0.667, n=3; parts merged from records.

- [ ] Steps: failing tests → implement → pass → wire into `sync_autos.ts` → `tsc --noEmit` → full `npx vitest run tests/autos` → commit `feat(autos): snapshot del asesor de compra`.

### Task 5: Curated figures (app)

**Files:**
- Create: `app/utils/carAdvisorFigures.ts`
- Test: `app/tests/unit/carAdvisorFigures.test.ts`

**Produces:** `CAR_ADVISOR_PATH = '/que-auto-comprar-uruguay'`; `PATENTE_2026 = { usedRate: 0.045, electricUsedRate: 0.0225, ivaRate: 0.22, floorUyu: 8770.1, usdUyu: 41.826, payYearBonus: 0.2, onTimeBonus: 0.1, asOf, source, sourceUrl }`; `estimatePatenteUyu(priceUsd, fuel, year)`; `CAR_ADVISOR_FIGURES` (SOA, maintenance fixed/perKm, EV kWh/100 km, kWh price) each a `TransportFigure`; `LATIN_NCAP: LatinNcapEntry[]` from the research file; `latinNcapFor(marketSlug, year): LatinNcapEntry | null` (only when `year` ∈ [appliesFrom, appliesTo]); checklist items with official URLs.

Tests: every figure has `asOf`, `source`, `https` URL; patente examples (US$ 13.000 nafta → 13.000×41,826×0,045 = $ 24.468; US$ 3.000 → floor 8.770,10; eléctrico US$ 20.000 → 20.000×41,826/1,22×0,0225 = $ 15.428,5; model 1985 → band 4.385,05, 1990 → 8.770,10); Latin NCAP: every URL on `latinncap.com`, stars integer 0-5, `latinNcapFor` outside range → null.

- [ ] Steps: failing tests → implement → pass → commit `feat(autos): cifras del asesor (patente SUCIVE 2026, SOA, Latin NCAP)`.

### Task 6: Scoring (app, pure)

**Files:**
- Create: `app/utils/carAdvisor.ts`
- Test: `app/tests/unit/carAdvisor.test.ts`

**Produces:**
- `CarAdvisorQuery = { budget: number | null; use: 'ciudad' | 'mixto' | 'ruta' | 'carga' | 'campo'; kmYear: number; people: number; transmission: '' | 'manual' | 'automatica'; fuels: PublicCarFuel[]; bodies: PublicCarBodyType[]; priorities: CarAdvisorPriority[]; monthlyMax: number | null }`, `CarAdvisorPriority = 'costo' | 'reventa' | 'repuestos' | 'seguridad' | 'espacio' | 'nuevo'`.
- `normalizeCarAdvisorQuery(input: Record<string, unknown>): CarAdvisorQuery` and `carAdvisorQueryParams(query): Record<string,string>` (URL keys: `presupuesto, uso, km, personas, caja, combustible, carroceria, prioridad, gastoMes`; list values comma-separated).
- `adviseCars(snapshot: PublicCarAdvisorSnapshot, query: CarAdvisorQuery, prices: { super95: number; gasoil50s: number }): CarAdvisorResponse` where `CarAdvisorResponse = { results: CarAdvisorResult[]; considered: number; excluded: Array<{ reason: CarAdvisorExclusion; count: number }>; minimumBudget: number | null }` and `CarAdvisorResult = { marketSlug; brand; model; fuel; transmission; year; price: {p25, median, p75}; n; kmMedian; stretch: { year; p25 } | null; costs: { fuelUyu; patenteUyu; soaUyu; maintenanceUyu; depreciationUyu; monthlyUyu; annualUyu; consumption: number | null; consumptionEstimated: boolean; depreciationFromMarket: boolean }; parts: PublicCarAdvisorParts | null; safety: { ncap: LatinNcapEntry | null; esc; airbags; abs; isofix }; space: { seats; trunkL; lengthMm; body }; score: number; scores: Record<CarAdvisorPriority | 'uso', number>; reasons: string[]; tradeoffs: string[]; overMonthly: boolean; listingsQuery: Record<string,string> }`.

Tests (fixture snapshot of 4 models built in the test): candidate year is newest whose median ≤ budget; stretch year when its p25 ≤ budget; transmission filter; fuel filter; seats filter drops known-too-small, keeps unknown with a tradeoff; `carga` keeps pickup/furgon/rural only; patente/fuel/SOA/maintenance numbers exact for a known candidate; priority weight changes the order (`repuestos` puts the cheap-parts model first); one variant per model; `overMonthly` sinks to the end; budget below everything → empty results + `minimumBudget`; missing parts neutral and the reason list never cites parts; malformed query normalizes; every reason contains a digit.

- [ ] Steps: failing tests → implement → pass → commit `feat(autos): puntaje del asesor de compra`.

### Task 7: API endpoint

**Files:**
- Create: `app/server/models/CarAdvisorSnapshot.ts`, `app/server/api/cars/advisor.get.ts`
- Modify: `app/server/utils/cars.ts` (`loadCarAdvisor()` with a 10-minute cache, validates `version === 1` and `Array.isArray(data.models)`)

Handler: normalize query → load snapshot (503 `no-store` if null) → fuel prices via `$fetch('/api/combustibles')` (fallback `FUEL_FALLBACK`) → `adviseCars` → `{ generatedAt, usdUyu, fuel: { asOf, super95, gasoil50s }, query, ...response }`; `cache-control: public, max-age=300, s-maxage=900`.

- [ ] Steps: implement → unit test of the loader validation is covered by `carAdvisor` tests; run app vitest subset → commit with Task 8.

### Task 8: Page, navigation, SEO wiring

**Files:**
- Create: `app/pages/que-auto-comprar-uruguay.vue`
- Modify: `app/utils/siteNav.ts` (entry after the tasador, `labelKey: 'nav.usedCarAdvisor'`, icon `mdi-car-info`, keywords `que auto comprar`, `que auto usado comprar`, `auto ideal`, `que auto me conviene`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.usedCarAdvisor`), `app/utils/directorios.ts` (autos `analisis` += path), `app/utils/guideHubs.ts` (resource), `app/tests/unit/seoContract.test.ts` (noindex-with-query list), `app/pages/autos-usados-uruguay/index.vue` + `app/pages/mercado-de-autos-usados-uruguay.vue` (one link each), `docs/seo/experiments.json` (row `que-auto-comprar`)

Page sections: breadcrumbs → header → form (sticky) + results → "Antes de señar" checklist → "Cómo se calcula" → FAQ (`FaqSection`) → `AssistantCta` (topic `autos`). JSON-LD `WebApplication` + `BreadcrumbList` + `FAQPage` via the existing FAQ component. Title `¿Qué auto usado comprar? Asesor con patente, repuestos y consumo | Cambio Uruguay`.

- [ ] Steps: implement → `npm test` subset (siteNav-coverage, seoContract, familiaNav, carAdvisor*) → lint the new files with prettier → commit `feat(autos): /que-auto-comprar-uruguay, el asesor del auto ideal`.

### Task 9: Docs

- Modify: `docs/app/AUTOS.md` (section "El asesor de compra y los repuestos"), `AGENTS.md` (pm2 row `currency-autos-parts`), memory index.
- [ ] Commit with Task 8 or separately.

### Task 10: Verify and ship

- [ ] Root `npx vitest run` (autos + contracts + no_scheduler) and `npx tsc -p tsconfig.production.json --noEmit`.
- [ ] App `node node_modules/vitest/vitest.mjs run` on touched tests + full unit suite.
- [ ] Merge backend to main → push → watch backend deploy → on the VPS: `node dist/sync_autos_parts.js --dry-run --models=chevrolet-onix,peugeot-208,citroen-c4-cactus` and read the rows; real run; `node dist/sync_autos.js --fast` is left to cron (or run once) → export `caradvisorsnapshots` and read models by hand.
- [ ] Copy the snapshot into local Mongo, run the page in dev, check three profiles by eye (city/cheap, family/SUV, work/pickup).
- [ ] Merge app to main → push → watch deploy → measure the page in production.
