import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  BASELINE,
  DENYLIST_URLS,
  FACT_DATE_RANGES,
  FACT_RANGES,
  OFFICIAL_HOSTS,
} from "../../classes/aduana/baseline";
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

/** Read a `export const NAME = '...'` string constant from the app's rules module. */
function appStringConstant(name: string): string {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "utils", "importRules.ts"),
    "utf8"
  );
  const m = new RegExp(`export const ${name} = '([^']+)'`).exec(src);
  if (!m) throw new Error(`${name} not found in app/utils/importRules.ts`);
  return m[1];
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
      expect(f.article, `fact ${f.id} has no article`).toBeTruthy();
      expect(f.verifiedAt, `fact ${f.id} has no verifiedAt`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
      if (typeof f.value === "number") {
        const r = FACT_RANGES[f.id];
        expect(r, `no range for ${f.id}`).toBeDefined();
        expect(f.value).toBeGreaterThanOrEqual(r[0]);
        expect(f.value).toBeLessThanOrEqual(r[1]);
      }
    }
  });

  // A range on a non-numeric fact is how the "2 DUA por año" hole was open: an unsourced DNA
  // assertion carrying a plausibility range looks, to the AI gate, exactly like a fact the gate can
  // validate — so the AI could re-number it freely, with nothing to check it against. Keeping the
  // range set free of orphans is what holds that door shut.
  it("has no orphan ranges — a range implies a numeric fact", () => {
    const numericIds = new Set(
      BASELINE.facts.filter(f => typeof f.value === "number").map(f => f.id)
    );
    expect(Object.keys(FACT_RANGES).filter(k => !numericIds.has(k))).toEqual([]);
  });

  it("does not pass vacuously — has a substantial number of facts", () => {
    expect(BASELINE.facts.length).toBeGreaterThan(40);
  });

  // The October datum: it must be a first-class, watchable fact, and it must never silently drift
  // from the calculator's constant (the whole reason importRules.ts and this baseline are drift-guarded).
  it("carries the Oct seller-registry date as a string fact, matching the app constant", () => {
    const f = BASELINE.facts.find((x) => x.id === "registro_vendedor.exigible_desde");
    expect(f, "date fact missing").toBeDefined();
    expect(typeof f!.value).toBe("string");
    expect(f!.value as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(f!.value).toBe(appStringConstant("SELLER_REGISTRY_ENFORCED_FROM"));
  });

  it("gives the date fact a plausibility window, not a numeric range", () => {
    expect(FACT_DATE_RANGES["registro_vendedor.exigible_desde"]).toEqual([
      "2026-07-01",
      "2027-12-31",
    ]);
    expect(FACT_RANGES["registro_vendedor.exigible_desde"]).toBeUndefined();
  });

  it("denylists the repealed-numbers page", () => {
    expect(DENYLIST_URLS.some((u) => u.includes("/v/27950"))).toBe(true);
  });

  it("initialises overrides as an empty array", () => {
    expect(BASELINE.overrides).toEqual([]);
  });

  // The "verificado contra la norma" badge must never be driven by a magic-string check on a
  // fact's `article` text (the bug: `article?.startsWith('página v/')` happened to match only the
  // two existing DNA-only facts — add a 53rd fact sourced to a DNA/MEF/URSEC page with an
  // article like "num. 3" and the old check would silently badge it as statute). The page now
  // keys the badge off the SOURCE's `kind`, so every source must carry one, and every fact whose
  // source is `pagina-oficial` is badgeable purely because of that — regardless of its `article`.
  it("gives every source a kind, and every pagina-oficial-sourced fact is badgeable by construction", () => {
    for (const s of BASELINE.sources) {
      expect(["norma", "pagina-oficial"], `source ${s.id} has no kind`).toContain(s.kind);
    }

    const sourceById = new Map(BASELINE.sources.map((s) => [s.id, s]));
    const isBadgeable = (f: (typeof BASELINE.facts)[number]) =>
      sourceById.get(f.sourceId)?.kind === "pagina-oficial";

    // The two facts the badge was written to protect against dressing as statute.
    for (const id of ["general.dua_por_persona_por_anio", "despachante.dna_lo_exige_sobre_800"]) {
      const f = BASELINE.facts.find((x) => x.id === id)!;
      expect(f, `fact ${id} missing`).toBeDefined();
      expect(isBadgeable(f)).toBe(true);
    }

    // Regression for the exact scenario the reviewer described: a fact sourced to a
    // pagina-oficial source with a statute-shaped article ("num. 3") must still badge — the old
    // `article?.startsWith('página v/')` check would have missed it, since "num. 3" doesn't start
    // with that prefix. The new mechanism only looks at the source, so this passes regardless of
    // what the article text says.
    const syntheticFact = {
      ...BASELINE.facts.find((f) => f.sourceId === "dna-regimen-general")!,
      article: "num. 3",
    };
    expect(isBadgeable(syntheticFact)).toBe(true);

    // And the inverse must hold too: a norma-sourced fact is never badgeable, however its
    // article reads.
    const normaFact = BASELINE.facts.find((f) => f.id === "franquicia.tope_anual_usd")!;
    expect(sourceById.get(normaFact.sourceId)!.kind).toBe("norma");
    expect(isBadgeable(normaFact)).toBe(false);
  });
});
