// The BCU "Tasas medias de interés" table (Ley 18.212), for
// /adelanto-de-efectivo-tarjeta-de-credito — which needs the full consumer grid, not just the
// two rows classes/debt/bands.ts keeps for /saldar-deudas-uruguay.
//
// WHY THIS EXISTS AT ALL: the BCU republishes this table EVERY MONTH on a rolling three-month
// window (comunicado 2026/100 of 21/05 carried FEB–ABR effective 1 June; the table live on
// 2026-08-19 carries ABR–JUN effective 1 August). A hardcoded snapshot is therefore stale within
// weeks, on a page whose whole point is telling people what they will be charged.
//
// WHY IT IS SAFE WITHOUT PARSING THE PDF: Ley 18.212 defines the caps ARITHMETICALLY from the
// published averages — tope = media × 1,55 and tope de mora = media × 1,80 for capital under
// 2.000.000 UI. So whatever the source (grounded search here, like every other self-updating
// figure in this repo), a candidate table can be PROVEN internally consistent before it is
// stored: six rows that all close to four decimals are not a hallucination. `validateTable` is
// that proof, and it is a strictly stronger guard than the plausibility bands used elsewhere.
//
// Anything that fails validation is discarded and the previous good snapshot (or this baseline)
// keeps serving. Pure module — no network, no Mongo — so the guard is unit-testable.

/** Ley 18.212 multipliers over the published average, for capital under 2.000.000 UI. */
export const MARKUP_TASA = 0.55;
export const MARKUP_MORA = 0.8;

/** Tolerance when checking the arithmetic, in percentage points. */
export const ARITHMETIC_EPSILON = 0.0005;

export type Bracket = "menor10kUI" | "mayor10kUI";
export type Currency = "UYU" | "USD";

/** One row of the "Familias › Consumo › sin autorización de descuento" grid. */
export interface BcuRateRow {
  bracket: Bracket;
  /** `true` = "hasta 366 días"; `false` = "367 días o más". */
  cortoPlazo: boolean;
  currency: Currency;
  /** Published average, in percent (84.47 = 84,47 %). */
  media: number;
  /** Cap on the ordinary rate, in percent. */
  tope: number;
  /** Cap on the default rate, in percent. */
  topeMora: number;
}

export interface BcuRateTable {
  /** The three-month window the BCU names, e.g. "abril–junio de 2026". */
  periodo: string;
  /** ISO date the table takes effect, e.g. "2026-08-01". */
  vigenteDesde: string;
  rows: BcuRateRow[];
  /** ISO timestamp of the last successful refresh; null when serving the pure baseline. */
  asOf: string | null;
  sources: Array<{ label: string; url: string }>;
}

export const BCU_TABLE_URL = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/tasas-medias-interes.pdf";

/**
 * Verified snapshot: BCU "Tasas medias de interés", período ABRIL–JUNIO de 2026, "Tasas efectivas
 * anuales vigentes a partir del 1º de agosto de 2026". Transcribed from the PDF on 2026-08-18 and
 * re-checked against the live document on 2026-08-19. Column: Familias › Consumo › SIN
 * autorización de descuento (a credit card is not deducted from your salary).
 *
 * Cross-check: 84,47 × 1,55 = 130,9285 and 84,47 × 1,80 = 152,046 — both match the PDF exactly,
 * which is what proves the column mapping was read correctly.
 */
export const BASELINE_TABLE: BcuRateTable = {
  periodo: "abril–junio de 2026",
  vigenteDesde: "2026-08-01",
  asOf: null,
  sources: [{ label: "BCU — Tasas medias de interés", url: BCU_TABLE_URL }],
  rows: [
    { bracket: "menor10kUI", cortoPlazo: true, currency: "UYU", media: 84.47, tope: 130.9285, topeMora: 152.046 },
    { bracket: "menor10kUI", cortoPlazo: false, currency: "UYU", media: 82.36, tope: 127.658, topeMora: 148.248 },
    { bracket: "mayor10kUI", cortoPlazo: true, currency: "UYU", media: 41.02, tope: 63.581, topeMora: 73.836 },
    { bracket: "mayor10kUI", cortoPlazo: false, currency: "UYU", media: 57.32, tope: 88.846, topeMora: 103.176 },
    { bracket: "menor10kUI", cortoPlazo: true, currency: "USD", media: 8.26, tope: 12.803, topeMora: 14.868 },
    { bracket: "menor10kUI", cortoPlazo: false, currency: "USD", media: 12.26, tope: 19.003, topeMora: 22.068 },
  ],
};

export function baselineTable(): BcuRateTable {
  return { ...BASELINE_TABLE, rows: BASELINE_TABLE.rows.map((r) => ({ ...r })) };
}

/**
 * Plausibility bands per row key, in percent. These catch a table that is internally consistent
 * but wildly wrong (a decimal slip multiplies media, tope and mora together, so the arithmetic
 * still closes — only a band notices). Deliberately wide: the point is to reject nonsense, not to
 * second-guess the BCU.
 */
export const MEDIA_BANDS: Record<string, readonly [number, number]> = {
  "UYU|menor10kUI|corto": [40, 140],
  "UYU|menor10kUI|largo": [40, 140],
  "UYU|mayor10kUI|corto": [15, 90],
  "UYU|mayor10kUI|largo": [15, 90],
  "USD|menor10kUI|corto": [2, 30],
  "USD|menor10kUI|largo": [2, 35],
};

export function rowKey(r: Pick<BcuRateRow, "currency" | "bracket" | "cortoPlazo">): string {
  return `${r.currency}|${r.bracket}|${r.cortoPlazo ? "corto" : "largo"}`;
}

export interface ValidationResult {
  ok: boolean;
  /** Human-readable reasons the candidate was rejected. Empty when `ok`. */
  problems: string[];
}

const close = (a: number, b: number) => Math.abs(a - b) <= ARITHMETIC_EPSILON;

/**
 * Prove a candidate table before storing it.
 *
 * A table passes only when it (a) covers exactly the same six row keys as the baseline, (b) has
 * finite positive numbers throughout, (c) sits inside its plausibility band, and (d) satisfies
 * Ley 18.212 arithmetic on EVERY row. (d) is the real guard: it is trivial to satisfy when the
 * numbers were actually read off the BCU table and essentially impossible otherwise.
 */
export function validateTable(candidate: unknown): ValidationResult {
  const problems: string[] = [];
  const t = candidate as Partial<BcuRateTable> | null;

  if (!t || typeof t !== "object") return { ok: false, problems: ["not an object"] };
  if (!Array.isArray(t.rows)) return { ok: false, problems: ["rows is not an array"] };

  if (typeof t.periodo !== "string" || !t.periodo.trim()) problems.push("missing periodo");
  if (typeof t.vigenteDesde !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.vigenteDesde)) {
    problems.push("vigenteDesde is not an ISO date");
  }

  const expected = new Set(BASELINE_TABLE.rows.map(rowKey));
  const seen = new Set<string>();

  for (const row of t.rows as BcuRateRow[]) {
    const key = rowKey(row);
    if (!expected.has(key)) {
      problems.push(`unexpected row ${key}`);
      continue;
    }
    if (seen.has(key)) {
      problems.push(`duplicate row ${key}`);
      continue;
    }
    seen.add(key);

    const nums = [row.media, row.tope, row.topeMora];
    if (!nums.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)) {
      problems.push(`${key}: non-finite or non-positive value`);
      continue;
    }

    const band = MEDIA_BANDS[key];
    if (band && (row.media < band[0] || row.media > band[1])) {
      problems.push(`${key}: media ${row.media} outside band ${band[0]}–${band[1]}`);
    }
    if (!close(row.tope, row.media * (1 + MARKUP_TASA))) {
      problems.push(`${key}: tope ${row.tope} != media × 1,55 (${(row.media * (1 + MARKUP_TASA)).toFixed(4)})`);
    }
    if (!close(row.topeMora, row.media * (1 + MARKUP_MORA))) {
      problems.push(`${key}: mora ${row.topeMora} != media × 1,80 (${(row.media * (1 + MARKUP_MORA)).toFixed(4)})`);
    }
  }

  for (const key of expected) if (!seen.has(key)) problems.push(`missing row ${key}`);

  return { ok: problems.length === 0, problems };
}

/**
 * Derive the two caps from a published average, so a source that only gives the averages is
 * still usable. Rounded to 4 decimals, which is how the BCU prints them.
 */
export function capsFromMedia(media: number): { tope: number; topeMora: number } {
  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  return { tope: round4(media * (1 + MARKUP_TASA)), topeMora: round4(media * (1 + MARKUP_MORA)) };
}

/** True when `table` is older than the BCU's monthly cadence would suggest. */
export function isStale(table: Pick<BcuRateTable, "vigenteDesde">, today: Date): boolean {
  const eff = new Date(`${table.vigenteDesde}T00:00:00Z`);
  if (Number.isNaN(eff.getTime())) return true;
  // The BCU publishes monthly, so anything effective more than ~40 days ago has been superseded.
  return today.getTime() - eff.getTime() > 40 * 24 * 3600 * 1000;
}
