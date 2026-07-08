# Gemini-Grounded Auto News Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the daily move-explanation cron auto-fetch real, cited news for USD/EUR/ARS notable-move days using Gemini's Google Search grounding, replacing the current attribution-only narrative + USD-only archived-feed headlines with real grounded citations when available, falling back to today's existing behavior when not.

**Architecture:** A new pure parser (`app/utils/geminiGrounding.ts`) turns a raw Gemini grounding response into honest `{title, source, link}` headlines. A new server util (`app/server/utils/geminiNews.ts`) calls the verified Gemini `generateContent` endpoint with the `google_search` tool and uses the parser. `recordTodayExplanation` (`app/server/utils/moveExplanation.ts`) tries this first and falls back to its current attribution-only path on `null`.

**Tech Stack:** TypeScript, Nuxt 4 server routes, Mongoose, vitest, Gemini REST API (`gemini-2.5-flash` model, confirmed live during design against the provided key).

## Global Constraints

- Any new server secret/config MUST go through `nuxt.config.ts`'s `runtimeConfig` block, read via `useRuntimeConfig()` — never raw `process.env` in `server/**` code (this codebase bakes secrets at VPS build time; a bare `pm2 reload` does not pick up a new raw env var — verified the hard way in an earlier phase).
- Pure, framework-agnostic logic goes in `app/utils/**` and gets a real vitest unit test. Network/DB-touching "glue" goes in `app/server/utils/**` and is verified live, not unit-tested — matches this repo's established split (e.g. `attributeMove` vs `chatCompletion`).
- The verified Gemini call shape (do not deviate without re-verifying live):
  `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}`,
  body `{"contents":[{"parts":[{"text": PROMPT}]}], "tools":[{"google_search":{}}]}`.
- `groundingChunks[i].web.uri` is a real, working Google-redirect link to the actual article — not the raw article URL, but real and clickable. `groundingChunks[i].web.title` is the bare domain, NOT the article's headline. Real "headline-ish" text must come from `groundingSupports[].segment.text` (see Task 1).
- The manual `/api/analysis/backfill` endpoint is untouched — out of scope.
- No retry/backoff, no caching layer, no new admin UI — this fires at most 3x/day, only on notable-move days (~12-15x/year per currency historically).

---

### Task 1: Pure Gemini-grounding parser

**Files:**
- Create: `app/utils/geminiGrounding.ts`
- Test: `app/tests/unit/geminiGrounding.test.ts`

**Interfaces:**
- Produces:
  - `interface GroundingChunk { web?: { uri?: string; title?: string } }`
  - `interface GroundingSupport { segment: { text: string; startIndex?: number; endIndex: number }; groundingChunkIndices: number[] }`
  - `interface GroundedHeadline { title: string; source: string; link: string }`
  - `function extractGroundedHeadlines(chunks: GroundingChunk[], supports: GroundingSupport[], limit?: number): GroundedHeadline[]` (default `limit = 3`)
  - `function isNoNewsText(text: string): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// app/tests/unit/geminiGrounding.test.ts
import { describe, it, expect } from 'vitest'
import { extractGroundedHeadlines, isNoNewsText } from '../../utils/geminiGrounding'

// Fixture shape captured from a real live smoke-test call during design
// (2026-01-26 USD BCU rate-cut query) — see docs/superpowers/specs/2026-07-08-gemini-news-grounding-design.md
const REAL_CHUNKS = [
  { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA', title: 'ccea.com.uy' } },
  { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/BBB', title: 'montevideo.com.uy' } },
  { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/CCC', title: 'blasinayasociados.com' } },
  { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/DDD', title: 'www.busqueda.com.uy' } },
  { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/EEE', title: 'enperspectiva.uy' } },
]

const REAL_SUPPORTS = [
  {
    segment: {
      endIndex: 152,
      text: 'El 26 de enero de 2026, el Banco Central del Uruguay (BCU) redujo la Tasa de Política Monetaria (TPM) en 100 puntos básicos, estableciéndola en 6,5%.',
    },
    groundingChunkIndices: [0, 1, 2, 3],
  },
  {
    segment: {
      startIndex: 153,
      endIndex: 502,
      text: 'Esta medida, tomada en una reunión adelantada del Comité de Política Monetaria (COPOM), buscó contrarrestar el desalineamiento de la inflación respecto a la meta y evitar una mayor caída del dólar estadounidense.',
    },
    groundingChunkIndices: [0, 1, 2, 3, 4],
  },
  {
    segment: {
      startIndex: 503,
      endIndex: 631,
      text: 'La decisión de bajar la tasa de interés se esperaba que desalentara las inversiones en pesos y respaldara el valor del dólar.',
    },
    groundingChunkIndices: [3],
  },
  {
    segment: {
      startIndex: 632,
      endIndex: 794,
      text: 'El anuncio de esta reunión y la expectativa de un recorte en la tasa ya habían provocado una leve subida del dólar en el mercado cambiario el viernes anterior.',
    },
    groundingChunkIndices: [4],
  },
]

describe('extractGroundedHeadlines', () => {
  it('picks, per chunk, the most specific (fewest-indices) supporting segment as title', () => {
    const out = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS)
    // chunk 3 is cited alone by the 3rd segment -> that becomes its title, not the broad first one
    const chunk3 = out.find(h => h.link.endsWith('DDD'))
    expect(chunk3?.title).toBe(
      'La decisión de bajar la tasa de interés se esperaba que desalentara las inversiones en pesos y respaldara el valor del dólar.'
    )
    // chunk 4 is cited alone by the 4th segment
    const chunk4 = out.find(h => h.link.endsWith('EEE'))
    expect(chunk4?.title).toBe(
      'El anuncio de esta reunión y la expectativa de un recorte en la tasa ya habían provocado una leve subida del dólar en el mercado cambiario el viernes anterior.'
    )
    // chunk 0 is only ever cited by the broad first/second segments -> falls back to the first (earliest)
    const chunk0 = out.find(h => h.link.endsWith('AAA'))
    expect(chunk0?.title).toBe(
      'El 26 de enero de 2026, el Banco Central del Uruguay (BCU) redujo la Tasa de Política Monetaria (TPM) en 100 puntos básicos, estableciéndola en 6,5%.'
    )
  })

  it('strips a leading www. from the domain for `source`', () => {
    const out = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS)
    const chunk3 = out.find(h => h.link.endsWith('DDD'))
    expect(chunk3?.source).toBe('busqueda.com.uy')
  })

  it('truncates a title longer than 140 chars with an ellipsis', () => {
    const longText = 'x'.repeat(200)
    const chunks = [{ web: { uri: 'https://example.com/redirect', title: 'example.com' } }]
    const supports = [{ segment: { endIndex: 200, text: longText }, groundingChunkIndices: [0] }]
    const out = extractGroundedHeadlines(chunks, supports)
    expect(out[0]!.title.length).toBe(140)
    expect(out[0]!.title.endsWith('...')).toBe(true)
  })

  it('skips a chunk with no web.uri', () => {
    const chunks = [{ web: { title: 'no-uri.com' } }, { web: { uri: 'https://ok.com/x', title: 'ok.com' } }]
    const supports: never[] = []
    const out = extractGroundedHeadlines(chunks, supports)
    expect(out).toHaveLength(1)
    expect(out[0]!.source).toBe('ok.com')
  })

  it('falls back to the domain as title when no support segment covers a chunk', () => {
    const chunks = [{ web: { uri: 'https://ok.com/x', title: 'ok.com' } }]
    const out = extractGroundedHeadlines(chunks, [])
    expect(out[0]!.title).toBe('ok.com')
  })

  it('caps at `limit` (default 3)', () => {
    const out = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS)
    expect(out).toHaveLength(3)
    const out5 = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS, 5)
    expect(out5).toHaveLength(5)
  })
})

describe('isNoNewsText', () => {
  it('is true for an exact or prefixed SIN NOTICIAS reply, case-insensitive', () => {
    expect(isNoNewsText('SIN NOTICIAS')).toBe(true)
    expect(isNoNewsText('sin noticias')).toBe(true)
    expect(isNoNewsText('  Sin Noticias.')).toBe(true)
    expect(isNoNewsText('Sin noticias relevantes para esta fecha.')).toBe(true)
  })
  it('is false for a real narrative', () => {
    expect(isNoNewsText('El BCU redujo la tasa de interés...')).toBe(false)
    expect(isNoNewsText('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/geminiGrounding.test.ts`
Expected: FAIL with "Cannot find module '../../utils/geminiGrounding'" (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// app/utils/geminiGrounding.ts

export interface GroundingChunk {
  web?: { uri?: string; title?: string }
}

export interface GroundingSupport {
  segment: { text: string; startIndex?: number; endIndex: number }
  groundingChunkIndices: number[]
}

export interface GroundedHeadline {
  title: string
  source: string
  link: string
}

const stripWww = (domain: string): string => domain.replace(/^www\./i, '')

const truncate = (text: string, max: number): string =>
  text.length > max ? text.slice(0, max - 3) + '...' : text

/**
 * Gemini's groundingChunks[].web.title is just the bare domain, not the
 * source's actual headline — there is no headline field in this API. Build
 * an honest title substitute from groundingSupports: the segment of the
 * model's own (grounded) narrative that cites this chunk most specifically
 * (fewest total chunks on that segment; earliest wins ties). Falls back to
 * the domain itself when no segment covers the chunk.
 */
export function extractGroundedHeadlines(
  chunks: GroundingChunk[],
  supports: GroundingSupport[],
  limit = 3
): GroundedHeadline[] {
  const bestSupportForChunk = new Map<number, GroundingSupport>()
  for (const support of supports) {
    for (const idx of support.groundingChunkIndices) {
      const current = bestSupportForChunk.get(idx)
      if (!current || support.groundingChunkIndices.length < current.groundingChunkIndices.length) {
        bestSupportForChunk.set(idx, support)
      }
    }
  }

  const out: GroundedHeadline[] = []
  chunks.forEach((chunk, idx) => {
    const uri = chunk.web?.uri
    if (!uri) return
    const domain = stripWww(chunk.web?.title ?? '')
    const rawTitle = bestSupportForChunk.get(idx)?.segment.text?.trim()
    const title = truncate(rawTitle || domain, 140)
    out.push({ title, source: domain, link: uri })
  })
  return out.slice(0, limit)
}

/** True when Gemini's text reply signals it found nothing real (case-insensitive prefix match). */
export function isNoNewsText(text: string): boolean {
  return /^\s*sin noticias/i.test(text)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/geminiGrounding.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add app/utils/geminiGrounding.ts app/tests/unit/geminiGrounding.test.ts
git commit -m "feat(analysis): pure parser for Gemini grounding-chunk headlines"
```

---

### Task 2: `searchMoveNews` server util + runtime config

**Files:**
- Create: `app/server/utils/geminiNews.ts`
- Modify: `app/nuxt.config.ts` (runtimeConfig block, near the existing `ai` block around line 637-644)

**Interfaces:**
- Consumes: `extractGroundedHeadlines`, `isNoNewsText` from `app/utils/geminiGrounding.ts` (Task 1).
- Produces:
  - `interface MoveNewsResult { headlines: { title: string; source: string; link: string }[]; narrative: string | null }`
  - `async function searchMoveNews(currency: string, date: string, pctChange: number, direction: 'up' | 'down' | 'flat', drivers: { key: string; dayMovePct: number }[]): Promise<MoveNewsResult | null>` — consumed by Task 3.

- [ ] **Step 1: Add `geminiApiKey` to runtime config**

In `app/nuxt.config.ts`, add right after the existing `ai: { ... }` block (around line 644):

```ts
    // Gemini API key (server-only) for grounded real-news search on notable
    // move days — see docs/superpowers/specs/2026-07-08-gemini-news-grounding-design.md.
    // Baked at build time same as driversIngestToken/ai.apiKey; raw process.env
    // reads empty at pm2 runtime in this deployment.
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY || '',
```

- [ ] **Step 2: Add the key to your local `.env` for live verification**

Add this line to `app/.env` (already open in your editor) — never commit this file:

```
NUXT_GEMINI_API_KEY=<the key you already have>
```

- [ ] **Step 3: Write `searchMoveNews`**

```ts
// app/server/utils/geminiNews.ts
import { extractGroundedHeadlines, isNoNewsText } from '../../utils/geminiGrounding'

export interface MoveNewsResult {
  headlines: { title: string; source: string; link: string }[]
  narrative: string | null
}

const DRIVER_CONTEXT: Record<string, string> = {
  USD: 'para USD, BCU y drivers globales (Fed, aranceles, geopolítica)',
  EUR: 'para EUR, BCE/eurozona además de los mismos drivers globales de USD (el EUR/UYU se ancla en BROU, no en BCU)',
  ARS: 'para ARS, BCRA/Argentina (bandas cambiarias, cepo, elecciones) además de efectos globales',
}

function buildPrompt(
  currency: string,
  date: string,
  pctChange: number,
  direction: 'up' | 'down' | 'flat',
  drivers: { key: string; dayMovePct: number }[]
): string {
  const verb = direction === 'down' ? 'bajó' : 'subió'
  const driverLines = drivers.length
    ? drivers.map(d => `${d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(2)}%`).join(', ')
    : 'sin datos de drivers disponibles'
  const context = DRIVER_CONTEXT[currency] ?? DRIVER_CONTEXT.USD
  return (
    `El ${currency}/UYU ${verb} ${Math.abs(pctChange).toFixed(2)}% el ${date}. ` +
    `Ese día se movieron estos indicadores: ${driverLines}. ` +
    `Buscá noticias reales, fechadas ese día o +/-1 día, que puedan explicar este movimiento. ` +
    `Considerá: ${context}. ` +
    `Si no encontrás nada realmente relevante, respondé exactamente 'SIN NOTICIAS'. ` +
    `Si encontrás algo, escribí una explicación breve (2-3 frases, en español), ` +
    `basada solo en lo que encontraste — no inventes causas ni datos.`
  )
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

/**
 * Live grounded-search stand-in for the manual WebSearch backfill research:
 * asks Gemini (with Google Search grounding) for real, dated news explaining
 * a notable move, and returns real cited headlines + a grounded narrative.
 * Returns null on any failure, missing config, or a "nothing found" reply —
 * the caller falls back to the existing attribution-only path.
 */
export async function searchMoveNews(
  currency: string,
  date: string,
  pctChange: number,
  direction: 'up' | 'down' | 'flat',
  drivers: { key: string; dayMovePct: number }[]
): Promise<MoveNewsResult | null> {
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return null

  try {
    const res = await $fetch<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [{ parts: [{ text: buildPrompt(currency, date, pctChange, direction, drivers) }] }],
          tools: [{ google_search: {} }],
        },
        timeout: 30000,
      }
    )

    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? []).map(p => p.text ?? '').join('').trim()
    if (!text || isNoNewsText(text)) return null

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const supports = candidate?.groundingMetadata?.groundingSupports ?? []
    const headlines = extractGroundedHeadlines(chunks, supports)
    if (headlines.length === 0) return null

    return { headlines, narrative: text }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Live-verify against the real API and key**

Run (from `app/`, with `NUXT_GEMINI_API_KEY` set in `.env`):

```bash
npx tsx -e "
import { searchMoveNews } from './server/utils/geminiNews'
process.env.NUXT_GEMINI_API_KEY = process.env.NUXT_GEMINI_API_KEY
;(async () => {
  const r = await searchMoveNews('USD', '2026-01-26', 1.01, 'up', [{ key: 'fred_dxy', dayMovePct: -0.7 }])
  console.log(JSON.stringify(r, null, 2))
})()
"
```

Expected: a non-null result whose `narrative` mentions the BCU rate cut, and whose `headlines` has 1-3 entries each with a real `busqueda.com.uy`/`montevideo.com.uy`/etc-style `source`, a `vertexaisearch.cloud.google.com/grounding-api-redirect/...` `link`, and a non-empty `title`.

Note: `useRuntimeConfig()` only works inside a Nuxt server context, not a bare `tsx` script — if Step 4 fails to resolve `useRuntimeConfig`, instead temporarily hardcode the key inline for this one manual smoke test (`const apiKey = process.env.NUXT_GEMINI_API_KEY as string`), run it, confirm the output, then revert to the `useRuntimeConfig()` version before committing. Do not commit the hardcoded-key version.

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/geminiNews.ts app/nuxt.config.ts
git commit -m "feat(analysis): Gemini-grounded real news search for notable moves"
```

(Do NOT `git add app/.env` — it's already gitignored; double-check with `git status` before this commit that it does not appear.)

---

### Task 3: Wire into `recordTodayExplanation`

**Files:**
- Modify: `app/server/utils/moveExplanation.ts`

**Interfaces:**
- Consumes: `searchMoveNews` from `app/server/utils/geminiNews.ts` (Task 2).
- Produces: `recordTodayExplanation(currency: string, asOfOverride?: string): Promise<{ recorded: boolean; date: string }>` — same return shape as today, with a new optional second parameter (defaults to `montevideoToday()`, so the existing single-arg caller in `app/server/tasks/drivers/daily.ts` is unaffected) that lets a manual verification script target a known historical notable-move date instead of the real current day.

- [ ] **Step 1: Update `recordTodayExplanation`**

Replace the full contents of `app/server/utils/moveExplanation.ts`:

```ts
import { connectDb } from './db'
import { MoveExplanationModel } from '../models/MoveExplanation'
import { buildAnalysis, loadDriverSeries } from './analysis'
import { attributeMove } from '../../utils/attribution'
import { montevideoToday } from '../../utils/blog'
import { chatTextWithFallback } from './ai'
import { searchMoveNews } from './geminiNews'

/**
 * If today (or `asOfOverride`) is a notable move day for `currency`, upsert
 * its MoveExplanation. Tries a live Gemini-grounded news search first (real
 * cited headlines + a narrative grounded in them); falls back to the
 * original path — archived-feed headlines (USD only) + an AI narrative
 * built purely from measured attribution — when Gemini is unconfigured,
 * fails, or finds nothing real. No-ops if the target date isn't a notable
 * move. Idempotent — safe to call repeatedly (e.g. re-running the daily
 * task). `asOfOverride` exists only so manual/local verification can target
 * a known historical date instead of the real current day; the production
 * caller (`server/tasks/drivers/daily.ts`) never passes it.
 */
export async function recordTodayExplanation(
  currency: string,
  asOfOverride?: string
): Promise<{ recorded: boolean; date: string }> {
  await connectDb()
  const asOf = asOfOverride ?? montevideoToday()

  const [{ moves, headlines, correlations }, driverSeries] = await Promise.all([
    buildAnalysis(currency),
    loadDriverSeries(currency),
  ])

  const today = moves.find(m => m.date === asOf)
  if (!today) return { recorded: false, date: asOf }

  const attribution = attributeMove(asOf, driverSeries).slice(0, 5)
  const drivers = attribution.map(d => ({ key: d.key, dayMovePct: d.dayMovePct }))
  void correlations // available if a future task wants to persist `r` too

  const grounded = await searchMoveNews(currency, asOf, today.pctChange, today.direction, drivers)

  let narrative: string | null
  let storedHeadlines: { title: string; source: string; link: string }[]

  if (grounded) {
    narrative = grounded.narrative
    storedHeadlines = grounded.headlines
  } else {
    const directionWord = today.direction === 'down' ? 'bajó' : 'subió'
    const driverLines = attribution
      .map(d => `${d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(2)}%`)
      .join(', ')
    narrative = await chatTextWithFallback({
      system:
        'Sos un analista financiero que explica movimientos cambiarios en Uruguay en 2-3 frases claras, en español, sin inventar datos ni noticias.',
      user: `El ${currency}/UYU ${directionWord} ${Math.abs(today.pctChange).toFixed(2)}% el ${asOf}. Ese día se movieron estos indicadores: ${driverLines || 'sin datos de drivers disponibles'}. Explicá brevemente qué pudo influir, basándote solo en estos datos (correlación, no causalidad; no afirmes causas que no estén en los datos).`,
    }).catch(() => null)
    // buildAnalysis's headlines carry an extra `pubDate` field that
    // MoveExplanationDoc doesn't declare — strip it explicitly rather than
    // relying on implicit Mongoose subdocument casting to drop it.
    storedHeadlines = headlines.map(h => ({ title: h.title, source: h.source, link: h.link }))
  }

  await MoveExplanationModel.updateOne(
    { currency, date: asOf },
    {
      $set: {
        pctChange: today.pctChange,
        direction: today.direction,
        drivers,
        narrative,
        headlines: storedHeadlines,
      },
    },
    { upsert: true }
  )
  return { recorded: true, date: asOf }
}
```

- [ ] **Step 2: Live-verify the Gemini-first branch against a real historical notable date**

Requires local MongoDB running (per this repo's established sandbox pattern:
`"/c/Program Files/MongoDB/Server/8.0/bin/mongod.exe" --dbpath <scratch-dir> --port 27017`)
and `app/.env` pointing at it with `NUXT_GEMINI_API_KEY` set. Run (from `app/`):

```bash
npx tsx -e "
import { recordTodayExplanation } from './server/utils/moveExplanation'
import { MoveExplanationModel } from './server/models/MoveExplanation'
;(async () => {
  const result = await recordTodayExplanation('USD', '2026-01-26')
  console.log('result:', result)
  const doc = await MoveExplanationModel.findOne({ currency: 'USD', date: '2026-01-26' }).lean()
  console.log('narrative:', doc?.narrative)
  console.log('headlines:', JSON.stringify(doc?.headlines, null, 2))
  process.exit(0)
})()
"
```

Expected: `result.recorded === true`; `narrative` mentions the BCU rate cut (the Gemini-grounded path, not the old attribution-only wording); `headlines` has 1-3 real entries. This confirms the Gemini-first branch actually wins over the fallback when real news exists — the single most important behavior this task adds.

Note: this requires driver-snapshot data to exist locally for `2026-01-26` (from `DriverSnapshotModel`) for `buildAnalysis`'s `detectMoves` to recognize it as a notable move at all — if your local Mongo is empty, first seed at least that date's driver snapshots, or instead run this verification against a currency/date you know is already a real notable move in your local data. If no local Mongo data reaches that date, run this same script against the production database connection string instead (read-only risk: `MoveExplanationModel.updateOne` will upsert into prod for this one test date — acceptable since it's the same real historical date already correctly backfilled in Task "Phase 4", so overwriting it with an equally-real Gemini-grounded version is safe and reversible via the existing `/api/analysis/backfill` endpoint if needed).

- [ ] **Step 3: Commit**

```bash
git add app/server/utils/moveExplanation.ts
git commit -m "feat(analysis): wire Gemini-grounded news search into the daily move-explanation cron"
```

---

### Task 4: VPS deploy

**Files:** none (ops-only task)

- [ ] **Step 1: Add the secret to the VPS's `app/.env`**

SSH: `ssh root@104.234.204.107 -p 2223`, then `cd cambio-uruguay/app` (or wherever the app checkout lives on the VPS — confirm path matches [[deploy]] memory) and append:

```
NUXT_GEMINI_API_KEY=<the key>
```

- [ ] **Step 2: Merge to main and deploy**

From your local machine: merge this branch to `main`, push. CI runs `app/scripts/deploy.sh`, which runs `npx nuxt build` **on the VPS**, baking the new `NUXT_GEMINI_API_KEY` into `runtimeConfig` (a bare `pm2 reload` would NOT pick up a newly-added raw env var — this bit us once already on `driversIngestToken`, see [[deploy]] memory).

- [ ] **Step 3: Verify live after the next scheduled run**

The `drivers:daily` task runs at `9:15` UTC (see `nuxt.config.ts:280`). After the next run on a day with a real notable move for USD/EUR/ARS, check via:

```bash
curl -s https://cambio-uruguay.com/api/analysis/USD | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);const last=j.moves[j.moves.length-1];console.log(JSON.stringify(last,null,2))})"
```

Expected: the most recent notable-move date (if any occurred since deploy) has `headlines` with real `vertexaisearch.cloud.google.com` links and a `narrative` that reads as grounded in real news (not the old generic attribution-only phrasing pattern "El {driver} X%, el {driver2} Y%...").

If no notable move has occurred yet since deploy, this step can't be verified until one does — note that in the final report rather than blocking on it; Task 2/3's live smoke tests already prove the mechanism works end-to-end against real historical data.

---

## Self-Review Notes

- **Spec coverage:** every section of the design doc (`geminiNews.ts`, `recordTodayExplanation` fallback wiring, `nuxt.config.ts`, testing split, deploy) has a corresponding task. ✅
- **Placeholder scan:** no TBD/TODO; all code blocks are complete, runnable. ✅
- **Type consistency:** `MoveNewsResult` (Task 2) matches the `{headlines, narrative}` shape consumed in Task 3; `GroundedHeadline` (Task 1) matches `MoveExplanationDoc.headlines`'s `{title, source, link}` shape (Task 2/3 both reuse it directly, no renaming). ✅
