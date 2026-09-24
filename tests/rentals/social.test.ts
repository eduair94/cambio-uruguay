import { describe, expect, it } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";
import { postToRawRental, hashtagsIn } from "../../classes/rentals/sources/social/post";
import { parseCaption } from "../../classes/rentals/sources/social/caption";

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
