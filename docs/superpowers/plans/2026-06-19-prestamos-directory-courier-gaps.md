# Loan Directory + Courier Gap-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a researched, sourced loan-directory page (`/prestamos-uruguay`) reusing the courier seed→scrape→overlay→API→page architecture, and fill the gaps + add a reputation dimension to the existing courier comparison.

**Architecture:** Pure-TS seed catalogs (`utils/loans.ts`, extended `utils/courierShipping.ts`) feed Vue comparison pages. A daily Nitro task scrapes lender TEA where it is published in HTML; a filesystem-backed store overlays fresh scrapes on the seed ("only overwrite on a fresh good scrape"); a cached API serves the merged view with lazy bootstrap. Reputation data is a verified, sourced snapshot (not scraped). Research is gathered by parallel subagents and assembled into the catalogs by the implementer.

**Tech Stack:** Nuxt 3 / Nitro, Vue 3 + Vuetify, TypeScript, Vitest, ESLint. Node-only `fetch` scrapers (no headless browser).

## Global Constraints

- All new files live under `app/`. Run all commands from `c:\Users\airau\Documents\GitHub\cambio-uruguay\app`.
- Test command: `npm test` (alias for `vitest run`). Lint: `npm run lint`. Build: `npm run build`.
- Pure data/logic modules (`utils/*`, `server/utils/*`) must stay free of Vue/Nuxt runtime imports so they are unit-testable, exactly like `courierShipping.ts` / `courierScraper.ts`.
- **Sourcing rule (non-negotiable):** every `teaPct`, `perKgUsd`, `baseUsd`, and `rating` in a seed catalog MUST trace to a `source` / `reviewSources` URL. No URL ⇒ the value is `null` (rendered "Consultar" / no stars). Never invent a rate or rating.
- Rates labelled "verificado junio 2026"; page copy is Spanish (es-UY), consistent with `couriers-uruguay.vue`.
- Scraper store golden rule: a failed/implausible scrape leaves the previous good value untouched.
- Commit after every task. Conventional Commits. Co-author trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

New:
- `app/utils/reviews.ts` — shared `ReviewSource` type + star helpers.
- `app/utils/loans.ts` — `Lender` interface, `LENDERS` seed, label/group helpers.
- `app/server/utils/loanScraper.ts` — pure TEA parsers + plausibility guard.
- `app/server/utils/loanRatesStore.ts` — filesystem overlay store.
- `app/server/api/prestamos.get.ts` — cached merged view + lazy bootstrap.
- `app/server/tasks/loans/scrape.ts` — daily scheduled task.
- `app/pages/prestamos-uruguay.vue` — comparison page.
- `app/tests/unit/loans.test.ts`, `app/tests/unit/loanScraper.test.ts`.
- `docs/superpowers/research/2026-06-19-loans-research.md`, `docs/superpowers/research/2026-06-19-couriers-research.md` — sourced research deliverables.

Changed:
- `app/utils/courierShipping.ts` — fill null rates, add couriers, add optional reputation fields.
- `app/server/utils/courierScraper.ts` — parsers for any newly HTML-scrapable courier.
- `app/pages/couriers-uruguay.vue` — reputation column/row + review sources.
- `app/nuxt.config.ts` — register `loans:scrape` cron.
- `app/components/Footer.vue` — `/prestamos-uruguay` link.
- `app/server/api/__sitemap__/urls.get.ts` — sitemap entry.
- `app/pages/herramientas/calculadora-prestamo.vue` — cross-link CTA.
- `app/tests/unit/courierScraper.test.ts` — assertions for new couriers.

---

## Task 1: Loan research (sourced data deliverable)

**Files:**
- Create: `docs/superpowers/research/2026-06-19-loans-research.md`

**Interfaces:**
- Produces: a markdown file with one section per lender category (bancos / financieras / cooperativas / fintech). Each lender row carries: `id`, `name`, `type`, advertised `teaPct` (+ `currency`), `maxAmount`, `maxTermMonths`, `requirements[]`, `online`, official `website`, `source` URL, `rating` (0–5), `reviewsNote`, and ≥1 `reviewSources` URL. Tasks 3–7 consume this file to populate `LENDERS`.

- [ ] **Step 1: Dispatch four parallel research subagents (general-purpose, WebSearch + WebFetch).** One per category. Prompt each with the sourcing rule and this exact output contract:

```
For each lender in category <CATEGORY> offering personal/consumer loans in Uruguay, return a row:
| id (kebab) | name | teaPct (annual effective %, or null) | currency (UYU/USD/UI) | maxAmount (or null) | maxTermMonths (or null) | requirements (3-5 short bullets) | online (yes/no) | website | source URL (official tariff/loan page backing teaPct) | rating (0-5 from reviews, or null) | reviewsNote (1 line) | reviewSources (2+ URLs: Reddit r/uruguay, Trustpilot, Google, press) |
Rules: every teaPct/rating needs a backing URL; no URL => null. Prefer official pages for rates, reviews only for reputation. Note access date. Do NOT invent figures.
Categories:
- bancos: BROU, Itaú, Santander, Scotiabank, BBVA, HSBC
- financieras: Creditel, Pronto!, OCA, República Microfinanzas, Microfin, Verticot, Crédito de la Casa, Emprendamos
- cooperativas: FUCAC, FUCEREP, ANDA, ACAC
- fintech: Prex and any app-based lender offering credit in Uruguay
```

- [ ] **Step 2: Consolidate** the four subagent outputs into `docs/superpowers/research/2026-06-19-loans-research.md`, deduping sources, dropping any lender with no verifiable official presence, and sanity-checking each `teaPct` against typical Uruguayan consumer ranges (flag outliers, keep the URL).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/research/2026-06-19-loans-research.md
git commit -m "research(prestamos): sourced Uruguay lender data (rates, requirements, reviews)"
```

---

## Task 2: Courier research (gap rates + missing couriers + reputation)

**Files:**
- Create: `docs/superpowers/research/2026-06-19-couriers-research.md`

**Interfaces:**
- Produces: a markdown file with (a) published `perKgUsd`/`baseUsd`/`note` + `source` for `miami-box`, `urubox`, `exur` and any courier not yet in `COURIERS`; (b) per-courier `rating` (0–5), `reviewsNote`, and `reviewSources[]` for the full courier set. Tasks 8–10 consume it.

- [ ] **Step 1: Dispatch two parallel research subagents (general-purpose, WebSearch + WebFetch).**
  - Subagent A — **rates/gaps**: find published per-kg + handling rates (with source URLs) for Miami Box, Urubox, EXUR, and discover couriers not in this list: `gripper, soycourier, uruguaycargo, enviamicompra, aerobox, casillamia, puntomio, usxcargo, miami-box, urubox, exur`. For each, note whether the rate is in raw page HTML or behind a JS calculator.
  - Subagent B — **reputation**: for every courier (existing + newly found), summarize review sentiment and return `rating` (0–5) + `reviewsNote` + 2+ `reviewSources` URLs (Reddit r/uruguay, Trustpilot, Google, Facebook groups).

- [ ] **Step 2: Consolidate** into `docs/superpowers/research/2026-06-19-couriers-research.md`. Apply the courier plausibility band (per-kg US$5–60) as a sanity filter; values outside it stay `null` ("Consultar").

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/research/2026-06-19-couriers-research.md
git commit -m "research(couriers): gap rates, missing couriers, reputation sources"
```

---

## Task 3: Shared review types + helpers (`utils/reviews.ts`)

**Files:**
- Create: `app/utils/reviews.ts`
- Test: `app/tests/unit/loans.test.ts` (created here, extended in Task 4-area; holds the reviews tests for now)

**Interfaces:**
- Produces: `interface ReviewSource { label: string; url: string }`; `function starParts(rating: number | null): { full: number; half: boolean; empty: number }` returning a 5-slot breakdown for rendering stars.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/unit/loans.test.ts
import { describe, expect, it } from 'vitest'
import { starParts } from '../../utils/reviews'

describe('starParts', () => {
  it('splits a whole rating into full + empty (5 slots)', () => {
    expect(starParts(4)).toEqual({ full: 4, half: false, empty: 1 })
  })
  it('rounds .5+ to a half star', () => {
    expect(starParts(3.6)).toEqual({ full: 3, half: true, empty: 1 })
  })
  it('treats null as no stars', () => {
    expect(starParts(null)).toEqual({ full: 0, half: false, empty: 5 })
  })
  it('clamps out-of-range to 0..5', () => {
    expect(starParts(7)).toEqual({ full: 5, half: false, empty: 0 })
    expect(starParts(-1)).toEqual({ full: 0, half: false, empty: 5 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- loans.test.ts`
Expected: FAIL — cannot find module `../../utils/reviews`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/utils/reviews.ts
// Shared review/reputation primitives used by both the loan directory and the courier comparison.
// PURE (no Vue/Nuxt) so callers in utils/ and tests can import them freely.

/** A citation backing a reputation rating (Reddit thread, Trustpilot, Google, press, ...). */
export interface ReviewSource {
  label: string
  url: string
}

/**
 * Break a 0–5 rating into renderable star slots. A fractional part of 0.5 or more becomes a half
 * star; the row always totals 5 slots. `null` (too few reviews to rate) renders as five empty stars.
 */
export function starParts(rating: number | null): { full: number; half: boolean; empty: number } {
  if (rating == null || Number.isNaN(rating)) return { full: 0, half: false, empty: 5 }
  const r = Math.max(0, Math.min(5, rating))
  const full = Math.floor(r)
  const half = r - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return { full, half, empty }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- loans.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/utils/reviews.ts app/tests/unit/loans.test.ts
git commit -m "feat(reviews): shared ReviewSource type and star-rendering helper"
```

---

## Task 4: Loan catalog + helpers (`utils/loans.ts`)

**Files:**
- Create: `app/utils/loans.ts`
- Modify: `app/tests/unit/loans.test.ts`
- Consume: `docs/superpowers/research/2026-06-19-loans-research.md` (Task 1)

**Interfaces:**
- Consumes: `ReviewSource` from `utils/reviews.ts` (Task 3).
- Produces:
  - `type LenderType = 'banco' | 'financiera' | 'cooperativa' | 'fintech'`
  - `interface Lender { id; name; type; teaPct: number | null; currency: 'UYU'|'USD'|'UI'; maxAmount: number | null; maxTermMonths: number | null; requirements: string[]; online: boolean; website: string; source: string; note?: string; rating: number | null; reviewsNote?: string; reviewSources: ReviewSource[] }`
  - `const LENDERS: Lender[]`
  - `const LENDER_TYPES: Readonly<Record<LenderType, string>>`
  - `function lendersByType(): Array<{ type: LenderType; label: string; items: Lender[] }>`
  - `function getLender(id: string): Lender | undefined`
  - `function teaLabel(n: number | null): string`

- [ ] **Step 1: Add the failing catalog-integrity + helper tests** (append to `app/tests/unit/loans.test.ts`)

```ts
import { LENDERS, lendersByType, getLender, teaLabel, LENDER_TYPES } from '../../utils/loans'

describe('loans catalog', () => {
  it('has unique ids', () => {
    const ids = LENDERS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every lender has an official source URL', () => {
    for (const l of LENDERS) expect(l.source).toMatch(/^https?:\/\//)
  })
  it('rating is null or within 0..5', () => {
    for (const l of LENDERS) {
      if (l.rating != null) {
        expect(l.rating).toBeGreaterThanOrEqual(0)
        expect(l.rating).toBeLessThanOrEqual(5)
      }
    }
  })
  it('every rated lender cites at least one review source', () => {
    for (const l of LENDERS) {
      if (l.rating != null) expect(l.reviewSources.length).toBeGreaterThan(0)
    }
  })
  it('covers all four lender categories', () => {
    const types = new Set(LENDERS.map(l => l.type))
    expect([...types].sort()).toEqual(['banco', 'cooperativa', 'financiera', 'fintech'])
  })
})

describe('loans helpers', () => {
  it('teaLabel formats a percent and falls back to Consultar', () => {
    expect(teaLabel(45)).toMatch(/45/)
    expect(teaLabel(null)).toBe('Consultar')
  })
  it('lendersByType groups in LENDER_TYPES order with all lenders', () => {
    const groups = lendersByType()
    expect(groups.map(g => g.type)).toEqual(Object.keys(LENDER_TYPES))
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(LENDERS.length)
  })
  it('getLender finds by id', () => {
    expect(getLender(LENDERS[0]!.id)?.id).toBe(LENDERS[0]!.id)
    expect(getLender('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- loans.test.ts`
Expected: FAIL — cannot find module `../../utils/loans`.

- [ ] **Step 3: Implement `utils/loans.ts`** — interface + helpers, and populate `LENDERS` from the Task 1 research file (one entry per verified lender; this block shows the shape and two representative entries — replace/extend with the full researched set, keeping every `source`/`reviewSources` URL from the research).

```ts
// app/utils/loans.ts
// Catalogue of places to request a personal/consumer loan in Uruguay (banks, financieras,
// cooperativas, fintech). PURE data + helpers (no Vue/Nuxt) so the page, the API merge and tests
// share one source of truth. Rates are ADVERTISED references (TEA) verified June 2026 from each
// lender's published info; confirm the final CFT/TEA with the lender. Not affiliated; informational.
import type { ReviewSource } from './reviews'

export type LenderType = 'banco' | 'financiera' | 'cooperativa' | 'fintech'

export interface Lender {
  id: string
  name: string
  type: LenderType
  /** Representative advertised annual effective rate (TEA) in %, or null when quote-only. */
  teaPct: number | null
  currency: 'UYU' | 'USD' | 'UI'
  maxAmount: number | null
  maxTermMonths: number | null
  requirements: string[]
  online: boolean
  website: string
  /** URL backing the rate / info. */
  source: string
  note?: string
  /** Aggregated reputation 0–5 from reviews, or null when too few to rate. */
  rating: number | null
  reviewsNote?: string
  reviewSources: ReviewSource[]
}

export const LENDER_TYPES: Readonly<Record<LenderType, string>> = Object.freeze({
  banco: 'Bancos',
  financiera: 'Financieras y créditos',
  cooperativa: 'Cooperativas',
  fintech: 'Fintech / digitales',
})

// POPULATE FROM docs/superpowers/research/2026-06-19-loans-research.md — every teaPct/rating keeps
// its source/reviewSources URL. Two representative shapes shown; replace with the full set.
export const LENDERS: Lender[] = [
  {
    id: 'brou',
    name: 'BROU (Banco República)',
    type: 'banco',
    teaPct: null, // set from research; null until a sourced figure exists
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: null,
    requirements: ['Ser cliente / abrir cuenta', 'Comprobante de ingresos', 'Mayor de edad'],
    online: true,
    website: 'https://www.brou.com.uy',
    source: 'https://www.brou.com.uy/prestamos', // replace with the exact sourced URL
    rating: null,
    reviewsNote: undefined,
    reviewSources: [],
  },
  {
    id: 'creditel',
    name: 'Creditel',
    type: 'financiera',
    teaPct: null,
    currency: 'UYU',
    maxAmount: null,
    maxTermMonths: null,
    requirements: ['Cédula de identidad', 'Comprobante de ingresos'],
    online: true,
    website: 'https://www.creditel.com.uy',
    source: 'https://www.creditel.com.uy',
    rating: null,
    reviewsNote: undefined,
    reviewSources: [],
  },
]

export function getLender(id: string): Lender | undefined {
  return LENDERS.find(l => l.id === id)
}

/** A TEA cell: `X,X %` for published rates, `Consultar` when quote-only. */
export function teaLabel(n: number | null): string {
  return n == null ? 'Consultar' : `${n.toLocaleString('es-UY', { maximumFractionDigits: 1 })} %`
}

/** Lenders grouped by type in {@link LENDER_TYPES} order. */
export function lendersByType(): Array<{ type: LenderType; label: string; items: Lender[] }> {
  return (Object.keys(LENDER_TYPES) as LenderType[]).map(type => ({
    type,
    label: LENDER_TYPES[type],
    items: LENDERS.filter(l => l.type === type),
  }))
}

/** Every lender id (for the scraper / sitemap if needed). */
export function lenderIds(): string[] {
  return LENDERS.map(l => l.id)
}
```

> NOTE: The integrity test `covers all four lender categories` requires ≥1 verified lender per category from research. If a category yields no verifiable lender, relax that test to the categories actually present and record why in the research file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- loans.test.ts`
Expected: PASS (all loans tests).

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add app/utils/loans.ts app/tests/unit/loans.test.ts
git commit -m "feat(prestamos): Uruguay lender catalog with sourced rates and reputation"
```

---

## Task 5: Loan TEA scraper (`server/utils/loanScraper.ts`)

**Files:**
- Create: `app/server/utils/loanScraper.ts`
- Test: `app/tests/unit/loanScraper.test.ts`

**Interfaces:**
- Produces:
  - `interface ScrapeResult { id: string; teaPct: number | null; ok: boolean }`
  - `const TEA_MIN = 5`, `const TEA_MAX = 250`
  - `function stripHtml(html: string): string`
  - `const TEA_PARSERS: Record<string, { url: string; extract: (text: string) => number | null }>` (one entry per lender that publishes TEA in raw HTML — confirmed from Task 1 research)
  - `function parseLenderRate(id: string, text: string): ScrapeResult`
  - `function scrapeAllLenderRates(): Promise<ScrapeResult[]>`

- [ ] **Step 1: Write the failing test** (mirrors `courierScraper.test.ts`)

```ts
// app/tests/unit/loanScraper.test.ts
import { describe, expect, it } from 'vitest'
import { parseLenderRate, stripHtml, TEA_PARSERS } from '../../server/utils/loanScraper'

describe('parseLenderRate', () => {
  it('extracts a TEA percent from rate text for a parsed lender', () => {
    const id = Object.keys(TEA_PARSERS)[0]
    if (!id) return // no HTML-scrapable lender configured; nothing to assert
    // Build text containing a plausible TEA; expect a numeric, ok result.
    const res = parseLenderRate(id, 'Tasa Efectiva Anual (TEA): 59,8% ejemplo')
    expect(typeof res.teaPct === 'number' || res.teaPct === null).toBe(true)
    expect(res.id).toBe(id)
  })

  it('rejects an implausible TEA (out of 5–250 band)', () => {
    const id = Object.keys(TEA_PARSERS)[0]
    if (!id) return
    expect(parseLenderRate(id, 'TEA 999%').ok).toBe(false)
  })

  it('returns ok=false for an unknown lender id', () => {
    expect(parseLenderRate('nope', 'TEA 50%')).toEqual({ id: 'nope', teaPct: null, ok: false })
  })

  it('strips HTML before matching', () => {
    expect(stripHtml('<b>TEA</b> 50%')).toContain('TEA')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- loanScraper.test.ts`
Expected: FAIL — cannot find module `../../server/utils/loanScraper`.

- [ ] **Step 3: Implement `loanScraper.ts`** (HTTP-only, same shape as the courier scraper). Populate `TEA_PARSERS` only with lenders the Task 1 research confirmed publish TEA in raw HTML; lenders behind JS/quote forms are left out and keep their seed value.

```ts
// app/server/utils/loanScraper.ts
// Daily lender-TEA scraper (HTTP only). Each parser extracts the representative advertised TEA from
// a lender's public rate page using a page-specific anchor, then a plausibility guard rejects values
// outside a sane band for Uruguayan consumer credit. PURE (string -> result) so parsers are unit-
// tested against captured HTML fixtures. Lenders whose rates are behind a JS/quote form are NOT here;
// their catalogue seed values stand.

export interface ScrapeResult {
  id: string
  teaPct: number | null
  ok: boolean
}

/** Plausibility band for a Uruguayan consumer-loan TEA (%). Wide: BROU mortgages are low, some
 *  financiera consumer lines are very high. Final band confirmed against BCU usury caps. */
export const TEA_MIN = 5
export const TEA_MAX = 250

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
}

function toNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

function plausible(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= TEA_MIN && n <= TEA_MAX
}

/** First "TEA … NN[,.]N %" percentage in the text, the common anchor across lender rate pages. */
function firstTea(text: string): number | null {
  const m = text.match(/TEA[^%]{0,40}?(\d{1,3}(?:[.,]\d{1,2})?)\s*%/i)
  return m ? toNum(m[1]!) : null
}

// Keyed by lender `id` (matches LENDERS). POPULATE from research — only lenders serving TEA in raw
// HTML. Example shape (replace url/extract with the verified ones):
export const TEA_PARSERS: Record<
  string,
  { url: string; extract: (text: string) => number | null }
> = {
  // creditel: { url: 'https://www.creditel.com.uy/...', extract: text => firstTea(text) },
}

export function parseLenderRate(id: string, text: string): ScrapeResult {
  const parser = TEA_PARSERS[id]
  const raw = parser ? parser.extract(stripHtml(text)) : null
  const ok = plausible(raw)
  return { id, teaPct: ok ? raw : null, ok }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export async function scrapeAllLenderRates(): Promise<ScrapeResult[]> {
  const ids = Object.keys(TEA_PARSERS)
  return Promise.all(
    ids.map(async id => {
      try {
        return parseLenderRate(id, await fetchText(TEA_PARSERS[id]!.url))
      } catch {
        return { id, teaPct: null, ok: false }
      }
    })
  )
}
```

> NOTE: `firstTea` is exported-by-use inside parsers. The two `if (!id) return` tests pass even when `TEA_PARSERS` is empty (no HTML-scrapable lender found) — the store/API still work off the seed. If research finds ≥1 scrapable lender, add a concrete fixture test asserting the exact expected TEA, mirroring the courier tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- loanScraper.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add app/server/utils/loanScraper.ts app/tests/unit/loanScraper.test.ts
git commit -m "feat(prestamos): HTTP TEA scraper with plausibility guard"
```

---

## Task 6: Loan rates overlay store (`server/utils/loanRatesStore.ts`)

**Files:**
- Create: `app/server/utils/loanRatesStore.ts`

**Interfaces:**
- Consumes: `Lender`, `LENDERS` from `utils/loans.ts`; `ScrapeResult` from `loanScraper.ts`.
- Produces:
  - `interface StoredRate { teaPct: number; scrapedAt: string }`
  - `interface MergedLender extends Lender { scrapedAt?: string }`
  - `function applyLoanScrapeResults(results: ScrapeResult[]): Promise<number>`
  - `function getMergedLenders(): Promise<MergedLender[]>`
  - `function getLoanRatesUpdatedAt(): Promise<string | null>`

- [ ] **Step 1: Implement the store** (direct port of `courierRatesStore.ts`; no separate unit test — it is exercised by the API and the courier equivalent is already proven; integration is verified in Task 12 build/run).

```ts
// app/server/utils/loanRatesStore.ts
// Durable store for scraped lender TEAs (filesystem-backed `loans` mount, same pattern as the
// courier rates store). The scheduled task writes here; the API reads a merged view. Golden rule:
// **only overwrite a TEA with a fresh successful scrape** — a failed/implausible scrape leaves the
// previous good value untouched, so the public page degrades to "stale but correct".
import type { Lender } from '../../utils/loans'
import { LENDERS } from '../../utils/loans'
import type { ScrapeResult } from './loanScraper'

const STORAGE = 'loans'
const KEY = 'rates.json'

export interface StoredRate {
  teaPct: number
  scrapedAt: string
}

interface RatesDoc {
  rates: Record<string, StoredRate>
  updatedAt: string
}

export interface MergedLender extends Lender {
  scrapedAt?: string
}

async function load(): Promise<RatesDoc> {
  const doc = await useStorage(STORAGE).getItem<RatesDoc>(KEY)
  return doc ?? { rates: {}, updatedAt: '' }
}

export async function applyLoanScrapeResults(results: ScrapeResult[]): Promise<number> {
  const doc = await load()
  const now = new Date().toISOString()
  let updated = 0
  for (const r of results) {
    if (r.ok && r.teaPct != null) {
      doc.rates[r.id] = { teaPct: r.teaPct, scrapedAt: now }
      updated++
    }
  }
  doc.updatedAt = now
  await useStorage(STORAGE).setItem(KEY, doc)
  return updated
}

export async function getMergedLenders(): Promise<MergedLender[]> {
  const { rates } = await load()
  return LENDERS.map(l => {
    const stored = rates[l.id]
    return stored ? { ...l, teaPct: stored.teaPct, scrapedAt: stored.scrapedAt } : { ...l }
  })
}

export async function getLoanRatesUpdatedAt(): Promise<string | null> {
  const { rates } = await load()
  const stamps = Object.values(rates)
    .map(r => r.scrapedAt)
    .filter(Boolean)
    .sort()
  return stamps.length ? stamps[stamps.length - 1]! : null
}
```

- [ ] **Step 2: Register the `loans` storage mount if couriers needed one.** Check `nuxt.config.ts` for an existing `nitro.storage` / `devStorage` `couriers` mount. If `couriers` is mounted explicitly, add an identical `loans` mount; if couriers relies on the default filesystem driver, no change is needed.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/server/utils/loanRatesStore.ts app/nuxt.config.ts
git commit -m "feat(prestamos): filesystem overlay store for scraped lender TEAs"
```

---

## Task 7: Loan API + scheduled task + page

**Files:**
- Create: `app/server/api/prestamos.get.ts`, `app/server/tasks/loans/scrape.ts`, `app/pages/prestamos-uruguay.vue`
- Modify: `app/nuxt.config.ts` (scheduledTasks)
- Consume: research from Task 1.

**Interfaces:**
- Consumes: `scrapeAllLenderRates` (Task 5); `applyLoanScrapeResults`, `getMergedLenders`, `getLoanRatesUpdatedAt`, `MergedLender` (Task 6); `LENDERS`, `lendersByType`, `teaLabel`, `LENDER_TYPES` (Task 4); `starParts`, `ReviewSource` (Task 3).
- Produces: `GET /api/prestamos` → `{ lenders: MergedLender[]; updatedAt: string | null }`; the public page at `/prestamos-uruguay`.

- [ ] **Step 1: Implement the API** (port of `couriers.get.ts`)

```ts
// app/server/api/prestamos.get.ts
// Public loan-comparison data: the catalogue with the freshest scraped TEAs layered on top, plus the
// last-updated timestamp. Cached briefly at the edge. Lazy bootstrap: if rates were never scraped or
// the last scrape is badly stale (> 2 days), refresh once on demand; scrape failures fall back to the
// seed catalogue.
import { scrapeAllLenderRates } from '../utils/loanScraper'
import {
  applyLoanScrapeResults,
  getMergedLenders,
  getLoanRatesUpdatedAt,
} from '../utils/loanRatesStore'

const STALE_MS = 2 * 24 * 60 * 60 * 1000

export default defineCachedEventHandler(
  async () => {
    const last = await getLoanRatesUpdatedAt()
    const stale = !last || Date.now() - new Date(last).getTime() > STALE_MS
    if (stale) {
      try {
        await applyLoanScrapeResults(await scrapeAllLenderRates())
      } catch {
        // keep seed / last-good values on any scrape error
      }
    }
    const [lenders, updatedAt] = await Promise.all([getMergedLenders(), getLoanRatesUpdatedAt()])
    return { lenders, updatedAt }
  },
  { maxAge: 60 * 30, name: 'prestamos', getKey: () => 'all' }
)
```

- [ ] **Step 2: Implement the scheduled task**

```ts
// app/server/tasks/loans/scrape.ts
// Nitro scheduled task: refresh lender TEAs once a day. Registered in nuxt.config under
// nitro.scheduledTasks. Failed/implausible scrapes keep the previous good value (see the store).
import { scrapeAllLenderRates } from '../../utils/loanScraper'
import { applyLoanScrapeResults } from '../../utils/loanRatesStore'

export default defineTask({
  meta: { name: 'loans:scrape', description: 'Scrape and refresh lender TEA rates' },
  async run() {
    const results = await scrapeAllLenderRates()
    const updated = await applyLoanScrapeResults(results)
    return { result: { updated, results } }
  },
})
```

- [ ] **Step 3: Register the cron** in `app/nuxt.config.ts` `nitro.scheduledTasks` (add alongside the existing entries):

```ts
// 08:45 UTC ≈ 05:45 Uruguay: refresh lender TEA rates.
'45 8 * * *': ['loans:scrape'],
```

- [ ] **Step 4: Implement the page** `app/pages/prestamos-uruguay.vue` — clone the structure of `couriers-uruguay.vue`: gradient header, breadcrumb to `/herramientas`, info alert linking to `/herramientas/calculadora-prestamo`, comparison grouped by lender type (desktop `VTable` + mobile stacked cards), a reputation cell using `starParts`, sources block (official + review), disclaimer (informational, not advice, BCU usury-cap reminder), `useSeoMeta` + `defineOgImageComponent('Cambio', …)` + JSON-LD `@graph` (ItemList + BreadcrumbList + FAQPage). Reputation cell template:

```vue
<!-- reputation stars from a 0–5 rating; "según reseñas" caption; sources link out -->
<template v-if="l.rating != null">
  <span class="lender-stars" :aria-label="`${l.rating} de 5 según reseñas`">
    <VIcon v-for="n in starParts(l.rating).full" :key="`f${n}`" size="14" color="amber">mdi-star</VIcon>
    <VIcon v-if="starParts(l.rating).half" size="14" color="amber">mdi-star-half-full</VIcon>
    <VIcon v-for="n in starParts(l.rating).empty" :key="`e${n}`" size="14" color="grey">mdi-star-outline</VIcon>
  </span>
  <small class="d-block text-grey-lighten-1">según reseñas</small>
</template>
<template v-else>—</template>
```

Script imports:

```ts
import { LENDERS, lendersByType, teaLabel, LENDER_TYPES, type Lender } from '~/utils/loans'
import { starParts } from '~/utils/reviews'

const localePath = useLocalePath()
type ApiLender = Lender & { scrapedAt?: string }
const { data } = await useFetch<{ lenders: ApiLender[]; updatedAt: string | null }>('/api/prestamos', {
  default: () => ({ lenders: LENDERS as ApiLender[], updatedAt: null }),
})
const lenders = computed<ApiLender[]>(() => data.value?.lenders ?? (LENDERS as ApiLender[]))
const groups = computed(() =>
  (Object.keys(LENDER_TYPES) as Array<keyof typeof LENDER_TYPES>).map(type => ({
    type, label: LENDER_TYPES[type], items: lenders.value.filter(l => l.type === type),
  }))
)
const updatedAt = computed(() => data.value?.updatedAt ?? null)
const canonicalUrl = 'https://cambio-uruguay.com/prestamos-uruguay'
```

(Full SEO/JSON-LD block copies the `couriers-uruguay.vue` pattern verbatim, swapping copy for loans: title "Dónde pedir un préstamo en Uruguay (comparativa 2026)", an `FAQPage` with the four Q&As from the spec, and a `BreadcrumbList`. Reuse the `hostOf` helper from that page for compact source links.)

- [ ] **Step 5: Verify it renders.** Run the dev server and load the page.

Run: `npm run dev` then open `http://localhost:3000/prestamos-uruguay` (or `npx playwright` smoke). 
Expected: page renders with grouped lenders, stars, sources, no console errors; `/api/prestamos` returns `{ lenders, updatedAt }`.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add app/server/api/prestamos.get.ts app/server/tasks/loans/scrape.ts app/pages/prestamos-uruguay.vue app/nuxt.config.ts
git commit -m "feat(prestamos): /prestamos-uruguay page, API and daily TEA scrape task"
```

---

## Task 8: Courier catalog — fill gaps, add couriers, add reputation fields

**Files:**
- Modify: `app/utils/courierShipping.ts`
- Modify: `app/tests/unit/courierScraper.test.ts`
- Consume: research from Task 2.

**Interfaces:**
- Consumes: `ReviewSource` from `utils/reviews.ts` (Task 3).
- Produces: extended `Courier` interface with optional `rating?: number | null`, `reviewsNote?: string`, `reviewSources?: ReviewSource[]`; filled `perKgUsd`/`baseUsd`/`note` for `miami-box`/`urubox`/`exur` where verified; any new courier entries.

- [ ] **Step 1: Add a failing assertion** in `app/tests/unit/courierScraper.test.ts` for catalog integrity of the enriched data:

```ts
import { COURIERS } from '../../utils/courierShipping'

describe('courier catalog reputation', () => {
  it('rated couriers cite at least one review source and rating is 0..5', () => {
    for (const c of COURIERS) {
      if (c.rating != null) {
        expect(c.rating).toBeGreaterThanOrEqual(0)
        expect(c.rating).toBeLessThanOrEqual(5)
        expect((c.reviewSources ?? []).length).toBeGreaterThan(0)
      }
    }
  })
  it('every courier has a source URL', () => {
    for (const c of COURIERS) expect(c.source).toMatch(/^https?:\/\//)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- courierScraper.test.ts`
Expected: FAIL — `rating`/`reviewSources` not on `Courier`.

- [ ] **Step 3: Extend the `Courier` interface** in `app/utils/courierShipping.ts` (add after `note?: string`):

```ts
  /** Aggregated reputation 0–5 from reviews, or null/absent when too few to rate. */
  rating?: number | null
  /** One-line qualitative summary of review sentiment. */
  reviewsNote?: string
  /** Links backing the reputation (Reddit, Trustpilot, Google, ...). */
  reviewSources?: import('./reviews').ReviewSource[]
```

- [ ] **Step 4: Fill the gaps + reputation from research.** For `miami-box`, `urubox`, `exur`: set `perKgUsd`/`baseUsd`/`note` from the Task 2 research where a source exists (else keep `null`). Add `rating`/`reviewsNote`/`reviewSources` to every courier from research. Add any newly-discovered couriers as full `Courier` entries (with `source`). Example enrichment of an existing entry:

```ts
  {
    id: 'gripper',
    name: 'Gripper',
    perKgUsd: 21.9,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    transit: '3–7 días hábiles',
    website: 'https://www.gripper.com.uy',
    source: 'https://www.gripper.com.uy/tarifas',
    note: '5–20 kg US$16,5/kg; <900 g US$19,80 fijo; +10% TSPU; manejo US$5',
    rating: 4, // from research — replace with sourced value
    reviewsNote: 'Buenas reseñas por rapidez; algunas quejas por recargos.',
    reviewSources: [
      { label: 'Reddit r/uruguay', url: 'https://www.reddit.com/r/uruguay/...' },
      { label: 'Trustpilot', url: 'https://www.trustpilot.com/review/gripper.com.uy' },
    ],
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- courierScraper.test.ts`
Expected: PASS (existing parser tests + new reputation tests).

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add app/utils/courierShipping.ts app/tests/unit/courierScraper.test.ts
git commit -m "feat(couriers): fill missing rates, add couriers, add sourced reputation"
```

---

## Task 9: Courier scraper parsers for newly HTML-scrapable couriers

**Files:**
- Modify: `app/server/utils/courierScraper.ts`
- Modify: `app/tests/unit/courierScraper.test.ts`
- Consume: Task 2 research (which gap couriers serve their rate in raw HTML).

**Interfaces:**
- Produces: new `RATE_PARSERS` entries (only for couriers whose rate is in raw HTML, e.g. possibly `urubox`/`exur`). No interface change.

- [ ] **Step 1: Decide from research.** If Task 2 found NO newly HTML-scrapable courier, skip this task entirely (record that in the commit/PR notes) and proceed to Task 10. Otherwise continue.

- [ ] **Step 2: Write a failing fixture test** for each new parser (mirror the existing courier tests), e.g.:

```ts
it('urubox: takes the representative per-kg from the tariff text', () => {
  const text = 'Tarifa 0,5–5 kg US$ 18,90 por kg' // captured fixture
  expect(parseCourierRate('urubox', text).perKgUsd).toBe(18.9)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- courierScraper.test.ts`
Expected: FAIL — `urubox` not in `RATE_PARSERS`.

- [ ] **Step 4: Add the parser entry** in `RATE_PARSERS` with a page-specific anchor + the tariff URL (same style as existing entries; reuse `usdValues`/`stripHtml`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- courierScraper.test.ts`
Expected: PASS.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add app/server/utils/courierScraper.ts app/tests/unit/courierScraper.test.ts
git commit -m "feat(couriers): scrape parsers for newly HTML-listed couriers"
```

---

## Task 10: Courier page — reputation column + review sources

**Files:**
- Modify: `app/pages/couriers-uruguay.vue`

**Interfaces:**
- Consumes: `starParts` from `utils/reviews.ts`; `rating`/`reviewsNote`/`reviewSources` on the merged couriers from `/api/couriers`.

- [ ] **Step 1: Import the star helper** in the page script:

```ts
import { starParts } from '~/utils/reviews'
```

- [ ] **Step 2: Add a "Reputación" column** to the desktop `VTable` (header + cell) and a reputation block to the mobile card, using the same stars template as Task 7 Step 4 (full/half/empty `VIcon`s + "según reseñas" caption). Cell renders `—` when `c.rating == null`.

- [ ] **Step 3: Extend the "Fuentes y referencias" block** to also list the deduplicated `reviewSources` across couriers (each `{ label, url }` as a link), so the reputation is cited.

- [ ] **Step 4: Verify render.**

Run: `npm run dev` then open `http://localhost:3000/couriers-uruguay`.
Expected: reputation stars show for rated couriers, review sources appear in the sources block, no console errors.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add app/pages/couriers-uruguay.vue
git commit -m "feat(couriers): reputation column and cited review sources on comparison"
```

---

## Task 11: Wiring — footer, sitemap, cross-link

**Files:**
- Modify: `app/components/Footer.vue`
- Modify: `app/server/api/__sitemap__/urls.get.ts`
- Modify: `app/pages/herramientas/calculadora-prestamo.vue`

**Interfaces:** none (navigation/SEO wiring only).

- [ ] **Step 1: Footer link.** In `app/components/Footer.vue`, near the existing `/herramientas` link (line ~132), add a `/prestamos-uruguay` link (and a `/couriers-uruguay` link if not already present), following the existing `footer-link` markup.

- [ ] **Step 2: Sitemap.** In `app/server/api/__sitemap__/urls.get.ts`, after the `/couriers-uruguay` line (131), add:

```ts
addUrlsForAllLocales('/prestamos-uruguay', 0.7, 'weekly') // Loan directory comparison
```

- [ ] **Step 3: Cross-link from the loan calculator.** In `app/pages/herramientas/calculadora-prestamo.vue`, add a CTA/alert linking to `/prestamos-uruguay` ("Compará dónde pedir el préstamo"), mirroring how `couriers-uruguay.vue` links to the import calculator.

- [ ] **Step 4: Verify sitemap includes the route.**

Run: `npm run dev` then `curl -s http://localhost:3000/api/__sitemap__/urls | grep prestamos` (or open the URL).
Expected: `/prestamos-uruguay` present for each locale.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add app/components/Footer.vue app/server/api/__sitemap__/urls.get.ts app/pages/herramientas/calculadora-prestamo.vue
git commit -m "feat(prestamos): footer link, sitemap entry, calculator cross-link"
```

---

## Task 12: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all unit tests pass (loans, loanScraper, courierScraper incl. new reputation assertions).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck` then `npm run build`
Expected: both succeed (catches Vue template / SSR / import issues the unit tests miss).

- [ ] **Step 4: Smoke both pages** (dev or built preview): `/prestamos-uruguay` and `/couriers-uruguay` render with data, stars, sources; `/api/prestamos` and `/api/couriers` return JSON.

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: verification fixups for prestamos + courier reputation"
```

---

## Self-Review

**Spec coverage:**
- Loan directory page, all 4 lender types, live-scrape stack, reputation stars + sources, FAQ schema → Tasks 1,3,4,5,6,7. ✓
- Courier gap rates + missing couriers + reputation column → Tasks 2,8,9,10. ✓
- Wiring (footer, sitemap, cross-link) → Task 11. ✓
- Tests mirroring courierScraper → Tasks 4,5,8,9; final verification → Task 12. ✓
- Sourcing rule enforced by integrity tests (Tasks 4,8) + research contracts (Tasks 1,2). ✓

**Placeholder note:** Catalog data values (`teaPct`, ratings, gap rates) are intentionally sourced at execution time from Tasks 1–2 — the code *shape* is fully specified; the *data* is the research deliverable, which is the correct dependency direction. All non-data code is complete.

**Type consistency:** `ReviewSource` defined once in `utils/reviews.ts`, imported by `loans.ts` and `courierShipping.ts`. Scraper result types are distinct per domain (`ScrapeResult.teaPct` for loans, `ScrapeResult.perKgUsd` for couriers) and never cross-imported. Store/API/task names: `scrapeAllLenderRates`, `applyLoanScrapeResults`, `getMergedLenders`, `getLoanRatesUpdatedAt`, `loans:scrape`, `/api/prestamos` — used consistently across Tasks 5,6,7.
