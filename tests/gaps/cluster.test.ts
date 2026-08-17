import { describe, expect, it } from "vitest";
import { clusterGaps, draftable } from "../../classes/gaps/cluster";
import { normalise, vectorToBuffer } from "../../classes/rag/embed";
import type { RedditContentGapDoc } from "../../classes/models/RedditContentGap";

/** Place each question on a named axis so "same topic" is expressible without real embeddings. */
const on = (axis: number, jitter = 0): Float32Array => {
  const v = new Float32Array(4);
  v[axis] = 1;
  v[(axis + 1) % 4] = jitter;
  return normalise(v);
};

const gap = (postId: string, axis: number, over: Partial<RedditContentGapDoc> = {}, jitter = 0): RedditContentGapDoc =>
  ({
    postId,
    sub: "uruguay",
    title: `pregunta ${postId}`,
    text: "",
    permalink: `https://reddit.com/${postId}`,
    createdUtc: 1_700_000_000,
    bestPath: "",
    bestScore: 0,
    embedding: vectorToBuffer(on(axis, jitter)),
    dims: 4,
    clusterId: "",
    clusterLabel: "",
    draftPath: "",
    draftedAt: null,
    ...over,
  }) as RedditContentGapDoc;

describe("gaps/cluster", () => {
  it("groups the same question asked several ways", () => {
    const clusters = clusterGaps([gap("a", 0), gap("b", 0, {}, 0.1), gap("c", 0, {}, 0.2)]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.members).toHaveLength(3);
  });

  it("keeps different questions apart", () => {
    const clusters = clusterGaps([gap("a", 0), gap("b", 1), gap("c", 2)]);
    expect(clusters).toHaveLength(3);
  });

  it("gives a cluster the same id regardless of the order the rows arrived in", () => {
    const one = clusterGaps([gap("a", 0), gap("b", 0, {}, 0.1)]);
    const two = clusterGaps([gap("b", 0, {}, 0.1), gap("a", 0)]);
    expect(one[0]!.id).toBe(two[0]!.id);
  });

  it("sorts by demand, so the biggest gap is looked at first", () => {
    const clusters = clusterGaps([gap("a", 0), gap("b", 0, {}, 0.1), gap("c", 1)]);
    expect(clusters[0]!.members.length).toBeGreaterThanOrEqual(clusters[1]!.members.length);
  });

  it("reports the distinct subreddits the demand came from", () => {
    const clusters = clusterGaps([gap("a", 0, { sub: "uruguay" }), gap("b", 0, { sub: "Burises" }, 0.1)]);
    expect(clusters[0]!.subs.sort()).toEqual(["Burises", "uruguay"]);
  });

  it("ignores rows with no embedding rather than throwing", () => {
    const broken = { ...gap("z", 0), embedding: undefined } as unknown as RedditContentGapDoc;
    expect(() => clusterGaps([gap("a", 0), broken])).not.toThrow();
    expect(clusterGaps([gap("a", 0), broken])[0]!.members).toHaveLength(1);
  });
});

describe("gaps/cluster — draftable", () => {
  const four = [gap("a", 0), gap("b", 0, {}, 0.05), gap("c", 0, {}, 0.1), gap("d", 0, {}, 0.15)];

  it("waits for real demand before spending a research call", () => {
    expect(draftable(clusterGaps(four.slice(0, 3)))).toHaveLength(0);
    expect(draftable(clusterGaps(four))).toHaveLength(1);
  });

  it("never drafts the same cluster twice", () => {
    const drafted = [...four.slice(0, 3), gap("d", 0, { draftedAt: new Date() }, 0.15)];
    expect(draftable(clusterGaps(drafted))).toHaveLength(0);
  });
});
