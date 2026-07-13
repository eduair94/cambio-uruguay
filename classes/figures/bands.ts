// Uruguay's key national figures: salario mínimo, BPC, boleto STM and annual inflación. The
// guardrail is the whole point of this module — a value Gemini proposes must fall inside a
// plausible band or it is rejected and the baseline is kept, so a hallucinated number can never
// ship. Verbatim port of app/server/utils/uyFiguresLive.ts's BASELINE/BANDS/inBand/update-loop
// (lines 24-37, 100-111) — the numbers are already verified; do not re-derive them.
export interface UyFigures {
  /** Salario mínimo nacional (UYU/mes, nominal). */
  salarioMinimo: number;
  /** Base de Prestaciones y Contribuciones (UYU). */
  bpc: number;
  /** Boleto común de Montevideo con tarjeta STM (UYU). */
  boletoStm: number;
  /** Variación anual del IPC (%). */
  inflacionAnual: number;
  /** ISO timestamp of the last successful live refresh, or null (baseline only). */
  asOf: string | null;
  updated: string[];
  sources: Array<{ label: string; url: string }>;
}

// Verified baseline (2026). Kept when Gemini is unavailable or returns nothing usable.
const BASELINE = {
  salarioMinimo: 25383, // desde 1-jul-2026
  bpc: 6864, // valor 2026 (BPC 2025 era $6.576)
  boletoStm: 52, // boleto STM con tarjeta desde 5-ene-2026
  inflacionAnual: 4.3, // IPC interanual ~jun-2026
} as const;

export const FIGURE_BANDS = {
  salarioMinimo: [20000, 45000],
  bpc: [6000, 10000],
  boletoStm: [40, 120],
  inflacionAnual: [1, 15],
} as const;

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= band[0] && n <= band[1];

export function baselineFigures(): UyFigures {
  return { ...BASELINE, asOf: null, updated: [], sources: [] };
}

/** A fresh copy of the verified baseline figures, safe to use as the starting point of a merge. */
export const BASELINE_FIGURES: UyFigures = baselineFigures();

/**
 * Merge validated live figures over `current`. Pure + exported so the guardrails are
 * unit-testable without a network call. Out-of-band, non-numeric, null and NaN values are all
 * rejected — `current`'s value for that field is kept and it is left out of `updated`.
 */
export function applyFigureBands(
  current: UyFigures,
  data: Record<string, unknown>
): { figures: UyFigures; updated: string[] } {
  const figures: UyFigures = { ...current, updated: [], sources: current.sources };
  const updated: string[] = [];
  for (const k of ["salarioMinimo", "bpc", "boletoStm", "inflacionAnual"] as const) {
    if (inBand(data[k], FIGURE_BANDS[k])) {
      figures[k] = k === "inflacionAnual" ? Math.round((data[k] as number) * 10) / 10 : Math.round(data[k] as number);
      updated.push(k);
    }
  }
  figures.updated = updated;
  return { figures, updated };
}
