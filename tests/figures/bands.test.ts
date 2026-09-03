import { describe, expect, it } from "vitest";
import { applyFigureBands, baselineFigures, BASELINE_FIGURES } from "../../classes/figures/bands";

describe("applyFigureBands", () => {
  it("takes a plausible value and records that it was updated", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { salarioMinimo: 26500, bpc: 6900 });
    expect(out.figures.salarioMinimo).toBe(26500);
    expect(out.figures.bpc).toBe(6900);
    expect(out.updated.sort()).toEqual(["bpc", "salarioMinimo"]);
  });

  it("rejects an out-of-band value and keeps the baseline — a hallucinated number never ships", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { salarioMinimo: 2_500_000, bpc: 6900 });
    expect(out.figures.salarioMinimo).toBe(BASELINE_FIGURES.salarioMinimo);
    expect(out.updated).toEqual(["bpc"]);
  });

  it("rejects nulls, strings and NaN without touching anything", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { salarioMinimo: null, bpc: "6900", boletoStm: NaN });
    expect(out.updated).toEqual([]);
    expect(out.figures).toEqual(BASELINE_FIGURES);
  });

  it("rounds inflación to one decimal and the rest to integers", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { inflacionAnual: 4.37, boletoStm: 52.6 });
    expect(out.figures.inflacionAnual).toBe(4.4);
    expect(out.figures.boletoStm).toBe(53);
  });
});

// El guardarraíl que faltaba, y el que estuvo publicando cifras de 2024 durante meses.
//
// El 2026-09-03 la API servía salario mínimo $22.268 y BPC $6.177 —los de 2024— con `asOf` del día
// y las cuatro marcadas como actualizadas: Gemini las encontró en la web y las cuatro caían dentro
// de banda, así que el job pisó una base verificada de 2026 con datos más viejos que ella.
describe("una cifra vieja no es una actualización", () => {
  it("rechaza un valor por debajo del verificado en las que sólo suben", () => {
    const base = baselineFigures();
    const { figures, updated } = applyFigureBands(base, {
      salarioMinimo: 22268,
      bpc: 6177,
      boletoStm: 45,
    });
    expect(figures.salarioMinimo).toBe(base.salarioMinimo);
    expect(figures.bpc).toBe(base.bpc);
    expect(figures.boletoStm).toBe(base.boletoStm);
    expect(updated).toEqual([]);
  });

  it("sigue aceptando una suba, que es para lo que existe el refresco", () => {
    const base = baselineFigures();
    const { figures, updated } = applyFigureBands(base, {
      salarioMinimo: base.salarioMinimo + 1_500,
      bpc: base.bpc + 300,
    });
    expect(figures.salarioMinimo).toBe(base.salarioMinimo + 1_500);
    expect(figures.bpc).toBe(base.bpc + 300);
    expect(updated).toEqual(["salarioMinimo", "bpc"]);
  });

  it("acepta el mismo valor, que es lo que devuelve una corrida normal", () => {
    const base = baselineFigures();
    const { updated } = applyFigureBands(base, { bpc: base.bpc });
    expect(updated).toEqual(["bpc"]);
  });

  // La inflación baja de verdad: meterla en la regla congelaría el único dato que puede caer.
  it("la inflación sí puede bajar", () => {
    const base = baselineFigures();
    const { figures, updated } = applyFigureBands(base, { inflacionAnual: 2.1 });
    expect(figures.inflacionAnual).toBe(2.1);
    expect(updated).toEqual(["inflacionAnual"]);
  });
});
