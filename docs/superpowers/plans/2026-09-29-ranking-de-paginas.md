# Ranking de páginas por visita — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** página privada `/estadisticas-por-pagina` que rankea las páginas por visitas uruguayas (base semanal robusta), marca picos/caídas/subas y arma la lista "dónde enfocarse", alimentada una vez por día desde GA4.

**Architecture:** módulo puro `classes/site-analytics/pageRanking.ts` (requests GA4 → snapshot) enchufado como cuarto paso del job existente `currency-site-analytics`; documento único en APP DB `sitepagerankings`; ruta Nitro `requireAdmin`; página Vuetify que sólo pinta.

**Tech Stack:** TS 4.9 CommonJS (raíz), mongoose, vitest; Nuxt 4 + Vuetify 4 (app), vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-ranking-de-paginas-design.md`

## Global Constraints

- Audiencia del ranking = `countryId = UY`; el total de todos los países sólo como columna de contraste.
- Rutas sin query string (`publicPath`), nunca `/buscar?q=`.
- Cero cifras de ingreso en código, docs o commits (repo público). El valor = base × multiplicador de tramo.
- Página privada: `requireAdmin`, `cache-control: private, no-store`, `noindex, nofollow`, fuera de robots y sitemap, sin anuncios.
- El paso nuevo del job va en su propio `try`, DESPUÉS del snapshot público y del ingreso.
- No guardar con `totals.viewsUy === 0`.
- Umbrales (exportados): pico 3× y ≥ 20; tendencia ≥ 30 vistas, cae ≤ 0,6×, crece ≥ 1,5×; rebota ≥ 50 vistas y < 20 s en tramo contenido/otro; afuera ≥ 50 vistas y < 50 % UY; ia ≥ 5 entradas; 600 páginas; 6 ítems por grupo; top 5 "sostienen".

## Review Focus

1. Página que aparece en el reporte semanal pero no en el de título (o al revés) → fila igual, título vacío, cifras de la fuente que exista. Test en Task 2.
2. `/ruta/` y `/ruta?utm=x` → una sola fila sumada. Test en Task 2.
3. Página sólo en la última semana (`[0,0,0,12]`) → `nueva`, base 12, sin `pico`, sin `crece`. Test en Task 1.
4. Reporte truncado (`rows < rowCount`) → `truncated: true`, se guarda igual. Test en Task 2.
5. `(not set)` como landing → cuenta en canales, no crea fila. Test en Task 2.

---

### Task 1: primitivas puras (base, tendencia, señales, foco)

**Files:**
- Create: `classes/site-analytics/pageRanking.ts`
- Test: `tests/site_analytics/page_ranking.test.ts`

**Interfaces — Produces:**
```ts
export type PageSignal = "pico" | "cae" | "crece" | "nueva" | "rebota" | "afuera" | "ia";
export interface Entrances { total: number; organic: number; direct: number; social: number; ai: number; other: number }
export interface PageRankRow { path: string; title: string; family: string; tier: string; multiplier: number; rank: number;
  weeks: number[]; views: number; base: number; users: number; engagementSeconds: number; viewsAll: number; uyShare: number;
  entrances: Entrances; engagedRate: number; trend: number | null; value: number; signals: PageSignal[] }
export type FocusKind = "sostienen" | "caen" | "suben" | "rebotan" | "ia" | "picos";
export interface FocusItem { kind: FocusKind; path: string; title: string; headline: string; detail: string }
export function median(xs: number[]): number
export function baseOf(weeks: number[]): number          // mediana de las semanas desde la primera con vistas
export function trendOf(weeks: number[]): number | null  // (s3+s4)/(s1+s2) − 1; null si s1+s2 = 0 o ambas mitades < 30
export function isNewPage(weeks: number[]): boolean      // s1 = s2 = 0 y s3+s4 > 0
export function isPico(weeks: number[]): boolean
export function signalsOf(row: Omit<PageRankRow, "signals" | "rank">): PageSignal[]
export function buildFocus(rows: PageRankRow[], weekStarts: string[]): FocusItem[]
```

- [ ] **Step 1: tests que fallan** — casos medidos del 29/9:
  - `baseOf([303,210,124,27]) = 167`, `baseOf([0,0,154,89]) = 121.5`, `baseOf([0,0,0,12]) = 12`, `baseOf([0,0,0,0]) = 0`.
  - `trendOf([303,210,124,27]) ≈ -0.7057`, `trendOf([0,0,154,89]) = null`, `trendOf([5,4,6,3]) = null` (poca muestra).
  - `isPico([192,32,34,19]) = true`, `isPico([303,210,124,27]) = false`, `isPico([0,33,0,0]) = true`, `isPico([0,0,154,89]) = false`, `isPico([3,2,4,5]) = false`.
  - `signalsOf` de `/alquileres-uruguay` (tramo directorio) → `["cae"]`; de `[192,32,34,19]` → contiene `pico` y NO `cae`; de `[0,0,0,12]` → `["nueva"]`; rebota sólo con tramo `contenido`/`otro`; `afuera` con 100 totales y 30 UY; `ia` con 5 entradas.
  - `buildFocus`: grupos en orden fijo, máx 6 por grupo, "caen" ordenado por vistas perdidas × multiplicador, textos contienen las cifras.
- [ ] **Step 2:** `npx vitest run tests/site_analytics/page_ranking.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** implementar las primitivas y constantes del Global Constraints.
- [ ] **Step 4:** tests en verde.
- [ ] **Step 5:** commit `feat(site-analytics): primitivas del ranking de páginas`.

### Task 2: requests GA4 y armado del snapshot

**Files:** Modify `classes/site-analytics/pageRanking.ts`; Test `tests/site_analytics/page_ranking.test.ts`.

**Interfaces:**
- Consumes: `analyticsWindows`, `addDays`, `publicPath` (`refresh.ts`); `exactDimension`, `reportRows`, `runReports` (`ga4.ts`); `bucketOf`; `tierOf`.
- Produces:
```ts
export interface PageRankingSnapshot { key: string; asOf: string; timezone: string;
  range: { start: string; end: string; days: number }; weeks: { start: string; end: string }[];
  totals: { viewsUy: number; viewsAll: number; uyShare: number; sessionsUy: number; usersUy: number;
    weeklyUy: number[]; channels: { label: string; sessions: number; share: number }[] };
  pageCount: number; truncated: boolean; pages: PageRankRow[]; families: FamilyRankRow[]; focus: FocusItem[] }
export interface FamilyRankRow { family: string; tier: string; multiplier: number; urls: number; views: number;
  base: number; weeks: number[]; engagementSeconds: number; entrances: Entrances; trend: number | null; value: number; share: number }
export function rankingWeeks(w: AnalyticsWindows): { start: string; end: string }[]
export function pageRankingRequests(w: AnalyticsWindows): Ga4ReportRequest[]   // 5, orden de la tabla del spec
export function buildPageRanking(reports: Ga4Report[], ctx: { asOf: string; timezone: string; windows: AnalyticsWindows }): PageRankingSnapshot
export function pageRankingIsEmpty(s: PageRankingSnapshot): boolean
export async function refreshPageRanking(now?: Date): Promise<PageRankingSnapshot>
```
- [ ] **Step 1: tests que fallan**: 4 semanas contiguas que cubren `range`; request 0 con 4 `dateRanges` nombrados `w0..w3` y filtro UY; request 2 sin filtro; `buildPageRanking` con reportes sintéticos (helper `report()` como en `refresh.test.ts`) cubriendo los 5 ítems de Review Focus, canal `AI Assistant → ai`, `Organic Social → social`, orden por base y `rank`, familias, `viewsAll ≥ views`, `pageRankingIsEmpty`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** verde + `npx tsc -p tsconfig.production.json --noEmit --pretty false`.
- [ ] **Step 5:** commit `feat(site-analytics): snapshot del ranking de páginas desde GA4`.

### Task 3: persistencia y job

**Files:** Create `classes/models/SitePageRanking.ts`; Modify `classes/site-analytics/store.ts`, `sync_site_analytics.ts`, `tests/appdb/schema_parity.test.ts`, `tests/site_analytics/revenue_privacy.test.ts`; Create `app/server/models/SitePageRanking.ts` (espejo, lo exige la paridad).

- [ ] **Step 1:** test de paridad (`SitePageRankingModel` ↔ app, colección `sitepagerankings`) y de privacidad (ningún campo del modelo matchea `MONEY`). FAIL.
- [ ] **Step 2:** modelos + `savePageRanking`/`loadPageRanking` + paso en el job (`try` propio, rechaza vacío, log de una línea con vistas UY, páginas y cantidad de foco).
- [ ] **Step 3:** `npx vitest run tests/appdb tests/site_analytics` verde; tsc limpio.
- [ ] **Step 4:** commit `feat(site-analytics): guardar el ranking en sitepagerankings`.

### Task 4: API y utilidades del app

**Files:** Create `app/server/api/site-page-ranking.get.ts`, `app/utils/pageRanking.ts`, `app/tests/unit/pageRanking.test.ts`.

**Produces (app):** tipos espejo; `PR_SIGNAL_LABELS`, `PR_SIGNAL_COLORS`, `PR_FOCUS_GROUPS` (orden + título + qué hacer); `filterRankedPages(pages, { q, family, signal })`; `sortRankedPages(pages, key: 'base'|'views'|'trend'|'value'|'engagement')`; `prTrend(t)`; `prSeconds(s)`; `prPercent(x)`.
- [ ] Tests primero (filtro por texto en ruta y título, por familia, por señal; orden estable con desempate por ruta; `trend null` al final). FAIL → implementar → verde (`cd app && npx vitest run tests/unit/pageRanking.test.ts`).
- [ ] Commit `feat(app): API privada y utilidades del ranking de páginas`.

### Task 5: página y registro de ruta privada

**Files:** Create `app/pages/estadisticas-por-pagina.vue`; Modify `app/nuxt.config.ts` (robots disallow, sitemap exclude + `/*/`), `app/utils/siteNav.ts` (`EXCLUDED_ROUTES`), `app/tests/unit/siteNav-coverage.test.ts`, `app/utils/ads.ts` (`NO_ADS`), `app/tests/unit/seoContract.test.ts`, `app/pages/estadisticas-de-busqueda.vue` (enlace).
- [ ] Página con `definePageMeta({ middleware: 'auth' })`, `noindex`, `authFetch('/api/site-page-ranking')`, estados cargando/prohibido/vacío, resumen, foco, tabla (`cu-mobile-cards` + `data-label`), familias, metodología.
- [ ] `cd app && npx vitest run` (unit) y `npm run lint` verdes.
- [ ] Commit `feat(app): /estadisticas-por-pagina, ranking privado por visita`.

### Task 6: documentación

**Files:** Create `docs/analytics/PAGE_RANKING.md`; Modify `AGENTS.md` (fila `currency-site-analytics`).
- [ ] Commit `docs: ranking de páginas`.

### Task 7: integrar, desplegar, poblar y analizar

- [ ] Suite raíz completa + app unit + lint. Revisión del branch.
- [ ] Merge a `main` desde worktree temporal (otra sesión tiene cambios sin commitear en el checkout compartido), push, mirar el run de CI.
- [ ] En el VPS: `node dist/sync_site_analytics.js`, leer `sitepagerankings`.
- [ ] Análisis "dónde enfocarse" con el documento real → al usuario, y copia en `docs/seo/data/` (gitignored).
