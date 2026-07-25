import { describe, expect, it } from "vitest";
import {
  aggregateChairTiers,
  classifyChairCommentsLocally,
  normalizeChairName,
  parseChairClassifications,
} from "../../classes/chairs/analyze";
import type { ChairSourceComment } from "../../classes/chairs/types";

const comments: ChairSourceComment[] = [
  {
    commentId: "c1",
    postId: "p1",
    sourceType: "comment",
    parentId: null,
    depth: 0,
    postTitle: "Sillas para trabajar",
    body: "La Vigo 5K me resultó comodísima y el lumbar está muy bien.",
    score: 8,
    createdUtc: Date.parse("2026-06-01") / 1000,
    date: "2026-06-01",
    permalink: "https://reddit.com/c1",
    author: "uno",
  },
  {
    commentId: "c2",
    postId: "p1",
    sourceType: "comment",
    parentId: "c1",
    depth: 1,
    postTitle: "Sillas para trabajar",
    body: "Tengo una Vigo 5K hace dos años, buenos ajustes y sigue firme.",
    score: 4,
    createdUtc: Date.parse("2025-08-01") / 1000,
    date: "2025-08-01",
    permalink: "https://reddit.com/c2",
    author: "dos",
  },
  {
    commentId: "c3",
    postId: "p2",
    sourceType: "comment",
    parentId: null,
    depth: 0,
    postTitle: "Sillas para trabajar",
    body: "La Vigo 5K vale la pena, sobre todo para trabajar ocho horas.",
    score: 2,
    createdUtc: Date.parse("2024-08-01") / 1000,
    date: "2024-08-01",
    permalink: "https://reddit.com/c3",
    author: "tres",
  },
];

describe("chair sentiment analytics", () => {
  it("normalizes model names without generic chair words", () => {
    expect(normalizeChairName("Silla VIGO 5K")).toBe("vigo 5k");
  });

  it("rejects invented model names not present in the source comment", () => {
    const parsed = parseChairClassifications(
      JSON.stringify({
        results: [
          {
            commentId: "c1",
            mentions: [
              { name: "Vigo 5K", sentiment: 0.9, themes: ["comfort", "support"] },
              { name: "Herman Miller Aeron", sentiment: 1, themes: ["comfort"] },
            ],
          },
        ],
      }),
      new Map([[comments[0].commentId, comments[0]]])
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Vigo 5K");
  });

  it("keeps an exact-model fallback when Gemini quota is unavailable", () => {
    const local = classifyChairCommentsLocally(comments);
    expect(local).toHaveLength(3);
    expect(local.every((row) => row.name === "Vigo 5K")).toBe(true);
    expect(local[0].sentiment).toBeGreaterThan(0);
    expect(local[0].themes).toContain("comfort");
    expect(local[1].themes).toContain("durability");
  });

  it("computes tiers deterministically from comment-level evidence", () => {
    const result = aggregateChairTiers(
      comments,
      comments.map((comment, index) => ({
        commentId: comment.commentId,
        name: index === 0 ? "Vigo 5K" : "VIGO 5K",
        brand: "Vigo",
        model: "5K",
        sentiment: 0.8 - index * 0.1,
        themes: index === 0 ? ["comfort", "support"] : ["adjustability", "durability"],
      })),
      new Date("2026-07-25T00:00:00Z")
    );
    expect(result.watchlist).toHaveLength(0);
    expect(result.tiers).toHaveLength(1);
    expect(result.tiers[0].tier).toBe("A");
    expect(result.tiers[0].comments).toBe(3);
    expect(result.tiers[0].replies).toBe(1);
    expect(result.tiers[0].evidence).toHaveLength(3);
    expect(result.tiers[0].uniqueAuthors).toBe(3);
    expect(result.tiers[0].score).toBeGreaterThan(70);
  });
});
