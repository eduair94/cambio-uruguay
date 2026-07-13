// Apply the backend's validated live usury caps to this app's verified debt-relief baseline.
//
// This is NOT Gemini logic: it is a plain merge. refiRates and period are static page content —
// they never left app/utils/debtRelief.ts — so unlike costsMerge.ts there is no arithmetic here,
// just "take the live caps if we have them, otherwise keep the baseline's".
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'
import type { LiveDebtRelief, UsuryCap } from '../../utils/debtRelief'

export interface LiveDebtReliefResponse {
  usuryCaps: UsuryCap[]
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

export function baselineDebtRelief(): LiveDebtRelief {
  return {
    period: DEBT_RELIEF_BASELINE.period,
    usuryCaps: DEBT_RELIEF_BASELINE.usuryCaps.map(c => ({ ...c })),
    refiRates: DEBT_RELIEF_BASELINE.refiRates.map(r => ({ ...r })),
    asOf: null,
    updated: [],
    sources: [],
  }
}

export function applyDebtReliefOverrides(live: LiveDebtReliefResponse | null): LiveDebtRelief {
  const base = baselineDebtRelief()
  if (!live?.updated?.length) return base
  return {
    ...base,
    usuryCaps: live.usuryCaps?.length ? live.usuryCaps : base.usuryCaps,
    asOf: live.asOf,
    updated: live.updated,
    sources: live.sources ?? [],
  }
}
