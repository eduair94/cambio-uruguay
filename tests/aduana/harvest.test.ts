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

import { ADUANA_QUERIES, ADUANA_SUBS, harvestAduana } from "../../classes/aduana/harvest";

const warnedWith = (needle: string): boolean =>
  vi.mocked(console.warn).mock.calls.some((args) =>
    args.some((a) => typeof a === "string" && a.includes(needle))
  );

describe("harvestAduana", () => {
  beforeEach(() => {
    upserted.length = 0;
    searchPosts.mockReset();
    fetchComments.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("searches every query in every sub and dedupes a thread surfaced more than once", async () => {
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

    expect(searchPosts).toHaveBeenCalledTimes(ADUANA_QUERIES.length * ADUANA_SUBS.length);
    expect(out.posts).toBe(1); // surfaced by N queries × M subs, stored once
    expect(upserted).toHaveLength(1);
    // Pin the argument order. The plan this was written from had the client's signature wrong
    // (`searchSubreddit`, and a 2-arg fetchComments) — a mock that agrees with the plan instead of
    // with the module passes green and throws on the first real run. This assertion is what makes
    // that impossible: the ids already in Mongo must reach Reddit's paginator, or nothing dedupes.
    expect(fetchComments).toHaveBeenCalledWith("uruguay", "abc", expect.any(Set));
  });

  // The comment tree must be requested from the thread's OWN sub. Reddit answers /comments for any
  // sub name, so a hardcoded "uruguay" here would look green and silently store r/AskUruguayan
  // permalinks pointing at r/uruguay.
  it("fetches each thread's comments from the sub the thread actually lives in", async () => {
    const post = {
      id: "zzz",
      sub: "AskUruguayan",
      title: "¿me van a retener el paquete?",
      selftext: "",
      author: "u2",
      score: 3,
      numComments: 4,
      permalink: "https://reddit.com/y",
      createdUtc: 1700000000,
      url: "",
    };
    searchPosts.mockResolvedValue([post]);
    fetchComments.mockResolvedValue([]);

    await harvestAduana();

    expect(fetchComments).toHaveBeenCalledWith("AskUruguayan", "zzz", expect.any(Set));
  });

  it("accepts a bounded supplemental query set for historical audits", async () => {
    searchPosts.mockResolvedValue([]);
    await harvestAduana({ window: "all", queries: ["semillas aduana", "equipaje aduana"] });

    // One call per (query × sub), queries in the outer loop.
    expect(searchPosts).toHaveBeenCalledTimes(2 * ADUANA_SUBS.length);
    expect(searchPosts).toHaveBeenNthCalledWith(1, ADUANA_SUBS[0], "semillas aduana", {
      t: "all",
      sort: "new",
    });
    expect(searchPosts).toHaveBeenNthCalledWith(2, ADUANA_SUBS[1], "semillas aduana", {
      t: "all",
      sort: "new",
    });
    expect(searchPosts).toHaveBeenLastCalledWith(
      ADUANA_SUBS[ADUANA_SUBS.length - 1],
      "equipaje aduana",
      { t: "all", sort: "new" }
    );
  });

  // It is a no-op without credentials — but NOT a silent one (same contract as
  // gemini.ts#geminiConfigured): before this fix, `threads=0` in the weekly sync summary read
  // identically for "ran the search and genuinely found nothing new" and "never even tried
  // because Reddit isn't configured", and only a human can tell those apart from a log line.
  it("is a no-op without credentials, and it warns instead of staying silent", async () => {
    // vi.resetModules() is required here: without it, the dynamic import below returns the same
    // module instance the top-level static import already cached (bound to the first vi.mock),
    // so redditConfigured() would keep answering `true` and this test would exercise the wrong
    // mock instead of the no-credentials path it's named for.
    vi.resetModules();
    vi.doMock("../../classes/reddit", () => ({ redditConfigured: () => false }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { harvestAduana: h } = await import("../../classes/aduana/harvest");
    await expect(h()).resolves.toEqual({ posts: 0, comments: 0 });
    expect(warnedWith("Reddit")).toBe(true);
  });
});
