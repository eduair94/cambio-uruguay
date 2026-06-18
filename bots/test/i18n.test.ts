import { describe, expect, it } from "vitest";
import { fmtNum, fmtPct, fmtUYU, L, normalizeLang } from "../src/format/i18n.js";

describe("normalizeLang", () => {
  it("maps locale variants to base languages", () => {
    expect(normalizeLang("en-US")).toBe("en");
    expect(normalizeLang("pt-BR")).toBe("pt");
    expect(normalizeLang("es")).toBe("es");
  });
  it("falls back to es for unknown/empty", () => {
    expect(normalizeLang("xx")).toBe("es");
    expect(normalizeLang(undefined)).toBe("es");
  });
});

describe("formatting", () => {
  it("formats UYU with es decimal comma", () => {
    expect(fmtUYU(40.5, "es")).toContain("40,50");
  });
  it("formats plain numbers per locale", () => {
    expect(fmtNum(1234.5, "es")).toContain("1.234,5");
  });
  it("formats signed percentages", () => {
    expect(fmtPct(1.234)).toBe("+1,23%");
    expect(fmtPct(-0.5)).toBe("-0,50%");
    expect(fmtPct(0)).toBe("0,00%");
  });
});

describe("labels", () => {
  it("provides a label set per language", () => {
    expect(L("es").buy.length).toBeGreaterThan(0);
    expect(L("en").buy).not.toBe(L("es").buy);
    expect(L("pt").news.length).toBeGreaterThan(0);
  });
});
