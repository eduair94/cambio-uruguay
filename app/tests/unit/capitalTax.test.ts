import { describe, expect, it } from 'vitest'
import {
  capitalGainTax,
  CRYPTO_RULE,
  depositReturn,
  depositRule,
  isCapitalGainExempt,
  isSmallLandlordExempt,
  rentTax,
  RENT_WITHHOLDING_PCT,
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
