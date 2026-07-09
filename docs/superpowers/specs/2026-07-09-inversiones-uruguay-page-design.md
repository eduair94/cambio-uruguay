# Inversiones Uruguay — guide page design

## Goal

A single-page, one-stop guide for Uruguayan residents on where and how to invest money: local
bank/broker accounts, fintech, international brokers accessible from UY, local fixed income,
local investment funds, crypto, mandatory pension (AFAP, informational), and a brief real-estate
section. Modeled on the existing `prestamos-uruguay.vue` + `utils/loans.ts` pattern (comparison
table + narrative + sources + FAQ schema), which already proved out for a similarly
regulation-sensitive financial topic.

## Non-goals

- No live scraping/cron refresh in this iteration (static, dated snapshot — like loans page).
  Live refresh is a possible future iteration, noted as such on the page.
- No personalized recommendation engine or account-linking.
- No coverage of insurance products, mortgages, or business financing (out of scope; loans page
  already covers credit).

## Route & files

- Page: `app/pages/inversiones-uruguay.vue`
- Data: `app/utils/investments.ts` (pure data + helpers, no Vue/Nuxt — mirrors `utils/loans.ts`)
- Optional: reuse `utils/reviews.ts` `ReviewSource`/`starParts` for reputation display, same as
  loans page.
- Add to `Footer.vue` nav and `server/api/__sitemap__/urls.get.ts`, same as `prestamos-uruguay`.

## Data model (`utils/investments.ts`)

```ts
type InvestmentCategory =
  | 'banco_broker'       // bank-operated brokerage/investment accounts
  | 'fintech'             // Prex Inversiones and similar
  | 'broker_internacional'// eToro, XTB, IBKR, IOL, Balanz, InterBrokers/BolsaEnLinea
  | 'renta_fija_local'    // plazo fijo, LRM (BCU), bonos del Tesoro/UI
  | 'fondo_inversion'     // local FCI (República AFISA, SURA, etc.)
  | 'cripto'              // exchanges usable from UY
  | 'afap'                // mandatory pension — informational, not discretionary
  | 'inmobiliario'        // brief editorial only, no row-level data required

interface InvestmentOption {
  id: string
  name: string
  category: InvestmentCategory
  riskLevel: 'bajo' | 'medio' | 'alto' | 'variable'
  minInvestment: { amount: number | null; currency: 'UYU' | 'USD' | 'UI' } | null
  currencyOptions: string[]           // e.g. ['UYU','USD']
  feesNote: string                    // fee structure summary, since fees rarely fit one number
  regulation: 'bcu' | 'exterior_regulado' | 'no_regulado' | 'no_aplica'
  regulationNote: string
  taxNote: string                     // IRPF/IRNR treatment summary
  online: boolean
  website: string
  source: string                      // URL backing the key facts
  note?: string
  rating: number | null
  reviewsNote?: string
  reviewSources: ReviewSource[]
}
```

Row-level table data covers categories 1–6 (banco_broker, fintech, broker_internacional,
renta_fija_local, fondo_inversion, cripto). `afap` and `inmobiliario` get editorial sections only
(single entities / not a comparable market — AFAP has exactly 4 providers by law, real estate
crowdfunding in UY is nascent and better explained than tabulated).

## Page structure

1. Hero + breadcrumb + share buttons (same visual pattern as loans page, own gradient color)
2. Intro paragraph: what this guide covers, "informational, verified as of [date]" label
3. **Risk framework callout**: short explainer of bajo/medio/alto/variable before the tables, so
   every subsequent table's risk column is legible without repeated explanation
4. Per-category comparison group (desktop table / mobile cards), same as loans page groups,
   for the 6 tabular categories, each preceded by a short narrative paragraph (how to open an
   account, typical fees, who it's for)
5. **AFAP section** (editorial, no table): what it is, the 4 providers, why it's mandatory vs
   discretionary savings, link to BPS/BCU sources
6. **Inmobiliario section** (editorial, no table): direct rental basics + note on crowdfunding
   platform availability in UY (research to confirm if any operate locally)
7. **Taxes section**: IRPF on rentas de capital (mobiliario) for residents, IRNR for
   nonresidents, key exemptions (e.g. BEVSA-negotiated public debt), link to DGI/BCU sources
8. Disclaimer alert (same tone as loans page: informational, not advice, no affiliation, risk
   varies drastically by instrument — crypto and stocks can lose value, plazo fijo does not)
9. Sources section (deduped links, official + review sources)
10. CTA linking to relevant existing calculators (`calculadora-plazo-fijo`,
    `calculadora-inflacion`, `conversor-de-monedas`) where applicable
11. FAQPage + BreadcrumbList + ItemList JSON-LD, same as loans page

## Research process

Before writing `investments.ts` content, dispatch parallel research (deep-research /
general-purpose agents) per category to verify against primary sources:

- Bank broker offerings (Itaú, Santander, BROU, Scotia, BBVA) — account types, min investment,
  fees, BCU registration
- Fintech (Prex Inversiones et al.)
- International brokers accessible from UY — legal status for UY residents, KYC requirements,
  fee structures, regulatory home jurisdiction
- Local fixed income — current plazo fijo reference rates, LRM mechanics, Tesoro bond access
  (via BEVSA/broker)
- Local FCI providers and their fee/risk profile
- Crypto exchange availability + UY regulatory stance (no dedicated crypto law as of research
  date — confirm)
- AFAP: the 4 legal providers, mandatory contribution mechanics
- Tax treatment (IRPF rentas de capital rate, IRNR, key exemptions) — DGI as primary source

Each finding must carry its source URL, following the existing `note`/`source` convention in
`loans.ts` — do not state a rate/fee/regulatory claim without a citable source; if unverifiable,
record `null`/"no publicado" rather than guessing, exactly as `loans.ts` already does for
lenders that don't publish their TEA.

## Risks / open questions resolved during brainstorming

- Scope confirmed as broad (bank/fintech brokers + local fixed income + funds + crypto +
  alternative), hybrid table+editorial format, static data now with live-refresh deferred,
  full research pass before writing.
- Regulatory accuracy and an explicit non-advice disclaimer are required — this is real financial
  content for real decisions.

## Testing

- Same as other content pages: `npm run lint`, manual visual check in dev server (light + dark
  theme), verify table renders on mobile (card view) and desktop, verify JSON-LD parses, verify
  no horizontal scroll (recurring gotcha per `lightmode-contrast-audit` memory).
