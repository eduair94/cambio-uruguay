// BCU usury caps (topes de usura) for /saldar-deudas-uruguay. `applyLiveCaps` is a verbatim port
// of app/server/utils/debtReliefLive.ts's guardrail — same bands, same band-check logic, same
// index convention (0 = con autorización de descuento, 1 = sin) — with one deliberate signature
// change: it takes `{ usuryCaps }` instead of the app's full DebtReliefBaseline, because
// refiRates and period are static page content that stayed in app/utils/debtRelief.ts (this
// backend never needed them and copying them here would be a second source of truth for prose).
export interface UsuryCap {
  segmento: string;
  tasaMedia: number;
  topeTasa: number;
  topeMora: number;
}

/** Something with a `usuryCaps` array to merge live values over — the only piece this needs. */
export interface UsuryCapsBaseline {
  usuryCaps: UsuryCap[];
}

// Verified baseline snapshot — mirrors DEBT_RELIEF_BASELINE.usuryCaps in app/utils/debtRelief.ts
// (BCU "Tasas medias", período marzo–mayo 2026, topes vigentes desde el 1/7/2026). Index 0 = con
// descuento, 1 = sin. The numbers are already verified; do not re-derive them.
export const BASELINE_CAPS: UsuryCap[] = [
  {
    segmento: "Consumo con autorización de descuento, < 10.000 UI",
    tasaMedia: 21.16,
    topeTasa: 32.798,
    topeMora: 38.088,
  },
  {
    segmento: "Consumo sin autorización de descuento, < 10.000 UI",
    tasaMedia: 80.72,
    topeTasa: 125.116,
    topeMora: 145.296,
  },
];

/** Plausible bands (annual %). Outside → rejected, baseline kept. */
export const CAP_BANDS = {
  topeConDescuento: [25, 45],
  moraConDescuento: [28, 55],
  topeSinDescuento: [90, 160],
  moraSinDescuento: [100, 190],
} as const;

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= band[0] && n <= band[1];

/**
 * Merge validated live caps over a baseline. Pure + exported so the guardrails are unit-testable
 * without a network call. Index 0 = con descuento, 1 = sin.
 */
export function applyLiveCaps(
  baseline: UsuryCapsBaseline,
  data: Record<string, unknown>
): { caps: UsuryCap[]; updated: string[] } {
  const caps = baseline.usuryCaps.map((c) => ({ ...c }));
  const updated: string[] = [];
  if (caps[0]) {
    if (inBand(data.topeConDescuento, CAP_BANDS.topeConDescuento)) {
      caps[0].topeTasa = data.topeConDescuento as number;
      updated.push("topeConDescuento");
    }
    if (inBand(data.moraConDescuento, CAP_BANDS.moraConDescuento)) {
      caps[0].topeMora = data.moraConDescuento as number;
      updated.push("moraConDescuento");
    }
  }
  if (caps[1]) {
    if (inBand(data.topeSinDescuento, CAP_BANDS.topeSinDescuento)) {
      caps[1].topeTasa = data.topeSinDescuento as number;
      updated.push("topeSinDescuento");
    }
    if (inBand(data.moraSinDescuento, CAP_BANDS.moraSinDescuento)) {
      caps[1].topeMora = data.moraSinDescuento as number;
      updated.push("moraSinDescuento");
    }
  }
  return { caps, updated };
}
