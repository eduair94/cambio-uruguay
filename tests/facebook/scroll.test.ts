import type { Browser, HTTPResponse } from "puppeteer-core";
import { describe, expect, it, vi } from "vitest";
import { scrollFacebookList } from "../../classes/facebook/browser";

/**
 * A fake tab whose every scroll makes Facebook send the next batch over GraphQL, as the real grid
 * does. `batches[0]` is what the page embeds on load.
 */
function fakeBrowser(batches: string[][]) {
  let respond: ((response: HTTPResponse) => void) | null = null;
  let scrolled = 0;
  const page = {
    on: (_: string, handler: (response: HTTPResponse) => void) => { respond = handler; },
    off: () => undefined,
    setViewport: async () => undefined,
    goto: async () => undefined,
    url: () => "https://www.facebook.com/marketplace/montevideo/vehicles",
    waitForSelector: async () => null,
    close: vi.fn(async () => undefined),
    // Two kinds of call: reading the embedded scripts (on load) and scrolling (each round).
    evaluate: async (fn: () => unknown) => {
      if (String(fn).includes("querySelectorAll")) return [JSON.stringify(batches[0] ?? [])];
      scrolled++;
      const batch = batches[scrolled];
      if (batch) respond?.({ url: () => "https://www.facebook.com/api/graphql/", text: async () => JSON.stringify(batch) } as unknown as HTTPResponse);
      return undefined;
    },
  };
  return { browser: { newPage: async () => page } as unknown as Browser, page };
}

const collect = () => {
  const seen = new Set<string>();
  return { seen, onText: (text: string) => { for (const id of JSON.parse(text) as string[]) seen.add(id); }, count: () => seen.size };
};

describe("scrollFacebookList", () => {
  it("scrolls until Facebook stops sending, reading cards from the stream", async () => {
    const { browser, page } = fakeBrowser([["1", "2"], ["3"], ["4"], [], []]);
    const list = collect();
    const run = await scrollFacebookList(browser, "https://x", { ...list, maxScrolls: 50, stagnantRounds: 2, deadline: Date.now() + 60_000, gapMs: 0 });
    expect([...list.seen]).toEqual(["1", "2", "3", "4"]);
    expect(run).toMatchObject({ initial: 2, exhausted: true, satisfied: false, scrolls: 4 });
    expect(page.close).toHaveBeenCalled();
  });

  it("stops as soon as the caller has enough, which is not the list running out", async () => {
    const { browser } = fakeBrowser([["1"], ["2"], ["3"], ["4"], ["5"]]);
    const list = collect();
    const run = await scrollFacebookList(browser, "https://x", {
      ...list, maxScrolls: 50, stagnantRounds: 2, deadline: Date.now() + 60_000, gapMs: 0, enough: () => list.seen.has("3"),
    });
    expect([...list.seen]).toEqual(["1", "2", "3"]);
    expect(run).toMatchObject({ exhausted: false, satisfied: true, scrolls: 2 });
  });

  it("respects the scroll cap", async () => {
    const { browser } = fakeBrowser([["1"], ["2"], ["3"], ["4"], ["5"]]);
    const list = collect();
    const run = await scrollFacebookList(browser, "https://x", { ...list, maxScrolls: 2, stagnantRounds: 2, deadline: Date.now() + 60_000, gapMs: 0 });
    expect(list.seen.size).toBe(3);
    expect(run).toMatchObject({ exhausted: false, satisfied: false, scrolls: 2 });
  });
});
