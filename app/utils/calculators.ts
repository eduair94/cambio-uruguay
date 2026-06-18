// Framework-agnostic math for the interactive financial calculators under
// `pages/herramientas/*`.
//
// Every function here is PURE (no Vue/Nuxt runtime, no global state, no I/O) so
// it can be unit-tested in plain Node via vitest and reused by any page without
// duplicating the formula. The Uruguay-specific default tables (IVA rates, IRPF
// brackets, BPC) live in {@link URUGUAY} so the primitives stay general and the
// figures are easy to audit and update in one place.
//
// These are *estimators*: tax rules change and have exceptions. The pages render
// prominent disclaimers; this module only does the arithmetic it is given.

/** Round to a fixed number of decimals without floating-point drift (e.g. 2 -> cents). */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0
  const f = 10 ** decimals
  return Math.round((value + Number.EPSILON) * f) / f
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ---------------------------------------------------------------------------
// IVA (value-added tax)
// ---------------------------------------------------------------------------

/** Result of an IVA breakdown: net (sin IVA), tax amount, and gross (con IVA). */
export interface IvaBreakdown {
  net: number
  iva: number
  gross: number
  rate: number
}

/** Add IVA to a net amount. `rate` is a percentage (e.g. 22 for 22%). */
export function addIva(net: number, rate: number): IvaBreakdown {
  const safeNet = Math.max(net, 0)
  const iva = round((safeNet * rate) / 100)
  return { net: round(safeNet), iva, gross: round(safeNet + iva), rate }
}

/** Strip IVA out of a gross (con IVA) amount to recover net + tax. */
export function removeIva(gross: number, rate: number): IvaBreakdown {
  const safeGross = Math.max(gross, 0)
  const net = round(safeGross / (1 + rate / 100))
  return { net, iva: round(safeGross - net), gross: round(safeGross), rate }
}

// ---------------------------------------------------------------------------
// Spread / brecha between a buy and a sell price
// ---------------------------------------------------------------------------

/** Absolute and percentage spread between a buy and a sell quote. */
export interface SpreadResult {
  /** Absolute gap `sell - buy` in the quote currency. */
  abs: number
  /** Gap as a percentage of the buy price. `null` when buy is not positive. */
  pct: number | null
  /** Mid price `(buy + sell) / 2`. */
  mid: number
}

/** Compute the spread between a buy and a sell price. */
export function computeSpread(buy: number, sell: number): SpreadResult {
  const abs = round(sell - buy, 4)
  const mid = round((buy + sell) / 2, 4)
  const pct = buy > 0 ? round((abs / buy) * 100, 2) : null
  return { abs, pct, mid }
}

// ---------------------------------------------------------------------------
// Progressive tax (used by the IRPF estimator)
// ---------------------------------------------------------------------------

/** One progressive bracket: marginal `rate` (%) applied up to `upTo` (inclusive). */
export interface TaxBracket {
  /** Upper bound of the bracket in the base unit, or `null` for the top open bracket. */
  upTo: number | null
  /** Marginal rate as a percentage (e.g. 10 for 10%). */
  rate: number
}

/** Per-bracket detail returned alongside the total progressive tax. */
export interface BracketDetail {
  from: number
  to: number | null
  rate: number
  taxable: number
  tax: number
}

/** Total progressive tax plus a per-bracket breakdown. */
export interface ProgressiveTaxResult {
  total: number
  effectiveRate: number
  detail: BracketDetail[]
}

/**
 * Apply a progressive bracket table to a base amount. Each bracket taxes only
 * the portion of `base` that falls inside it (marginal taxation), which is how
 * Uruguay's IRPF franjas work.
 */
export function progressiveTax(
  base: number,
  brackets: readonly TaxBracket[]
): ProgressiveTaxResult {
  const safeBase = Math.max(base, 0)
  let lower = 0
  let total = 0
  const detail: BracketDetail[] = []

  for (const bracket of brackets) {
    const upper = bracket.upTo ?? Infinity
    if (safeBase <= lower) break
    const taxable = Math.min(safeBase, upper) - lower
    if (taxable > 0) {
      const tax = round((taxable * bracket.rate) / 100)
      total += tax
      detail.push({
        from: lower,
        to: bracket.upTo,
        rate: bracket.rate,
        taxable: round(taxable),
        tax,
      })
    }
    lower = upper
  }

  return {
    total: round(total),
    effectiveRate: safeBase > 0 ? round((total / safeBase) * 100, 2) : 0,
    detail,
  }
}

// ---------------------------------------------------------------------------
// Aguinaldo (sueldo anual complementario, SAC)
// ---------------------------------------------------------------------------

/**
 * Aguinaldo in Uruguay equals the nominal wages earned in the semester divided
 * by 12. Pass the total nominal earned in the period.
 */
export function computeAguinaldo(totalNominalSemester: number): number {
  return round(Math.max(totalNominalSemester, 0) / 12)
}

// ---------------------------------------------------------------------------
// Compound interest (plazo fijo / savings)
// ---------------------------------------------------------------------------

/** Growth of a principal at a fixed annual rate over a number of years. */
export interface CompoundResult {
  /** Final balance including interest. */
  finalAmount: number
  /** Interest earned (final - principal). */
  interest: number
}

/**
 * Future value of `principal` at `annualRatePct` for `years`, compounded
 * `timesPerYear` times a year (12 = monthly, 1 = annual).
 */
export function compoundInterest(
  principal: number,
  annualRatePct: number,
  years: number,
  timesPerYear = 1
): CompoundResult {
  const p = Math.max(principal, 0)
  const n = Math.max(timesPerYear, 1)
  const periods = n * Math.max(years, 0)
  const finalAmount = round(p * (1 + annualRatePct / 100 / n) ** periods)
  return { finalAmount, interest: round(finalAmount - p) }
}

// ---------------------------------------------------------------------------
// Loan amortization (French system, fixed monthly payment)
// ---------------------------------------------------------------------------

/** A French-amortization loan: monthly payment, total paid, total interest. */
export interface LoanResult {
  monthlyPayment: number
  totalPaid: number
  totalInterest: number
}

/**
 * Fixed monthly payment for a loan of `principal` over `months` at a nominal
 * `annualRatePct` (French / fixed-installment system).
 */
export function loanPayment(principal: number, annualRatePct: number, months: number): LoanResult {
  const p = Math.max(principal, 0)
  const m = Math.max(Math.floor(months), 0)
  if (m === 0) return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0 }

  const i = annualRatePct / 100 / 12
  const payment = i === 0 ? p / m : (p * i) / (1 - (1 + i) ** -m)
  const totalPaid = round(payment * m)
  return {
    monthlyPayment: round(payment),
    totalPaid,
    totalInterest: round(totalPaid - p),
  }
}

// ---------------------------------------------------------------------------
// Inflation / purchasing power
// ---------------------------------------------------------------------------

/**
 * Value of `amount` after `years` of `annualInflationPct` inflation, plus the
 * real purchasing power of that nominal amount today (deflated).
 */
export function adjustByInflation(
  amount: number,
  annualInflationPct: number,
  years: number
): { nominal: number; purchasingPower: number } {
  const a = Math.max(amount, 0)
  const factor = (1 + annualInflationPct / 100) ** Math.max(years, 0)
  return {
    nominal: round(a * factor),
    purchasingPower: factor > 0 ? round(a / factor) : 0,
  }
}

// ---------------------------------------------------------------------------
// Uruguay reference constants (audit + update in one place)
// ---------------------------------------------------------------------------

/**
 * Uruguay reference figures used as calculator defaults. These change yearly and
 * have exceptions; treat them as editable defaults, not legal values. Sources:
 * BCU / DGI / Aduanas. Review date in `reviewedAt`.
 */
export const URUGUAY = {
  reviewedAt: '2026-06-17',
  /** IVA rates: 22% general (tasa básica), 10% mínima (some goods/services). */
  iva: { basica: 22, minima: 10 },
  /**
   * Courier / encomiendas postales regime (vigente desde 2026-05-01):
   * annual franchise up to USD 800 per person, usable up to 3 times a year, up
   * to 20 kg per shipment; the non-franchise simplified regime pays a single
   * 60% rate over the declared value (min USD 10).
   */
  courier: {
    franchiseAnnualUsd: 800,
    franchisePerShipmentUsd: 200,
    maxUsesPerYear: 3,
    maxWeightKg: 20,
    simplifiedRatePct: 60,
    simplifiedMinUsd: 10,
  },
  /**
   * IRPF (rentas del trabajo) monthly franjas expressed in BPC multiples, with
   * marginal rates. The BPC ("Base de Prestaciones y Contribuciones") for 2026
   * is $6.864 (vigente desde 2026-01-01, fijada por el Poder Ejecutivo);
   * multiply the BPC bounds by `bpc` to get UYU bounds. The 7-BPC minimum
   * non-taxable equals $48.048/mes. Source: DGI / BPS.
   */
  bpc: 6864,
  irpfBracketsBpc: [
    { upToBpc: 7, rate: 0 },
    { upToBpc: 10, rate: 10 },
    { upToBpc: 15, rate: 15 },
    { upToBpc: 30, rate: 24 },
    { upToBpc: 50, rate: 25 },
    { upToBpc: 75, rate: 27 },
    { upToBpc: 115, rate: 31 },
    { upToBpc: null, rate: 36 },
  ],
} as const

/** Build the IRPF monthly bracket table in UYU from the BPC table + a BPC value. */
export function irpfBracketsUyu(bpc: number = URUGUAY.bpc): TaxBracket[] {
  return URUGUAY.irpfBracketsBpc.map(b => ({
    upTo: b.upToBpc === null ? null : round(b.upToBpc * bpc, 2),
    rate: b.rate,
  }))
}
