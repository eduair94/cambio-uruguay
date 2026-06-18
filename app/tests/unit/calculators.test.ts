import { describe, expect, it } from 'vitest'
import {
  addIva,
  adjustByInflation,
  compoundInterest,
  computeAguinaldo,
  computeSpread,
  irpfBracketsUyu,
  loanPayment,
  progressiveTax,
  removeIva,
  round,
  URUGUAY,
} from '../../utils/calculators'

describe('round', () => {
  it('rounds to the requested decimals and handles non-finite input', () => {
    expect(round(1.005, 2)).toBe(1.01)
    expect(round(2.5, 0)).toBe(3)
    expect(round(Number.NaN)).toBe(0)
    expect(round(Infinity)).toBe(0)
  })
})

describe('IVA', () => {
  it('adds IVA at the basic rate', () => {
    const r = addIva(1000, 22)
    expect(r.iva).toBe(220)
    expect(r.gross).toBe(1220)
  })

  it('removes IVA so net + iva equals gross', () => {
    const r = removeIva(1220, 22)
    expect(r.net).toBe(1000)
    expect(round(r.net + r.iva)).toBe(1220)
  })

  it('treats negative amounts as zero', () => {
    expect(addIva(-50, 22).gross).toBe(0)
  })
})

describe('computeSpread', () => {
  it('computes absolute, percentage and mid', () => {
    const r = computeSpread(39.8, 41.2)
    expect(r.abs).toBeCloseTo(1.4, 4)
    expect(r.mid).toBeCloseTo(40.5, 4)
    expect(r.pct).toBeCloseTo(3.52, 1)
  })

  it('returns null percentage when buy is not positive', () => {
    expect(computeSpread(0, 10).pct).toBeNull()
  })
})

describe('progressiveTax', () => {
  it('taxes only the marginal portion in each bracket', () => {
    const brackets = [
      { upTo: 100, rate: 0 },
      { upTo: 200, rate: 10 },
      { upTo: null, rate: 20 },
    ]
    // 250 -> 0 on first 100, 10% of next 100 (=10), 20% of last 50 (=10) => 20
    const r = progressiveTax(250, brackets)
    expect(r.total).toBe(20)
    expect(r.detail).toHaveLength(3) // one line per touched bracket, incl. the 0% franja
    expect(r.detail[0]).toMatchObject({ rate: 0, tax: 0 })
  })

  it('returns zero for non-positive base', () => {
    expect(progressiveTax(0, irpfBracketsUyu()).total).toBe(0)
  })
})

describe('irpfBracketsUyu', () => {
  it('scales BPC bounds by the BPC value and keeps the open top bracket', () => {
    const brackets = irpfBracketsUyu(1000)
    expect(brackets[0]).toEqual({ upTo: 7000, rate: 0 })
    expect(brackets[brackets.length - 1]!.upTo).toBeNull()
    expect(brackets.length).toBe(URUGUAY.irpfBracketsBpc.length)
  })
})

describe('computeAguinaldo', () => {
  it('divides the semester total by 12', () => {
    expect(computeAguinaldo(120000)).toBe(10000)
  })
})

describe('compoundInterest', () => {
  it('grows a principal with annual compounding', () => {
    const r = compoundInterest(1000, 5, 10, 1)
    expect(r.finalAmount).toBeCloseTo(1628.89, 1)
    expect(r.interest).toBeCloseTo(628.89, 1)
  })

  it('handles zero years', () => {
    expect(compoundInterest(1000, 5, 0).finalAmount).toBe(1000)
  })
})

describe('loanPayment', () => {
  it('computes the French-system monthly payment', () => {
    const r = loanPayment(100000, 12, 12)
    expect(r.monthlyPayment).toBeGreaterThan(8000)
    expect(r.totalPaid).toBeGreaterThan(100000)
    expect(r.totalInterest).toBeGreaterThan(0)
  })

  it('splits evenly with a zero rate', () => {
    const r = loanPayment(1200, 0, 12)
    expect(r.monthlyPayment).toBe(100)
    expect(r.totalInterest).toBe(0)
  })

  it('returns zeros for zero months', () => {
    expect(loanPayment(1000, 10, 0).monthlyPayment).toBe(0)
  })
})

describe('adjustByInflation', () => {
  it('inflates the nominal value and deflates purchasing power', () => {
    const r = adjustByInflation(1000, 10, 2)
    expect(r.nominal).toBeCloseTo(1210, 0)
    expect(r.purchasingPower).toBeLessThan(1000)
  })
})
