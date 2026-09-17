// Tasks 4 and 12: Reddit mentions (Arctic Shift). `mentionMatches`, `summarizeMentions`,
// `planRedditWindows` and `mergeStoredMentions` are pure and tested directly; `fetchRedditIncrement`
// is exercised against a fake Arctic Shift (see the section below).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva arriba de todo: fetchInfoLive es Reddit en vivo (OAuth), una fuente distinta de
// Arctic Shift — sólo verifyLiveThreads (item 5) la llama, así que mockearla acá no toca ningún otro
// test de este archivo.
const { fetchInfoLive } = vi.hoisted(() => ({ fetchInfoLive: vi.fn() }));
vi.mock("../../classes/reddit", () => ({ fetchInfoLive }));

import { STORE_BY_KEY } from "../../classes/stores/registry";
import {
  STORE_REDDIT_BACKFILL_MONTHS,
  STORE_REDDIT_MAX_MENTIONS,
  mentionMatches,
  mergeStoredMentions,
  planRedditWindows,
  redditTermsKey,
  summarizeMentions,
  verifyLiveThreads,
  type RedditCursor,
  type RedditMention,
  type StoredRedditMention,
} from "../../classes/stores/signals/reddit";

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
    sub: "uruguay",
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

describe("summarizeMentions capped", () => {
  it("is not capped unless the caller says the stored list hit the cap", () => {
    expect(summarizeMentions([mention({ id: "p1" })], "2026-09-16T00:00:00.000Z").capped).toBe(false);
    expect(summarizeMentions([mention({ id: "p1" })], "2026-09-16T00:00:00.000Z", new Date(), true).capped).toBe(true);
  });

  it("summarizes stored mentions, which carry no text", () => {
    const stored: StoredRedditMention[] = [
      { id: "p1", kind: "post", sub: "uruguay", createdUtc: 1_760_000_000, threadId: "p1", title: "Un hilo", permalink: "/r/uruguay/comments/p1/", score: 3 },
      { id: "c1", kind: "comment", sub: "montevideo", createdUtc: 1_760_000_100, threadId: "p1", title: null, permalink: "/r/montevideo/comments/p1/", score: 1 },
    ];
    const signal = summarizeMentions(stored, "2026-09-16T00:00:00.000Z");
    expect(signal.mentions).toBe(2);
    expect(signal.threads.map((t) => t.title)).toEqual(["Un hilo"]);
  });
});

// ---------------------------------------------------------------------------------------------------
// Incremental fetch. Arctic Shift is faked by stubbing global `fetch` (the convention of
// tests/stores/age.test.ts and google.test.ts): never a real network call. The pacing and retry waits
// are env knobs set to 1 ms, and each test imports a fresh copy of the module so the window sizes it
// learns in one scenario never leak into the next.
// ---------------------------------------------------------------------------------------------------

const DAY = 86_400;
const utc = (iso: string): number => Math.floor(Date.parse(iso) / 1000);
const day = (seconds: number): string => new Date(seconds * 1000).toISOString().slice(0, 10);

const NOW = utc("2026-09-16T00:00:00Z");
const START = utc("2024-09-16T00:00:00Z");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const TIMEOUT_BODY = { data: null, error: "Timeout. Maybe slow down a bit" };

interface Call {
  kind: "posts" | "comments";
  sub: string;
  term: string;
  /** The window start the module meant: Arctic Shift's `after` is exclusive, so it sends start - 1. */
  from: number;
  before: number;
  url: string;
}

function parseCall(url: string): Call {
  const parsed = new URL(url);
  const kind = parsed.pathname.includes("/posts/") ? "posts" : "comments";
  return {
    kind,
    sub: parsed.searchParams.get("subreddit") ?? "",
    term: parsed.searchParams.get(kind === "posts" ? "query" : "body") ?? "",
    from: Number(parsed.searchParams.get("after")) + 1,
    before: Number(parsed.searchParams.get("before")),
    url,
  };
}

function fakeArctic(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: unknown) => {
    const call = parseCall(String(input));
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

// Arctic Shift's own shape for a post row (author present on purpose — the module must strip it).
function rawPost(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "1vdpq3t",
    created_utc: utc("2026-06-01T00:00:00Z"),
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
    created_utc: utc("2026-06-02T00:00:00Z"),
    score: 2,
    body: "sí, compré en Divino y anduvo bien",
    author: "otro_usuario_secreto",
    ...overrides,
  };
}

async function freshReddit() {
  vi.resetModules();
  process.env.STORES_REDDIT_GAP_MS = "1";
  process.env.STORES_REDDIT_RETRY_MS = "1";
  return import("../../classes/stores/signals/reddit");
}

const doneCursor = (checkedUntilUtc: number): RedditCursor => ({
  backfillStartUtc: START,
  backfillNextUtc: checkedUntilUtc,
  backfillDone: true,
  checkedUntilUtc,
});

describe("planRedditWindows", () => {
  it("backs off 24 months, as a constant", () => {
    expect(STORE_REDDIT_BACKFILL_MONTHS).toBe(24);
  });

  it("with no cursor: posts in 6-month and comments in 3-month windows, contiguous from 24 months ago to now", () => {
    const windows = planRedditWindows(null, NOW);
    const posts = windows.filter((w) => w.kind === "post");
    const comments = windows.filter((w) => w.kind === "comment");

    expect(posts.map((w) => day(w.afterUtc))).toEqual(["2024-09-16", "2025-03-16", "2025-09-16", "2026-03-16"]);
    expect(comments.map((w) => day(w.afterUtc))).toEqual([
      "2024-09-16",
      "2024-12-16",
      "2025-03-16",
      "2025-06-16",
      "2025-09-16",
      "2025-12-16",
      "2026-03-16",
      "2026-06-16",
    ]);
    for (const list of [posts, comments]) {
      expect(list[0]!.afterUtc).toBe(START);
      expect(list[list.length - 1]!.beforeUtc).toBe(NOW);
      for (let i = 1; i < list.length; i++) expect(list[i]!.afterUtc).toBe(list[i - 1]!.beforeUtc);
    }
  });

  it("orders windows by start, so the cursor can advance as far as both kinds are done", () => {
    const starts = planRedditWindows(null, NOW).map((w) => w.afterUtc);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("clamps the last window at now instead of reaching past it", () => {
    const now = utc("2026-08-01T00:00:00Z");
    const windows = planRedditWindows(null, now);
    expect(Math.max(...windows.map((w) => w.beforeUtc))).toBe(now);
    for (const w of windows) expect(w.beforeUtc).toBeGreaterThan(w.afterUtc);
  });

  it("once the backfill is done: one window per kind, from a day before checkedUntilUtc to now", () => {
    const checked = utc("2026-09-09T00:00:00Z");
    expect(planRedditWindows(doneCursor(checked), NOW)).toEqual([
      { kind: "post", afterUtc: checked - DAY, beforeUtc: NOW },
      { kind: "comment", afterUtc: checked - DAY, beforeUtc: NOW },
    ]);
  });

  it("with a backfill half done: continues from backfillNextUtc", () => {
    const next = utc("2025-03-16T00:00:00Z");
    const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
    const windows = planRedditWindows(cursor, NOW);
    const posts = windows.filter((w) => w.kind === "post");
    const comments = windows.filter((w) => w.kind === "comment");
    expect(posts[0]!.afterUtc).toBe(next);
    expect(comments[0]!.afterUtc).toBe(next);
    expect(posts).toHaveLength(3);
    expect(comments).toHaveLength(6);
    expect(posts[posts.length - 1]!.beforeUtc).toBe(NOW);
    expect(comments[comments.length - 1]!.beforeUtc).toBe(NOW);
  });
});

describe("fetchRedditIncrement", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.STORES_REDDIT_GAP_MS;
    delete process.env.STORES_REDDIT_RETRY_MS;
  });

  it("never queries a store with no redditTerms", async () => {
    const { fetchRedditIncrement } = await freshReddit();
    const { fetchMock } = fakeArctic(() => jsonResponse({ data: [] }));
    const entry = { ...STORE_BY_KEY.get("tushop")!, redditTerms: [] as string[] };
    const result = await fetchRedditIncrement(entry, null, NOW, { calls: 10 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result?.mentions).toEqual([]);
    expect(result?.complete).toBe(true);
  });

  it("backfills every window for both subreddits, posts and comments, and finishes the cursor at now", async () => {
    const { fetchRedditIncrement } = await freshReddit();
    const { calls } = fakeArctic((call) => {
      if (call.kind === "posts" && call.sub === "uruguay" && call.from <= utc("2026-06-01T00:00:00Z") && call.before > utc("2026-06-01T00:00:00Z")) {
        return jsonResponse({ data: [rawPost()] });
      }
      if (call.kind === "comments" && call.sub === "montevideo" && call.from <= utc("2026-06-02T00:00:00Z") && call.before > utc("2026-06-02T00:00:00Z")) {
        return jsonResponse({ data: [rawComment()] });
      }
      return jsonResponse({ data: [] });
    });

    const divino = STORE_BY_KEY.get("divino")!;
    const budget = { calls: 1000 };
    const result = await fetchRedditIncrement(divino, null, NOW, budget);

    // 4 post windows + 8 comment windows, each for r/uruguay and r/montevideo, one term.
    expect(calls).toHaveLength(24);
    expect(budget.calls).toBe(1000 - 24);
    for (const call of calls) {
      expect(call.url).toContain("sort=asc");
      expect(call.url).toContain("limit=100");
      expect(call.term).toBe("divino");
    }
    expect(new Set(calls.map((c) => c.sub))).toEqual(new Set(["uruguay", "montevideo"]));

    expect(result).toBeDefined();
    expect(result!.complete).toBe(true);
    expect(result!.cursor).toEqual({ backfillStartUtc: START, backfillNextUtc: NOW, backfillDone: true, checkedUntilUtc: NOW });
    expect(result!.mentions.map((m) => [m.id, m.kind, m.sub])).toEqual(
      expect.arrayContaining([
        ["1vdpq3t", "post", "uruguay"],
        ["abc123", "comment", "montevideo"],
      ])
    );
    expect(result!.mentions).toHaveLength(2);
    const comment = result!.mentions.find((m) => m.kind === "comment")!;
    expect(comment.permalink).toBe("/r/montevideo/comments/1vdpq3t/");
    expect(comment.threadId).toBe("1vdpq3t");
  });

  it("sends after/before as epoch seconds, with after one second before the window so its first second counts", async () => {
    const { fetchRedditIncrement } = await freshReddit();
    const { calls } = fakeArctic(() => jsonResponse({ data: [] }));
    const checked = utc("2026-09-09T00:00:00Z");
    await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(checked), NOW, { calls: 100 });
    expect(calls).toHaveLength(4);
    for (const call of calls) {
      expect(call.url).toContain(`after=${checked - DAY - 1}&`);
      expect(call.url).toContain(`before=${NOW}`);
    }
  });

  it("never carries an author field, and drops rows that fail the local disambiguator", async () => {
    const { fetchRedditIncrement } = await freshReddit();
    fakeArctic((call) =>
      call.kind === "posts"
        ? jsonResponse({ data: [rawPost(), rawPost({ id: "otro", title: "juventud divino tesoro", selftext: "" })] })
        : jsonResponse({ data: [rawComment()] })
    );
    const result = await fetchRedditIncrement(STORE_BY_KEY.get("divino")!, doneCursor(NOW - 7 * DAY), NOW, { calls: 100 });
    expect(result!.mentions.map((m) => m.id).sort()).toEqual(["1vdpq3t", "abc123"]);
    const json = JSON.stringify(result);
    expect(json).not.toContain("author");
    expect(json).not.toContain("usuario_secreto");
  });

  describe("pagination", () => {
    const base = NOW - 7 * DAY;
    const fullPage = Array.from({ length: 100 }, (_, i) =>
      rawPost({ id: `p${i}`, created_utc: base + i * 60, title: `pedí en tushop ${i}`, selftext: "" })
    );

    it("asks for the next page after the last row of a full page, stops on a short page, and never duplicates ids", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const { calls } = fakeArctic((call) => {
        if (call.kind !== "posts" || call.sub !== "uruguay") return jsonResponse({ data: [] });
        if (call.from <= base) return jsonResponse({ data: fullPage });
        // Second page: Arctic Shift sends the last row again (same second) plus one new row.
        return jsonResponse({ data: [fullPage[99], rawPost({ id: "p100", created_utc: base + 100 * 60, title: "pedí en tushop", selftext: "" })] });
      });

      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 6 * DAY), NOW, { calls: 100 });

      const uyPosts = calls.filter((c) => c.kind === "posts" && c.sub === "uruguay");
      expect(uyPosts).toHaveLength(2);
      // `after` is exclusive: the next page starts AT the last row's second (after = created_utc - 1),
      // so another row published in that same second is not skipped; its duplicate is dropped by id.
      expect(uyPosts[1]!.from).toBe(base + 99 * 60);
      expect(uyPosts[1]!.before).toBe(NOW);
      expect(result!.complete).toBe(true);
      expect(result!.mentions).toHaveLength(101);
      expect(new Set(result!.mentions.map((m) => m.id)).size).toBe(101);
    });

    it("moves past a full page that brought nothing new, so it always ends", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const sameSecond = Array.from({ length: 100 }, (_, i) => rawPost({ id: `s${i}`, created_utc: base, title: "tushop", selftext: "" }));
      const { calls } = fakeArctic((call) => {
        if (call.kind !== "posts" || call.sub !== "uruguay") return jsonResponse({ data: [] });
        return jsonResponse({ data: call.from <= base ? sameSecond : [] });
      });
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 6 * DAY), NOW, { calls: 100 });
      const uyPosts = calls.filter((c) => c.kind === "posts" && c.sub === "uruguay");
      expect(uyPosts.map((c) => c.from)).toEqual([NOW - 7 * DAY, base, base + 1]);
      expect(result!.complete).toBe(true);
    });
  });

  describe("retries", () => {
    it.each([
      { label: "HTTP 422 with Arctic Shift's timeout error", failure: () => jsonResponse(TIMEOUT_BODY, 422) },
      { label: "HTTP 429", failure: () => new Response("rate limited", { status: 429 }) },
      { label: "HTTP 502", failure: () => new Response("bad gateway", { status: 502 }) },
      { label: "HTTP 200 with Arctic Shift's timeout error", failure: () => jsonResponse(TIMEOUT_BODY) },
    ])("retries $label and counts every attempt against the budget", async ({ failure }) => {
      const { fetchRedditIncrement } = await freshReddit();
      let failures = 0;
      const { calls } = fakeArctic((call) => {
        if (call.kind === "posts" && call.sub === "uruguay" && failures < 2) {
          failures++;
          return failure();
        }
        return jsonResponse({ data: [] });
      });
      const budget = { calls: 100 };
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 7 * DAY), NOW, budget);
      expect(result!.complete).toBe(true);
      expect(calls).toHaveLength(6);
      expect(budget.calls).toBe(94);
    });

    it("gives up on a query after 3 retries, and with nothing completed returns undefined", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const { calls } = fakeArctic(() => jsonResponse(TIMEOUT_BODY, 422));
      // An incremental week: 8 days is under the 14-day floor, so the window cannot be split.
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 7 * DAY), NOW, { calls: 100 });
      expect(result).toBeUndefined();
      expect(calls).toHaveLength(4);
    });

    it("does not retry an error that is not a timeout, and logs which query was rejected", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { calls } = fakeArctic(() => jsonResponse({ data: null, error: "Invalid parameter" }, 400));
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 7 * DAY), NOW, { calls: 100 });
      expect(result).toBeUndefined();
      expect(calls).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(1);
      const line = String(warn.mock.calls[0]![0]);
      expect(line).toContain('[tiendas] reddit tushop r/uruguay post "tushop": HTTP 400');
      expect(line).toContain("Invalid parameter");
    });

    it("stops instead of splitting when a window keeps failing with something other than a timeout", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const next = utc("2026-06-16T00:00:00Z");
      const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
      const { calls } = fakeArctic((call) =>
        call.kind === "comments" && call.sub === "uruguay" ? new Response("bad gateway", { status: 502 }) : jsonResponse({ data: [] })
      );

      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 100 });

      expect(result).toBeUndefined();
      const uyComments = calls.filter((c) => c.kind === "comments" && c.sub === "uruguay");
      expect(uyComments).toHaveLength(4);
      for (const call of uyComments) expect([call.from, call.before]).toEqual([next, NOW]);
      // Nothing after it for this store: r/montevideo comments are never asked.
      expect(calls.some((c) => c.kind === "comments" && c.sub === "montevideo")).toBe(false);
      expect(String(warn.mock.calls[0]![0])).toContain('[tiendas] reddit tushop r/uruguay comment "tushop": HTTP 502');
    });

    it("keeps the partial progress of the window's last query when it fails midway", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const next = utc("2026-06-16T00:00:00Z");
      const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
      const page = Array.from({ length: 100 }, (_, i) => rawComment({ id: `c${i}`, created_utc: next + i * 3600, body: "compré en tushop" }));
      const lastRow = next + 99 * 3600;
      fakeArctic((call) => {
        // r/montevideo comments is the window's last query: its first page answers, the next one fails
        // for good after the retries.
        if (call.kind === "comments" && call.sub === "montevideo") {
          return call.from === next ? jsonResponse({ data: page }) : new Response("bad gateway", { status: 502 });
        }
        return jsonResponse({ data: [] });
      });

      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 100 });

      expect(result).toBeDefined();
      expect(result!.complete).toBe(false);
      expect(result!.cursor).toEqual({ backfillStartUtc: START, backfillNextUtc: lastRow, backfillDone: false, checkedUntilUtc: lastRow });
      // Everything before the second that failed; the row AT that second is read again next run.
      expect(result!.mentions).toHaveLength(99);
      for (const mention of result!.mentions) expect(mention.createdUtc).toBeLessThan(lastRow);
    });

    it("splits a window that keeps timing out in halves, and remembers the size that failed", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const next = utc("2026-06-16T00:00:00Z");
      const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
      const { calls } = fakeArctic((call) => {
        // r/uruguay comments only answer windows of 30 days or less — what Arctic Shift did on 2026-09-16.
        if (call.kind === "comments" && call.sub === "uruguay" && call.before - call.from > 30 * DAY) {
          return jsonResponse(TIMEOUT_BODY, 422);
        }
        return jsonResponse({ data: [] });
      });

      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 100 });

      expect(result!.complete).toBe(true);
      expect(result!.cursor).toEqual({ backfillStartUtc: START, backfillNextUtc: NOW, backfillDone: true, checkedUntilUtc: NOW });

      const uyComments = calls.filter((c) => c.kind === "comments" && c.sub === "uruguay");
      const full = uyComments.filter((c) => c.from === next && c.before === NOW);
      expect(full).toHaveLength(4); // 1 attempt + 3 retries, then split

      // What answered covers the 3 months without gaps.
      const answered = uyComments.filter((c) => c.before - c.from <= 30 * DAY).sort((a, b) => a.from - b.from);
      expect(answered[0]!.from).toBe(next);
      expect(answered[answered.length - 1]!.before).toBe(NOW);
      for (let i = 1; i < answered.length; i++) expect(answered[i]!.from).toBe(answered[i - 1]!.before);

      // The second 46-day half is never tried whole: the first one already failed at that size.
      const mid = next + Math.floor((NOW - next) / 2);
      expect(uyComments.filter((c) => c.from === mid && c.before === NOW)).toHaveLength(0);
    });

    it("cuts later windows into chunks no longer than the longest span that answered, so misaligned halves do not fail again", async () => {
      // Measured 2026-09-16: r/uruguay comments timed out at 22.8 days and answered at 11.4; the next
      // calendar window was a day shorter, so plain halving produced 22.5-day halves that failed again.
      const { fetchRedditIncrement } = await freshReddit();
      const next = utc("2026-05-16T00:00:00Z");
      const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
      const { calls } = fakeArctic((call) =>
        call.kind === "comments" && call.sub === "uruguay" && call.before - call.from > 12 * DAY
          ? jsonResponse(TIMEOUT_BODY, 422)
          : jsonResponse({ data: [] })
      );

      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 1000 });

      expect(result!.complete).toBe(true);
      const uyComments = calls.filter((c) => c.kind === "comments" && c.sub === "uruguay");
      // Only the first window pays for finding the size: 92, 46 and 23 days, 4 attempts each.
      expect(uyComments.filter((c) => c.before - c.from > 12 * DAY)).toHaveLength(12);
      // The 31-day window that follows is asked in pieces that answer.
      const lastWindow = uyComments.filter((c) => c.from >= utc("2026-08-16T00:00:00Z"));
      expect(lastWindow.length).toBeGreaterThan(1);
      for (const call of lastWindow) expect(call.before - call.from).toBeLessThanOrEqual(12 * DAY);
    });

    it("splits no further than 14 days, and returns what was done with the cursor at the last complete window", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const brokenFrom = utc("2025-03-16T00:00:00Z");
      const { calls } = fakeArctic((call) => {
        if (call.kind === "comments" && call.sub === "uruguay" && call.from >= brokenFrom) return jsonResponse(TIMEOUT_BODY, 422);
        if (call.kind === "posts" && call.sub === "uruguay" && call.from <= utc("2024-10-01T00:00:00Z") && call.before > utc("2024-10-01T00:00:00Z")) {
          return jsonResponse({ data: [rawPost({ id: "viejo", created_utc: utc("2024-10-01T00:00:00Z"), title: "pedí en tushop", selftext: "" })] });
        }
        if (call.kind === "posts" && call.sub === "uruguay" && call.from <= utc("2025-05-01T00:00:00Z") && call.before > utc("2025-05-01T00:00:00Z")) {
          // Inside a posts window that finished, but past where comments are complete: not returned yet.
          return jsonResponse({ data: [rawPost({ id: "adelantado", created_utc: utc("2025-05-01T00:00:00Z"), title: "pedí en tushop", selftext: "" })] });
        }
        return jsonResponse({ data: [] });
      });

      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, null, NOW, { calls: 1000 });

      expect(result).toBeDefined();
      expect(result!.complete).toBe(false);
      expect(result!.cursor).toEqual({ backfillStartUtc: START, backfillNextUtc: brokenFrom, backfillDone: false, checkedUntilUtc: brokenFrom });
      expect(result!.mentions.map((m) => m.id)).toEqual(["viejo"]);

      const broken = calls.filter((c) => c.kind === "comments" && c.sub === "uruguay" && c.from >= brokenFrom);
      // 92 days → 46 → 23 → 11.5: each size tried 4 times (1 + 3 retries). The 11.5-day window is
      // under the 14-day floor, so after its retries the store stops instead of splitting again.
      const spans = broken.map((c) => c.before - c.from);
      expect(spans).toEqual([...Array(4).fill(92 * DAY), ...Array(4).fill(46 * DAY), ...Array(4).fill(23 * DAY), ...Array(4).fill(11.5 * DAY)]);
      // Nothing after the failure: no later window of either kind.
      expect(calls.some((c) => c.from >= utc("2025-06-16T00:00:00Z"))).toBe(false);
    });
  });

  describe("what one store teaches the next", () => {
    it("does not learn a window size from a later page: a short page that timed out or answered never shrinks another store's windows", async () => {
      // The review probe: store A's 2-hour second page timed out 4 times, store B's 1-hour second page
      // answered, and store C's fresh backfill then spent 298 of 300 calls on 1-hour chunks of r/uruguay
      // comments and returned undefined.
      const { fetchRedditIncrement } = await freshReddit();
      const windowStart = NOW - 8 * DAY;
      const fullPageEndingAt = (end: number) =>
        Array.from({ length: 100 }, (_, i) => rawComment({ id: `x${end}-${i}`, created_utc: end - (99 - i) * 60, body: "nada" }));

      let store: "A" | "B" | "C" = "A";
      const { calls } = fakeArctic((call) => {
        if (call.kind !== "comments" || call.sub !== "uruguay") return jsonResponse({ data: [] });
        if (store === "A") {
          return call.from === windowStart ? jsonResponse({ data: fullPageEndingAt(NOW - 7200) }) : jsonResponse(TIMEOUT_BODY, 422);
        }
        if (store === "B") {
          return call.from === windowStart ? jsonResponse({ data: fullPageEndingAt(NOW - 3600) }) : jsonResponse({ data: [] });
        }
        // Store C: what Arctic Shift really does with r/uruguay comments.
        return call.before - call.from > 30 * DAY ? jsonResponse(TIMEOUT_BODY, 422) : jsonResponse({ data: [] });
      });

      await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 7 * DAY), NOW, { calls: 100 });
      store = "B";
      await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 7 * DAY), NOW, { calls: 100 });
      store = "C";
      const before = calls.length;
      const budget = { calls: 300 };
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, null, NOW, budget);

      expect(result).toBeDefined();
      expect(result!.complete).toBe(true);
      expect(result!.cursor.backfillDone).toBe(true);
      const cComments = calls.slice(before).filter((c) => c.kind === "comments" && c.sub === "uruguay");
      expect(Math.min(...cComments.map((c) => c.before - c.from))).toBeGreaterThanOrEqual(7 * DAY);
      expect(budget.calls).toBeGreaterThan(200);
    });

    // Each guard on its own: the probe above is covered by several of them at once.
    it("does not learn from a second page that timed out, even a long one", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const next = utc("2026-06-16T00:00:00Z");
      const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
      const page = Array.from({ length: 100 }, (_, i) => rawComment({ id: `p${i}`, created_utc: next + 3600 - (99 - i) * 30, body: "nada" }));
      let store: "A" | "B" = "A";
      const { calls } = fakeArctic((call) => {
        if (store === "A" && call.kind === "comments" && call.sub === "uruguay") {
          if (call.from === next) return jsonResponse({ data: page });
          // The 92-day remainder after the first 100 rows keeps timing out.
          if (call.from === next + 3600 && call.before === NOW) return jsonResponse(TIMEOUT_BODY, 422);
        }
        return jsonResponse({ data: [] });
      });

      expect((await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 100 }))!.complete).toBe(true);
      store = "B";
      const before = calls.length;
      await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 100 });

      const first = calls.slice(before).find((c) => c.kind === "comments" && c.sub === "uruguay")!;
      expect([first.from, first.before]).toEqual([next, NOW]);
    });

    it("does not learn from a timeout on a window shorter than 14 days (load, not size)", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const next = utc("2026-06-16T00:00:00Z");
      const cursor: RedditCursor = { backfillStartUtc: START, backfillNextUtc: next, backfillDone: false, checkedUntilUtc: next };
      let store: "A" | "B" = "A";
      const { calls } = fakeArctic((call) =>
        store === "A" && call.kind === "comments" && call.sub === "uruguay" ? jsonResponse(TIMEOUT_BODY, 422) : jsonResponse({ data: [] })
      );

      // Store A: its 8-day week times out on the first page.
      expect(await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 7 * DAY), NOW, { calls: 100 })).toBeUndefined();
      store = "B";
      const before = calls.length;
      await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, cursor, NOW, { calls: 100 });

      const first = calls.slice(before).find((c) => c.kind === "comments" && c.sub === "uruguay")!;
      expect([first.from, first.before]).toEqual([next, NOW]);
    });

    it("does not learn from an answer on a window shorter than 7 days", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      let store: "A" | "B" | "C" = "A";
      const { calls } = fakeArctic((call) =>
        store === "A" && call.kind === "comments" && call.sub === "uruguay" && call.before - call.from > 5 * DAY
          ? jsonResponse(TIMEOUT_BODY, 422)
          : jsonResponse({ data: [] })
      );

      // Store A: 20 days time out (learned), its 10-day halves too (not split again) — nothing answered.
      expect(await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 19 * DAY), NOW, { calls: 100 })).toBeUndefined();
      // Store B: a 3-day window answers. Too short to say how long a window can be.
      store = "B";
      await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 2 * DAY), NOW, { calls: 100 });
      // Store C: a 36-day window is halved (what the 20-day timeout says), not cut as small as the floor
      // allows (5 parts of 7.2 days) as a 3-day "answer" would ask.
      store = "C";
      const before = calls.length;
      await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 35 * DAY), NOW, { calls: 100 });

      const uyComments = calls.slice(before).filter((c) => c.kind === "comments" && c.sub === "uruguay");
      expect(uyComments.map((c) => c.before - c.from)).toEqual([18 * DAY, 18 * DAY]);
    });

    it("never cuts a window into parts shorter than 7 days, whatever span answered", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      // r/uruguay comments answer only up to 8 days.
      const { calls } = fakeArctic((call) =>
        call.kind === "comments" && call.sub === "uruguay" && call.before - call.from > 8 * DAY
          ? jsonResponse(TIMEOUT_BODY, 422)
          : jsonResponse({ data: [] })
      );

      // Store 1: a 15-day window times out and its 7.5-day halves answer.
      const first = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 14 * DAY), NOW, { calls: 100 });
      expect(first!.complete).toBe(true);
      // Store 2: a 16-day window. Chunks of at most 7.5 days would be 3 parts of 5.3 days; the floor
      // asks it in 2 parts of 8 days instead.
      const before = calls.length;
      const second = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(NOW - 15 * DAY), NOW, { calls: 100 });
      expect(second!.complete).toBe(true);
      const uyComments = calls.slice(before).filter((c) => c.kind === "comments" && c.sub === "uruguay");
      expect(uyComments.map((c) => c.before - c.from)).toEqual([8 * DAY, 8 * DAY]);
    });
  });

  describe("budget", () => {
    it("stops when the run's call budget is spent, with the cursor at the last window both kinds completed", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const { calls } = fakeArctic(() => jsonResponse({ data: [] }));
      const budget = { calls: 5 };
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, null, NOW, budget);

      // posts 2024-09-16 (uy, mvd), comments 2024-09-16 (uy, mvd), comments 2024-12-16 (uy) — then 0.
      expect(calls).toHaveLength(5);
      expect(budget.calls).toBe(0);
      const cut = utc("2024-12-16T00:00:00Z");
      expect(result!.complete).toBe(false);
      expect(result!.cursor).toEqual({ backfillStartUtc: START, backfillNextUtc: cut, backfillDone: false, checkedUntilUtc: cut });
    });

    it("returns undefined when the budget ran out before both kinds finished a window", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      fakeArctic(() => jsonResponse({ data: [] }));
      const checked = utc("2026-09-09T00:00:00Z");
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(checked), NOW, { calls: 3 });
      expect(result).toBeUndefined();
    });

    it("makes no call at all with an empty budget", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const { fetchMock } = fakeArctic(() => jsonResponse({ data: [] }));
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, null, NOW, { calls: 0 });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  // Item 7: the nightly `--reddit-only` wall-clock cap (STORES_REDDIT_MAX_MINUTES) was previously
  // only checked BETWEEN stores in sync_store_profiles.ts, so one store stuck in retries/splits
  // could itself run well past the deadline before the caller got another chance to check it.
  describe("deadline (item 7)", () => {
    it("makes no call at all when the deadline has already passed", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const { fetchMock } = fakeArctic(() => jsonResponse({ data: [] }));
      const result = await fetchRedditIncrement(
        STORE_BY_KEY.get("tushop")!,
        null,
        NOW,
        { calls: 900 },
        Date.now() - 1_000
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("keeps whatever progress it made before the deadline hit, same shape as a budget cutoff", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      let calls = 0;
      // A deadline 30ms out lets a couple of (mocked, near-instant) calls through before it trips —
      // long enough to be robust on a slow CI box, short enough not to make the suite wait.
      const deadlineAt = Date.now() + 30;
      fakeArctic(() => {
        calls++;
        return jsonResponse({ data: [] });
      });
      const result = await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, null, NOW, { calls: 900 }, deadlineAt);
      expect(calls).toBeGreaterThan(0);
      expect(calls).toBeLessThan(24); // fewer than the full unbounded backfill for this store
      expect(result).toBeDefined();
      expect(result!.complete).toBe(false);
    });

    it("does not check the deadline at all in full-run mode (no fifth argument)", async () => {
      const { fetchRedditIncrement } = await freshReddit();
      const { calls } = fakeArctic(() => jsonResponse({ data: [] }));
      const divino = STORE_BY_KEY.get("divino")!;
      const result = await fetchRedditIncrement(divino, null, NOW, { calls: 1000 });
      expect(result!.complete).toBe(true);
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it("passes a bounded AbortSignal.timeout to every Arctic Shift request (item 7)", async () => {
    const { fetchRedditIncrement } = await freshReddit();
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchRedditIncrement(STORE_BY_KEY.get("tushop")!, doneCursor(utc("2026-09-15T00:00:00Z")), NOW, {
      calls: 10,
    });
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0]!;
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("mergeStoredMentions", () => {
  const fresh = (id: string, createdUtc: number, extra: Partial<RedditMention> = {}): RedditMention =>
    mention({ id, createdUtc, threadId: id, permalink: `/r/uruguay/comments/${id}/`, text: `texto secreto ${id}`, ...extra });
  const stored = (id: string, createdUtc: number): StoredRedditMention => ({
    id,
    kind: "post",
    sub: "uruguay",
    createdUtc,
    threadId: id,
    title: `Hilo ${id}`,
    permalink: `/r/uruguay/comments/${id}/`,
    score: 1,
  });

  it("caps at 500, as a constant", () => {
    expect(STORE_REDDIT_MAX_MENTIONS).toBe(500);
  });

  it("unites by id, newest first, and takes the fresh score of a mention seen again", () => {
    const result = mergeStoredMentions([stored("a", 100), stored("b", 300)], [fresh("b", 300, { score: 9 }), fresh("c", 200)]);
    expect(result.mentions.map((m) => m.id)).toEqual(["b", "c", "a"]);
    expect(result.mentions[0]!.score).toBe(9);
    expect(result.capped).toBe(false);
  });

  it("keeps the newest 500 and marks the figure as capped", () => {
    const old = Array.from({ length: 499 }, (_, i) => stored(`s${i}`, 1_000 + i));
    const result = mergeStoredMentions(old, [fresh("n1", 5_000), fresh("n2", 6_000)]);
    expect(result.mentions).toHaveLength(500);
    expect(result.capped).toBe(true);
    expect(result.mentions[0]!.id).toBe("n2");
    expect(result.mentions.some((m) => m.id === "s0")).toBe(false);
  });

  it("stays capped once the stored list is full, even with nothing new (older ones were already dropped)", () => {
    const full = Array.from({ length: 500 }, (_, i) => stored(`s${i}`, 1_000 + i));
    expect(mergeStoredMentions(full, []).capped).toBe(true);
    expect(mergeStoredMentions(full.slice(0, 499), []).capped).toBe(false);
  });

  it("never stores text or author", () => {
    const withAuthor = { ...fresh("x", 10), author: "usuario_secreto" } as RedditMention;
    const polluted = { ...stored("y", 5), text: "texto viejo", author: "otro" } as StoredRedditMention;
    const result = mergeStoredMentions([polluted], [withAuthor]);
    const json = JSON.stringify(result);
    expect(json).not.toContain('"text"');
    expect(json).not.toContain("texto secreto");
    expect(json).not.toContain("texto viejo");
    expect(json).not.toContain("author");
    expect(json).not.toContain("usuario_secreto");
    expect(Object.keys(result.mentions[0]!).sort()).toEqual(["createdUtc", "id", "kind", "permalink", "score", "sub", "threadId", "title"]);
  });
});

describe("redditTermsKey", () => {
  it("is the same for the same terms in another order or case, and changes with the terms or the disambiguator", () => {
    const base = { redditTerms: ["Magic Center", "magiccenter"] };
    expect(redditTermsKey(base)).toBe(redditTermsKey({ redditTerms: ["magiccenter", "magic center"] }));
    expect(redditTermsKey(base)).not.toBe(redditTermsKey({ redditTerms: ["magic center"] }));
    expect(redditTermsKey(base)).not.toBe(redditTermsKey({ ...base, redditMatch: /\bmagic center\b/ }));
  });
});

// Item 5 (final review): Arctic Shift is an archive that keeps deleted posts, so a thread
// `summarizeMentions` picked as one of the top 5 by score can be one that got removed or deleted
// long after it was archived. `verifyLiveThreads` re-checks the surviving handful against Reddit's
// own live `/api/info` (classes/reddit.ts's `fetchInfoLive`, mocked at the top of this file) right
// before they are stored.
describe("verifyLiveThreads", () => {
  beforeEach(() => {
    fetchInfoLive.mockReset();
  });

  function thread(overrides: Partial<{ title: string; date: string; url: string; score: number }> = {}) {
    return {
      title: "Un hilo sobre la tienda",
      date: "2026-06-01",
      url: "https://www.reddit.com/r/uruguay/comments/abc123/un_hilo/",
      score: 4,
      ...overrides,
    };
  }

  it("returns an empty list without calling Reddit when there is nothing to verify", async () => {
    expect(await verifyLiveThreads([])).toEqual([]);
    expect(fetchInfoLive).not.toHaveBeenCalled();
  });

  it("drops a thread /api/info says is gone, keeps the rest with their CURRENT score", async () => {
    fetchInfoLive.mockResolvedValue(
      new Map([
        ["t3_abc123", { score: 4, gone: false }],
        ["t3_def456", { score: 0, gone: true }],
      ])
    );
    const threads = [
      thread({ url: "https://www.reddit.com/r/uruguay/comments/abc123/un_hilo/", score: 4 }),
      thread({
        title: "Hilo borrado",
        url: "https://www.reddit.com/r/montevideo/comments/def456/otro_hilo/",
        score: 30, // Arctic Shift's stale archived score
      }),
    ];
    const result = await verifyLiveThreads(threads);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Un hilo sobre la tienda");
  });

  it("replaces the archived score with the CURRENT one from /api/info, never Arctic Shift's", async () => {
    fetchInfoLive.mockResolvedValue(new Map([["t3_abc123", { score: 41, gone: false }]]));
    const result = await verifyLiveThreads([thread({ score: 4 })]);
    expect(result[0]!.score).toBe(41);
  });

  it("drops a thread /api/info did not return at all, same as removed_by_category", async () => {
    fetchInfoLive.mockResolvedValue(new Map()); // neither id came back
    const result = await verifyLiveThreads([thread()]);
    expect(result).toEqual([]);
  });

  it("fails CLOSED — publishes no titles at all — when Reddit's live API cannot be reached", async () => {
    fetchInfoLive.mockResolvedValue(null);
    const result = await verifyLiveThreads([thread(), thread({ url: "https://www.reddit.com/r/uruguay/comments/zzz999/x/" })]);
    expect(result).toEqual([]);
  });

  it("queries fetchInfoLive with t3_ fullnames built from the thread permalink", async () => {
    fetchInfoLive.mockResolvedValue(new Map([["t3_abc123", { score: 4, gone: false }]]));
    await verifyLiveThreads([thread({ url: "https://www.reddit.com/r/uruguay/comments/abc123/un_hilo/" })]);
    expect(fetchInfoLive).toHaveBeenCalledWith(["t3_abc123"]);
  });
});
