# Impuestos sobre inversiones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a verified guide + calculator for how Uruguay taxes investment income (IRPF Categoría I), and correct the seven errors the site currently publishes about it.

**Architecture:** One pure data/calc module (`app/utils/capitalTax.ts`) holding every tax rate with its law, source URL and verification date; a content page and a two-mode calculator that read from it; corrections to `investments.ts` and `/inversiones-uruguay`; integrations into glossary, FAQs and nav. Rates are hardcoded constants — no automated refresh may rewrite them. Values that legally float (BPC, UI) are read live from existing endpoints.

**Tech Stack:** Nuxt 3 + Vue 3 (`<script setup lang="ts">`), Vuetify, Vitest (unit), Playwright (e2e). No new dependencies.

**Source of truth for every number:** `docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md`. Do not re-research and do not invent a figure that is not in the spec. If a number you need is not there, stop and ask.

## Global Constraints

- **Never invent a tax rate.** Every rate in `capitalTax.ts` carries `law`, `sourceUrl` and `verifiedOn: '2026-07-12'`. If a fact is not in the spec, it does not ship.
- **Crypto has no rate.** It is modelled as `rate: null, confidence: 'no-resuelto'`. Any code path that would print a crypto percentage is a bug.
- **No LLM/Gemini refresh touches this module.** Do not add it to `costOfLivingLive.ts`, `uyFiguresLive.ts` or any scheduled task.
- **BPC and UI are parameters, never hardcoded inside functions.** Pages pass them in from `/api/uy-figures` (BPC) and the rates API (UI). Fallbacks: BPC `6864`, UI `6.6142`.
- **Language: Spanish (rioplatense, voseo)** in all user-facing copy, matching `/inversiones-uruguay`. Code comments and commit messages in English.
- **Every new route must be registered in `app/utils/siteNav.ts`** or `tests/unit/siteNav-coverage.test.ts` fails.
- Run from `app/`: `npm run test:unit` (Vitest), `npm run lint`. **Do not run `npm run typecheck`** — it crashes (vue-tsc); lint is the gate.
- Dev-server restarts wipe `.nuxt`; if imports break, run `npx nuxi prepare`.

## File Structure

| File | Responsibility |
|---|---|
| `app/utils/capitalTax.ts` (create) | Rate catalogue + pure calc functions. No Vue, no network. |
| `app/tests/unit/capitalTax.test.ts` (create) | Unit tests for all of the above. |
| `app/pages/impuestos-inversiones-uruguay.vue` (create) | Editorial guide. |
| `app/pages/herramientas/calculadora-impuestos-inversiones.vue` (create) | Two-mode calculator. |
| `app/tests/e2e/impuestos-inversiones.spec.ts` (create) | Smoke test of the calculator. |
| `app/utils/tools.ts` (modify) | Register the calculator. |
| `app/utils/siteNav.ts` (modify) | Register both routes. |
| `app/utils/investments.ts` (modify) | Rewrite the 12 wrong `taxNote`s. |
| `app/pages/inversiones-uruguay.vue` (modify) | Rewrite the tax section + its FAQ. |
| `app/utils/glossary.ts` (modify) | Add 8 tax terms. |
| `app/utils/personalFinanceFaq.ts` (modify) | Add 6 tax FAQs. |
| `app/pages/herramientas/calculadora-irpf.vue`, `calculadora-sueldo-liquido.vue`, `mejores-bancos-uruguay.vue`, `salud-financiera.vue`, `invertir-en-proyectos-uruguayos.vue` (modify) | Cross-links. |

---

### Task 1: Rate catalogue + deposit matrix

**Files:**
- Create: `app/utils/capitalTax.ts`
- Test: `app/tests/unit/capitalTax.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TaxRule`, `Currency`, `DepositTerm`, `DEPOSIT_RULES`, `GENERAL_RULE`, `DIVIDEND_RULE`, `PUBLIC_DEBT_RULE`, `CRYPTO_RULE`, `termFromMonths()`, `depositRule()`, `depositReturn()`.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/unit/capitalTax.test.ts
import { describe, expect, it } from 'vitest'
import {
  CRYPTO_RULE,
  depositReturn,
  depositRule,
  termFromMonths,
  type Currency,
  type DepositTerm,
} from '../../utils/capitalTax'

describe('capitalTax — matriz de depósitos (T7 art. 37 lit. A)', () => {
  // The nine cells, verbatim from the spec. The USD 1–3y cell is the one that
  // gets copied wrong: it is a rowspan of the 12% in DGI's HTML, not a blank.
  const cells: Array<[Currency, DepositTerm, number]> = [
    ['UYU', 'hasta_1a', 5.5],
    ['UYU', 'de_1a_3a', 2.5],
    ['UYU', 'mas_3a', 0.5],
    ['UYU_UI', 'hasta_1a', 10],
    ['UYU_UI', 'de_1a_3a', 7],
    ['UYU_UI', 'mas_3a', 5],
    ['USD', 'hasta_1a', 12],
    ['USD', 'de_1a_3a', 12],
    ['USD', 'mas_3a', 7],
  ]

  it.each(cells)('%s a %s tributa %s%%', (currency, term, rate) => {
    expect(depositRule(currency, term).rate).toBe(rate)
  })

  it('cada tasa lleva su norma, fuente y fecha de verificación', () => {
    for (const [currency, term] of cells) {
      const rule = depositRule(currency, term)
      expect(rule.law).toMatch(/art\./)
      expect(rule.sourceUrl).toMatch(/^https:\/\//)
      expect(rule.verifiedOn).toBe('2026-07-12')
      expect(rule.confidence).toBe('confirmado')
    }
  })

  it('mapea meses a franja legal', () => {
    expect(termFromMonths(6)).toBe('hasta_1a')
    expect(termFromMonths(12)).toBe('hasta_1a')
    expect(termFromMonths(13)).toBe('de_1a_3a')
    expect(termFromMonths(36)).toBe('de_1a_3a')
    expect(termFromMonths(37)).toBe('mas_3a')
  })
})

describe('capitalTax — rendimiento neto de un depósito', () => {
  it('un plazo fijo en pesos a 3 años paga 2,5% de IRPF sobre el interés', () => {
    const r = depositReturn({
      principal: 500_000,
      annualRatePct: 9.5,
      termMonths: 36,
      currency: 'UYU',
    })
    // interés simple: 500.000 × 9,5% × 3 años
    expect(r.grossInterest).toBeCloseTo(142_500, 2)
    expect(r.tax).toBeCloseTo(3562.5, 2) // 2,5%
    expect(r.netInterest).toBeCloseTo(138_937.5, 2)
    expect(r.netAnnualRatePct).toBeCloseTo(9.2625, 3) // 9,5 × (1 − 0,025)
  })

  it('un depósito en dólares a 5 años paga 7%, no 12%', () => {
    const r = depositReturn({
      principal: 10_000,
      annualRatePct: 4,
      termMonths: 60,
      currency: 'USD',
    })
    expect(r.rule.rate).toBe(7)
    expect(r.tax).toBeCloseTo(140, 2) // 10.000 × 4% × 5 × 7%
  })

  it('no devuelve interés negativo con plazo cero', () => {
    const r = depositReturn({ principal: 1000, annualRatePct: 5, termMonths: 0, currency: 'UYU' })
    expect(r.grossInterest).toBe(0)
    expect(r.tax).toBe(0)
  })
})

describe('capitalTax — cripto', () => {
  it('no tiene tasa: es zona gris no resuelta', () => {
    expect(CRYPTO_RULE.rate).toBeNull()
    expect(CRYPTO_RULE.confidence).toBe('no-resuelto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/capitalTax.test.ts`
Expected: FAIL — `Failed to resolve import "../../utils/capitalTax"`.

- [ ] **Step 3: Write the implementation**

```ts
// app/utils/capitalTax.ts
// How Uruguay taxes investment income. There is no "impuesto a las ganancias" here:
// residents pay IRPF Categoría I on rentas de capital, non-residents pay IRNR, companies
// pay IRAE.
//
// PURE data + helpers (no Vue/Nuxt, no network) so the page, the calculator and the tests
// share one source of truth.
//
// Every rate below is a legal rate and carries the article it comes from, the URL it was
// read at, and the date it was verified. NOTHING here may be rewritten by an automated
// refresh — publishing a hallucinated tax rate is the one failure mode this module exists
// to prevent. Values that legally float (BPC, UI) are NOT stored here: callers pass them in.
//
// Facts sourced from docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md.
// Crypto is deliberately rateless: neither Decreto 95/026 nor Resolución DGI 1517/2026
// mentions it, so we say "no resuelto" instead of guessing.

/** Confidence in a rule. `no-resuelto` means the law does not answer the question. */
export type RuleConfidence = 'confirmado' | 'no-resuelto'

export interface TaxRule {
  /** Percentage points (e.g. `12` = 12%), or `null` when the law does not settle it. */
  rate: number | null
  label: string
  /** Article the rate comes from, e.g. `'Título 7, art. 37 lit. B'`. */
  law: string
  sourceUrl: string
  /** ISO date this rule was last checked against its source. */
  verifiedOn: string
  confidence: RuleConfidence
}

/** Currency of a deposit, as the law splits it (pesos, pesos indexados a la UI, moneda extranjera). */
export type Currency = 'UYU' | 'UYU_UI' | 'USD'
/** Term buckets used by T7 art. 37 lit. A. */
export type DepositTerm = 'hasta_1a' | 'de_1a_3a' | 'mas_3a'

const T7 = 'https://www.impo.com.uy/bases/todgi-2023/7-2024'
const DGI_CAPITAL =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario'
const VERIFIED = '2026-07-12'

const rule = (
  rate: number | null,
  label: string,
  law: string,
  sourceUrl: string,
  confidence: RuleConfidence = 'confirmado'
): TaxRule => Object.freeze({ rate, label, law, sourceUrl, verifiedOn: VERIFIED, confidence })

/**
 * Deposits, ONs and fideicomisos financieros with oferta pública: nine cells by currency
 * and term (T7 art. 37 lit. A, rates in force since 1/1/2023).
 *
 * The USD "1 a 3 años" cell is 12%, NOT blank. In DGI's HTML it is a `rowspan` of the 12%
 * above it, so anyone copying the table visually leaves a hole there.
 */
export const DEPOSIT_RULES: Readonly<Record<Currency, Readonly<Record<DepositTerm, TaxRule>>>> =
  Object.freeze({
    UYU: Object.freeze({
      hasta_1a: rule(5.5, 'Pesos, tasa fija nominal, hasta 1 año', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      de_1a_3a: rule(2.5, 'Pesos, tasa fija nominal, de 1 a 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      mas_3a: rule(0.5, 'Pesos, tasa fija nominal, más de 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
    }),
    UYU_UI: Object.freeze({
      hasta_1a: rule(10, 'Pesos con reajuste (UI), hasta 1 año', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      de_1a_3a: rule(7, 'Pesos con reajuste (UI), de 1 a 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      mas_3a: rule(5, 'Pesos con reajuste (UI), más de 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
    }),
    USD: Object.freeze({
      hasta_1a: rule(12, 'Moneda extranjera, hasta 1 año', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      de_1a_3a: rule(12, 'Moneda extranjera, de 1 a 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      mas_3a: rule(7, 'Moneda extranjera, más de 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
    }),
  })

/** "Restantes rentas": the headline 12%. */
export const GENERAL_RULE = rule(12, 'Tasa general sobre rentas de capital', 'Título 7, art. 37 lit. B', T7)

/** Dividends and utilidades from IRAE taxpayers — and the dividendos fictos of art. 19. */
export const DIVIDEND_RULE = rule(7, 'Dividendos y utilidades (incluidos los fictos)', 'Título 7, art. 37 lit. B', T7)

/**
 * Uruguayan public debt. The exemption is broader than "interest": art. 38 lit. A also
 * exempts "cualquier otro rendimiento de capital o incremento patrimonial" from holding or
 * transferring these instruments. Also not computable for Impuesto al Patrimonio (T14 art. 23).
 */
export const PUBLIC_DEBT_RULE = rule(0, 'Deuda pública uruguaya (Bonos, Letras, LRM): exenta', 'Título 7, art. 38 lit. A', T7)

/**
 * Crypto. No specific tax norm exists. DGI's only known position (Consulta 6.419/2021, which
 * we could NOT read in primary source) treats it as an intangible. Ley 20.345 regulates
 * providers, not taxation. After the 2026 reform its SOURCE (Uruguayan vs foreign) is still
 * undefined, and neither Decreto 95/026 nor Resolución DGI 1517/2026 mentions it.
 * We publish the uncertainty, not a number.
 */
export const CRYPTO_RULE = rule(
  null,
  'Criptomonedas: sin norma tributaria específica; la fuente de la renta no está definida',
  'Sin norma específica (Consulta DGI 6.419/2021, no verificada en primaria)',
  'https://www.impo.com.uy/bases/decretos-originales/95-2026',
  'no-resuelto'
)

/** Maps a term in months to the legal bucket. 12 months is still "hasta 1 año". */
export function termFromMonths(months: number): DepositTerm {
  if (months <= 12) return 'hasta_1a'
  if (months <= 36) return 'de_1a_3a'
  return 'mas_3a'
}

export function depositRule(currency: Currency, term: DepositTerm): TaxRule {
  return DEPOSIT_RULES[currency][term]
}

export interface DepositReturn {
  rule: TaxRule
  term: DepositTerm
  /** Simple interest over the whole term (not compounded — this is a reference estimate). */
  grossInterest: number
  tax: number
  netInterest: number
  /** Nominal annual rate after IRPF, for comparing instruments. */
  netAnnualRatePct: number
}

/**
 * Gross interest, IRPF and net yield of a term deposit. Uses simple interest: the point is
 * to compare instruments after tax, not to reproduce a bank's amortisation.
 */
export function depositReturn(input: {
  principal: number
  annualRatePct: number
  termMonths: number
  currency: Currency
}): DepositReturn {
  const { principal, annualRatePct, termMonths, currency } = input
  const term = termFromMonths(termMonths)
  const r = depositRule(currency, term)
  const years = Math.max(termMonths, 0) / 12
  const grossInterest = Math.max(principal, 0) * (annualRatePct / 100) * years
  const taxRate = r.rate ?? 0
  const tax = grossInterest * (taxRate / 100)
  return {
    rule: r,
    term,
    grossInterest,
    tax,
    netInterest: grossInterest - tax,
    netAnnualRatePct: annualRatePct * (1 - taxRate / 100),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/capitalTax.test.ts`
Expected: PASS, 5 test blocks green (the `it.each` counts as 9).

- [ ] **Step 5: Commit**

```bash
git add app/utils/capitalTax.ts app/tests/unit/capitalTax.test.ts
git commit -m "feat(impuestos): capital-income tax rules + deposit rate matrix"
```

---

### Task 2: Capital gains, rent, exemptions

**Files:**
- Modify: `app/utils/capitalTax.ts`
- Test: `app/tests/unit/capitalTax.test.ts`

**Interfaces:**
- Consumes: `GENERAL_RULE`, `TaxRule` (Task 1).
- Produces: `capitalGainTax()`, `isCapitalGainExempt()`, `rentTax()`, `isSmallLandlordExempt()`, `RENT_WITHHOLDING_PCT`, `EXEMPT_PER_OPERATION_UI`, `EXEMPT_ANNUAL_UI`.

- [ ] **Step 1: Write the failing test** (append to `capitalTax.test.ts`)

```ts
import {
  capitalGainTax,
  isCapitalGainExempt,
  isSmallLandlordExempt,
  rentTax,
  RENT_WITHHOLDING_PCT,
} from '../../utils/capitalTax'

describe('capitalTax — incrementos patrimoniales', () => {
  it('el régimen REAL es el default: 12% sobre (precio − costo actualizado)', () => {
    const r = capitalGainTax({ salePrice: 100_000, cost: 60_000, method: 'real' })
    expect(r.taxableBase).toBe(40_000)
    expect(r.tax).toBeCloseTo(4800, 2)
    expect(r.effectiveRatePct).toBeCloseTo(4.8, 2) // sobre el precio de venta
  })

  it('una pérdida no genera impuesto', () => {
    const r = capitalGainTax({ salePrice: 50_000, cost: 80_000, method: 'real' })
    expect(r.taxableBase).toBe(0)
    expect(r.tax).toBe(0)
  })

  it('el ficto del 20% da 2,4% efectivo — pero NO es el default', () => {
    const r = capitalGainTax({ salePrice: 100_000, method: 'ficto20' })
    expect(r.taxableBase).toBe(20_000)
    expect(r.tax).toBeCloseTo(2400, 2)
    expect(r.effectiveRatePct).toBeCloseTo(2.4, 2)
  })

  it('el ficto del 15% (inmuebles pre-2007) da 1,8% efectivo', () => {
    const r = capitalGainTax({ salePrice: 200_000, method: 'ficto15' })
    expect(r.tax).toBeCloseTo(3600, 2)
    expect(r.effectiveRatePct).toBeCloseTo(1.8, 2)
  })

  it('con costo probado, el ficto puede ser PEOR que el real', () => {
    const real = capitalGainTax({ salePrice: 100_000, cost: 95_000, method: 'real' })
    const ficto = capitalGainTax({ salePrice: 100_000, method: 'ficto20' })
    expect(real.tax).toBeLessThan(ficto.tax)
  })

  it('exonera operaciones chicas: ≤30.000 UI cada una y <90.000 UI al año', () => {
    const ui = 6.6142
    // Operación de 25.000 UI, con 50.000 UI acumuladas antes en el año.
    expect(
      isCapitalGainExempt({
        operationAmountUyu: 25_000 * ui,
        yearSubThresholdTotalUyu: 50_000 * ui,
        uiValue: ui,
      })
    ).toBe(true)
    // Misma operación, pero el año ya acumula 80.000 UI → supera las 90.000 UI.
    expect(
      isCapitalGainExempt({
        operationAmountUyu: 25_000 * ui,
        yearSubThresholdTotalUyu: 80_000 * ui,
        uiValue: ui,
      })
    ).toBe(false)
    // Operación grande: no exonera, aunque el año esté vacío.
    expect(
      isCapitalGainExempt({
        operationAmountUyu: 40_000 * ui,
        yearSubThresholdTotalUyu: 0,
        uiValue: ui,
      })
    ).toBe(false)
  })
})

describe('capitalTax — alquileres', () => {
  it('la TASA es 12% sobre la renta neta; el 10,5% es la RETENCIÓN sobre el bruto', () => {
    expect(RENT_WITHHOLDING_PCT).toBe(10.5)
    const r = rentTax({ grossRent: 30_000, deductions: 4000 })
    expect(r.netRent).toBe(26_000)
    expect(r.tax).toBeCloseTo(3120, 2) // 26.000 × 12%
    expect(r.withholding).toBeCloseTo(3150, 2) // 30.000 × 10,5%
    expect(r.effectivePctOfGross).toBeCloseTo(10.4, 2)
  })

  it('sin deducciones, liquidar por lo real es PEOR que dejar la retención', () => {
    const r = rentTax({ grossRent: 30_000, deductions: 0 })
    expect(r.tax).toBeCloseTo(3600, 2) // 12% del bruto
    expect(r.tax).toBeGreaterThan(r.withholding)
  })

  it('exonera al pequeño arrendador: ≤40 BPC al año Y levantamiento del secreto bancario', () => {
    const bpc = 6864
    // Cumple el monto y renuncia al secreto → exento.
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 30 * bpc,
        otherCapitalIncomeUyu: 0,
        waivesBankSecrecy: true,
        bpc,
      })
    ).toBe(true)
    // Mismo monto, pero NO autoriza el levantamiento del secreto bancario → NO exento.
    // (La condición legal es ésta, no "identificar al inquilino".)
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 30 * bpc,
        otherCapitalIncomeUyu: 0,
        waivesBankSecrecy: false,
        bpc,
      })
    ).toBe(false)
    // Supera las 40 BPC → no exento.
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 45 * bpc,
        otherCapitalIncomeUyu: 0,
        waivesBankSecrecy: true,
        bpc,
      })
    ).toBe(false)
    // Tiene otros rendimientos de capital > 3 BPC → la exoneración no opera.
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 30 * bpc,
        otherCapitalIncomeUyu: 4 * bpc,
        waivesBankSecrecy: true,
        bpc,
      })
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/capitalTax.test.ts`
Expected: FAIL — `capitalGainTax is not a function` / import errors.

- [ ] **Step 3: Write the implementation** (append to `app/utils/capitalTax.ts`)

```ts
// ── Incrementos patrimoniales (capital gains) ────────────────────────────────

/**
 * How the taxable base is determined.
 * - `real`: (sale price − inflation-adjusted cost) × 12%. THE DEFAULT.
 * - `ficto20`: 20% of the sale price as base → 2,4% of the price. MANDATORY only when the
 *   cost cannot be proven; an OPTION for pre-2007 assets and (since 2026) an annual option
 *   for foreign assets. It is NOT the default regime for selling securities.
 * - `ficto15`: 15% of the sale price → 1,8%. Non-rural property bought before 1/7/2007, and
 *   (since 2026) an annual option for foreign property.
 */
export type CapitalGainMethod = 'real' | 'ficto20' | 'ficto15'

export const FICTO_BASE_PCT: Readonly<Record<Exclude<CapitalGainMethod, 'real'>, number>> =
  Object.freeze({ ficto20: 20, ficto15: 15 })

/** T7 art. 38 lit. I: each operation ≤ 30.000 UI, and those operations summing < 90.000 UI/year. */
export const EXEMPT_PER_OPERATION_UI = 30_000
export const EXEMPT_ANNUAL_UI = 90_000

export interface CapitalGainResult {
  method: CapitalGainMethod
  taxableBase: number
  tax: number
  /** Tax as a % of the sale price — the number people compare (2,4% / 1,8% / whatever real gives). */
  effectiveRatePct: number
  rule: TaxRule
}

export function capitalGainTax(input: {
  salePrice: number
  /** Inflation-adjusted fiscal cost. Required for `real`, ignored otherwise. */
  cost?: number
  method: CapitalGainMethod
}): CapitalGainResult {
  const salePrice = Math.max(input.salePrice, 0)
  const rate = GENERAL_RULE.rate ?? 12

  const taxableBase =
    input.method === 'real'
      ? Math.max(salePrice - Math.max(input.cost ?? 0, 0), 0)
      : salePrice * (FICTO_BASE_PCT[input.method] / 100)

  const tax = taxableBase * (rate / 100)
  return {
    method: input.method,
    taxableBase,
    tax,
    effectiveRatePct: salePrice > 0 ? (tax / salePrice) * 100 : 0,
    rule: GENERAL_RULE,
  }
}

/**
 * T7 art. 38 lit. I. Both conditions must hold: this operation is at or under 30.000 UI, AND
 * the year's operations under that threshold (this one included) stay below 90.000 UI.
 */
export function isCapitalGainExempt(input: {
  operationAmountUyu: number
  /** Sum of the year's earlier sub-threshold operations, in pesos. */
  yearSubThresholdTotalUyu: number
  uiValue: number
}): boolean {
  const opUi = input.operationAmountUyu / input.uiValue
  if (opUi > EXEMPT_PER_OPERATION_UI) return false
  const yearUi = (input.yearSubThresholdTotalUyu + input.operationAmountUyu) / input.uiValue
  return yearUi < EXEMPT_ANNUAL_UI
}

// ── Alquileres (rental income) ───────────────────────────────────────────────

/**
 * Dec. 148/007 art. 37: the withholding on rent of property in Uruguay is 10,5% of the GROSS.
 * It is NOT the tax rate — the tax is 12% of the NET (T7 art. 37 lit. B + art. 35 lit. A).
 * The 10,5% is 12% × 87,5%, i.e. it assumes ~12,5% of deductible expenses. The taxpayer may
 * keep it as definitive or liquidate on the real figures.
 */
export const RENT_WITHHOLDING_PCT = 10.5

/** T7 art. 38 lit. J thresholds, in BPC. */
export const SMALL_LANDLORD_MAX_BPC = 40
export const SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC = 3

export interface RentTaxResult {
  netRent: number
  tax: number
  withholding: number
  /** The real tax as a % of gross rent — compare it against the 10,5% withholding. */
  effectivePctOfGross: number
  /** True when liquidating on real figures beats leaving the withholding as definitive. */
  realBeatsWithholding: boolean
}

/**
 * Deductions admitted by T7 art. 16: the PROPERTY MANAGER's commission (not any estate-agent
 * fee), professional fees for signing/renewing the contract, the VAT on those, Contribución
 * Inmobiliaria, Impuesto de Enseñanza Primaria, and (for sub-lets) the rent paid by the
 * sub-lessor.
 */
export function rentTax(input: { grossRent: number; deductions: number }): RentTaxResult {
  const gross = Math.max(input.grossRent, 0)
  const netRent = Math.max(gross - Math.max(input.deductions, 0), 0)
  const rate = GENERAL_RULE.rate ?? 12
  const tax = netRent * (rate / 100)
  const withholding = gross * (RENT_WITHHOLDING_PCT / 100)
  return {
    netRent,
    tax,
    withholding,
    effectivePctOfGross: gross > 0 ? (tax / gross) * 100 : 0,
    realBeatsWithholding: tax < withholding,
  }
}

/**
 * T7 art. 38 lit. J. The condition is NOT "identifying the tenant" — that is art. 51, which
 * gives the TENANT a credit of up to 8% of the rent for identifying the LANDLORD. This
 * exemption requires expressly authorising the lifting of BANK SECRECY, with annual rent at
 * or under 40 BPC and no other capital income above 3 BPC.
 */
export function isSmallLandlordExempt(input: {
  annualRentUyu: number
  otherCapitalIncomeUyu: number
  waivesBankSecrecy: boolean
  bpc: number
}): boolean {
  if (!input.waivesBankSecrecy) return false
  if (input.annualRentUyu > SMALL_LANDLORD_MAX_BPC * input.bpc) return false
  return input.otherCapitalIncomeUyu <= SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC * input.bpc
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/capitalTax.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/capitalTax.ts app/tests/unit/capitalTax.test.ts
git commit -m "feat(impuestos): capital gains (real vs ficto), rent, small-landlord exemption"
```

---

### Task 3: Foreign-source income (2026 reform) + annual aggregation

**Files:**
- Modify: `app/utils/capitalTax.ts`
- Test: `app/tests/unit/capitalTax.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces: `WithholdingAgent`, `FOREIGN_GENERAL_PCT`, `FOREIGN_CUSTODIAN_WITHHOLDING_PCT`, `foreignIncomeTax()`, `stepUpCost()`, `AnnualIncomeItem`, `annualIrpfCatI()`.

- [ ] **Step 1: Write the failing test** (append)

```ts
import {
  annualIrpfCatI,
  foreignIncomeTax,
  stepUpCost,
  type AnnualIncomeItem,
} from '../../utils/capitalTax'

describe('capitalTax — rentas del exterior (Ley 20.446, vigencia 1/1/2026)', () => {
  it('la TASA es 12%: el 8% es una retención, no una alícuota', () => {
    const r = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'ninguno' })
    expect(r.taxRatePct).toBe(12)
    expect(r.tax).toBeCloseTo(12_000, 2)
    expect(r.withholdingRatePct).toBeNull()
  })

  it('solo un custodio/bróker local puede retener al 8%', () => {
    const custodio = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'custodio-local' })
    expect(custodio.withholdingRatePct).toBe(8)
    expect(custodio.canOptForDefinitive).toBe(true)

    // Un banco o corredor que NO ejerce la custodia retiene 12%, no 8%.
    const otro = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'otro-agente' })
    expect(otro.withholdingRatePct).toBe(12)
  })

  it('sin agente de retención (bróker del exterior) hay anticipos semestrales', () => {
    const r = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'ninguno' })
    expect(r.requiresAnticipos).toBe(true)

    const conCustodio = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'custodio-local' })
    expect(conCustodio.requiresAnticipos).toBe(false)
  })

  it('acredita el impuesto pagado en el exterior, topeado al IRPF de esas mismas rentas', () => {
    // Impuesto extranjero menor al IRPF: se acredita entero.
    const parcial = foreignIncomeTax({
      amount: 100_000,
      withholdingAgent: 'ninguno',
      foreignTaxPaid: 5000,
    })
    expect(parcial.foreignCreditApplied).toBeCloseTo(5000, 2)
    expect(parcial.taxDue).toBeCloseTo(7000, 2) // 12.000 − 5.000

    // Impuesto extranjero mayor: el crédito se topea, nunca da saldo a favor.
    const topeado = foreignIncomeTax({
      amount: 100_000,
      withholdingAgent: 'ninguno',
      foreignTaxPaid: 20_000,
    })
    expect(topeado.foreignCreditApplied).toBeCloseTo(12_000, 2)
    expect(topeado.taxDue).toBe(0)
  })
})

describe('capitalTax — step-up al 31/12/2025', () => {
  it('para activos cotizados comprados antes de 2026, el costo es la cotización al 31/12/2025', () => {
    // Compradas en 2015 a 10.000; valían 80.000 al 31/12/2025; vendidas a 100.000.
    const cost = stepUpCost({
      originalCost: 10_000,
      valueAt20251231: 80_000,
      acquiredBefore2026: true,
      listedOnRecognisedExchange: true,
    })
    expect(cost).toBe(80_000)

    const gain = capitalGainTax({ salePrice: 100_000, cost, method: 'real' })
    expect(gain.tax).toBeCloseTo(2400, 2) // 12% de 20.000, no de 90.000
  })

  it('no aplica a activos comprados en 2026 o después', () => {
    expect(
      stepUpCost({
        originalCost: 10_000,
        valueAt20251231: 80_000,
        acquiredBefore2026: false,
        listedOnRecognisedExchange: true,
      })
    ).toBe(10_000)
  })

  it('no aplica a activos que no cotizan en bolsas de reconocido prestigio', () => {
    expect(
      stepUpCost({
        originalCost: 10_000,
        valueAt20251231: 80_000,
        acquiredBefore2026: true,
        listedOnRecognisedExchange: false,
      })
    ).toBe(10_000)
  })
})

describe('capitalTax — liquidación anual (Cat. I)', () => {
  const bpc = 6864
  const ui = 6.6142

  it('suma las rentas del año y aplica el crédito por impuesto del exterior', () => {
    const items: AnnualIncomeItem[] = [
      { kind: 'deposito', amount: 100_000, currency: 'UYU', termMonths: 24 }, // 2,5% → 2.500
      { kind: 'dividendo', amount: 50_000 }, // 7% → 3.500
      { kind: 'deuda_publica', amount: 200_000 }, // exenta → 0
      { kind: 'exterior', amount: 100_000, foreignTaxPaid: 5000, withholdingAgent: 'ninguno' }, // 12.000 − 5.000 = 7.000
    ]
    const r = annualIrpfCatI(items, { bpc, uiValue: ui })

    expect(r.totalTax).toBeCloseTo(2500 + 3500 + 0 + 7000, 2)
    expect(r.foreignCreditApplied).toBeCloseTo(5000, 2)
    expect(r.requiresAnticipos).toBe(true) // hay renta del exterior sin retención
    expect(r.byItem).toHaveLength(4)
    expect(r.byItem[2]?.tax).toBe(0)
  })

  it('marca la cripto como no resuelta y NO le asigna impuesto', () => {
    const r = annualIrpfCatI([{ kind: 'cripto', amount: 500_000 }], { bpc, uiValue: ui })
    expect(r.totalTax).toBe(0)
    expect(r.unresolved).toContain('cripto')
    expect(r.byItem[0]?.rule.confidence).toBe('no-resuelto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/capitalTax.test.ts`
Expected: FAIL — `foreignIncomeTax is not a function`.

- [ ] **Step 3: Write the implementation** (append to `app/utils/capitalTax.ts`)

```ts
// ── Rentas de fuente extranjera (Ley 20.446, vigente 1/1/2026) ───────────────
//
// Before 2026 only foreign *rendimientos de capital mobiliario* (interest, dividends) were
// taxed, at 12%; foreign CAPITAL GAINS were not taxed at all. Ley 20.446 extended IRPF to all
// foreign capital income — including rental income from foreign property — and, for the first
// time, to foreign capital gains. Derivatives, royalties, trademarks, patents and the leasing
// of movable goods stay OUT (T7 art. 18 lit. A, C and D).

const DEC_95_026 = 'https://www.impo.com.uy/bases/decretos-originales/95-2026'

/** Who, if anyone, withholds on your foreign income. */
export type WithholdingAgent =
  /** A Uruguayan broker that intermediates AND custodies the foreign assets (Dec. 148/007 art. 44 quinquies). */
  | 'custodio-local'
  /** A bank, corredor de bolsa, fondo or fideicomiso acting for third parties without custody (art. 44 quater). */
  | 'otro-agente'
  /** No Uruguayan agent at all — e.g. holding an account directly with a foreign broker. */
  | 'ninguno'

/** The actual tax rate on foreign capital income. */
export const FOREIGN_GENERAL_PCT = 12
/**
 * The REDUCED WITHHOLDING a local custodian may apply (T7 art. 52 lit. A, implemented by
 * Dec. 95/026 → Dec. 148/007 arts. 44 quinquies/sexies). It is a withholding, NOT a tax rate,
 * and it is only definitive if the taxpayer OPTS for that.
 */
export const FOREIGN_CUSTODIAN_WITHHOLDING_PCT = 8

export const FOREIGN_RULE = rule(
  FOREIGN_GENERAL_PCT,
  'Rentas y ganancias de capital de fuente extranjera',
  'Título 7, art. 6 num. 2 (Ley 20.446 art. 653); Decreto 95/026',
  DEC_95_026
)

export interface ForeignIncomeResult {
  taxRatePct: number
  /** The withholding an agent would apply, or `null` when nobody withholds. */
  withholdingRatePct: number | null
  /** Whether the taxpayer may elect to treat the withholding as definitive (and skip the DJ). */
  canOptForDefinitive: boolean
  /** With no withholding agent, semi-annual advance payments are mandatory (Dec. 95/026 arts. 44 duodecies/terdecies). */
  requiresAnticipos: boolean
  tax: number
  foreignCreditApplied: number
  /** Tax after crediting foreign tax paid. Never negative — the credit does not refund. */
  taxDue: number
  rule: TaxRule
}

export function foreignIncomeTax(input: {
  amount: number
  withholdingAgent: WithholdingAgent
  /** Analogous tax already paid abroad on the same income (T7 art. 25 — still in force). */
  foreignTaxPaid?: number
}): ForeignIncomeResult {
  const amount = Math.max(input.amount, 0)
  const tax = amount * (FOREIGN_GENERAL_PCT / 100)
  // The credit is capped at the IRPF on those same rentas: it never produces a refund.
  const foreignCreditApplied = Math.min(Math.max(input.foreignTaxPaid ?? 0, 0), tax)

  const withholdingRatePct =
    input.withholdingAgent === 'custodio-local'
      ? FOREIGN_CUSTODIAN_WITHHOLDING_PCT
      : input.withholdingAgent === 'otro-agente'
        ? FOREIGN_GENERAL_PCT
        : null

  return {
    taxRatePct: FOREIGN_GENERAL_PCT,
    withholdingRatePct,
    canOptForDefinitive: withholdingRatePct !== null,
    requiresAnticipos: input.withholdingAgent === 'ninguno',
    tax,
    foreignCreditApplied,
    taxDue: tax - foreignCreditApplied,
    rule: FOREIGN_RULE,
  }
}

/**
 * Step-up al 31/12/2025 (T7 art. 32 + Dec. 95/026 art. 18) — the most valuable and least
 * publicised part of the reform. For assets listed on a "bolsa de reconocido prestigio" and
 * acquired before 31/12/2025, the fiscal cost is their quoted value on that date, so ALL the
 * appreciation earned before 2026 falls outside the tax. A loss computed this way cannot be
 * offset against other income.
 */
export function stepUpCost(input: {
  originalCost: number
  valueAt20251231: number
  acquiredBefore2026: boolean
  listedOnRecognisedExchange: boolean
}): number {
  return input.acquiredBefore2026 && input.listedOnRecognisedExchange
    ? input.valueAt20251231
    : input.originalCost
}

// ── Liquidación anual (IRPF Categoría I, Formulario 1101) ────────────────────

export type AnnualIncomeItem =
  | { kind: 'deposito'; amount: number; currency: Currency; termMonths: number }
  | { kind: 'dividendo'; amount: number }
  | { kind: 'deuda_publica'; amount: number }
  | { kind: 'alquiler'; amount: number; deductions?: number }
  | { kind: 'ganancia_local'; amount: number; cost?: number; method?: CapitalGainMethod }
  | { kind: 'exterior'; amount: number; foreignTaxPaid?: number; withholdingAgent: WithholdingAgent }
  | { kind: 'cripto'; amount: number }

export interface AnnualItemResult {
  kind: AnnualIncomeItem['kind']
  amount: number
  tax: number
  rule: TaxRule
}

export interface AnnualIrpfResult {
  totalTax: number
  byItem: AnnualItemResult[]
  foreignCreditApplied: number
  /** True when at least one foreign item has no withholding agent. */
  requiresAnticipos: boolean
  /** Item kinds whose treatment the law does not settle (today: only `cripto`). */
  unresolved: Array<AnnualIncomeItem['kind']>
}

/**
 * Adds up a year of Categoría I income. `bpc` and `uiValue` are passed in (never hardcoded)
 * so the caller decides whether they come from the live endpoints or from a fallback.
 *
 * `cripto` contributes 0 and is reported under `unresolved` — we do not guess a rate.
 */
export function annualIrpfCatI(
  items: AnnualIncomeItem[],
  _opts: { bpc: number; uiValue: number }
): AnnualIrpfResult {
  const byItem: AnnualItemResult[] = []
  let foreignCreditApplied = 0
  let requiresAnticipos = false
  const unresolved: Array<AnnualIncomeItem['kind']> = []

  for (const item of items) {
    switch (item.kind) {
      case 'deposito': {
        // The annual form takes the INTEREST EARNED, not the principal, so the rate applies
        // directly. Do NOT reuse `depositReturn` here — it expects a principal + nominal rate.
        const depRule = depositRule(item.currency, termFromMonths(item.termMonths))
        byItem.push({
          kind: item.kind,
          amount: item.amount,
          tax: item.amount * ((depRule.rate ?? 0) / 100),
          rule: depRule,
        })
        break
      }
      case 'dividendo':
        byItem.push({
          kind: item.kind,
          amount: item.amount,
          tax: item.amount * ((DIVIDEND_RULE.rate ?? 0) / 100),
          rule: DIVIDEND_RULE,
        })
        break
      case 'deuda_publica':
        byItem.push({ kind: item.kind, amount: item.amount, tax: 0, rule: PUBLIC_DEBT_RULE })
        break
      case 'alquiler': {
        const r = rentTax({ grossRent: item.amount, deductions: item.deductions ?? 0 })
        byItem.push({ kind: item.kind, amount: item.amount, tax: r.tax, rule: GENERAL_RULE })
        break
      }
      case 'ganancia_local': {
        const r = capitalGainTax({
          salePrice: item.amount,
          cost: item.cost,
          method: item.method ?? 'real',
        })
        byItem.push({ kind: item.kind, amount: item.amount, tax: r.tax, rule: GENERAL_RULE })
        break
      }
      case 'exterior': {
        const r = foreignIncomeTax({
          amount: item.amount,
          withholdingAgent: item.withholdingAgent,
          foreignTaxPaid: item.foreignTaxPaid,
        })
        foreignCreditApplied += r.foreignCreditApplied
        if (r.requiresAnticipos) requiresAnticipos = true
        byItem.push({ kind: item.kind, amount: item.amount, tax: r.taxDue, rule: FOREIGN_RULE })
        break
      }
      case 'cripto':
        unresolved.push('cripto')
        byItem.push({ kind: item.kind, amount: item.amount, tax: 0, rule: CRYPTO_RULE })
        break
    }
  }

  return {
    totalTax: byItem.reduce((sum, i) => sum + i.tax, 0),
    byItem,
    foreignCreditApplied,
    requiresAnticipos,
    unresolved,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/capitalTax.test.ts`
Expected: PASS, all blocks green.

- [ ] **Step 5: Commit**

```bash
git add app/utils/capitalTax.ts app/tests/unit/capitalTax.test.ts
git commit -m "feat(impuestos): foreign-source income, 31/12/2025 step-up, annual Cat. I aggregation"
```

---

### Task 4: Content page `/impuestos-inversiones-uruguay`

**Files:**
- Create: `app/pages/impuestos-inversiones-uruguay.vue`
- Modify: `app/utils/siteNav.ts`
- Test: `app/tests/unit/siteNav-coverage.test.ts` (must pass, no edit expected)

**Interfaces:**
- Consumes: everything exported from `app/utils/capitalTax.ts`.
- Produces: the route `/impuestos-inversiones-uruguay`.

**Pattern to mirror:** `app/pages/inversiones-uruguay.vue` — `VCard variant="flat"` per section, an `officialSources` array rendered as a list, a `VAlert type="warning"` disclaimer, `useSeoMeta` + FAQPage JSON-LD via `useHead`, `defineOgImageComponent('Cambio', …)`.

**Copy source:** `docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md`, section "Datos verificados". Use its wording. Do not add facts it does not contain.

- [ ] **Step 1: Register the route in `app/utils/siteNav.ts`**

Add next to the `/inversiones-uruguay` entry (around line 400):

```ts
      {
        to: '/impuestos-inversiones-uruguay',
        labelKey: 'nav.impuestosInversiones',
        icon: 'mdi-file-percent-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'impuesto a las ganancias',
          'impuesto a las ganancias uruguay',
          'irpf inversiones',
          'irpf categoria 1',
          'rentas de capital',
          'impuestos cripto uruguay',
          'impuestos broker exterior',
          'residencia fiscal uruguay',
          'tax holiday uruguay',
          'impuesto al patrimonio',
          'iass',
          'irnr',
          'declaracion jurada irpf',
        ],
      },
```

Add `nav.impuestosInversiones` to the three locale files (`app/i18n/locales/json/es.json`, `en.json`, `pt.json`):
- es: `"impuestosInversiones": "Impuestos sobre inversiones"`
- en: `"impuestosInversiones": "Investment taxes"`
- pt: `"impuestosInversiones": "Impostos sobre investimentos"`

- [ ] **Step 2: Run the nav coverage test to see it demand the page**

Run: `cd app && npx vitest run tests/unit/siteNav-coverage.test.ts`
Expected: FAIL — the route is registered but no page file exists.

- [ ] **Step 3: Write the page**

`app/pages/impuestos-inversiones-uruguay.vue`, mirroring `inversiones-uruguay.vue`. Sections, in order — each one a `VCard`:

1. **Intro / H1.** H1: `Impuestos sobre inversiones en Uruguay: cómo funciona el IRPF Categoría I`. First paragraph answers the search term head-on: *"El «impuesto a las ganancias» no existe en Uruguay. Lo que grava las rentas de tus inversiones es el IRPF Categoría I si sos residente fiscal, el IRNR si no lo sos, y el IRAE si invertís a través de una empresa."* Show the `verifiedOn` date and BPC/UI in use.
2. **Depósitos y renta fija** — render `DEPOSIT_RULES` as the 3×3 table. All nine cells filled; the USD/1–3 años cell says 12%.
3. **Dividendos** — 7%, including dividendos fictos (art. 19, still alive in 2026).
4. **Deuda pública: exenta** — and note the exemption covers the capital gain too, and that it is not computable for Impuesto al Patrimonio.
5. **Alquileres** — 12% on net; the 10,5% is the WITHHOLDING; the deductions list; the small-landlord exemption is bank-secrecy waiver + 40 BPC, **not** "identifying the tenant".
6. **Ganancias de capital** — the real regime is the default; the ficto table; the 30.000/90.000 UI exemption; **exchange-rate gains on holding foreign currency are EXEMPT**; **inheritance pays no IRPF**.
7. **Fondos de inversión (FCI)** — exempt only when invested in public/oferta-pública securities.
8. **Cripto** — a `VAlert type="warning"`. No percentage anywhere. State what is known and what is not.
9. **La reforma 2026 (bloque destacado)** — visually prominent. Sub-blocks: what changed; the 12% rate vs the 8% withholding and who may apply it; anticipos if you use a foreign broker; **the 31/12/2025 step-up**; the end of offshore deferral (art. 21, art. 22 derogated); the foreign-tax credit; that withholdings only start being paid to DGI in July 2026.
10. **Residencia fiscal y tax holiday** — the 183-day rule and the investment routes (compute the UYU/USD equivalents from the LIVE UI value, do not hardcode); the old art. 24 regime and the "7% para siempre" **closed on 31/12/2025**; the new art. 24-Bis. Carry a visible date and note the pending Ley de Competitividad could change it.
11. **Impuesto al Patrimonio** — territorial (your foreign portfolio does not pay it); residents **0,10% flat**; the 0,70–1,50% scale is for non-residents; MNI is the **2025** figure, labelled as such.
12. **IASS** — the 2026 brackets (108 BPC exempt / 6% / 24% / 30%), computed in pesos from the live BPC. Note explicitly that calculators still publishing 96 BPC and 10% are out of date.
13. **Cómo se declara** — Formulario 1101; campaign 29/06–31/08/2026 (single window, **no** staggering by ID digit); who withholds automatically; foreign brokers do not; the mora penalties (5/10/20% + $910).
14. **CRS** — Uruguay receives data automatically from CRS jurisdictions; **the US is not in CRS** (request-based only). State the IBKR-entity caveat as unverified.
15. **Mitos** — the 11-row table from the research (spec's myth list).
16. **Fuentes** — the primary-source list from the spec.
17. **Disclaimer** — `VAlert type="warning"`, same wording pattern as `/inversiones-uruguay`: informative, not tax advice, consult an accountant.

Live values, following `pages/salud-financiera.vue:370`:

```ts
const { data: figures } = await useFetch<{ bpc: number; asOf: string | null }>('/api/uy-figures', {
  key: 'uy-figures',
  default: () => ({ bpc: 6864, asOf: null }),
})
const bpc = computed(() => figures.value?.bpc ?? 6864)
```

And the live UI, following `pages/indicadores/[indicador].vue:191`:

```ts
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
const { getProcessedExchangeData } = useApiService()
const { data: uiValue } = await useAsyncData('impuestos-ui', async () => {
  const ind = indicatorFromSlug('unidad-indexada')
  if (!ind) return null
  const result = await getProcessedExchangeData('')
  return currentIndicatorValue((result?.exchangeData ?? []) as ExchangeRate[], ind)
})
const ui = computed(() => uiValue.value ?? 6.6142)
```

Add a FAQPage JSON-LD with at least: *¿Existe el impuesto a las ganancias en Uruguay?*, *¿Pago impuestos por invertir en un bróker del exterior?*, *¿Cuánto se paga por vender acciones?*, *¿La cripto paga impuestos?*, *¿Tener dólares paga IRPF?*

- [ ] **Step 4: Verify the page renders and the nav test passes**

Run: `cd app && npx vitest run tests/unit/siteNav-coverage.test.ts tests/unit/sitemap-urls.test.ts && npm run lint`
Expected: PASS.

Then run the dev server and load the page:
Run: `cd app && npm run dev` and open `http://localhost:3000/impuestos-inversiones-uruguay`
Expected: page renders; the deposit table shows nine filled cells; no crypto percentage anywhere; BPC/UI-derived figures are non-zero.

- [ ] **Step 5: Commit**

```bash
git add app/pages/impuestos-inversiones-uruguay.vue app/utils/siteNav.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(impuestos): guide page for how Uruguay taxes investment income"
```

---

### Task 5: Calculator `/herramientas/calculadora-impuestos-inversiones`

**Files:**
- Create: `app/pages/herramientas/calculadora-impuestos-inversiones.vue`
- Create: `app/tests/e2e/impuestos-inversiones.spec.ts`
- Modify: `app/utils/tools.ts`

**Interfaces:**
- Consumes: `depositReturn`, `capitalGainTax`, `rentTax`, `foreignIncomeTax`, `annualIrpfCatI`, `AnnualIncomeItem`, `CRYPTO_RULE` from `capitalTax.ts`.
- Produces: the route `/herramientas/calculadora-impuestos-inversiones`.

**Pattern to mirror:** `app/pages/herramientas/calculadora-irpf.vue` — `<ToolShell slug="…" :faq="faq" :sources="sources">`, everything else (title, description, SEO, OG) comes from the `tools.ts` entry.

- [ ] **Step 1: Register the tool in `app/utils/tools.ts`**

Add to the `tools` array, in the `impuestos` category:

```ts
  {
    slug: 'calculadora-impuestos-inversiones',
    title: 'Calculadora de impuestos sobre inversiones (IRPF rentas de capital)',
    description:
      'Cuánto IRPF pagás por un plazo fijo, un dividendo, un alquiler, la venta de acciones o tu cuenta en un bróker del exterior — y cuál es tu rendimiento NETO después de impuestos.',
    icon: 'mdi-chart-box-outline',
    category: 'impuestos',
    keywords: [
      'impuesto a las ganancias uruguay',
      'irpf inversiones',
      'irpf rentas de capital',
      'impuestos plazo fijo uruguay',
      'impuestos broker exterior uruguay',
      'cuanto pago de irpf por invertir',
    ],
  },
```

- [ ] **Step 2: Write the failing e2e test**

```ts
// app/tests/e2e/impuestos-inversiones.spec.ts
import { expect, test } from '@playwright/test'

// The page hydrates a Vuetify tab set; gate on hydration with toPass retries rather than
// a fixed wait (the pattern the rest of the e2e suite uses).
test('calculadora de impuestos sobre inversiones — modo por instrumento', async ({ page }) => {
  await page.goto('/herramientas/calculadora-impuestos-inversiones')

  await expect(async () => {
    await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
  }).toPass({ timeout: 15_000 })

  // Default scenario must show a real number, not a placeholder.
  await expect(page.getByTestId('resultado-impuesto')).not.toHaveText('—')
  await expect(page.getByTestId('resultado-neto')).toBeVisible()
})

test('la cripto no muestra ninguna tasa', async ({ page }) => {
  await page.goto('/herramientas/calculadora-impuestos-inversiones')
  await expect(async () => {
    await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
  }).toPass({ timeout: 15_000 })

  await page.getByTestId('instrumento').click()
  await page.getByRole('option', { name: /cripto/i }).click()

  await expect(page.getByTestId('cripto-no-resuelto')).toBeVisible()
  await expect(page.getByTestId('resultado-impuesto')).toHaveCount(0)
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd app && npx playwright test tests/e2e/impuestos-inversiones.spec.ts`
Expected: FAIL — 404, the page does not exist.

- [ ] **Step 4: Write the calculator page**

Two tabs (`VTabs`).

**Tab "Por instrumento"** — a `VSelect` (`data-testid="instrumento"`) with: plazo fijo en pesos / plazo fijo en UI / plazo fijo en dólares / Letra o bono del Estado / dividendo / alquiler / venta de acciones o ETF (local) / cuenta en bróker del exterior / cripto. Inputs adapt to the instrument (monto, tasa nominal, plazo en meses; or precio de venta + costo; or alquiler bruto + deducciones; or agente de retención + impuesto pagado en el exterior).

Outputs: `data-testid="resultado-impuesto"` (impuesto), `data-testid="resultado-tasa"` (tasa efectiva), `data-testid="resultado-neto"` (rendimiento neto). Below them, always show the rule's `law` + a link to its `sourceUrl` and the `verifiedOn` date — the provenance is a feature.

For deposits, add the comparison line that justifies the tool: *"Un plazo fijo en pesos a más de 3 años paga 0,5% de IRPF. Comparado con una Letra del BCU (exenta), tu rendimiento neto es X% vs Y%."*

For **cripto**, render `data-testid="cripto-no-resuelto"`: a `VAlert type="warning"` with `CRYPTO_RULE.label`, and **do not render the result block at all** (`v-if="!isCrypto"` on it). Never print a number.

**Tab "Declaración anual"** — a repeatable row editor building `AnnualIncomeItem[]`, fed to `annualIrpfCatI(items, { bpc, uiValue })`. Show: total IRPF, the per-item breakdown, the foreign-tax credit applied, and a warning when `requiresAnticipos` is true (*"No tenés agente de retención: desde 2026 te corresponden anticipos semestrales"*) and when `unresolved` is non-empty.

BPC and UI come from the same two fetches as Task 4 — copy that block.

`faq` and `sources` arrays passed to `ToolShell`, sourced from the spec.

- [ ] **Step 5: Run the e2e test to verify it passes**

Run: `cd app && npx playwright test tests/e2e/impuestos-inversiones.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Run the full unit suite + lint**

Run: `cd app && npm run test:unit && npm run lint`
Expected: PASS (the tools catalogue test picks up the new entry).

- [ ] **Step 7: Commit**

```bash
git add app/pages/herramientas/calculadora-impuestos-inversiones.vue app/utils/tools.ts app/tests/e2e/impuestos-inversiones.spec.ts
git commit -m "feat(impuestos): two-mode capital-income tax calculator"
```

---

### Task 6: Correct what the site already publishes

**Files:**
- Modify: `app/utils/investments.ts` (the 12 `taxNote` fields)
- Modify: `app/pages/inversiones-uruguay.vue:188-219` (tax section) and its FAQ (`:483`)

**Interfaces:**
- Consumes: nothing new — this is a copy fix.
- Produces: nothing new.

**Why this is a task and not a footnote:** two of these errors can make a reader **under-declare**. The 8% is presented as a rate (it is a withholding, and only a local custodian may apply it), and the 20% ficto is presented as the default for selling securities (it is not — with a documented cost the rule is 12% on the real gain).

- [ ] **Step 1: Rewrite the `taxNote` of every row in `investments.ts`**

Replace the generic *"IRPF 12% general sobre rentas de capital mobiliario, con tasas reducidas según instrumento (consultar contador)"* (lines 69, 89, 128, 147, 332, 352 and friends) with the rate that actually applies to that row:

- **Bank/broker rows holding foreign securities** (`itau-inversiones`, and the other `banco_broker` rows): `'Intereses y dividendos: IRPF 12% (dividendos de fuente uruguaya 7%). Desde 2026 las ganancias de capital del exterior también pagan IRPF: 12%, o retención del 8% si el banco ejerce la custodia y actuás por su intermedio. Para activos cotizados comprados antes de 2026 el costo fiscal es la cotización al 31/12/2025.'`
- **Plazo fijo rows** (line 271 already has the matrix — keep it, it is correct): leave as is.
- **LRM / deuda pública rows** (lines 291, 311): correct already, but extend — the exemption also covers the **capital gain** on transferring them, not just the interest. Keep the honest "artículo exacto no verificado" caveat **only if** the article is still unverified; the spec now confirms **Título 7 art. 38 lit. A**, so replace the caveat with the article.
- **International broker rows** (lines 187, 228, 249 — eToro, XTB, etc.): replace the current text. It says a resident agent withholding gives you 8%. Correct text: `'Desde 2026 (Ley 20.446) las rentas y ganancias de capital del exterior pagan IRPF al 12%. Operando directo con un bróker del exterior NO hay retención uruguaya: te corresponden anticipos semestrales o declaración jurada (F. 1101). El 8% es una retención reducida y solo la puede aplicar un bróker/custodio uruguayo. Para activos cotizados comprados antes del 31/12/2025, el costo fiscal es su cotización a esa fecha.'`
- **Crypto rows**: `'Zona gris: no hay norma tributaria específica. La Ley 20.345 regula a los proveedores, no la tributación, y ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan la cripto. Consultá un contador.'` — **no percentage**.
- **FCI rows** (lines 166, 208): `'Los rendimientos de FCI están exentos solo si el fondo invierte en valores públicos o privados con oferta pública (T7 art. 38 lit. P). Fuera de ese caso, IRPF 12%.'`

Append to every note: nothing. The page links to `/impuestos-inversiones-uruguay` once, at the section level.

- [ ] **Step 2: Rewrite the tax section of `pages/inversiones-uruguay.vue` (lines 188–219)**

Keep the three-paragraph shape but fix it:
- Paragraph 1: the 12% general + the **nine-cell** deposit matrix (say pesos 5,5/2,5/0,5 · UI 10/7/5 · USD 12/12/7). **Delete** the claim that selling securities is taxed on a 20% ficto ≈ 2,4%; replace with: the default is 12% on the real gain (price − adjusted cost); the 20% ficto is mandatory only when the cost cannot be proven and optional for pre-2007 and foreign assets.
- Paragraph 2: the 2026 reform. Fix the 8%: it is a **withholding**, only a Uruguayan broker/custodian that holds the assets may apply it, and it is definitive only if you opt for it. Add: with a foreign broker there is **no** withholding — semi-annual anticipos or a DJ. Add the **31/12/2025 step-up**.
- Paragraph 3: public debt exempt (interest **and** capital gain, T7 art. 38 lit. A), AFAP exempt — keep. Add a link: `Ver la guía completa: /impuestos-inversiones-uruguay`.

- [ ] **Step 3: Fix the FAQ at `pages/inversiones-uruguay.vue:483`**

Rewrite the answer to *"¿Cómo se pagan impuestos por invertir en Uruguay?"* so it matches the corrected section. Do not leave the 8%-as-rate wording in the JSON-LD — it is what Google reads.

- [ ] **Step 4: Verify**

Run: `cd app && npm run test:unit && npm run lint`
Expected: PASS.

Then grep for the errors to prove they are gone:
Run: `cd app && grep -rn "2,4%\|8% si\|retención definitiva reducida" utils/investments.ts pages/inversiones-uruguay.vue`
Expected: no hits (or only hits inside a correctly-qualified explanation of the ficto).

- [ ] **Step 5: Commit**

```bash
git add app/utils/investments.ts app/pages/inversiones-uruguay.vue
git commit -m "fix(inversiones): correct the 8% withholding and the 20% ficto, add the 2025 step-up

The page presented the 8% as a tax rate applicable whenever any resident agent
withholds. It is a reduced WITHHOLDING that only a local broker holding custody
of the assets may apply, and it is definitive only on election. It also
presented the 20% ficto as the regime for selling securities; with a documented
cost the rule is 12% on the real gain, so the old text could lead a reader to
under-declare."
```

---

### Task 7: Glossary, FAQs and cross-links

**Files:**
- Modify: `app/utils/glossary.ts`
- Modify: `app/utils/personalFinanceFaq.ts`
- Modify: `app/pages/herramientas/calculadora-irpf.vue`, `app/pages/herramientas/calculadora-sueldo-liquido.vue`
- Modify: `app/pages/mejores-bancos-uruguay.vue`, `app/pages/salud-financiera.vue`, `app/pages/invertir-en-proyectos-uruguayos.vue`

**Interfaces:**
- Consumes: the routes from Tasks 4–5.
- Produces: internal links into the new pages.

- [ ] **Step 1: Add glossary terms**

Append to `glossary` in `app/utils/glossary.ts`, all with `category: 'impuestos'` (the category already exists). Follow the existing `GlossaryTerm` shape (`slug`, `term`, `category`, `short`, `body`, `example?`, `related`). Terms:

`irpf-categoria-i`, `irpf-categoria-ii`, `irnr`, `iass`, `incremento-patrimonial`, `renta-de-fuente-extranjera`, `residencia-fiscal`, `step-up-2025`.

Each `body` is 1–2 paragraphs from the spec. Cross-link them via `related`, and link `irpf-categoria-i` ↔ `irpf-categoria-ii` so the salary/investment distinction is discoverable.

- [ ] **Step 2: Add FAQs**

Append to `PERSONAL_FAQS` in `app/utils/personalFinanceFaq.ts`, `category: 'ahorro_inversion'` (or `impuestos_tramites` where it fits better — both categories already exist). Follow the `PersonalFaq` shape (`id`, `question`, `shortAnswer`, `answer`, `category`, `tags`, `howCommon`):

1. `pago-impuestos-broker-exterior` — ¿Pago impuestos por mi cuenta en eToro / Interactive Brokers?
2. `pago-impuestos-cripto` — ¿La cripto paga impuestos en Uruguay? (**answer says "no está resuelto"; no percentage**)
3. `me-retiene-el-banco-irpf` — ¿El banco me retiene el IRPF solo?
4. `tengo-dolares-subio-el-dolar-pago` — Tengo dólares y subió el dólar, ¿pago IRPF? (**No — T7 art. 38 lit. G**)
5. `tengo-que-declarar-si-ya-me-retuvieron` — ¿Tengo que hacer la declaración si ya me retuvieron?
6. `herede-plata-pago-impuestos` — Heredé, ¿pago impuestos? (**No — no hay impuesto sucesorio**)

- [ ] **Step 3: Cross-link the salary calculators**

`calculadora-irpf.vue` and `calculadora-sueldo-liquido.vue` compute **Categoría II** (rentas del trabajo). Add a `VAlert type="info"` under the result, in both:

```vue
<VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
  Esta calculadora es de <strong>IRPF Categoría II</strong> (rentas del trabajo). Si lo que
  querés saber es cuánto pagás por un plazo fijo, un dividendo, un alquiler o tu cuenta en un
  bróker del exterior, eso es <strong>Categoría I</strong>:
  <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-inversiones')">
    calculadora de impuestos sobre inversiones
  </NuxtLink>.
</VAlert>
```

(`localePath` is already in scope in both files.)

- [ ] **Step 4: Cross-link the three content pages**

- `mejores-bancos-uruguay.vue`: one sentence — Uruguayan banks withhold IRPF on capital income automatically and you may treat the withholding as definitive; a foreign broker withholds nothing. Link to `/impuestos-inversiones-uruguay`.
- `salud-financiera.vue`: one sentence in the savings/investment pillar + link.
- `invertir-en-proyectos-uruguayos.vue`: one sentence on how those investments are taxed + link.

- [ ] **Step 5: Verify**

Run: `cd app && npm run test:unit && npm run lint`
Expected: PASS — including `glossary`-related and `personalFinanceFaq.test.ts` (they assert unique slugs/ids; a duplicate will fail loudly).

- [ ] **Step 6: Commit**

```bash
git add app/utils/glossary.ts app/utils/personalFinanceFaq.ts app/pages/herramientas/calculadora-irpf.vue app/pages/herramientas/calculadora-sueldo-liquido.vue app/pages/mejores-bancos-uruguay.vue app/pages/salud-financiera.vue app/pages/invertir-en-proyectos-uruguayos.vue
git commit -m "feat(impuestos): glossary terms, tax FAQs and cross-links from the salary calculators"
```

---

### Task 8: Site-wide audit for the stale tax figures

**Files:**
- Modify: whatever the grep finds.

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

The research found figures that are wrong **in 2026** and that are still published by the calculators that rank first on Google. If we copied any of them, we ship the same error.

- [ ] **Step 1: Grep for each stale figure**

```bash
cd app
# IASS: the old scale was MNI 96 BPC and a 10% first bracket. Correct: 108 BPC / 6%.
grep -rn "96 BPC\|96BPC\|iass" utils/ pages/ --include=*.ts --include=*.vue -i
# Impuesto al Patrimonio: residents pay a FLAT 0,10%. A progressive scale for residents is wrong.
grep -rn "patrimonio" utils/ pages/ --include=*.ts --include=*.vue -i
# The "7% para siempre" tax holiday closed on 31/12/2025.
grep -rn "7% para siempre\|tax holiday\|impatriado" utils/ pages/ --include=*.ts --include=*.vue -i
# Any crypto tax percentage anywhere.
grep -rn "cripto" utils/ pages/ --include=*.ts --include=*.vue -i | grep -i "%\|irpf\|impuesto"
# DJ deadlines staggered by ID digit — no such thing for the annual IRPF return.
grep -rn "terminación de\|último dígito\|vencimiento.*cédula" utils/ pages/ --include=*.ts --include=*.vue -i
```

- [ ] **Step 2: Fix every hit against the spec**

For each hit, check the figure against `docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md` and correct it. If a page states a figure the spec marks as unverified, either remove it or mark it as unverified in the copy. **Do not invent a replacement figure.**

If the greps return no hits outside the files already touched, record that in the commit body — a clean audit is a result worth stating.

- [ ] **Step 3: Full verification**

Run: `cd app && npm run test:unit && npm run lint`
Expected: PASS.

Run: `cd app && npx playwright test tests/e2e/impuestos-inversiones.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A app/
git commit -m "fix(impuestos): sweep the site for stale IASS, patrimonio and tax-holiday figures"
```

---

## Self-Review

**Spec coverage:** deposit matrix → Task 1. Dividends, public debt, FCI, rent, capital gains, exemptions → Tasks 1–2, surfaced in Task 4. 2026 reform (8% vs 12%, anticipos, step-up, art. 21/22, foreign credit) → Task 3 + Task 4 §9. Residencia fiscal + tax holiday → Task 4 §10. Impuesto al Patrimonio → Task 4 §11. IASS → Task 4 §12. Cumplimiento + CRS → Task 4 §13–14. Myths → Task 4 §15. Crypto-as-unresolved → Tasks 1, 4 §8, 5, 6, 7. The seven corrections → Task 6 + the Task 8 sweep. Integrations → Task 7. Tests → every task.

**Placeholders:** none. Every code step carries its code; every content step names its sections and its copy source.

**Type consistency:** `TaxRule.rate` is `number | null` throughout (crypto is the null case, and every consumer uses `?? 0` or branches on `confidence`). `Currency` is `'UYU' | 'UYU_UI' | 'USD'` in the matrix, in `depositReturn` and in `AnnualIncomeItem`. `DepositTerm` is produced only by `termFromMonths` and consumed only by `depositRule`. `CapitalGainMethod` is shared by `capitalGainTax` and `AnnualIncomeItem['ganancia_local']`. `WithholdingAgent` is shared by `foreignIncomeTax` and `AnnualIncomeItem['exterior']`.
