// app/tests/unit/payroll.test.ts
import { describe, expect, it } from 'vitest'
import { computePayroll, fonasaRate, nominalForLiquido, PAYROLL_UY } from '../../utils/payroll'
import { URUGUAY } from '../../utils/calculators'

const BPC = URUGUAY.bpc // 6864 (2026)

describe('fonasaRate (BPS table)', () => {
  const low = 2 * BPC // under the 2,5 BPC threshold
  const high = 5 * BPC // over it

  it('applies the low-income table (<= 2,5 BPC)', () => {
    expect(fonasaRate(low, BPC, 0, false)).toBe(3)
    expect(fonasaRate(low, BPC, 2, false)).toBe(3) // hijos don't raise it below the threshold
    expect(fonasaRate(low, BPC, 0, true)).toBe(5)
    expect(fonasaRate(low, BPC, 2, true)).toBe(5)
  })

  it('applies the high-income table (> 2,5 BPC)', () => {
    expect(fonasaRate(high, BPC, 0, false)).toBe(4.5)
    expect(fonasaRate(high, BPC, 1, false)).toBe(6)
    expect(fonasaRate(high, BPC, 0, true)).toBe(6.5)
    expect(fonasaRate(high, BPC, 1, true)).toBe(8)
  })

  it('switches exactly at 2,5 BPC (strictly greater)', () => {
    const at = 2.5 * BPC
    expect(fonasaRate(at, BPC, 0, false)).toBe(3)
    expect(fonasaRate(at + 1, BPC, 0, false)).toBe(4.5)
  })
})

describe('computePayroll — reference case: $80.000 nominal, sin dependientes', () => {
  const r = computePayroll({ nominal: 80000 })

  it('withholds jubilatorio 15%', () => {
    expect(r.jubilatorio.amount).toBe(12000)
    expect(r.jubilatorio.topeApplied).toBe(false)
  })
  it('withholds FONASA 4,5% (over 2,5 BPC, no dependants)', () => {
    expect(r.fonasa.rate).toBe(4.5)
    expect(r.fonasa.amount).toBe(3600)
  })
  it('withholds FRL 0,1%', () => {
    expect(r.frl.amount).toBe(80)
  })
  it('sums aportes to 15.680', () => {
    expect(r.aportes).toBe(15680)
  })
  it('computes IRPF gross from the franjas, then the 14% deduction credit', () => {
    // 0% up to 7 BPC (48.048); 10% on 48.048->68.640; 15% on 68.640->80.000
    expect(r.irpf.grossTax).toBeCloseTo(3763.2, 1)
    expect(r.irpf.creditRate).toBe(14) // 80.000 < 15 BPC (102.960)
    expect(r.irpf.deductionsMonthly).toBe(15680) // aportes are themselves deductible
    expect(r.irpf.credit).toBeCloseTo(2195.2, 1)
    expect(r.irpf.tax).toBeCloseTo(1568, 1)
  })
  it('lands on a líquido that matches the published reference (~$63.000)', () => {
    expect(r.liquido).toBeCloseTo(62752, 0)
    expect(r.totalDescuentos).toBeCloseTo(17248, 0)
    expect(r.descuentoPct).toBeCloseTo(21.6, 1)
  })
})

describe('computePayroll — IRPF edges', () => {
  it('pays no IRPF below the 7 BPC minimum non-taxable', () => {
    const r = computePayroll({ nominal: 6 * BPC })
    expect(r.irpf.grossTax).toBe(0)
    expect(r.irpf.tax).toBe(0)
  })

  it('never returns a negative IRPF (credit cannot go below zero)', () => {
    // Just over the minimum: the credit exceeds the tiny gross tax.
    const r = computePayroll({ nominal: 7.2 * BPC, hijos: 3 })
    expect(r.irpf.tax).toBeGreaterThanOrEqual(0)
  })

  it('drops the credit rate to 8% at or above 15 BPC of monthly nominal', () => {
    const below = computePayroll({ nominal: 15 * BPC - 1 })
    const atOrAbove = computePayroll({ nominal: 15 * BPC })
    expect(below.irpf.creditRate).toBe(PAYROLL_UY.creditRateLow)
    expect(atOrAbove.irpf.creditRate).toBe(PAYROLL_UY.creditRateHigh)
  })

  it('a child raises the FONASA rate as well as adding an IRPF deduction', () => {
    // Both effects are real and must not be conflated: hijos push FONASA 4,5% -> 6%.
    const base = computePayroll({ nominal: 200000 })
    const oneKid = computePayroll({ nominal: 200000, hijos: 1 })
    expect(base.fonasa.rate).toBe(4.5)
    expect(oneKid.fonasa.rate).toBe(6)
    expect(oneKid.irpf.tax).toBeLessThan(base.irpf.tax)
  })

  it('a discapacidad child deducts exactly 20 BPC/yr more than a normal one', () => {
    // Compare kid vs disabled-kid: both count as a dependant, so FONASA is identical
    // and the only difference left is the deduction (20 BPC vs 40 BPC per year).
    const n = 200000
    const oneKid = computePayroll({ nominal: n, hijos: 1 })
    const oneDisabled = computePayroll({ nominal: n, hijosDiscapacidad: 1 })
    const extraMonthly = (PAYROLL_UY.hijoDeduccionBpc * BPC) / 12

    expect(oneDisabled.aportes).toBe(oneKid.aportes) // same FONASA rate
    expect(oneDisabled.irpf.deductionsMonthly - oneKid.irpf.deductionsMonthly).toBeCloseTo(
      extraMonthly,
      1
    )
    expect(oneDisabled.irpf.credit - oneKid.irpf.credit).toBeCloseTo(
      (extraMonthly * oneKid.irpf.creditRate) / 100,
      1
    )
    expect(oneDisabled.irpf.tax).toBeLessThan(oneKid.irpf.tax)
    expect(oneDisabled.irpf.tax).toBeGreaterThan(0)
  })

  it('a big credit floors IRPF at zero rather than going negative', () => {
    // At $90.000 a disabled child generates more credit than the gross tax.
    const r = computePayroll({ nominal: 90000, hijosDiscapacidad: 1 })
    expect(r.irpf.credit).toBeGreaterThan(r.irpf.grossTax)
    expect(r.irpf.tax).toBe(0)
  })

  it('caps the mortgage deduction at 36 BPC per year', () => {
    const atCap = computePayroll({ nominal: 90000, cuotaHipotecariaAnual: 36 * BPC })
    const overCap = computePayroll({ nominal: 90000, cuotaHipotecariaAnual: 999 * BPC })
    expect(overCap.irpf.tax).toBe(atCap.irpf.tax)
  })
})

describe('computePayroll — jubilatorio tope', () => {
  it('stops contributing jubilatorio above the tope', () => {
    const over = computePayroll({ nominal: PAYROLL_UY.jubilatorioTope + 100000 })
    expect(over.jubilatorio.topeApplied).toBe(true)
    expect(over.jubilatorio.base).toBe(PAYROLL_UY.jubilatorioTope)
    expect(over.jubilatorio.amount).toBeCloseTo((PAYROLL_UY.jubilatorioTope * 15) / 100, 0)
  })

  it('FONASA still applies to the full nominal above the jubilatorio tope', () => {
    const n = PAYROLL_UY.jubilatorioTope + 100000
    const r = computePayroll({ nominal: n })
    expect(r.fonasa.amount).toBeCloseTo((n * 4.5) / 100, 0)
  })
})

describe('computePayroll — invariants', () => {
  it('líquido is always positive and below nominal for realistic salaries', () => {
    for (const n of [30000, 60000, 100000, 250000, 500000]) {
      const r = computePayroll({ nominal: n })
      expect(r.liquido).toBeGreaterThan(0)
      expect(r.liquido).toBeLessThan(n)
      expect(r.liquido).toBeCloseTo(n - r.totalDescuentos, 1)
    }
  })
  it('handles zero and garbage input without throwing', () => {
    expect(computePayroll({ nominal: 0 }).liquido).toBe(0)
    expect(computePayroll({ nominal: -5000 }).liquido).toBe(0)
  })
})

describe('nominalForLiquido (reverse mode)', () => {
  it('round-trips: the nominal it finds produces the requested líquido', () => {
    for (const target of [40000, 62752, 120000]) {
      const nominal = nominalForLiquido(target)
      expect(computePayroll({ nominal }).liquido).toBeCloseTo(target, 0)
    }
  })
  it('respects dependants (needs less nominal when IRPF drops)', () => {
    const plain = nominalForLiquido(80000)
    const withKids = nominalForLiquido(80000, { hijos: 2 })
    expect(withKids).toBeLessThan(plain)
  })
  it('returns 0 for a zero target', () => {
    expect(nominalForLiquido(0)).toBe(0)
  })
})
