import { beforeEach, describe, expect, it, vi } from "vitest";

// classes/reddit.ts's real exports are `searchPosts(sub, query, opts)` and
// `fetchComments(sub, postId, known)` (verified against tests/couriers/reddit.test.ts, the
// suite that ported it) — not the `searchSubreddit(sub, q, opts)` / `fetchComments(postId, known)`
// names/arity a draft of this task assumed. Mocked here under their real names so the harvester
// under test imports functions that actually exist on the module in production, not just in this
// test's mock.
const searchPosts = vi.fn();
const fetchComments = vi.fn();
vi.mock("../../classes/reddit", () => ({
  redditConfigured: () => true,
  searchPosts: (...a: unknown[]) => searchPosts(...a),
  fetchComments: (...a: unknown[]) => fetchComments(...a),
}));

const upserted: unknown[] = [];
vi.mock("../../classes/aduana/corpus", () => ({
  upsertPosts: (rows: unknown[]) => {
    upserted.push(...rows);
    return Promise.resolve(rows.length);
  },
  upsertComments: (_postId: string, rows: unknown[]) => Promise.resolve(rows.length),
  knownCommentIds: () => Promise.resolve(new Set<string>()),
}));

import { ADUANA_QUERIES, harvestAduana } from "../../classes/aduana/harvest";

describe("harvestAduana", () => {
  beforeEach(() => {
    upserted.length = 0;
    searchPosts.mockReset();
    fetchComments.mockReset();
  });

  it("searches every query and dedupes a thread surfaced by two of them", async () => {
    const post = {
      id: "abc",
      sub: "uruguay",
      title: "paquete retenido",
      selftext: "",
      author: "u1",
      score: 5,
      numComments: 2,
      permalink: "https://reddit.com/x",
      createdUtc: 1700000000,
      url: "",
    };
    searchPosts.mockResolvedValue([post]);
    fetchComments.mockResolvedValue([]);

    const out = await harvestAduana();

    expect(searchPosts).toHaveBeenCalledTimes(ADUANA_QUERIES.length);
    expect(out.posts).toBe(1); // surfaced by N queries, stored once
    expect(upserted).toHaveLength(1);
  });

  it("is a silent no-op without credentials", async () => {
    // vi.resetModules() is required here: without it, the dynamic import below returns the same
    // module instance the top-level static import already cached (bound to the first vi.mock),
    // so redditConfigured() would keep answering `true` and this test would exercise the wrong
    // mock instead of the no-credentials path it's named for.
    vi.resetModules();
    vi.doMock("../../classes/reddit", () => ({ redditConfigured: () => false }));
    const { harvestAduana: h } = await import("../../classes/aduana/harvest");
    await expect(h()).resolves.toEqual({ posts: 0, comments: 0 });
  });
});
