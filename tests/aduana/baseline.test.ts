import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BASELINE, FACT_RANGES, OFFICIAL_HOSTS } from "../../classes/aduana/baseline";
import { BUCKET_IDS } from "../../classes/aduana/types";

/** Read a `export const NAME = 123` numeric constant straight out of the app's rules module. */
function appConstant(name: string): number {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "utils", "importRules.ts"),
    "utf8"
  );
  const m = new RegExp(`export const ${name} = (\\d+(?:\\.\\d+)?)`).exec(src);
  if (!m) throw new Error(`${name} not found in app/utils/importRules.ts`);
  return Number(m[1]);
}

const factValue = (id: string): number => {
  const f = BASELINE.facts.find((x) => x.id === id);
  if (!f) throw new Error(`baseline fact missing: ${id}`);
  return Number(f.value);
};

describe("aduana baseline", () => {
  // The bug we already shipped once: a rule on one page contradicting the same rule on another.
  it("never contradicts the calculator's verified rules", () => {
    expect(factValue("franquicia.tope_anual_usd")).toBe(appConstant("FRANCHISE_ANNUAL_USD"));
    expect(factValue("franquicia.max_envios")).toBe(appConstant("FRANCHISE_MAX_SHIPMENTS"));
    expect(factValue("franquicia.peso_max_kg")).toBe(appConstant("MAX_WEIGHT_KG"));
    expect(factValue("prestacion_unica.tasa_pct")).toBe(appConstant("SIMPLIFIED_RATE_PCT"));
    expect(factValue("prestacion_unica.minimo_usd")).toBe(appConstant("SIMPLIFIED_MIN_USD"));
    expect(factValue("tifa.exoneracion_usd")).toBe(appConstant("USA_IVA_EXEMPTION_USD"));
  });

  it("sources every fact to an official domain, with an article", () => {
    for (const f of BASELINE.facts) {
      const src = BASELINE.sources.find((s) => s.id === f.sourceId);
      expect(src, `fact ${f.id} has no source`).toBeDefined();
      const host = new URL(src!.url).hostname;
      expect(OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))).toBe(true);
      expect(f.origin).toBe("baseline");
    }
  });

  it("covers all twelve buckets, and no unverified entry claims a procedure", () => {
    expect(BASELINE.problems.map((p) => p.id).sort()).toEqual([...BUCKET_IDS].sort());
    for (const p of BASELINE.problems) {
      if (p.verified) expect(p.steps.length).toBeGreaterThan(0);
      else expect(p.steps).toEqual([]);
    }
  });

  it("gives every numeric fact a plausibility range for the AI gate", () => {
    for (const f of BASELINE.facts) {
      if (typeof f.value === "number") expect(FACT_RANGES[f.id]).toBeDefined();
    }
  });
});
