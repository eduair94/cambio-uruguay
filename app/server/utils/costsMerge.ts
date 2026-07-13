// Apply the backend's validated live figures to this app's verified cost model.
//
// This is NOT Gemini logic and it is not new logic: it is the exact arithmetic that used to sit in
// server/utils/costOfLivingLive.ts (transporte = boleto × 2 tramos × 22 días, rents rounded to the
// nearest 500). It stays here because COST_MODEL stays here — the page imports it, and copying that
// table into the root repo would create a second source of truth for numbers we have already shipped
// wrong once elsewhere.
import { COST_MODEL, SALARY_REFERENCE } from '../../utils/costOfLiving'
import type { DwellingType } from '../../utils/costOfLiving'

export interface LiveCostFigures {
  salarioMinimo?: number
  boletoStm?: number
  rentMono?: number
  rent1?: number
  rent2?: number
}
export interface LiveCostsResponse {
  figures: LiveCostFigures
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}
export interface LiveCosts {
  model: typeof COST_MODEL
  salary: { minimoNacional: number; medianaLiquidoAprox: number }
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

const cloneBaseline = (): typeof COST_MODEL => ({
  ...COST_MODEL,
  rentMontevideo: { ...COST_MODEL.rentMontevideo },
})

export function baselineCosts(): LiveCosts {
  return { model: cloneBaseline(), salary: { ...SALARY_REFERENCE }, asOf: null, updated: [], sources: [] }
}

export function applyCostOverrides(live: LiveCostsResponse | null): LiveCosts {
  const out = baselineCosts()
  if (!live?.updated?.length) return out

  const f = live.figures ?? {}
  if (typeof f.salarioMinimo === 'number') out.salary.minimoNacional = f.salarioMinimo
  if (typeof f.boletoStm === 'number') {
    out.model.transportPerAdult = Math.round((f.boletoStm * 2 * 22) / 100) * 100
  }
  const rents: Array<[keyof LiveCostFigures, DwellingType]> = [
    ['rentMono', 'monoambiente'],
    ['rent1', '1_dormitorio'],
    ['rent2', '2_dormitorios'],
  ]
  for (const [key, dwelling] of rents) {
    const v = f[key]
    if (typeof v === 'number') out.model.rentMontevideo[dwelling] = Math.round(v / 500) * 500
  }

  out.asOf = live.asOf
  out.updated = live.updated
  out.sources = live.sources ?? []
  return out
}
