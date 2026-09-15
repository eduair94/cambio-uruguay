import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRange } from "../../classes/charruadevs/harvest";

const page = (items: Array<{ id: string; created_utc: number }>) =>
  new Response(JSON.stringify({ data: items }), { status: 200 });

describe("harvest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pages forward by created_utc, dedupes the boundary and stops at the end", async () => {
    const calls: string[] = [];
    const responses = [
      page([
        { id: "a", created_utc: 100 },
        { id: "b", created_utc: 101 },
      ]),
      page([
        { id: "b", created_utc: 101 },
        { id: "c", created_utc: 150 },
      ]),
      page([]),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        return responses.shift()!;
      })
    );
    const out = await fetchRange<{ id: string; created_utc: number }>("comments", 100, 200);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(calls[0]).toContain("subreddit=CharruaDevs");
    expect(calls[0]).toContain("after=99");
    expect(calls[0]).toContain("before=200");
    expect(calls[0]).toContain("fields=");
    expect(calls[1]).toContain("after=101");
  });

  it("steps one second when a whole page was already seen", async () => {
    const responses = [page([{ id: "a", created_utc: 100 }]), page([{ id: "a", created_utc: 100 }]), page([])];
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return responses.shift()!;
      })
    );
    await fetchRange("posts", 100, 200);
    expect(urls[0]).not.toContain("fields=");
    expect(urls[2]).toContain("after=101");
  });

  it("throws on a 400 (a bad query must not look like an empty month)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"bad"}', { status: 400 })));
    await expect(fetchRange("posts", 1, 2)).rejects.toThrow(/400/);
  });
});
