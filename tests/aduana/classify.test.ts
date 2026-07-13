import { describe, expect, it } from "vitest";
import { aggregate } from "../../classes/aduana/classify";
import type { Quote } from "../../classes/aduana/types";

const q = (author: string, score: number): Quote => ({
  text: "me retuvieron el paquete en la aduana durante tres semanas sin ninguna explicación",
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
    expect(aggregate([], new Map()).quotes["decomiso-subasta"]).toBeUndefined();
  });

  it("counts a short quote but does not quote it", () => {
    // Text shorter than 60 chars
    const shortText = "mismo problema con DHL";
    const texts = new Map<string, Quote>([
      ["a", { text: shortText, author: "test", date: "2026-05-01", score: 100, permalink: "x" }],
    ]);
    const labels = [{ key: "a", bucket: "retenido" as const, outcome: "sin-resolver" as const, lesson: "", confident: true }];

    const out = aggregate(labels, texts);

    expect(out.counts.retenido).toBe(1); // counted
    expect(out.quotes.retenido).toEqual([]); // not quoted (filtered out but bucket created)
  });

  it("trims a long quote without cutting mid-word", () => {
    // Create a long quote (>420 chars)
    const longText = "This is a very long quote that definitely exceeds the maximum allowed length. " +
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt " +
      "ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco " +
      "laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in " +
      "voluptate velit esse cillum dolore eu fugiat nulla pariatur. Extra text to ensure we exceed " +
      "the 420 character limit after whitespace normalization and to ensure proper trimming.";

    const texts = new Map<string, Quote>([
      ["a", { text: longText, author: "test", date: "2026-05-01", score: 100, permalink: "x" }],
    ]);
    const labels = [{ key: "a", bucket: "retenido" as const, outcome: "sin-resolver" as const, lesson: "", confident: true }];

    const out = aggregate(labels, texts);

    const quote = out.quotes.retenido?.[0];
    expect(quote).toBeDefined();
    expect(quote!.text.length).toBeLessThan(longText.length);
    expect(quote!.text.endsWith("…")).toBe(true);
    // The character before … should not be a space
    expect(quote!.text[quote!.text.length - 2]).not.toBe(" ");
    // The trimmed text (without …) should be a prefix of the original
    expect(longText.startsWith(quote!.text.slice(0, -1))).toBe(true);
  });
});
