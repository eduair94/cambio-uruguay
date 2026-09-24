import { describe, expect, it, vi } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";
import { postToRawRental, hashtagsIn } from "../../classes/rentals/sources/social/post";
import { parseCaption } from "../../classes/rentals/sources/social/caption";
import { processPosts } from "../../classes/rentals/sources/social/process";
import { factKey, legacyTextKey, resolveCopies, textKey, type SocialEntry } from "../../classes/rentals/sources/social/copies";
import { harvestSocial } from "../../classes/rentals/sources/social";

describe("Instagram and Facebook Reels are rental sources", () => {
  it("are enumerated with their labels", () => {
    expect(RENTAL_SOURCES).toEqual(expect.arrayContaining(["tiktok", "instagram", "facebookreels"]));
    expect(RENTAL_SOURCE_LABEL.instagram).toBe("Instagram");
    expect(RENTAL_SOURCE_LABEL.facebookreels).toBe("Facebook Reels");
  });
});

// --- Task 2: the network-neutral post -------------------------------------------------------------

describe("social post → RawRental", () => {
  it("takes source, id and url from the post, and titles an untitled caption with the network's label", () => {
    const text = "🏠 Alquiler 1 dormitorio en Pocitos\n\n📍 Charrúa y Luis Ponce — Pocitos\n\n🔹 $27.500\n🔹 Gastos comunes: $5.500";
    const post = { source: "instagram" as const, id: "Ddm6q_TiZ2l", url: "https://www.instagram.com/p/Ddm6q_TiZ2l/", lines: text.split(/\n+/),
      createTime: 1790119737, author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo", secUid: "" }, cover: null, hashtags: [] };
    const row = postToRawRental(post, parseCaption(post.lines, []), null, "2026-09-24T05:00:00.000Z")!;
    expect(row).toMatchObject({ source: "instagram", listingId: "instagram:Ddm6q_TiZ2l", url: post.url, price: 27500, commonExpenses: 5500,
      sellerName: "Inmobiliaria Alquiler Montevideo", department: "Montevideo", neighborhood: "Pocitos", publishedAt: "2026-09-22" });
    const hashtagOnly = { ...post, lines: ["#alquiler #pocitos", "$27.500 alquiler en Pocitos"] };
    expect(postToRawRental(hashtagOnly, parseCaption(hashtagOnly.lines, []), null, "2026-09-24T05:00:00.000Z")!.title).toBe("$27.500 alquiler en Pocitos");
    const untitled = { ...post, lines: ["#alquiler #pocitos"] };
    const facts = { ...parseCaption(["Alquiler en Pocitos $27.500"], []), title: "" };
    expect(postToRawRental(untitled, facts, null, "2026-09-24T05:00:00.000Z")!.title).toBe("Alquiler en Instagram (@inmobiliariaalquilar)");
  });

  it("reads hashtags out of a caption", () => {
    expect(hashtagsIn("Alquiler #Pocitos #alquilerMontevideo #1dormitorio fin #Pocitos")).toEqual(["Pocitos", "alquilerMontevideo", "1dormitorio"]);
  });
});

// --- Task 3: shared processing ---------------------------------------------------------------------

const igPost = (id: string, text: string, createTime = 1790119737) => ({ source: "instagram" as const, id, url: `https://www.instagram.com/p/${id}/`,
  lines: text.split(/\n+/), createTime, author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo", secUid: "" },
  cover: "https://scontent.cdninstagram.com/x.jpg", hashtags: [] as string[] });

describe("processPosts", () => {
  it("drops posts older than the window, rejects by caption, geocodes a new corner once and remembers url, author and image", async () => {
    const geocode = vi.fn(async () => ({ point: { latitude: -34.91, longitude: -56.15, address: "Charrúa & Luis Ponce" }, query: "q", tried: 1 }));
    const ctx = { usdUyu: 40, observedAt: "2026-09-24T05:00:00.000Z", minCreateTime: 1790000000, geocodeBudget: { remaining: 5 }, geocode, locateZone: () => "8" };
    const { processed, counts } = await processPosts([
      igPost("A", "Alquiler 1 dormitorio en Pocitos 📍 Charrúa y Luis Ponce — Pocitos $27.500"),
      igPost("B", "⛔️NO DISPONIBLE⛔️ Alquiler en Pocitos $20.000"),
      igPost("C", "Alquiler en Pocitos $30.000", 1780000000),
    ], new Map(), ctx);
    expect(counts).toMatchObject({ tooOld: 1, rejected: 1, geocoded: 1, implausible: 0, contradicted: 0 });
    expect(processed.map(p => p.post.id)).toEqual(["A", "B"]);
    expect(processed[0]!.row).toMatchObject({ listingId: "instagram:A", latitude: -34.91 });
    expect(processed[0]!.facts.addressCandidates).toEqual(["Charrúa y Luis Ponce"]);
    expect(processed[0]!.memory).toMatchObject({ listingId: "instagram:A", id: "A", uniqueId: "inmobiliariaalquilar", url: "https://www.instagram.com/p/A/",
      authorName: "Inmobiliaria Alquiler Montevideo", image: "https://scontent.cdninstagram.com/x.jpg", rejected: null });
    expect(processed[1]!.memory).toMatchObject({ rejected: "no disponible" });
    const again = await processPosts([igPost("A", "Alquiler 1 dormitorio en Pocitos 📍 Charrúa y Luis Ponce — Pocitos $27.500")], new Map([["A", processed[0]!.memory]]), ctx);
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(again.processed[0]!.row).toMatchObject({ latitude: -34.91 });
  });
});

// --- Task 4: the copy guard ------------------------------------------------------------------------

const factsFor = (corner: string | null, price: number | null, bedrooms: number | null) =>
  ({ ...parseCaption(["Alquiler en Montevideo"], []), addressCandidates: corner ? [corner] : [], price, currency: "UYU" as const, bedrooms });
const entry = (source: SocialEntry["source"], id: string, keys: string[], createTime = 1790000000): SocialEntry =>
  ({ source, listingId: `${source}:${id}`, row: { listingId: `${source}:${id}` } as never, keys, createTime });
const NOW = "2026-09-24T05:00:00.000Z";

describe("the copy guard", () => {
  it("keys a flat by corner (streets in any order), price and bedrooms, and never without all three", () => {
    expect(factKey(factsFor("Gaboto y La Paz", 22000, 2))).toBe(factKey(factsFor("La Paz y Gaboto", 22000, 2)));
    expect(factKey(factsFor("Gaboto esq. La Paz", 22000, 2))).toBe(factKey(factsFor("La Paz y Gaboto", 22000, 2)));
    // The address reader drops a leading article ("La Paz y Gaboto" → "Paz y Gaboto"), and captions
    // write "Av. Italia" and "Avenida Italia": the key does not care.
    expect(factKey(factsFor("Paz y Gaboto", 22000, 2))).toBe(factKey(factsFor("Gaboto y La Paz", 22000, 2)));
    expect(factKey(factsFor("Av. Italia y Garibaldi", 30000, 1))).toBe(factKey(factsFor("Garibaldi y Avenida Italia", 30000, 1)));
    expect(factKey(factsFor("Bvar. Artigas y Gral. Flores", 30000, 1))).toBe(factKey(factsFor("Artigas y Flores", 30000, 1)));
    expect(factKey(factsFor("Gaboto y La Paz", 22000, 3))).not.toBe(factKey(factsFor("Gaboto y La Paz", 22000, 2)));
    expect(factKey(factsFor("Gaboto y La Paz", 23000, 2))).not.toBe(factKey(factsFor("Gaboto y La Paz", 22000, 2)));
    expect(factKey(factsFor(null, 22000, 2))).toBeNull();
    expect(factKey(factsFor("Gaboto y La Paz", 22000, null))).toBeNull();
    expect(factKey(factsFor("Gaboto y La Paz", null, 2))).toBeNull();
  });

  it("twins posts by their caption, ignoring emojis and hashtags, on any network and under any handle", () => {
    const text = "🏠 Alquiler Pocitos / Puerto del Buceo – 1 dormitorio 📍 Marco Bruto y Rivera 💰 $26.000 #alquiler";
    const post = (id: string, lines: string[], handle = "inmobiliariaalquilar") =>
      ({ source: "instagram" as const, id, url: "", lines, createTime: 1, author: { uniqueId: handle, nickname: "", secUid: "" }, cover: null, hashtags: [] });
    expect(textKey(post("a", [text]))).toBe(textKey(post("b", [text.replace("🏠 ", "") + " #reels"])));
    // The same caption pasted by one agency under another handle is the same advert.
    expect(textKey(post("c", [text], "otra.inmo"))).toBe(textKey(post("a", [text])));
    // The first key (network + handle) survives only to keep the claims stored under it.
    expect(legacyTextKey(post("c", [text], "otra.inmo"))).not.toBe(legacyTextKey(post("a", [text])));
    expect(textKey(post("d", ["Alquiler"]))).toBeNull();
  });

  it("publishes one of the same flat across networks: TikTok first, then the oldest", () => {
    const r = resolveCopies([entry("facebookreels", "1", ["k"], 1), entry("instagram", "2", ["k"], 2), entry("tiktok", "3", ["k"], 3), entry("instagram", "4", ["other"])], new Map(), NOW);
    expect(r.keep.map(e => e.listingId).sort()).toEqual(["instagram:4", "tiktok:3"]);
    expect(r.copies.map(c => [c.entry.listingId, c.of]).sort()).toEqual([["facebookreels:1", "tiktok:3"], ["instagram:2", "tiktok:3"]]);
    expect(r.claims).toEqual(expect.arrayContaining([expect.objectContaining({ key: "k", listingId: "tiktok:3", source: "tiktok", firstPublishedAt: NOW, lastSeenAt: NOW })]));
    const sameNetwork = resolveCopies([entry("instagram", "late", ["t"], 20), entry("instagram", "early", ["t"], 10)], new Map(), NOW);
    expect(sameNetwork.keep.map(e => e.listingId)).toEqual(["instagram:early"]);
  });

  it("joins groups transitively: a reel that shares its caption with one copy and its corner with another is the same flat", () => {
    const r = resolveCopies([entry("instagram", "carousel", ["texto:x"]), entry("instagram", "reel", ["texto:x", "hechos:y"]), entry("tiktok", "video", ["hechos:y"])], new Map(), NOW);
    expect(r.keep.map(e => e.listingId)).toEqual(["tiktok:video"]);
    expect(r.claims.map(c => c.key).sort()).toEqual(["hechos:y", "texto:x"]);
  });

  it("keeps the flat with its first publisher: a live claimant seen today wins, and one unseen today blocks every copy", () => {
    const live = new Map([["k", { key: "k", listingId: "instagram:2", source: "instagram" as const, firstPublishedAt: "2026-09-10T00:00:00.000Z", lastSeenAt: "2026-09-23T05:00:00.000Z" }]]);
    const seen = resolveCopies([entry("tiktok", "3", ["k"]), entry("instagram", "2", ["k"])], live, NOW);
    expect(seen.keep.map(e => e.listingId)).toEqual(["instagram:2"]);
    expect(seen.claims.find(c => c.key === "k")).toMatchObject({ listingId: "instagram:2", firstPublishedAt: "2026-09-10T00:00:00.000Z", lastSeenAt: NOW });
    const unseen = resolveCopies([entry("tiktok", "3", ["k"])], live, NOW);
    expect(unseen.keep).toEqual([]);
    expect(unseen.copies).toEqual([expect.objectContaining({ of: "instagram:2" })]);
    expect(unseen.claims).toEqual([]);
  });

  it("never groups an entry without keys", () => {
    expect(resolveCopies([entry("tiktok", "1", []), entry("tiktok", "2", [])], new Map(), NOW).keep).toHaveLength(2);
  });
});

describe("harvestSocial", () => {
  const processedFor = (source: "tiktok" | "instagram", id: string, corner: string) => {
    const text = `Alquiler 2 dormitorios en Montevideo 📍 ${corner} $22.000`;
    const post = { source, id, url: `https://example.com/${id}`, lines: [text], createTime: 1790000000, author: { uniqueId: "a", nickname: "", secUid: "" }, cover: null, hashtags: [] };
    const facts = parseCaption([text], []);
    return { post, facts, row: { listingId: `${source}:${id}`, source } as never, memory: {} as never };
  };
  const runOf = (source: "tiktok" | "instagram", items: ReturnType<typeof processedFor>[]) => async () =>
    ({ result: { key: source, ok: true, complete: false, listings: items.map(p => p.row), note: `${items.length} avisos` }, processed: items });

  it("runs every network, drops copies across them, says so in the note, and survives a network that throws", async () => {
    const saved: unknown[] = [];
    const claims = { loadLiveClaims: async () => new Map(), saveClaims: async (rows: unknown[]) => { saved.push(...rows); }, pruneClaims: async () => {} };
    const results = await harvestSocial("full", 40, {
      runs: [
        runOf("tiktok", [processedFor("tiktok", "1", "Gaboto y La Paz")]),
        runOf("instagram", [processedFor("instagram", "A", "La Paz y Gaboto"), processedFor("instagram", "B", "Rivera y Soca")]),
        async () => { throw new Error("boom"); },
      ],
      claims, now: () => new Date(NOW), env: {},
    });
    expect(results.map(r => [r.key, r.listings.length])).toEqual([["tiktok", 1], ["instagram", 1], ["facebookreels", 0]]);
    expect(results[0]!.note).toBe("1 avisos");
    expect(results[1]!.note).toBe("2 avisos; 1 copia de un aviso ya publicado (en esta u otra red)");
    expect(results[2]).toMatchObject({ key: "facebookreels", ok: false, complete: false, note: "falla: Error" });
    expect(saved.length).toBeGreaterThan(0);
  });

  it("still guards within the run when the claims cannot be read", async () => {
    const claims = { loadLiveClaims: async () => { throw new Error("mongo down"); }, saveClaims: async () => {}, pruneClaims: async () => {} };
    const results = await harvestSocial("full", 40, {
      runs: [runOf("tiktok", [processedFor("tiktok", "1", "Gaboto y La Paz")]), runOf("instagram", [processedFor("instagram", "A", "La Paz y Gaboto")])],
      claims, now: () => new Date(NOW), env: {},
    });
    expect(results.map(r => r.listings.length)).toEqual([1, 0]);
  });
});
