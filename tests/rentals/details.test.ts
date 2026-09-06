import { describe, expect, it } from "vitest";
import { rentalDescription, rentalImages, rentalOfferDetails } from "../../classes/rentals/details";
import { toRawRental as infoCasas } from "../../classes/rentals/sources/infocasas";
import { elpaisToRawRental } from "../../classes/rentals/sources/elpais";
import { buildRentalProperties } from "../../classes/rentals/dedupe";
import { partitionRentalOffers, propertyFromRentalOffers } from "../../classes/rentals/reconcile";
import { mergeOffers } from "../../classes/rentals/store";

describe("original advert detail, without executable content or contacts", () => {
  it("keeps property facts and paragraphs while stripping scripts, email, phone and links", () => {
    const description = rentalDescription(`
      <p>Apartamento <b>301</b>. 2 dormitorios, 1 baño y 60 m².</p>
      <p>Balcón al frente.<br>Garantía ANDA.</p>
      <script>window.secret='do not include'</script>
      <style>.contact{display:none}</style>
      <p>WhatsApp +598 99 123 456. Teléfono (2901) 2345.</p>
      <a href="mailto:agent@example.com">agent@example.com</a>
      <a href="tel:099123456">099123456</a>
      <p>consultas @ example.com https://example.com/contacto www.agencia.uy @inmobiliaria</p>`);
    expect(description).toContain("Apartamento 301. 2 dormitorios, 1 baño y 60 m².");
    expect(description).toContain("Balcón al frente.\nGarantía ANDA.");
    expect(description).not.toMatch(/script|secret|example|agencia|inmobiliaria|123|2345|mailto|<|>/);
  });

  it("removes zero-width email obfuscation and does not parse non-string data", () => {
    expect(rentalDescription("Escribir a agente\u200B@example.com. 2 dormitorios")).toBe("Escribir a . 2 dormitorios");
    expect(rentalDescription({ phone: "099123456" })).toBe("");
    expect(rentalDescription("x".repeat(20_000))).toHaveLength(8_000);
    expect(rentalOfferDetails({ description: "x".repeat(20_000) }).description).toHaveLength(2_400);
  });

  it.each([
    "+598&nbsp;99&nbsp;123&nbsp;456",
    "+598\u202F99\u202F123\u202F456",
    "099–123–456",
    "099<br>123<br>456",
  ])("removes phone numbers separated by HTML/Unicode whitespace or dashes: %s", phone => {
    expect(rentalDescription(`Unidad 301. Contacto: ${phone}`)).toBe("Unidad 301. Contacto:");
    const details = rentalOfferDetails({ description: phone, guaranteeText: phone, amenities: [phone] });
    expect(details.description).toBe("");
    expect(details.guaranteeText).toBe("");
    expect(details.amenities).toEqual([]);
  });

  it("can sanitize an already harvested detail again without changing its facts or gallery", () => {
    const input = {
      description: "<p>Unidad <b>301</b>: 48 m² cubiertos y balcón.</p><p>Tel. +598&nbsp;99&nbsp;123&nbsp;456</p>",
      images: ["https://images.example.com/301.jpg", "https://images.example.com/301.jpg#duplicate"],
      builtArea: 48, totalArea: 57, landArea: null, terraceArea: 9,
      amenities: ["Ascensor", "<b>Balcón</b>"], guaranteeText: "ANDA. consulta@example.com",
    };
    const once = rentalOfferDetails(input);
    expect(rentalOfferDetails(once)).toEqual(once);
    const privateText = rentalDescription(input.description);
    expect(rentalDescription(privateText)).toBe(privateText);
  });

  it("accepts only remote web media, deduplicates and caps the gallery", () => {
    const valid = "https://images.example.com/property.jpg?signature=abc";
    expect(rentalImages([
      "javascript:alert(1)", "data:image/svg+xml,<svg/>", "file:///etc/passwd", "http://localhost/a.jpg",
      "http://127.0.0.1/a.jpg", "http://192.168.0.1/a.jpg", "http://[::1]/a.jpg", "https://user:pass@images.example.com/a.jpg",
      valid, valid + "#fragment", 42,
    ])).toEqual([valid]);
    expect(rentalImages(Array.from({ length: 25 }, (_, index) => `https://images.example.com/${index}.jpg`))).toHaveLength(12);
  });

  it("sanitizes every free-text field and leaves missing or nonsensical measures unknown", () => {
    const details = rentalOfferDetails({
      builtArea: 52, totalArea: 68,
      guaranteeText: "ANDA. Consultas: consulta@example.com / 099 123 456",
      amenities: ["Ascensor", "Ascensor", "Gimnasio", "contacto@example.com", "099 123 456", null],
    });
    expect(details).toMatchObject({ builtArea: 52, totalArea: 68, amenities: ["Ascensor", "Gimnasio"] });
    expect(details.guaranteeText).not.toMatch(/@|099|123/);
    for (const value of [null, undefined, "", false, -5, Infinity, 1_000_001]) {
      expect(rentalOfferDetails({ builtArea: value, totalArea: value })).toMatchObject({ builtArea: null, totalArea: null });
    }
  });
});

describe("source details keep their original attribution and do not guess unavailable facts", () => {
  it("retains InfoCasas original description, distinct areas, structured facilities and guarantee field", () => {
    const row = infoCasas({
      id: 123, title: "Apartamento en alquiler", link: "/apartamento-en-alquiler/123",
      description: "<p>Unidad 301, balcón al frente.</p><p>WhatsApp 099123456</p>",
      address: "Soriano 1234", m2Built: 48, m2: 57,
      showAddress: false, m2Terrain: 90, m2Terrace: 9,
      latitude: -34.9, longitude: -56.1,
      locations: { state: [{ name: "Montevideo" }], neighbourhood: [{ name: "Centro" }], city: [{ name: "Montevideo" }] },
      price: { amount: 25000, currency: { name: "$" } },
      facilities: [{ id: 12, name: "Ascensor" }, { id: 13, name: "Balcón" }],
      guarantee: "ANDA o CGN", img: "https://images.example.com/123.jpg",
      images: [{ image: "https://images.example.com/124.jpg" }, { image: "https://images.example.com/123.jpg" }],
    });
    expect(row?.description).toContain("Unidad 301");
    expect(row?.description).not.toContain("099123456");
    expect(row?.details).toMatchObject({
      builtArea: 48, totalArea: 57, amenities: ["Ascensor", "Balcón"], guaranteeText: "ANDA o CGN",
      landArea: 90, terraceArea: 9,
      images: ["https://images.example.com/123.jpg", "https://images.example.com/124.jpg"],
    });
    expect(row?.publishedAt).toBeNull();
    expect(row?.addressHidden).toBe(true);
    expect(row).toMatchObject({ address: "", street: "", streetNumber: "", latitude: null, longitude: null, neighborhood: "Centro", locality: "Montevideo" });
  });

  it("uses El País's original description and all source images with the primary first, excluding AI and contacts", () => {
    const row = elpaisToRawRental({
      _id: "6a42b0f33b79e8db94e28523", title: "Apartamento en alquiler", transactionType: "rental",
      status: "active", province: "Montevideo", price: { amount: 25000, currency: "UYU" },
      description: "Unidad 301. Patio privado. Escribir a consulta@example.com",
      images: [{ url: "https://images.example.com/2.jpg" }, { publicUrl: "https://images.example.com/1.jpg", isPrimary: true }],
      areaM2: 64, landAreaM2: 99,
      visualDescription: "Inferred swimming pool", featureIds: ["SWIMMING_POOL"], amenities: ["Piscina"],
      contact: { phone: "099123456", email: "contact@example.com" },
      sourceAgency: { raw: "Agencia", emails: ["private@example.com"] },
    });
    expect(row?.details).toEqual({
      description: "Unidad 301. Patio privado. Escribir a",
      images: ["https://images.example.com/1.jpg", "https://images.example.com/2.jpg"],
      builtArea: null, totalArea: null, landArea: 99, terraceArea: null, amenities: [], guaranteeText: "",
    });
    expect(JSON.stringify(row)).not.toMatch(/@|099123456|swimming|SWIMMING_POOL|Piscina/);
    expect(row?.area).toBe(64);
    expect(row?.publishedAt).toBeNull();
  });

  it("preserves each advert's own description/gallery after clustering, history merge and separation", () => {
    const read = (id: number, unit: number, description: string) => infoCasas({
      id, title: `Apartamento unidad ${unit}`, address: `Soriano 1234 unidad ${unit}`, showAddress: true,
      link: `/apartamento-unidad-${unit}/${id}`, description,
      bedrooms: 2, bathrooms: 1, m2Built: 48, m2: 57,
      img: `https://images.example.com/${id}.jpg`,
      price: { amount: 25000, currency: { name: "$" } },
      locations: { state: [{ name: "Montevideo" }], neighbourhood: [{ name: "Centro" }], city: [{ name: "Montevideo" }] },
    })!;
    const first = read(123, 301, "Unidad 301. Balcón al frente. 099123456");
    const second = read(456, 302, "Unidad 302. Patio al contrafrente. privado@example.com");
    const properties = buildRentalProperties([first, second], {
      usdUyu: 40, today: "2026-09-06", offerFirstSeen: new Map([["infocasas:123", "2026-08-01"]]),
      propertyFirstSeen: new Map(), offerToProperty: new Map(),
    });
    expect(properties).toHaveLength(2);
    const offers = properties.flatMap(property => property.offers);
    const partitions = partitionRentalOffers(mergeOffers(offers, [], {
      today: "2026-09-06", okSources: new Set(), staleOfferDays: 4,
    }), 40);
    expect(partitions).toHaveLength(2);
    const rebuilt = partitions.map((partition, index) => propertyFromRentalOffers(`own-${index}`, partition, 40));
    const firstOffer = rebuilt.flatMap(property => property.offers).find(offer => offer.listingId === "infocasas:123")!;
    expect(firstOffer.identity?.description).toBe("Unidad 301. Balcón al frente.");
    expect(firstOffer.details?.description).toBe("Unidad 301. Balcón al frente.");
    expect(firstOffer.details?.images).toEqual(["https://images.example.com/123.jpg"]);
    expect(firstOffer.firstSeen).toBe("2026-08-01");
    expect(JSON.stringify(rebuilt)).not.toMatch(/privado@example|099123456/);
  });
});
