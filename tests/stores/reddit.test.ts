// Task 4: Reddit mentions (Arctic Shift). `mentionMatches`/`summarizeMentions` are pure and tested
// directly; `fetchRedditMentions` is exercised by stubbing global `fetch` (see tests/stores/age.test.ts
// and tests/stores/google.test.ts for the same convention) — never a real network call, and the
// retry/pacing delays are read from env knobs so a retry scenario doesn't burn tens of real seconds.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE_BY_KEY } from "../../classes/stores/registry";
import { mentionMatches, summarizeMentions, type RedditMention } from "../../classes/stores/signals/reddit";

describe("mentionMatches", () => {
  it("divino: matches an actual store mention", () => {
    const divino = STORE_BY_KEY.get("divino")!;
    expect(mentionMatches(divino, "compré el placard en Divino y llegó roto")).toBe(true);
  });

  it("divino: does not match the adjective 'divino' used on its own", () => {
    const divino = STORE_BY_KEY.get("divino")!;
    expect(mentionMatches(divino, "juventud divino tesoro")).toBe(false);
  });

  it("tushop: matches a plain mention (no redditMatch needed)", () => {
    const tushop = STORE_BY_KEY.get("tushop")!;
    expect(mentionMatches(tushop, "pedí en tushop")).toBe(true);
  });

  it("compares over normalized text: accents don't block a match", () => {
    const estacionHogar = STORE_BY_KEY.get("estacion-hogar")!;
    expect(mentionMatches(estacionHogar, "Compré en Estación Hogar la semana pasada")).toBe(true);
    expect(mentionMatches(estacionHogar, "Compré en Estacion Hogar la semana pasada")).toBe(true);
  });

  it("never matches a term that is not present at all", () => {
    const divino = STORE_BY_KEY.get("divino")!;
    expect(mentionMatches(divino, "fui a comprar al supermercado de siempre")).toBe(false);
  });

  it("never matches on an empty redditTerms list", () => {
    expect(mentionMatches({ redditTerms: [] }, "divino tienda de muebles")).toBe(false);
  });
});

function mention(overrides: Partial<RedditMention>): RedditMention {
  return {
    id: "abc123",
    kind: "post",
    createdUtc: Math.floor(Date.parse("2026-03-01T00:00:00Z") / 1000),
    threadId: "abc123",
    title: "Un hilo cualquiera",
    permalink: "/r/uruguay/comments/abc123/un_hilo_cualquiera/",
    score: 1,
    text: "un hilo cualquiera",
    ...overrides,
  };
}

describe("summarizeMentions", () => {
  it("counts mentions by the UTC year of createdUtc", () => {
    const mentions = [
      mention({ id: "a", createdUtc: Math.floor(Date.parse("2024-06-01T00:00:00Z") / 1000) }),
      mention({ id: "b", createdUtc: Math.floor(Date.parse("2025-01-15T23:59:59Z") / 1000) }),
      mention({ id: "c", createdUtc: Math.floor(Date.parse("2025-12-31T23:59:59Z") / 1000) }),
    ];
    const signal = summarizeMentions(mentions, "2026-09-16T00:00:00.000Z");
    expect(signal.byYear).toEqual({ "2024": 1, "2025": 2 });
    expect(signal.mentions).toBe(3);
  });

  it("threads only lists posts, never comments", () => {
    const mentions = [
      mention({ id: "post1", kind: "post", title: "Un hilo sobre la tienda", score: 5 }),
      mention({ id: "comment1", kind: "comment", title: null, score: 99, text: "un comentario cualquiera" }),
    ];
    const signal = summarizeMentions(mentions, "2026-09-16T00:00:00.000Z");
    expect(signal.threads).toHaveLength(1);
    expect(signal.threads[0]!.title).toBe("Un hilo sobre la tienda");
  });

  it("orders threads by score desc, then by date desc, capped at 5", () => {
    const mentions = [
      mention({ id: "p1", title: "Bajo score, reciente", score: 1, createdUtc: Math.floor(Date.parse("2026-01-01T00:00:00Z") / 1000) }),
      mention({ id: "p2", title: "Alto score", score: 10, createdUtc: Math.floor(Date.parse("2020-01-01T00:00:00Z") / 1000) }),
      mention({ id: "p3", title: "Mismo score, más nuevo", score: 5, createdUtc: Math.floor(Date.parse("2025-01-01T00:00:00Z") / 1000) }),
      mention({ id: "p4", title: "Mismo score, más viejo", score: 5, createdUtc: Math.floor(Date.parse("2021-01-01T00:00:00Z") / 1000) }),
      mention({ id: "p5", title: "Quinto", score: 3, createdUtc: Math.floor(Date.parse("2022-01-01T00:00:00Z") / 1000) }),
      mention({ id: "p6", title: "Sexto, se corta", score: 2, createdUtc: Math.floor(Date.parse("2022-01-01T00:00:00Z") / 1000) }),
    ];
    const signal = summarizeMentions(mentions, "2026-09-16T00:00:00.000Z");
    expect(signal.threads).toHaveLength(5);
    expect(signal.threads.map((t) => t.title)).toEqual([
      "Alto score",
      "Mismo score, más nuevo",
      "Mismo score, más viejo",
      "Quinto",
      "Sexto, se corta",
    ]);
  });

  it("builds the thread url by prefixing the permalink with reddit.com", () => {
    const mentions = [mention({ id: "p1", permalink: "/r/uruguay/comments/abc/algo/" })];
    const signal = summarizeMentions(mentions, "2026-09-16T00:00:00.000Z");
    expect(signal.threads[0]!.url).toBe("https://www.reddit.com/r/uruguay/comments/abc/algo/");
  });

  it("deduplicates by id", () => {
    const mentions = [mention({ id: "dup", score: 1 }), mention({ id: "dup", score: 99 })];
    const signal = summarizeMentions(mentions, "2026-09-16T00:00:00.000Z");
    expect(signal.mentions).toBe(1);
    expect(signal.threads).toHaveLength(1);
  });

  it("never outputs an author property, even when a mention carries one internally", () => {
    const withAuthor = { ...mention({ id: "p1" }), author: "un_usuario_cualquiera" } as RedditMention;
    const signal = summarizeMentions([withAuthor], "2026-09-16T00:00:00.000Z");
    const json = JSON.stringify(signal);
    expect(json).not.toContain("author");
    expect(json).not.toContain("un_usuario_cualquiera");
  });

  it("tone is always null in this task", () => {
    const signal = summarizeMentions([mention({ id: "p1" })], "2026-09-16T00:00:00.000Z");
    expect(signal.tone).toBeNull();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

// Arctic Shift's own shape for a post row (author present on purpose — the module must strip it).
function rawPost(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "1vdpq3t",
    created_utc: Math.floor(Date.parse("2026-06-01T00:00:00Z") / 1000),
    score: 4,
    num_comments: 2,
    title: "Recomendación de colchones/sommiers",
    permalink: "/r/uruguay/comments/1vdpq3t/recomendaci%C3%B3n_de_colchonessommiers/",
    selftext: "Alguien compró en Divino? busco opiniones",
    author: "usuario_secreto",
    ...overrides,
  };
}

function rawComment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "abc123",
    link_id: "t3_1vdpq3t",
    created_utc: Math.floor(Date.parse("2026-06-02T00:00:00Z") / 1000),
    score: 2,
    body: "sí, compré en Divino y anduvo bien",
    author: "otro_usuario_secreto",
    ...overrides,
  };
}

async function freshFetchRedditMentions(opts: { gapMs?: number; retryMs?: number } = {}) {
  vi.resetModules();
  process.env.STORES_REDDIT_GAP_MS = String(opts.gapMs ?? 1);
  process.env.STORES_REDDIT_RETRY_MS = String(opts.retryMs ?? 1);
  const mod = await import("../../classes/stores/signals/reddit");
  return mod.fetchRedditMentions;
}

describe("fetchRedditMentions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STORES_REDDIT_GAP_MS;
    delete process.env.STORES_REDDIT_RETRY_MS;
  });

  it("returns [] without any network call for a store with no redditTerms", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const entry = { redditTerms: [] as string[] } as any;
    const mentions = await fetchRedditMentions(entry, 0);
    expect(mentions).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queries both subreddits, posts and comments, per term, and filters+dedupes locally", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/posts/search")) return jsonResponse({ data: [rawPost()] });
      return jsonResponse({ data: [rawComment()] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const divino = STORE_BY_KEY.get("divino")!;
    const sinceUtc = Math.floor(Date.parse("2023-09-01T00:00:00Z") / 1000);
    const mentions = await fetchRedditMentions(divino, sinceUtc);

    expect(mentions).toBeDefined();
    // 2 subreddits x 1 term x 2 endpoints = 4 calls.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toContain("after=2023-09-01");
    }
    // Same post/comment id surfaces from both subreddit queries; dedup keeps one of each.
    expect(mentions!.map((m) => m.id).sort()).toEqual(["1vdpq3t", "abc123"]);
  });

  it("never carries an author field on any returned mention", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/posts/search") ? jsonResponse({ data: [rawPost()] }) : jsonResponse({ data: [rawComment()] })
      )
    );
    const divino = STORE_BY_KEY.get("divino")!;
    const mentions = await fetchRedditMentions(divino, 0);
    const json = JSON.stringify(mentions);
    expect(json).not.toContain("author");
    expect(json).not.toContain("usuario_secreto");
  });

  it("drops mentions that the API returned but that fail the local redditMatch disambiguator", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ data: [rawPost({ title: "juventud divino tesoro", selftext: "" })] }))
    );
    const divino = STORE_BY_KEY.get("divino")!;
    const mentions = await fetchRedditMentions(divino, 0);
    expect(mentions).toEqual([]);
  });

  it("retries a 429 with a delay and eventually succeeds", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions({ retryMs: 2 });
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        if (calls <= 2) return new Response("rate limited", { status: 429 });
        return jsonResponse({ data: [] });
      })
    );
    const bertoni = STORE_BY_KEY.get("bertoni")!;
    const mentions = await fetchRedditMentions(bertoni, 0);
    expect(mentions).toEqual([]);
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it("retries a 200 response carrying Arctic Shift's own timeout error", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions({ retryMs: 2 });
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        // Only the very first call (of the 4 combos: 2 subreddits x 1 term x posts/comments)
        // hits the timeout error; it must be retried once and succeed, while the other 3
        // combos succeed on their own first try — hence 5 total calls, not 4.
        if (calls === 1) return jsonResponse({ error: "Timeout. Maybe slow down a bit" });
        return jsonResponse({ data: [] });
      })
    );
    const bertoni = STORE_BY_KEY.get("bertoni")!;
    const mentions = await fetchRedditMentions(bertoni, 0);
    expect(mentions).toEqual([]);
    expect(calls).toBe(5);
  });

  it("returns undefined once retries are exhausted, so the caller keeps the previous signal", async () => {
    const fetchRedditMentions = await freshFetchRedditMentions({ retryMs: 2 });
    const fetchMock = vi.fn(async () => new Response("bad gateway", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    const bertoni = STORE_BY_KEY.get("bertoni")!;
    const mentions = await fetchRedditMentions(bertoni, 0);
    expect(mentions).toBeUndefined();
  }, 10_000);
});
