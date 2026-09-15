import { describe, expect, it } from "vitest";
import { buildFuelResponse } from "../../classes/combustibles/api";
import { BASELINE_FUEL_ROWS, BASELINE_FUEL_SOURCE_URL } from "../../classes/combustibles/baseline";

describe("buildFuelResponse", () => {
  it("expone latest, previous y las filas ascendentes", () => {
    const r = buildFuelResponse([...BASELINE_FUEL_ROWS], null);
    expect(r.asOf).toBeNull();
    expect(r.sourceUrl).toBe(BASELINE_FUEL_SOURCE_URL);
    expect(r.latest.from).toBe("2026-09-01");
    expect(r.previous?.from).toBe("2026-08-01");
    expect(r.rows[0].from < r.rows[r.rows.length - 1].from).toBe(true);
  });
  it("lleva el asOf de la meta cuando hay lectura viva", () => {
    const r = buildFuelResponse([...BASELINE_FUEL_ROWS], { asOf: "2026-09-15T07:11:00.000Z", rows: 24, latestFrom: "2026-09-01", sourceUrl: "x" });
    expect(r.asOf).toBe("2026-09-15T07:11:00.000Z");
    expect(r.sourceUrl).toBe("x");
  });
  it("con una sola fila previous es null", () => {
    expect(buildFuelResponse([BASELINE_FUEL_ROWS[0]], null).previous).toBeNull();
  });
});
