// Live cost-of-living figures for the /herramientas/costo-de-vida tool. Unlike classes/figures/*
// (which owns a full baseline for every field), this module owns ONLY the guardrail bands and
// returns just the figures that passed one — no COST_MODEL here. Copying COST_MODEL into the root
// repo would duplicate a large table of numbers the page also imports; the app applies these
// validated figures to its own COST_MODEL (see app/server/utils/costsMerge.ts). BANDS copied
// verbatim from app/server/utils/costOfLivingLive.ts:29-35 — the numbers are already verified.
export interface CostFigures {
  salarioMinimo?: number;
  boletoStm?: number;
  rentMono?: number;
  rent1?: number;
  rent2?: number;
}

/** Plausible bands (UYU). A value outside its band is rejected — the field is simply omitted. */
export const COST_BANDS = {
  salarioMinimo: [20000, 40000],
  boletoStm: [40, 120],
  rentMono: [12000, 40000],
  rent1: [18000, 55000],
  rent2: [26000, 80000],
} as const;

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= band[0] && n <= band[1];

/**
 * Validate a raw Gemini payload against COST_BANDS. Pure + exported so the guardrails are
 * unit-testable without a network call. A rejected field is simply absent from `figures` and
 * `updated` — there is no baseline to fall back to here (that lives on the app side).
 */
export function applyCostBands(data: Record<string, unknown>): { figures: CostFigures; updated: string[] } {
  const figures: CostFigures = {};
  const updated: string[] = [];
  for (const k of Object.keys(COST_BANDS) as Array<keyof typeof COST_BANDS>) {
    if (inBand(data[k], COST_BANDS[k])) {
      figures[k] = Math.round(data[k] as number);
      updated.push(k);
    }
  }
  return { figures, updated };
}
