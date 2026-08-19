import { describe, expect, it } from "vitest";
import { carryForward, diffPatches, evaluateRun } from "../../classes/loantiers/merge";
import type { LoanLenderSeed } from "../../classes/loantiers/catalog";
import type { LenderFactPatch, LoanTierSnapshot } from "../../classes/loantiers/types";

const LENDERS: LoanLenderSeed[] = Array.from({ length: 10 }, (_, i) => ({
  id: `l${i}`,
  name: `Lender ${i}`,
  website: `https://l${i}.com.uy`,
  sourceUrl: `https://l${i}.com.uy/prestamos`,
}));

const patchesFor = (n: number, over: Partial<LenderFactPatch> = {}): LenderFactPatch[] =>
  LENDERS.slice(0, n).map((l) => ({ id: l.id, teaPct: 50, clearing: "no" as const, ...over }));

function snapshot(patches: LenderFactPatch[]): LoanTierSnapshot {
  return {
    key: "uy-personal-loans",
    asOf: "2026-08-10T00:00:00.000Z",
    model: "claude-agent-api",
    patches,
    changes: [],
    verified: patches.length,
    total: LENDERS.length,
  };
}

describe("diffPatches", () => {
  it("reports a rate move in words a reader understands", () => {
    const changes = diffPatches(patchesFor(1), patchesFor(1, { teaPct: 62 }), LENDERS);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.text).toContain("50% → 62%");
  });

  it("reports a lender that stopped publishing its rate", () => {
    const changes = diffPatches(patchesFor(1), [{ id: "l0", teaPct: null }], LENDERS);
    expect(changes[0]!.text).toContain("dejó de publicarla");
  });

  it("says nothing about a field the run had no opinion on", () => {
    expect(diffPatches(patchesFor(1), [{ id: "l0" }], LENDERS)).toEqual([]);
  });

  it("does not report a lender we are seeing for the first time", () => {
    // Nothing to compare against is not a change; reporting it would fill the first run's
    // "qué cambió" strip with the whole catalogue.
    expect(diffPatches([], patchesFor(3), LENDERS)).toEqual([]);
  });

  it("surfaces a clearing-policy flip, the change that matters most", () => {
    const changes = diffPatches(patchesFor(1), patchesFor(1, { clearing: "si" }), LENDERS);
    expect(changes[0]!.text).toContain("clearing");
  });
});

describe("evaluateRun", () => {
  it("accepts a first run with no previous snapshot", () => {
    expect(evaluateRun(null, patchesFor(4), LENDERS).accept).toBe(true);
  });

  it("refuses an empty run", () => {
    const decision = evaluateRun(snapshot(patchesFor(8)), [], LENDERS);
    expect(decision.accept).toBe(false);
    expect(decision.reason).toContain("ningún prestamista");
  });

  it("refuses a thin pull that would replace a fuller snapshot", () => {
    // The saturated-endpoint failure: three lenders verified, seven silently reverted.
    const decision = evaluateRun(snapshot(patchesFor(8)), patchesFor(3), LENDERS);
    expect(decision.accept).toBe(false);
    expect(decision.reason).toContain("no se pisa");
  });

  it("accepts a full run even when the previous one was fuller still", () => {
    const decision = evaluateRun(snapshot(patchesFor(10)), patchesFor(8), LENDERS);
    expect(decision.accept).toBe(true);
  });

  it("refuses a run where most fichas changed at once", () => {
    const previous = snapshot(patchesFor(10));
    const wild = patchesFor(10, { teaPct: 99, clearing: "si", clearingNote: "x" });
    const decision = evaluateRun(previous, wild, LENDERS);
    expect(decision.accept).toBe(false);
    expect(decision.reason).toContain("no es novedad");
  });

  it("accepts an ordinary week where one or two lenders moved", () => {
    const previous = snapshot(patchesFor(10));
    const next = patchesFor(10);
    next[0] = { ...next[0]!, teaPct: 58 };
    const decision = evaluateRun(previous, next, LENDERS);
    expect(decision.accept).toBe(true);
    expect(decision.changes).toHaveLength(1);
  });
});

describe("carryForward", () => {
  it("keeps last week's facts for a lender this run could not re-verify", () => {
    const previous = patchesFor(10);
    const fresh = patchesFor(2, { teaPct: 44 });
    const merged = carryForward(previous, fresh);
    expect(merged).toHaveLength(10);
    expect(merged.find((p) => p.id === "l0")!.teaPct).toBe(44);
    expect(merged.find((p) => p.id === "l9")!.teaPct).toBe(50);
  });

  it("never duplicates a lender", () => {
    const merged = carryForward(patchesFor(5), patchesFor(5));
    expect(new Set(merged.map((p) => p.id)).size).toBe(merged.length);
  });
});
