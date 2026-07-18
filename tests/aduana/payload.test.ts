import { describe, expect, it } from "vitest";
import { BASELINE } from "../../classes/aduana/baseline";
import { buildAduanaPayload } from "../../classes/aduana/payload";

describe("buildAduanaPayload", () => {
  it("joins each problem with its quotes and its report count", () => {
    const doc = {
      ...BASELINE,
      quotes: { retenido: [{ text: "x".repeat(80), author: "ana", date: "2026-05-01", score: 9, permalink: "https://reddit.com/x" }] },
      counts: { retenido: 12 },
      updatedAt: new Date().toISOString(),
    };

    const out = buildAduanaPayload(doc);
    const retenido = out.problems.find((p) => p.id === "retenido")!;

    expect(retenido.quotes).toHaveLength(1);
    expect(retenido.reports).toBe(12);
    expect(out.stale).toBe(false);
  });

  it("marks a payload stale when the last sync is over two weeks old, and never drops a problem", () => {
    const old = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString();
    const out = buildAduanaPayload({ ...BASELINE, updatedAt: old });

    expect(out.stale).toBe(true);
    expect(out.problems).toHaveLength(12); // a problem with no Reddit evidence still ships its norm
    expect(out.problems.every((p) => Array.isArray(p.quotes))).toBe(true);
  });

  it("passes pendingReview through untouched, so a disputed fact is not silently dropped", () => {
    const doc = { ...BASELINE, pendingReview: ["franquicia.tope_anual_usd"] };
    const out = buildAduanaPayload(doc);

    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]);
  });

  it("badges an auto-published fact with its machine-update metadata", () => {
    const id = "franquicia.registro_vendedor_desde";
    const doc = {
      ...BASELINE,
      // buildAduanaPayload receives the MERGED doc: the fact already carries the override value.
      facts: BASELINE.facts.map((f) => (f.id === id ? { ...f, value: "2027-01-01", origin: "ai" as const } : f)),
      overrides: [
        { id, value: "2027-01-01", publishedAt: "2026-09-30", basedOnValue: "2026-10-01", sources: ["u1", "u2"], prevValue: "2026-10-01" },
      ],
    };
    const out = buildAduanaPayload(doc);
    const fact = out.facts.find((f) => f.id === id)!;
    expect(fact.autoPublished).toBe(true);
    expect(fact.publishedAt).toBe("2026-09-30");
    expect(fact.prevValue).toBe("2026-10-01");
    expect(fact.overrideSources).toEqual(["u1", "u2"]);
    // a fact WITHOUT an override carries none of that metadata
    expect(out.facts.find((f) => f.id === "franquicia.tope_anual_usd")!.autoPublished).toBeUndefined();
  });
});
