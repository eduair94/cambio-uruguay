# ¿Dónde vivir? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/donde-vivir-uruguay`, a form-driven advisor that recommends barrios to rent or buy in, with what fits the household's money, monthly and entry costs, rent-vs-buy per barrio and barrio context, linked to the rental and sale directories.

**Architecture:** App-only. `GET /api/housing/advisor` joins three daily aggregates the site already computes (rental zones, `marketseries` venta cohorts, zone scores), cached 10 min per department × type × bedrooms, and scores them with a pure util (`app/utils/housingAdvisor.ts`) plus curated, dated figures (`app/utils/housingAdvisorFigures.ts`). The page keeps its answers in the URL and renders SSR.

**Tech Stack:** Nuxt 4, Vuetify 4, vitest, mongoose (read-only).

**Spec:** `docs/superpowers/specs/2026-09-25-donde-vivir-design.md`

## Global Constraints

- Every number measured, or dated with an https source, or labelled as an assumption.
- Guarantee caps: Contaduría and ANDA 40 % of nominal income; Mapfre 30 % (guía de garantías 2026-09-15).
- Credit profiles (published 2026-09-16): BHU UI 4,50 % TEA, 25 años, 90 %, cuota 25 % (30 % con débito); Santander público general UI 4,75 %, 20 años, 80 %, cuota 35 %.
- Monthly rate from TEA: `(1+TEA)^(1/12) − 1`.
- Entry costs: ITP 2 %, escrituración 3–5 %, comisión 3,66 %; affordability uses the high end (10,66 %).
- Filter combinations `noindex, follow`; title ≤ 60 chars with " | Cambio Uruguay"; description ≤ 155.
- New exported names must not collide with existing `app/utils` exports (flat auto-import).
- Run app eslint on touched files before pushing (CI lints).
- Repo is public: no revenue figures.

## Review Focus

- A department without scores (outside Montevideo/UTE) → neutral context, "sin dato del barrio", never zero.
- Income present but no savings → comprar reports "sin ahorro no hay anticipo", not a crash or NaN.
- A barrio with rent but no sale data in "comparar" → shown with rent only, no rent-vs-buy line.
- Barrio names with tildes/case/aliases join ("Cordón" = "cordon"; "Malvín" = "Malvin").
- Malformed query (negative income, unknown enums, 20 priorities) normalizes safely.

---

### Task 1: Figures (`app/utils/housingAdvisorFigures.ts` + test)

Produces: `HOUSING_ADVISOR_PATH`, `GUARANTEE_CAPS` ({ anda: 0.4, contaduria: 0.4, mapfre: 0.3, figure }), `CREDIT_PROFILES: Record<'bhu'|'banco', CreditProfile>` (`{ id, label, lender, currency: 'UI', tea, maxYears, financing, installmentCap, figure }`), `BUY_ENTRY_COSTS` ({ itp: 0.02, deedLow: 0.03, deedHigh: 0.05, commission: 0.0366, figure… }), `RENT_ENTRY` ({ commissionMonths: 1.22, figure }), `monthlyRateFromTea(tea)`, `frenchInstallment(principal, tea, years)`, `HOUSING_ADVISOR_CHECKLIST`, `HOUSING_ADVISOR_FAQ`.

Tests: every figure dated with https source; `monthlyRateFromTea(0.045)` ≈ 0.003675; `frenchInstallment(1_000_000, 0.045, 25)` equals the hand formula; zero rate = principal / months.

### Task 2: Pure advisor (`app/utils/housingAdvisor.ts` + test)

Produces: `HousingAdvisorQuery`, `normalizeHousingAdvisorQuery(input)`, `housingAdvisorQueryParams(query)`, `housingAdvisorDraft(query)`, `foldZoneName(name)`, `HousingZoneInput` (joined barrio: name, department, rent {n,p25,median,p75,monthlyMedian,monthlyP25,expensesMedian,m2Median} | null, sale {n,p25,median,p75,m2Median} | null, scores {denuncias,luz,agua,saneamiento,limpieza,alumbrado,servicios}: betterThan|null, official name|null), `joinHousingZones(rentZones, saleDocs, scores)`, `housingBudget(query, usdUyu)` → { rentMax, rentMaxMapfre, buyMax, buyMaxBySavings, buyMaxByIncome, profile }, `adviseHousing(zones, query, context)` → `{ budget, results, considered, excluded, minimum }`, `HousingAdvisorResult`.

Tests (fixture of 5 barrios): normalization; rent cap 40 % of income and explicit `alquilerMax` wins; buy max = min(savings bound, income bound) exact; contado; no savings; alquilar/comprar/comparar filters; stretch via p25; priorities reorder; missing scores neutral 0.5 and no claim; rent-vs-buy numbers; minimum when nothing fits; every reason has a digit; directory query params.

### Task 3: Server join + endpoint

Files: `app/server/utils/housingAdvisor.ts` (loader with 10-min cache per dept×type×beds, stale-on-error), `app/server/api/housing/advisor.get.ts`.

Reads `loadRentalZones`, `MarketSeriesMetaModel` `index:venta` + `MarketSeriesModel.find({ key: { $in } })` with projection `{ key, labels, latest }`, `loadRentalZoneScores`, live `usdUyu` from the rental zones response (or sales meta). Returns `{ generatedAt, usdUyu, query, departments, ...adviseHousing }`.

### Task 4: Page and wiring

`app/pages/donde-vivir-uruguay.vue` (form, household line, cards, checklist, how-it's-calculated, FAQ, AssistantCta hogar); `siteNav` entry + i18n es/en/pt; `directorios.ts` analisis for alquileres and venta; guide hub resource; `seoContract` noindex list; `experiments.json`; links from `/alquiler-ideal-uruguay`, `/barrios-alquileres-uruguay`, `/comprar-o-alquilar-uruguay`.

### Task 5: Docs, verification, ship

`docs/app/DONDE_VIVIR.md`; memory. App unit suite + eslint; dev run with real documents copied from the VPS; four profiles read by hand; fresh-context review; push; measure production.
