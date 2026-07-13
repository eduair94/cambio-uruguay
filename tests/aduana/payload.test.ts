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
});
