import { describe, expect, it } from "vitest";
import { toClaudeSchema } from "../../classes/anthropic";
import {
  PHOTO_FACTS_JSON_SCHEMA,
  PHOTO_FACTS_SYSTEM,
  normalizePhotoFacts,
  photoFactsPrompt,
} from "../../classes/photofacts/schema";

const photo = (i: number, kind: string, extra: Record<string, unknown> = {}) => ({ i, kind, render: false, watermark: false, collage: false, ...extra });

const reply = (overrides: Record<string, unknown> = {}) => ({
  photos: [photo(0, "living"), photo(1, "balcon_terraza"), photo(2, "dormitorio"), photo(3, "plano")],
  furniture: "si",
  furniturePhoto: 0,
  balconyTerrace: 1,
  patioGarden: null,
  barbecue: null,
  pool: null,
  acUnit: 0,
  integratedKitchen: null,
  cover: 0,
  note: "Living   amueblado,\n dormitorio y balcón.",
  ...overrides,
});

describe("normalizePhotoFacts", () => {
  it("keeps what a real photo shows, with the photo that shows it", () => {
    const out = normalizePhotoFacts(reply(), 4)!;
    expect(out.facts).toEqual({
      furniture: "si",
      furniturePhoto: 0,
      seen: { balconyTerrace: 1, patioGarden: null, barbecue: null, pool: null, acUnit: 0, integratedKitchen: null },
    });
    expect(out.cover).toBe(0);
    expect(out.note).toBe("Living amueblado, dormitorio y balcón.");
    expect(out.photos.map(p => p.kind)).toEqual(["living", "balcon_terraza", "dormitorio", "plano"]);
  });

  it("never turns anything but a photo index into a fact", () => {
    const out = normalizePhotoFacts(reply({ balconyTerrace: "si", pool: 9, patioGarden: -1, barbecue: 1.5 }), 4)!;
    expect(out.facts.seen).toMatchObject({ balconyTerrace: null, pool: null, patioGarden: null, barbecue: null });
  });

  it("does not let a render, a plan or a logo hold a fact", () => {
    const out = normalizePhotoFacts(
      reply({ photos: [photo(0, "living"), photo(1, "balcon_terraza", { render: true }), photo(2, "logo_o_vacia"), photo(3, "plano")], balconyTerrace: 1, pool: 2, acUnit: 3 }),
      4,
    )!;
    expect(out.facts.seen).toMatchObject({ balconyTerrace: null, pool: null, acUnit: null });
  });

  it("abstains on furniture without a real interior photo, or when any photo is a render", () => {
    const noInterior = normalizePhotoFacts(reply({ photos: [photo(0, "fachada_exterior"), photo(1, "vista")], furniturePhoto: 0, cover: 0 }), 2)!;
    expect(noInterior.facts).toMatchObject({ furniture: "no_se", furniturePhoto: null });
    const withRender = normalizePhotoFacts(reply({ photos: [photo(0, "living"), photo(1, "dormitorio", { render: true })] }), 2)!;
    expect(withRender.facts).toMatchObject({ furniture: "no_se", furniturePhoto: null });
    const empty = normalizePhotoFacts(reply({ furniture: "no", furniturePhoto: 2 }), 4)!;
    expect(empty.facts).toMatchObject({ furniture: "no", furniturePhoto: 2 });
    const unsure = normalizePhotoFacts(reply({ furniture: "quizás" }), 4)!;
    expect(unsure.facts.furniture).toBe("no_se");
  });

  it("drops out-of-range and repeated photo entries and maps unknown kinds to otro", () => {
    const out = normalizePhotoFacts(reply({ photos: [photo(0, "living"), photo(0, "cocina"), photo(7, "bano"), photo(1, "sotano")] }), 2)!;
    expect(out.photos).toEqual([
      { index: 0, kind: "living", render: false, watermark: false, collage: false },
      { index: 1, kind: "otro", render: false, watermark: false, collage: false },
    ]);
  });

  it("never picks a plan, a logo, a lone view or a render as the cover", () => {
    for (const [kind, extra] of [["plano", {}], ["logo_o_vacia", {}], ["vista", {}], ["living", { render: true }]] as const) {
      const out = normalizePhotoFacts(reply({ photos: [photo(0, kind, extra)], cover: 0 }), 1)!;
      expect(out.cover).toBeNull();
    }
    expect(normalizePhotoFacts(reply({ cover: 12 }), 4)!.cover).toBeNull();
  });

  it("caps the note and refuses a reply that is not an object", () => {
    expect(normalizePhotoFacts(reply({ note: "x".repeat(500) }), 4)!.note).toHaveLength(200);
    expect(normalizePhotoFacts(null, 4)).toBeNull();
    expect(normalizePhotoFacts([reply()], 4)).toBeNull();
    expect(normalizePhotoFacts("{}", 4)).toBeNull();
  });
});

describe("the question", () => {
  it("names the operation and the photo count, and carries nothing the advert says", () => {
    const prompt = photoFactsPrompt({ vertical: "venta", propertyType: "apartamento", photoCount: 6 });
    expect(prompt).toContain("venta de apartamento");
    expect(prompt).toContain("de 0 a 5");
    expect(photoFactsPrompt({ vertical: "alquiler", propertyType: "otro", photoCount: 3 })).toContain("alquiler de vivienda");
  });

  it("never asks for text off the photos and has no negative answer for amenities", () => {
    expect(PHOTO_FACTS_SYSTEM).toMatch(/No transcribas/);
    expect(PHOTO_FACTS_SYSTEM).not.toMatch(/humedad/i);
    const schema = JSON.stringify(PHOTO_FACTS_JSON_SCHEMA);
    expect(schema).not.toMatch(/matr[ií]cula|tel[eé]fono|plate|phone/i);
  });

  it("is long enough to be cached by Haiku 5.5 (512 tokens is roughly 1.800 characters of Spanish)", () => {
    expect(PHOTO_FACTS_SYSTEM.length).toBeGreaterThan(1800);
  });

  it("travels to Claude as a closed schema", () => {
    const claude = toClaudeSchema(PHOTO_FACTS_JSON_SCHEMA) as any;
    expect(claude.additionalProperties).toBe(false);
    expect(claude.properties.pool).toEqual({ anyOf: [{ type: "integer" }, { type: "null" }] });
    expect(claude.properties.photos.items.additionalProperties).toBe(false);
  });
});
