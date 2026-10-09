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
  perSearch: perSearch.map((cards) => cards.map((item) => item.id)),
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

  it("does not open the browser when the budget leaves no search", async () => {
    const reader = vi.fn<typeof readMarketplaceSearches>();
    vi.stubGlobal("fetch", vi.fn());
    await harvestFacebookMarketplace([olla], 0, { reader });
    expect(reader).not.toHaveBeenCalled();
  });
});
