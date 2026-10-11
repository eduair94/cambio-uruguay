import type { Browser } from "puppeteer-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrollFacebookList } from "../../classes/facebook/browser";
import { FB_VEHICLES_CATEGORY } from "../../classes/autos/sources/facebook";
import { FB_VEHICLE_LISTS, readFacebookVehicles } from "../../classes/autos/sources/facebookBrowser";
import { marketplaceListUrl } from "../../classes/facebook/search";

vi.mock("../../classes/facebook/browser", async importOriginal => ({
  ...(await importOriginal<typeof import("../../classes/facebook/browser")>()),
  scrollFacebookList: vi.fn(),
  readFacebookPageTexts: vi.fn(async () => []),
  sleep: vi.fn(async () => undefined),
}));

const HOUR = 3_600_000;
/** A GraphQL body with one card per [id, hours since it was published, category (vehicles by default)]. */
type Card = [string, number] | [string, number, string];
const body = (...cards: Card[]) => `for (;;);${JSON.stringify({ data: { edges: cards.map(([id, hoursAgo, category]) => ({ node: { listing: {
  id, marketplace_listing_title: "Toyota Corolla 2015", marketplace_listing_category_id: category ?? FB_VEHICLES_CATEGORY,
  listing_price: { amount: "15000.00" }, creation_time: Math.floor((Date.now() - hoursAgo * HOUR) / 1000),
} } })) } })}`;
const ids = (from: number, count: number, hoursAgo: number): Array<[string, number]> =>
  Array.from({ length: count }, (_, index) => [String(1_000_000 + from + index), hoursAgo]);

/** A list that delivers `first` on load and then each batch, honouring the caller's `enough`. */
const list = (first: Card[], ...batches: Card[][]) =>
  async (_browser: Browser, _url: string, options: Parameters<typeof scrollFacebookList>[2]) => {
    options.onText(body(...first));
    const initial = options.count();
    let scrolls = 0;
    for (const batch of batches) {
      if (options.enough?.()) break;
      options.onText(body(...batch));
      scrolls++;
    }
    const satisfied = !!options.enough?.();
    return { scrolls, exhausted: !satisfied, satisfied, initial };
  };

const browser = { disconnect: vi.fn() } as unknown as Browser;
const base = {
  queries: [] as string[],
  query: { maxScrolls: 20, stagnantRounds: 5 },
  itemIds: async () => [],
  itemGapMs: 0,
  maxDurationMs: 60_000,
  lockWaitMs: 0,
  connect: async () => browser,
  lock: async () => () => undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(scrollFacebookList).mockReset();
});

describe("readFacebookVehicles", () => {
  it("reads the hourly feed until it reaches back far enough, not a fixed number of screens", async () => {
    vi.mocked(scrollFacebookList).mockImplementationOnce(list(ids(0, 24, 0.5), ids(24, 24, 3), ids(48, 24, 7), ids(72, 24, 9)));
    const read = await readFacebookVehicles({ ...base, feed: { maxScrolls: 40, stagnantRounds: 6, reachBackHours: 6 } });
    // The batch of 7-hour-old cards is the first past the 6 h reach-back: one more would be waste.
    expect(read.cards).toHaveLength(72);
    expect(read).toMatchObject({ lists: 1, exhausted: 1, stalled: 0, busy: false });
    expect(vi.mocked(scrollFacebookList).mock.calls[0][2]).toMatchObject({ maxScrolls: 40, stagnantRounds: 6 });
  });

  it("does not stop on a handful of old cards Facebook suggests near the top", async () => {
    vi.mocked(scrollFacebookList).mockImplementationOnce(list([...ids(0, 20, 0.2), ...ids(20, 4, 400)], ids(24, 24, 2)));
    const read = await readFacebookVehicles({ ...base, feed: { maxScrolls: 40, stagnantRounds: 6, reachBackHours: 6 } });
    expect(read.cards).toHaveLength(48);
  });

  it("stops scrolling lists after two full first pages that never grew, but still opens item pages", async () => {
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(ids(0, 24, 1), ids(24, 24, 2)))
      .mockImplementationOnce(list(ids(100, 24, 1)))
      .mockImplementationOnce(list(ids(200, 24, 1)));
    const itemIds = vi.fn(async () => ["1000000"]);
    const read = await readFacebookVehicles({
      ...base, itemIds, feed: { maxScrolls: 150, stagnantRounds: 8 }, queries: ["toyota", "chevrolet", "fiat", "renault"],
    });
    expect(scrollFacebookList).toHaveBeenCalledTimes(3);
    expect(read).toMatchObject({ lists: 3, stalled: 2 });
    expect(read.note).toContain("dos listas seguidas");
    expect(itemIds).toHaveBeenCalled();
    expect(read.pages).toBe(4);
  });

  it("counts the feed's first page with its suggested items when telling the throttle", async () => {
    // 17 vehicles and 3 cards of other categories: the real first page of the feed (2026-10-09).
    const firstPage = (from: number): Card[] => [...ids(from, 17, 1), ...ids(from + 17, 3, 1).map(([id]) => [id, 1, "1583634935226685"] as Card)];
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(firstPage(0)))
      .mockImplementationOnce(list(firstPage(100)));
    const read = await readFacebookVehicles({ ...base, feed: { maxScrolls: 150, stagnantRounds: 10 }, queries: ["toyota", "fiat"] });
    expect(read).toMatchObject({ lists: 2, stalled: 2 });
    // Only the vehicles are kept.
    expect(read.cards).toHaveLength(34);
  });

  it("a short search is not the throttle", async () => {
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(ids(0, 24, 1), ids(24, 24, 2)))
      .mockImplementationOnce(list(ids(100, 6, 1)))
      .mockImplementationOnce(list(ids(200, 3, 1)))
      .mockImplementationOnce(list(ids(300, 24, 1), ids(324, 10, 1)));
    const read = await readFacebookVehicles({ ...base, feed: { maxScrolls: 150, stagnantRounds: 8 }, queries: ["alfa romeo", "lada", "toyota"] });
    expect(read).toMatchObject({ lists: 4, stalled: 0, note: null });
  });

  it("reads the deep lists after the feed and before the brand searches", async () => {
    vi.mocked(scrollFacebookList).mockImplementation(list(ids(0, 20, 1), ids(20, 5, 1)));
    await readFacebookVehicles({
      ...base, feed: { maxScrolls: 150, stagnantRounds: 10 }, lists: FB_VEHICLE_LISTS.slice(0, 2), list: { maxScrolls: 40, stagnantRounds: 6 }, queries: ["toyota"],
    });
    const calls = vi.mocked(scrollFacebookList).mock.calls;
    expect(calls.map(call => call[1])).toEqual([
      "https://www.facebook.com/marketplace/montevideo/vehicles?sortBy=creation_time_descend",
      "https://www.facebook.com/marketplace/montevideo/vehicles",
      "https://www.facebook.com/marketplace/montevideo/vehicles?minPrice=1&maxPrice=8000",
      "https://www.facebook.com/marketplace/montevideo/search?query=toyota",
    ]);
    expect(calls[1][2]).toMatchObject({ maxScrolls: 40 });
    expect(calls[3][2]).toMatchObject({ maxScrolls: 20 });
  });

  it("stops a brand search that only repeats what the run has, but never the feed", async () => {
    vi.mocked(scrollFacebookList)
      // The feed: never cut, whatever it repeats.
      .mockImplementationOnce(list(ids(0, 20, 1), ids(20, 20, 1), ids(40, 20, 1)))
      // A brand search that re-delivers the feed for two rounds and only then brings new cars.
      .mockImplementationOnce(list(ids(0, 20, 1), ids(20, 20, 1), ids(40, 20, 1), ids(100, 20, 1)));
    const read = await readFacebookVehicles({
      ...base, feed: { maxScrolls: 150, stagnantRounds: 10 }, queries: ["toyota"], runNovelty: { rounds: 2, minNew: 1 },
    });
    expect(read.cards).toHaveLength(60);
    expect(read).toMatchObject({ lists: 2, stalled: 0 });
  });

  it("splits the vehicles by price and reads the interior from its own anchors", () => {
    expect(FB_VEHICLE_LISTS.filter(list => list.params?.minPrice !== undefined)).toHaveLength(4);
    expect(FB_VEHICLE_LISTS.filter(list => list.params?.minYear !== undefined || list.params?.maxYear !== undefined)
      .map(list => marketplaceListUrl(list).split("?")[1])).toEqual(["maxYear=2005", "minYear=2006&maxYear=2012", "minYear=2013&maxYear=2018", "minYear=2019"]);
    expect(FB_VEHICLE_LISTS.map(list => list.location)).toEqual(expect.arrayContaining(["rivera", "salto", "maldonado", "colonia-del-sacramento"]));
    expect(FB_VEHICLE_LISTS.filter(list => list.category === "vehicles")).toHaveLength(13);
    expect(FB_VEHICLE_LISTS.filter(list => !list.category).map(list => list.query)).toEqual(["camioneta", "auto", "pick up", "utilitario", "vendo auto", "furgon"]);
  });

  it("leaves Facebook alone while another job holds the profile", async () => {
    const connect = vi.fn(async () => browser);
    const read = await readFacebookVehicles({ ...base, connect, lock: async () => null, feed: { maxScrolls: 40, stagnantRounds: 6 } });
    expect(connect).not.toHaveBeenCalled();
    expect(read).toMatchObject({ busy: true, cards: [], lists: 0 });
  });

  it("ends on a login page and always releases the profile", async () => {
    const { FacebookSessionError } = await import("../../classes/facebook/browser");
    vi.mocked(scrollFacebookList).mockRejectedValueOnce(new FacebookSessionError("la sesión de Facebook no es válida"));
    const released = vi.fn();
    const read = await readFacebookVehicles({ ...base, lock: async () => released, feed: { maxScrolls: 40, stagnantRounds: 6 } });
    expect(read).toMatchObject({ sessionLost: true });
    expect(released).toHaveBeenCalledTimes(1);
    expect(browser.disconnect).toHaveBeenCalled();
  });
});
