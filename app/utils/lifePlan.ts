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
