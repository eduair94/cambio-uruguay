import { describe, expect, it } from "vitest";
import { applyCostBands } from "../../classes/costs/bands";

describe("applyCostBands", () => {
  it("accepts in-band figures and records them as updated", () => {
    const out = applyCostBands({ salarioMinimo: 26500, boletoStm: 55 });
    expect(out.figures.salarioMinimo).toBe(26500);
    expect(out.figures.boletoStm).toBe(55);
    expect(out.updated.sort()).toEqual(["boletoStm", "salarioMinimo"]);
  });

  it("rejects an out-of-band value — it never appears in figures or updated", () => {
    const out = applyCostBands({ salarioMinimo: 999999, rentMono: 20000 });
    expect(out.figures.salarioMinimo).toBeUndefined();
    expect(out.figures.rentMono).toBe(20000);
    expect(out.updated).toEqual(["rentMono"]);
  });

  it("rejects nulls, strings and NaN without producing anything", () => {
    const out = applyCostBands({ salarioMinimo: null, boletoStm: "55", rent1: NaN });
    expect(out.updated).toEqual([]);
    expect(out.figures).toEqual({});
  });

  it("rounds every accepted figure to the nearest integer", () => {
    const out = applyCostBands({ rent2: 45999.6 });
    expect(out.figures.rent2).toBe(46000);
  });
});
