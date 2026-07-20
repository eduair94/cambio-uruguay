import { describe, expect, it } from "vitest";
import { applyFinancingBands } from "../../classes/financing/bands";

describe("applyFinancingBands", () => {
  it("keeps nothing when the payload is empty", () => {
    const out = applyFinancingBands({});
    expect(out.updated).toEqual([]);
    expect(out.figures).toEqual({});
  });

  it("accepts plausible in-band figures", () => {
    const out = applyFinancingBands({ tpm: 6.5, inflacion: 4.9, plazoFijoBrou: 6, fondoPesos: 5.1, topeUsura: 130 });
    expect(out.updated).toContain("tpm");
    expect(out.updated).toContain("fondoPesos");
    expect(out.figures.tpm).toBe(6.5);
    expect(out.figures.fondoPesos).toBe(5.1);
  });

  it("rejects Ámbito's LRM number, which would flip the page's conclusion", () => {
    // Ámbito (28-jun-2026) publishes LRM at 8,54–8,78%. They pay ~6%. Merging that in would make
    // the page start telling people to finance. fondoPesos ceiling is 7,5%.
    const out = applyFinancingBands({ fondoPesos: 8.78 });
    expect(out.updated).not.toContain("fondoPesos");
    expect(out.figures.fondoPesos).toBeUndefined();
  });

  it("rejects Argentine peso yields wearing the same brand names", () => {
    // "Prex 20,81% TNA" is an Argentine product. No Uruguayan peso instrument pays that.
    const out = applyFinancingBands({ fondoPesos: 20.81, plazoFijoBrou: 30 });
    expect(out.updated).toEqual([]);
    expect(out.figures).toEqual({});
  });

  it("rejects nonsense of the wrong type or sign", () => {
    const out = applyFinancingBands({ tpm: "5.75", inflacion: null, fondoPesos: -2, topeUsura: Infinity });
    expect(out.updated).toEqual([]);
    expect(out.figures).toEqual({});
  });

  it("takes the good figures from a payload that also contains a bad one", () => {
    const out = applyFinancingBands({ tpm: 6, fondoPesos: 18 });
    expect(out.updated).toEqual(["tpm"]);
    expect(out.figures.tpm).toBe(6);
    expect(out.figures.fondoPesos).toBeUndefined();
  });

  it("keeps decimals — it does not round percentages", () => {
    const out = applyFinancingBands({ topeUsura: 125.12 });
    expect(out.figures.topeUsura).toBe(125.12);
  });
});
