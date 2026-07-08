# Gemini-Grounded Auto News Fetch — Design

## Goal

The daily move-explanation cron (`recordTodayExplanation`, one call per currency
in `app/server/tasks/drivers/daily.ts`) currently produces, for a notable move
day:
- an AI narrative built **only** from measured driver attribution (never
  references news, to avoid the wormgpt provider hallucinating headlines)
- headlines only for USD, and only whatever happens to be in that day's
  already-scraped Uruguay dollar/economy RSS archive (`PriceNewsModel`,
  unrelated to the specific move) — EUR/ARS never get headlines.

This is the automatic version of the honesty gap that the Phase 4 backfill
project closed manually via WebSearch subagents for 39 historical moves. This
spec closes it **going forward**: real, cited, dated news for USD/EUR/ARS
notable-move days, fetched automatically, with the same "never fabricate"
guarantee — using Gemini's Google Search grounding tool as the automated
stand-in for manual WebSearch research.

## Scope

- Forward daily cron only (`recordTodayExplanation`, already runs for
  `['USD', 'EUR', 'ARS']`).
- The existing manual `/api/analysis/backfill` endpoint (used for the 39-move
  historical backfill) is untouched — it stays the tool for one-off,
  higher-effort historical research.
- No new UI work: `MovesTimeline.vue` already renders `headlines`/`narrative`
  from `MoveExplanationModel` regardless of how they were populated (shipped
  in the Phase 4 UI-wiring fix).

## Architecture

### New file: `app/server/utils/geminiNews.ts`

```ts
export interface MoveNewsResult {
  headlines: { title: string; source: string; link: string }[]
  narrative: string | null
}

export async function searchMoveNews(
  currency: string,
  date: string,
  pctChange: number,
  direction: 'up' | 'down' | 'flat',
  drivers: { key: string; dayMovePct: number }[]
): Promise<MoveNewsResult | null>
```

- Reads `useRuntimeConfig().geminiApiKey`. Returns `null` immediately if unset
  (mirrors `aiConfigured()` / `chatCompletion`'s early-return pattern in
  `ai.ts` — no key configured is not an error, just "feature off").
- Calls the Gemini `generateContent` REST endpoint with the Google Search
  grounding tool enabled. **Verified live during design (2026-07-08) against
  the provided key:**
  `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}`,
  body `{"contents":[{"parts":[{"text": PROMPT}]}], "tools":[{"google_search":{}}]}`.
  `gemini-2.5-flash` (non-preview, stable) confirmed available for this key and
  supports grounding. Real smoke test on 2026-01-26 USD (the BCU 100bp cut)
  returned the correct real story, matching the manual backfill research —
  confirms this genuinely finds real news, not just plausible-sounding text.
- Prompt (single user-role message, Spanish, mirrors the manual WebSearch
  subagent prompts used for the historical backfill):

  > "El {currency}/UYU {subió|bajó} {abs(pctChange)}% el {date}. Ese día se
  > movieron estos indicadores: {driverLines}. Buscá noticias reales,
  > fechadas ese día o +/-1 día, que puedan explicar este movimiento.
  > Considerá: para USD, BCU y drivers globales (Fed, aranceles, geopolítica);
  > para EUR, BCE/eurozona además de los mismos drivers globales de USD (el
  > EUR/UYU se ancla en BROU, no en BCU); para ARS, BCRA/Argentina (bandas
  > cambiarias, cepo, elecciones) además de efectos globales. Si no encontrás
  > nada realmente relevante, respondé exactamente 'SIN NOTICIAS'. Si
  > encontrás algo, escribí una explicación breve (2-3 frases, en español),
  > basada solo en lo que encontraste — no inventes causas ni datos."

- **Headline extraction — verified live shape, differs from a naive reading
  of the field names**:
  - `groundingChunks[i].web.uri` is a real, working
    `vertexaisearch.cloud.google.com/grounding-api-redirect/...` link that
    redirects to the actual source article — not the raw article URL itself,
    but a real, stable, clickable link to real content (this is the
    documented, standard shape of Gemini grounding citations, not a bug to
    work around).
  - `groundingChunks[i].web.title` is just the bare domain (e.g.
    `"busqueda.com.uy"`), **not the article's actual headline text** — Gemini
    does not expose the source's real headline in this field.
  - `groundingSupports[]` maps narrative text segments to the chunk indices
    that back them (`{segment: {text, endIndex}, groundingChunkIndices: number[]}`).
    Use this to build an honest "title" substitute per chunk: for each chunk
    index, take the `groundingSupports` segment that cites it most
    specifically (fewest total `groundingChunkIndices` on that segment;
    earliest occurrence breaks ties), truncated to ~140 chars. This is real,
    grounded, AI-paraphrased text tied to a real source — not the outlet's
    exact original headline, but not fabricated either. `source` = the
    chunk's domain (`web.title`, stripped of a leading `www.`). `link` =
    `web.uri` (the redirect link).
  - Cap at 3 headlines (chunks), same as the manual backfill's per-move cap.
- **Narrative extraction**: `candidates[0].content.parts[].text` joined. If
  the text is exactly (or startswith, case-insensitive) `"SIN NOTICIAS"`,
  treat as "nothing found" → return `null` (triggers the existing fallback
  path in the caller) rather than storing a useless narrative with no
  headlines. **In practice this is rare** — a second live smoke test on a
  low-signal/uncertain date still returned a real, grounded, plausible macro
  narrative rather than "SIN NOTICIAS" (same behavior a human analyst has:
  there's almost always *something* going on in FX markets). This is
  acceptable — the honesty guarantee is "don't fabricate," not "return
  nothing on uncertain days" — but means the fallback path will fire mainly
  on hard failures (network/parse errors, no grounding chunks at all), not
  routinely on "nothing relevant" days.
- Any HTTP/parse error or empty grounding chunks → return `null`. No retries
  (daily cron; a persisting move gets a fresh attempt the next day it's
  still notable).

### Modified: `app/server/utils/moveExplanation.ts` (`recordTodayExplanation`)

Current flow (after detecting today is a notable-move day):
1. Compute attribution via `attributeMove`.
2. Build narrative via `chatTextWithFallback` (attribution-only prompt).
3. Take headlines from `buildAnalysis`'s already-loaded archived-feed
   headlines (USD only).
4. Upsert.

New flow:
1. Compute attribution via `attributeMove` (unchanged — needed either way for
   the `drivers` field and as the fallback narrative's input).
2. Call `searchMoveNews(currency, asOf, today.pctChange, today.direction, drivers)`.
3. **If it returns a result**: use its `headlines` and `narrative` (the
   grounded, news-citing version).
4. **If it returns `null`**: fall back to exactly today's existing behavior —
   archived-feed headlines (USD only) + `chatTextWithFallback` attribution-only
   narrative.
5. Upsert (unchanged shape — `MoveExplanationModel` already has the right
   fields, no schema migration needed).

### Modified: `app/nuxt.config.ts`

Add alongside the existing `ai` block, following the exact same
build-time-baked pattern as `driversIngestToken`/`ai.apiKey` (raw
`process.env` reads empty at pm2 runtime in this deployment — this bit us
once already on this exact codebase, see `driversIngestToken`'s history):

```ts
geminiApiKey: process.env.NUXT_GEMINI_API_KEY || '',
```

VPS deploy step: add `NUXT_GEMINI_API_KEY=<key>` to the server's `.env`,
then a real `npx nuxt build` (via `deploy.sh`, not a bare `pm2 reload`) to
bake it in.

## Error Handling

- No Gemini key configured → `searchMoveNews` returns `null` immediately →
  behavior identical to today (safe no-op, not a broken feature).
- Gemini API error/timeout/malformed response → caught, `null` → same
  fallback.
- Gemini finds nothing real → explicit `null` (not an empty-but-truthy
  result) → same fallback, never stores a narrative with no backing
  headlines.

## Testing

- `searchMoveNews` is a live network call to an external API — verified live
  (real smoke-test calls against the provided key, covering: a real historical
  notable-move day with known real news e.g. 2026-01-26 USD BCU rate cut, to
  confirm the grounding + parsing actually surfaces it; and a fabricated
  low-signal input to confirm graceful `null` on a "nothing real found" case),
  not unit-tested with mocks — matches this repo's established
  `server/utils/**` convention (e.g. `ai.ts`'s `chatCompletion` has no unit
  test either).
- If grounding-chunk-to-headline parsing ends up nontrivial (hostname → source
  name cleanup, dedup), extract that piece as a pure function in
  `app/utils/**` and unit-test it normally — matches the pure-util vs
  server-glue split already used throughout this codebase.
- `recordTodayExplanation`'s branching (Gemini result vs fallback) is
  exercised live the same way the rest of that function already is (per
  existing repo convention — no prior unit tests for this function either).

## Out of Scope (YAGNI)

- No retry/backoff logic for Gemini failures.
- No change to the manual backfill endpoint.
- No new admin/monitoring UI for this — failures are silent, safe no-ops.
- No caching layer — this fires at most 3x/day (USD/EUR/ARS), only on
  notable-move days, which historically (last 24 months) is roughly
  12-15 times per currency — call volume is trivial.
