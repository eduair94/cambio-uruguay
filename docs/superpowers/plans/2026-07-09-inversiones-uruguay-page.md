# Inversiones Uruguay Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/inversiones-uruguay`, a static, research-backed guide comparing where Uruguayans
can invest money — bank/fintech brokers, international brokers, local fixed income, local funds,
crypto, AFAP, and real estate — following the exact pattern already proven by
`prestamos-uruguay.vue` + `utils/loans.ts`.

**Architecture:** One pure-data file (`utils/investments.ts`, no Vue/Nuxt imports) holds the
catalog + helper functions, unit-tested directly. One page component
(`pages/inversiones-uruguay.vue`) renders comparison tables (desktop) / cards (mobile) grouped by
category, plus editorial sections for AFAP and real estate, an FAQ/BreadcrumbList/ItemList JSON-LD
block, and a disclaimer. Content is filled from a research pass (Task 1) whose findings live in a
tracked research notes file so every fact in `investments.ts` traces to a source URL.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, Vuetify (`VCard`, `VTable`, `VAlert`, `VIcon`,
`VBtn`), Vitest for unit tests, existing `utils/reviews.ts` (`ReviewSource`, `starParts`) reused
as-is.

## Global Constraints

- Spanish-only content (site convention for this content-page family — no i18n keys needed,
  same as `prestamos-uruguay.vue`).
- Every factual claim (rate, fee, min investment, regulatory status) needs a source URL in the
  `source` field; if unverifiable, the field is `null`/"no publicado", never guessed.
- No live scraping/cron in this iteration — static, dated snapshot, "verified as of [date]" label
  on page, same as loans page.
- `app/` uses `npm run lint`, not `npm run typecheck` (typecheck is broken via vue-tsc — known
  issue, don't try to fix it here).
- Follow existing dark/light theme CSS patterns (`.v-theme--light` overrides) — see
  `prestamos-uruguay.vue` `<style scoped>` for the exact recipe (card backgrounds, chip colors,
  link colors using `rgb(var(--v-theme-link))`).
- No horizontal scroll on any viewport (recurring regression per project history — verify with a
  manual check, same as `lightmode-axe.mjs` gate for other pages).

---

## File Structure

- **Create** `app/utils/investments.ts` — data + types + helpers (mirrors `app/utils/loans.ts`)
- **Create** `app/tests/unit/investments.test.ts` — unit tests for the catalog + helpers (mirrors
  `app/tests/unit/loans.test.ts`)
- **Create** `docs/research/2026-07-09-inversiones-uruguay-research.md` — research findings with
  source URLs, one section per category, feeding Task 2's data entry
- **Create** `app/pages/inversiones-uruguay.vue` — the page
- **Modify** `app/components/Footer.vue` — add nav link (near the `/prestamos-uruguay` link,
  line ~162)
- **Modify** `app/server/api/__sitemap__/urls.get.ts` — add sitemap entry (near the
  `/prestamos-uruguay` entry, line ~142)

---

### Task 1: Research pass — verified facts per category

**Files:**
- Create: `docs/research/2026-07-09-inversiones-uruguay-research.md`

**Interfaces:**
- Produces: a markdown file with one `##` section per category (`Bancos/corredores locales`,
  `Fintech`, `Brokers internacionales`, `Renta fija local`, `Fondos de inversión (FCI)`,
  `Cripto`, `AFAP`, `Inmobiliario`, `Impuestos`). Each entity gets: name, min investment, fee
  note, regulatory status, tax treatment, source URL(s), and — where findable — a public rating
  and its source. Task 2 reads this file directly; every row it writes into `investments.ts`
  must trace back to a line here.

- [ ] **Step 1: Dispatch parallel research agents, one per category**

  Use the `Agent` tool (general-purpose, run in parallel — independent categories, no shared
  state) with prompts specific to each category. Example for one category (repeat the pattern,
  substituting the category, for all 8):

  > "Research investment brokerage accounts offered by Uruguayan banks (Itaú Uruguay, Santander
  > Uruguay, BROU, Scotiabank Uruguay, BBVA Uruguay) for retail investors — buying stocks/bonds/
  > ETFs. For each bank that offers this: name of the product/service, minimum investment amount,
  > fee structure (commission per trade, custody fees, account maintenance), whether it's
  > BCU-regulated as a corredor de bolsa or similar, and the exact source URL for each fact (bank's
  > own site, BCU registry, or a citable secondary source). If a bank does not offer brokerage to
  > retail clients, say so explicitly with a source. Do not guess or extrapolate un-sourced numbers
  > — write 'no publicado' with the URL you checked instead. Report findings as a markdown list,
  > one entity per bullet, each fact-source pair inline."

  Categories and what each prompt must ask for:
  1. **Bancos/corredores locales**: Itaú, Santander, BROU, Scotiabank, BBVA — brokerage/investment
     accounts, min investment, fees, BCU corredor de bolsa registration.
  2. **Fintech**: Prex Inversiones and any other UY fintech offering investment products — same
     facts, plus what underlying custodian/broker they use.
  3. **Brokers internacionales**: eToro, XTB, Interactive Brokers, IOL Invertironline, Balanz,
     InterBrokers/BolsaEnLinea — legal status for UY residents (can they legally open an account?
     KYC requirements?), fee structure, home regulator (CySEC/FCA/SEC/etc — none are BCU-regulated
     since they're foreign), minimum deposit.
  4. **Renta fija local**: plazo fijo bancario reference rates (link BCU's published rates page),
     Letras de Regulación Monetaria (BCU) mechanics and how a retail investor accesses them, Bonos
     del Tesoro/Notas del Tesoro in UI/pesos and how to buy them (BEVSA, broker).
  5. **Fondos de inversión (FCI)**: local FCI providers (República AFISA, SURA, and any others
     findable), typical fee (management fee %), risk profile, minimum investment, regulatory
     oversight (BCU).
  6. **Cripto**: which exchanges are actually usable by UY residents (Binance, Lemon Cash, Buda,
     Bitfinex, etc.) — confirm which support UYU on/off-ramp vs USD-only, and Uruguay's current
     regulatory stance on crypto (is there a dedicated law/AML registration requirement as of
     2026?).
  7. **AFAP**: confirm the exact legal list of AFAP providers, mandatory contribution mechanics
     (% of salary, who must contribute), and whether/how a worker can choose or switch AFAP —
     source: BPS, BCU.
  8. **Impuestos**: IRPF rate on rentas de capital mobiliario for residents (dividends, interest,
     capital gains), IRNR treatment for nonresidents investing via UY entities, and any notable
     exemptions (e.g., interest on Uruguayan public debt) — source: DGI.

- [ ] **Step 2: Consolidate all agent outputs into the research file**

  Write the markdown file with the exact structure from "Produces" above. Every fact must carry
  its source URL inline (not just a bibliography at the bottom) so Task 2 can copy `source`
  fields directly.

- [ ] **Step 3: Spot-check 3 surprising or high-stakes claims manually**

  Pick 3 claims most likely to be wrong or to embarrass the site if wrong (e.g., "eToro accepts
  Uruguayan residents", any specific fee percentage, the IRPF rate). Fetch the cited source URL
  yourself (`WebFetch` or `Bash`+`curl`) and confirm the claim matches what's on the page. Fix any
  mismatch found before moving on.

- [ ] **Step 4: Commit**

```bash
git add docs/research/2026-07-09-inversiones-uruguay-research.md
git commit -m "docs(inversiones): research pass for investment platforms guide"
```

---

### Task 2: `utils/investments.ts` — data model + catalog + helpers

**Files:**
- Create: `app/utils/investments.ts`
- Test: `app/tests/unit/investments.test.ts`

**Interfaces:**
- Consumes: `docs/research/2026-07-09-inversiones-uruguay-research.md` (Task 1) for every fact
  written into the catalog; `ReviewSource` type and `starParts` from `app/utils/reviews.ts`
  (already exists, same import loans.ts uses: `import type { ReviewSource } from './reviews'`).
- Produces (consumed by Task 3, the page):
  - `type InvestmentCategory = 'banco_broker' | 'fintech' | 'broker_internacional' | 'renta_fija_local' | 'fondo_inversion' | 'cripto'`
    (the two editorial-only categories, `afap` and `inmobiliario`, are NOT part of this union —
    they get no catalog rows, only static prose in the page component)
  - `type RiskLevel = 'bajo' | 'medio' | 'alto' | 'variable'`
  - `type RegulationStatus = 'bcu' | 'exterior_regulado' | 'no_regulado'`
  - `interface InvestmentOption { id: string; name: string; category: InvestmentCategory; riskLevel: RiskLevel; minInvestment: { amount: number; currency: 'UYU' | 'USD' | 'UI' } | null; feesNote: string; regulation: RegulationStatus; regulationNote: string; taxNote: string; online: boolean; website: string; source: string; note?: string; rating: number | null; reviewsNote?: string; reviewSources: ReviewSource[] }`
  - `const INVESTMENT_CATEGORIES: Readonly<Record<InvestmentCategory, string>>` (display labels)
  - `const INVESTMENTS: InvestmentOption[]`
  - `function getInvestment(id: string): InvestmentOption | undefined`
  - `function investmentsByCategory(): Array<{ category: InvestmentCategory; label: string; items: InvestmentOption[] }>`
  - `function riskLabel(risk: RiskLevel): string` — returns `'Bajo'`, `'Medio'`, `'Alto'`,
    `'Variable'`
  - `function minInvestmentLabel(opt: InvestmentOption): string` — returns e.g. `'US$ 1.000'`,
    `'$ 5.000'`, `'UI 10.000'`, or `'Sin mínimo'` when `minInvestment` is `null`

- [ ] **Step 1: Write the failing test for the catalog invariants**

```ts
// app/tests/unit/investments.test.ts
import { describe, expect, it } from 'vitest'
import {
  INVESTMENTS,
  INVESTMENT_CATEGORIES,
  getInvestment,
  investmentsByCategory,
  riskLabel,
  minInvestmentLabel,
  type InvestmentOption,
} from '../../utils/investments'

describe('investments catalog', () => {
  it('has unique ids', () => {
    const ids = INVESTMENTS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every option has a source URL', () => {
    for (const i of INVESTMENTS) expect(i.source).toMatch(/^https?:\/\//)
  })
  it('rating is null or within 0..5', () => {
    for (const i of INVESTMENTS) {
      if (i.rating != null) {
        expect(i.rating).toBeGreaterThanOrEqual(0)
        expect(i.rating).toBeLessThanOrEqual(5)
      }
    }
  })
  it('every rated option cites at least one review source', () => {
    for (const i of INVESTMENTS) {
      if (i.rating != null) expect(i.reviewSources.length).toBeGreaterThan(0)
    }
  })
  it('covers all six tabular categories', () => {
    const cats = new Set(INVESTMENTS.map(i => i.category))
    expect([...cats].sort()).toEqual(
      [
        'banco_broker',
        'broker_internacional',
        'cripto',
        'fintech',
        'fondo_inversion',
        'renta_fija_local',
      ].sort()
    )
  })
  it('minInvestment is null or has a positive amount', () => {
    for (const i of INVESTMENTS) {
      if (i.minInvestment != null) expect(i.minInvestment.amount).toBeGreaterThan(0)
    }
  })
})

describe('investments helpers', () => {
  it('riskLabel maps every level to a capitalized Spanish label', () => {
    expect(riskLabel('bajo')).toBe('Bajo')
    expect(riskLabel('medio')).toBe('Medio')
    expect(riskLabel('alto')).toBe('Alto')
    expect(riskLabel('variable')).toBe('Variable')
  })
  it('minInvestmentLabel formats amount+currency or falls back to Sin mínimo', () => {
    const withAmount: InvestmentOption = {
      ...INVESTMENTS[0]!,
      minInvestment: { amount: 1000, currency: 'USD' },
    }
    expect(minInvestmentLabel(withAmount)).toBe('US$ 1.000')
    const noMin: InvestmentOption = { ...INVESTMENTS[0]!, minInvestment: null }
    expect(minInvestmentLabel(noMin)).toBe('Sin mínimo')
  })
  it('investmentsByCategory groups in INVESTMENT_CATEGORIES order with all options', () => {
    const groups = investmentsByCategory()
    expect(groups.map(g => g.category)).toEqual(Object.keys(INVESTMENT_CATEGORIES))
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(INVESTMENTS.length)
  })
  it('getInvestment finds by id', () => {
    expect(getInvestment(INVESTMENTS[0]!.id)?.id).toBe(INVESTMENTS[0]!.id)
    expect(getInvestment('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && npx vitest run tests/unit/investments.test.ts`
Expected: FAIL — `investments.ts` doesn't exist yet (module not found).

- [ ] **Step 3: Write `app/utils/investments.ts`**

Structure the file exactly like `app/utils/loans.ts`: a header comment stating this is pure data
with no Vue/Nuxt dependency, the type definitions from "Produces" above, the
`INVESTMENT_CATEGORIES` label map (six entries, in the display order the page should render:
`banco_broker`, `fintech`, `broker_internacional`, `renta_fija_local`, `fondo_inversion`,
`cripto`), then the `INVESTMENTS` array with one entry per entity confirmed in
`docs/research/2026-07-09-inversiones-uruguay-research.md` — copy each `source` URL and fact
straight from that file. For any entity the research file marked "no publicado", set the
corresponding field to `null` (numbers) or a short honest note (strings) rather than omitting the
entity. Include at minimum: 3+ entries for `banco_broker`, 1+ for `fintech`, 3+ for
`broker_internacional`, 2+ for `renta_fija_local` (plazo fijo + LRM/bonos), 1+ for
`fondo_inversion`, 2+ for `cripto` — exact count depends on what Task 1 actually found; do not
pad with unsourced entries just to hit a number.

End the file with the four helper functions (`getInvestment`, `investmentsByCategory`,
`riskLabel`, `minInvestmentLabel`), implemented directly (no external deps beyond
`Intl`/`toLocaleString`), e.g.:

```ts
export function riskLabel(risk: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    bajo: 'Bajo',
    medio: 'Medio',
    alto: 'Alto',
    variable: 'Variable',
  }
  return labels[risk]
}

export function minInvestmentLabel(opt: InvestmentOption): string {
  if (opt.minInvestment == null) return 'Sin mínimo'
  const { amount, currency } = opt.minInvestment
  const prefix = currency === 'USD' ? 'US$ ' : currency === 'UI' ? 'UI ' : '$ '
  return `${prefix}${amount.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}

export function investmentsByCategory(): Array<{
  category: InvestmentCategory
  label: string
  items: InvestmentOption[]
}> {
  return (Object.keys(INVESTMENT_CATEGORIES) as InvestmentCategory[]).map(category => ({
    category,
    label: INVESTMENT_CATEGORIES[category],
    items: INVESTMENTS.filter(i => i.category === category),
  }))
}

export function getInvestment(id: string): InvestmentOption | undefined {
  return INVESTMENTS.find(i => i.id === id)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && npx vitest run tests/unit/investments.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add app/utils/investments.ts app/tests/unit/investments.test.ts
git commit -m "feat(inversiones): add investment options catalog with sourced data"
```

---

### Task 3: `pages/inversiones-uruguay.vue` — the page

**Files:**
- Create: `app/pages/inversiones-uruguay.vue`

**Interfaces:**
- Consumes: everything exported from `app/utils/investments.ts` (Task 2) — `INVESTMENTS`,
  `investmentsByCategory`, `riskLabel`, `minInvestmentLabel`, `getInvestment`,
  `InvestmentOption`, `InvestmentCategory`; `starParts` from `app/utils/reviews.ts`.
- Produces: the route `/inversiones-uruguay`. Nothing downstream consumes this page as a module
  (Task 4 only links to it by path string).

- [ ] **Step 1: Scaffold the template structure**

Follow `app/pages/prestamos-uruguay.vue` section-by-section (breadcrumb → hero card with its own
gradient class `.bg-gradient-inversiones` → risk-framework `VAlert` → `v-for` category groups
with desktop `VTable` + mobile card fallback → AFAP editorial `VCard` section → Inmobiliario
editorial `VCard` section → Impuestos `VCard` section → disclaimer `VAlert` → sources `VCard` →
CTA `VCard` linking to `/herramientas/calculadora-plazo-fijo` and `/convertir`). Reuse the same
class names pattern (`prestamos-*` → `inversiones-*`) and the same star-rating markup block
(`lender-stars` → `investment-stars`) verbatim from `prestamos-uruguay.vue`, since that markup is
already accessibility-reviewed (has `aria-label`).

Table columns for each category group: Entidad, Riesgo (using `riskLabel`), Mín. inversión (using
`minInvestmentLabel`), Regulación (`regulationNote`), Comisiones (`feesNote`), Reputación (stars),
Sitio (`hostOf` link, same helper as loans page).

- [ ] **Step 2: Write the `<script setup>` block**

```ts
import {
  INVESTMENTS,
  INVESTMENT_CATEGORIES,
  investmentsByCategory,
  riskLabel,
  minInvestmentLabel,
  type InvestmentOption,
} from '~/utils/investments'
import { starParts } from '~/utils/reviews'

const localePath = useLocalePath()
const groups = computed(() => investmentsByCategory())

/** Bare host (without scheme / www) for compact source links. */
function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/** Icon per investment category, mirrors groupIcon() in prestamos-uruguay.vue. */
function groupIcon(category: string): string {
  const icons: Record<string, string> = {
    banco_broker: 'mdi-bank',
    fintech: 'mdi-cellphone-check',
    broker_internacional: 'mdi-earth',
    renta_fija_local: 'mdi-file-certificate-outline',
    fondo_inversion: 'mdi-chart-pie',
    cripto: 'mdi-bitcoin',
  }
  return icons[category] ?? 'mdi-finance'
}

const canonicalUrl = 'https://cambio-uruguay.com/inversiones-uruguay'
const title = 'Dónde invertir en Uruguay: guía completa de bancos, brokers, renta fija y cripto (2026)'
const description =
  'Guía completa para invertir en Uruguay: cuentas de inversión en bancos, Prex, brokers internacionales como eToro, renta fija local (plazo fijo, letras BCU, bonos), fondos de inversión, cripto, AFAP e inmobiliario. Riesgos, mínimos, comisiones e impuestos.'

defineOgImageComponent('Cambio', {
  title: 'Invertir en Uruguay',
  subtitle: 'Guía de bancos, brokers, renta fija, fondos y cripto',
  tag: 'GUÍA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'invertir en uruguay, inversiones uruguay, donde invertir uruguay, etoro uruguay, prex inversiones, itau inversiones, plazo fijo uruguay, letras de regulacion monetaria, afap uruguay, cripto uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            name: 'Opciones de inversión en Uruguay',
            itemListElement: INVESTMENTS.map((i, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: i.name,
              url: i.website,
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: 'https://cambio-uruguay.com' },
              { '@type': 'ListItem', position: 2, name: 'Inversiones en Uruguay', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Dónde puedo invertir mi dinero en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'En Uruguay podés invertir a través de cuentas de inversión en bancos (Itaú, Santander, BROU, Scotiabank, BBVA), fintech como Prex, brokers internacionales accesibles desde Uruguay (eToro, Interactive Brokers, IOL, Balanz), instrumentos de renta fija local (plazo fijo, Letras de Regulación Monetaria del BCU, bonos del Tesoro), fondos de inversión locales y exchanges de criptomonedas. Cada opción tiene distinto riesgo, mínimo de inversión y tratamiento impositivo.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuál es la opción de menor riesgo para invertir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El plazo fijo bancario y las Letras de Regulación Monetaria del BCU son las opciones de menor riesgo, ya que devuelven capital e interés pactado sin exposición a variaciones de mercado. Acciones, ETFs y criptomonedas tienen riesgo variable o alto, ya que su valor puede subir o bajar según el mercado.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo se pagan impuestos por invertir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Los residentes fiscales uruguayos pagan IRPF sobre las rentas de capital mobiliario (intereses, dividendos y ganancias de capital) generadas por sus inversiones, con algunas exoneraciones puntuales como ciertos títulos de deuda pública. Los no residentes están sujetos a IRNR. Consultá siempre con un contador y las publicaciones oficiales de la DGI antes de declarar.',
                },
              },
            ],
          },
        ],
      }),
    },
  ],
}))
```

(Fill the two Question/Answer bodies about specific instruments and the disclaimer text using the
exact facts recorded in `docs/research/2026-07-09-inversiones-uruguay-research.md` — the three
questions above are structural placeholders for content that Task 1's research must confirm
before this step is considered done; if research contradicts a sentence above, correct it here.)

- [ ] **Step 3: Add the `<style scoped>` block**

Copy `prestamos-uruguay.vue`'s `<style scoped>` block verbatim, renaming only the page-specific
class (`.bg-gradient-prestamos` → `.bg-gradient-inversiones`, pick a distinct gradient e.g.
`linear-gradient(135deg, #0f766e 0%, #1e3a8a 100%)`) and the `prestamos-*`/`lender-*` class
prefixes to `inversiones-*`/`investment-*`. Keep every rule (light-theme overrides, mobile card
layout, overflow-x guard) — these encode prior a11y/theme fixes and must not be dropped.

- [ ] **Step 4: Manual verification in dev server**

Run: `cd app && npm run dev`
Navigate to `http://localhost:3000/inversiones-uruguay` (adjust port if different). Check: page
renders with no console errors, tables show on desktop width, cards show on mobile width (resize
browser < 960px), toggle dark/light theme and confirm no low-contrast text, resize to 320px width
and confirm no horizontal scroll.

- [ ] **Step 5: Run lint**

Run: `cd app && npm run lint`
Expected: no errors on the new file (fix any reported issues before continuing).

- [ ] **Step 6: Commit**

```bash
git add app/pages/inversiones-uruguay.vue
git commit -m "feat(inversiones): add /inversiones-uruguay investment guide page"
```

---

### Task 4: Wire into navigation + sitemap

**Files:**
- Modify: `app/components/Footer.vue:162` (insert after the `/prestamos-uruguay` link)
- Modify: `app/server/api/__sitemap__/urls.get.ts:142` (insert after the `/prestamos-uruguay`
  entry)

**Interfaces:**
- Consumes: route path `/inversiones-uruguay` (string literal, produced by Task 3 — no code
  import, just the URL).

- [ ] **Step 1: Add the footer link**

In `app/components/Footer.vue`, immediately after the existing block:

```html
<NuxtLink :to="localePath('/prestamos-uruguay')" class="footer-link text-caption">
  Préstamos en Uruguay
</NuxtLink>
```

insert:

```html
<NuxtLink :to="localePath('/inversiones-uruguay')" class="footer-link text-caption">
  Inversiones en Uruguay
</NuxtLink>
```

- [ ] **Step 2: Add the sitemap entry**

In `app/server/api/__sitemap__/urls.get.ts`, immediately after:

```ts
addUrlsForAllLocales('/prestamos-uruguay', 0.7, 'weekly') // Loan directory comparison
```

insert:

```ts
addUrlsForAllLocales('/inversiones-uruguay', 0.7, 'weekly') // Investment options comparison guide
```

- [ ] **Step 3: Run the existing sitemap/footer tests if any reference the URL list**

Run: `cd app && npx vitest run tests/unit/casasDirectory.test.ts tests/unit/withdrawCash.test.ts`

(These are examples of tests that check sitemap URL lists for other content pages — run whichever
test file actually imports/asserts against `urls.get.ts`'s output; if none does, skip this step.)
Expected: PASS, no broken assertions about total URL count.

- [ ] **Step 4: Manual check**

Run: `cd app && npm run dev`, open the site footer, click "Inversiones en Uruguay", confirm it
navigates to `/inversiones-uruguay`.

- [ ] **Step 5: Commit**

```bash
git add app/components/Footer.vue app/server/api/__sitemap__/urls.get.ts
git commit -m "feat(inversiones): link investment guide from footer and sitemap"
```

---

## Self-Review Notes

- **Spec coverage:** hero/breadcrumb/share (Task 3 Step 1), risk framework callout (Task 3 Step
  1), per-category tables (Task 2 data + Task 3 rendering), AFAP + Inmobiliario editorial
  sections (Task 3 Step 1), taxes section (Task 3 Step 1 + Step 2 FAQ), disclaimer (Task 3 Step
  1), sources section (Task 3 Step 1, reusing `hostOf` + dedup pattern from loans page — note: if
  dedup logic is needed across `reviewSources`, copy the `reviewSourcesList` computed from
  `prestamos-uruguay.vue` into Task 3 Step 2 verbatim), CTA (Task 3 Step 1), JSON-LD (Task 3 Step
  2), footer/sitemap (Task 4), research-before-data (Task 1 → Task 2 dependency), unit tests
  (Task 2). All spec sections have a task.
- **No live scraping**: confirmed out of scope in every task — data is static, sourced from Task
  1's research file only.
