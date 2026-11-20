// app/tests/unit/payroll.test.ts
import { describe, expect, it } from 'vitest'
import {
  computeAguinaldoLiquido,
  computePayroll,
  fonasaRate,
  marginalRate,
  nominalForLiquido,
  PAYROLL_UY,
} from '../../utils/payroll'
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
  it('computes IRPF gross from the franjas on nominal + 6 %, then the 14% deduction credit', () => {
    // 80.000 > 10 BPC (68.640) → computable 84.800 (Decreto 148/007 art. 63).
    // 0% up to 7 BPC (48.048); 10% on 48.048->68.640; 15% on 68.640->84.800
    expect(r.irpf.incrementApplied).toBe(true)
    expect(r.irpf.computable).toBe(84800)
    expect(r.irpf.grossTax).toBeCloseTo(4483.2, 1)
    expect(r.irpf.creditRate).toBe(14) // 80.000 < 15 BPC (102.960)
    expect(r.irpf.deductionsMonthly).toBe(15680) // aportes are themselves deductible
    expect(r.irpf.credit).toBeCloseTo(2195.2, 1)
    expect(r.irpf.tax).toBeCloseTo(2288, 1)
  })
  it('lands on the same líquido as the DGI-simulator arithmetic of irpfCasos.ts', () => {
    // Until 2026-10-19 the 6 % was skipped: tax 1.568 and líquido 62.752, $ 720 too high.
    expect(r.liquido).toBeCloseTo(62032, 0)
    expect(r.totalDescuentos).toBeCloseTo(17968, 0)
    expect(r.descuentoPct).toBeCloseTo(22.5, 1)
  })
})

describe('computePayroll — the 6 % increment starts above 10 BPC', () => {
  it('does not apply at or below 10 BPC ($ 68.640)', () => {
    const r = computePayroll({ nominal: 68640 })
    expect(r.irpf.incrementApplied).toBe(false)
    expect(r.irpf.computable).toBe(68640)
  })
  it('applies just above it, and agrees with estimateMonthlyWithholding for a no-children worker', async () => {
    const { estimateMonthlyWithholding } = await import('../../utils/irpfCasos')
    for (const nominal of [70000, 80000, 120000]) {
      const r = computePayroll({ nominal })
      expect(r.irpf.incrementApplied).toBe(true)
      expect(r.irpf.computable).toBe(Math.round(nominal * 1.06))
      expect(r.irpf.tax).toBeCloseTo(estimateMonthlyWithholding(nominal).withholding, 0)
    }
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

  it('keeps the 14% credit rate up to and including 15 BPC, 8% above it', () => {
    // Decreto 148/007 art. 63 («Hasta 15 BPC 14% / Más de 15 BPC 8%») and BPS Comunicado R 5/2026
    // («≤ 102.960 14 %»). Until 2026-11-20 this module switched AT 15 BPC: $ 1.210 less in hand
    // than `irpfCasos.estimateMonthlyWithholding` for the same $ 102.960.
    expect(computePayroll({ nominal: 15 * BPC }).irpf.creditRate).toBe(PAYROLL_UY.creditRateLow)
    expect(computePayroll({ nominal: 15 * BPC + 1 }).irpf.creditRate).toBe(
      PAYROLL_UY.creditRateHigh
    )
  })

  it('agrees with estimateMonthlyWithholding exactly at 15 BPC', async () => {
    const { estimateMonthlyWithholding } = await import('../../utils/irpfCasos')
    expect(computePayroll({ nominal: 15 * BPC }).irpf.tax).toBeCloseTo(
      estimateMonthlyWithholding(15 * BPC).withholding,
      0
    )
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
    // At $60.000 (below 10 BPC, no 6 % increment) a disabled child generates more credit than the gross tax.
    const r = computePayroll({ nominal: 60000, hijosDiscapacidad: 1 })
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

  // The líquido is NOT monotonic in the nominal: it drops when the nominal crosses 2,5 BPC (FONASA
  // 3 % -> 4,5 %), 10 BPC (+6 % on the IRPF base) and 15 BPC (credit 14 % -> 8 %). A plain
  // bisection could land on the far side of a drop and return a nominal much higher than needed:
  // until 2026-11-20 a $ 55.000 target returned $ 69.542 although $ 68.640 already gives $ 55.010.
  const STEPS = [2.5 * BPC, 10 * BPC, 15 * BPC]

  it('returns the smallest nominal across a drop at 10 BPC and at 15 BPC', () => {
    const a = nominalForLiquido(55000)
    expect(a).toBeLessThanOrEqual(10 * BPC)
    expect(Math.abs(computePayroll({ nominal: a }).liquido - 55000)).toBeLessThan(0.5)
    const b = nominalForLiquido(76000)
    expect(b).toBeLessThanOrEqual(15 * BPC)
    expect(Math.abs(computePayroll({ nominal: b }).liquido - 76000)).toBeLessThan(0.5)
  })

  it('never skips a step that already reaches the target (10.000 to 250.000, every 250)', () => {
    for (let target = 10000; target <= 250000; target += 250) {
      const nominal = nominalForLiquido(target)
      expect(Math.abs(computePayroll({ nominal }).liquido - target)).toBeLessThan(0.5)
      for (const step of STEPS) {
        if (step < nominal) expect(computePayroll({ nominal: step }).liquido).toBeLessThan(target)
      }
    }
  })
})

describe('computeAguinaldoLiquido', () => {
  it('descuenta jubilatorio, FONASA, FRL e IRPF a la tasa marginal del sueldo', () => {
    // $ 50.000 por mes, seis meses: aguinaldo $ 25.000. FONASA 4,5 % (sueldo > 2,5 BPC, solo),
    // IRPF 10 % (el sueldo pasa 7 BPC y no llega a 10).
    const r = computeAguinaldoLiquido({ aguinaldo: 25000, sueldoMensual: 50000 })
    expect(r.jubilatorio.amount).toBe(3750)
    expect(r.fonasa).toEqual({ rate: 4.5, amount: 1125 })
    expect(r.frl.amount).toBe(25)
    expect(r.irpf).toEqual({ rate: 10, amount: 2500 })
    expect(r.totalDescuentos).toBe(7400)
    expect(r.liquido).toBe(17600)
  })

  it('la tasa de FONASA sale del sueldo del mes, no del aguinaldo', () => {
    // El aguinaldo de $ 15.000 está por debajo de 2,5 BPC, el sueldo de $ 30.000 no.
    expect(computeAguinaldoLiquido({ aguinaldo: 15000, sueldoMensual: 30000 }).fonasa.rate).toBe(
      4.5
    )
    expect(
      computeAguinaldoLiquido({ aguinaldo: 15000, sueldoMensual: 30000, hijos: 1 }).fonasa.rate
    ).toBe(6)
    expect(
      computeAguinaldoLiquido({
        aguinaldo: 15000,
        sueldoMensual: 30000,
        hijos: 2,
        conyugeACargo: true,
      }).fonasa.rate
    ).toBe(8)
  })

  it('sin IRPF hasta 7 BPC de sueldo, y la tasa sube con el 6 % por encima de 10 BPC', () => {
    expect(computeAguinaldoLiquido({ aguinaldo: 20000, sueldoMensual: 40000 }).irpf.amount).toBe(0)
    // $ 80.000 + 6 % = $ 84.800: entre 10 y 15 BPC, 15 %.
    expect(computeAguinaldoLiquido({ aguinaldo: 40000, sueldoMensual: 80000 }).irpf.rate).toBe(15)
    // Justo en 7 BPC sigue en la franja de 0 %.
    const bpc = URUGUAY.bpc
    expect(computeAguinaldoLiquido({ aguinaldo: 1000, sueldoMensual: 7 * bpc }).irpf.rate).toBe(0)
  })

  it('avisa cuando el aguinaldo pasa el tope jubilatorio en vez de inventarlo', () => {
    expect(
      computeAguinaldoLiquido({ aguinaldo: 150000, sueldoMensual: 300000 }).superaTopeJubilatorio
    ).toBe(true)
    expect(
      computeAguinaldoLiquido({ aguinaldo: 25000, sueldoMensual: 50000 }).superaTopeJubilatorio
    ).toBe(false)
  })

  it('nunca da un líquido negativo ni mayor que el nominal', () => {
    for (const sueldo of [0, 20000, 60000, 120000, 400000]) {
      const r = computeAguinaldoLiquido({ aguinaldo: sueldo / 2, sueldoMensual: sueldo })
      expect(r.liquido).toBeGreaterThanOrEqual(0)
      expect(r.liquido).toBeLessThanOrEqual(r.aguinaldo)
    }
  })
})

describe('marginalRate', () => {
  it('devuelve la tasa de la franja en la que cae la base', () => {
    const brackets = [
      { upTo: 100, rate: 0 },
      { upTo: 200, rate: 10 },
      { upTo: null, rate: 20 },
    ]
    expect(marginalRate(0, brackets)).toBe(0)
    expect(marginalRate(100, brackets)).toBe(0)
    expect(marginalRate(150, brackets)).toBe(10)
    expect(marginalRate(5000, brackets)).toBe(20)
  })
})
