// Live financing figures for /conviene-comprar-en-cuotas. Like classes/costs/*, this module owns
// ONLY the guardrail bands and returns the scalar figures that passed one — the INSTRUMENTOS table
// and the neto() arithmetic stay in the app (app/server/utils/financingMerge.ts), because the
// verified baseline table (app/utils/financingData.ts) lives there and the page imports it.
//
// The bands are deliberately TIGHT, and asymmetrically so. This page's conclusion is a comparison
// between a financing rate and an investment yield, so a single wrong yield inverts the verdict —
// and the wrong yields are the ones that rank highest in search (Ámbito's 8,7% "LRM", the Argentine
// "Prex 20% TNA"). With the uruguayan TPM near 5–6%, no peso instrument safely pays over ~9%, so
// the ceilings sit below anything the instrument can produce rather than merely "somewhere
// plausible". A too-tight band rejects a real rise and the page goes stale but stays RIGHT; a
// too-loose band lets a wrong number in and the page starts telling people to finance. Prefer
// stale over wrong. Bands copied verbatim from the app's former server/utils/financingLive.ts.
export interface FinancingFigures {
  tpm?: number;
  inflacion?: number;
  plazoFijoBrou?: number;
  fondoPesos?: number;
  topeUsura?: number;
}

/** Plausible bands (% annual). A value outside its band is rejected — the field is omitted. */
export const FINANCING_BANDS = {
  tpm: [3, 12],
  inflacion: [1, 12],
  plazoFijoBrou: [2, 8.5],
  fondoPesos: [1, 7.5],
  topeUsura: [80, 200],
} as const;

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= band[0] && n <= band[1];

/**
 * Validate a raw Gemini payload against FINANCING_BANDS. Pure + exported so the guardrails are
 * unit-testable without a network call. A rejected field is simply absent from `figures` and
 * `updated` — there is no baseline here (that lives on the app side, financingMerge.ts). Values
 * are percentages with decimals, so they are kept as-is (unlike costs/bands.ts, which rounds).
 */
export function applyFinancingBands(data: Record<string, unknown>): { figures: FinancingFigures; updated: string[] } {
  const figures: FinancingFigures = {};
  const updated: string[] = [];
  for (const k of Object.keys(FINANCING_BANDS) as Array<keyof typeof FINANCING_BANDS>) {
    if (inBand(data[k], FINANCING_BANDS[k])) {
      figures[k] = data[k] as number;
      updated.push(k);
    }
  }
  return { figures, updated };
}
