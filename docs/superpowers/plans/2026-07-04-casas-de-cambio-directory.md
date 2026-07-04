# Casas de Cambio Directory Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/casas-de-cambio` — a fair, source-cited comparison of all ~34 tracked exchange houses combining researched reputation (Google reviews, press) with live USD rate competitiveness.

**Architecture:** Pure data/content util (`casasDirectory.ts`, pattern of `withdrawCash.ts` + `courierShipping.ts`) + one SSR page that layers live rates from the existing `useApiService` composable. No new server endpoints. Reputation is a dated, verified snapshot with per-claim sources.

**Tech Stack:** Nuxt 3 + Vuetify 3, vue-i18n locale via content tree, vitest unit tests, Playwright e2e, nuxt-og-image, JSON-LD via `useHead`.

## Global Constraints

- `npm run typecheck` is broken repo-wide — verification is `npm run lint` + vitest (spec: Testing).
- Trilingual es/en/pt; es is unprefixed default; canonical via `localePath` (spec: SEO).
- No `aggregateRating` structured data — third-party review stars UI-only with citation (spec: Fairness).
- Light-mode: any hardcoded white/grey text needs `.v-theme--light` overrides; target 0 axe contrast violations (repo standard).
- Ratings never invented: unverified → `null` → "sin datos". Every reputation claim keeps a source URL.
- All comparison ordering user-controllable; default sort = review count desc (popularity, documented on page).

---

### Task 1: `buildUsdComparison` pure util + tests

**Files:**
- Create: `app/utils/casasDirectory.ts`
- Test: `app/tests/unit/casasDirectory.test.ts`

**Interfaces:**
- Produces: `interface UsdRateRow { origin: string; code: string; type?: string | null; buy: number; sell: number; isInterBank?: boolean }`, `interface UsdComparisonEntry { origin: string; buy: number; sell: number; type: string; spreadPct: number; gapSellPct: number; gapBuyPct: number }`, `function buildUsdComparison(rows: UsdRateRow[]): UsdComparisonEntry[]`

- [ ] **Step 1: Write failing tests** — selection rule (prefer `''` over `BILLETE` over anything else; skip interbank/invalid), spread math, gap-to-best math, empty input.

```ts
import { describe, expect, it } from 'vitest'
import { buildUsdComparison, type UsdRateRow } from '../../utils/casasDirectory'

const row = (origin: string, buy: number, sell: number, type = '', isInterBank = false): UsdRateRow =>
  ({ origin, code: 'USD', type, buy, sell, isInterBank })

describe('buildUsdComparison', () => {
  it('returns empty for empty input', () => {
    expect(buildUsdComparison([])).toEqual([])
  })

  it('excludes interbank rows and non-USD codes', () => {
    const out = buildUsdComparison([
      row('bcu', 40, 40, '', true),
      { origin: 'gales', code: 'EUR', type: '', buy: 45, sell: 47 },
      row('gales', 39.5, 41.5),
    ])
    expect(out.map(e => e.origin)).toEqual(['gales'])
  })

  it('prefers the plain cash row over BILLETE over other types', () => {
    const out = buildUsdComparison([
      row('brou', 38.9, 41.4, 'EBROU'),
      row('brou', 38.4, 41.9, 'BILLETE'),
    ])
    expect(out[0]?.type).toBe('BILLETE')
    const out2 = buildUsdComparison([row('gales', 39, 41, 'BILLETE'), row('gales', 39.2, 41.2, '')])
    expect(out2[0]?.type).toBe('')
  })

  it('skips rows with non-positive prices', () => {
    expect(buildUsdComparison([row('x', 0, 41)])).toEqual([])
  })

  it('computes spread and gap-to-best', () => {
    const out = buildUsdComparison([row('a', 39, 41), row('b', 39.5, 40.5)])
    const a = out.find(e => e.origin === 'a')
    const b = out.find(e => e.origin === 'b')
    // spread = (sell-buy)/midpoint*100
    expect(a?.spreadPct).toBeCloseTo((2 / 40) * 100, 5)
    // best sell = 40.5 (b), best buy = 39.5 (b)
    expect(b?.gapSellPct).toBeCloseTo(0, 5)
    expect(a?.gapSellPct).toBeCloseTo(((41 - 40.5) / 40.5) * 100, 5)
    expect(a?.gapBuyPct).toBeCloseTo(((39.5 - 39) / 39.5) * 100, 5)
  })
})
```

- [ ] **Step 2: Run** `cd app && npx vitest run tests/unit/casasDirectory.test.ts` — expect FAIL (module missing).
- [ ] **Step 3: Implement** in `app/utils/casasDirectory.ts`:

```ts
// Directory/comparison data for /casas-de-cambio. PURE (no Vue/Nuxt imports).

export interface UsdRateRow {
  origin: string
  code: string
  type?: string | null
  buy: number
  sell: number
  isInterBank?: boolean
}

export interface UsdComparisonEntry {
  origin: string
  buy: number
  sell: number
  type: string
  spreadPct: number
  gapSellPct: number
  gapBuyPct: number
}

const typeRank = (t: string): number => (t === '' ? 0 : t === 'BILLETE' ? 1 : 2)

export function buildUsdComparison(rows: UsdRateRow[]): UsdComparisonEntry[] {
  const byOrigin = new Map<string, UsdRateRow>()
  for (const r of rows) {
    if (r.code !== 'USD' || r.isInterBank || !(r.buy > 0) || !(r.sell > 0)) continue
    const t = r.type ?? ''
    const prev = byOrigin.get(r.origin)
    if (!prev || typeRank(t) < typeRank(prev.type ?? '') ||
        (typeRank(t) === typeRank(prev.type ?? '') && r.sell < prev.sell)) {
      byOrigin.set(r.origin, { ...r, type: t })
    }
  }
  const picked = [...byOrigin.values()]
  if (picked.length === 0) return []
  const bestSell = Math.min(...picked.map(r => r.sell))
  const bestBuy = Math.max(...picked.map(r => r.buy))
  return picked.map(r => ({
    origin: r.origin,
    buy: r.buy,
    sell: r.sell,
    type: r.type ?? '',
    spreadPct: ((r.sell - r.buy) / ((r.sell + r.buy) / 2)) * 100,
    gapSellPct: ((r.sell - bestSell) / bestSell) * 100,
    gapBuyPct: ((bestBuy - r.buy) / bestBuy) * 100,
  }))
}
```

- [ ] **Step 4: Run tests** — expect PASS.
- [ ] **Step 5: Commit** `feat(casas): USD comparison util for exchange-house directory`

### Task 2: Reputation dataset + trilingual content tree + invariant tests

**Files:**
- Modify: `app/utils/casasDirectory.ts`
- Test: `app/tests/unit/casasDirectory.test.ts` (append)

**Interfaces:**
- Produces: `LAST_RESEARCHED: string` (ISO date), `CASAS_PATH = '/casas-de-cambio'`, `interface ReviewRef { label: string; url: string }`, `interface CasaReputation { code: string; category: 'casa' | 'banco' | 'fintech'; googleRating: number | null; googleReviewCount: number | null; ratingSource: string | null; branchNote: string | null; founded: string | null; services: string[]; strengths: string[]; weaknesses: string[]; press: ReviewRef[]; sources: ReviewRef[] }`, `CASAS_REPUTATION: CasaReputation[]`, `getCasasContent(locale: string): CasasContent` (full trilingual tree: `lang, title, metaTitle, description, keywords, intro, updated, methodologyTitle, methodology: string[], bestForTitle, bestFor {rate, rated, coverage, digital} labels, table labels, categories {casa,banco,fintech}, contextTitle/context paragraphs, borderTitle/border paragraphs, safetyTitle/safety paragraphs, faq: {q,a}[], disclaimerTitle, disclaimer, sourcesTitle, ctaTitle, ctaBody, ctaRates, ctaMap, ctaBranches, noData, lowSample, perBranches, reviewsCaption, sortLabel, sortOptions, deptFilterLabel, detailsTitle, strengthsLabel, weaknessesLabel, pressLabel, servicesLabel, foundedLabel, ratesDisclaimer`)
- Dataset content source: verified results of research workflow `wf_38ea944e-149` (ratings only where confirmed by verifier or high-confidence with direct source; else `null`).

- [ ] **Step 1: Append failing invariant tests**

```ts
import {
  CASAS_REPUTATION, getCasasContent, LAST_RESEARCHED,
} from '../../utils/casasDirectory'

describe('CASAS_REPUTATION invariants', () => {
  it('has unique codes and valid categories', () => {
    const codes = CASAS_REPUTATION.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(CASAS_REPUTATION.every(c => ['casa', 'banco', 'fintech'].includes(c.category))).toBe(true)
  })
  it('ratings are in range and always sourced', () => {
    for (const c of CASAS_REPUTATION) {
      if (c.googleRating != null) {
        expect(c.googleRating).toBeGreaterThanOrEqual(1)
        expect(c.googleRating).toBeLessThanOrEqual(5)
        expect(c.googleReviewCount).toBeGreaterThan(0)
        expect(c.ratingSource).toBeTruthy()
      }
    }
  })
  it('LAST_RESEARCHED is an ISO date', () => {
    expect(LAST_RESEARCHED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getCasasContent', () => {
  it('returns structurally identical trees for es/en/pt and falls back to es', () => {
    const es = getCasasContent('es')
    for (const loc of ['en', 'pt']) {
      const tree = getCasasContent(loc)
      expect(Object.keys(tree).sort()).toEqual(Object.keys(es).sort())
      expect(tree.faq.length).toBe(es.faq.length)
    }
    expect(getCasasContent('fr').lang).toBe('es-UY')
  })
})
```

- [ ] **Step 2: Run** — FAIL (exports missing).
- [ ] **Step 3: Implement** — add exports. `CASAS_REPUTATION` one entry per origin from the research run; example shape:

```ts
export const LAST_RESEARCHED = '2026-07-04'
export const CASAS_PATH = '/casas-de-cambio'

export const CASAS_REPUTATION: CasaReputation[] = [
  {
    code: 'gales',
    category: 'casa',
    googleRating: 4.4,            // only if verifier confirmed; else null
    googleReviewCount: 320,
    ratingSource: 'https://www.google.com/maps/...',
    branchNote: 'La sucursal Centro promedia mejor que WTC.',
    founded: '1966',
    services: ['cotizacion-online', 'transferencias', 'app'],
    strengths: ['Buena reputación de atención (4.4★, 300+ reseñas)'],
    weaknesses: ['Quejas puntuales por esperas en temporada'],
    press: [{ label: 'El País — ...', url: 'https://...' }],
    sources: [{ label: 'Google Maps — Cambio Gales Centro', url: 'https://...' }],
  },
  // ... every other origin, nulls where research found nothing verifiable
]
```

`getCasasContent` follows the `getWithdrawContent` pattern: `const CONTENT: Record<'es' | 'en' | 'pt', CasasContent>` + fallback to `es`.
- [ ] **Step 4: Run tests** — PASS. Also `cd app && npm run lint -- --no-fix` clean for touched files.
- [ ] **Step 5: Commit** `feat(casas): reputation snapshot dataset + trilingual content`

### Task 3: `/casas-de-cambio` page

**Files:**
- Create: `app/pages/casas-de-cambio.vue`

**Interfaces:**
- Consumes: everything from Task 1/2; `useApiService().getProcessedExchangeData('')`; `starParts` from `~/utils/reviews`; `ShareButtons` component; `defineOgImageComponent('Cambio', ...)`.

- [ ] **Step 1: Build page** with sections (structure mirrors `couriers-uruguay.vue`; content from `getCasasContent(locale)`):
  1. Breadcrumb btn → home. Hero card (gradient, h1 `c.title`, intro incl. `LAST_RESEARCHED` date, ShareButtons).
  2. "Best for" 4 stat cards (computed): best USD sell now / best rated (≥30 reviews) / widest coverage (departments count from localData) / best digital (curated pick from research, justified in copy).
  3. Methodology `v-alert` (info tonal): `c.methodology` bullets.
  4. Filters row: department `v-select` (from localData departments union) + sort `v-select` (reviews desc | rating desc | best sell | best buy | spread asc | name) + category `v-btn-toggle` (todas/casas/bancos/fintech).
  5. Desktop `VTable` + mobile stacked cards. Columns: casa (+category chip, link `/casa/[origin]`), rating stars + `(N)` + low-sample flag / `c.noData`, USD compra/venta (live, `—` fallback), spread %, coverage (N deptos), links (sitio web ↗, sucursales, histórico). Rows from merged `CASAS_REPUTATION` × live comparison × localData.
  6. Expandable details (`v-expansion-panels`, only casas having strengths/weaknesses/press): strengths/weaknesses lists, services chips, founded, press links, branchNote, per-casa sources.
  7. Context prose sections: casas vs bancos vs fintech; border cities; safety/regulation (BCU authorization + link pattern from localData `bcu`).
  8. FAQ `v-expansion-panels` from `c.faq`.
  9. Warning disclaimer (rates change, snapshot date, no affiliation, corrections via /contacto).
  10. Sources card: dedup of all `sources`+`press` URLs.
  11. CTA card → `/` (live rates), `/mapa`, `/sucursales`.
- [ ] **Step 2: SSR data** — `useAsyncData('casas-directory', () => getProcessedExchangeData(''))`; `buildUsdComparison(exchangeData)`; departments from `localData`. API failure → all live cells render `—` (computed returns empty Map; no throw).
- [ ] **Step 3: SEO head** — `useSeoMeta` from content tree; per-locale canonical; `defineOgImageComponent('Cambio', { title: c.title, subtitle: c.description, tag: 'COMPARATIVA' })`; JSON-LD `@graph`: `Article` (datePublished/dateModified = `LAST_RESEARCHED`, author Eduardo Airaudo, publisher Cambio Uruguay), `ItemList` of `FinancialService` (`url` = `https://cambio-uruguay.com/casa/<code>`, `sameAs` official site), `FAQPage` from `c.faq`, `BreadcrumbList`. **No aggregateRating.**
- [ ] **Step 4: Styles** — copy couriers card/table/link styles incl. `.v-theme--light` text overrides; stars amber; keep `overflow-x: hidden` guard; table wrapped in `overflow-x: auto`.
- [ ] **Step 5: Verify locally** — `cd app && npm run dev` → open `/casas-de-cambio`, `/en/casas-de-cambio`, `/pt/casas-de-cambio`: hero, ≥30 rows, sort + filters work, details expand, JSON-LD present (`view-source` script tag), no console errors.
- [ ] **Step 6: Commit** `feat(casas): /casas-de-cambio comparison directory page`

### Task 4: Wiring — sitemap, footer, axe sweep, cross-links

**Files:**
- Modify: `app/server/api/__sitemap__/urls.get.ts` (after the `/couriers-uruguay` line): `addUrlsForAllLocales('/casas-de-cambio', 0.8, 'weekly')`
- Modify: `app/components/Footer.vue` — add `<NuxtLink :to="localePath('/casas-de-cambio')" class="footer-link text-caption">Casas de cambio</NuxtLink>` next to the couriers link.
- Modify: `app/scripts/lightmode-axe.mjs` — add `'/casas-de-cambio'` to route list.
- Modify: `app/pages/sucursales/index.vue` + `app/pages/casa/[origin].vue` — one contextual `NuxtLink` to the directory ("Ver comparativa de casas de cambio"), placed near existing back/CTA blocks.

- [ ] **Step 1: Apply the four edits above.**
- [ ] **Step 2:** `cd app && npm run lint -- --no-fix` → clean.
- [ ] **Step 3: Commit** `feat(casas): wire directory into sitemap, footer, axe sweep, cross-links`

### Task 5: E2E smoke + full verification

**Files:**
- Create: `app/tests/e2e/casas-directory.spec.ts` (conventions from existing e2e specs; hydration gated via `expect(...).toPass()` retries per repo memory)

- [ ] **Step 1: Write spec**

```ts
import { expect, test } from '@playwright/test'

test('casas directory renders comparison rows', async ({ page }) => {
  await page.goto('/casas-de-cambio')
  await expect(page.locator('h1')).toContainText(/casas de cambio/i)
  await expect(async () => {
    const rows = await page.locator('[data-testid="casas-row"]').count()
    expect(rows).toBeGreaterThan(20)
  }).toPass({ timeout: 30_000 })
  // FAQ + methodology + sources present
  await expect(page.locator('[data-testid="casas-methodology"]')).toBeVisible()
  await expect(page.locator('[data-testid="casas-faq"]')).toBeVisible()
})
```

(add matching `data-testid`s in Task 3 template).
- [ ] **Step 2: Run** unit suite + this spec against dev server per repo e2e config — PASS.
- [ ] **Step 3:** Prod build (8GB heap recipe from memory) + `node scripts/lightmode-axe.mjs` restricted to new route if supported, else full sweep — 0 contrast violations both themes.
- [ ] **Step 4:** superpowers:verification-before-completion — evidence, then commit `test(casas): e2e smoke + axe verification`.

## Self-Review

- Spec coverage: fairness rules → Task 2 dataset rules + Task 3 §3/§9 + Global Constraints; SEO → Task 3 §3 + Task 4; error handling → Task 3 §2; testing → Tasks 1/2/5; maintenance note → post-implementation memory write (outside repo, noted in spec). ✔
- Placeholders: dataset entries marked "from research run" are content injection from a concrete, already-running source (`wf_38ea944e-149`), not TBD logic. ✔
- Type consistency: `buildUsdComparison`, `CASAS_REPUTATION`, `getCasasContent`, `CASAS_PATH`, `LAST_RESEARCHED` used consistently across tasks. ✔
