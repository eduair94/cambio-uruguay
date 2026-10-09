import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Browser } from "puppeteer-core";
import { FacebookSessionError, scrollFacebookList } from "../../classes/facebook/browser";
import { FB_RENTALS_CATEGORY, readFacebookRentals } from "../../classes/rentals/sources/facebookBrowser";

vi.mock("../../classes/facebook/browser", async importOriginal => ({
  ...(await importOriginal<typeof import("../../classes/facebook/browser")>()),
  scrollFacebookList: vi.fn(),
  sleep: vi.fn(async () => undefined),
}));

const body = (...ids: string[]) => `for (;;);${JSON.stringify({ data: { edges: ids.map(id => ({ node: { listing: {
  id, marketplace_listing_title: "Alquiler apartamento", marketplace_listing_category_id: FB_RENTALS_CATEGORY,
  listing_price: { formatted_amount: "UYU20,000", amount: "20000.00" }, is_live: true,
} } })) } })}`;
/** A list that delivers `first` on load, then each scroll's batch. */
const list = (first: string[], ...batches: string[][]) => async (_browser: Browser, _url: string, options: Parameters<typeof scrollFacebookList>[2]) => {
  options.onText(body(...first));
  const initial = options.count();
  for (const batch of batches) options.onText(body(...batch));
  return { scrolls: batches.length, exhausted: true, satisfied: false, initial };
};
const browser = { disconnect: vi.fn() } as unknown as Browser;
const plan = (queries: string[]) => ({
  searches: queries.map(query => ({ location: "montevideo", query })), maxScrolls: 150, stagnantRounds: 10, maxDurationMs: 60_000, connect: async () => browser,
});

beforeEach(() => {
  vi.clearAllMocks();
  // A queued once-implementation a test did not consume must not leak into the next.
  vi.mocked(scrollFacebookList).mockReset();
});

describe("readFacebookRentals", () => {
  it("judges each search by its own cards, not by the run's union", async () => {
    // The second search re-delivers what the first had and then grows: it is not stalled.
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(["1000001", "1000002"], ["1000003"]))
      .mockImplementationOnce(list(["1000001"], ["1000002", "1000003"]));
    const read = await readFacebookRentals(plan(["alquiler", "alquiler casa"]));
    expect(read).toMatchObject({ lists: 2, stalled: 0, note: null });
    expect(read.cards.map(card => card.id)).toEqual(["1000001", "1000002", "1000003"]);
  });

  it("stops after two searches in a row that never loaded past their first page", async () => {
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(["1000001"], ["1000002"]))
      .mockImplementationOnce(list(["1000003"]))
      .mockImplementationOnce(list(["1000004"]))
      .mockImplementationOnce(list(["1000005"], ["1000006"]));
    const read = await readFacebookRentals(plan(["a", "b", "c", "d"]));
    expect(scrollFacebookList).toHaveBeenCalledTimes(3);
    expect(read).toMatchObject({ lists: 3, stalled: 2 });
    expect(read.note).toContain("dos búsquedas seguidas");
    // What was read before the throttle is kept.
    expect(read.cards).toHaveLength(4);
  });

  it("keeps reading every search after stalls when the caller needs each first page (retail)", async () => {
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(["1000001"], ["1000002"]))
      .mockImplementationOnce(list(["1000003"]))
      .mockImplementationOnce(list(["1000004"]))
      .mockImplementationOnce(list(["1000005"], ["1000006"]));
    const read = await readFacebookRentals({ ...plan(["a", "b", "c", "d"]), stopOnStalls: false });
    expect(scrollFacebookList).toHaveBeenCalledTimes(4);
    expect(read).toMatchObject({ lists: 4, stalled: 2, note: null });
    expect(read.perSearch).toEqual([["1000001", "1000002"], ["1000003"], ["1000004"], ["1000005", "1000006"]]);
  });

  it("retries a connection blip before falling back, and says why it gave up", async () => {
    vi.mocked(scrollFacebookList).mockImplementationOnce(list(["1000001"], ["1000002"]));
    const connect = vi.fn<() => Promise<Browser>>()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(browser);
    const read = await readFacebookRentals({ ...plan(["a"]), connect });
    expect(connect).toHaveBeenCalledTimes(2);
    expect(read).toMatchObject({ lists: 1, unreachable: false });
    const down = await readFacebookRentals({ ...plan(["a"]), connect: async () => { throw new TypeError("fetch failed"); } });
    expect(down.note).toBe("navegador del perfil inaccesible (TypeError, 3 intentos)");
  });

  it("ends the run on a login page, keeping what it read; an unreachable browser reads nothing", async () => {
    vi.mocked(scrollFacebookList)
      .mockImplementationOnce(list(["1000001"], ["1000002"]))
      .mockRejectedValueOnce(new FacebookSessionError("la sesión de Facebook no es válida"));
    const read = await readFacebookRentals(plan(["a", "b", "c"]));
    expect(read).toMatchObject({ lists: 1, sessionLost: true });
    expect(read.cards).toHaveLength(2);
    expect(browser.disconnect).toHaveBeenCalled();
    const down = await readFacebookRentals({ ...plan(["a"]), connect: async () => { throw new Error("ECONNREFUSED"); } });
    expect(down).toMatchObject({ lists: 0, unreachable: true, cards: [] });
  });
});
