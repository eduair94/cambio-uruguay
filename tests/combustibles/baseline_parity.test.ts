// La app hornea las mismas 24 vigencias en app/server/utils/combustiblesFallback.ts para que la
// página nunca quede en blanco. Misma técnica que tests/figures/baseline_parity.test.ts: leer el
// archivo del app como texto, sin build cruzado.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BASELINE_FUEL_ROWS } from "../../classes/combustibles/baseline";

const FALLBACK = path.join(__dirname, "..", "..", "app", "server", "utils", "combustiblesFallback.ts");

describe("combustibles baseline parity", () => {
  it("la última vigencia horneada es la misma en backend y app", () => {
    const src = fs.readFileSync(FALLBACK, "utf8");
    const last = BASELINE_FUEL_ROWS[BASELINE_FUEL_ROWS.length - 1];
    expect(src).toContain(`from: '${last.from}'`);
    expect(src).toContain(`super95: ${last.super95}`);
    expect(src).toContain(`supergas: ${last.supergas}`);
    expect((src.match(/from: '20\d\d-\d\d-\d\d'/g) ?? []).length).toBe(BASELINE_FUEL_ROWS.length);
  });
});
