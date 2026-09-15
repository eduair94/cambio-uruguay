import { describe, expect, it } from "vitest";
import type { FuelRow } from "../../classes/combustibles/parse";
import { validateFuelRows } from "../../classes/combustibles/validate";

const row = (from: string, over: Partial<FuelRow> = {}): FuelRow => ({
  from, super95: 80, premium97: 83, gasoil50s: 50, gasoil10s: 58, queroseno: 52, supergas: 88, ...over,
});
const months = (n: number): FuelRow[] =>
  Array.from({ length: n }, (_, i) => row(`2025-${String(i + 1).padStart(2, "0")}-01`));

describe("validateFuelRows", () => {
  it("acepta una serie sana", () => {
    const v = validateFuelRows(months(12));
    expect(v.ok).toBe(true);
  });
  it("rechaza menos de 12 filas", () => {
    expect(validateFuelRows(months(11))).toMatchObject({ ok: false, reason: expect.stringContaining("12") });
  });
  it("rechaza fechas duplicadas", () => {
    const rows = months(12);
    rows[5] = row(rows[4].from);
    expect(validateFuelRows(rows).ok).toBe(false);
  });
  it("rechaza un valor fuera de banda", () => {
    const rows = months(12);
    rows[3] = row(rows[3].from, { super95: 350 });
    expect(validateFuelRows(rows)).toMatchObject({ ok: false, reason: expect.stringContaining("super95") });
  });
  it("rechaza un salto mayor al 50 % entre vigencias (tabla corrida de columna)", () => {
    const rows = months(12);
    rows[6] = row(rows[6].from, { gasoil50s: 88, super95: 50 });
    expect(validateFuelRows(rows).ok).toBe(false);
  });
  it("exige super95 y gasoil50s presentes", () => {
    const rows = months(12);
    rows[2] = row(rows[2].from, { super95: null });
    expect(validateFuelRows(rows).ok).toBe(false);
  });
  it("no deja que una edición vieja pise la vigente", () => {
    expect(validateFuelRows(months(12), "2026-01-01").ok).toBe(false);
    expect(validateFuelRows(months(12), "2025-12-01").ok).toBe(true);
  });
});
