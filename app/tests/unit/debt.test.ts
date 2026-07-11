// app/tests/unit/debt.test.ts
import { describe, expect, it } from 'vitest'
import {
  compareStrategies,
  effectiveRate,
  monthlyRate,
  payoffPlan,
  type Debt,
} from '../../utils/debt'

const debt = (over: Partial<Debt> & { id: string }): Debt => ({
  name: over.id,
  balance: 10000,
  annualRatePct: 60,
  minPayment: 1000,
  ...over,
})

describe('monthlyRate', () => {
  it('converts a TEA into the equivalent effective monthly rate', () => {
    // 12,68% annual == 1% monthly compounded.
    expect(monthlyRate(12.6825)).toBeCloseTo(0.01, 4)
  })
  it('is zero for a zero rate and never negative', () => {
    expect(monthlyRate(0)).toBe(0)
    expect(monthlyRate(-10)).toBe(0)
  })
})

describe('payoffPlan', () => {
  it('clears a single interest-free debt in the expected number of months', () => {
    const plan = payoffPlan([debt({ id: 'a', balance: 10000, annualRatePct: 0, minPayment: 1000 })])
    expect(plan.neverPaysOff).toBe(false)
    expect(plan.months).toBe(10)
    expect(plan.totalInterest).toBe(0)
    expect(plan.totalPaid).toBeCloseTo(10000, 0)
  })

  it('charges interest, so a real debt costs more than its balance', () => {
    const plan = payoffPlan([
      debt({ id: 'a', balance: 10000, annualRatePct: 60, minPayment: 1000 }),
    ])
    expect(plan.totalInterest).toBeGreaterThan(0)
    expect(plan.totalPaid).toBeGreaterThan(10000)
    expect(plan.months).toBeGreaterThan(10)
  })

  it('extra payments shorten the plan and cut the interest', () => {
    const debts = [debt({ id: 'a', balance: 50000, annualRatePct: 80, minPayment: 3000 })]
    const slow = payoffPlan(debts, 0)
    const fast = payoffPlan(debts, 5000)
    expect(fast.months).toBeLessThan(slow.months)
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest)
  })

  it('flags debts that never pay off when the minimum does not cover the interest', () => {
    // 100% TEA on 100.000 is ~5.900/month of interest; paying 500 never clears it.
    const plan = payoffPlan([
      debt({ id: 'a', balance: 100000, annualRatePct: 100, minPayment: 500 }),
    ])
    expect(plan.neverPaysOff).toBe(true)
    expect(plan.months).toBe(0)
  })

  it('avalancha attacks the highest rate first', () => {
    const debts = [
      debt({ id: 'cheap', balance: 5000, annualRatePct: 20, minPayment: 500 }),
      debt({ id: 'expensive', balance: 20000, annualRatePct: 120, minPayment: 500 }),
    ]
    const plan = payoffPlan(debts, 4000, 'avalancha')
    expect(plan.order[0]!.id).toBe('expensive')
  })

  it('bola de nieve attacks the smallest balance first', () => {
    const debts = [
      debt({ id: 'small', balance: 5000, annualRatePct: 20, minPayment: 500 }),
      debt({ id: 'big', balance: 20000, annualRatePct: 120, minPayment: 500 }),
    ]
    const plan = payoffPlan(debts, 4000, 'bola_de_nieve')
    expect(plan.order[0]!.id).toBe('small')
  })

  it('frees the minimum of a cleared debt into the remaining ones', () => {
    const debts = [
      debt({ id: 'a', balance: 2000, annualRatePct: 0, minPayment: 1000 }),
      debt({ id: 'b', balance: 8000, annualRatePct: 0, minPayment: 1000 }),
    ]
    // Total budget is 2.000/month against 10.000 of interest-free debt => 5 months.
    const plan = payoffPlan(debts, 0, 'bola_de_nieve')
    expect(plan.months).toBe(5)
  })

  it('handles an empty list', () => {
    const plan = payoffPlan([])
    expect(plan.months).toBe(0)
    expect(plan.order).toEqual([])
    expect(plan.neverPaysOff).toBe(false)
  })
})

describe('compareStrategies', () => {
  it('avalancha never costs more interest than bola de nieve', () => {
    const debts = [
      debt({ id: 'small_expensive', balance: 8000, annualRatePct: 140, minPayment: 600 }),
      debt({ id: 'big_cheap', balance: 40000, annualRatePct: 25, minPayment: 1500 }),
      debt({ id: 'mid', balance: 15000, annualRatePct: 70, minPayment: 800 }),
    ]
    const { avalancha, bola, interestSaved } = compareStrategies(debts, 3000)
    expect(avalancha.totalInterest).toBeLessThanOrEqual(bola.totalInterest)
    expect(interestSaved).toBeGreaterThanOrEqual(0)
  })
})

describe('effectiveRate', () => {
  it('recovers a known rate from the cash flows', () => {
    // 100.000 at 5% effective monthly over 12 months => cuota ~11.282,54
    const i = 0.05
    const n = 12
    const p = 100000
    const cuota = (p * i) / (1 - Math.pow(1 + i, -n))
    const r = effectiveRate(p, cuota, n)!
    expect(r.monthlyPct).toBeCloseTo(5, 1)
    // TEA = (1,05^12 - 1) = 79,59%
    expect(r.annualPct).toBeCloseTo(79.59, 0)
  })

  it('exposes the real cost of a "low monthly rate" loan', () => {
    // You get 20.000 and pay 2.500 x 12 = 30.000. That is far more than the flyer implies.
    const r = effectiveRate(20000, 2500, 12)!
    expect(r.totalPaid).toBe(30000)
    expect(r.totalInterest).toBe(10000)
    expect(r.annualPct).toBeGreaterThan(100) // brutal, and that is the point
  })

  it('returns null when the numbers do not describe a loan', () => {
    expect(effectiveRate(0, 1000, 12)).toBeNull()
    expect(effectiveRate(10000, 0, 12)).toBeNull()
    expect(effectiveRate(10000, 1000, 0)).toBeNull()
    // Paying back no more than you got means there is no positive rate.
    expect(effectiveRate(10000, 800, 12)).toBeNull()
  })

  it('is monotonic: a bigger cuota implies a bigger rate', () => {
    const a = effectiveRate(50000, 5000, 12)!
    const b = effectiveRate(50000, 6000, 12)!
    expect(b.annualPct).toBeGreaterThan(a.annualPct)
  })
})
