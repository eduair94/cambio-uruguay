// El plan de vida: en qué orden va cada peso.
//
// Este módulo NO mide nada y no tiene motor propio. Compone tres que ya existen
// y están probados —`estimateBudget` (costOfLiving), `payoffPlan` (debt) y
// `netOfIrpf` (investments)— y agrega lo único que faltaba: el orden.
//
// Y el orden sólo se afirma donde hay una resta que lo justifique. Medido el
// 2026-09-08: la deuda de consumo sin descuento del sueldo tiene 80,72 % de tasa
// media (BCU, vigente 2026-09-01) contra ~2,6 % real de la mejor colocación
// accesible después de IRPF e inflación. Eso no es una opinión sobre el riesgo,
// es una diferencia entre dos números públicos y fechados.
//
// Donde la resta no alcanza para decidir, este módulo NO ordena: marca el paso
// como `unresolved` y dice qué le faltó.
//
// `app/utils/` es un namespace plano de auto-imports, así que todo lo exportado
// lleva prefijo `lifePlan`/`LIFE_PLAN` salvo los tipos del dominio.
import type { BudgetResult } from '~/utils/costOfLiving'
import { payoffPlan, type Debt, type PayoffPlan } from '~/utils/debt'
import { netOfIrpf, type DepositCurrency } from '~/utils/investments'

export interface LifePlanRates {
  /** Plazo fijo en pesos, % nominal anual. */
  plazoFijoBrou: number | null
  /** Fondo en pesos, % nominal anual. */
  fondoPesos: number | null
  /** IPC interanual, en puntos porcentuales. */
  inflacion: number | null
  /** Tasa MEDIA del segmento de consumo sin autorización de descuento. */
  deudaSinDescuento: number | null
  /** Tasa MEDIA del segmento con autorización de descuento del sueldo. */
  deudaConDescuento: number | null
  asOfRates: string | null
  asOfDebt: string | null
}

export interface LifePlanReturn {
  id: string
  /** Sin nombre de producto ni de institución: se ordenan destinos. */
  label: string
  grossPct: number
  netPct: number
  /** Neto de IRPF y de inflación. null cuando no hubo inflación con la que descontar. */
  realPct: number | null
  currency: DepositCurrency
  months: number
  note: string
}

/** Neto de IRPF y, si hay inflación, real. */
export function lifePlanRealNet(
  grossPct: number,
  currency: DepositCurrency,
  months: number,
  inflacionPct: number | null
): { netPct: number; realPct: number | null } {
  if (!Number.isFinite(grossPct) || grossPct <= 0) return { netPct: 0, realPct: null }
  const { netPct } = netOfIrpf(grossPct, currency, months)
  if (typeof inflacionPct !== 'number' || !Number.isFinite(inflacionPct)) {
    return { netPct, realPct: null }
  }
  const realPct = ((1 + netPct / 100) / (1 + inflacionPct / 100) - 1) * 100
  return { netPct, realPct }
}

interface ReturnSeed {
  id: string
  label: string
  gross: (rates: LifePlanRates) => number | null
  currency: DepositCurrency
  months: number
  note: string
}

const RETURN_SEEDS: readonly ReturnSeed[] = Object.freeze([
  Object.freeze({
    id: 'plazo-fijo-pesos',
    label: 'Depósito a plazo en pesos',
    gross: (r: LifePlanRates) => r.plazoFijoBrou,
    currency: 'UYU' as DepositCurrency,
    months: 12,
    note: 'Tasa de referencia de plazo fijo en pesos, neta del IRPF que corresponde al plazo.',
  }),
  Object.freeze({
    id: 'fondo-pesos',
    label: 'Fondo de inversión en pesos',
    gross: (r: LifePlanRates) => r.fondoPesos,
    currency: 'UYU' as DepositCurrency,
    months: 12,
    note: 'Rendimiento de referencia de fondos en pesos, neto del IRPF que corresponde al plazo.',
  }),
])

/** Un destino por cada tasa que llegó. Los que no llegaron no se inventan. */
export function lifePlanReturns(rates: LifePlanRates): LifePlanReturn[] {
  const out: LifePlanReturn[] = []
  for (const seed of RETURN_SEEDS) {
    const grossPct = seed.gross(rates)
    if (typeof grossPct !== 'number' || !Number.isFinite(grossPct) || grossPct <= 0) continue
    const { netPct, realPct } = lifePlanRealNet(
      grossPct,
      seed.currency,
      seed.months,
      rates.inflacion
    )
    out.push({
      id: seed.id,
      label: seed.label,
      grossPct,
      netPct,
      realPct,
      currency: seed.currency,
      months: seed.months,
      note: seed.note,
    })
  }
  return out.sort((a, b) => (b.realPct ?? b.netPct) - (a.realPct ?? a.netPct))
}

/**
 * El mejor rendimiento real neto disponible, que es el umbral contra el que se
 * mide si una deuda es cara.
 *
 * Devuelve null y NO cero cuando no hay ningún destino con tasa: cero haría que
 * toda deuda pareciera cara por comparación contra nada, que es exactamente
 * afirmar un orden sin evidencia.
 */
export function lifePlanBestRealNet(
  returns: LifePlanReturn[]
): { pct: number; from: string } | null {
  const usable = returns.filter(r => r.realPct !== null || r.netPct > 0)
  if (!usable.length) return null
  const best = usable.reduce((a, b) => ((b.realPct ?? b.netPct) > (a.realPct ?? a.netPct) ? b : a))
  return { pct: best.realPct ?? best.netPct, from: best.label }
}

export type LifePlanDebtKind =
  | 'sin_descuento'
  | 'con_descuento'
  | 'gastos_comunes'
  | 'estado'
  | 'otro'

export interface LifePlanDebtKindMeta {
  id: LifePlanDebtKind
  label: string
  help: string
  /** Si el BCU publica una tasa media para este segmento. */
  measured: boolean
}

/**
 * Los tipos de deuda, y de dónde sale la tasa de cada uno.
 *
 * Casi nadie sabe su TEA, así que se pregunta el TIPO y se completa con la tasa
 * MEDIA del segmento del BCU. La media y no el tope: el tope es el máximo legal
 * que la ley permite cobrar (122,23 % en el segmento sin descuento), no lo que
 * la gente paga (80,72 % de media).
 *
 * Dos tipos no tienen segmento en la grilla y por eso no se les inventa una
 * tasa: pedirla es peor experiencia y mejor dato.
 */
export const LIFE_PLAN_DEBT_KINDS: readonly LifePlanDebtKindMeta[] = Object.freeze([
  Object.freeze({
    id: 'sin_descuento' as LifePlanDebtKind,
    label: 'Tarjeta o préstamo sin descuento del sueldo',
    help: 'Se completa con la tasa media del segmento de consumo sin autorización de descuento.',
    measured: true,
  }),
  Object.freeze({
    id: 'con_descuento' as LifePlanDebtKind,
    label: 'Préstamo con descuento del sueldo',
    help: 'Se completa con la tasa media del segmento con autorización de descuento.',
    measured: true,
  }),
  Object.freeze({
    id: 'gastos_comunes' as LifePlanDebtKind,
    label: 'Gastos comunes',
    help: 'No tiene segmento propio en la grilla del BCU: cargá la tasa que te cobran.',
    measured: false,
  }),
  Object.freeze({
    id: 'estado' as LifePlanDebtKind,
    label: 'Deuda con el Estado',
    help: 'No tiene segmento propio: cargá la tasa. Puede además estar prescripta.',
    measured: false,
  }),
  Object.freeze({
    id: 'otro' as LifePlanDebtKind,
    label: 'Otra',
    help: 'Cargá la tasa efectiva anual si la conocés.',
    measured: false,
  }),
])

export interface LifePlanDebtInput {
  id: string
  name: string
  /** Saldo en UYU. */
  balance: number
  /** Pago mínimo mensual en UYU. */
  minPayment: number
  kind: LifePlanDebtKind
  /** Tasa efectiva anual cargada a mano. Gana sobre la media del segmento. */
  annualRatePct?: number | null
}

/** La tasa de una deuda, y de dónde salió. */
export function lifePlanDebtRate(
  input: LifePlanDebtInput,
  rates: LifePlanRates
): { annualRatePct: number | null; source: string; measured: boolean } {
  const manual = input.annualRatePct
  if (typeof manual === 'number' && Number.isFinite(manual) && manual > 0) {
    return { annualRatePct: manual, source: 'tasa cargada por vos', measured: false }
  }
  if (input.kind === 'sin_descuento' && typeof rates.deudaSinDescuento === 'number') {
    return {
      annualRatePct: rates.deudaSinDescuento,
      source: 'tasa media del BCU, consumo sin autorización de descuento',
      measured: true,
    }
  }
  if (input.kind === 'con_descuento' && typeof rates.deudaConDescuento === 'number') {
    return {
      annualRatePct: rates.deudaConDescuento,
      source: 'tasa media del BCU, consumo con autorización de descuento',
      measured: true,
    }
  }
  return { annualRatePct: null, source: 'sin tasa: cargala para poder ordenarla', measured: false }
}

export type LifePlanVerdict = 'no-alcanza' | 'sin-excedente' | 'ordenado'

export interface LifePlanStep {
  id: string
  label: string
  monthly: number
  reason: string
  /** La cifra que justifica la posición del paso, con su fuente. null si no llegó. */
  evidence: string | null
  /** true cuando el paso no se puede justificar con lo que hay. */
  unresolved: boolean
  /** true cuando el monto es obligación y no decisión (esenciales, mínimos). */
  committed: boolean
}

export interface LifePlanOptions {
  emergencyMonths?: number
  savingsNow?: number
}

export interface LifePlanResult {
  verdict: LifePlanVerdict
  budget: BudgetResult
  /** Lo repartible: ingreso − esenciales − mínimos. */
  pot: number
  minimums: number
  steps: LifePlanStep[]
  payoff: PayoffPlan | null
  bestRealNet: { pct: number; from: string } | null
  returns: LifePlanReturn[]
  unresolvedNotes: string[]
  emergencyTarget: number
  emergencyGap: number
}

export const LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT = 3
export const LIFE_PLAN_EMERGENCY_MONTHS_MIN = 1
export const LIFE_PLAN_EMERGENCY_MONTHS_MAX = 12

const asPct = (n: number): string => `${n.toFixed(2)} %`

/**
 * La cascada.
 *
 * Las cuatro guardas del spec están acá y ninguna es opcional:
 *   1. con déficit no hay plan, hay un faltante y un puntero a los apoyos;
 *   2. un paso sin evidencia va `unresolved` y el plan declara qué le faltó;
 *   3. `neverPaysOff` se propaga;
 *   4. no se proyecta nada más allá de los meses que salen de los saldos.
 *
 * Los pasos se empujan incluso con monto 0, porque el orden ES la información:
 * ver "colchón: 0 este mes, porque primero va la deuda al 80 %" explica más que
 * no ver el colchón.
 */
export function buildLifePlan(
  budget: BudgetResult,
  debts: readonly LifePlanDebtInput[],
  options: LifePlanOptions,
  rates: LifePlanRates
): LifePlanResult {
  const returns = lifePlanReturns(rates)
  const bestRealNet = lifePlanBestRealNet(returns)
  const unresolvedNotes: string[] = []

  const emergencyMonths = Math.min(
    LIFE_PLAN_EMERGENCY_MONTHS_MAX,
    Math.max(
      LIFE_PLAN_EMERGENCY_MONTHS_MIN,
      options.emergencyMonths ?? LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT
    )
  )
  const savingsNow = Math.max(0, options.savingsNow ?? 0)
  const emergencyTarget = budget.essentials * emergencyMonths
  const emergencyGap = Math.max(0, emergencyTarget - savingsNow)

  const minimums = debts.reduce((sum, d) => sum + Math.max(0, d.minPayment), 0)

  const steps: LifePlanStep[] = [
    {
      id: 'esenciales',
      label: 'Lo esencial',
      monthly: budget.essentials,
      reason: 'Vivienda, comida, servicios, transporte y salud, con los precios medidos del sitio.',
      evidence: null,
      unresolved: false,
      committed: true,
    },
  ]

  // Guarda 1: sin ingreso suficiente no hay plan.
  if (budget.deficit > 0) {
    steps.push({
      id: 'faltante',
      label: 'Falta para llegar a lo esencial',
      monthly: budget.deficit,
      reason:
        'El ingreso no cubre lo esencial, así que no hay excedente que ordenar. Antes que un reparto, revisá los apoyos del Estado que te puedan corresponder.',
      evidence: null,
      unresolved: false,
      committed: true,
    })
    return {
      verdict: 'no-alcanza',
      budget,
      pot: 0,
      minimums,
      steps,
      payoff: null,
      bestRealNet,
      returns,
      unresolvedNotes,
      emergencyTarget,
      emergencyGap,
    }
  }

  if (minimums > 0) {
    steps.push({
      id: 'minimos',
      label: 'Pagos mínimos de tus deudas',
      monthly: minimums,
      reason: 'Los mínimos son obligación, no decisión: salen antes de cualquier destino.',
      evidence: null,
      unresolved: false,
      committed: true,
    })
  }

  const pot = Math.max(0, budget.savingsMax - minimums)

  // La deuda se clasifica sólo si hay umbral con el que compararla (guarda 2).
  const rated = debts.map(d => ({ input: d, ...lifePlanDebtRate(d, rates) }))
  const sinTasa = rated.filter(r => r.annualRatePct === null)
  if (sinTasa.length) {
    unresolvedNotes.push(
      `No se pudo ordenar ${
        sinTasa.length === 1 ? 'una deuda' : `${sinTasa.length} deudas`
      } porque no tienen tasa cargada.`
    )
  }
  if (!bestRealNet) {
    unresolvedNotes.push(
      'No llegó ninguna tasa de referencia, así que no hay umbral con el que comparar tus deudas.'
    )
  }

  const expensive = rated.filter(
    r => r.annualRatePct !== null && bestRealNet !== null && r.annualRatePct > bestRealNet.pct
  )
  const cheap = rated.filter(
    r => r.annualRatePct !== null && bestRealNet !== null && r.annualRatePct <= bestRealNet.pct
  )

  // Guarda 3: el plan de pago y su neverPaysOff.
  const payoffDebts: Debt[] = rated
    .filter(r => r.annualRatePct !== null)
    .map(r => ({
      id: r.input.id,
      name: r.input.name,
      balance: r.input.balance,
      annualRatePct: r.annualRatePct as number,
      minPayment: r.input.minPayment,
    }))
  const payoff = payoffDebts.length ? payoffPlan(payoffDebts, pot, 'avalancha') : null
  if (payoff?.neverPaysOff) {
    unresolvedNotes.push(
      'Con esos mínimos la deuda no se cancela nunca: el interés crece más rápido de lo que pagás.'
    )
  }

  let left = pot
  const take = (amount: number): number => {
    const used = Math.max(0, Math.min(left, amount))
    left -= used
    return used
  }

  const worst = expensive.reduce<(typeof expensive)[number] | null>(
    (a, b) => (a === null || (b.annualRatePct as number) > (a.annualRatePct as number) ? b : a),
    null
  )

  // El colchón MÍNIMO va antes de la deuda cara, y no es una excepción al orden
  // por tasa: es el orden por tasa bien aplicado.
  //
  // Salió de correr la cascada con datos reales: todo el excedente se iba a la
  // deuda y el colchón quedaba en cero. Pero sin colchón, la próxima urgencia
  // vuelve a la tarjeta, así que el rendimiento del primer mes de colchón no es
  // el ~2,6 % real del depósito — es evitar el ~80 % de volver a endeudarse.
  // Medido contra esa tasa, el primer mes gana.
  //
  // Sólo el PRIMER mes. El resto del colchón sí rinde el 2,6 % y por eso sigue
  // después de la deuda.
  if (worst && emergencyGap > 0) {
    const minimoTarget = Math.max(0, Math.min(emergencyGap, budget.essentials))
    steps.push({
      id: 'colchon-minimo',
      label: 'Un mes de colchón, antes de atacar la deuda',
      monthly: take(minimoTarget),
      reason:
        'Sin nada guardado, la próxima urgencia vuelve a la tarjeta. Este primer mes rinde lo que evita: la tasa de tu deuda, no la del depósito.',
      evidence: `Evita volver a endeudarte al ${asPct(worst.annualRatePct as number)}.`,
      unresolved: false,
      committed: false,
    })
  }

  if (expensive.length || sinTasa.length) {
    const evidence =
      worst && bestRealNet
        ? `${asPct(worst.annualRatePct as number)} de la deuda contra ${asPct(
            bestRealNet.pct
          )} real de ${bestRealNet.from}: pagarla rinde más que colocar la plata.`
        : null
    steps.push({
      id: 'deuda-cara',
      label: 'Deuda cara, primero',
      monthly: expensive.length ? take(left) : 0,
      reason: worst
        ? 'Ordenada de mayor a menor tasa: es el orden que minimiza el interés total.'
        : 'No hay con qué decidir si tus deudas son caras.',
      evidence,
      unresolved: !worst || !bestRealNet,
      committed: false,
    })
  }

  steps.push({
    id: 'colchon',
    label: `Colchón de ${emergencyMonths} ${emergencyMonths === 1 ? 'mes' : 'meses'}`,
    monthly: emergencyGap > 0 ? take(left) : 0,
    reason:
      emergencyGap > 0
        ? `Te faltan ${Math.round(emergencyGap).toLocaleString('es-UY')} pesos para tener ${emergencyMonths} ${
            emergencyMonths === 1 ? 'mes' : 'meses'
          } de lo esencial guardado.`
        : 'Ya tenés el colchón completo.',
    evidence: null,
    unresolved: false,
    committed: false,
  })

  if (cheap.length) {
    steps.push({
      id: 'deuda-barata',
      label: 'Deuda barata, después del colchón',
      monthly: take(left),
      reason: 'Rinde menos que tener el colchón, así que no conviene adelantarla antes de tenerlo.',
      evidence: bestRealNet
        ? `Por debajo de ${asPct(bestRealNet.pct)} real de ${bestRealNet.from}.`
        : null,
      unresolved: !bestRealNet,
      committed: false,
    })
  }

  for (const destino of returns) {
    if (left <= 0) break
    steps.push({
      id: `destino-${destino.id}`,
      label: destino.label,
      monthly: take(left),
      reason: destino.note,
      evidence:
        destino.realPct !== null
          ? `${asPct(destino.grossPct)} nominal, ${asPct(destino.netPct)} neto de IRPF, ${asPct(
              destino.realPct
            )} real.`
          : `${asPct(destino.grossPct)} nominal, ${asPct(
              destino.netPct
            )} neto de IRPF. No se pudo descontar inflación.`,
      unresolved: destino.realPct === null,
      committed: false,
    })
  }

  const verdict: LifePlanVerdict = pot <= 0 ? 'sin-excedente' : 'ordenado'

  return {
    verdict,
    budget,
    pot,
    minimums,
    steps,
    payoff,
    bestRealNet,
    returns,
    unresolvedNotes,
    emergencyTarget,
    emergencyGap,
  }
}
