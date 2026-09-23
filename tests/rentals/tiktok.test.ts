import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";
import { captionAmounts, captionLocation, captionPropertyType, captionRejection, captionTitle, parseCaption } from "../../classes/rentals/sources/tiktok/caption";
import { postFromItemStruct, postToRawRental, postUrl } from "../../classes/rentals/sources/tiktok/post";
import { canonicalVideoUrl, postFromVideoHtml, readVideoPage, resolveTiktokUrl } from "../../classes/rentals/sources/tiktok/page";
import { fetchText } from "../../classes/rentals/net";
import { parseListBody, proxyArg } from "../../classes/rentals/sources/tiktok/browser";

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
    const post = postFromItemStruct(item({ desc: "Alquiler 2 dormitorios 📍 Gaboto y La Paz $22.000", contents: undefined, textExtra: [] }))!;
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
    const redirect = vi.fn(async () => new Response(null, { status: 301, headers: { location: "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549?_r=1&_t=x" } }));
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
