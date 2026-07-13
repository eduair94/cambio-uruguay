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
