// How one run's embedding allowance is divided up.
//
// The constraint is real and measured against the live API on 2026-08-17: the Gemini embedding
// endpoint meters PER DAY — `EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier`, limit
// 1 000 — and every item inside a batch counts as one request. The corpus is ~3 400 embeddable
// chunks, so the first build cannot finish in a day on the free tier, and the two ways to get that
// wrong are (a) spending the allowance on templated stubs before reaching a single guide, and
// (b) hammering the quota and losing the rest of each run to 429s.
import { describe, expect, it } from "vitest";
import { planEmbedding } from "../../classes/rag/store";

const chunk = (tier: "full" | "stub", id: number) => ({ tier, id });
const full = (n: number, from = 0) => Array.from({ length: n }, (_v, i) => chunk("full", from + i));
const stub = (n: number, from = 100) => Array.from({ length: n }, (_v, i) => chunk("stub", from + i));

describe("rag/store — planEmbedding", () => {
  it("never spends an embedding on a stub", () => {
    const plan = planEmbedding(stub(50), { remaining: 1000 });
    expect(plan.toEmbed).toHaveLength(0);
    expect(plan.lexicalOnly).toHaveLength(50);
    expect(plan.deferred).toHaveLength(0);
  });

  it("embeds every full-text chunk when the budget allows", () => {
    const plan = planEmbedding([...full(10), ...stub(5)], { remaining: 1000 });
    expect(plan.toEmbed).toHaveLength(10);
    expect(plan.lexicalOnly).toHaveLength(5);
    expect(plan.deferred).toHaveLength(0);
  });

  it("defers the overflow instead of dropping it", () => {
    const plan = planEmbedding(full(30), { remaining: 12 });
    expect(plan.toEmbed).toHaveLength(12);
    expect(plan.deferred).toHaveLength(18);
    // Nothing vanishes: everything is in exactly one bucket.
    expect(plan.toEmbed.length + plan.deferred.length).toBe(30);
  });

  it("still writes the stubs when the embedding budget is exhausted", () => {
    // A page's templated title costs nothing, so an empty wallet must not stop it being indexed.
    const plan = planEmbedding([...full(5), ...stub(5)], { remaining: 0 });
    expect(plan.toEmbed).toHaveLength(0);
    expect(plan.deferred).toHaveLength(5);
    expect(plan.lexicalOnly).toHaveLength(5);
  });

  it("treats a negative budget as zero rather than slicing backwards", () => {
    const plan = planEmbedding(full(5), { remaining: -3 });
    expect(plan.toEmbed).toHaveLength(0);
    expect(plan.deferred).toHaveLength(5);
  });

  it("embeds everything when no budget is imposed", () => {
    const plan = planEmbedding(full(5000));
    expect(plan.toEmbed).toHaveLength(5000);
    expect(plan.deferred).toHaveLength(0);
  });

  it("keeps the caller's order, so a partial build is a prefix and not a random sample", () => {
    const plan = planEmbedding(full(10), { remaining: 3 });
    expect(plan.toEmbed.map((c) => c.id)).toEqual([0, 1, 2]);
    expect(plan.deferred.map((c) => c.id)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });
});
