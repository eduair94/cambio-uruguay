# Rate Trends & Stats — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design), pending implementation plan
**Scope:** Add four visit-driving rate-insight surfaces (dollar momentum, savings, records, multi-currency panel) on a shared, pure, unit-tested computation core.

## Goal

Increase visits (SEO + shareability + engagement) with rate insight built on existing data:

1. **Dólar momentum** — "el dólar hoy subió/bajó X%" with a 7-day sparkline; home module + a dedicated `/dolar-hoy` SEO page.
2. **Ahorro vs promedio** — "comprando US$X ahorrás $Y eligiendo la mejor casa vs el promedio" (shareable).
3. **Récords e históricos** — `/dolar/records`: máximo/mínimo histórico, hoy vs hace 1 año, promedio mensual.
4. **Panel multi-moneda** — USD/EUR/BRL/ARS best buy/sell + daily % + sparkline in one grid (on `/avanzado`).

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Benchmark for "el dólar" trend | BCU official series (`getEvolutionData('bcu','USD',period)`) — canonical "el dólar"; one lightweight fetch |
| Savings data | Current cross-casa data (best vs average), no history |
| Home perf | Momentum on home is a **lazy** client module with a skeleton (no CLS); full version on `/dolar-hoy` |
| Theme | Existing dark Vuetify theme; accessible up/down via icon+color (not color alone); reduced-motion-safe |
| Build | Subagent-driven, task-by-task, with review between tasks; deploy to main after verification |

## Architecture

```
utils/rateStats.ts   (PURE, unit-tested)
  computeMomentum(series) → { latest, prev, changePct, direction, sparkline[] }
  computeRecords(series)  → { max{value,date}, min{value,date}, yearAgo|null, monthlyAvg }
  computeSavings(amount, best, avg) → { savings, pct }

data sources (existing):
  useExchangeRates()                 → current best/avg per currency
  useApiService().getEvolutionData(origin,currency,type?,period) → { evolution: [{date,buy,sell}...] }

surfaces:
  components/DollarMomentum.vue   (home lazy module)
  pages/dolar-hoy.vue             (full SEO page: momentum + sparkline + savings + share/OG)
  components/SavingsHighlight.vue (amount input → savings)
  pages/dolar/records.vue         (records page)
  components/MultiCurrencyPanel.vue (grid, on /avanzado)
  components/Sparkline.vue        (tiny inline SVG sparkline, reduced-motion-safe)
```

## Components

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `utils/rateStats.ts` | Pure trend/record/savings math | nothing (Nuxt-free) |
| `utils/dollarSeries.ts` | Normalize `getEvolutionData` payload into `{date:string, value:number}[]` (buy mid or sell, configurable), tolerant of shape | `~/utils` types only |
| `composables/useDollarTrend.ts` | `useLazyAsyncData` wrapper fetching BCU USD series → `{ momentum, records, pending }` | useApiService, rateStats, dollarSeries |
| `components/Sparkline.vue` | Inline SVG sparkline from `number[]`; `aria-hidden`, honors `prefers-reduced-motion` | none |
| `components/DollarMomentum.vue` | Home module: best buy/sell + change badge + sparkline + link to `/dolar-hoy`; skeleton while pending | useDollarTrend, useExchangeRates, Sparkline |
| `components/SavingsHighlight.vue` | Amount input → savings vs average for USD; share | useExchangeRates, rateStats, ShareButtons |
| `components/MultiCurrencyPanel.vue` | Grid of 4 currencies: best buy/sell + daily % + sparkline | useExchangeRates, useApiService, Sparkline |
| `pages/dolar-hoy.vue` | SEO page assembling momentum + savings + CTA; OG image; FAQ/JSON-LD | the above |
| `pages/dolar/records.vue` | Records page; SEO + internal links | useDollarTrend |

## Data Flow

- **Momentum/Records:** `useDollarTrend` lazy-fetches `getEvolutionData('bcu','USD',period=6)` → `dollarSeries` normalizes → `computeMomentum`/`computeRecords`. Pending → skeleton.
- **Savings:** `useExchangeRates` gives `bestSell('USD')` (best price to buy USD) and the average sell across casas → `computeSavings(amount, best, avg)`.
- **Multi-currency panel:** current best buy/sell per currency from `useExchangeRates`; per-currency daily % + sparkline from a benchmark evolution fetch (USD: bcu; others: a representative origin or hidden if unavailable).

## Error Handling

- **Evolution fetch fails / empty** → momentum/records modules render a graceful "sin datos de tendencia" state; the page still shows current rates. `computeMomentum([])` returns `direction:'flat', changePct:0, sparkline:[]`.
- **No year-ago data** → `records.yearAgo = null`, the row hides.
- **Average == 0 or best ≥ avg** → `computeSavings` returns `{savings:0, pct:0}` (never negative shown).
- **Non-USD currency lacks a benchmark series** → that panel row shows current rates only, no sparkline (no error).

## Testing

- **Unit (`tests/unit/rate-stats.test.ts`, `dollar-series.test.ts`):** momentum up/down/flat, single-point & empty series, sparkline length; records max/min/monthlyAvg, missing year-ago; savings zero/negative/normal; series normalization tolerant of `{date,sell}` and missing fields.
- **E2E (`tests/e2e/dolar-hoy.spec.ts`):** `/dolar-hoy` renders the momentum badge (▲/▼ or "sin datos"), a sparkline `<svg>`, and the savings number for a typed amount; `/dolar/records` renders record rows; no console errors. Gated to run when the dev server is available (consistent with existing e2e).
- Components validated by `nuxt typecheck` + e2e (repo's Nuxt-free unit boundary).

## SEO / UX

- `/dolar-hoy`: title/description for "cotización del dólar hoy — ¿subió o bajó?", `defineOgImageComponent`, FAQ + `FAQPage`/`Dataset` JSON-LD, canonical, hreflang via i18n.
- `/dolar/records`: evergreen, internal links to `/dolar-hoy`, `/cotizacion/dolar`, `/historico`.
- Add both to the sitemap (data-driven; they're static routes — auto-included).
- Up/down uses `mdi-trending-up/-down` + green/red **and** text ("subió"/"bajó") for color-independent meaning. Skeletons prevent CLS. Sparkline `aria-hidden`, static under `prefers-reduced-motion`.
- i18n strings (es/en/pt) for all surfaces.

## Phase Boundaries

- **P1:** `rateStats` + `dollarSeries` + `Sparkline` + `useDollarTrend` + `DollarMomentum` (home) + `/dolar-hoy` + i18n + unit + e2e.
- **P2:** `SavingsHighlight` (+ on `/dolar-hoy` and home).
- **P3:** `/dolar/records`.
- **P4:** `MultiCurrencyPanel` on `/avanzado`.

## Out of Scope (YAGNI)

- Crypto/stablecoin rates.
- Per-casa historical best (uses BCU benchmark, not best-across-casas history).
- User-configurable chart ranges beyond the default period.
- Real-time websockets (the site refreshes every 10 min).
