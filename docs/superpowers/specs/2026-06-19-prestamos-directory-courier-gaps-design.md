# Loan directory + courier gap-fill — design

Date: 2026-06-19
Status: approved (pending spec review)

## Goal

Add two researched, sourced comparison features to cambio-uruguay, both reusing the
existing **seed catalog → scraper overlay → cached API → comparison page** architecture
already proven by the courier feature (`couriers-uruguay.vue` + `courierShipping.ts` +
`courierScraper.ts` + `courierRatesStore.ts` + `couriers.get.ts` + `tasks/couriers/scrape.ts`):

1. **Loan directory** at `/prestamos-uruguay` — a researched comparison of where to request a
   personal/consumer loan in Uruguay (banks, financieras, cooperativas, fintech), with advertised
   rates, requirements, an aggregated reputation rating, and cited sources (official sites + Reddit /
   Trustpilot / Google reviews).
2. **Courier gap-fill** — research and fill the missing per-kg rates for the `null`-rate couriers
   (Miami Box, Urubox, EXUR), add any couriers not yet listed, and add an aggregated reputation
   dimension (rating + review summary + sources) to the courier comparison.

Both are research-heavy and **subagent-driven**: parallel research subagents gather sourced data;
every rate/rating must carry a backing URL. Unverifiable figures stay `null` / "Consultar" and are
never invented.

## Decisions (from brainstorming)

- Loan page form: **directory + comparison page**, mirroring `couriers-uruguay.vue` (not an
  interactive filter tool, not folded into the existing calculator).
- URL: **`/prestamos-uruguay`** (top-level, like `/couriers-uruguay`).
- Lender scope: **all four categories** — banks, financieras/créditos, cooperativas, fintech.
- Loan data freshness: **live scraping**, implemented as the courier-style seed + scrape-overlay
  (scrape where the lender publishes TEA in HTML; otherwise the verified seed value stands).
- Reputation display: **0–5 stars + an explicit "según reseñas" label + clickable source links**,
  for both lenders and couriers.
- Scope now: **both features, full build**, one branch.

## Feature A — Loan directory `/prestamos-uruguay`

### Data model — `app/utils/loans.ts` (pure TS, mirrors `courierShipping.ts`)

```ts
export type LenderType = 'banco' | 'financiera' | 'cooperativa' | 'fintech'

export interface ReviewSource { label: string; url: string }

export interface Lender {
  id: string
  name: string
  type: LenderType
  /** Representative advertised annual effective rate (TEA) in %, or null when quote-only. */
  teaPct: number | null
  /** Currency the loan is issued in. */
  currency: 'UYU' | 'USD' | 'UI'
  /** Max advertised loan amount in `currency`, or null when not published. */
  maxAmount: number | null
  /** Max term in months, or null when not published. */
  maxTermMonths: number | null
  /** Key requirements as short bullets (e.g. "Ser mayor de 18", "Recibo de sueldo"). */
  requirements: string[]
  /** True when the whole application can be done online. */
  online: boolean
  /** Official website. */
  website: string
  /** URL backing the rate / info. */
  source: string
  /** Tiered-rate / surcharge / eligibility caveats. */
  note?: string
  /** Aggregated reputation 0–5 from reviews, or null when too few reviews to rate. */
  rating: number | null
  /** One-line qualitative summary of review sentiment. */
  reviewsNote?: string
  /** Links backing the reputation (Reddit threads, Trustpilot, Google, news). */
  reviewSources: ReviewSource[]
}

export const LENDERS: Lender[] = [ /* researched, sourced */ ]

export const LENDER_TYPES: Readonly<Record<LenderType, string>>  // display labels
export function lendersByType(): Array<{ type; label; items: Lender[] }>
export function getLender(id: string): Lender | undefined
export function teaLabel(n: number | null): string   // "X,X %" | "Consultar"
```

Lender candidates to research (final list driven by what is verifiable):
- **Bancos**: BROU, Itaú, Santander, Scotiabank, BBVA, HSBC.
- **Financieras**: Creditel, Pronto!, OCA, República Microfinanzas, Microfin, Verticot,
  Crédito de la Casa, Emprendamos, Pilay/others if relevant.
- **Cooperativas**: FUCAC, FUCEREP, ANDA, ACAC (Cooperativa ACAC / Bandes).
- **Fintech**: Prex (where it offers credit), and any app-based lender found.

### Live-scrape stack (mirror courier files one-for-one)

- `app/server/utils/loanScraper.ts` — `RATE_PARSERS` keyed by lender `id` for lenders that publish
  their TEA in raw HTML. Pure `extract(text) => number | null` functions, tag-stripped input,
  plausibility band tuned for Uruguayan consumer TEA (UYU loans run far higher than courier rates;
  band roughly `TEA_MIN = 5`, `TEA_MAX = 250` — final band confirmed against BCU usury caps during
  implementation). Reuses the `stripHtml` / `toNum` / plausibility helpers' shape from the courier
  scraper.
- `app/server/utils/loanRatesStore.ts` — filesystem-backed store on a `loans` mount, key
  `rates.json`. Same golden rule: **only overwrite a TEA with a fresh successful scrape**; failures
  keep the previous good value. `getMergedLenders()` overlays stored TEA on the seed;
  `getRatesUpdatedAt()` for the "actualizado" label.
- `app/server/api/prestamos.get.ts` — `defineCachedEventHandler` (maxAge 30 min) with lazy bootstrap:
  scrape once if never scraped or stale > 2 days, fall back to seed on any error. Returns
  `{ lenders, updatedAt }`.
- `app/server/tasks/loans/scrape.ts` — `defineTask({ meta: { name: 'loans:scrape' }})`, registered
  in `nuxt.config.ts` `nitro.scheduledTasks` at a daily off-peak cron (e.g. `45 8 * * *`).

### Page — `app/pages/prestamos-uruguay.vue` (clone of `couriers-uruguay.vue`)

- Gradient header, intro, breadcrumb back to `/herramientas`.
- Info alert linking to `/herramientas/calculadora-prestamo` ("simulá la cuota").
- Comparison, grouped by lender type:
  - Desktop: `VTable` — columns: Entidad · Tipo · TEA (ref.) · Monto máx. · Plazo máx. · Requisitos · Reputación · Sitio.
  - Mobile: stacked cards (same data, `dl` specs), like the courier mobile cards.
  - Reputation cell: 0–5 stars + a small "según reseñas" caption; stars link to a per-lender
    sources list (Reddit/Trustpilot/Google).
- "Actualizado automáticamente el {date}" label fed by `updatedAt`.
- **Disclaimer**: rates are advertised/reference and change; this is informational, not financial
  advice; reminder about the BCU-published usury cap (tasas de interés de referencia) and to confirm
  the final CFT/TEA with the lender. No affiliation.
- **Fuentes y referencias** block: official sources + review sources, deduplicated.
- `useSeoMeta` + `defineOgImageComponent('Cambio', …)` + JSON-LD `@graph` with `ItemList`,
  `BreadcrumbList`, and an `FAQPage` (2–4 Q&As: "¿Dónde pedir un préstamo en Uruguay?",
  "¿Qué requisitos piden?", "¿Cuál tiene la tasa más baja?", "¿Cuánto es la tasa máxima legal?").

## Feature B — Courier gap-fill (`courierShipping.ts` + `couriers-uruguay.vue`)

1. **Fill missing rates**: research published per-kg / handling rates for `miami-box`, `urubox`,
   `exur`; set `perKgUsd` / `baseUsd` / `note` where verifiable (else leave `null` + keep
   "Consultar"). Add any couriers found that are not yet listed (each with a `source`).
2. **Reputation dimension**: extend the `Courier` interface with optional
   `rating?: number | null`, `reviewsNote?: string`, `reviewSources?: ReviewSource[]`
   (import `ReviewSource` from `loans.ts` or define a shared type in a small `utils/reviews.ts`).
   Populate from research. Backward-compatible — fields optional, existing couriers unaffected if
   absent.
3. **Page**: add a **Reputación** column (desktop) / row (mobile) to `couriers-uruguay.vue`
   rendering 0–5 stars + "según reseñas" + per-courier review source links. Extend the existing
   "Fuentes y referencias" block to include the new review sources.
4. **Scraper**: add a `RATE_PARSERS` entry for any newly-filled courier **only** when its rate is in
   raw HTML (no JS calculator). Otherwise the seed value stands (documented in the file header, as
   already done for Aerobox/Punto Mío/Miami Box).

## Research approach (subagent-driven)

Dispatch parallel research subagents (general-purpose, with WebSearch + WebFetch). Each returns a
**structured, sourced** result block (markdown table or JSON), one source URL per datum:

- **Loan subagent ×4** (one per category: bancos / financieras / cooperativas / fintech): for each
  lender — advertised TEA (+ currency), max amount, max term, requirements, online?, official source
  URL, and a reputation summary with 2+ review-source URLs (Reddit r/uruguay threads, Trustpilot,
  Google reviews, press).
- **Courier subagent ×1–2**: (a) published rates for Miami Box / Urubox / EXUR + any missing
  couriers with sources; (b) reputation summary + review sources for the courier set.

Rules enforced on subagent output:
- Every rate/rating cites a URL; no URL ⇒ value is `null` / "Consultar".
- Prefer official tariff pages for rates; reviews for reputation only.
- Note the access date; rates labelled "verificado junio 2026".

The main agent assembles subagent output into the TS catalogs (no blind copy — sanity-check
plausibility and dedupe sources).

## Wiring

- `app/components/Footer.vue` — add a `/prestamos-uruguay` link near the existing `/herramientas`
  link (and a `/couriers-uruguay` link if not already present).
- `app/server/api/__sitemap__/urls.get.ts` — add
  `addUrlsForAllLocales('/prestamos-uruguay', 0.7, 'weekly')`.
- `app/pages/herramientas/index.vue` and/or `calculadora-prestamo.vue` — cross-link to the new
  directory (a card or CTA), mirroring how the import calculator links to couriers.

## Testing & verification

- **Unit (vitest)**, mirroring `tests/unit/courierScraper.test.ts`:
  - `loans.ts` helpers (`lendersByType`, `getLender`, `teaLabel`, catalog integrity: unique ids,
    every lender has ≥1 source, rating in 0–5 or null).
  - `loanScraper` parsers against captured HTML fixtures (representative-rate extraction +
    plausibility rejection of out-of-band values).
  - Extend courier tests: new couriers have sources; reputation fields well-formed.
- **Lint** (`npm run lint`) and **typecheck/build** clean.
- Optional: Playwright smoke render of `/prestamos-uruguay` and `/couriers-uruguay`.

## Out of scope / YAGNI

- No interactive filter/sort tool for loans (directory only).
- No per-lender detail pages (single comparison page; sources link out).
- No automated review scraping (reputation is a verified, sourced snapshot; only rates scrape).
- No i18n translation of the new page bodies beyond the existing locale routing already applied to
  other Spanish-first pages (page is Spanish, consistent with couriers-uruguay).

## File checklist

New:
- `app/utils/loans.ts`
- `app/utils/reviews.ts` (shared `ReviewSource` type) — optional, only if sharing the type
- `app/server/utils/loanScraper.ts`
- `app/server/utils/loanRatesStore.ts`
- `app/server/api/prestamos.get.ts`
- `app/server/tasks/loans/scrape.ts`
- `app/pages/prestamos-uruguay.vue`
- `app/tests/unit/loanScraper.test.ts`, `app/tests/unit/loans.test.ts`

Changed:
- `app/utils/courierShipping.ts` (fill rates, add reputation fields, add couriers)
- `app/server/utils/courierScraper.ts` (parsers for newly HTML-scrapable couriers, if any)
- `app/pages/couriers-uruguay.vue` (reputation column/row, sources)
- `app/nuxt.config.ts` (`loans:scrape` schedule)
- `app/components/Footer.vue`
- `app/server/api/__sitemap__/urls.get.ts`
- `app/pages/herramientas/index.vue` and/or `app/pages/herramientas/calculadora-prestamo.vue`
- `app/tests/unit/courierScraper.test.ts`
