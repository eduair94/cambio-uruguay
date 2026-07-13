// IMPORTANT 2: classes/figures/bands.ts's BASELINE and app/server/utils/uyFiguresFallback.ts's
// UY_FIGURES_FALLBACK carry the same four numbers (salarioMinimo, bpc, boletoStm, inflacionAnual)
// by hand, with nothing to catch them drifting apart. If the salario mínimo changes and only one
// copy gets updated, /salud-financiera shows a different number depending on whether the backend
// is reachable. Same technique as tests/debt/caps.test.ts's sibling parity checks
// (tests/aduana/baseline.test.ts, tests/banks/entities.test.ts, tests/loans/catalog.test.ts):
// read the app's copy straight out of its source file so this test needs no build step across the
// two packages.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BASELINE_FIGURES } from "../../classes/figures/bands";

const FALLBACK_PATH = path.join(__dirname, "..", "..", "app", "server", "utils", "uyFiguresFallback.ts");

/** Read a `key: 123,` numeric field straight out of the app's unreachable-backend fallback copy. */
function appFallbackConstant(name: string): number {
  const src = fs.readFileSync(FALLBACK_PATH, "utf8");
  const m = new RegExp(`\\b${name}:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(src);
  if (!m) throw new Error(`${name} not found in app/server/utils/uyFiguresFallback.ts`);
  return Number(m[1]);
}

describe("figures baseline parity", () => {
  it("never diverges from the app's unreachable-backend fallback copy", () => {
    expect(BASELINE_FIGURES.salarioMinimo).toBe(appFallbackConstant("salarioMinimo"));
    expect(BASELINE_FIGURES.bpc).toBe(appFallbackConstant("bpc"));
    expect(BASELINE_FIGURES.boletoStm).toBe(appFallbackConstant("boletoStm"));
    expect(BASELINE_FIGURES.inflacionAnual).toBe(appFallbackConstant("inflacionAnual"));
  });
});
