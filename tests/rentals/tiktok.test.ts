import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";
import { captionAmounts, captionLocation, captionPropertyType, captionRejection, captionTitle, parseCaption } from "../../classes/rentals/sources/tiktok/caption";
import { postFromItemStruct, postToRawRental, postUrl } from "../../classes/rentals/sources/tiktok/post";
import { canonicalVideoUrl, postFromVideoHtml, readVideoPage, resolveTiktokUrl } from "../../classes/rentals/sources/tiktok/page";
import { fetchText } from "../../classes/rentals/net";
import { parseListBody, proxyArg, type ListPlan, type ListResults } from "../../classes/rentals/sources/tiktok/browser";
import { harvestTiktok, tiktokProxy } from "../../classes/rentals/sources/tiktok";
import type { TiktokAccountRow, TiktokPostRow, TiktokStore } from "../../classes/rentals/sources/tiktok/store";

vi.mock("../../classes/rentals/net", async () => ({ ...(await vi.importActual<typeof import("../../classes/rentals/net")>("../../classes/rentals/net")), fetchText: vi.fn() }));
const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", `${name}.html`), "utf8");
afterEach(() => vi.resetAllMocks());

interface Fixture { id: string; author: string; createTime: number; desc: string; hashtags: string[] }
const captions: Fixture[] = JSON.parse(readFileSync(join(__dirname, "fixtures", "tiktok-captions.json"), "utf8"));
const byId = (id: string): Fixture => captions.find(row => row.id === id)!;
const facts = (id: string) => { const row = byId(id); return parseCaption(row.desc.split("\n"), row.hashtags); };

describe("TikTok is a rental source", () => {
  it("is enumerated with its label", () => {
    expect(RENTAL_SOURCES).toContain("tiktok");
    expect(RENTAL_SOURCE_LABEL.tiktok).toBe("TikTok");
  });
});

// Real captions, captured 2026-09-23 from the #alquilermontevideo tag page and @inmobiliariaalquilar.
describe("TikTok caption amounts", () => {
  it("separates rent from gastos comunes and ignores garages, deposits and guarantee variants", () => {
    expect(captionAmounts(byId("7688511584326454549").desc)).toMatchObject({ price: 22000, currency: "UYU", commonExpenses: 1850, commonExpensesCurrency: "UYU", ambiguous: false });
    expect(captionAmounts(byId("7685857708834245908").desc)).toMatchObject({ price: 29500, commonExpenses: 6000 });
    expect(captionAmounts(byId("7684347053853445397").desc)).toMatchObject({ price: 25000, commonExpenses: 4900 });
  });

  it("publishes the LOWEST rent when the price depends on the guarantee", () => {
    expect(captionAmounts(byId("7677263722120842517").desc)).toMatchObject({ price: 24000, commonExpenses: 3170 });
    expect(captionAmounts(byId("7673622265199676693").desc)).toMatchObject({ price: 19000, commonExpenses: 1800 });
  });

  it("reads 'sin gastos comunes' as zero, a labelled amount without a symbol as pesos, and 💲 as $", () => {
    expect(captionAmounts(byId("7686209173708688661").desc)).toMatchObject({ price: 49000, commonExpenses: 0 });
    expect(captionAmounts("CASA EN ALQUILER PRECIO:42.000 No paga gastos comunes")).toMatchObject({ price: 42000, currency: "UYU", commonExpenses: 0 });
    expect(captionAmounts(byId("7670918879937432839").desc)).toMatchObject({ price: 22000, commonExpenses: 0 });
  });

  it("abstains on two different unlabelled amounts and on no amount at all", () => {
    expect(captionAmounts("Apto en Pocitos $18.000 lindo $21.000 consultar")).toMatchObject({ price: null, ambiguous: true });
    // The nearest label wins, and a label never leaks across an earlier amount.
    expect(captionAmounts("Contrato mínimo 2 años ✅ Alquiler $49.000 ✅ Garantías: Aseguradoras o 6 meses de depósito")).toMatchObject({ price: 49000 });
    expect(captionAmounts("Alquiler: $29.500 ✅ Cochera opcional: $3.500–$4.000")).toMatchObject({ price: 29500, commonExpenses: null });
    expect(captionAmounts("📍 Rincón y Bartolomé Mitre 🔹 $17.000 de alquiler 🔹 Gastos comunes: $3.500 aprox.")).toMatchObject({ price: 17000, commonExpenses: 3500 });
    expect(captionAmounts(byId("7278750140763000070").desc)).toMatchObject({ price: null, ambiguous: false });
    expect(captionAmounts("Alquiler U$S 900 mensuales gastos comunes U$S 120")).toMatchObject({ price: 900, currency: "USD", commonExpenses: 120, commonExpensesCurrency: "USD" });
    expect(captionAmounts("Alquiler $ 39.000 + GC")).toMatchObject({ price: 39000, commonExpenses: null });
  });
});

describe("TikTok caption rejection", () => {
  it.each([
    ["7679135522408746261", "no disponible"],
    ["7485408122287213879", "reservado"],
  ])("%s → %s", (id, reason) => expect(captionRejection(byId(id).desc)).toBe(reason));

  it("rejects rented, transferred, sale and wanted adverts, but not 'DISPONIBLE'", () => {
    expect(captionRejection("🔵 ¡ALQUILADO EN TIEMPO RÉCORD! 🏡 ¿Buscás algo similar?")).toBe("alquilado");
    expect(captionRejection("🏠 ¡TRASPASO MI APARTAMENTO EN POCITOS! $25.000")).toBe("traspaso");
    expect(captionRejection("Casa en venta Carrasco U$S 350.000")).toBe("venta");
    expect(captionRejection("Busco apartamento en alquiler en Pocitos")).toBe("busco");
    expect(captionRejection("Alquiler temporario por día Punta del Este")).toBe("temporal");
    expect(captionRejection(byId("7593048064441470219").desc)).toBeNull();
    expect(captionRejection("Sólo hashtags #alquiler #montevideo")).toBeNull();
  });
});

describe("TikTok caption location", () => {
  it("never reads a department out of a street corner", () => {
    const palermo = byId("7675131286196849941");
    expect(captionLocation(palermo.desc, palermo.hashtags)).toEqual({ department: "Montevideo", neighborhood: "Palermo" });
    const cordon = byId("7673654750243589396");
    expect(captionLocation(cordon.desc, cordon.hashtags)).toEqual({ department: "Montevideo", neighborhood: "Cordón" });
  });

  it("takes the department from a hashtag, and the barrio from text or from a hashtag", () => {
    const union = byId("7670918879937432839");
    // "📍La Unión" is the INE barrio "Unión": the dictionary's spelling, which the zone assigner joins on.
    expect(captionLocation(union.desc, union.hashtags)).toEqual({ department: "Montevideo", neighborhood: "Unión" });
    expect(captionLocation("Apto 2 dormitorios", ["alquilerpocitos"])).toEqual({ department: "Montevideo", neighborhood: "Pocitos" });
    expect(captionLocation("Alquiler en Piriápolis casa 2 dormitorios", [])).toEqual({ department: "Maldonado", neighborhood: "Piriápolis" });
  });

  it("abstains on two departments and on a generic name without a cue", () => {
    expect(captionLocation("Alquiler en Maldonado y en Canelones", ["montevideo", "maldonado"])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler Centro 📍 3 habitaciones", ["alquiler"])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler en Centro", ["montevideo"])).toEqual({ department: "Montevideo", neighborhood: "Centro" });
  });
});

describe("TikTok caption title and type", () => {
  it("uses the first line without emojis, bullets or hashtags", () => {
    expect(captionTitle(["🤩 Alquiler Pocitos – Monoambiente con cochera", "✅ 26 de Marzo"])).toBe("Alquiler Pocitos – Monoambiente con cochera");
    expect(captionTitle([byId("7688511584326454549").desc])).toBe("ALQUILER 2 DORMITORIOS BARATO, MUY ECONÓMICO");
    expect(captionTitle(["#alquiler #montevideo"])).toBe("");
  });

  it("does not turn '3 habitaciones' into a room rental", () => {
    expect(captionPropertyType("Alquiler Centro", byId("7641681054167862548").desc)).toBe("otro");
    expect(captionPropertyType("Alquiler Pocitos – Monoambiente con cochera", "")).toBe("apartamento");
    expect(captionPropertyType("Alquiler 2 dormitorios, Punta Carretas", byId("7686209173708688661").desc)).toBe("casa");
    expect(captionPropertyType("Habitación en alquiler en casa compartida", "")).toBe("habitacion");
  });

  it("parses the example advert end to end", () => {
    expect(facts("7688511584326454549")).toMatchObject({
      rejected: null, price: 22000, currency: "UYU", commonExpenses: 1850, propertyType: "apartamento",
      department: "Montevideo", neighborhood: "Cordón", bedrooms: 2, bathrooms: 1, area: null,
      addressCandidates: ["Gaboto y La Paz"],
    });
    expect(facts("7688511584326454549").guarantees).toContain("aseguradora");
    expect(facts("7278750140763000070").rejected).toBe("sin precio");
    expect(facts("7679135522408746261").rejected).toBe("no disponible");
  });
});

// --- Task 3: itemStruct → post → RawRental ----------------------------------------------------

const example = byId("7688511584326454549");
const item = (over: Record<string, unknown> = {}) => ({
  id: "7688511584326454549", desc: example.desc, createTime: "1790121112",
  author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquilar Mvd", secUid: "MS4wLjAB" },
  video: { cover: "https://p16-common-sign.tiktokcdn.com/x~tplv.image?x-expires=1790330400" },
  textExtra: example.hashtags.map(hashtagName => ({ hashtagName, type: 1 })),
  contents: [{ desc: "🏠 ALQUILER 2 DORMITORIOS BARATO, MUY ECONÓMICO" }, { desc: "🔹📍 Gaboto y La Paz" }],
  ...over,
});
const AT = "2026-09-23T10:00:00.000Z";

describe("TikTok post → RawRental", () => {
  it("normalises an itemStruct: lines from contents, hashtags from textExtra, cover, author", () => {
    const post = postFromItemStruct(item())!;
    expect(post).toMatchObject({ id: "7688511584326454549", createTime: 1790121112, author: { uniqueId: "inmobiliariaalquilar" }, hashtags: ["alquiler", "apartamento", "cordón", "aguada", "alquilar"] });
    expect(post.lines[0]).toBe("🏠 ALQUILER 2 DORMITORIOS BARATO, MUY ECONÓMICO");
    expect(postUrl(post)).toBe("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549");
    expect(postFromItemStruct(item({ contents: undefined }))!.lines).toEqual([example.desc]);
    expect(postFromItemStruct({ id: "1" })).toBeNull();
    expect(postFromItemStruct(item({ author: { uniqueId: "" } }))).toBeNull();
  });

  it("builds the offer: sanitized description without the phone, real publish date, guarantees, no contacts", () => {
    const post = postFromItemStruct(item({ contents: undefined }))!;
    const row = postToRawRental(post, parseCaption(post.lines, post.hashtags), null, AT)!;
    expect(row).toMatchObject({
      source: "tiktok", listingId: "tiktok:7688511584326454549", url: postUrl(post), price: 22000, currency: "UYU",
      commonExpenses: 1850, commonExpensesCurrency: "UYU", propertyType: "apartamento", department: "Montevideo", neighborhood: "Cordón",
      bedrooms: 2, bathrooms: 1, address: "", street: "", streetNumber: "", latitude: null, longitude: null,
      publishedAt: "2026-09-22", sellerName: "Inmobiliaria Alquilar Mvd", sellerType: "desconocido", petsAllowed: null, furnished: null, parkingSpaces: null,
      image: "https://p16-common-sign.tiktokcdn.com/x~tplv.image?x-expires=1790330400",
    });
    expect(row.description).not.toContain("099");
    expect(row.details?.description).not.toContain("232 050");
    expect(row.details?.images).toEqual([row.image]);
    expect(row.guarantees).toContain("aseguradora");
    expect(row.agency).toBeUndefined();
    expect(row.publicContact).toBeUndefined();
  });

  it("takes a validated corner coordinate and its INE barrio when the text named none", () => {
    const post = postFromItemStruct(item({ desc: "Alquiler 2 dormitorios en Montevideo 📍 Gaboto y La Paz $22.000", contents: undefined, textExtra: [] }))!;
    const row = postToRawRental(post, parseCaption(post.lines, post.hashtags), { latitude: -34.9, longitude: -56.18, neighborhood: "Cordón" }, AT)!;
    expect(row).toMatchObject({ latitude: -34.9, longitude: -56.18, neighborhood: "Cordón", department: "Montevideo" });
  });

  it("returns null for a rejected caption and a null image for a missing cover", () => {
    const gone = postFromItemStruct(item({ desc: "⛔️NO DISPONIBLE⛔️ Alquiler $20.000", contents: undefined }))!;
    expect(postToRawRental(gone, parseCaption(gone.lines, gone.hashtags), null, AT)).toBeNull();
    const bare = postFromItemStruct(item({ video: { cover: "" }, contents: undefined }))!;
    expect(bare.cover).toBeNull();
    expect(postToRawRental(bare, parseCaption(bare.lines, bare.hashtags), null, AT)!.image).toBeNull();
  });
});

// --- Task 4: one video over plain HTTP -------------------------------------------------------

describe("TikTok video page over plain HTTP", () => {
  it("reads the embedded itemStruct", () => {
    const post = postFromVideoHtml(fixture("tiktok-video"))!;
    expect(post).toMatchObject({ id: "7688511584326454549", author: { uniqueId: "inmobiliariaalquilar" } });
    expect(post.hashtags).toContain("cordón");
    expect(postFromVideoHtml("<html>Please wait...</html>")).toBeNull();
  });

  it("only accepts canonical video URLs and resolves short links by following the redirect", async () => {
    expect(canonicalVideoUrl("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549?_r=1")).toBe("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549");
    expect(canonicalVideoUrl("https://www.tiktok.com/search?q=alquiler")).toBeNull();
    const redirect = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 301, headers: { location: "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549?_r=1&_t=x" } }));
    expect(await resolveTiktokUrl("https://vt.tiktok.com/ZSbJ6eN9S/", redirect as unknown as typeof fetch)).toBe("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549");
    expect(redirect.mock.calls[0]![1]).toMatchObject({ redirect: "manual" });
    expect(await resolveTiktokUrl("https://example.com/x", redirect as unknown as typeof fetch)).toBeNull();
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("readVideoPage goes through fetchText with the identifying header and returns null on a challenge", async () => {
    vi.mocked(fetchText).mockResolvedValueOnce(fixture("tiktok-video"));
    expect((await readVideoPage("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549"))?.id).toBe("7688511584326454549");
    expect(vi.mocked(fetchText).mock.calls[0]![1]?.headers).toMatchObject({ "x-cambio-uruguay-bot": "CambioUruguayBot/1.0" });
    vi.mocked(fetchText).mockResolvedValueOnce("<html>Please wait...</html>");
    expect(await readVideoPage("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549")).toBeNull();
  });
});

// --- Task 5: list plumbing (the browser itself is never launched in the unit suite) -----------

describe("TikTok list plumbing", () => {
  it("parses an item_list body and treats an empty or failed body as no answer", () => {
    const parsed = parseListBody(JSON.stringify({ statusCode: 0, hasMore: true, itemList: [item(), { id: "x" }] }))!;
    expect(parsed.hasMore).toBe(true);
    expect(parsed.posts.map(post => post.id)).toEqual(["7688511584326454549"]);
    expect(parseListBody("")).toBeNull();
    expect(parseListBody("{\"statusCode\":10000}")).toBeNull();
    expect(parseListBody("<html>challenge</html>")).toBeNull();
  });

  it("turns a proxy into a Chrome flag", () => {
    expect(proxyArg("1.2.3.4:8080")).toEqual(["--proxy-server=http://1.2.3.4:8080"]);
    expect(proxyArg("socks5://1.2.3.4:1080")).toEqual(["--proxy-server=socks5://1.2.3.4:1080"]);
    expect(proxyArg(null)).toEqual([]);
    expect(proxyArg("  ")).toEqual([]);
  });
});

// --- Task 6: the harvester --------------------------------------------------------------------

const memoryStore = (accounts: TiktokAccountRow[] = []): TiktokStore & { state: { accounts: TiktokAccountRow[]; posts: TiktokPostRow[] } } => {
  const state = { accounts, posts: [] as TiktokPostRow[] };
  return {
    state,
    loadAccounts: async () => state.accounts,
    saveAccounts: async rows => { state.accounts = rows; },
    loadPosts: async () => new Map(state.posts.map(row => [row.id, row])),
    savePosts: async rows => { state.posts.push(...rows); },
  };
};
/** TikTok ids are 19 digits; a short test id is padded so the normaliser accepts it. */
const vid = (n: string): string => n.padStart(19, "7");
const post = (id: string, uniqueId: string, desc: string, createTime = 1790121112) =>
  postFromItemStruct(item({ id: vid(id), desc, contents: undefined, textExtra: [], createTime: String(createTime), author: { uniqueId, nickname: uniqueId, secUid: "S" } }))!;
const listsOf = (tags: Record<string, ReturnType<typeof post>[]>, accounts: Record<string, { posts: ReturnType<typeof post>[]; exhausted?: boolean }>) =>
  vi.fn(async (_plan: ListPlan): Promise<ListResults> => ({
    launched: true, note: "",
    tags: new Map(Object.entries(tags).map(([tag, posts]) => [tag, { posts, pages: 1, exhausted: true, failure: null }])),
    accounts: new Map(Object.entries(accounts).map(([acc, read]) => [acc, { posts: read.posts, pages: 1, exhausted: read.exhausted ?? true, failure: null }])),
  }));
const baseEnv = { RENTALS_TIKTOK_PROXY: "1.2.3.4:8080", RENTALS_TIKTOK_TAGS: "alquilermontevideo", RENTALS_TIKTOK_ACCOUNTS: "inmobiliariaalquilar", RENTALS_TIKTOK_MAX_AGE_DAYS: "45" };
const now = () => new Date("2026-09-23T05:00:00.000Z");
const noGeo = async () => ({ point: null, query: null, tried: 0 });
const CAPTION = "🏠 Alquiler Pocitos 2 dormitorios 📍 Chucarro y Guayaquí $30.000 GC $4.000 #alquiler #montevideo";

describe("harvestTiktok", () => {
  it("does nothing in the hourly run and when disabled", async () => {
    const readLists = listsOf({}, {});
    expect(await harvestTiktok("fast", 40, { readLists, env: baseEnv, now, store: memoryStore() })).toMatchObject({ key: "tiktok", ok: true, complete: false, listings: [] });
    expect(await harvestTiktok("full", 40, { readLists, env: { ...baseEnv, RENTALS_TIKTOK_ENABLED: "0" }, now, store: memoryStore() })).toMatchObject({ ok: true, listings: [], note: "deshabilitado por configuración" });
    expect(readLists).not.toHaveBeenCalled();
  });

  it("reads the seed account, publishes its adverts, registers discovered authors, and is complete when every account was exhausted", async () => {
    const store = memoryStore();
    const readLists = listsOf(
      { alquilermontevideo: [post("1", "otra.inmo", CAPTION), post("2", "spam", "#alquiler #montevideo")] },
      { inmobiliariaalquilar: { posts: [post("3", "inmobiliariaalquilar", CAPTION)] } },
    );
    const run = await harvestTiktok("full", 40, { readLists, store, env: baseEnv, now, geocode: noGeo });
    expect(run).toMatchObject({ key: "tiktok", ok: true, complete: true });
    expect(run.listings.map(row => row.listingId).sort()).toEqual([`tiktok:${vid("1")}`, `tiktok:${vid("3")}`]);
    expect(run.listings[0]).toMatchObject({ price: 30000, commonExpenses: 4000, department: "Montevideo", neighborhood: "Pocitos", bedrooms: 2 });
    // "spam" published nothing, so it is not an account worth reading.
    expect(store.state.accounts.map(row => row.uniqueId).sort()).toEqual(["inmobiliariaalquilar", "otra.inmo"]);
    expect(store.state.accounts.find(row => row.uniqueId === "inmobiliariaalquilar")).toMatchObject({ reads: 1, published: 1, lastReadAt: "2026-09-23T05:00:00.000Z" });
    expect(store.state.posts.find(row => row.id === vid("2"))?.rejected).toBe("sin precio");
    const plan = readLists.mock.calls[0]![0];
    expect(plan.proxy).toBe("1.2.3.4:8080");
    expect(plan.accounts).toEqual(["inmobiliariaalquilar"]);
    expect(plan.tags).toEqual(["alquilermontevideo"]);
    expect(plan.minCreateTime).toBe(Math.floor(now().getTime() / 1000) - 45 * 86_400);
  });

  it("is NOT complete when an account was cut by budget or not read, and never publishes a video older than the window", async () => {
    const store = memoryStore([{ uniqueId: "vieja.inmo", secUid: "S", nickname: "Vieja", firstSeen: "2026-09-01", lastReadAt: "2026-09-01T00:00:00.000Z", lastPostAt: null, published: 3, reads: 1, note: null }]);
    const readLists = listsOf({}, { "vieja.inmo": { posts: [post("9", "vieja.inmo", CAPTION, 1780000000)], exhausted: false } });
    const run = await harvestTiktok("full", 40, { readLists, store, env: { ...baseEnv, RENTALS_TIKTOK_MAX_ACCOUNTS: "1" }, now, geocode: noGeo });
    expect(run.complete).toBe(false);
    expect(run.listings).toEqual([]);
    expect(run.note).toContain("fuera de la ventana");
    // The never-read seed goes first; the registry row read three weeks ago comes after, and the budget of one leaves it out.
    expect(readLists.mock.calls[0]![0].accounts).toEqual(["inmobiliariaalquilar"]);
  });

  it("imports a manual short link over HTTP without the browser, and geocodes a corner once", async () => {
    const store = memoryStore();
    const geocode = vi.fn(async () => ({ point: { latitude: -34.906, longitude: -56.156, address: "Chucarro & Guayaquí" }, query: "q", tried: 1 }));
    const deps = {
      readLists: listsOf({}, {}), store, now, geocode, locateZone: () => "8",
      env: { ...baseEnv, RENTALS_TIKTOK_TAGS: "", RENTALS_TIKTOK_ACCOUNTS: "", RENTALS_TIKTOK_VIDEOS: "https://vt.tiktok.com/ZSbJ6eN9S/" },
      resolveUrl: async () => "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549",
      readVideo: async () => post("7688511584326454549", "inmobiliariaalquilar", "Alquiler 2 dormitorios en Montevideo 📍 Chucarro y Guayaquí $30.000"),
    };
    const first = await harvestTiktok("full", 40, deps);
    expect(first.listings[0]).toMatchObject({ listingId: "tiktok:7688511584326454549", latitude: -34.906, longitude: -56.156, neighborhood: "Pocitos", department: "Montevideo" });
    expect(deps.readLists).not.toHaveBeenCalled();
    expect(store.state.accounts.map(row => row.uniqueId)).toEqual(["inmobiliariaalquilar"]);
    const second = await harvestTiktok("full", 40, deps);
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(second.listings[0]).toMatchObject({ latitude: -34.906, neighborhood: "Pocitos" });
  });

  it("drops a point that contradicts the named barrio, and keeps the barrio", async () => {
    const geocode = vi.fn(async () => ({ point: { latitude: -34.906, longitude: -56.156, address: "x" }, query: "q", tried: 1 }));
    const readLists = listsOf({}, { inmobiliariaalquilar: { posts: [post("5", "inmobiliariaalquilar", "Alquiler en Pocitos 📍 Chucarro y Guayaquí $30.000")] } });
    const run = await harvestTiktok("full", 40, { readLists, store: memoryStore(), env: baseEnv, now, geocode, locateZone: () => "2" });
    expect(run.listings[0]).toMatchObject({ neighborhood: "Pocitos", latitude: null, longitude: null });
    expect(run.note).toContain("contradecir el barrio");
  });

  it("says so when there is no proxy and the lists came back empty", async () => {
    const readLists = vi.fn(async (): Promise<ListResults> => ({
      launched: true, note: "", accounts: new Map(),
      tags: new Map([["alquilermontevideo", { posts: [], pages: 0, exhausted: false, failure: "lista vacía (IP bloqueada o desafío)" }]]),
    }));
    const run = await harvestTiktok("full", 40, { readLists, store: memoryStore(), env: { ...baseEnv, RENTALS_TIKTOK_PROXY: "", RENTALS_TIKTOK_ACCOUNTS: "" }, now });
    expect(run.ok).toBe(false);
    expect(run.note).toContain("sin proxy");
    expect(tiktokProxy({}, () => "9.9.9.9:3128\n")).toBe("9.9.9.9:3128");
    expect(tiktokProxy({ RENTALS_TIKTOK_PROXY: "socks5://a:1" }, () => "x")).toBe("socks5://a:1");
    expect(tiktokProxy({}, () => { throw new Error("ENOENT"); })).toBeNull();
  });
});

// --- Final review fix pass (2026-09-23): phones, streets that are departments, loose labels ----

describe("TikTok caption — review fix pass", () => {
  it("never reads a phone number as money, glued or spaced, before or after a label", () => {
    expect(captionAmounts("🟩 ALQUILER 🟩 📲 099123456 📍 Pocitos 2 dormitorios 💲22.000 Sin gastos comunes")).toMatchObject({ price: 22000, commonExpenses: 0 });
    expect(captionAmounts("Precio y visitas al 092345678 📍 Cordon $28.000 GC $3.000")).toMatchObject({ price: 28000, commonExpenses: 3000 });
    expect(captionAmounts("Precio $30.000 + GC 📲 099 123 456")).toMatchObject({ price: 30000, commonExpenses: null });
    expect(captionAmounts("Consultas al +598 99 123 456. Alquiler $25.000")).toMatchObject({ price: 25000 });
    expect(captionAmounts("ALQUILER 092345678 Pocitos 2 dormitorios $35.000 gastos comunes $4.000")).toMatchObject({ price: 35000, commonExpenses: 4000 });
  });

  it("keeps a currency-less number only when its label sits right before it", () => {
    expect(captionAmounts("ALQUILER casa de 120 m2 - Precio $38.000")).toMatchObject({ price: 38000 });
    expect(captionAmounts("Alquiler local de 3.000 m2, precio $45.000")).toMatchObject({ price: 45000 });
    expect(captionAmounts("Alquiler: 22.000 pesos")).toMatchObject({ price: 22000, currency: "UYU" });
    expect(captionAmounts("Gastos comunes: 1.850 ✅ Alquiler $22.000")).toMatchObject({ price: 22000, commonExpenses: 1850 });
  });

  it("binds the ignore and GC labels to an adjacent amount, never to anything within reach", () => {
    expect(captionAmounts("Alquiler apartamento con cochera $32.000")).toMatchObject({ price: 32000 });
    expect(captionAmounts("Alquiler con luz y agua incluidas $28.000")).toMatchObject({ price: 28000 });
    expect(captionAmounts("Alquilo garaje en Pocitos $4.500 por mes")).toMatchObject({ price: 4500 });
    expect(captionAmounts("Precio: $32.500 ✅ Cochera: Incluida ($3.000 extra)")).toMatchObject({ price: 32500 });
    expect(captionAmounts("GC bajos ✅ 2 dormitorios $22.000")).toMatchObject({ price: 22000, commonExpenses: null });
    expect(captionAmounts("Cochera opcional: $3.500 ✅ Alquiler: $29.500")).toMatchObject({ price: 29500 });
  });

  it("treats a department name followed by a street number as a street", () => {
    expect(captionLocation("Alquilo apartamento en Durazno 1450 esq Ejido, 2 dormitorios", [])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler de apartamento en Canelones 1234, Cordón", ["montevideo"])).toEqual({ department: "Montevideo", neighborhood: "Cordón" });
    expect(captionLocation("Alquilo apartamento en Colonia 1234 esquina Rio Branco", ["montevideo"])).toEqual({ department: "Montevideo", neighborhood: "" });
    expect(captionLocation("Casa en alquiler en Colonia del Sacramento, 2 dormitorios", [])).toEqual({ department: "Colonia", neighborhood: "Colonia del Sacramento" });
  });

  it("abstains when the prose names a locality of another department than the hashtag, or when two barrio hashtags compete", () => {
    expect(captionLocation("Alquiler en Las Piedras, 2 dormitorios", ["alquilermontevideo"])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler 1 dormitorio, excelente estado", ["pocitos", "puntacarretas"])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler 1 dormitorio, excelente estado", ["pocitos", "pocitosmontevideo"])).toEqual({ department: "Montevideo", neighborhood: "Pocitos" });
  });

  it("a shared patio is not a room rental, and a reserved garage is not a reserved flat", () => {
    const union = byId("7670918879937432839");
    expect(captionPropertyType(captionTitle([union.desc]), union.desc)).toBe("otro");
    expect(captionPropertyType("Alquiler", "Casa con patio compartido y parrillero")).toBe("casa");
    expect(captionPropertyType("Habitación en casa compartida", "")).toBe("habitacion");
    expect(captionPropertyType("Alquilo cuarto con baño compartido", "")).toBe("habitacion");
    expect(captionRejection("Alquiler apartamento en Pocitos con cochera reservada $30.000")).toBeNull();
    expect(captionRejection("Lugar reservado para moto ✅ Alquiler $14.000")).toBeNull();
  });

  it("lets an operator set a budget to zero", async () => {
    const readLists = listsOf({}, {});
    await harvestTiktok("full", 40, { readLists, store: memoryStore(), env: { ...baseEnv, RENTALS_TIKTOK_MAX_ACCOUNTS: "0", RENTALS_TIKTOK_TAG_PAGES: "1" }, now, geocode: noGeo });
    expect(readLists.mock.calls[0]![0].accounts).toEqual([]);
    expect(readLists.mock.calls[0]![0].tagPages).toBe(1);
  });
});

// --- Measured on the first production sweep (95 posts, 2026-09-23 12:39 UTC) ------------------

describe("TikTok caption — first production sweep", () => {
  it("reads 'Gastos C.' with its abbreviation dot, so the rent beside it is not ambiguous", () => {
    expect(captionAmounts("ALQUILER CORDON DESIGN 🔥 - 1 Dormitorio - 1 Baño - $29.000 - Gastos C. $6.400 - 📲 099 266 021")).toMatchObject({ price: 29000, commonExpenses: 6400, ambiguous: false });
    expect(captionAmounts("Portería virtual 24hs $27.000 Gastos C. $4.500 #montevideo")).toMatchObject({ price: 27000, commonExpenses: 4500 });
  });

  it("'mensuales' labels the number BEFORE it, and a bare 'N gastos comunes' is the GC, never the rent", () => {
    expect(captionAmounts("Varias áreas de uso comun 29.900 mensuales 4400 gastos comunes #alquileres")).toMatchObject({ price: 29900, commonExpenses: 4400 });
    expect(captionAmounts("$30.000 GC $4.000")).toMatchObject({ price: 30000, commonExpenses: 4000 });
    expect(captionAmounts("Alquiler $ 39.000 + GC")).toMatchObject({ price: 39000, commonExpenses: null });
  });

  it("refuses a caption with no trace of Uruguay: the global hashtags carry US and Mexican adverts", () => {
    expect(facts("7688511584326454549").rejected).toBeNull();
    const reading = parseCaption(["🏡 APARTAMENTO EN ALQUILER – CIUDAD DE READING Acogedor apartamento de 1 habitación y 1 baño disponible por $9,000 al mes, con todos los servicios incluidos."], ["alquiler", "apartamento"]);
    expect(reading.rejected).toBe("sin evidencia de Uruguay");
    const newark = parseCaption(["323 S 7th St Newark NJ 2 habitaciones $18000 Tercer piso unidad más grande #newarkrentals #apartmento #alquileres"], ["newarkrentals", "apartmento", "alquileres"]);
    expect(newark.rejected).toBe("sin evidencia de Uruguay");
    // A Uruguayan phone, a Uruguayan hashtag or a guarantee name is evidence enough when the caption names no place.
    expect(parseCaption(["🏠Alquiler 1 Dormitorio $19.500 091 297 817"], ["tiktokuruguay", "alquileres"]).rejected).toBeNull();
    expect(parseCaption(["Alquiler $ 21.500 Garantías Aseguradoras Anda y Contaduria"], ["alquiler"]).rejected).toBeNull();
    expect(parseCaption(["Alquiler apartamento 2 dormitorios $22.000 sin gastos comunes 099 232 050"], []).rejected).toBeNull();
  });
});
