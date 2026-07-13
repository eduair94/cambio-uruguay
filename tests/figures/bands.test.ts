import { describe, expect, it } from "vitest";
import { applyFigureBands, BASELINE_FIGURES } from "../../classes/figures/bands";

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
