// La cuenta de la calculadora "tu jubilación en 2027" de la guía del aumento de jubilaciones
// (components/guides/JubilacionesEstimator.vue, experimento A/B `jubilaciones`). Sin una cifra
// escrita a mano: los porcentajes salen del mismo catálogo que la prosa de la guía, así que cuando
// se cargan las constantes `AJUSTE_2027_*` la calculadora pasa sola a la cifra oficial.
//
// PURO: sin Vue ni Nuxt.
import {
  AUMJUB_2027,
  AUMJUB_IMSN_REFERENCIA,
  aumJubEstado,
  type AumJub2027,
  type AumJubReferencia,
} from './aumentoJubilaciones'
import { AJUSTE_PASIVIDADES_2026_PCT, JUBILACION_MINIMA_2026 } from './bpsFigures2026'

/** Una pasividad nominal razonable: más que esto es un error de tipeo, no una jubilación. */
export const MAX_PASIVIDAD = 2_000_000

/**
 * Pesos como los escribe la gente en Uruguay: "25.000", "25.000,50", "$ 25000", "25000.5".
 * Un punto seguido de exactamente tres cifras es de miles; una coma es la decimal.
 */
export function parseUyuAmount(text: string): number | null {
  const raw = String(text ?? '')
    .replace(/[$\s]/g, '')
    .replace(/^U\$?S?/i, '')
  if (!raw || !/^[\d.,]+$/.test(raw)) return null
  const integer = /^(?:\d{1,3}(?:\.\d{3})+|\d+)$/
  let normalized: string
  if (raw.includes(',')) {
    const [whole, decimals, ...rest] = raw.split(',')
    if (rest.length || !integer.test(whole!) || !/^\d{1,2}$/.test(decimals!)) return null
    normalized = `${whole!.replace(/\./g, '')}.${decimals}`
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, '')
  else normalized = raw
  if ((normalized.match(/\./g) || []).length > 1) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0 || value > MAX_PASIVIDAD) return null
  return value
}

export type EstimatorKind = 'referencia' | 'como-2026' | 'provisorio' | 'definitivo'

export interface EstimatorScenario {
  kind: EstimatorKind
  pct: number
  /** La pasividad nominal con el aumento, redondeada al peso. */
  result: number
  /** Cuánto más por mes, redondeado al peso. */
  increase: number
}

function scenario(kind: EstimatorKind, amount: number, pct: number): EstimatorScenario {
  const result = Math.round(amount * (1 + pct / 100))
  return { kind, pct, result, increase: result - Math.round(amount) }
}

/**
 * Pendiente: dos escenarios rotulados como estimación (el IMSN acumulado a la última lectura y el
 * aumento de 2026). Con cifra oficial (provisoria o definitiva): sólo ésa.
 */
export function jubilacionScenarios(
  amount: number,
  state: AumJub2027 = AUMJUB_2027,
  ref: AumJubReferencia = AUMJUB_IMSN_REFERENCIA
): EstimatorScenario[] {
  switch (aumJubEstado(state)) {
    case 'definitivo':
      return [scenario('definitivo', amount, state.pct!)]
    case 'provisorio':
      return [scenario('provisorio', amount, state.provisorioPct!)]
    default:
      return [
        scenario('referencia', amount, ref.imsnAcumuladoPct),
        scenario('como-2026', amount, AJUSTE_PASIVIDADES_2026_PCT),
      ]
  }
}

/** La mínima se ajusta aparte (por BPC): avisarlo a quien cobra cerca de ella. */
export function nearMinimum(amount: number): boolean {
  return amount <= JUBILACION_MINIMA_2026 * 1.1
}
