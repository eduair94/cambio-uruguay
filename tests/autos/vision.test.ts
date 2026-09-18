import { describe, expect, it } from "vitest";
import { detailPictures } from "../../classes/autos/detail";
import { downloadPhotos, photoCorroborates, photoRejection, visionPrompt, type CarPhotoVerdict } from "../../classes/autos/llm/vision";

const verdict = (overrides: Partial<CarPhotoVerdict> = {}): CarPhotoVerdict => ({
  readAt: "2026-09-18T12:00:00.000Z",
  model: "gemini-2.5-flash-lite",
  matchesAdvert: true,
  damage: "ninguno",
  catalogPhotos: false,
  note: "Auto entero, sin golpes visibles",
  photos: 4,
  ...overrides,
});

describe("detailPictures", () => {
  it("takes the advert's own gallery and nobody else's images", () => {
    const html = `
      <img src="https://otro.cdn.com/banner.jpg" />
      <figure data-zoom="https://http2.mlstatic.com/D_NQ_NP_2X_1-F.jpg"></figure>
      <figure data-zoom="https://http2.mlstatic.com/D_NQ_NP_2X_2-F.jpg"></figure>
      <figure data-zoom="https://http2.mlstatic.com/D_NQ_NP_2X_1-F.jpg"></figure>`;
    expect(detailPictures(html)).toEqual([
      "https://http2.mlstatic.com/D_NQ_NP_2X_1-F.jpg",
      "https://http2.mlstatic.com/D_NQ_NP_2X_2-F.jpg",
    ]);
    expect(detailPictures(html, 1)).toHaveLength(1);
  });
});

describe("photoRejection", () => {
  it("retires an opportunity only on what the photos show beyond doubt", () => {
    expect(photoRejection(verdict())).toBeNull();
    expect(photoRejection(null)).toBeNull();
    // "No se ve" nunca retira nada, y la chapa y pintura tampoco: media flota usada la tiene.
    expect(photoRejection(verdict({ damage: "no_se_ve", matchesAdvert: null }))).toBeNull();
    expect(photoRejection(verdict({ damage: "leve" }))).toBeNull();
    expect(photoRejection(verdict({ damage: "grave" }))).toBe("photo_damage");
    expect(photoRejection(verdict({ matchesAdvert: false }))).toBe("photo_mismatch");
    expect(photoRejection(verdict({ catalogPhotos: true }))).toBe("photo_catalog");
  });
});

describe("photoCorroborates", () => {
  it("only ever confirms what the advert itself already declared", () => {
    expect(photoCorroborates(verdict({ damage: "grave" }), true)).toBe(true);
    expect(photoCorroborates(verdict({ damage: "leve" }), true)).toBe(true);
    // El aviso no declara nada: el sitio no lo acusa por una foto.
    expect(photoCorroborates(verdict({ damage: "grave" }), false)).toBe(false);
    expect(photoCorroborates(verdict({ damage: "ninguno" }), true)).toBe(false);
    expect(photoCorroborates(null, true)).toBe(false);
  });
});

describe("visionPrompt", () => {
  it("tells the model what the advert claims, so it can be contradicted", () => {
    const prompt = visionPrompt({
      key: "ml-1", title: "Chevrolet Onix 1.4 LT impecable", brand: "Chevrolet", model: "Onix",
      year: 2019, trim: "Lt", km: 90_000, description: "Único dueño", pictures: ["x"],
    });
    expect(prompt).toContain("Chevrolet Onix 2019");
    expect(prompt).toContain("versión Lt");
    expect(prompt).toContain("90.000 km");
    expect(prompt).toContain("Único dueño");
  });
});

describe("downloadPhotos", () => {
  it("skips what it cannot read and what is too heavy to send", () => {
    const fetcher = async (url: string) =>
      url.endsWith("big") ? Buffer.alloc(1_000_000) : url.endsWith("dead") ? null : Buffer.from("foto");
    return downloadPhotos(["a.jpg", "b/big", "c/dead", "d.png"], { fetcher }).then(images => {
      expect(images.map(image => image.mimeType)).toEqual(["image/jpeg", "image/png"]);
    });
  });
});
