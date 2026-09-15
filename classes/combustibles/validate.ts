// classes/combustibles/validate.ts
import { FUEL_KEYS, type FuelKey, type FuelRow } from "./parse";

/** Pesos por litro (supergás por kg). Medido 2021-07 → 2026-09: 45,7–101,26. */
export const FUEL_BANDS: Record<FuelKey, readonly [number, number]> = {
  super95: [40, 200],
  premium97: [40, 200],
  gasoil50s: [30, 180],
  gasoil10s: [30, 180],
  queroseno: [30, 180],
  supergas: [40, 200],
};
/** Salto máximo entre vigencias consecutivas. El mayor real fue 35 % (queroseno, abril 2026). */
export const MAX_STEP_PCT = 50;
export const MIN_ROWS = 12;
const REQUIRED: readonly FuelKey[] = ["super95", "gasoil50s"];

export type Validation = { ok: true; rows: FuelRow[] } | { ok: false; reason: string };

export function validateFuelRows(rows: FuelRow[], storedLatestFrom: string | null = null): Validation {
  if (rows.length < MIN_ROWS) return { ok: false, reason: `sólo ${rows.length} filas (mínimo ${MIN_ROWS})` };
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.from)) return { ok: false, reason: `vigencia duplicada ${r.from}` };
    seen.add(r.from);
    for (const key of REQUIRED) if (r[key] == null) return { ok: false, reason: `${key} vacío en ${r.from}` };
    for (const key of FUEL_KEYS) {
      const v = r[key];
      if (v == null) continue;
      const [lo, hi] = FUEL_BANDS[key];
      if (!Number.isFinite(v) || v < lo || v > hi) return { ok: false, reason: `${key}=${v} fuera de banda en ${r.from}` };
    }
  }
  for (const key of FUEL_KEYS) {
    let prev: number | null = null;
    for (const r of rows) {
      const v = r[key];
      if (v == null) continue;
      if (prev != null && Math.abs(v / prev - 1) * 100 > MAX_STEP_PCT) {
        return { ok: false, reason: `${key} salta ${prev} → ${v} en ${r.from}` };
      }
      prev = v;
    }
  }
  const latest = rows[rows.length - 1].from;
  if (storedLatestFrom && latest < storedLatestFrom) {
    return { ok: false, reason: `última vigencia ${latest} anterior a la guardada ${storedLatestFrom}` };
  }
  return { ok: true, rows };
}
