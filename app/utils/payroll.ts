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
//     the NOMINAL, then reduced by a credit = deducciones x tasa. When the month's
//     nominal exceeds 10 BPC the taxable base is the nominal + 6 % (Decreto 148/007
//     art. 63, the same rule `irpfCasos.ts` and DGI's own simulator apply). Until
//     2026-10-19 this module skipped it: $ 80.000 nominales withheld $ 1.568 instead
//     of $ 2.288 and the líquido came out $ 720 too high.
//     Tasa del crédito: 14% si los ingresos nominales anuales (excluido aguinaldo y
//     salario vacacional) son < 180 BPC; 8% en otro caso. (180 BPC/año == 15 BPC/mes.)
//   - Deducciones admitidas (DGI, "Deducciones admitidas en la liquidación del IRPF"):
//     aportes jubilatorios personales, aportes personales FONASA y FRL, Fondo de
//     Solidaridad y su adicional, cuota de préstamo hipotecario para vivienda única y
//     permanente (hasta 36 BPC anuales), e hijos a cargo: 20 BPC anuales por hijo
//     menor, 40 BPC si tiene discapacidad.
//
// Informativo, no asesoramiento fiscal.

import {
  URUGUAY,
  irpfBracketsUyu,
  progressiveTax,
  round,
  type BracketDetail,
  type TaxBracket,
} from './calculators'

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
  /** Above this monthly nominal (in BPC) the IRPF base is increased by `irpfIncrementPct`. */
  irpfIncrementAboveBpc: 10,
  /** Decreto 148/007 art. 63: +6 % on the taxable base above 10 BPC. */
  irpfIncrementPct: 6,
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
    /** Taxable base: the nominal, plus 6 % when it exceeds 10 BPC. */
    computable: number
    /** Whether the 6 % increment applied. */
    incrementApplied: boolean
    /** Tax from the progressive franjas on `computable`, before the deduction credit. */
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

  // --- IRPF: tax on the nominal (+6 % above 10 BPC), then reduced by the deduction credit ---
  const incrementApplied = nominal > PAYROLL_UY.irpfIncrementAboveBpc * bpc
  const computable = incrementApplied
    ? round(nominal * (1 + PAYROLL_UY.irpfIncrementPct / 100))
    : nominal
  const gross = progressiveTax(computable, irpfBracketsUyu(bpc))

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
      computable: round(computable),
      incrementApplied,
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

// ---------------------------------------------------------------------------
// El aguinaldo líquido
// ---------------------------------------------------------------------------

/**
 * La tasa marginal (%) de la franja en la que cae `base`: la de la última franja que alcanza.
 * Cero hasta el mínimo no imponible.
 */
export function marginalRate(base: number, brackets: readonly TaxBracket[]): number {
  if (!(base > 0)) return 0
  for (const bracket of brackets) {
    if (bracket.upTo === null || base <= bracket.upTo) return bracket.rate
  }
  return brackets[brackets.length - 1]?.rate ?? 0
}

export interface AguinaldoLiquidoInput {
  /** El aguinaldo nominal de la cuota (lo que devuelve `computeAguinaldo`). */
  aguinaldo: number
  /**
   * El sueldo nominal mensual, SIN el aguinaldo. Decide dos cosas: la tasa de FONASA (la prueba de
   * 2,5 BPC excluye el aguinaldo) y la tasa marginal del IRPF que se le aplica al aguinaldo.
   */
  sueldoMensual: number
  hijos?: number
  conyugeACargo?: boolean
  bpc?: number
}

export interface AguinaldoLiquidoResult {
  aguinaldo: number
  jubilatorio: AporteLine
  fonasa: AporteLine
  frl: AporteLine
  /** `rate` es la tasa marginal máxima del sueldo del mes. */
  irpf: AporteLine
  totalDescuentos: number
  liquido: number
  /**
   * El aporte jubilatorio del aguinaldo tiene su propio tope (Decreto 440/997, art. 2: el
   * aguinaldo se compara con el tope «multiplicando cada mitad por dos»). Por encima de eso esta
   * cuenta sobrestima el aporte; la página lo dice en vez de inventar el tope del aguinaldo, que
   * BPS no publica en pesos.
   */
  superaTopeJubilatorio: boolean
}

/**
 * Lo que queda del aguinaldo después de los descuentos, para un trabajador dependiente.
 *
 * POR QUÉ (2026-11-16). La calculadora daba sólo el nominal y la pregunta de diciembre es cuánto
 * entra a la cuenta. Cada regla está en una fuente primaria, leída ese día:
 *   - Jubilatorio 15 %, FONASA y FRL SÍ gravan el aguinaldo: BPS, Comunicado 13/2025 (ajuste
 *     anual IRPF), «las deducciones correspondientes a aportes personales jubilatorios, Seguro
 *     Nacional de Salud y FRL, deben incluir los aportes personales por concepto de aguinaldo».
 *     El aguinaldo sólo está excluido del aporte PATRONAL a FONASA (Decreto 2/008, art. 4).
 *   - La tasa de FONASA es la del sueldo del mes: la prueba de 2,5 BPC se hace «con exclusión del
 *     aguinaldo» (bps.gub.uy/10314/tasas-fonasa.html). Con la tasa del propio aguinaldo, un sueldo
 *     de $ 30.000 caería en 3 % en vez de 4,5 %, que es el error que esta función evita.
 *   - FRL 0,10 % (Ley 19.689, art. 17).
 *   - IRPF: el aguinaldo legal se grava APARTE, a una tasa proporcional igual a la marginal máxima
 *     de las demás rentas del trabajo (Decreto 148/007, art. 55-BIS; DGI, «IRPF para trabajadores
 *     dependientes»), y se retiene al pagarlo con la tasa del sueldo del mes (Decreto 185/009,
 *     Resolución DGI 617/009). La tasa se toma sobre la misma base del anticipo del mes (con el
 *     6 % por encima de 10 BPC, como `computePayroll`). El ajuste anual de diciembre la recalcula.
 *
 * Lo que NO hace: el crédito por deducciones que esos mismos aportes generan en el IRPF del mes
 * (puede bajar un poco la retención), ni el tope jubilatorio propio del aguinaldo
 * (`superaTopeJubilatorio`). Es una estimación, y la página lo dice.
 */
export function computeAguinaldoLiquido(input: AguinaldoLiquidoInput): AguinaldoLiquidoResult {
  const bpc = input.bpc && input.bpc > 0 ? input.bpc : URUGUAY.bpc
  const aguinaldo = Math.max(input.aguinaldo || 0, 0)
  const sueldo = Math.max(input.sueldoMensual || 0, 0)

  const jubilatorio = round((aguinaldo * PAYROLL_UY.jubilatorioRate) / 100)
  const fRate = fonasaRate(sueldo, bpc, Math.max(input.hijos || 0, 0), !!input.conyugeACargo)
  const fonasa = round((aguinaldo * fRate) / 100)
  const frl = round((aguinaldo * PAYROLL_UY.frlRate) / 100)

  const computable =
    sueldo > PAYROLL_UY.irpfIncrementAboveBpc * bpc
      ? sueldo * (1 + PAYROLL_UY.irpfIncrementPct / 100)
      : sueldo
  const irpfRate = marginalRate(computable, irpfBracketsUyu(bpc))
  const irpf = round((aguinaldo * irpfRate) / 100)

  const totalDescuentos = round(jubilatorio + fonasa + frl + irpf)
  return {
    aguinaldo: round(aguinaldo),
    jubilatorio: { rate: PAYROLL_UY.jubilatorioRate, amount: jubilatorio },
    fonasa: { rate: fRate, amount: fonasa },
    frl: { rate: PAYROLL_UY.frlRate, amount: frl },
    irpf: { rate: irpfRate, amount: irpf },
    totalDescuentos,
    liquido: round(aguinaldo - totalDescuentos),
    superaTopeJubilatorio: aguinaldo * 2 > PAYROLL_UY.jubilatorioTope,
  }
}
