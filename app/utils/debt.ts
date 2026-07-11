// app/utils/debt.ts
// Debt maths for /salir-del-clearing.
//
// Two things Reddit keeps asking for and nobody answers with numbers:
//   1. "¿Cómo salgo de esto?" -> `payoffPlan` simulates paying several debts month by
//      month under a strategy (avalancha = highest rate first, bola de nieve = smallest
//      balance first) and says WHEN you are free and what the interest costs you.
//   2. "¿Me están afanando?" -> `effectiveRate` recovers the REAL interest rate from what
//      you actually pay (monto recibido, cuota, nº de cuotas). Lenders quote a monthly
//      "tasa" that hides the real cost; this is the number to compare against the BCU
//      usury caps (Ley 18.212).
//
// Deliberately data-free: no rate table is hardcoded, because the BCU publishes new caps
// every quarter and a stale table would be worse than none. The page links the live BCU
// page and this module just computes YOUR rate.
//
// PURE module (no Vue/Nuxt). Informativo, no asesoramiento financiero.

import { round } from './calculators'

export type Strategy = 'avalancha' | 'bola_de_nieve'

export interface Debt {
  id: string
  name: string
  /** Outstanding balance in UYU. */
  balance: number
  /** Tasa efectiva anual (TEA) as a percentage, e.g. 60 for 60%. */
  annualRatePct: number
  /** Minimum monthly payment in UYU. */
  minPayment: number
}

export interface DebtOutcome {
  id: string
  name: string
  /** 1-based month in which this debt hits zero. */
  paidOffMonth: number
  interestPaid: number
}

export interface PayoffPlan {
  /** Months until every debt is cleared. */
  months: number
  totalInterest: number
  totalPaid: number
  /** Order the debts get cleared, with per-debt cost. */
  order: DebtOutcome[]
  /**
   * True when the minimum payments do not even cover the interest, so the debt never
   * clears. The UI must say this out loud instead of printing a fantasy date.
   */
  neverPaysOff: boolean
}

/** TEA (%) -> effective monthly rate as a fraction. */
export function monthlyRate(annualRatePct: number): number {
  const tea = Math.max(annualRatePct, 0) / 100
  return Math.pow(1 + tea, 1 / 12) - 1
}

const MAX_MONTHS = 600

/**
 * Simulate paying down several debts. Every month: interest accrues, minimums are paid,
 * and any spare cash (`extraMonthly`, plus the minimums freed by already-cleared debts)
 * is thrown at the strategy's target debt.
 */
export function payoffPlan(
  debts: readonly Debt[],
  extraMonthly = 0,
  strategy: Strategy = 'avalancha'
): PayoffPlan {
  const live = debts
    .filter(d => d.balance > 0)
    .map(d => ({
      ...d,
      balance: d.balance,
      interestPaid: 0,
      paidOffMonth: 0,
    }))

  if (!live.length) {
    return { months: 0, totalInterest: 0, totalPaid: 0, order: [], neverPaysOff: false }
  }

  const extra = Math.max(extraMonthly, 0)
  let totalInterest = 0
  let totalPaid = 0
  let month = 0

  while (live.some(d => d.balance > 0) && month < MAX_MONTHS) {
    month++

    // 1. Interest accrues on every live debt.
    for (const d of live) {
      if (d.balance <= 0) continue
      const interest = d.balance * monthlyRate(d.annualRatePct)
      d.balance += interest
      d.interestPaid += interest
      totalInterest += interest
    }

    // 2. Budget = every minimum (including from cleared debts, which frees cash) + extra.
    let budget = debts.reduce((n, d) => n + Math.max(d.minPayment, 0), 0) + extra

    // 3. Pay the minimum on each live debt first.
    for (const d of live) {
      if (d.balance <= 0) continue
      const pay = Math.min(Math.max(d.minPayment, 0), d.balance, budget)
      d.balance -= pay
      budget -= pay
      totalPaid += pay
      if (d.balance <= 0.005) {
        d.balance = 0
        d.paidOffMonth = month
      }
    }

    // 4. Everything left goes to the target debt, cascading as debts clear.
    let guard = 0
    while (budget > 0.005 && live.some(d => d.balance > 0) && guard++ < live.length + 1) {
      const target = pickTarget(live, strategy)
      if (!target) break
      const pay = Math.min(budget, target.balance)
      target.balance -= pay
      budget -= pay
      totalPaid += pay
      if (target.balance <= 0.005) {
        target.balance = 0
        target.paidOffMonth = month
      }
    }

    // 5. Nothing moved and interest is outrunning the payments -> it never clears.
    if (month > 1 && live.every(d => d.balance > 0)) {
      const totalMin = debts.reduce((n, d) => n + Math.max(d.minPayment, 0), 0) + extra
      const totalInterestThisMonth = live.reduce(
        (n, d) => n + d.balance * monthlyRate(d.annualRatePct),
        0
      )
      if (totalMin <= totalInterestThisMonth) {
        return {
          months: 0,
          totalInterest: round(totalInterest),
          totalPaid: round(totalPaid),
          order: [],
          neverPaysOff: true,
        }
      }
    }
  }

  const neverPaysOff = live.some(d => d.balance > 0)

  return {
    months: neverPaysOff ? 0 : month,
    totalInterest: round(totalInterest),
    totalPaid: round(totalPaid),
    neverPaysOff,
    order: neverPaysOff
      ? []
      : live
          .slice()
          .sort((a, b) => a.paidOffMonth - b.paidOffMonth)
          .map(d => ({
            id: d.id,
            name: d.name,
            paidOffMonth: d.paidOffMonth,
            interestPaid: round(d.interestPaid),
          })),
  }
}

function pickTarget<T extends { balance: number; annualRatePct: number }>(
  live: T[],
  strategy: Strategy
): T | undefined {
  const open = live.filter(d => d.balance > 0)
  if (!open.length) return undefined
  return open.reduce((best, d) => {
    if (strategy === 'avalancha') {
      return d.annualRatePct > best.annualRatePct ? d : best
    }
    return d.balance < best.balance ? d : best
  }, open[0]!)
}

/** Compare both strategies so the page can show what choosing well is worth. */
export function compareStrategies(debts: readonly Debt[], extraMonthly = 0) {
  const avalancha = payoffPlan(debts, extraMonthly, 'avalancha')
  const bola = payoffPlan(debts, extraMonthly, 'bola_de_nieve')
  return {
    avalancha,
    bola,
    /** What the cheaper strategy saves in interest. Positive => avalancha wins. */
    interestSaved: round(bola.totalInterest - avalancha.totalInterest),
  }
}

export interface EffectiveRateResult {
  /** Effective monthly rate, as a percentage. */
  monthlyPct: number
  /** Effective annual rate (TEA), as a percentage. */
  annualPct: number
  /** Everything you hand back minus what you got. */
  totalInterest: number
  totalPaid: number
}

/**
 * Recover the real rate of a loan from its cash flows: you received `principal` and pay
 * `payment` for `months` months. Solves principal = payment * (1-(1+i)^-n)/i for i by
 * bisection (the function is monotonic in i), then annualises.
 *
 * This is the number to compare against the BCU usury cap — not the "tasa" on the flyer.
 */
export function effectiveRate(
  principal: number,
  payment: number,
  months: number
): EffectiveRateResult | null {
  const p = Math.max(principal, 0)
  const c = Math.max(payment, 0)
  const n = Math.floor(months)
  if (p <= 0 || c <= 0 || n <= 0) return null

  const totalPaid = c * n
  // You must pay back more than you got, otherwise there is no positive rate to find.
  if (totalPaid <= p) return null

  const pv = (i: number) => (i === 0 ? c * n : (c * (1 - Math.pow(1 + i, -n))) / i)

  let low = 0
  let high = 3 // 300% per month is far beyond any real loan
  for (let k = 0; k < 200; k++) {
    const mid = (low + high) / 2
    if (pv(mid) > p) low = mid
    else high = mid
  }
  const i = (low + high) / 2

  return {
    monthlyPct: round(i * 100, 2),
    annualPct: round((Math.pow(1 + i, 12) - 1) * 100, 2),
    totalInterest: round(totalPaid - p),
    totalPaid: round(totalPaid),
  }
}
