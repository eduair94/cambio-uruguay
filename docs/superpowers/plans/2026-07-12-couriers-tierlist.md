# Courier Tierlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/couriers-uruguay` from a static rate table into a computed S–F tier list where the reader's own package (weight/value/origin) drives the price score and real Google + Reddit data drive the reputation score.

**Architecture:** The root Express/pm2 backend owns ALL sync (tariff scraping, Google Places by pinned `place_id`, Reddit harvesting + AI-labelled sentiment) and serves it from `GET /couriers` on `api.cambio-uruguay.com`. Nuxt keeps only the pure scoring math (`app/utils/courierTierlist.ts`) — it must run client-side because the board re-tiers on every keystroke — plus a static seed so the page renders when the backend is down.

**Tech Stack:** TypeScript, Express + Mongoose + Redis (root backend), pm2 cron jobs, Nuxt 3 + Vuetify (app), Vitest (both), Playwright (e2e).

## Global Constraints

- **Never invent a number.** A `null` + an honest "sin muestra suficiente" on the card always beats a plausible figure. The research pass refuted 19 of 21 courier profiles across 112 corrections — unverified numbers are the default failure mode of this page.
- **The tier is COMPUTED, never hand-written.** `scoreFor` → `tierForScore`. No entity carries a literal tier.
- **A missing dimension is ABSENT, not zero.** When an entity has no evidence for a dimension (no Reddit sample, no trustworthy Google listing, quote-only tariff), that dimension drops out and the remaining weights re-normalise to 100. Scoring a data gap as 50 would turn "small operator" into "bad operator" — the exact lie this page exists to avoid.
- Reddit sentence labelling is done by the AI provider and **cached in Mongo by sentence hash**; the aggregation (decay, log-weighted upvotes, net, sample thresholds) stays deterministic and auditable. The model labels; the maths computes.
- All reader-facing copy in **Uruguayan Spanish** (voseo, `US$`, comma decimals).
- Every published quote carries its permalink. Every tariff carries the URL it was read from and the date it was verified.
- Backend deploys are **manual** (see Task 6). `app/` deploys by CI on push to main.
- `app/` typecheck is broken (vue-tsc crashes) — use `npm run lint`. Do not add a typecheck step.

---

### Task 1: Courier tariff store + Google reviews (backend)

**Files:**
- Create: `classes/couriers/types.ts`
- Create: `classes/couriers/store.ts`
- Create: `classes/couriers/googleReviews.ts`
- Create: `tests/couriers/googleReviews.test.ts`

**Interfaces:**
- Consumes: `MongooseServer` from `classes/database.ts` (`getInstance(document, schema)`, `.aggregate()`, `.updateOne()`); `mongoConfig` from `config.ts`.
- Produces:
  - `interface StoredReview { rating: number; count: number; placeId: string; name: string | null; url: string | null; checkedAt: string }`
  - `interface StoredRate { perKgUsd: number; scrapedAt: string }`
  - `interface CourierDoc { rates: Record<string, StoredRate>; reviews: Record<string, StoredReview>; opinions: Record<string, EntityOpinion>; updatedAt: string | null }`
  - `loadCourierDoc(): Promise<CourierDoc>` / `saveCourierDoc(doc: CourierDoc): Promise<void>`
  - `shouldAcceptReview(prev: StoredReview | null, next: FetchedReview): boolean`
  - `parsePlaceDetails(json: unknown): FetchedReview | null`
  - `COURIER_PLACE_IDS: Record<string, string>` — pinned, human-verified.

- [ ] **Step 1: Write the failing test**

`tests/couriers/googleReviews.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parsePlaceDetails, shouldAcceptReview } from '../../classes/couriers/googleReviews'

const prev = { rating: 4.7, count: 950, placeId: 'ChIJx', name: 'USX Cargo', url: null, checkedAt: '2026-07-01T00:00:00.000Z' }

describe('parsePlaceDetails', () => {
  it('reads the Places proxy payload', () => {
    const out = parsePlaceDetails({ result: { place_id: 'ChIJx', name: 'USX Cargo', rating: 4.7, user_ratings_total: 950, url: 'https://maps.google.com/?cid=1' } })
    expect(out).toEqual({ placeId: 'ChIJx', name: 'USX Cargo', rating: 4.7, count: 950, url: 'https://maps.google.com/?cid=1' })
  })

  it('rejects a payload with no rating', () => {
    expect(parsePlaceDetails({ result: { place_id: 'ChIJx', name: 'USX Cargo' } })).toBeNull()
  })
})

describe('shouldAcceptReview', () => {
  it('accepts the first good fetch', () => {
    expect(shouldAcceptReview(null, { placeId: 'ChIJx', name: 'USX', rating: 4.7, count: 950, url: null })).toBe(true)
  })

  it('rejects a review-count collapse — it means the query resolved to another business', () => {
    expect(shouldAcceptReview(prev, { placeId: 'ChIJx', name: 'USX', rating: 4.9, count: 12, url: null })).toBe(false)
  })

  it('rejects an implausible rating jump', () => {
    expect(shouldAcceptReview(prev, { placeId: 'ChIJx', name: 'USX', rating: 1.2, count: 980, url: null })).toBe(false)
  })

  it('rejects a rating outside 1–5', () => {
    expect(shouldAcceptReview(null, { placeId: 'ChIJx', name: 'USX', rating: 0, count: 10, url: null })).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- tests/couriers/googleReviews.test.ts`
Expected: FAIL — `Cannot find module '../../classes/couriers/googleReviews'`

- [ ] **Step 3: Implement**

`classes/couriers/googleReviews.ts` — port the proven guard from `app/utils/casasReviews.ts` (same thresholds: count collapse below 40% of the previous, or a rating jump over 1.5 stars, means the query resolved to a different business):

```ts
// Google-review snapshots for the courier tier list. Listings are read by PINNED place_id —
// never by text search — because a text search silently resolves onto a co-branded or nearby
// business. That is not hypothetical: during the research pass an agent searching for "Correo
// Uruguayo" pinned a listing literally named "Casilla" (Casilla Mía's), and would have published
// Casilla Mía's 2,0★ as the postal service's score.
export interface FetchedReview {
  placeId: string | null
  name: string | null
  rating: number
  count: number
  url: string | null
}

export interface StoredReview {
  rating: number
  count: number
  placeId: string
  name: string | null
  url: string | null
  checkedAt: string
}

/** Pinned, human-verified listings. An id absent from here is simply never fetched. */
export const COURIER_PLACE_IDS: Record<string, string> = {
  // Filled from docs/superpowers/research/2026-07-12-couriers-tierlist.md.
  // Every entry was confirmed by name against the operator's own site.
}

export function parsePlaceDetails(json: unknown): FetchedReview | null {
  const r = (json as { result?: Record<string, unknown> })?.result
  if (!r) return null
  const rating = Number(r.rating)
  const count = Number(r.user_ratings_total)
  if (!Number.isFinite(rating) || !Number.isFinite(count)) return null
  return {
    placeId: typeof r.place_id === 'string' ? r.place_id : null,
    name: typeof r.name === 'string' ? r.name : null,
    rating,
    count,
    url: typeof r.url === 'string' ? r.url : null,
  }
}

/** Only overwrite with a fresh, plausible result: a bad fetch degrades to "stale but correct". */
export function shouldAcceptReview(prev: StoredReview | null, next: FetchedReview): boolean {
  if (!(next.rating >= 1 && next.rating <= 5) || next.count < 1) return false
  if (!prev) return true
  if (next.count < prev.count * 0.4) return false
  if (Math.abs(next.rating - prev.rating) > 1.5) return false
  return true
}
```

`classes/couriers/store.ts` — one Mongo document (`courier_data`), same single-doc shape as `casasReviewsStore`:

```ts
import { Schema } from 'mongoose'
import { MongooseServer } from '../database'
import type { StoredReview } from './googleReviews'
import type { EntityOpinion } from './opinions'

export interface StoredRate {
  perKgUsd: number
  scrapedAt: string
}

export interface CourierDoc {
  rates: Record<string, StoredRate>
  reviews: Record<string, StoredReview>
  opinions: Record<string, EntityOpinion>
  updatedAt: string | null
}

const KEY = 'courier_data'
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false })
const server = () => MongooseServer.getInstance('courier_data', schema)

export async function loadCourierDoc(): Promise<CourierDoc> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }])
  const doc = rows[0]?.doc as CourierDoc | undefined
  return { rates: {}, reviews: {}, opinions: {}, updatedAt: null, ...(doc ?? {}) }
}

export async function saveCourierDoc(doc: CourierDoc): Promise<void> {
  await server().updateOne({ key: KEY }, { $set: { key: KEY, doc } }, { upsert: true })
}
```

(If `MongooseServer` exposes no `updateOne`, use the model directly via `getModel()` — check `classes/database.ts` and follow whichever method `casasReviewsStore` equivalents use in this codebase.)

- [ ] **Step 4: Run the tests — they pass**

Run: `npm test -- tests/couriers/googleReviews.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add classes/couriers tests/couriers
git commit -m "feat(couriers): pinned Google-review store with a plausibility guard"
```

---

### Task 2: Port the tariff scraper to the backend

**Files:**
- Create: `classes/couriers/rateScraper.ts` (port of `app/server/utils/courierScraper.ts`)
- Create: `tests/couriers/rateScraper.test.ts` (port of `app/tests/unit/courierScraper.test.ts`)
- Delete (in Task 8, not now): `app/server/utils/courierScraper.ts`

**Interfaces:**
- Produces: `RATE_PARSERS: Record<string, { url: string; extract: (text: string) => number | null }>`, `parseCourierRate(id: string, text: string): ScrapeResult`, `scrapeAllCourierRates(): Promise<ScrapeResult[]>`, `RATE_MIN = 5`, `RATE_MAX = 60`.

- [ ] **Step 1: Copy the existing tests first, and run them red**

Copy `app/tests/unit/courierScraper.test.ts` to `tests/couriers/rateScraper.test.ts`, rewriting only the import path to `../../classes/couriers/rateScraper`. The fixtures and assertions stay byte-identical — this is a port, and the tests are the proof it is faithful.

Run: `npm test -- tests/couriers/rateScraper.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Port the module**

Copy `app/server/utils/courierScraper.ts` to `classes/couriers/rateScraper.ts` **unchanged** (it is dependency-free: plain `fetch` + regex). Keep the parsers, the `RATE_MIN`/`RATE_MAX` plausibility band and the per-courier anchors exactly as they are — they were tuned against real HTML and each anchor comment explains which tier it targets.

- [ ] **Step 3: Run the tests — they pass**

Run: `npm test -- tests/couriers/rateScraper.test.ts`
Expected: PASS, same count as the original suite.

- [ ] **Step 4: Commit**

```bash
git add classes/couriers/rateScraper.ts tests/couriers/rateScraper.test.ts
git commit -m "feat(couriers): port the tariff scraper into the backend"
```

---

### Task 3: Reddit client (backend)

**Files:**
- Create: `classes/reddit.ts`
- Create: `tests/couriers/reddit.test.ts`

**Interfaces:**
- Produces: `redditConfigured(): boolean`, `searchPosts(sub: string, query: string): Promise<RedditPostRaw[]>`, `fetchComments(sub: string, postId: string): Promise<RedditCommentRaw[]>`, and the `RedditPostRaw` / `RedditCommentRaw` interfaces (identical shape to `app/server/utils/reddit.ts`).
- Consumes: `process.env.REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` (via `dotenv`, like the rest of the backend).

- [ ] **Step 1: Write the failing test**

The client is mostly I/O; test the parts that have logic — the token cache and the politeness gap.

`tests/couriers/reddit.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetRedditForTests, redditConfigured, searchPosts } from '../../classes/reddit'

describe('reddit client', () => {
  beforeEach(() => {
    __resetRedditForTests()
    process.env.REDDIT_CLIENT_ID = 'id'
    process.env.REDDIT_CLIENT_SECRET = 'secret'
  })

  it('is configured when credentials are present', () => {
    expect(redditConfigured()).toBe(true)
  })

  it('mints one token and reuses it across calls', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('access_token')) {
        return new Response(JSON.stringify({ access_token: 'tk', expires_in: 3600 }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: { children: [] } }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await searchPosts('uruguay', 'courier')
    await searchPosts('uruguay', 'casillero')

    const tokenCalls = fetchMock.mock.calls.filter(c => String(c[0]).includes('access_token'))
    expect(tokenCalls).toHaveLength(1)
  })

  it('returns [] instead of throwing when Reddit errors — an outage must not break the job', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes('access_token')
        ? new Response(JSON.stringify({ access_token: 'tk', expires_in: 3600 }), { status: 200 })
        : new Response('nope', { status: 503 })
    ))
    await expect(searchPosts('uruguay', 'courier')).resolves.toEqual([])
  })
})
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm test -- tests/couriers/reddit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Port the client**

Port `app/server/utils/reddit.ts` to `classes/reddit.ts`. Two changes only:
1. Read credentials from `process.env` (with `dotenv.config()`) instead of `useRuntimeConfig()`.
2. Export `__resetRedditForTests()` that clears the module-scope token cache and the last-call timestamp.

Keep everything else: the `installed_client` grant, the serialized queue with a 1200 ms gap (~50 req/min, half of Reddit's allowance), the `retry-after` handling on 429, the descriptive User-Agent (Reddit blocks generic ones), and the null-safety — every function returns `[]` on failure rather than throwing.

- [ ] **Step 4: Run the tests — they pass**

Run: `npm test -- tests/couriers/reddit.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add classes/reddit.ts tests/couriers/reddit.test.ts
git commit -m "feat(couriers): backend Reddit client (installed_client grant, throttled)"
```

---

### Task 4: Opinion mining — AI-labelled, deterministically aggregated

**Files:**
- Create: `classes/couriers/opinions.ts`
- Create: `tests/couriers/opinions.test.ts`

**Interfaces:**
- Consumes: `searchPosts`/`fetchComments` (Task 3); the AI provider already configured in the backend (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` in `.env`, wrapped by `classes/ai_service.ts`); `loadCourierDoc`/`saveCourierDoc` (Task 1).
- Produces:
  - `COURIER_REDDIT_ENTITIES: readonly { id: string; name: string; queries: string[]; patterns: RegExp[] }[]`
  - `splitSentences(text: string): string[]`
  - `interface LabelledSentence { hash: string; subject: string | null; isOpinion: boolean; polarity: -1 | 0 | 1; theme: ThemeId | null }`
  - `aggregate(labels: LabelledSentence[], meta: MentionMeta[], today: Date): EntityOpinion`
  - `interface EntityOpinion { id: string; mentions: number; opinions: number; net: number | null; sample: 'usable' | 'thin' | 'none'; quotes: Quote[]; updatedAt: string }`
  - `refreshOpinions(): Promise<Record<string, EntityOpinion>>`

**Why the AI labels and the maths aggregates:** a keyword lexicon was tried against the real corpus (1 513 posts / 7 862 comments) and it publishes falsehoods. It scored Tiendamia at net −5 when the true figure, read sentence by sentence, is −70; and it counted *"Yo recomiendo PuntoMio antes que estos chorros"* as **praise for Tiendamia**. Comparative sentences invert the subject and sarcasm inverts the polarity, and no lexicon catches either. So the model assigns `{subject, isOpinion, polarity, theme}` per sentence — cached in Mongo by sentence hash, so each sentence costs one call ever and two runs over the same corpus produce the same number — while decay, upvote weighting, the net and the sample thresholds stay in plain, testable code.

- [ ] **Step 1: Write the failing test**

`tests/couriers/opinions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aggregate, splitSentences, MIN_OPINIONS_USABLE, MIN_OPINIONS_THIN } from '../../classes/couriers/opinions'

const TODAY = new Date('2026-07-12T00:00:00Z')
const meta = (over: Partial<{ score: number; date: string; permalink: string; named: boolean }> = {}) => ({
  score: 10,
  date: '2026-06-01',
  permalink: 'https://reddit.com/r/uruguay/comments/x/_/c1',
  sub: 'uruguay',
  text: 'Anduvo bien.',
  named: true,
  ...over,
})

describe('splitSentences', () => {
  it('splits on sentence enders and drops fragments', () => {
    expect(splitSentences('Usé USX. Llegó en 5 días! Muy bien.')).toEqual(['Usé USX.', 'Llegó en 5 días!', 'Muy bien.'])
  })
})

describe('aggregate', () => {
  it('returns sample=none and net=null below the thin threshold — never a number', () => {
    const out = aggregate(
      [{ hash: 'a', subject: 'usxcargo', isOpinion: true, polarity: 1, theme: 'cumplimiento' }],
      [meta()],
      TODAY
    )
    expect(out.sample).toBe('none')
    expect(out.net).toBeNull()
  })

  it('counts only opinions towards the net — a passing mention moves nothing', () => {
    const labels = [
      ...Array.from({ length: 8 }, (_, i) => ({ hash: `p${i}`, subject: 'usxcargo', isOpinion: true, polarity: 1 as const, theme: 'precio' as const })),
      { hash: 'm', subject: 'usxcargo', isOpinion: false, polarity: 0 as const, theme: null },
    ]
    const out = aggregate(labels, labels.map(() => meta()), TODAY)
    expect(out.mentions).toBe(9)
    expect(out.opinions).toBe(8)
    expect(out.net).toBe(100)
    expect(out.sample).toBe('usable')
  })

  it('decays old rants — a 2019 complaint weighs less than a 2026 one', () => {
    const old = aggregate(
      [{ hash: 'o', subject: 'x', isOpinion: true, polarity: -1, theme: null }, ...Array.from({ length: 7 }, (_, i) => ({ hash: `n${i}`, subject: 'x', isOpinion: true, polarity: 1 as const, theme: null }))],
      [meta({ date: '2019-01-01' }), ...Array.from({ length: 7 }, () => meta({ date: '2026-06-01' }))],
      TODAY
    )
    const fresh = aggregate(
      [{ hash: 'o', subject: 'x', isOpinion: true, polarity: -1, theme: null }, ...Array.from({ length: 7 }, (_, i) => ({ hash: `n${i}`, subject: 'x', isOpinion: true, polarity: 1 as const, theme: null }))],
      [meta({ date: '2026-06-01' }), ...Array.from({ length: 7 }, () => meta({ date: '2026-06-01' }))],
      TODAY
    )
    expect(old.net!).toBeGreaterThan(fresh.net!)
  })

  it('never quotes a sentence that did not NAME the entity', () => {
    const labels = Array.from({ length: 8 }, (_, i) => ({ hash: `q${i}`, subject: 'x', isOpinion: true, polarity: 1 as const, theme: null }))
    const metas = labels.map((_, i) => meta({ named: i !== 0 }))
    const out = aggregate(labels, metas, TODAY)
    expect(out.quotes.every(q => q.text !== metas[0].text || metas[0].named)).toBe(true)
    expect(out.quotes.length).toBeLessThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm test -- tests/couriers/opinions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`classes/couriers/opinions.ts`. The aggregation rules, all of them empirically motivated:

```ts
/** Below this many genuine opinions we publish a caveat; below MIN_OPINIONS_THIN we publish nothing. */
export const MIN_OPINIONS_USABLE = 8
export const MIN_OPINIONS_THIN = 3

/** Old rants decay: half-life 18 months. What a courier was in 2019 is not what it is now. */
const HALF_LIFE_DAYS = 548

/** Upvotes weigh, but logarithmically — a 500-upvote comment is not 500 opinions. */
const weightOf = (score: number, ageDays: number) =>
  Math.log10(Math.max(score, 1) + 1) * Math.pow(0.5, ageDays / HALF_LIFE_DAYS)
```

- `aggregate()` walks the labelled sentences, keeps only `isOpinion` ones for the net, computes `net = round(100 * Σ(w·polarity) / Σ w)` over the opinions, sets `sample` from the opinion count (`>= MIN_OPINIONS_USABLE` → `usable`; `>= MIN_OPINIONS_THIN` → `thin`; else `none` **and `net = null`**), and picks up to 3 quotes — highest `weightOf`, **only from sentences that NAMED the entity**, never inherited ones. (Inside a thread about Gripper, "recomiendo la web Deku deals" is on-topic enough to survive a filter and publishing it as a quote about Gripper would be a lie.)
- `labelSentences()` sends each unseen sentence to the AI provider with a strict JSON instruction — return `{subject, isOpinion, polarity, theme}`; `subject` must be one of the known courier ids or `null`; sarcasm and comparisons must be resolved to the entity the sentence is really about. Cache each result in Mongo keyed by `sha1(sentence)`. A sentence the model fails to label stays unlabelled and simply does not enter the sample.
- `refreshOpinions()` harvests (Reddit search across `r/uruguay`, `r/Burises`, `r/UruguayFinanzas`, `r/Montevideo`, `r/AskUruguay`, plus comment trees of matching threads), dedupes against what Mongo already has, labels only the new sentences and writes `opinions` back into the courier doc.

- [ ] **Step 4: Run the tests — they pass**

Run: `npm test -- tests/couriers/opinions.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add classes/couriers/opinions.ts tests/couriers/opinions.test.ts
git commit -m "feat(couriers): AI-labelled sentence sentiment with deterministic aggregation"
```

---

### Task 5: The sync job + the public endpoint

**Files:**
- Create: `sync_couriers.ts`
- Modify: `ecosystem.config.js` (add the pm2 app)
- Modify: `index.ts` (add `GET /couriers`)
- Create: `tests/couriers/endpoint.test.ts`

**Interfaces:**
- Consumes: `scrapeAllCourierRates` (Task 2), `COURIER_PLACE_IDS`/`parsePlaceDetails`/`shouldAcceptReview` (Task 1), `refreshOpinions` (Task 4), `loadCourierDoc`/`saveCourierDoc` (Task 1).
- Produces: `GET /couriers` → `{ couriers: Array<{ id, perKgUsd, scrapedAt, reviews, opinions }>, updatedAt }`.

- [ ] **Step 1: Write the failing test for the payload builder**

Keep the HTTP handler thin and test the shaping function:

`tests/couriers/endpoint.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildCouriersPayload } from '../../classes/couriers/payload'

const doc = {
  rates: { gripper: { perKgUsd: 21.9, scrapedAt: '2026-07-12T08:15:00.000Z' } },
  reviews: { gripper: { rating: 4.9, count: 2252, placeId: 'ChIJg', name: 'Gripper', url: null, checkedAt: '2026-07-12T08:15:00.000Z' } },
  opinions: { gripper: { id: 'gripper', mentions: 114, opinions: 12, net: 30, sample: 'usable' as const, quotes: [], updatedAt: '2026-07-12T08:15:00.000Z' } },
  updatedAt: '2026-07-12T08:15:00.000Z',
}

describe('buildCouriersPayload', () => {
  it('joins rates, reviews and opinions by id', () => {
    const out = buildCouriersPayload(doc)
    expect(out.updatedAt).toBe('2026-07-12T08:15:00.000Z')
    expect(out.couriers[0]).toMatchObject({ id: 'gripper', perKgUsd: 21.9, reviews: { rating: 4.9, count: 2252 }, opinions: { net: 30, sample: 'usable' } })
  })

  it('emits an entity that has only opinions and no scraped rate', () => {
    const out = buildCouriersPayload({ ...doc, rates: {} })
    expect(out.couriers[0].perKgUsd).toBeNull()
  })
})
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm test -- tests/couriers/endpoint.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `classes/couriers/payload.ts`, the job and the route**

`sync_couriers.ts` (the pm2 entry — a one-shot script, like `sync.ts`):

```ts
// Daily courier sync: tariffs + Reddit opinions every run; Google reviews only when the
// snapshot is older than a week (review averages drift slowly and the Places proxy is not free).
import dotenv from 'dotenv'
dotenv.config()
import { scrapeAllCourierRates } from './classes/couriers/rateScraper'
import { refreshGoogleReviews } from './classes/couriers/googleReviews'
import { refreshOpinions } from './classes/couriers/opinions'
import { loadCourierDoc, saveCourierDoc } from './classes/couriers/store'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

async function main() {
  const doc = await loadCourierDoc()
  const now = new Date().toISOString()

  for (const r of await scrapeAllCourierRates()) {
    if (r.ok && r.perKgUsd != null) doc.rates[r.id] = { perKgUsd: r.perKgUsd, scrapedAt: now }
    // A failed scrape keeps the last good value: stale but correct beats garbage.
  }

  const oldestReview = Math.min(...Object.values(doc.reviews).map(r => new Date(r.checkedAt).getTime()), Infinity)
  if (!Number.isFinite(oldestReview) || Date.now() - oldestReview > WEEK_MS) {
    doc.reviews = await refreshGoogleReviews(doc.reviews)
  }

  doc.opinions = await refreshOpinions()
  doc.updatedAt = now
  await saveCourierDoc(doc)
  console.log(`[couriers] rates=${Object.keys(doc.rates).length} reviews=${Object.keys(doc.reviews).length} opinions=${Object.keys(doc.opinions).length}`)
  process.exit(0)
}

main().catch(e => {
  console.error('[couriers] sync failed', e)
  process.exit(1)
})
```

`ecosystem.config.js` — add after `currency-sync`:

```js
{
  // Courier tier-list data: tariffs + Reddit daily, Google reviews weekly.
  // 08:15 UTC ≈ 05:15 Uruguay.
  name: "currency-couriers",
  autorestart: false,
  exec_mode: "fork",
  script: "dist/sync_couriers.js",
  cron_restart: "15 8 * * *",
  log_date_format: "YYYY-MM-DD HH:mm Z",
},
```

`index.ts` — add the route beside the other `getJson` routes (keep the swagger JSDoc block in the style of the neighbours):

```ts
server.getJson("couriers", async (): Promise<any> => {
  return await redisCache.getOrSet(
    "couriers",
    async () => buildCouriersPayload(await loadCourierDoc()),
    1800
  );
});
```

- [ ] **Step 4: Run the tests — they pass**

Run: `npm test -- tests/couriers/endpoint.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the whole backend suite, then commit**

Run: `npm test`
Expected: PASS (no regressions in the existing suites)

```bash
git add sync_couriers.ts ecosystem.config.js index.ts classes/couriers/payload.ts tests/couriers/endpoint.test.ts
git commit -m "feat(couriers): daily sync job + public GET /couriers endpoint"
```

---

### Task 6: Deploy the backend and confirm it serves

The `app/` deploy runs from CI on push to main. **The root backend does not** — it is manual, and a stale `dist` fails silently (this is exactly how the Prex USD scraper broke: the build was old and the missing dependency never surfaced).

- [ ] **Step 1: Confirm the envs the job needs are on the VPS**

`CASAS_REVIEWS_GMAPS_URL` (reused for the Places proxy), `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `MONGODB_URI`, `REDIS_URL`.

The Places proxy URL is **not** in the local `.env` — it lives only on the VPS. Read it there; do not guess it.

- [ ] **Step 2: Deploy**

```bash
ssh root@104.234.204.107 -p 2223
cd /root/cambio-uruguay
git pull
npm install
npm run build
pm2 start ecosystem.config.js --only currency-couriers
pm2 restart currency-server
```

- [ ] **Step 3: Run the job once by hand and read its output**

```bash
pm2 restart currency-couriers && pm2 logs currency-couriers --lines 50 --nostream
```

Expected: a line `[couriers] rates=9 reviews=N opinions=M`. If `rates=0`, the scraper is broken — do not proceed.

- [ ] **Step 4: Confirm the endpoint actually serves**

```bash
curl -s https://api.cambio-uruguay.com/couriers | head -c 400
```

Expected: JSON with a non-empty `couriers` array and a recent `updatedAt`. **Do not start Task 7 until this returns real data** — the front-end proxy is built against this contract.

---

### Task 7: The scoring core (front, pure, unit-tested)

**Files:**
- Create: `app/utils/courierTierlist.ts`
- Create: `app/tests/unit/courierTierlist.test.ts`

**Interfaces:**
- Consumes: `courierImport` from `~/utils/importTax` (already implements the regime: franquicia vs. prestación única, the USD 20 minimum, the threshold on the invoice total); `round` from `~/utils/calculators`.
- Produces:
  - `type DimId = 'precio' | 'cumplimiento' | 'atencion' | 'reputacion' | 'transparencia' | 'cobertura'`
  - `type TierId = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'`
  - `type EntityKind = 'courier' | 'marketplace' | 'postal' | 'express'`
  - `COURIER_RUBRIC: readonly RubricDimension[]` (weights: precio 26, cumplimiento 20, atencion 16, reputacion 15, transparencia 13, cobertura 10 — sum 100)
  - `interface Package { weightKg: number; valueUsd: number; origin: 'us' | 'eu' | 'cn' | 'ar'; interior: boolean }`
  - `quoteUsd(e: CourierEntity, pkg: Package): Quote | null`
  - `interface Quote { freight: number; handling: number; tspu: number; clearance: number; interior: number; taxes: number; total: number; breakdown: Array<{ label: string; amount: number }> }`
  - `scoreFor(e: CourierEntity, active: readonly DimId[], pkg: Package, quotes: Map<string, Quote | null>): { score: number; dims: Array<{ id: DimId; score: number | null; weight: number }> }`
  - `tierForScore(score: number): TierId`
  - `rankEntities(active, pkg): RankedEntity[]`, `buildBoard(active, pkg): TierRow[]`
  - `PROFILE_PRESETS` (e.g. "El más barato", "Que llegue rápido", "Que no me clave", "Traigo del interior")

- [ ] **Step 1: Write the failing tests — the price engine first**

`app/tests/unit/courierTierlist.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  COURIER_RUBRIC,
  DIM_IDS,
  quoteUsd,
  scoreFor,
  tierForScore,
  type CourierEntity,
  type Package,
} from '~/utils/courierTierlist'

const pkg = (over: Partial<Package> = {}): Package => ({
  weightKg: 2,
  valueUsd: 100,
  origin: 'us',
  interior: false,
  ...over,
})

const tiered: CourierEntity = {
  id: 'test',
  name: 'Test',
  kind: 'courier',
  identity: '',
  tagline: '',
  tariff: {
    quoteOnly: false,
    // 0–1 kg flat US$ 10; 1–5 kg US$ 20/kg; 5+ kg US$ 15/kg
    tiers: [
      { maxKg: 1, flat: 10 },
      { maxKg: 5, perKg: 20 },
      { maxKg: null, perKg: 15 },
    ],
    handlingUsd: 5,
    tspuPct: 10,
    clearanceUsd: null,
    interiorUsd: 10,
    booksPerKg: null,
    insuranceIncluded: false,
    freeStorageDays: null,
    originsPerKg: {},
    transit: null,
    notes: '',
    source: '',
    verifiedOn: '2026-07-12',
  },
  google: { found: false, rating: null, reviewCount: null, placeId: null, listingName: null, mapsUrl: null, trustworthy: false },
  reddit: { sample: 'none', net: null, opinions: null, summary: null, quotes: [] },
  scores: { cumplimiento: 70, atencion: 60, transparencia: 80, cobertura: 50 },
  signals: [],
  flags: [],
  pros: [],
  cons: [],
  bestFor: '',
  verdict: '',
  sources: [],
}

describe('the rubric', () => {
  it('weighs 100 in total', () => {
    expect(COURIER_RUBRIC.reduce((a, d) => a + d.weight, 0)).toBe(100)
  })
})

describe('quoteUsd', () => {
  it('uses the flat price of the sub-kilo tier, not a per-kg rate', () => {
    const q = quoteUsd(tiered, pkg({ weightKg: 0.4, valueUsd: 30 }))!
    expect(q.freight).toBe(10)
  })

  it('prices the tier the weight actually falls into', () => {
    const q = quoteUsd(tiered, pkg({ weightKg: 2 }))!
    expect(q.freight).toBe(40) // 2 kg × US$ 20
  })

  it('takes the tier boundary inclusively — 5 kg is still the 1–5 kg tier', () => {
    expect(quoteUsd(tiered, pkg({ weightKg: 5 }))!.freight).toBe(100) // 5 × 20, not 5 × 15
    expect(quoteUsd(tiered, pkg({ weightKg: 5.1 }))!.freight).toBeCloseTo(76.5) // 5.1 × 15
  })

  it('adds handling, then the TSPU on top of freight+handling', () => {
    const q = quoteUsd(tiered, pkg({ weightKg: 2 }))!
    expect(q.handling).toBe(5)
    expect(q.tspu).toBeCloseTo(4.5) // 10% of (40 + 5)
  })

  it('adds the interior surcharge only when the package goes to the interior', () => {
    expect(quoteUsd(tiered, pkg())!.interior).toBe(0)
    expect(quoteUsd(tiered, pkg({ interior: true }))!.interior).toBe(10)
  })

  it('taxes via courierImport — the courier freight is NOT part of the taxable invoice', () => {
    const cheapFreight = quoteUsd(tiered, pkg({ weightKg: 0.4, valueUsd: 100 }))!
    const dearFreight = quoteUsd({ ...tiered, tariff: { ...tiered.tariff, tiers: [{ maxKg: null, perKg: 300 }] } }, pkg({ weightKg: 0.4, valueUsd: 100 }))!
    expect(cheapFreight.taxes).toBe(dearFreight.taxes) // freight changed, tax did not
  })

  it('returns null for a quote-only operator instead of inventing a price', () => {
    const express = { ...tiered, tariff: { ...tiered.tariff, quoteOnly: true, tiers: [] } }
    expect(quoteUsd(express, pkg())).toBeNull()
  })
})

describe('scoreFor', () => {
  it('re-normalises the weights over the active dimensions', () => {
    const out = scoreFor(tiered, ['cumplimiento', 'atencion'], pkg(), new Map())
    const sum = out.dims.filter(d => d.score != null).reduce((a, d) => a + d.weight, 0)
    expect(sum).toBeCloseTo(100)
  })

  it('drops a dimension with no evidence instead of scoring it zero', () => {
    // `tiered` has no Google listing and no Reddit sample → reputacion is absent.
    const out = scoreFor(tiered, DIM_IDS, pkg(), new Map())
    const rep = out.dims.find(d => d.id === 'reputacion')!
    expect(rep.score).toBeNull()
    // and the entity is NOT punished for it: its overall is the same as scoring without it
    const without = scoreFor(tiered, DIM_IDS.filter(d => d !== 'reputacion'), pkg(), new Map())
    expect(out.score).toBeCloseTo(without.score)
  })
})

describe('tierForScore', () => {
  it('maps the boundaries', () => {
    expect(tierForScore(85)).toBe('S')
    expect(tierForScore(84.9)).toBe('A')
    expect(tierForScore(0)).toBe('F')
  })
})
```

- [ ] **Step 2: Run them, watch them fail**

Run: `cd app && npx vitest run tests/unit/courierTierlist.test.ts`
Expected: FAIL — cannot find `~/utils/courierTierlist`.

- [ ] **Step 3: Implement the module**

Follow the shape of `app/utils/bankTierlist.ts` (rubric → per-entity scores → `rankEntities` → `buildBoard` → presets), with three courier-specific pieces:

1. `quoteUsd(e, pkg)`: pick the tier whose `maxKg` is the first `>= pkg.weightKg` (`null` = open-ended); a tier with `flat` charges that price outright, a tier with `perKg` charges `perKg × weightKg`; honour `minChargeUsd`; use `originsPerKg[pkg.origin]` when the operator publishes a different rate for that origin; add `handlingUsd` (×1.22 when `handlingPlusIva`); add `tspuPct` % of (freight + handling); add `clearanceUsd` and, when `pkg.interior`, `interiorUsd`. Then call `courierImport({ value: pkg.valueUsd, shipping: freight + handling + tspu + clearance + interior, origin: pkg.origin === 'us' ? 'usa' : 'other' })` and take its `landedCost` / tax lines. Return `null` when `tariff.quoteOnly`.
2. `priceScore`: over the entities that produced a quote for THIS package, the cheapest total scores 100 and the dearest 0, linear in between (`100 * (max - total) / (max - min)`, guarding `max === min`). Entities with no quote get `null` — absent, not zero.
3. `reputationScore`: blend the Google rating (`(rating - 1) / 4 * 100`, weighted by `min(reviewCount / 300, 1)` as a confidence factor) with the Reddit net (`(net + 100) / 2`), weighting Google 60 / Reddit 40 when both exist. `null` when the listing is not `trustworthy` **and** the Reddit sample is `none`.

`scoreFor` collects each dimension's score (`null` = absent), re-normalises the weights of the present ones to 100, and returns the weighted average.

- [ ] **Step 4: Run the tests — they pass**

Run: `cd app && npx vitest run tests/unit/courierTierlist.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add app/utils/courierTierlist.ts app/tests/unit/courierTierlist.test.ts
git commit -m "feat(couriers): package-aware price engine and re-weightable tier scoring"
```

---

### Task 8: The catalogue + the API proxy

**Files:**
- Create: `app/utils/courierCatalogue.ts` (the 21 verified records — data only)
- Modify: `app/server/api/couriers.get.ts` (proxy the backend, fall back to the seed)
- Delete: `app/server/utils/courierScraper.ts`, `app/server/utils/courierRatesStore.ts`, `app/server/tasks/couriers/scrape.ts`
- Modify: `app/nuxt.config.ts` (drop the `couriers:scrape` scheduled task)
- Modify: `app/utils/courierShipping.ts` (keep `COURIERS` for the import calculator; re-derive it from the catalogue so there is ONE source of truth for rates)

**Interfaces:**
- Consumes: `GET https://api.cambio-uruguay.com/couriers` (Task 5).
- Produces: `COURIER_ENTITIES: readonly CourierEntity[]` (the seed), and `/api/couriers` → `{ couriers: CourierEntity[]; updatedAt: string | null }` with live rates/reviews/opinions layered over the seed.

- [ ] **Step 1: Write the catalogue**

Transcribe every record from `docs/superpowers/research/2026-07-12-couriers-tierlist.md` into `COURIER_ENTITIES`. Rules, restated because this is where they get violated: a field the research could not verify is `null` and named in the doc's data-gaps list; `scores.cumplimiento | atencion | transparencia` are `null` where the evidence base was too thin; `google.trustworthy` is `false` for any listing that was not confirmed by name (Correo Uruguayo's, notably — the researcher pinned Casilla Mía's listing).

- [ ] **Step 2: Write the failing test for the proxy fallback**

`app/tests/unit/courierCatalogue.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { COURIER_ENTITIES } from '~/utils/courierCatalogue'

describe('the catalogue', () => {
  it('has no duplicate ids', () => {
    const ids = COURIER_ENTITIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never carries a rating for a listing we could not confirm', () => {
    for (const e of COURIER_ENTITIES) {
      if (!e.google.trustworthy) expect(e.google.rating).toBeNull()
    }
  })

  it('never publishes a Reddit net without a sample to back it', () => {
    for (const e of COURIER_ENTITIES) {
      if (e.reddit.sample === 'none') expect(e.reddit.net).toBeNull()
    }
  })

  it('quotes only from sentences that carry a permalink', () => {
    for (const e of COURIER_ENTITIES) {
      for (const q of e.reddit.quotes) expect(q.permalink).toMatch(/^https:\/\/reddit\.com\//)
    }
  })

  it('every tariff cites the URL it was read from', () => {
    for (const e of COURIER_ENTITIES) {
      if (!e.tariff.quoteOnly) expect(e.tariff.source).toMatch(/^https?:\/\//)
    }
  })
})
```

- [ ] **Step 3: Run it**

Run: `cd app && npx vitest run tests/unit/courierCatalogue.test.ts`
Expected: PASS once the catalogue is transcribed faithfully. A failure here means a record carries a number it did not earn — fix the record, not the test.

- [ ] **Step 4: Rewrite the API route as a proxy**

`app/server/api/couriers.get.ts`:

```ts
// Live courier data from the root backend (which owns all sync), merged over the static seed so
// the page still renders — with honest "verificado el …" dates — when the backend is unreachable.
import { COURIER_ENTITIES } from '~/utils/courierCatalogue'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const live = await $fetch<{ couriers: LiveCourier[]; updatedAt: string | null }>(
        `${base}/couriers`,
        { timeout: 8000 }
      )
      return { couriers: mergeLive(COURIER_ENTITIES, live.couriers), updatedAt: live.updatedAt }
    } catch {
      return { couriers: COURIER_ENTITIES, updatedAt: null }
    }
  },
  { maxAge: 60 * 30, name: 'couriers', getKey: () => 'all' }
)
```

`mergeLive` overlays, per id: the scraped `perKgUsd` onto the first per-kg tier, the Google snapshot (only when `shouldAccept`-clean and the seed marks the listing trustworthy), and the opinions block. It never overwrites a seed value with a null.

- [ ] **Step 5: Delete the Nitro sync**

Remove `app/server/utils/courierScraper.ts`, `app/server/utils/courierRatesStore.ts`, `app/server/tasks/couriers/scrape.ts`, `app/tests/unit/courierScraper.test.ts` (ported in Task 2), and the `'15 8 * * *': ['couriers:scrape']` line in `app/nuxt.config.ts`.

- [ ] **Step 6: Run the app suite**

Run: `cd app && npx vitest run`
Expected: PASS. Any suite still importing the deleted modules must be updated, not skipped.

- [ ] **Step 7: Commit**

```bash
git add app/utils/courierCatalogue.ts app/server/api/couriers.get.ts app/nuxt.config.ts app/tests/unit
git rm app/server/utils/courierScraper.ts app/server/utils/courierRatesStore.ts app/server/tasks/couriers/scrape.ts app/tests/unit/courierScraper.test.ts
git commit -m "feat(couriers): verified catalogue + backend-backed API, retire the Nitro scraper"
```

---

### Task 9: The page — package inputs, rubric chips, the S–F board

**Files:**
- Modify: `app/pages/couriers-uruguay.vue`
- Create: `app/components/couriers/PackageForm.vue`
- Create: `app/components/couriers/CourierCard.vue`
- Create: `app/components/couriers/TierBoard.vue`

**Interfaces:**
- Consumes: `buildBoard`, `quoteUsd`, `COURIER_RUBRIC`, `PROFILE_PRESETS`, `KIND_LABELS` (Task 7); `/api/couriers` (Task 8).

- [ ] **Step 1: `PackageForm.vue`** — peso (kg), valor (US$), origen (EE.UU. / Europa / China / Argentina), destino (Montevideo / interior). `v-model` on a `Package`. Debounce the numeric inputs by ~200 ms so the board does not thrash while the reader types.

- [ ] **Step 2: `CourierCard.vue`** — per entity: name + kind chip, tagline, **the total cost of the reader's package** with its breakdown (flete, manejo, TSPU, despacho, impuestos) in an expandable panel, the per-dimension score bars, the Google stars + review count linked to the listing, the Reddit net + one quote with its permalink, the red flags, and — where a dimension is absent — an explicit "sin muestra suficiente" chip instead of an empty bar. A quote-only operator shows "Cotiza a pedido", never a fabricated total.

- [ ] **Step 3: `TierBoard.vue`** — rows S→F (every tier rendered, even empty, so the scale reads), entities sorted best→worst inside a row.

- [ ] **Step 4: Wire the page** — replace the current table section with: `PackageForm` → preset chips + dimension toggles + kind filter → `TierBoard`. Keep the existing comparison table below the board (it is useful and it is already correct), plus the notes, the sources and the CTA to the import calculator.

- [ ] **Step 5: Verify in the real app**

Run: `cd app && npm run dev`, open `/couriers-uruguay`. Change the weight from 0.5 kg to 10 kg and confirm the board **re-orders** (the cheap-per-kg operators with a high handling fee should fall on a light package and rise on a heavy one). Toggle "Reputación" off and confirm the entities with no sample stop being penalised.

- [ ] **Step 6: Commit**

```bash
git add app/pages/couriers-uruguay.vue app/components/couriers
git commit -m "feat(couriers): package-driven S–F tier board on /couriers-uruguay"
```

---

### Task 10: Opinions, methodology, schema

**Files:**
- Modify: `app/pages/couriers-uruguay.vue`
- Create: `app/components/couriers/OpinionsSection.vue`
- Create: `app/components/couriers/Methodology.vue`

- [ ] **Step 1: `OpinionsSection.vue`** — the real Reddit quotes, grouped by theme (demoras, cargos sorpresa, aduana, atención), each with its permalink, date, subreddit and upvotes. Head the section with the honest framing: Reddit over-represents the angry, the sample is thin for the small operators, and part of the 2026 anger at Tiendamia is about the import *regime*, not the service.

- [ ] **Step 2: `Methodology.vue`** — the weights, how each dimension is scored, and **what we cannot measure**: a Google rating measures the counter, not the flight; Reddit volume favours the big operators; the editorial dimensions are our judgement and the reader can switch them off.

- [ ] **Step 3: Schema + SEO** — extend the existing JSON-LD `@graph` with a `FAQPage` (the questions the corpus actually shows people asking: "¿cuál es el courier más barato?", "¿qué pasa si Aduana me retiene el paquete?", "¿conviene Tiendamia o comprar en Amazon y traerlo por courier?") and keep the `ItemList` + `BreadcrumbList`. Update the title/description to mention the tier list.

- [ ] **Step 4: Commit**

```bash
git add app/pages/couriers-uruguay.vue app/components/couriers
git commit -m "feat(couriers): sourced opinions section, methodology and FAQ schema"
```

---

### Task 11: Verify end to end

- [ ] **Step 1: e2e**

Create `app/tests/e2e/couriers-tierlist.spec.ts`. Gate on hydration with `expect(...).toPass()` retries — the board is interactive and a naive first click lands before hydration (this bit us on the import cart and on `/mapa`).

Cover: the board renders every tier row; changing the package weight re-orders it; toggling a dimension re-tiers it; an entity with no Reddit sample shows "sin muestra suficiente" and not a score; a quote-only operator shows "Cotiza a pedido".

Run: `cd app && npx playwright test tests/e2e/couriers-tierlist.spec.ts`

- [ ] **Step 2: Nav + sitemap coverage**

`/couriers-uruguay` is already registered in `app/utils/siteNav.ts` — confirm the coverage test still passes: `cd app && npx vitest run tests/unit/siteNav.test.ts`.

- [ ] **Step 3: Light-mode contrast**

The page is dark-first. Run the forced-light axe sweep for this route and fix any contrast node it reports:

```bash
cd app && node scripts/lightmode-axe.mjs --route /couriers-uruguay
```

Expected: 0 violations. (Watch the score bars and the tonal tier chips — the brand green fails AA on a near-white card, which is why `.courier-rate` is already re-skinned in light mode.)

- [ ] **Step 4: Lint**

Run: `cd app && npm run lint`
Expected: clean. (Do **not** run `npm run typecheck` — vue-tsc crashes in this repo.)

- [ ] **Step 5: Commit and open the PR**

```bash
git add app/tests/e2e/couriers-tierlist.spec.ts
git commit -m "test(couriers): e2e for the tier board, hydration-gated"
```

Merge order matters: the backend must be deployed and `GET /couriers` serving (Task 6) **before** the front-end merges, or the page ships to production falling back to the seed on day one.
