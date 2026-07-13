// What /api/uy-figures serves when the backend is unreachable: the same verified 2026 baseline
// that used to live in server/utils/uyFiguresLive.ts (now migrated to the backend's
// classes/figures/bands.ts — BASELINE_FIGURES there is the source of truth; this is a faithful
// copy so the page never blanks).
export interface UyFigures {
  /** Salario mínimo nacional (UYU/mes, nominal). */
  salarioMinimo: number
  /** Base de Prestaciones y Contribuciones (UYU). */
  bpc: number
  /** Boleto común de Montevideo con tarjeta STM (UYU). */
  boletoStm: number
  /** Variación anual del IPC (%). */
  inflacionAnual: number
  /** ISO timestamp of the last successful live refresh, or null (baseline only). */
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

export const UY_FIGURES_FALLBACK: UyFigures = {
  salarioMinimo: 25383, // desde 1-jul-2026
  bpc: 6864, // valor 2026 (BPC 2025 era $6.576)
  boletoStm: 52, // boleto STM con tarjeta desde 5-ene-2026
  inflacionAnual: 4.3, // IPC interanual ~jun-2026
  asOf: null,
  updated: [],
  sources: [],
}
