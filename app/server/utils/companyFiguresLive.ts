// Source of truth for the volatile figures on /que-empresa-abrir-uruguay.
//
// ARCHITECTURE: this app does NOT call any LLM — the Gemini refreshes moved to the
// root Express backend (classes/gemini.ts), and tests/unit/noGeminiInApp.test.ts
// enforces it. So the app serves the VERIFIED BASELINE (derived from the sourced
// FIGURES in utils/companyTypes.ts). The PURE band validator below stays ready for
// the day a backend company-figures refresher writes into the `company` store — it
// accepts only in-band values, so a bad refresh can never reach the page.
//
// The ANNUAL CEILINGS (topes in UI) are never auto-refreshed anywhere: they are
// constants set by decree each January using the UI at the close of the previous
// ejercicio. They stay hand-maintained in utils/companyTypes.ts, and the
// figures:drift watchdog (figuresDrift.ts) nags when the BPC they depend on drifts.
import { FIGURES } from '../../utils/companyTypes'

export interface CompanyFigures {
  ivaMinimo: number
  monoPlenoFonasaSolo: number
  bpsUnipersonalPleno: number
  bpsAdminSas: number
  bpsSocioSrl: number
  icosaAnual: number
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

/** The refreshable keys. Anything not here is hand-maintained (e.g. the topes). */
const KEYS = [
  'ivaMinimo',
  'monoPlenoFonasaSolo',
  'bpsUnipersonalPleno',
  'bpsAdminSas',
  'bpsSocioSrl',
  'icosaAnual',
] as const

type RefreshableKey = (typeof KEYS)[number]

/** Anything outside these is a hallucination or a stale year. Keep them TIGHT. */
export const COMPANY_FIGURE_BANDS: Record<RefreshableKey, readonly [number, number]> = {
  ivaMinimo: [4000, 9000],
  monoPlenoFonasaSolo: [4000, 9000],
  bpsUnipersonalPleno: [7000, 12_000],
  bpsAdminSas: [8000, 15_000],
  bpsSocioSrl: [4500, 9000],
  icosaAnual: [20_000, 40_000],
}

const STORAGE = 'company'
const KEY = 'live'

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

export function baselineCompanyFigures(): CompanyFigures {
  return {
    ivaMinimo: FIGURES.ivaMinimo.value,
    monoPlenoFonasaSolo: FIGURES.monoPlenoFonasaSolo.value,
    bpsUnipersonalPleno: FIGURES.bpsUnipersonalPleno.value,
    bpsAdminSas: FIGURES.bpsAdminSas.value,
    bpsSocioSrl: FIGURES.bpsSocioSrl.value,
    icosaAnual: FIGURES.icosaAnual.value,
    asOf: null,
    updated: [],
    sources: [],
  }
}

/**
 * Merge a raw refresher payload over a baseline, accepting only values that fall
 * inside their plausibility band. PURE: returns a fresh object, never mutates
 * `baseline`. `updated` lists exactly the keys that were accepted. Kept for a
 * future backend refresher; the app itself never produces a payload.
 */
export function applyLiveCompanyFigures(
  baseline: CompanyFigures,
  payload: Partial<Record<RefreshableKey, number>>
): { figures: CompanyFigures; updated: RefreshableKey[] } {
  const figures: CompanyFigures = { ...baseline }
  const updated: RefreshableKey[] = []
  for (const k of KEYS) {
    const candidate = payload[k]
    if (inBand(candidate, COMPANY_FIGURE_BANDS[k])) {
      figures[k] = Math.round(candidate)
      updated.push(k)
    }
  }
  return { figures, updated }
}

export async function getStoredCompanyFigures(): Promise<CompanyFigures | null> {
  return (await useStorage(STORAGE).getItem<CompanyFigures>(KEY)) ?? null
}

export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  return Number.isFinite(t) ? (Date.now() - t) / 86_400_000 : Infinity
}
