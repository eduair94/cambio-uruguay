import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { reelsFromFacebookHtml } from "../../classes/rentals/sources/social/facebookreels/page";
import { facebookReelsPages, harvestFacebookReelsRun } from "../../classes/rentals/sources/social/facebookreels";
import type { FacebookReelsPlan, FacebookReelsResults } from "../../classes/rentals/sources/social/facebookreels/browser";
import type { SocialPostRow } from "../../classes/rentals/sources/social/store";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", `${name}.html`), "utf8");
const NOW = new Date("2026-09-24T05:00:00.000Z");

describe("Facebook Reels, logged out", () => {
  it("reads each video story once: caption, author, reel URL, date and thumbnail; a photo post is not a reel", () => {
    const posts = reelsFromFacebookHtml(fixture("facebook-reels-search"));
    expect(posts.map(p => p.id)).toEqual(["1696598655805785", "122181646544901235", "4545717008976910"]);
    expect(posts[0]).toMatchObject({
      source: "facebookreels", url: "https://www.facebook.com/reel/1585970963272286/", createTime: 1789418715,
      author: { uniqueId: "AlagoaNegociosInmobiliarios", nickname: "Alagoa Negocios Inmobiliarios", secUid: "100063" },
      cover: "https://scontent-eze1-2.xx.fbcdn.net/v/t51/a.jpg", hashtags: ["alquiler", "pocitos"],
    });
    expect(posts[0]!.lines[0]).toBe("🏡ALQUILER $ 18.000 | Pocitos | Mono ambiente luminoso al contra frente");
    // `people/<name>/<id>/` names the account by its id.
    expect(posts[1]!.author).toEqual({ uniqueId: "61577037072561", nickname: "Inmobiliaria en Montevideo", secUid: "61577037072561" });
    expect(reelsFromFacebookHtml("<html><title>Facebook</title></html>")).toEqual([]);
  });

  it("builds its pages from the configured searches and hashtags", () => {
    expect(facebookReelsPages({ RENTALS_FBREELS_QUERIES: "alquiler montevideo, alquiler cordón", RENTALS_FBREELS_TAGS: "#alquilermontevideo" })).toEqual([
      "https://www.facebook.com/watch/search/?q=alquiler%20montevideo",
      "https://www.facebook.com/watch/search/?q=alquiler%20cord%C3%B3n",
      "https://www.facebook.com/hashtag/alquilermontevideo",
    ]);
    expect(facebookReelsPages({}).length).toBeGreaterThanOrEqual(12);
  });

  it("publishes the Uruguayan reels, refuses the Dominican one and leaves out the ones past the window", async () => {
    const reader = vi.fn(async (plan: FacebookReelsPlan): Promise<FacebookReelsResults> => ({
      launched: true, note: "", pages: new Map(plan.pages.map(url => [url, { posts: reelsFromFacebookHtml(fixture("facebook-reels-search")), failure: null }])),
    }));
    const saved: SocialPostRow[] = [];
    const posts = { loadPosts: async () => new Map(), loadPostsByAuthors: async () => new Map(), savePosts: async (rows: SocialPostRow[]) => { saved.push(...rows); } };
    const run = await harvestFacebookReelsRun("full", 40, {
      readFacebookReels: reader, posts, geocode: async () => ({ point: null, query: null, tried: 0 }), locateZone: () => null, now: () => NOW,
      env: { RENTALS_FBREELS_QUERIES: "alquiler montevideo", RENTALS_FBREELS_TAGS: "" },
    });
    expect(reader.mock.calls[0]![0].pages).toEqual(["https://www.facebook.com/watch/search/?q=alquiler%20montevideo"]);
    expect(run.result).toMatchObject({ key: "facebookreels", ok: true, complete: false });
    expect(run.result.listings.map(r => r.listingId)).toEqual(["facebookreels:1696598655805785"]);
    expect(run.result.listings[0]).toMatchObject({ price: 18000, neighborhood: "Pocitos", department: "Montevideo", url: "https://www.facebook.com/reel/1585970963272286/" });
    expect(saved.find(r => r.id === "4545717008976910")).toMatchObject({ rejected: "sin evidencia de Uruguay" });
    expect(run.result.note).toContain("1 aviso de 3 reels");
    expect(run.result.note).toContain("1 de 1 página leída");
  });

  it("does nothing in the hourly run or when disabled, and is not ok when every page failed", async () => {
    const reader = vi.fn();
    const posts = { loadPosts: async () => new Map(), loadPostsByAuthors: async () => new Map(), savePosts: async () => {} };
    const deps = { readFacebookReels: reader, posts, geocode: async () => ({ point: null, query: null, tried: 0 }), locateZone: () => null, now: () => NOW };
    expect((await harvestFacebookReelsRun("fast", 40, { ...deps, env: {} })).result).toMatchObject({ key: "facebookreels", ok: true, listings: [], note: "sólo en la corrida completa" });
    expect((await harvestFacebookReelsRun("full", 40, { ...deps, env: { RENTALS_FBREELS_ENABLED: "0" } })).result).toMatchObject({ note: "deshabilitado por configuración" });
    expect(reader).not.toHaveBeenCalled();
    const failing = vi.fn(async (plan: FacebookReelsPlan): Promise<FacebookReelsResults> => ({
      launched: true, note: "", pages: new Map(plan.pages.map(url => [url, { posts: [], failure: "login" }])),
    }));
    expect((await harvestFacebookReelsRun("full", 40, { ...deps, readFacebookReels: failing, env: { RENTALS_FBREELS_QUERIES: "x", RENTALS_FBREELS_TAGS: "" } })).result)
      .toMatchObject({ ok: false, complete: false });
  });
});
