# Prestamos: daily Gemini-backed rate refresh for all lenders

## Problem

`app/pages/prestamos-uruguay.vue` already has a daily scheduled task
(`loans:scrape`, cron `45 8 * * *`) and a rates store with never-regress-on-failure
semantics. But `loanScraper.ts` only has regex parsers for 3 of the 23 lenders
in `LENDERS` (oca, pronto, cash) — the rest render TEA behind JS quote forms and
fall back to the static, hand-verified-June-2026 values baked into
`app/utils/loans.ts`. Those 20 other lenders silently go stale forever; the
"daily scraper" claim is only true for ~13% of the catalogue.

## Goal

Get a daily-refreshed, cited TEA for as many of the 23 lenders as possible,
using Gemini's `google_search` grounding (already proven in `geminiNews.ts`) as
the source for lenders with no regex parser, while keeping the existing
never-regress-on-failure guarantee and plausibility band.

## Approach

**Per-lender fallback chain, run daily by the existing `loans:scrape` task:**

1. If the lender has a `TEA_PARSERS` entry (oca/pronto/cash) → try the existing
   regex scrape first (cheap, precise, no LLM cost).
2. If there's no parser, or the regex attempt fails/implausible → ask Gemini.
3. If Gemini's answer fails validation → keep the last known good value
   (unchanged from today's behavior).

**Gemini lookup (`app/server/utils/loanGeminiRate.ts`):**

- One call per lender needing it (up to 20/day — same low-volume, once-daily
  budget as `geminiNews.ts`; no batching, so grounding citations stay unambiguous
  per-lender).
- Prompt includes the lender's name, `website`, and existing `source` URL, and
  asks for the **current advertised TEA for a personal/consumer loan**, forcing
  a `{ teaPct: number|null, sourceUrl: string|null }`-shaped answer grounded in
  `google_search`. If Gemini can't find a real grounded figure, it returns
  `teaPct: null` (mirrors the `SIN NOTICIAS` sentinel pattern in `geminiNews.ts`).
- Returns `null` (not a value) on any network/parse/missing-API-key failure —
  same graceful-degradation contract as the existing scraper and `geminiNews.ts`.

**Validation (stricter than today, applied to both regex and Gemini results):**

- Existing plausibility band, `TEA_MIN`–`TEA_MAX` (5–250%).
- Gemini results additionally require a grounding citation (`groundingChunks`),
  and the citation's hostname must match either the lender's `website` or
  `source` hostname (registrable domain compare, e.g. `oca.uy` matches
  `www.oca.uy`). This blocks Gemini citing an unrelated page/institution's rate.
  Regex results are exempt (the parser already targets the lender's own URL).
- Anything that fails validation is discarded for that day; the stored value is
  left untouched (existing golden rule).

**Store (`loanRatesStore.ts`) changes:**

- Existing `rates: Record<id, { teaPct, scrapedAt }>` stays as the "latest"
  fields the API/page already read — no breaking change to `MergedLender`/API
  shape.
- Add `history: Record<id, { date, teaPct, source, method }[]>`, one entry
  appended per **successful** scrape (regex or gemini). `date` is the UTC
  calendar day so re-runs on the same day overwrite that day's entry rather than
  duplicating. Unbounded growth is fine at 1 entry/lender/day — trims are a
  future concern, not this one.
- `method: 'regex' | 'gemini'` and `source: sourceUrl` are stored per entry so a
  future UI can show provenance / distinguish confidence.

**Task (`loans/scrape.ts`) orchestration change:**

- Replace the direct `scrapeAllLenderRates()` call with a new
  `refreshAllLenderRates()` in `loanScraper.ts` that implements the fallback
  chain above across all `lenderIds()`, not just `Object.keys(TEA_PARSERS)`.
- Cron schedule, task name, and task registration in `nuxt.config.ts` are
  unchanged.

## Out of scope

- No UI change to `prestamos-uruguay.vue` in this pass (history isn't rendered
  yet — it's stored for a future trend feature).
- No change to the 3 existing regex parsers.
- No retry/backoff beyond what `$fetch`'s default timeout already gives
  `geminiNews.ts`-style calls.
- No cross-lender rate-limit throttling — 20 sequential/parallel Gemini calls
  once a day is well under any quota concern at this volume.

## Testing

- Unit tests for `loanGeminiRate.ts`: mocked Gemini responses — valid grounded
  match, ungrounded/no-citation reply, off-domain citation (rejected),
  implausible value (rejected), missing API key (returns null).
- Unit tests for the domain-match validator (registrable-domain compare edge
  cases: `www.` prefix, path-only vs host difference, mismatched host).
- Unit tests for `loanRatesStore.ts` history append: first entry, same-day
  overwrite, multiple lenders, failure leaves history untouched.
- Extend existing `loanScraper.test.ts` (or a new `loanFallback.test.ts`) for
  the fallback-chain orchestration: parser succeeds → gemini not called; parser
  fails → gemini called; no parser → gemini called; gemini fails → prior value
  kept.
