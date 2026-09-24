import { describe, expect, it, vi } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";
import { postToRawRental, hashtagsIn } from "../../classes/rentals/sources/social/post";
import { parseCaption } from "../../classes/rentals/sources/social/caption";
import { processPosts } from "../../classes/rentals/sources/social/process";

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
