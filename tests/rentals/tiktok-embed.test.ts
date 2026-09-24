// The creator embed (2026-09-25): an account's latest videos over plain HTTP, from the VPS's own IP.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createTimeFromId, parseCreatorEmbed, readCreatorEmbeds } from "../../classes/rentals/sources/tiktok/embed";
import { harvestTiktok } from "../../classes/rentals/sources/tiktok";
import type { ListPlan, ListResults } from "../../classes/rentals/sources/tiktok/browser";
import type { TiktokAccountRow, TiktokPostRow, TiktokStore } from "../../classes/rentals/sources/tiktok/store";

const EMBED = readFileSync(join(__dirname, "fixtures", "tiktok-creator-embed.html"), "utf8");
const ERROR_PAGE = '<script id="__FRONTITY_CONNECT_STATE__" type="application/json">{"source":{"data":{"/embed/@nadie.aca":{"isReady":true,"isError":true,"pageName":"error","userInfo":{"uniqueId":"nadie.aca"},"videoList":[]}}}}</script>';
// 2026-09-23 05:00 UTC minus 45 days.
const WINDOW = Math.floor(Date.UTC(2026, 8, 23, 5) / 1000) - 45 * 86_400;

describe("the creator embed", () => {
  it("dates a video by its id: the high 32 bits are the second it was published", () => {
    // Stored from the list API: createTime 1790121112 for this id.
    expect(Math.abs(createTimeFromId("7688511584326454549") - 1790121112)).toBeLessThan(30);
    expect(createTimeFromId("7680670358847999252")).toBe(Math.floor(7680670358847999252 / 2 ** 32));
    expect(createTimeFromId("abc")).toBe(0);
  });

  it("reads every video with its whole caption, its date, a valid cover and the account's name", () => {
    const read = parseCreatorEmbed(EMBED, "inmo.ejemplo", WINDOW);
    expect(read).toMatchObject({ exists: true, failure: null, nickname: "Inmobiliaria Ejemplo Mvd" });
    // The row without a numeric id is dropped.
    expect(read.posts.map(post => post.id)).toEqual(["7680670358847999252", "7688511584326454549", "7673622265199676693"]);
    const [first, second, third] = read.posts;
    expect(first).toMatchObject({
      source: "tiktok",
      url: "https://www.tiktok.com/@inmo.ejemplo/video/7680670358847999252",
      author: { uniqueId: "inmo.ejemplo", nickname: "Inmobiliaria Ejemplo Mvd", secUid: "" },
      cover: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/a~tplv-tiktokx-origin.image?x-expires=1790463600&x-signature=a",
      hashtags: ["alquiler", "montevideo", "cordon"],
    });
    expect(first!.lines[0]).toContain("Precio: $30.000");
    expect(second!.createTime).toBe(createTimeFromId("7688511584326454549"));
    // "not-a-url" is not a cover.
    expect(third!.cover).toBeNull();
  });

  it("is read to the end when the account shows fewer videos than a page", () => {
    expect(parseCreatorEmbed(EMBED, "inmo.ejemplo", WINDOW).exhausted).toBe(true);
    const videos = Array.from({ length: 10 }, (_, i) => ({ id: String(7688511584326454549n - BigInt(i) * 10n ** 13n), desc: `Alquiler ${i}`, authorUniqueId: "inmo.ejemplo" }));
    const page = (list: unknown[]) => `<script id="__FRONTITY_CONNECT_STATE__">${JSON.stringify({ source: { data: { "/embed/@inmo.ejemplo": { pageName: "creator", userInfo: { uniqueId: "inmo.ejemplo" }, videoList: list } } } })}</script>`;
    // Ten recent videos: the account may have more inside the window.
    expect(parseCreatorEmbed(page(videos), "inmo.ejemplo", WINDOW).exhausted).toBe(false);
    // Three old ones may be pinned; four are past the window.
    const old = (n: number) => videos.map((video, i) => (i < n ? { ...video, id: "7600000000000000000" } : video));
    expect(parseCreatorEmbed(page(old(3)), "inmo.ejemplo", WINDOW).exhausted).toBe(false);
    expect(parseCreatorEmbed(page(old(4)), "inmo.ejemplo", WINDOW).exhausted).toBe(true);
  });

  it("tells an account that does not exist from a page it could not read", () => {
    expect(parseCreatorEmbed(ERROR_PAGE, "nadie.aca", WINDOW)).toMatchObject({ exists: false, exhausted: true, failure: null, posts: [] });
    expect(parseCreatorEmbed("<html>challenge</html>", "x", WINDOW)).toMatchObject({ exists: null, exhausted: false, failure: "sin estado en la página" });
    expect(parseCreatorEmbed('<script id="__FRONTITY_CONNECT_STATE__">{no json</script>', "x", WINDOW).failure).toBe("estado ilegible");
  });

  it("reads accounts one after another, and stops after five network failures in a row", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("@inmo.ejemplo")) return new Response(EMBED, { status: 200 });
      if (url.endsWith("@nadie.aca")) return new Response(ERROR_PAGE, { status: 400 });
      throw new TypeError("fetch failed");
    });
    const wait = vi.fn(async () => undefined);
    const plan = { accounts: ["inmo.ejemplo", "nadie.aca", "a1", "a2", "a3", "a4", "a5", "a6", "bad handle!"], minCreateTime: WINDOW, gapMs: 2_000, budgetMs: 60_000 };
    const reads = await readCreatorEmbeds(plan, fetchImpl as unknown as typeof fetch, wait);
    expect(reads.get("inmo.ejemplo")!.posts).toHaveLength(3);
    expect(reads.get("nadie.aca")).toMatchObject({ exists: false, failure: null });
    expect(reads.get("a1")!.failure).toBe("red: TypeError");
    expect([...reads.keys()]).toEqual(["inmo.ejemplo", "nadie.aca", "a1", "a2", "a3", "a4", "a5"]);
    expect(wait).toHaveBeenCalledWith(2_000);
    expect(String(fetchImpl.mock.calls[0]![0])).toBe("https://www.tiktok.com/embed/@inmo.ejemplo");
  });
});

// --- The harvester with the embed ------------------------------------------------------------------

const store = (accounts: TiktokAccountRow[]): TiktokStore & { state: { accounts: TiktokAccountRow[]; posts: TiktokPostRow[] } } => {
  const state = { accounts, posts: [] as TiktokPostRow[] };
  return {
    state,
    loadAccounts: async () => state.accounts,
    saveAccounts: async rows => { state.accounts = rows; },
    loadPosts: async () => new Map(),
    savePosts: async rows => { state.posts.push(...rows); },
  };
};
const row = (uniqueId: string): TiktokAccountRow => ({ uniqueId, secUid: "", nickname: uniqueId, firstSeen: "2026-09-01", lastReadAt: null, lastPostAt: null, published: 1, reads: 0, note: null });
const noLists = vi.fn(async (_plan: ListPlan): Promise<ListResults> => ({ launched: true, note: "", tags: new Map(), accounts: new Map(), videos: new Map() }));

describe("harvestTiktok reads its accounts from the creator embed", () => {
  it("publishes the adverts of an account the browser never listed, and a missing account does not keep the run partial", async () => {
    const s = store([row("inmo.ejemplo"), row("nadie.aca")]);
    const readAccounts = vi.fn(async () => new Map([
      ["inmo.ejemplo", parseCreatorEmbed(EMBED, "inmo.ejemplo", WINDOW)],
      ["nadie.aca", parseCreatorEmbed(ERROR_PAGE, "nadie.aca", WINDOW)],
    ]));
    const run = await harvestTiktok("full", 40, {
      readAccounts, readLists: noLists, store: s, now: () => new Date("2026-09-23T05:00:00.000Z"), geocode: async () => ({ point: null, query: null, tried: 0 }),
      env: { RENTALS_TIKTOK_TAGS: "", RENTALS_TIKTOK_ACCOUNTS: "", RENTALS_TIKTOK_PROXY: "" },
    });
    // No hashtags and no manual videos: no browser at all.
    expect(noLists).not.toHaveBeenCalled();
    expect(run.listings.map(listing => listing.price).sort()).toEqual([22000, 24000, 30000]);
    expect(run.complete).toBe(true);
    expect(run.note).toContain("2 de 2 cuentas leídas");
    expect(run.note).not.toContain("sin proxy");
    expect(s.state.accounts.find(a => a.uniqueId === "inmo.ejemplo")).toMatchObject({ reads: 1, nickname: "Inmobiliaria Ejemplo Mvd", note: null });
    expect(s.state.accounts.find(a => a.uniqueId === "nadie.aca")).toMatchObject({ reads: 0, note: "no existe en TikTok" });
  });

  it("is partial and says so when an account did not answer", async () => {
    const readAccounts = vi.fn(async () => new Map([["inmo.ejemplo", { posts: [], pages: 0, exhausted: false, failure: "HTTP 429", exists: null, nickname: "" }]]));
    const run = await harvestTiktok("full", 40, {
      readAccounts, readLists: noLists, store: store([row("inmo.ejemplo")]), now: () => new Date("2026-09-23T05:00:00.000Z"),
      env: { RENTALS_TIKTOK_TAGS: "", RENTALS_TIKTOK_ACCOUNTS: "" },
    });
    expect(run).toMatchObject({ ok: false, complete: false });
    expect(run.note).toContain("0 de 1 cuenta leídas, 1 sin respuesta");
  });
});
