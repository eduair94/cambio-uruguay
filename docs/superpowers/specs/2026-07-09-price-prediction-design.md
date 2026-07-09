# Price prediction (AI analysis + external forecast comparison) — design

Date: 2026-07-09

## Goal

Add a currency-vs-UYU short-term "prediction" section to `/historico`: an AI-generated
directional lean with reasoning, plus (when available) a comparison against real
published external forecasts. Explicitly not a numeric price target — the site's own
guide content already states "nadie predice el dólar con certeza" and this feature must
stay consistent with that framing.

## Scope

- **Placement:** inside `/historico` (`app/pages/historico/index.vue`), a new section
  scoped to whichever single currency the user has filtered/selected (reuses existing
  `selectedCurrency` filter state — if multiple currencies selected, show nothing or
  prompt to narrow to one; exact UX left to implementation).
- **Currencies:** AI analysis runs for all currencies present in `/historico` data
  (~14). External forecast search only for USD/EUR/ARS/BRL vs UYU — other currencies
  simply never show that sub-section (not an error state).
- **Cadence:** daily, via a new Nitro scheduled task, same mechanism as the existing
  `drivers:daily` / move-explanation cron.
- **Out of scope for v1:** numeric price targets, historical accuracy tracking of past
  predictions, per-casa predictions (this is currency-level only, like move
  explanations), user-configurable prediction horizon.

## Architecture

Mirrors the existing move-explanation pipeline (`server/utils/moveExplanation.ts` +
`server/utils/geminiNews.ts` + `utils/geminiGrounding.ts`):

1. **New Nitro scheduled task** `server/tasks/predictions/daily.ts`, registered in
   `nuxt.config.ts` alongside `drivers:daily`, runs after it (drivers/news should be
   fresh before AI reasons about them). Loops over all currencies found in historico
   data.
2. **`server/utils/pricePrediction.ts`** — `recordTodayPrediction(currency, asOfOverride?)`:
   - Pulls recent price series (7d/30d/90d % change, simple volatility) from the same
     price data source `/historico` already uses.
   - Calls Gemini (with Google Search grounding, same `generateContent` + `google_search`
     tool pattern as `geminiNews.ts`) with a prompt that supplies those stats and asks
     for: directional lean (up/down/flat), confidence (low/med/high), 2-4 sentence
     Spanish reasoning. Prompt explicitly forbids inventing a specific future exchange
     rate and requires the reply to acknowledge market unpredictability.
   - Per-currency `DRIVER_CONTEXT`-style map (reusing/extending the one in
     `geminiNews.ts`) supplies currency-specific framing (BCU for USD, BCRA/Argentina for
     ARS, etc.); currencies without a specific entry fall back to generic global-macro
     framing (same fallback pattern already used for `EUR`/default in `geminiNews.ts`).
   - On failure/no-config/unparseable reply: `ai: null` — not an error, a valid "nothing
     today" state.
3. **`server/utils/externalForecasts.ts`** — `searchExternalForecasts(currency, date)`:
   - Only called for USD/EUR/ARS/BRL.
   - Gemini-grounded search prompt asking specifically for named, attributable,
     recently-published (≤30d) forecasts from banks/analysts/official sources (e.g. BCU's
     "Encuesta de Expectativas") for that currency vs UYU (or vs USD as a fallback
     reference if no UYU-specific source found).
   - Sentinel pattern identical to `isNoNewsText`: if Gemini can't find a real citable
     source, it must reply exactly `'SIN PRONOSTICOS'` → function returns `[]`.
   - Every returned item must carry `source`, `link`, and `summary` extracted the same
     way `extractGroundedHeadlines` builds real citations from `groundingChunks` /
     `groundingSupports` — never a bare Gemini paraphrase without a backing source.
4. **Persistence** — new model `server/models/PricePrediction.ts`:

   ```ts
   interface PricePredictionDoc {
     currency: string
     date: string // 'YYYY-MM-DD', Montevideo day
     ai: {
       lean: 'up' | 'down' | 'flat'
       confidence: 'low' | 'medium' | 'high'
       reasoning: string
       basedOn: { period: '7d' | '30d' | '90d'; pctChange: number }[]
     } | null
     externalForecasts: {
       source: string
       link: string
       direction: 'up' | 'down' | 'flat' | null
       summary: string
     }[]
   }
   ```

   Unique index on `(currency, date)`, upserted — idempotent re-runs, same as
   `MoveExplanation`.

5. **API** — `server/api/predictions/[currency].get.ts`: returns the most recent doc
   with `date <= today` (not strictly "today's" doc — covers a missed/failed cron day
   without surfacing an error to the frontend).
6. **Frontend** — new section in `app/pages/historico/index.vue`, scoped to the single
   selected currency:
   - Always-visible, non-dismissible disclaimer banner (es/en/pt), phrased consistently
     with existing guide copy ("no es asesoramiento financiero", "el mercado es
     impredecible").
   - AI lean shown as a directional chip/arrow + confidence label + reasoning text —
     never a bare number presented as a headline claim.
   - External forecasts list shown only when non-empty for that currency; each item
     links out to its source.
   - When `ai` is `null` and `externalForecasts` is `[]`, the whole section renders a
     neutral "no hay análisis disponible hoy" state, not an error.

## Error handling

- Per-currency `try/catch` in the daily task loop — one currency's AI-analysis or
  external-forecast failure never blocks other currencies or the other sub-step, same
  isolation pattern as `server/tasks/drivers/daily.ts`. Errors collected into the task's
  return value for cron log visibility, not thrown.
- No automatic retry for a fully-missed cron day; the API's "most recent doc ≤ today"
  fallback absorbs the gap, matching how `MoveExplanation` gaps are already tolerated.
- `ai: null` / `externalForecasts: []` are expected, valid states — never logged as
  errors, never shown as errors to the user.

## Testing

- Unit tests for prompt builders and the `'SIN PRONOSTICOS'` sentinel-detection helper,
  mirroring `tests/unit/geminiGrounding.test.ts`.
- `recordTodayPrediction` accepts an `asOfOverride` param (same shape as
  `recordTodayExplanation`) purely for local/manual backfill verification against a known
  historical date — never passed by the production cron caller.
- No live Gemini calls in CI; grounding/network calls mocked.

## Open questions for implementation plan

- Exact UX when the `/historico` currency filter has 0 or >1 currencies selected
  (recommend: section hidden unless exactly one currency is selected).
- Whether Gemini's structured-output/JSON mode (vs. free-text parsing like
  `geminiNews.ts` currently does) is available/worth using for the `ai` block's
  lean/confidence fields — check `server/utils/ai.ts` for existing structured-call
  support before deciding.
- Trilingual disclaimer copy (es/en/pt) needs to be drafted alongside implementation,
  consistent with existing guide language.
