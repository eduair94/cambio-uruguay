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
 * Deposits, ONs and fideicomisos financieros con oferta pública: nine cells by currency
 * and term (T7 art. 37 lit. A, rates in force since 1/1/2023).
 *
 * The USD "1 a 3 años" cell is 12%, NOT blank. In DGI's HTML it is a `rowspan` of the 12%
 * above it, so anyone copying the table visually leaves a hole there.
 */
export const DEPOSIT_RULES: Readonly<Record<Currency, Readonly<Record<DepositTerm, TaxRule>>>> =
  Object.freeze({
    UYU: Object.freeze({
      hasta_1a: rule(
        5.5,
        'Pesos, tasa fija nominal, hasta 1 año',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
      de_1a_3a: rule(
        2.5,
        'Pesos, tasa fija nominal, de 1 a 3 años',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
      mas_3a: rule(
        0.5,
        'Pesos, tasa fija nominal, más de 3 años',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
    }),
    UYU_UI: Object.freeze({
      hasta_1a: rule(
        10,
        'Pesos con reajuste (UI), hasta 1 año',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
      de_1a_3a: rule(
        7,
        'Pesos con reajuste (UI), de 1 a 3 años',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
      mas_3a: rule(
        5,
        'Pesos con reajuste (UI), más de 3 años',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
    }),
    USD: Object.freeze({
      hasta_1a: rule(12, 'Moneda extranjera, hasta 1 año', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
      de_1a_3a: rule(
        12,
        'Moneda extranjera, de 1 a 3 años',
        'Título 7, art. 37 lit. A',
        DGI_CAPITAL
      ),
      mas_3a: rule(7, 'Moneda extranjera, más de 3 años', 'Título 7, art. 37 lit. A', DGI_CAPITAL),
    }),
  })

/** "Restantes rentas": the headline 12%. */
export const GENERAL_RULE = rule(
  12,
  'Tasa general sobre rentas de capital',
  'Título 7, art. 37 lit. B',
  T7
)

/** Dividends and utilidades from IRAE taxpayers — and the dividendos fictos of art. 19. */
export const DIVIDEND_RULE = rule(
  7,
  'Dividendos y utilidades (incluidos los fictos)',
  'Título 7, art. 37 lit. B',
  T7
)

/**
 * Uruguayan public debt. The exemption is broader than "interest": art. 38 lit. A also
 * exempts "cualquier otro rendimiento de capital o incremento patrimonial" from holding or
 * transferring these instruments. Also not computable for Impuesto al Patrimonio (T14 art. 23).
 */
export const PUBLIC_DEBT_RULE = rule(
  0,
  'Deuda pública uruguaya (Bonos, Letras, LRM): exenta',
  'Título 7, art. 38 lit. A',
  T7
)

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
