// The final review of feat/rentals-social (2026-09-24): each finding reproduced as a failing test first.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { harvestSocial, SOCIAL_CLAIM_DAYS } from "../../classes/rentals/sources/social";
import { parseCaption } from "../../classes/rentals/sources/social/caption";
import { factKey, resolveCopies, textKey } from "../../classes/rentals/sources/social/copies";
import { postToRawRental, type SocialPost } from "../../classes/rentals/sources/social/post";
import { processPosts } from "../../classes/rentals/sources/social/process";
import type { SocialClaim, SocialPostRow } from "../../classes/rentals/sources/social/store";
import { reelsFromFacebookHtml } from "../../classes/rentals/sources/social/facebookreels/page";
import { harvestInstagramRun, type InstagramAccountRow } from "../../classes/rentals/sources/social/instagram";
import type { InstagramPlan, InstagramResults } from "../../classes/rentals/sources/social/instagram/browser";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", `${name}.html`), "utf8");
const day = (n: number): Date => new Date(Date.UTC(2026, 8, 24 + n, 5, 0, 0));

// A network run built from captions, and a persistent claim store, for multi-run scenarios.
type Source = SocialPost["source"];
const postOf = (source: Source, id: string, text: string, handle = "a"): SocialPost =>
  ({ source, id, url: `https://example.com/${id}`, lines: [text], createTime: 1790000000, author: { uniqueId: handle, nickname: handle, secUid: "" }, cover: null, hashtags: [] });
const processedOf = (post: SocialPost) => {
  const facts = parseCaption(post.lines, []);
  return { post, facts, row: postToRawRental(post, facts, null, "2026-09-24T05:00:00.000Z"), memory: {} as SocialPostRow };
};
function runOf(source: Source, posts: SocialPost[], complete = false) {
  return async () => {
    const processed = posts.map(processedOf);
    return { result: { key: source, ok: true, complete, listings: processed.filter(p => p.row).map(p => p.row!), note: "" }, processed };
  };
}
function claimStore() {
  const rows = new Map<string, SocialClaim>();
  return {
    rows,
    loadLiveClaims: async (since: string) => new Map([...rows].filter(([, c]) => c.lastSeenAt >= since)),
    saveClaims: async (claims: SocialClaim[]) => { for (const c of claims) rows.set(c.key, c); },
    pruneClaims: async (before: string) => { for (const [k, c] of rows) if (c.lastSeenAt < before) rows.delete(k); },
  };
}
const idle = (source: Source) => async () => ({ result: { key: source, ok: true, complete: false, listings: [], note: "" }, processed: [] });
const published = (results: Array<{ listings: Array<{ listingId: string }> }>) => results.flatMap(r => r.listings.map(l => l.listingId)).sort();

const CORNER = "Alquiler 2 dormitorios en Montevideo 📍 Gaboto y La Paz $22.000";

describe("F1 — a copy takes over once the directory stops showing its claimant", () => {
  it("claims live as long as the directory shows an offer (RENTAL_STALE_DAYS), not the prune window", () => {
    const app = readFileSync(join(__dirname, "../../app/utils/rentals.ts"), "utf8");
    expect(Number(/export const RENTAL_STALE_DAYS = (\d+)/.exec(app)![1])).toBe(SOCIAL_CLAIM_DAYS);
  });

  it("hides the TikTok copy while the Instagram claimant is still visible, and publishes it the day it no longer is", async () => {
    const claims = claimStore();
    const ig = postOf("instagram", "I1", CORNER);
    const tt = postOf("tiktok", "T1", CORNER.replace("Alquiler 2", "ALQUILER 2"));
    const env = {};
    const r0 = await harvestSocial("full", 40, { runs: [idle("tiktok"), runOf("instagram", [ig]), idle("facebookreels")], claims, now: () => day(0), env });
    expect(published(r0)).toEqual(["instagram:I1"]);
    const r9 = await harvestSocial("full", 40, { runs: [runOf("tiktok", [tt]), idle("instagram"), idle("facebookreels")], claims, now: () => day(9), env });
    expect(published(r9)).toEqual([]);
    const r11 = await harvestSocial("full", 40, { runs: [runOf("tiktok", [tt]), idle("instagram"), idle("facebookreels")], claims, now: () => day(11), env });
    expect(published(r11)).toEqual(["tiktok:T1"]);
  });

  it("uses the stale-offer rule for a claimant whose network was complete today", async () => {
    const claims = claimStore();
    const tt = postOf("tiktok", "T1", CORNER);
    const ig = postOf("instagram", "I1", CORNER.replace("Alquiler 2", "ALQUILER 2"));
    await harvestSocial("full", 40, { runs: [runOf("tiktok", [tt], true), idle("instagram"), idle("facebookreels")], claims, now: () => day(0), env: {} });
    // TikTok read all of its accounts today and T1 is gone: sync_rentals drops its offer after RENTALS_STALE_OFFER_DAYS (4).
    const r5 = await harvestSocial("full", 40, { runs: [runOf("tiktok", [], true), runOf("instagram", [ig]), idle("facebookreels")], claims, now: () => day(5), env: {} });
    expect(published(r5)).toEqual(["instagram:I1"]);
  });
});

describe("F4 — an edited caption does not let the old copy back after the claim lapses", () => {
  it("keeps refreshing the claim of an owner that is still seen, even under new keys", async () => {
    const claims = claimStore();
    const tt = postOf("tiktok", "T1", CORNER);
    const ig = postOf("instagram", "I1", CORNER.replace("Alquiler 2", "ALQUILER 2"));
    const edited = postOf("tiktok", "T1", CORNER.replace("$22.000", "$21.000"));
    const runs = (t: SocialPost) => [runOf("tiktok", [t]), runOf("instagram", [ig]), idle("facebookreels")];
    expect(published(await harvestSocial("full", 40, { runs: runs(tt), claims, now: () => day(0), env: {} }))).toEqual(["tiktok:T1"]);
    for (let n = 1; n <= 22; n++) {
      const r = await harvestSocial("full", 40, { runs: runs(edited), claims, now: () => day(n), env: {} });
      expect(published(r)).toEqual(["tiktok:T1"]);
    }
  });
});

describe("F9 — an error in the copy guard never fails the rental sync", () => {
  it("returns the unguarded results when the stored claims of a flat are malformed", async () => {
    const tt = postOf("tiktok", "T1", CORNER);
    const keys = [factKey(parseCaption(tt.lines, [])), textKey(tt)] as string[];
    // Two claims on the flat's keys, owned by listings not seen today, without firstPublishedAt.
    const broken = new Map(keys.map((key, i) => [key, { key, listingId: `instagram:X${i}`, source: "instagram", lastSeenAt: day(0).toISOString() } as unknown as SocialClaim]));
    const claims = { loadLiveClaims: async () => broken, saveClaims: async () => {}, pruneClaims: async () => {} };
    const results = await harvestSocial("full", 40, { runs: [runOf("tiktok", [tt]), idle("instagram"), idle("facebookreels")], claims, now: () => day(0), env: {} });
    expect(results.map(r => r.key)).toEqual(["tiktok", "instagram", "facebookreels"]);
    const entry = { source: "tiktok" as const, listingId: "tiktok:T1", row: { listingId: "tiktok:T1" } as never, keys, createTime: 1 };
    expect(() => resolveCopies([entry], broken, day(0).toISOString())).not.toThrow();
  });
});

describe("F2 — no phone number reaches a title", () => {
  it("scrubs the title the way the description is scrubbed", () => {
    const post = postOf("instagram", "P1", "ALQUILER POCITOS 1 dormitorio $25.000 - WhatsApp 099 232 050\n📍 Charrúa y Luis Ponce");
    const row = postToRawRental(post, parseCaption(post.lines, []), null, "2026-09-24T05:00:00.000Z")!;
    expect(row.title).toBe("ALQUILER POCITOS 1 dormitorio $25.000");
    expect(row.title).not.toMatch(/\d{3} \d{3}/);
  });
});

describe("F3 — an Argentine advert is not a Montevideo one because it names Palermo", () => {
  it.each([
    "Alquiler monoambiente Palermo CABA $450.000 + expensas",
    "Alquiler 2 ambientes Palermo U$D 600",
    "Alquiler depto 3 ambientes en Belgrano, Capital Federal $780.000",
  ])("%s", text => expect(parseCaption([text], []).rejected).toBe("aviso de otro país"));

  it("keeps the Uruguayan captions that name the same words as streets or towns", () => {
    expect(parseCaption(["🤩 ALQUILER 1 DORMITORIO – RAMBLA ✅ Buenos Aires y Rambla ✅ Alquiler: $29.500 ✅ GC: $6.000 aprox."], ["ciudadvieja"]).rejected).toBeNull();
    expect(parseCaption(["Alquiler casa en Balneario Buenos Aires, Maldonado, 2 dormitorios $30.000"], []).rejected).toBeNull();
  });
});

describe("F7 — Facebook keeps the fullest copy of a repeated story", () => {
  it("does not let a truncated repeat that comes first win", () => {
    const html = fixture("facebook-reels-search");
    // Move the truncated repeat of the Alagoa story in front of the full one.
    const truncated = html.slice(html.indexOf('{"node":{"story":{"id":"UzpfSTE2OTY1","post_id":"1696598655805785","actors":[{"__typename":"User","name":"Alagoa Negocios Inmobiliarios","id":"100063","url":"https://www.facebook.com/AlagoaNegociosInmobiliarios"}],"message":{"text":"🏡ALQUILER $ 18.000 | Pocitos | Mono ambiente luminoso al contra frente"}'));
    const repeat = truncated.slice(0, truncated.indexOf("\n") );
    const swapped = html.replace(repeat, "").replace('"edges":[\n', `"edges":[\n${repeat.replace(/,$/, "")},\n`);
    const alagoa = reelsFromFacebookHtml(swapped).find(p => p.id === "1696598655805785")!;
    expect(alagoa.lines.length).toBeGreaterThan(1);
    expect(alagoa.cover).toBe("https://scontent-eze1-2.xx.fbcdn.net/v/t51/a.jpg");
  });
});

describe("F10 — a post first seen after the geocode budget ran out is geocoded on a later run", () => {
  it("geocodes a stored post whose corner was never tried", async () => {
    const post = postOf("instagram", "G1", "Alquiler 1 dormitorio en Pocitos 📍 Charrúa y Luis Ponce — Pocitos $27.500");
    post.createTime = 1790119737;
    const geocode = vi.fn(async () => ({ point: { latitude: -34.91, longitude: -56.15, address: "Charrúa & Luis Ponce" }, query: "q", tried: 1 }));
    const ctx = (remaining: number) => ({ usdUyu: 40, observedAt: "2026-09-24T05:00:00.000Z", minCreateTime: 1790000000, geocodeBudget: { remaining }, geocode, locateZone: () => "8" });
    const first = await processPosts([post], new Map(), ctx(0));
    expect(geocode).not.toHaveBeenCalled();
    const second = await processPosts([post], new Map([["G1", first.processed[0]!.memory]]), ctx(5));
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(second.processed[0]!.row).toMatchObject({ latitude: -34.91 });
  });
});

// --- Instagram (F5, F6, F8) ---------------------------------------------------------------------

const NOW = day(0);
const igPost = (id: string, handle: string, text: string, createTime = 1790119737): SocialPost => ({
  source: "instagram", id, url: `https://www.instagram.com/p/${id}/`, lines: [text], createTime, author: { uniqueId: handle, nickname: handle, secUid: "" }, cover: null, hashtags: [],
});
function stores(accounts: InstagramAccountRow[] = [], stored: SocialPostRow[] = []) {
  const state = { accounts, posts: new Map(stored.map(r => [r.id, r])) };
  return {
    state,
    accounts: { loadAccounts: async () => state.accounts, saveAccounts: async (rows: InstagramAccountRow[]) => { state.accounts = rows; } },
    posts: {
      loadPosts: async (ids: readonly string[]) => new Map([...state.posts].filter(([id]) => ids.includes(id))),
      loadPostsByAuthors: async (authors: readonly string[]) => new Map([...state.posts].filter(([, r]) => authors.includes(r.uniqueId))),
      savePosts: async (rows: SocialPostRow[]) => { for (const r of rows) state.posts.set(r.id, r); },
    },
  };
}
const noGeo = async () => ({ point: null, query: null, tried: 0 });
const account = (handle: string, status: InstagramAccountRow["status"], extra: Partial<InstagramAccountRow> = {}): InstagramAccountRow =>
  ({ handle, name: "", status, firstSeen: "2026-09-01", checkedAt: null, lastReadAt: null, lastPostAt: null, published: 0, evaluated: 0, reads: 0, note: null, ...extra });

describe("Instagram after the review", () => {
  it("F5 — memorises posts outside the window so they are not read again, and gives up on a candidate with nothing to judge", async () => {
    const s = stores([account("vieja.inmo", "candidata")]);
    const old = [igPost("OLD1xxxxxxx", "vieja.inmo", "Alquiler en Pocitos $20.000", 1780000000), igPost("OLD2xxxxxxx", "vieja.inmo", "Alquiler en Cordón $21.000", 1780000000)];
    const reader = vi.fn(async (plan: InstagramPlan): Promise<InstagramResults> => ({ launched: true, note: "",
      accounts: new Map(plan.accounts.map(h => [h, { handle: h, profile: { exists: true, name: "Vieja", codes: old.map(p => p.id) }, posts: old.filter(p => !plan.known.has(p.id)), failures: 0 }])) }));
    const deps = { readInstagram: reader, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, env: { RENTALS_INSTAGRAM_ACCOUNTS: "" }, tiktokHandles: async () => [] };
    for (let n = 0; n < 3; n++) await harvestInstagramRun("full", 40, { ...deps, now: () => day(n) });
    expect([...reader.mock.calls[1]![0].known].sort()).toEqual(["OLD1xxxxxxx", "OLD2xxxxxxx"]);
    expect(s.state.accounts[0]).toMatchObject({ handle: "vieja.inmo", status: "descartada", reads: 3 });
  });

  it("F6 — one 'not available' answer never demotes a seed or an active account", async () => {
    const s = stores([account("inmobiliariaalquilar", "semilla"), account("alquilermontevideo", "activa")]);
    const reader = vi.fn(async (plan: InstagramPlan): Promise<InstagramResults> => ({ launched: true, note: "",
      accounts: new Map(plan.accounts.map(h => [h, { handle: h, profile: { exists: false, name: "", codes: [] }, posts: [], failures: 0 }])) }));
    await harvestInstagramRun("full", 40, { readInstagram: reader, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => NOW, env: {}, tiktokHandles: async () => [] });
    const statuses = Object.fromEntries(s.state.accounts.map(a => [a.handle, a.status]));
    expect(statuses).toEqual({ inmobiliariaalquilar: "semilla", alquilermontevideo: "activa" });
    expect(s.state.accounts.find(a => a.handle === "inmobiliariaalquilar")!.note).toContain("no disponible");
    await harvestInstagramRun("full", 40, { readInstagram: reader, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => day(1), env: {}, tiktokHandles: async () => [] });
    expect(reader.mock.calls[1]![0].accounts.sort()).toEqual(["alquilermontevideo", "inmobiliariaalquilar"]);
  });

  it("F8 — re-reads a known post every few days, so its cover and an 'ALQUILADO' edit reach the directory", async () => {
    const fresh = { listingId: "instagram:K1xxxxxxxxx", id: "K1xxxxxxxxx", uniqueId: "inmobiliariaalquilar", createTime: 1790119737, readAt: day(-1).toISOString(), fetchedAt: day(-1).toISOString(),
      text: "Alquiler en Pocitos $20.000", hashtags: [], rejected: null, price: 20000, currency: "UYU", department: "Montevideo", neighborhood: "Pocitos", candidates: [],
      geocodeQuery: null, geocodeAddress: null, latitude: null, longitude: null, geoNeighborhood: null, note: null, url: "https://www.instagram.com/p/K1xxxxxxxxx/", authorName: "x", image: "https://a/1.jpg" } as SocialPostRow;
    const stale = { ...fresh, listingId: "instagram:K2xxxxxxxxx", id: "K2xxxxxxxxx", readAt: day(-1).toISOString(), fetchedAt: day(-4).toISOString() } as SocialPostRow;
    const s = stores([account("inmobiliariaalquilar", "semilla")], [fresh, stale]);
    const edited = igPost("K2xxxxxxxxx", "inmobiliariaalquilar", "‼️ALQUILADO‼️ Alquiler en Pocitos $20.000");
    const reader = vi.fn(async (plan: InstagramPlan): Promise<InstagramResults> => ({ launched: true, note: "",
      accounts: new Map(plan.accounts.map(h => [h, { handle: h, profile: { exists: true, name: "X", codes: ["K1xxxxxxxxx", "K2xxxxxxxxx"] }, posts: plan.known.has("K2xxxxxxxxx") ? [] : [edited], failures: 0 }])) }));
    const run = await harvestInstagramRun("full", 40, { readInstagram: reader, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => NOW, env: {}, tiktokHandles: async () => [] });
    expect([...reader.mock.calls[0]![0].known]).toEqual(["K1xxxxxxxxx"]);
    expect(run.result.listings.map(r => r.listingId)).toEqual(["instagram:K1xxxxxxxxx"]);
    expect(s.state.posts.get("K2xxxxxxxxx")).toMatchObject({ rejected: "alquilado", fetchedAt: NOW.toISOString() });
    expect(s.state.posts.get("K1xxxxxxxxx")).toMatchObject({ fetchedAt: day(-1).toISOString() });
  });
});
