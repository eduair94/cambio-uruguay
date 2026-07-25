import { afterEach, describe, expect, it, vi } from "vitest";
import { harvestFacebookMarketplace } from "../../classes/chairs/sources/facebook";

/**
 * The Marketplace scraper itself lives in the trustpilot repo (it drives the logged-in Chrome).
 * What this repo owns is the contract with it: what we send, what we accept back, and what we
 * refuse to publish. Those are the rules tested here.
 */
const respondWith = (payload: unknown): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }))
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CHAIR_FB_ENABLED;
});

describe("harvestFacebookMarketplace", () => {
  it("maps a Marketplace listing into a used-condition offer", async () => {
    respondWith({
      ok: true,
      results: [
        {
          id: "123",
          title: "Silla de escritorio ergonómica",
          url: "https://www.facebook.com/marketplace/item/123/",
          price: { amount: 4500, currency: "UYU" },
          image: "https://scontent.example/img.jpg",
          location: "Montevideo",
        },
      ],
    });

    const result = await harvestFacebookMarketplace();
    expect(result.ok).toBe(true);
    expect(result.listings).toHaveLength(1);
    const [listing] = result.listings;
    expect(listing!.source).toBe("facebook");
    expect(listing!.channel).toBe("classifieds");
    // Marketplace is second-hand unless the seller says otherwise — never priced as retail-new.
    expect(listing!.condition).toBe("used");
    expect(listing!.price).toBe(4500);
  });

  it("keeps a listing the seller marked as new", async () => {
    respondWith({
      ok: true,
      results: [
        {
          id: "9",
          title: "Silla gamer nueva en caja",
          price: { amount: 8000, currency: "UYU" },
          condition: "Nuevo",
        },
      ],
    });
    const result = await harvestFacebookMarketplace();
    expect(result.listings[0]!.condition).toBe("new");
  });

  it("drops what is not a desk chair and what has no usable price", async () => {
    respondWith({
      ok: true,
      results: [
        { id: "1", title: "Silla de comedor de madera", price: { amount: 1500, currency: "UYU" } },
        { id: "2", title: "Silla de escritorio", price: { amount: 0, currency: "UYU" } },
        { id: "3", title: "Silla de escritorio", price: { amount: 3000, currency: "EUR" } },
      ],
    });
    const result = await harvestFacebookMarketplace();
    expect(result.listings).toEqual([]);
  });

  it("reports the outage instead of pretending Marketplace is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 }))
    );
    const result = await harvestFacebookMarketplace();
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/no disponible/);
  });

  it("can be switched off without failing the run", async () => {
    process.env.CHAIR_FB_ENABLED = "0";
    const result = await harvestFacebookMarketplace();
    expect(result.ok).toBe(true);
    expect(result.listings).toEqual([]);
  });
});
