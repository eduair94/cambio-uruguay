# Design — Data-grounded FAQ + FAQPage schema (GEO)

**Date:** 2026-06-16
**Status:** Approved (design), pending implementation plan
**Goal:** Add a data-grounded FAQ surface so search/AI engines (Google AI Overviews, Gemini, ChatGPT, Perplexity) cite cambio-uruguay.com as a source for currency-rate questions, attracting referral traffic.

## Problem & intent

Users (and increasingly AI answer engines) ask natural-language questions like "¿a cuánto está el dólar hoy en Uruguay?". The site has the live data to answer these authoritatively but exposes no question-shaped, machine-citable content. Generative engines preferentially cite pages that (a) state a direct answer up front, (b) mark it up with `FAQPage` JSON-LD, and (c) stay fresh.

"meta faq y faq" is interpreted as **one content set, two outputs**: the *faq* (visible human-readable Q&A) and the *meta faq* (the `FAQPage` JSON-LD + meta the engines parse). Visible text and markup are generated from the same source so they always match (a Google requirement).

This is a **GEO play**: we want to be cited *by* engines, not to query engines live.

## Decisions (locked during brainstorming)

1. **FAQ type:** Data-grounded. Curated questions; answers auto-fill with live market data. `FAQPage` JSON-LD on every surface.
2. **Placement:** Dedicated hub page **plus** contextual embeds on home and per-currency historico pages. One reusable component.
3. **Locales:** All three (es default, en, pt) — consistent with existing trilingual SEO + sitemap.
4. **Answer generation:** Deterministic core (computed from data, zero hallucination) **plus** one optional, fail-graceful AI "market context" sentence per key answer. The AI sentence is **qualitative only** (orientation/trend) — it must never restate or contradict the deterministic numbers.

## Architecture

### 1. Cached Nitro data route — `app/server/api/faq.get.ts`
Mirrors the proven `where-to-change.get.ts` pattern.

- `defineCachedEventHandler`, `maxAge ≈ 10 min`, `staleMaxAge` for serve-while-revalidate, cache key by `lang`.
- Query param: `lang` (normalized to `es|en|pt`, default `es`).
- Fetches live rates from `config.public.apiBase` (`https://api.cambio-uruguay.com`).
- Builds answers **deterministically** via a pure helper (see §5), reusing `app/utils/recommendation.ts` (`rankExchanges`) and raw min/max/avg stats.
- Optionally appends one AI context sentence per key answer by reusing the existing `/ai/insights` (`type: custom`) endpoint, exactly like `where-to-change`. Wrapped in try/catch → on any failure the answer is just the deterministic part. The AI prompt is constrained to a single qualitative sentence and must not output specific rate numbers.
- Returns `{ generatedAt: ISO, items: [{ id, question, answer }] }`.
- **Fail-graceful:** if the rates API is down, live items are dropped and the evergreen items are still returned, so the page is never empty.

The full answer string (deterministic + any AI sentence) is assembled server-side and cached as one unit, guaranteeing visible text === schema text.

### 2. Reusable component — `app/components/Faq/FaqBlock.vue`
- Props: `items: { id, question, answer }[]`, `heading?: string`, `emitSchema?: boolean` (default `true`).
- Renders a visible accordion (Vuetify expansion panels / `<details>`), answer-first.
- When `emitSchema`, injects `FAQPage` JSON-LD via the existing `$seo.generateFAQData(items)` → `useHead`. Visible Q&A and schema both derive from the same `items` prop.
- Single component reused by the hub page and every embed.

### 3. Hub page — `app/pages/preguntas-frecuentes.vue`
- `useFetch('/api/faq', { query: { lang } })`.
- Full `<FaqBlock>` with all items.
- `$seo.setupPageSEO(...)`: title/description/canonical/OG/Twitter + `BreadcrumbList`, plus the `FAQPage` schema from the block.
- i18n: `es` at `/preguntas-frecuentes` (no prefix), `/en/preguntas-frecuentes`, `/pt/preguntas-frecuentes` (strategy `prefix_except_default`). Question/label strings live in `app/i18n/locales/{es,en,pt}.ts`; dynamic numbers are filled by the route per locale.

### 4. Contextual embeds
- **Home (`app/pages/index.vue`):** a `<FaqBlock>` with a USD-focused subset (today's rate, where to buy, where to sell) + its own scoped `FAQPage` schema.
- **Per-currency historico page (`app/pages/historico/[origin]/[currency]/[[type]].vue`):** a currency-specific subset + scoped schema.
- Each embed pulls from the same `/api/faq` payload (filtered by `id`) to avoid divergence.

### 5. Pure answer-builder helper — `app/utils/faqAnswers.ts`
- Signature roughly: `buildFaqItems(rates, lang, opts) → { id, question, answer }[]`.
- No I/O, no AI — pure function over rates + locale labels. This is the unit-tested core.
- The Nitro route calls this, then (optionally) decorates key items with the AI sentence.

### 6. Sitemap — `app/server/api/__sitemap__/urls.get.ts`
Add `addUrlsForAllLocales('/preguntas-frecuentes', 0.7, 'hourly')` so all three locale URLs are discoverable.

## Question set

Lead-with-the-answer, ≤2–3 sentences each (passage-extractable). Each is one `Question`/`Answer` pair in the schema.

**Live (data-grounded):**
- ¿A cuánto está el dólar hoy en Uruguay? — venta mínima, compra máxima, promedio, fecha.
- ¿Dónde conviene comprar dólares hoy? — casa con menor venta (+ ahorro vs promedio).
- ¿Dónde conviene vender dólares hoy? — casa con mayor compra.
- ¿Cuál es la cotización del euro / real / peso argentino hoy? — por moneda.
- ¿Cuál es el spread del dólar hoy y quién tiene el menor? — spread promedio + mejor casa.

**Evergreen (static, still in schema):**
- ¿Qué diferencia hay entre BILLETE, CABLE, TRANSFERENCIA e INTERBANCARIO? — reuse existing `typeReference` copy from `ai_service.ts`.
- ¿Cada cuánto se actualizan las cotizaciones? — cada ~10 minutos.
- ¿De dónde salen los datos? — BCU + casas de cambio del país.
- ¿Cómo se elige la mejor casa de cambio? — método (mejor cotización por operación, spread).

Where an answer recommends an action, append a short italic "información orientativa, no asesoramiento financiero" line, consistent with `where-to-change`.

## Error handling

| Failure | Behavior |
|---|---|
| Rates API down | Live items dropped; evergreen items + their schema still served. Page never empty. |
| AI sentence fails/times out | Answer = deterministic part only. No error surfaced. |
| `/api/faq` route errors | Page renders evergreen-only static fallback (shipped in the page) so crawlers still get content + schema. |

## Testing

- **Unit:** `buildFaqItems` pure helper — rates in → expected answer strings/ids out (covers empty data, single currency, missing currency).
- **Schema:** assert `$seo.generateFAQData(items)` yields valid `FAQPage` shape (`@type`, `mainEntity[].acceptedAnswer.text`) and that every `answer` is non-empty.
- **Route:** `/api/faq?lang=es|en|pt` returns items for each locale; live-down path returns evergreen subset.
- **Consistency:** visible answer text matches the schema `acceptedAnswer.text` (same source array).

## Out of scope (YAGNI)

- Live search/AI widget answering arbitrary user questions (rejected: not a citation play).
- `llms.txt` / additional GEO assets — separate follow-up if desired.
- User-submitted questions / voting.

## Files touched

- New: `app/server/api/faq.get.ts`, `app/components/Faq/FaqBlock.vue`, `app/pages/preguntas-frecuentes.vue`, `app/utils/faqAnswers.ts`, test file(s).
- Edit: `app/pages/index.vue`, `app/pages/historico/[origin]/[currency]/[[type]].vue`, `app/server/api/__sitemap__/urls.get.ts`, `app/i18n/locales/{es,en,pt}.ts`.
- Reuse (no change): `app/plugins/seo-utils.ts` (`generateFAQData`, `setupPageSEO`), `app/utils/recommendation.ts`.
