import { describe, expect, it } from "vitest";
import { detailPictures } from "../../classes/autos/detail";
import { encode } from "jpeg-js";
import {
  CAR_VISION_SCHEMA,
  downloadPhotos,
  needsRecheck,
  odometerContradicts,
  photoCorroborates,
  photoRejection,
  visionPrompt,
  type CarPhotoVerdict,
} from "../../classes/autos/llm/vision";

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
    expect(photoRejection(verdict({ catalogPhotos: true }))).toBe("photo_catalog");
    // Medido en producción: los dos rechazos por "no concuerda" fueron falsos (uno juzgaba el AÑO
    // por una foto, el otro decía no poder confirmarlo y contestaba que no). Ya no descalifica.
    expect(photoRejection(verdict({ matchesAdvert: false }))).toBeNull();
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

const photo = (width: number, height: number, tint = 0, mirror = false): Buffer => {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    data[i * 4] = ((mirror ? width - x : x) * 255) / width;
    data[i * 4 + 1] = (y * 255) / height;
    data[i * 4 + 2] = tint;
    data[i * 4 + 3] = 255;
  }
  return encode({ data, width, height }, 85).data;
};

describe("downloadPhotos", () => {
  it("keeps real photos, shrunk, and skips what is dead, tiny or not an image", async () => {
    const files: Record<string, Buffer | null> = {
      "a.jpg": photo(1200, 900),
      "b/tiny": photo(200, 150, 90),
      "c/dead": null,
      "d.jpg": Buffer.from("no soy una foto".repeat(500)),
      "e.jpg": photo(1200, 900, 200, true),
    };
    const images = await downloadPhotos(Object.keys(files), { fetcher: async url => files[url] });
    expect(images).toHaveLength(2);
    expect(images.every(image => image.mimeType === "image/jpeg")).toBe(true);
  });
});

describe("odometerContradicts", () => {
  it("retires only a dashboard that reads far MORE than the advert says", () => {
    expect(odometerContradicts({ odometerKm: 208_936 }, 130_000)).toBe(true);
    expect(odometerContradicts({ odometerKm: 168_709 }, 178_000)).toBe(false);
    expect(odometerContradicts({ odometerKm: 150_000 }, 140_000)).toBe(false);
    expect(odometerContradicts({ odometerKm: 30_000 }, 10_000)).toBe(true);
    expect(odometerContradicts({ odometerKm: 25_000 }, 10_000)).toBe(false);
    expect(odometerContradicts({ odometerKm: 200_000 }, null)).toBe(false);
    expect(odometerContradicts({ odometerKm: null }, 100_000)).toBe(false);
    expect(odometerContradicts(null, 100_000)).toBe(false);
  });

  it("distrusts a reading more than five times the advert: a tenths drum, not a seller", () => {
    expect(odometerContradicts({ odometerKm: 874_123 }, 87_000)).toBe(false);
    expect(odometerContradicts({ odometerKm: 400_000 }, 90_000)).toBe(true);
  });

  it("becomes a silent photo_km rejection, after damage and catalog photos", () => {
    expect(photoRejection(verdict({ odometerKm: 208_936 }), 130_000)).toBe("photo_km");
    expect(photoRejection(verdict({ odometerKm: 208_936 }))).toBeNull();
    expect(photoRejection(verdict({ odometerKm: 208_936, damage: "grave" }), 130_000)).toBe("photo_damage");
    // La palanca se guarda pero todavía no retira nada.
    expect(photoRejection(verdict({ gearbox: "manual" }), 90_000)).toBeNull();
  });
});

describe("needsRecheck", () => {
  it("re-reads verdicts from before the dashboard was asked for", () => {
    expect(needsRecheck(verdict())).toBe(true);
    expect(needsRecheck(verdict({ schema: CAR_VISION_SCHEMA }))).toBe(false);
    expect(needsRecheck(null)).toBe(false);
  });
});
