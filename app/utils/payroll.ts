// app/utils/payroll.ts
// Sueldo nominal -> sueldo líquido for a Uruguayan trabajador dependiente.
//
// This is the piece `/herramientas/calculadora-irpf` openly does NOT do: that tool
// estimates IRPF on the nominal with no deductions, so it cannot tell you what
// actually lands in your account. Reddit is full of people who cannot check their
// own payslip ("me parece que me pagaron poco"), so this module models the whole
// chain: aportes (jubilatorio + FONASA + FRL) and then IRPF with its deduction credit.
//
// PURE module (no Vue/Nuxt) so the page and the unit tests share one source of truth.
// It reuses the IRPF franjas + BPC already audited in `calculators.ts` instead of
// re-declaring them.
//
// EVERY figure below is sourced and dated. Tax rules change: re-check yearly.
//   - Aporte jubilatorio personal: 15%, with a "tope 3" above which no jubilatorio
//     is contributed = $288.836 (2026). Sources: BPS; calculame.uy/aporte-jubilatorio-bps.
//   - FONASA personal (dependientes), by monthly income vs 2,5 BPC and dependants.
//     Source: BPS, "Tasas de aportes Fonasa" (bps.gub.uy/10314/tasas-fonasa.html).
//       <= 2,5 BPC : 3% (solo o con hijos) | 5% (con cónyuge, con o sin hijos)
//       >  2,5 BPC : 4,5% solo | 6% con hijos | 6,5% con cónyuge | 8% con cónyuge e hijos
//     The 2,5 BPC test uses monthly remuneration EXCLUDING aguinaldo.
//   - FRL (Fondo de Reconversión Laboral): 0,10%.
//   - IRPF: franjas mensuales en BPC (see `URUGUAY.irpfBracketsBpc`), tax computed on
//     the NOMINAL, then reduced by a credit = deducciones x tasa.
//     Tasa del crédito: 14% si los ingresos nominales anuales (excluido aguinaldo y
//     salario vacacional) son < 180 BPC; 8% en otro caso. (180 BPC/año == 15 BPC/mes.)
//   - Deducciones admitidas (DGI, "Deducciones admitidas en la liquidación del IRPF"):
//     aportes jubilatorios personales, aportes personales FONASA y FRL, Fondo de
//     Solidaridad y su adicional, cuota de préstamo hipotecario para vivienda única y
//     permanente (hasta 36 BPC anuales), e hijos a cargo: 20 BPC anuales por hijo
//     menor, 40 BPC si tiene discapacidad.
//
// Informativo, no asesoramiento fiscal.

import { URUGUAY, irpfBracketsUyu, progressiveTax, round, type BracketDetail } from './calculators'

/** Verified payroll parameters. Update yearly alongside `URUGUAY.bpc`. */
export const PAYROLL_UY = Object.freeze({
  reviewedAt: '2026-07-11',
  /** Aporte jubilatorio personal (montepío). */
  jubilatorioRate: 15,
  /** Above this monthly nominal no jubilatorio is contributed (tope máximo, 2026). */
  jubilatorioTope: 288836,
  /** Fondo de Reconversión Laboral. */
  frlRate: 0.1,
  /** FONASA: income threshold in BPC that separates the low/high rate table. */
  fonasaThresholdBpc: 2.5,
  /** Hijo a cargo: annual IRPF deduction, in BPC (doubled when discapacidad). */
  hijoDeduccionBpc: 20,
  hijoDiscapacidadDeduccionBpc: 40,
  /** Cuota de préstamo hipotecario (vivienda única y permanente): annual cap, in BPC. */
  hipotecarioTopeBpc: 36,
  /** Deduction credit: 14% below the threshold, 8% at or above it. */
  creditRateLow: 14,
  creditRateHigh: 8,
  /** Threshold for the credit rate, in BPC of MONTHLY nominal (180 BPC/year / 12). */
  creditThresholdBpcMonthly: 15,
})

export interface PayrollInput {
  /** Monthly gross salary in UYU. */
  nominal: number
  /** Children a cargo without discapacidad. */
  hijos?: number
  /** Children a cargo with discapacidad (deduct double). */
  hijosDiscapacidad?: number
  /** Spouse/concubino a cargo without their own SNIS coverage (raises the FONASA rate). */
  conyugeACargo?: boolean
  /** Annual mortgage instalments for a single permanent home, UYU (capped at 36 BPC). */
  cuotaHipotecariaAnual?: number
  /** Any other admitted annual deductions in UYU (Fondo de Solidaridad, caja profesional...). */
  otrasDeduccionesAnuales?: number
  /** Override the BPC (defaults to the audited value). */
  bpc?: number
}

export interface AporteLine {
  rate: number
  amount: number
}

export interface PayrollResult {
  nominal: number
  bpc: number
  jubilatorio: AporteLine & { base: number; topeApplied: boolean }
  fonasa: AporteLine
  frl: AporteLine
  /** jubilatorio + fonasa + frl */
  aportes: number
  irpf: {
    /** Tax from the progressive franjas, before the deduction credit. */
    grossTax: number
    brackets: BracketDetail[]
    /** Monthly total of admitted deductions. */
    deductionsMonthly: number
    /** 14 or 8. */
    creditRate: number
    credit: number
    /** max(grossTax - credit, 0) — what is actually withheld. */
    tax: number
  }
  /** aportes + irpf */
  totalDescuentos: number
  liquido: number
  /** totalDescuentos / nominal, as a percentage. */
  descuentoPct: number
}

/**
 * FONASA personal rate for a dependent worker (BPS table).
 * The 2,5 BPC test is on monthly remuneration excluding aguinaldo.
 */
export function fonasaRate(
  nominal: number,
  bpc: number = URUGUAY.bpc,
  hijos = 0,
  conyugeACargo = false
): number {
  const high = nominal > PAYROLL_UY.fonasaThresholdBpc * bpc
  const conHijos = hijos > 0
  if (!high) return conyugeACargo ? 5 : 3
  if (conyugeACargo && conHijos) return 8
  if (conyugeACargo) return 6.5
  if (conHijos) return 6
  return 4.5
}

/** Full nominal -> líquido chain for a trabajador dependiente. */
export function computePayroll(input: PayrollInput): PayrollResult {
  const bpc = input.bpc && input.bpc > 0 ? input.bpc : URUGUAY.bpc
  const nominal = Math.max(input.nominal || 0, 0)
  const hijos = Math.max(input.hijos || 0, 0)
  const hijosDisc = Math.max(input.hijosDiscapacidad || 0, 0)
  const conyuge = !!input.conyugeACargo

  // --- Aportes ---
  const jubBase = Math.min(nominal, PAYROLL_UY.jubilatorioTope)
  const jubilatorio = round((jubBase * PAYROLL_UY.jubilatorioRate) / 100)

  const fRate = fonasaRate(nominal, bpc, hijos + hijosDisc, conyuge)
  const fonasa = round((nominal * fRate) / 100)

  const frl = round((jubBase * PAYROLL_UY.frlRate) / 100)

  const aportes = round(jubilatorio + fonasa + frl)

  // --- IRPF: tax on the nominal, then reduced by the deduction credit ---
  const gross = progressiveTax(nominal, irpfBracketsUyu(bpc))

  const hijosDeduccionAnual =
    hijos * PAYROLL_UY.hijoDeduccionBpc * bpc +
    hijosDisc * PAYROLL_UY.hijoDiscapacidadDeduccionBpc * bpc
  const hipotecarioAnual = Math.min(
    Math.max(input.cuotaHipotecariaAnual || 0, 0),
    PAYROLL_UY.hipotecarioTopeBpc * bpc
  )
  const otrasAnual = Math.max(input.otrasDeduccionesAnuales || 0, 0)

  // Aportes are themselves admitted deductions, and they are already monthly.
  const deductionsMonthly = round(
    aportes + (hijosDeduccionAnual + hipotecarioAnual + otrasAnual) / 12
  )

  const creditRate =
    nominal < PAYROLL_UY.creditThresholdBpcMonthly * bpc
      ? PAYROLL_UY.creditRateLow
      : PAYROLL_UY.creditRateHigh
  const credit = round((deductionsMonthly * creditRate) / 100)
  const tax = round(Math.max(gross.total - credit, 0))

  const totalDescuentos = round(aportes + tax)
  const liquido = round(nominal - totalDescuentos)

  return {
    nominal: round(nominal),
    bpc,
    jubilatorio: {
      rate: PAYROLL_UY.jubilatorioRate,
      amount: jubilatorio,
      base: round(jubBase),
      topeApplied: nominal > PAYROLL_UY.jubilatorioTope,
    },
    fonasa: { rate: fRate, amount: fonasa },
    frl: { rate: PAYROLL_UY.frlRate, amount: frl },
    aportes,
    irpf: {
      grossTax: round(gross.total),
      brackets: gross.detail,
      deductionsMonthly,
      creditRate,
      credit,
      tax,
    },
    totalDescuentos,
    liquido,
    descuentoPct: nominal > 0 ? round((totalDescuentos / nominal) * 100, 1) : 0,
  }
}

/**
 * Reverse mode: what nominal do I need to take home `target` líquido?
 * `computePayroll` is monotonic in `nominal`, so bisect. Used for job offers
 * quoted in líquido ("te pagamos X en mano").
 */
export function nominalForLiquido(
  target: number,
  input: Omit<PayrollInput, 'nominal'> = {},
  maxIterations = 60
): number {
  const goal = Math.max(target || 0, 0)
  if (goal === 0) return 0

  let low = goal
  let high = goal * 3 + 10000
  // Make sure the upper bound really overshoots.
  while (computePayroll({ ...input, nominal: high }).liquido < goal && high < 1e9) high *= 2

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2
    const { liquido } = computePayroll({ ...input, nominal: mid })
    if (Math.abs(liquido - goal) < 0.5) return round(mid)
    if (liquido < goal) low = mid
    else high = mid
  }
  return round((low + high) / 2)
}
