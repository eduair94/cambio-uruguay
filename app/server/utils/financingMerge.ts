// Apply the backend's validated live financing figures to this app's verified baseline.
//
// This is NOT Gemini logic and it is not new logic: it is the exact arithmetic that used to sit in
// server/utils/financingLive.ts (the INSTRUMENTOS table and neto() — IRPF is withheld on the
// interest, so a change in a gross rate moves the net one too). It stays here because the baseline
// table (app/utils/financingData.ts) stays here — the page imports it, and copying that table into
// the root repo would create a second source of truth. The backend (pm2 `currency-financing`) owns
// only the guardrail bands and returns the five scalar figures; everything below is pure app math.
import { COSTOS_OCULTOS, INSTRUMENTOS, MACRO, type Instrumento } from '../../utils/financingData'

/** The five scalar figures the backend validates + returns (classes/financing/refresh.ts). */
export interface FinancingFigures {
  tpm?: number
  inflacion?: number
  plazoFijoBrou?: number
  fondoPesos?: number
  topeUsura?: number
}
export interface FinancingResponse {
  figures: FinancingFigures
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}
/** The shape the page consumes from /api/financing-rates. */
export interface LiveFinancing {
  tpm: number
  inflacion: number
  plazoFijoBrou: number
  fondoPesos: number
  topeUsura: number
  instrumentos: Instrumento[]
  /** null when we are serving the baseline and never got a live refresh. */
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

/** IRPF is withheld on the interest, so a change in the gross rate moves the net one too. */
function neto(bruto: number, irpf: number): number {
  return Math.round(bruto * (1 - irpf / 100) * 100) / 100
}

/** Never mutate the shared baseline constants (INSTRUMENTOS/MACRO are frozen singletons). */
export function baselineFinancing(): LiveFinancing {
  return {
    tpm: MACRO.tpm.value,
    inflacion: MACRO.inflacion.value,
    plazoFijoBrou: 5.5,
    fondoPesos: 4.5,
    topeUsura: COSTOS_OCULTOS.topeUsura.value,
    instrumentos: INSTRUMENTOS.map(i => ({ ...i })),
    asOf: null,
    updated: [],
    sources: [],
  }
}

/**
 * Merge the backend's validated figures over the baseline. Pure + exported so the instrument
 * arithmetic is unit-testable without a network call. Only figures the backend marked as `updated`
 * (i.e. that passed a band) are applied; everything else keeps the baseline.
 */
export function applyFinancingOverrides(res: FinancingResponse | null): LiveFinancing {
  const out = baselineFinancing()
  if (!res?.updated?.length) return out

  const f = res.figures ?? {}
  if (typeof f.tpm === 'number') out.tpm = f.tpm
  if (typeof f.inflacion === 'number') out.inflacion = f.inflacion
  if (typeof f.topeUsura === 'number') out.topeUsura = f.topeUsura
  if (typeof f.plazoFijoBrou === 'number') {
    out.plazoFijoBrou = f.plazoFijoBrou
    const pf = out.instrumentos.find(i => i.id === 'brou-pf-ebrou')
    if (pf) {
      pf.bruto = f.plazoFijoBrou
      pf.neto = neto(f.plazoFijoBrou, pf.irpf)
    }
  }
  if (typeof f.fondoPesos === 'number') {
    out.fondoPesos = f.fondoPesos
    const fondo = out.instrumentos.find(i => i.id === 'fondo-pesos')
    if (fondo) {
      fondo.bruto = f.fondoPesos
      fondo.neto = neto(f.fondoPesos, fondo.irpf)
    }
  }

  out.asOf = res.asOf
  out.updated = res.updated
  out.sources = res.sources ?? []
  return out
}
