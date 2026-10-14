import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketplaceCard } from "../../classes/facebook/cards";
import type { MarketplaceSearchRead, readMarketplaceSearches } from "../../classes/facebook/search";
import { harvestFacebookMarketplace, RETAIL_FB_BUDGET } from "../../classes/retail/sources/facebook";
import type { CategorySpec } from "../../classes/retail/types";

/** Marketplace through the profile browser (classes/facebook/search.ts); the bridge fallback is in tests/chairs/facebook.test.ts. */
const spec = (key: string, accept: RegExp, fbQueries: string[]): CategorySpec => ({ key, accept: (title) => accept.test(title.toLowerCase()), fbQueries });
const card = (id: string, title: string, amount = 4500, currency: "UYU" | "USD" = "UYU"): MarketplaceCard => ({
  id, title, url: `https://www.facebook.com/marketplace/item/${id}/`, price: { amount, currency },
  image: null, location: "Montevideo, Uruguay", seller: "Juana Pérez", categoryId: null,
});
const read = (perSearch: MarketplaceCard[][], extra: Partial<MarketplaceSearchRead> = {}): MarketplaceSearchRead => ({
  cards: [...new Map(perSearch.flat().map((item) => [item.id, item])).values()],
  perSearch: perSearch.map((cards) => cards.map((item) => item.id)), fresh: perSearch.map((cards) => cards.length), spent: 0,
  reads: perSearch.flat().length, lists: perSearch.length, exhausted: perSearch.length, failed: 0, stalled: 0,
  sessionLost: false, unreachable: false, busy: false, note: null, ...extra,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("harvestFacebookMarketplace por el navegador", () => {
  const heladera = spec("heladera", /heladera/, ["heladera", "heladera con freezer"]);
  const olla = spec("olla", /olla/, ["ollas"]);

  it("classifies each card under the category whose search found it, and never copies the seller", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([
      [card("1", "Heladera Patrick 300 L", 9000), card("2", "Juego de ollas")],
      [card("3", "Juego de 5 ollas", 2500)],
      [card("4", "Heladera con freezer", 300, "USD")],
    ]));
    const result = await harvestFacebookMarketplace([heladera, olla], Infinity, { reader });
    expect(result.ok).toBe(true);
    // Interleaved, like the bridge plan: a budget cut costs every category its tail.
    expect(reader.mock.calls[0][0].searches.map((search) => search.query)).toEqual(["heladera", "ollas", "heladera con freezer"]);
    expect(result.listings.map((listing) => [listing.listingId, listing.attributes.CATEGORY_SPEC])).toEqual([
      ["fb:1", "heladera"], ["fb:3", "olla"], ["fb:4", "heladera"],
    ]);
    expect(result.listings.every((listing) => listing.sellerName === "Facebook Marketplace" && listing.condition === "used")).toBe(true);
    expect(result.listings.find((listing) => listing.listingId === "fb:4")).toMatchObject({ price: 300, currency: "USD" });
    expect(result.note).toMatch(/^3 publicaciones; navegador: 4 tarjetas, 3 búsquedas/);
  });

  it("reads fewer pages per search in the hourly pass", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([[]]));
    await harvestFacebookMarketplace([olla], Infinity, { reader });
    await harvestFacebookMarketplace([olla], Infinity, { reader, fast: true });
    expect(reader.mock.calls[0][0]).toMatchObject({ owner: "retail", maxScrolls: RETAIL_FB_BUDGET.daily.maxScrolls, stallFloor: 20, stopOnStalls: false });
    expect(reader.mock.calls[1][0]).toMatchObject({ maxScrolls: RETAIL_FB_BUDGET.fast.maxScrolls });
  });

  it("reads a category's first wording again in each price band, after the wordings", async () => {
    const monopatin: CategorySpec = { ...spec("monopatin", /monopat/, ["monopatin electrico", "scooter electrico"]), fbPriceBands: [[1, 15_000], [15_000, 200_000]] };
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([
      [], [], [], [card("9", "Monopatín eléctrico Xiaomi 4 Pro", 24_000)], [],
    ]));
    const result = await harvestFacebookMarketplace([monopatin, olla], Infinity, { reader });
    expect(reader.mock.calls[0][0].searches).toEqual([
      { location: "montevideo", query: "monopatin electrico" },
      { location: "montevideo", query: "ollas" },
      { location: "montevideo", query: "scooter electrico" },
      { location: "montevideo", query: "monopatin electrico", params: { minPrice: 1, maxPrice: 15_000 } },
      { location: "montevideo", query: "monopatin electrico", params: { minPrice: 15_000, maxPrice: 200_000 } },
    ]);
    // A band's cards belong to the category whose band found them.
    expect(result.listings.map((listing) => [listing.listingId, listing.attributes.CATEGORY_SPEC])).toEqual([["fb:9", "monopatin"]]);
  });

  it("reads deeper only in the daily run that asks for it", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([[]]));
    const depth = { maxScrolls: 30, minutes: 15 };
    await harvestFacebookMarketplace([olla], Infinity, { reader, depth });
    await harvestFacebookMarketplace([olla], Infinity, { reader, depth, fast: true });
    expect(reader.mock.calls[0][0]).toMatchObject({
      maxScrolls: 30, maxDurationMs: 15 * 60_000, stagnantRounds: RETAIL_FB_BUDGET.deepStagnantRounds,
      lockWaitMs: RETAIL_FB_BUDGET.daily.lockWaitMinutes * 60_000,
    });
    expect(reader.mock.calls[1][0]).toMatchObject({
      maxScrolls: RETAIL_FB_BUDGET.fast.maxScrolls, maxDurationMs: RETAIL_FB_BUDGET.fast.minutes * 60_000, stagnantRounds: RETAIL_FB_BUDGET.stagnantRounds,
    });
  });

  it("does not send a price band to the bridge, which takes no filter", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ ok: true, results: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }));
    const banded: CategorySpec = { ...olla, fbPriceBands: [[1, 5_000]] };
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([], { lists: 0, unreachable: true, note: "inaccesible" }));
    await harvestFacebookMarketplace([banded], Infinity, { reader });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("q=ollas");
  });

  it("skips Facebook while another job holds the profile, without touching the bridge", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([], { lists: 0, busy: true, note: "ocupado" }));
    const result = await harvestFacebookMarketplace([olla], Infinity, { reader });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, listings: [], note: "no disponible: ocupado" });
  });

  it("falls back to the bridge, saying why, when the browser cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, results: [
      { id: "9", title: "Juego de ollas", price: { amount: 1200, currency: "UYU" }, seller: "Juana Pérez" },
    ] }), { status: 200, headers: { "content-type": "application/json" } })));
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([], { lists: 0, unreachable: true, note: "navegador del perfil inaccesible" }));
    const result = await harvestFacebookMarketplace([olla], Infinity, { reader });
    expect(result.listings.map((listing) => [listing.listingId, listing.sellerName])).toEqual([["fb:9", "Facebook Marketplace"]]);
    expect(result.note).toBe("navegador sin lecturas (navegador del perfil inaccesible); 1 publicaciones");
  });

  it("reads the categories that publish a used band first: Marketplace only feeds that side", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([[], [], []]));
    const colchon = { ...spec("colchon", /colchon/, ["colchon"]), usedOk: false };
    await harvestFacebookMarketplace([colchon, heladera, olla], Infinity, { reader });
    expect(reader.mock.calls[0][0].searches.map((search) => search.query)).toEqual(["heladera", "ollas", "colchon", "heladera con freezer"]);
  });

  // 2026-10-11: with 47 searches planned, a daily cap of 26 and an hourly one of 13, every run read
  // the same first searches and twelve equipar categories had no Marketplace offer at all.
  it("reads a different slice of a capped plan in each rotation, so every search comes up", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>(async () => read([[], []]));
    const specs = ["a", "b", "c", "d", "e"].map((key) => spec(key, new RegExp(key), [key]));
    const seen = new Set<string>();
    for (const rotation of [0, 1, 2]) {
      await harvestFacebookMarketplace(specs, 2, { reader, rotation });
      for (const search of reader.mock.calls.at(-1)![0].searches) seen.add(search.query);
    }
    expect(reader.mock.calls.map((call) => call[0].searches.map((search) => search.query))).toEqual([["a", "b"], ["c", "d"], ["e", "a"]]);
    expect([...seen].sort()).toEqual(["a", "b", "c", "d", "e"]);
    // A budget that covers the plan reads it whole, from the start.
    await harvestFacebookMarketplace(specs, 60, { reader, rotation: 7 });
    expect(reader.mock.calls.at(-1)![0].searches.map((search) => search.query)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("does not open the browser when the budget leaves no search", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>();
    vi.stubGlobal("fetch", vi.fn());
    await harvestFacebookMarketplace([olla], 0, { reader });
    expect(reader).not.toHaveBeenCalled();
  });
});
