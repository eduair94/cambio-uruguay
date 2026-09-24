import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseInstagramProfile, postFromInstagramHtml, postFromInstagramMemory } from "../../classes/rentals/sources/social/instagram/page";
import { harvestInstagramRun, type InstagramAccountRow } from "../../classes/rentals/sources/social/instagram";
import type { InstagramPlan, InstagramResults } from "../../classes/rentals/sources/social/instagram/browser";
import type { SocialPost } from "../../classes/rentals/sources/social/post";
import type { SocialPostRow } from "../../classes/rentals/sources/social/store";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", `${name}.html`), "utf8");
const NOW = new Date("2026-09-24T05:00:00.000Z");

describe("Instagram pages, logged out", () => {
  it("lists a profile's post codes once each, and says when a handle does not exist", () => {
    expect(parseInstagramProfile(fixture("instagram-profile"), "inmobiliariaalquilar")).toEqual({
      exists: true, name: "Inmobiliaria Alquiler Montevideo", codes: ["Ddo4yVYiX9j", "Ddm6q_TiZ2l", "DdrDonPR85C"],
    });
    expect(parseInstagramProfile(fixture("instagram-missing"), "cap.propiedades")).toEqual({ exists: false, name: "", codes: [] });
    // A login wall or a challenge is not an answer about the account.
    expect(parseInstagramProfile("<html><head><title>Instagram</title></head></html>", "inmobiliariaalquilar")).toBeNull();
    // Another account's page is not this one's.
    expect(parseInstagramProfile(fixture("instagram-profile"), "otra.inmo")).toBeNull();
  });

  it("reads THE post of the code asked for, not the related post that comes first", () => {
    const post = postFromInstagramHtml(fixture("instagram-post"), "Ddm6q_TiZ2l")!;
    expect(post).toMatchObject({
      source: "instagram", id: "Ddm6q_TiZ2l", url: "https://www.instagram.com/p/Ddm6q_TiZ2l/", createTime: 1790119737,
      author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo", secUid: "55" },
      cover: "https://scontent-yyz1-1.cdninstagram.com/v/t51.82787-15/8202.jpg", hashtags: ["alquiler", "pocitos"],
    });
    expect(post.lines[0]).toBe("🏠 Alquiler 1 dormitorio en Pocitos");
    expect(postFromInstagramHtml(fixture("instagram-post"), "ZZZZZZZZZZZ")).toBeNull();
    const related = postFromInstagramHtml(fixture("instagram-post"), "Ddm4CelmLhP")!;
    expect(related).toMatchObject({ url: "https://www.instagram.com/p/Ddm4CelmLhP/", cover: null });
    expect(postFromInstagramHtml("<html>Please wait</html>", "Ddm6q_TiZ2l")).toBeNull();
  });

  it("links a reel as a reel", () => {
    const html = fixture("instagram-post").replace('"code":"Ddm6q_TiZ2l","pk":"1","taken_at":1790119737,"product_type":"carousel_container"', '"code":"Ddm6q_TiZ2l","pk":"1","taken_at":1790119737,"product_type":"clips"');
    expect(postFromInstagramHtml(html, "Ddm6q_TiZ2l")!.url).toBe("https://www.instagram.com/reel/Ddm6q_TiZ2l/");
  });

  it("rebuilds a known post from memory without reading it again", () => {
    const post = postFromInstagramHtml(fixture("instagram-post"), "Ddm6q_TiZ2l")!;
    const row = memoryRow(post);
    expect(postFromInstagramMemory(row)).toMatchObject({ source: "instagram", id: "Ddm6q_TiZ2l", url: post.url, createTime: post.createTime,
      author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo" }, cover: post.cover, lines: post.lines });
    expect(postFromInstagramMemory({ ...row, text: "" })).toBeNull();
  });
});

// --- The harvester ------------------------------------------------------------------------------

function memoryRow(post: SocialPost): SocialPostRow {
  return {
    listingId: `instagram:${post.id}`, id: post.id, uniqueId: post.author.uniqueId, createTime: post.createTime, readAt: "2026-09-23T05:00:00.000Z",
    text: post.lines.join("\n"), hashtags: post.hashtags, rejected: null, price: null, currency: null, department: "", neighborhood: "",
    candidates: [], geocodeQuery: null, geocodeAddress: null, latitude: null, longitude: null, geoNeighborhood: null, note: null,
    url: post.url, authorName: post.author.nickname, image: post.cover,
  };
}

const igPost = (id: string, handle: string, text: string, createTime = 1790119737): SocialPost => ({
  source: "instagram", id, url: `https://www.instagram.com/p/${id}/`, lines: text.split(/\n+/), createTime,
  author: { uniqueId: handle, nickname: handle, secUid: "" }, cover: null, hashtags: [],
});

const MEXICAN = [
  "¡Iniciamos Preventa! Residencial Terrazas del Sur, alquiler de departamentos de 2 a 3 recámaras desde $18.500 mensuales",
  "Nuestros departamentos, tu mejor inversión. Alquiler con opción a compra, $21.000 al mes",
  "Departamento en alquiler, 2 recámaras, 2 baños, estacionamiento, $19.900",
  "Alquiler de departamento amueblado cerca de Plaza Sendero, $17.000 mensuales",
];

function stores(accounts: InstagramAccountRow[] = [], stored: SocialPostRow[] = []) {
  const state = { accounts, posts: [...stored] };
  return {
    state,
    accounts: { loadAccounts: async () => state.accounts, saveAccounts: async (rows: InstagramAccountRow[]) => { state.accounts = rows; } },
    posts: {
      loadPosts: async (ids: readonly string[]) => new Map(state.posts.filter(r => ids.includes(r.id)).map(r => [r.id, r])),
      loadPostsByAuthors: async (authors: readonly string[]) => new Map(state.posts.filter(r => authors.includes(r.uniqueId)).map(r => [r.id, r])),
      savePosts: async (rows: SocialPostRow[]) => { state.posts.push(...rows); },
    },
  };
}

const noGeo = async () => ({ point: null, query: null, tried: 0 });

describe("harvestInstagramRun", () => {
  it("reads seeds and TikTok candidates, skips known codes, and moves accounts through their states", async () => {
    const known = igPost("Ddm4CelmLhP", "inmobiliariaalquilar", "🤩 ALQUILER POCITOS / PUNTA CARRETAS – 1 DORMITORIO\n📍 Scoseria y Luis de la Torre\n💰 $29.500 + $4.900 de gastos comunes", 1790118356);
    const s = stores([], [memoryRow(known)]);
    const fresh = postFromInstagramHtml(fixture("instagram-post"), "Ddm6q_TiZ2l")!;
    const second = igPost("DdrD2V0kRSO", "inmobiliariaalquilar", "🏠 Alquiler Pocitos / Puerto del Buceo – 1 dormitorio\n📍 Marco Bruto y Rivera\n💰 $26.000\n🏢 Gastos comunes: $2.100 aprox.", 1790258766 - 200000);
    const readInstagram = vi.fn(async (plan: InstagramPlan): Promise<InstagramResults> => {
      const accounts = new Map();
      for (const handle of plan.accounts) {
        if (handle === "cap.propiedades") accounts.set(handle, { handle, profile: { exists: false, name: "", codes: [] }, posts: [], failures: 0 });
        if (handle === "habitarte.inmobiliaria") {
          const posts = MEXICAN.map((text, i) => igPost(`MX${i}xxxxxxx`, handle, text));
          accounts.set(handle, { handle, profile: { exists: true, name: "Habitarte.mx", codes: posts.map(p => p.id) }, posts, failures: 0 });
        }
        if (handle === "inmobiliariaalquilar") {
          const codes = ["Ddm6q_TiZ2l", "DdrD2V0kRSO", "Ddm4CelmLhP"];
          accounts.set(handle, { handle, profile: { exists: true, name: "Inmobiliaria Alquiler Montevideo", codes }, posts: [fresh, second].filter(p => !plan.known.has(p.id)), failures: 0 });
        }
      }
      return { accounts, launched: true, note: "" };
    });
    const run = await harvestInstagramRun("full", 40, {
      readInstagram, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => NOW, env: {},
      tiktokHandles: async () => ["cap.propiedades", "habitarte.inmobiliaria", "inmobiliariaalquilar", "no un handle!"],
    });
    const plan = readInstagram.mock.calls[0]![0];
    expect(plan.accounts).toEqual(["inmobiliariaalquilar", "cap.propiedades", "habitarte.inmobiliaria"]);
    expect([...plan.known]).toEqual(["Ddm4CelmLhP"]);
    expect(run.result).toMatchObject({ key: "instagram", ok: true, complete: false });
    expect(run.result.listings.map(r => r.listingId).sort()).toEqual(["instagram:Ddm4CelmLhP", "instagram:Ddm6q_TiZ2l", "instagram:DdrD2V0kRSO"]);
    const byHandle = new Map(s.state.accounts.map(a => [a.handle, a]));
    expect(byHandle.get("cap.propiedades")).toMatchObject({ status: "no existe", checkedAt: NOW.toISOString() });
    expect(byHandle.get("habitarte.inmobiliaria")).toMatchObject({ status: "descartada", evaluated: 4, published: 0, name: "Habitarte.mx" });
    expect(byHandle.get("inmobiliariaalquilar")).toMatchObject({ status: "semilla", published: 3, reads: 1, lastReadAt: NOW.toISOString(), name: "Inmobiliaria Alquiler Montevideo" });
    expect(s.state.posts.find(r => r.id === "MX0xxxxxxx")).toMatchObject({ rejected: "sin evidencia de Uruguay" });
    expect(run.result.note).toContain("3 avisos de 7 posts");
  });

  it("turns a candidate into an active account the first time it publishes an accepted advert", async () => {
    const s = stores();
    const post = postFromInstagramHtml(fixture("instagram-post"), "Ddm6q_TiZ2l")!;
    const readInstagram = vi.fn(async (plan: InstagramPlan): Promise<InstagramResults> => ({ launched: true, note: "",
      accounts: new Map(plan.accounts.map(handle => [handle, { handle, profile: { exists: true, name: "X", codes: handle === "inmobiliariaalquilar" ? [post.id] : [] }, posts: handle === "inmobiliariaalquilar" ? [post] : [], failures: 0 }])) }));
    await harvestInstagramRun("full", 40, { readInstagram, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => NOW,
      env: { RENTALS_INSTAGRAM_ACCOUNTS: "" }, tiktokHandles: async () => ["inmobiliariaalquilar"] });
    expect(s.state.accounts).toEqual([expect.objectContaining({ handle: "inmobiliariaalquilar", status: "activa", published: 1, evaluated: 1 })]);
  });

  it("does not re-read a descartada or no-existe account for 30 days", async () => {
    const row = (handle: string, status: InstagramAccountRow["status"], checkedAt: string): InstagramAccountRow =>
      ({ handle, name: "", status, firstSeen: "2026-08-01", checkedAt, lastReadAt: null, lastPostAt: null, published: 0, evaluated: 4, reads: 1, note: null });
    const s = stores([row("habitarte.inmobiliaria", "descartada", "2026-09-10T05:00:00.000Z"), row("vieja", "no existe", "2026-08-20T05:00:00.000Z")]);
    const readInstagram = vi.fn(async (plan: InstagramPlan): Promise<InstagramResults> => ({ launched: true, note: "",
      accounts: new Map(plan.accounts.map(handle => [handle, { handle, profile: { exists: false, name: "", codes: [] }, posts: [], failures: 0 }])) }));
    await harvestInstagramRun("full", 40, { readInstagram, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => NOW,
      env: { RENTALS_INSTAGRAM_ACCOUNTS: "" }, tiktokHandles: async () => [] });
    expect(readInstagram.mock.calls[0]![0].accounts).toEqual(["vieja"]);
  });

  it("does nothing in the hourly run or when disabled, and says when the browser never started", async () => {
    const readInstagram = vi.fn();
    const s = stores();
    const deps = { readInstagram, accounts: s.accounts, posts: s.posts, geocode: noGeo, locateZone: () => null, now: () => NOW, tiktokHandles: async () => [] };
    expect((await harvestInstagramRun("fast", 40, { ...deps, env: {} })).result).toMatchObject({ key: "instagram", ok: true, listings: [], note: "sólo en la corrida completa" });
    expect((await harvestInstagramRun("full", 40, { ...deps, env: { RENTALS_INSTAGRAM_ENABLED: "0" } })).result).toMatchObject({ ok: true, note: "deshabilitado por configuración" });
    expect(readInstagram).not.toHaveBeenCalled();
    const dead = vi.fn(async (): Promise<InstagramResults> => ({ launched: false, note: "Chrome no arrancó", accounts: new Map() }));
    expect((await harvestInstagramRun("full", 40, { ...deps, readInstagram: dead, env: {} })).result).toMatchObject({ ok: false, complete: false });
  });
});
