import { describe, expect, it } from "vitest";
import { aggregate } from "../../classes/aduana/classify";
import type { Quote } from "../../classes/aduana/types";

const q = (author: string, score: number): Quote => ({
  text: "me retuvieron el paquete tres semanas",
  author,
  date: "2026-05-01",
  score,
  permalink: "https://reddit.com/r/uruguay/comments/x",
});

describe("aggregate", () => {
  it("counts every confident label but quotes only the top-scoring ones", () => {
    const texts = new Map<string, Quote>([
      ["a", q("juan", 5)],
      ["b", q("ana", 90)],
      ["c", q("leo", 40)],
      ["d", q("sol", 10)],
    ]);
    const labels = ["a", "b", "c", "d"].map((key) => ({
      key,
      bucket: "retenido" as const,
      outcome: "sin-resolver" as const,
      lesson: "",
      confident: true,
    }));

    const out = aggregate(labels, texts);

    expect(out.counts.retenido).toBe(4);
    expect(out.quotes.retenido!.map((x) => x.author)).toEqual(["ana", "leo", "sol"]); // top 3 by score
  });

  it("never quotes a deleted author, and never counts an unconfident label", () => {
    const texts = new Map<string, Quote>([
      ["a", q("[deleted]", 500)],
      ["b", q("ana", 3)],
      ["c", q("leo", 400)],
    ]);
    const labels = [
      { key: "a", bucket: "retenido" as const, outcome: "perdio" as const, lesson: "", confident: true },
      { key: "b", bucket: "retenido" as const, outcome: "perdio" as const, lesson: "", confident: true },
      { key: "c", bucket: "retenido" as const, outcome: "perdio" as const, lesson: "", confident: false },
    ];

    const out = aggregate(labels, texts);

    expect(out.counts.retenido).toBe(1); // only 'b' — 'c' is unconfident, 'a' is unquotable
    expect(out.quotes.retenido!.map((x) => x.author)).toEqual(["ana"]);
  });

  it("returns nothing for a bucket nobody talked about", () => {
    expect(aggregate([], new Map()).quotes.decomiso).toBeUndefined();
  });
});
