import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetRedditForTests, MIN_GAP_MS, redditConfigured, searchPosts } from "../../classes/reddit";

describe("reddit client", () => {
  beforeEach(() => {
    __resetRedditForTests();
    process.env.REDDIT_CLIENT_ID = "id";
    process.env.REDDIT_CLIENT_SECRET = "secret";
  });

  it("is configured when credentials are present", () => {
    expect(redditConfigured()).toBe(true);
  });

  it("is not configured when the credentials are missing — the job must no-op, not guess", () => {
    delete process.env.REDDIT_CLIENT_ID;
    expect(redditConfigured()).toBe(false);
  });

  it("mints one token and reuses it across calls", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("access_token")) {
        return new Response(JSON.stringify({ access_token: "tk", expires_in: 3600 }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: { children: [] } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchPosts("uruguay", "courier");
    await searchPosts("uruguay", "casillero");

    const tokenCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("access_token"));
    expect(tokenCalls).toHaveLength(1);
  });

  it("spaces its calls out — Reddit bans a client that hammers it", async () => {
    const at: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("access_token")) {
          return new Response(JSON.stringify({ access_token: "tk", expires_in: 3600 }), { status: 200 });
        }
        at.push(Date.now());
        return new Response(JSON.stringify({ data: { children: [] } }), { status: 200 });
      })
    );

    await searchPosts("uruguay", "courier");
    await searchPosts("uruguay", "casillero");

    expect(at).toHaveLength(2);
    // Small tolerance: timers fire on or just after the deadline, never meaningfully before.
    expect(at[1]! - at[0]!).toBeGreaterThanOrEqual(MIN_GAP_MS - 50);
  }, 20_000);

  it("parses a search listing into posts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("access_token")) {
          return new Response(JSON.stringify({ access_token: "tk", expires_in: 3600 }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            data: {
              children: [
                {
                  kind: "t3",
                  data: {
                    id: "abc",
                    subreddit: "uruguay",
                    title: "¿Qué courier me conviene?",
                    selftext: "Quiero traer una notebook.",
                    author: "alguien",
                    score: 12,
                    num_comments: 30,
                    permalink: "/r/uruguay/comments/abc/_/",
                    created_utc: 1750000000,
                    url: "https://reddit.com/r/uruguay/comments/abc",
                  },
                },
                // A non-post child (an ad slot / anything else) must be ignored, not coerced.
                { kind: "t1", data: { id: "zzz" } },
              ],
            },
          }),
          { status: 200 }
        );
      })
    );

    const posts = await searchPosts("uruguay", "courier");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: "abc",
      sub: "uruguay",
      title: "¿Qué courier me conviene?",
      score: 12,
      permalink: "https://reddit.com/r/uruguay/comments/abc/_/",
    });
  }, 20_000);

  it("returns [] instead of throwing when Reddit errors — an outage must not break the job", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("access_token")
          ? new Response(JSON.stringify({ access_token: "tk", expires_in: 3600 }), { status: 200 })
          : new Response("nope", { status: 503 })
      )
    );
    await expect(searchPosts("uruguay", "courier")).resolves.toEqual([]);
  }, 30_000);

  it("returns [] when there are no credentials at all", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchPosts("uruguay", "courier")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
