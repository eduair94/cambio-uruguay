# Prestamos Daily Gemini Rate Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing daily `loans:scrape` Nitro task refresh TEA rates for all 23 lenders in the prestamos catalogue, not just the 3 with regex parsers, by falling back to a Gemini `google_search`-grounded lookup (validated against a plausibility band and a domain-matched citation) for every other lender, and persist a daily history per lender.

**Architecture:** A new `loanGeminiRate.ts` does one grounded Gemini call per lender needing it and returns `null` unless the answer is both in-band and cited from that lender's own domain. A new `loanRateRefresh.ts` orchestrates: try the existing regex parser first, fall back to Gemini, across every lender id. `loanRatesStore.ts` gains a bounded daily `history` map alongside its existing latest-value fields. The Nitro task and the lazy on-demand API route both switch from the old parser-only scraper to the new orchestrator — same call shape, so both callers change in one line each.

**Tech Stack:** Nuxt 3 / Nitro server utils, TypeScript, Vitest, Gemini `generateContent` REST API with `google_search` grounding (same endpoint/pattern as `app/server/utils/geminiNews.ts`).

## Global Constraints

- Never regress a stored TEA on a failed/rejected scrape — the store only overwrites on a successful, validated result (existing rule in `loanRatesStore.ts`, must still hold).
- Gemini result requires BOTH: value in `TEA_MIN`–`TEA_MAX` (5–250) AND a grounding citation whose hostname matches the lender's `website` or `source` hostname.
- Any Gemini network/parse/missing-API-key failure returns `null` from `loanGeminiRate.ts` — never throws past that boundary (mirrors `geminiNews.ts`).
- Regex-parser lenders (`oca`, `pronto`, `cash`) are tried first; Gemini is only consulted when there's no parser or the parser attempt didn't produce an `ok` result.
- History stores one entry per lender per UTC calendar day; a same-day re-run overwrites that day's entry rather than duplicating.
- Do not change the public shape of `GET /api/prestamos` (`{ lenders, updatedAt }`) or `MergedLender`.

---

### Task 1: Gemini per-lender rate lookup with domain-matched validation

**Files:**
- Modify: `app/server/utils/loanScraper.ts` (export `toNum`, no behavior change)
- Create: `app/server/utils/loanGeminiRate.ts`
- Test: `app/tests/unit/loanGeminiRate.test.ts`

**Interfaces:**
- Consumes: `TEA_MIN`, `TEA_MAX`, `toNum` from `./loanScraper` (`toNum(s: string): number` already defined at `loanScraper.ts:34-38`, just needs an `export` added); `extractGroundedHeadlines(chunks, supports, limit?)` from `../../utils/geminiGrounding` (existing, returns `{ title: string; source: string; link: string }[]`, `source` already has `www.` stripped — see `app/utils/geminiGrounding.ts`); `useRuntimeConfig()` / `$fetch` Nitro auto-imports (same as `geminiNews.ts`).
- Produces: `GeminiRateResult { teaPct: number; sourceUrl: string }` and `fetchLenderRateFromGemini(lender: { id: string; name: string; website: string; source: string }): Promise<GeminiRateResult | null>` — Task 2 calls this per lender.

- [ ] **Step 1: Export `toNum` from `loanScraper.ts`**

In `app/server/utils/loanScraper.ts`, change:

```ts
function toNum(s: string): number {
```

to:

```ts
export function toNum(s: string): number {
```

- [ ] **Step 2: Write the failing tests for `loanGeminiRate.ts`**

Create `app/tests/unit/loanGeminiRate.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const $fetch = vi.fn()
const useRuntimeConfig = vi.fn()
vi.stubGlobal('$fetch', $fetch)
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)

const LENDER = {
  id: 'itau',
  name: 'Itaú Uruguay',
  website: 'https://www.itau.com.uy',
  source: 'https://www.itau.com.uy/inst/preAprobados.html',
}

const WITH_KEY = { geminiApiKey: 'test-key' }

function geminiResponse(text: string, chunks: Array<{ uri: string; title: string }> = []) {
  return {
    candidates: [
      {
        content: { parts: [{ text }] },
        groundingMetadata: {
          groundingChunks: chunks.map(c => ({ web: { uri: c.uri, title: c.title } })),
          groundingSupports:
            chunks.length > 0
              ? [
                  {
                    segment: { endIndex: text.length, text },
                    groundingChunkIndices: chunks.map((_, i) => i),
                  },
                ]
              : [],
        },
      },
    ],
  }
}

beforeEach(() => {
  $fetch.mockReset()
  useRuntimeConfig.mockReset()
})

afterEach(() => {
  vi.resetModules()
})

describe('fetchLenderRateFromGemini', () => {
  it('returns null when no Gemini API key is configured', async () => {
    useRuntimeConfig.mockReturnValue({ geminiApiKey: '' })
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
    expect($fetch).not.toHaveBeenCalled()
  })

  it('returns the TEA when grounded by a citation matching the lender\'s own domain', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(
      geminiResponse('TEA: 36%', [{ uri: 'https://redirect.example/AAA', title: 'www.itau.com.uy' }])
    )
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toEqual({
      teaPct: 36,
      sourceUrl: 'https://redirect.example/AAA',
    })
  })

  it('rejects when the only citation is off-domain', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(
      geminiResponse('TEA: 36%', [{ uri: 'https://redirect.example/BBB', title: 'otrapagina.com' }])
    )
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('rejects an ungrounded answer (no citations at all)', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(geminiResponse('TEA: 36%', []))
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('rejects an implausible TEA even when grounded on-domain', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(
      geminiResponse('TEA: 999%', [{ uri: 'https://redirect.example/CCC', title: 'itau.com.uy' }])
    )
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('returns null for the "not found" sentinel reply', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(geminiResponse('TEA: NO ENCONTRADO', []))
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('returns null when the Gemini request throws', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockRejectedValueOnce(new Error('502 Bad Gateway'))
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/loanGeminiRate.test.ts`
Expected: FAIL — `Cannot find module '../../server/utils/loanGeminiRate'`

- [ ] **Step 4: Implement `loanGeminiRate.ts`**

Create `app/server/utils/loanGeminiRate.ts`:

```ts
// Daily Gemini-grounded TEA lookup for lenders with no regex parser (loanScraper.ts only covers
// oca/pronto/cash). Same endpoint/pattern as geminiNews.ts: google_search grounding, graceful null
// on any failure. Additionally requires the grounding citation's hostname to match the lender's own
// domain, so an unrelated page's rate can never be attributed to this lender.
import { extractGroundedHeadlines } from '../../utils/geminiGrounding'
import { TEA_MAX, TEA_MIN, toNum } from './loanScraper'

export interface GeminiRateResult {
  teaPct: number
  sourceUrl: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
      groundingSupports?: Array<{
        segment: { text: string; startIndex?: number; endIndex: number }
        groundingChunkIndices: number[]
      }>
    }
  }>
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function buildPrompt(lender: { name: string; website: string }): string {
  return (
    `Buscá la Tasa Efectiva Anual (TEA) actual publicada para un préstamo personal/de consumo de ` +
    `"${lender.name}" en Uruguay (sitio ${lender.website}). ` +
    `Respondé en una sola línea, exactamente en este formato: "TEA: <numero>%". ` +
    `Usá solo un número que hayas encontrado en una búsqueda real y citable, en el propio sitio del ` +
    `prestamista o una fuente que lo confirme — no inventes. ` +
    `Si no encontrás una TEA publicada y verificable, respondé exactamente "TEA: NO ENCONTRADO".`
  )
}

/**
 * Grounded Gemini lookup for one lender's advertised TEA. Returns null on missing config, any
 * network/parse failure, an implausible value, or a citation that doesn't match the lender's own
 * domain — the caller (loanRateRefresh.ts) keeps the prior stored value in every null case.
 */
export async function fetchLenderRateFromGemini(
  lender: { id: string; name: string; website: string; source: string }
): Promise<GeminiRateResult | null> {
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return null

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [{ parts: [{ text: buildPrompt(lender) }] }],
          tools: [{ google_search: {} }],
        },
        timeout: 30000,
      }
    )

    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim()
    const match = text.match(/TEA:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/i)
    if (!match) return null

    const teaPct = toNum(match[1]!)
    if (!Number.isFinite(teaPct) || teaPct < TEA_MIN || teaPct > TEA_MAX) return null

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const supports = candidate?.groundingMetadata?.groundingSupports ?? []
    if (chunks.length === 0) return null
    const headlines = extractGroundedHeadlines(chunks, supports, chunks.length)

    const expectedHosts = [hostnameOf(lender.website), hostnameOf(lender.source)].filter(Boolean)
    const cited = headlines.find(h => expectedHosts.includes(h.source.toLowerCase()))
    if (!cited) return null

    return { teaPct, sourceUrl: cited.link }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/loanGeminiRate.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add app/server/utils/loanScraper.ts app/server/utils/loanGeminiRate.ts app/tests/unit/loanGeminiRate.test.ts
git commit -m "feat(prestamos): add Gemini-grounded, domain-validated lender TEA lookup"
```

---

### Task 2: Fallback-chain orchestrator across all lenders

**Files:**
- Create: `app/server/utils/loanRateRefresh.ts`
- Test: `app/tests/unit/loanRateRefresh.test.ts`

**Interfaces:**
- Consumes: `scrapeAllLenderRates(): Promise<ScrapeResult[]>` and `TEA_PARSERS: Record<string, {url, extract}>` from `./loanScraper` (existing, unchanged); `fetchLenderRateFromGemini` from `./loanGeminiRate` (Task 1); `LENDERS`, `lenderIds()` from `../../utils/loans` (existing).
- Produces: `LenderRateResult { id: string; teaPct: number | null; ok: boolean; method: 'regex' | 'gemini'; sourceUrl?: string }` and `refreshAllLenderRates(): Promise<LenderRateResult[]>` — Task 3 (`loanRatesStore.ts`) and Task 4 (task/API wiring) consume both.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/loanRateRefresh.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/loanScraper', async importOriginal => {
  const actual = await importOriginal<typeof import('../../server/utils/loanScraper')>()
  return { ...actual, scrapeAllLenderRates: vi.fn() }
})
vi.mock('../../server/utils/loanGeminiRate', () => ({
  fetchLenderRateFromGemini: vi.fn(),
}))

import { scrapeAllLenderRates, TEA_PARSERS } from '../../server/utils/loanScraper'
import { fetchLenderRateFromGemini } from '../../server/utils/loanGeminiRate'
import { refreshAllLenderRates } from '../../server/utils/loanRateRefresh'
import { lenderIds } from '../../utils/loans'

const mockScrape = vi.mocked(scrapeAllLenderRates)
const mockGemini = vi.mocked(fetchLenderRateFromGemini)

beforeEach(() => {
  mockScrape.mockReset()
  mockGemini.mockReset()
})

describe('refreshAllLenderRates', () => {
  it('uses the regex result and never calls Gemini when the parser succeeds', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue(null)

    const results = await refreshAllLenderRates()

    const oca = results.find(r => r.id === 'oca')
    expect(oca).toEqual({ id: 'oca', teaPct: 39, ok: true, method: 'regex', sourceUrl: TEA_PARSERS.oca!.url })
    expect(mockGemini).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'oca' }))
  })

  it('falls back to Gemini when the parser fails', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: null, ok: false },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockImplementation(async lender =>
      lender.id === 'oca' ? { teaPct: 40, sourceUrl: 'https://redirect/oca' } : null
    )

    const results = await refreshAllLenderRates()

    expect(mockGemini).toHaveBeenCalledWith(expect.objectContaining({ id: 'oca' }))
    expect(results.find(r => r.id === 'oca')).toEqual({
      id: 'oca',
      teaPct: 40,
      ok: true,
      method: 'gemini',
      sourceUrl: 'https://redirect/oca',
    })
  })

  it('calls Gemini for every lender with no regex parser', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue({ teaPct: 36, sourceUrl: 'https://redirect/x' })

    await refreshAllLenderRates()

    const nonParserIds = lenderIds().filter(id => !(id in TEA_PARSERS))
    expect(nonParserIds.length).toBeGreaterThan(0)
    for (const id of nonParserIds) {
      expect(mockGemini).toHaveBeenCalledWith(expect.objectContaining({ id }))
    }
  })

  it('keeps ok:false when both the parser and Gemini fail/are absent', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue(null)

    const results = await refreshAllLenderRates()

    const itau = results.find(r => r.id === 'itau')
    expect(itau).toEqual({ id: 'itau', teaPct: null, ok: false, method: 'gemini' })
  })

  it('covers every lender id exactly once', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue(null)

    const results = await refreshAllLenderRates()

    expect(results.map(r => r.id).sort()).toEqual([...lenderIds()].sort())
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/loanRateRefresh.test.ts`
Expected: FAIL — `Cannot find module '../../server/utils/loanRateRefresh'`

- [ ] **Step 3: Implement `loanRateRefresh.ts`**

Create `app/server/utils/loanRateRefresh.ts`:

```ts
// Daily fallback chain across every lender: the cheap/precise regex parser first (oca/pronto/cash),
// then a Gemini-grounded lookup for everyone else (or when the parser attempt didn't succeed). Both
// paths degrade to ok:false rather than throwing — loanRatesStore.ts leaves the prior value untouched.
import { LENDERS, lenderIds } from '../../utils/loans'
import { fetchLenderRateFromGemini } from './loanGeminiRate'
import { scrapeAllLenderRates, TEA_PARSERS } from './loanScraper'

export interface LenderRateResult {
  id: string
  teaPct: number | null
  ok: boolean
  method: 'regex' | 'gemini'
  sourceUrl?: string
}

export async function refreshAllLenderRates(): Promise<LenderRateResult[]> {
  const regexResults = await scrapeAllLenderRates()
  const regexById = new Map(regexResults.map(r => [r.id, r]))
  const lenderById = new Map(LENDERS.map(l => [l.id, l]))

  return Promise.all(
    lenderIds().map(async (id): Promise<LenderRateResult> => {
      const regex = regexById.get(id)
      if (regex?.ok && regex.teaPct != null) {
        return { id, teaPct: regex.teaPct, ok: true, method: 'regex', sourceUrl: TEA_PARSERS[id]?.url }
      }

      const lender = lenderById.get(id)!
      const gemini = await fetchLenderRateFromGemini(lender)
      if (gemini) {
        return { id, teaPct: gemini.teaPct, ok: true, method: 'gemini', sourceUrl: gemini.sourceUrl }
      }

      return { id, teaPct: null, ok: false, method: id in TEA_PARSERS ? 'regex' : 'gemini' }
    })
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/loanRateRefresh.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/loanRateRefresh.ts app/tests/unit/loanRateRefresh.test.ts
git commit -m "feat(prestamos): orchestrate regex-then-Gemini rate refresh across all lenders"
```

---

### Task 3: Daily history in the rates store

**Files:**
- Modify: `app/server/utils/loanRatesStore.ts`
- Test: `app/tests/unit/loanRatesStore.test.ts`

**Interfaces:**
- Consumes: `LenderRateResult` from `./loanRateRefresh` (Task 2) — `applyLoanScrapeResults`'s parameter type widens from `ScrapeResult[]` to `LenderRateResult[]` (a superset: same `id`/`teaPct`/`ok`, plus `method`/`sourceUrl`).
- Produces: `HistoryEntry { date: string; teaPct: number; source?: string; method: 'regex' | 'gemini' }`; `RatesDoc` gains `history: Record<string, HistoryEntry[]>`. `getMergedLenders()` and `getLoanRatesUpdatedAt()` keep their existing signatures — Task 4's callers are unaffected.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/loanRatesStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LenderRateResult } from '../../server/utils/loanRateRefresh'

class FakeStorage {
  private data = new Map<string, unknown>()
  async getItem<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null
  }
  async setItem(key: string, value: unknown): Promise<void> {
    this.data.set(key, value)
  }
}

const fakeStorage = new FakeStorage()
const useStorage = vi.fn(() => fakeStorage)
vi.stubGlobal('useStorage', useStorage)

beforeEach(async () => {
  // reset the backing map between tests
  ;(fakeStorage as unknown as { data: Map<string, unknown> }).data = new Map()
  vi.resetModules()
})

function result(over: Partial<LenderRateResult> & Pick<LenderRateResult, 'id'>): LenderRateResult {
  return { teaPct: null, ok: false, method: 'regex', ...over }
}

describe('applyLoanScrapeResults', () => {
  it('stores the latest TEA and a history entry for the day on a successful scrape', async () => {
    const { applyLoanScrapeResults } = await import('../../server/utils/loanRatesStore')
    const updated = await applyLoanScrapeResults([
      result({ id: 'oca', teaPct: 39, ok: true, method: 'regex', sourceUrl: 'https://oca.uy/prestamos/' }),
    ])
    expect(updated).toBe(1)

    const doc = await fakeStorage.getItem<{
      rates: Record<string, { teaPct: number; scrapedAt: string }>
      history: Record<string, Array<{ date: string; teaPct: number; source?: string; method: string }>>
    }>('rates.json')
    expect(doc!.rates.oca!.teaPct).toBe(39)
    expect(doc!.history.oca).toHaveLength(1)
    expect(doc!.history.oca![0]).toMatchObject({ teaPct: 39, method: 'regex', source: 'https://oca.uy/prestamos/' })
  })

  it('does not touch the stored value or history on a failed result', async () => {
    const { applyLoanScrapeResults } = await import('../../server/utils/loanRatesStore')
    await applyLoanScrapeResults([result({ id: 'oca', teaPct: 39, ok: true, method: 'regex' })])
    const updated = await applyLoanScrapeResults([result({ id: 'oca', teaPct: null, ok: false, method: 'regex' })])
    expect(updated).toBe(0)

    const doc = await fakeStorage.getItem<{
      rates: Record<string, { teaPct: number }>
      history: Record<string, unknown[]>
    }>('rates.json')
    expect(doc!.rates.oca!.teaPct).toBe(39)
    expect(doc!.history.oca).toHaveLength(1)
  })

  it('overwrites, rather than duplicates, a same-day history entry on re-run', async () => {
    const { applyLoanScrapeResults } = await import('../../server/utils/loanRatesStore')
    await applyLoanScrapeResults([result({ id: 'oca', teaPct: 39, ok: true, method: 'regex' })])
    await applyLoanScrapeResults([result({ id: 'oca', teaPct: 40, ok: true, method: 'regex' })])

    const doc = await fakeStorage.getItem<{
      history: Record<string, Array<{ teaPct: number }>>
    }>('rates.json')
    expect(doc!.history.oca).toHaveLength(1)
    expect(doc!.history.oca![0]!.teaPct).toBe(40)
  })

  it('tolerates a pre-existing doc with no history key (migration)', async () => {
    await fakeStorage.setItem('rates.json', {
      rates: { oca: { teaPct: 39, scrapedAt: '2026-01-01T00:00:00.000Z' } },
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const { applyLoanScrapeResults, getMergedLenders } = await import('../../server/utils/loanRatesStore')
    await applyLoanScrapeResults([result({ id: 'pronto', teaPct: 49, ok: true, method: 'regex' })])

    const doc = await fakeStorage.getItem<{ history: Record<string, unknown[]> }>('rates.json')
    expect(doc!.history.pronto).toHaveLength(1)
    const lenders = await getMergedLenders()
    expect(lenders.find(l => l.id === 'oca')!.teaPct).toBe(39)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/loanRatesStore.test.ts`
Expected: FAIL — history assertions fail (`doc!.history` is `undefined`), since `RatesDoc` has no `history` field yet.

- [ ] **Step 3: Implement the history extension**

Modify `app/server/utils/loanRatesStore.ts` — replace its full contents:

```ts
// Durable store for scraped lender TEAs (filesystem-backed `loans` mount, same pattern as the
// courier rates store). The scheduled task writes here; the API reads a merged view. Golden rule:
// **only overwrite a TEA with a fresh successful scrape** — a failed/implausible scrape leaves the
// previous good value untouched, so the public page degrades to "stale but correct". `history` keeps
// one entry per lender per UTC calendar day (a same-day re-run overwrites that day's entry).
import type { Lender } from '../../utils/loans'
import { LENDERS } from '../../utils/loans'
import type { LenderRateResult } from './loanRateRefresh'

const STORAGE = 'loans'
const KEY = 'rates.json'

export interface StoredRate {
  teaPct: number
  scrapedAt: string
}

export interface HistoryEntry {
  date: string
  teaPct: number
  source?: string
  method: 'regex' | 'gemini'
}

interface RatesDoc {
  rates: Record<string, StoredRate>
  history: Record<string, HistoryEntry[]>
  updatedAt: string
}

export interface MergedLender extends Lender {
  scrapedAt?: string
}

async function load(): Promise<RatesDoc> {
  const doc = await useStorage(STORAGE).getItem<Partial<RatesDoc>>(KEY)
  return {
    rates: doc?.rates ?? {},
    history: doc?.history ?? {},
    updatedAt: doc?.updatedAt ?? '',
  }
}

export async function applyLoanScrapeResults(results: LenderRateResult[]): Promise<number> {
  const doc = await load()
  const now = new Date()
  const iso = now.toISOString()
  const day = iso.slice(0, 10)
  let updated = 0
  for (const r of results) {
    if (r.ok && r.teaPct != null) {
      doc.rates[r.id] = { teaPct: r.teaPct, scrapedAt: iso }
      const priorHistory = (doc.history[r.id] ?? []).filter(h => h.date !== day)
      doc.history[r.id] = [
        ...priorHistory,
        { date: day, teaPct: r.teaPct, source: r.sourceUrl, method: r.method },
      ]
      updated++
    }
  }
  doc.updatedAt = iso
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/loanRatesStore.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/loanRatesStore.ts app/tests/unit/loanRatesStore.test.ts
git commit -m "feat(prestamos): persist daily per-lender TEA history in the rates store"
```

---

### Task 4: Wire the daily task and the lazy API route to the new orchestrator

**Files:**
- Modify: `app/server/tasks/loans/scrape.ts`
- Modify: `app/server/api/prestamos.get.ts`

**Interfaces:**
- Consumes: `refreshAllLenderRates()` from `../../utils/loanRateRefresh` (Task 2); `applyLoanScrapeResults` from `../../utils/loanRatesStore` (Task 3, now accepts `LenderRateResult[]`).
- Produces: nothing new — this task only swaps the data source both existing callers use, so `GET /api/prestamos`'s response shape (`{ lenders, updatedAt }`) is unchanged.

- [ ] **Step 1: Update the scheduled task**

Modify `app/server/tasks/loans/scrape.ts` to its full new contents:

```ts
// Nitro scheduled task: refresh lender TEAs once a day. Registered in nuxt.config under
// nitro.scheduledTasks. Failed/implausible scrapes keep the previous good value (see the store).
import { refreshAllLenderRates } from '../../utils/loanRateRefresh'
import { applyLoanScrapeResults } from '../../utils/loanRatesStore'

export default defineTask({
  meta: { name: 'loans:scrape', description: 'Scrape and refresh lender TEA rates' },
  async run() {
    const results = await refreshAllLenderRates()
    const updated = await applyLoanScrapeResults(results)
    return { result: { updated, results } }
  },
})
```

- [ ] **Step 2: Update the lazy on-demand API route**

Modify `app/server/api/prestamos.get.ts` to its full new contents:

```ts
// Public loan-comparison data: the catalogue with the freshest scraped TEAs layered on top, plus the
// last-updated timestamp. Cached briefly at the edge. Lazy bootstrap: if rates were never scraped or
// the last scrape is badly stale (> 2 days), refresh once on demand; scrape failures fall back to the
// seed catalogue.
import { refreshAllLenderRates } from '../utils/loanRateRefresh'
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
        await applyLoanScrapeResults(await refreshAllLenderRates())
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

- [ ] **Step 3: Run the full unit test suite**

Run: `cd app && npx vitest run tests/unit/loanScraper.test.ts tests/unit/loanGeminiRate.test.ts tests/unit/loanRateRefresh.test.ts tests/unit/loanRatesStore.test.ts`
Expected: PASS (all tests across all four files — confirms `loanScraper.ts`'s existing 9 tests are untouched by the `toNum` export, and the new files are all green together)

- [ ] **Step 4: Run lint** (per project note: `npm run typecheck` is broken/unusable — use lint instead)

Run: `cd app && npm run lint`
Expected: no new errors in the touched files

- [ ] **Step 5: Commit**

```bash
git add app/server/tasks/loans/scrape.ts app/server/api/prestamos.get.ts
git commit -m "feat(prestamos): use the regex-then-Gemini refresh in the daily task and API route"
```
