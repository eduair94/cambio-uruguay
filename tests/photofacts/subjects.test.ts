import { describe, expect, it } from "vitest";
import { orderSubjects, photoOrder, rentalSubjects, saleSubjects, type PhotoSubject } from "../../classes/photofacts/subjects";
import { monthKey, monthStartUtc } from "../../classes/photofacts/store";

const NOW = new Date("2026-11-23T12:00:00.000Z");
const gallery = (n: number, prefix = "p") => Array.from({ length: n }, (_, i) => `https://cdn.example.com/${prefix}${i}.jpg`);

const offer = (overrides: Record<string, unknown> = {}) => ({
  source: "infocasas",
  listingId: "infocasas:1",
  image: "https://cdn.example.com/cover.jpg",
  details: { images: gallery(4) },
  lastSeen: "2026-11-22T10:00:00.000Z",
  sellerName: "Inmobiliaria Sur",
  ...overrides,
});

const property = (offers: unknown[], overrides: Record<string, unknown> = {}) => ({
  key: "montevideo-pocitos-abc",
  department: "Montevideo",
  propertyType: "apartamento",
  freshAt: "2026-11-20",
  offers,
  ...overrides,
});

describe("rentalSubjects", () => {
  it("takes current adverts with a gallery from the four portals, one subject per advert", () => {
    const subjects = rentalSubjects(
      [
        property([
          offer(),
          offer({ source: "facebook", listingId: "facebook:9" }),
          offer({ source: "tiktok", listingId: "tiktok:9" }),
          offer({ source: "mercadolibre", listingId: "mercadolibre:2", details: { images: gallery(1) } }),
          offer({ source: "casasweb", listingId: "casasweb:3", lastSeen: "2026-11-01T00:00:00.000Z" }),
        ]),
      ],
      NOW,
    );
    expect(subjects.map(s => s.id)).toEqual(["alquiler:infocasas:1"]);
    const [subject] = subjects;
    expect(subject).toMatchObject({
      vertical: "alquiler",
      propertyKey: "montevideo-pocitos-abc",
      source: "infocasas",
      advertiser: "infocasas:inmobiliaria-sur",
      department: "Montevideo",
      propertyType: "apartamento",
    });
    expect(subject.photos[0]).toBe("https://cdn.example.com/cover.jpg");
    expect(subject.photos).toHaveLength(5);
  });

  it("reads lastSeen stored as a bare date as well as a full ISO instant", () => {
    const ids = rentalSubjects(
      [
        property([
          offer({ listingId: "infocasas:edge", lastSeen: "2026-11-13" }),
          offer({ listingId: "infocasas:old", lastSeen: "2026-11-12" }),
          offer({ listingId: "infocasas:iso", lastSeen: "2026-11-13T00:30:00.000Z" }),
        ]),
      ],
      NOW,
    ).map(s => s.listingId);
    expect(ids).toEqual(["infocasas:edge", "infocasas:iso"]);
  });

  it("names the advertiser by agency first, then seller, then the advert itself", () => {
    const [byAgency, byListing] = rentalSubjects(
      [property([offer({ agency: { key: "ag-77" } }), offer({ listingId: "infocasas:2", sellerName: "" })])],
      NOW,
    );
    expect(byAgency.advertiser).toBe("infocasas:ag-77");
    expect(byListing.advertiser).toBe("infocasas:infocasas:2");
  });

  it("hashes the whole gallery: a changed photo changes the hash, the same gallery keeps it", () => {
    const [a] = rentalSubjects([property([offer()])], NOW);
    const [b] = rentalSubjects([property([offer()])], NOW);
    const [c] = rentalSubjects([property([offer({ details: { images: [...gallery(3), "https://cdn.example.com/nueva.jpg"] } })])], NOW);
    expect(a.galleryHash).toBe(b.galleryHash);
    expect(c.galleryHash).not.toBe(a.galleryHash);
  });
});

describe("saleSubjects", () => {
  it("takes sale adverts with three or more photos from InfoCasas and Casasweb", () => {
    const subjects = saleSubjects([
      { key: "v1", listingId: "infocasas-5", source: "infocasas", department: "Maldonado", propertyType: "casa", image: gallery(1)[0], images: gallery(3, "v"), firstSeen: "2026-11-10" },
      { key: "v2", listingId: "casasweb-6", source: "casasweb", image: null, images: gallery(2) },
      { key: "v3", listingId: "otro-7", source: "mercadolibre", images: gallery(9) },
    ]);
    expect(subjects.map(s => s.id)).toEqual(["venta:infocasas-5"]);
    expect(subjects[0]).toMatchObject({ vertical: "venta", department: "Maldonado", propertyType: "casa", freshAt: "2026-11-10" });
  });
});

describe("photoOrder", () => {
  it("sends the cover and photos spread over the gallery first, the rest as reserve", () => {
    const urls = gallery(20);
    const order = photoOrder(urls, 6);
    expect(order).toHaveLength(20);
    expect(new Set(order).size).toBe(20);
    expect(order[0]).toBe(urls[0]);
    const first = order.slice(0, 6).map(url => urls.indexOf(url));
    expect(first).toEqual([...first].sort((a, b) => a - b));
    expect(first[first.length - 1]).toBe(19);
    expect(photoOrder(gallery(4), 6)).toEqual(gallery(4));
  });
});

describe("orderSubjects", () => {
  const subject = (id: string, department: string, freshAt: string, galleryHash = "h"): PhotoSubject => ({
    id, vertical: "alquiler", listingId: id, propertyKey: id, source: "infocasas", advertiser: "a", department, freshAt,
    propertyType: "apartamento", photos: gallery(3), galleryHash,
  });

  it("puts Montevideo first, then the newest, and skips what is done or waiting", () => {
    const stored = new Map([
      ["done", { galleryHash: "h", schema: 1, ok: true }],
      ["changed", { galleryHash: "old", schema: 1, ok: true }],
      ["oldSchema", { galleryHash: "h", schema: 0, ok: true }],
      ["waiting", { galleryHash: "h", schema: 1, ok: false, nextTryAt: "2026-11-30T00:00:00.000Z" }],
      ["due", { galleryHash: "h", schema: 1, ok: false, nextTryAt: "2026-11-20T00:00:00.000Z" }],
    ]);
    const out = orderSubjects(
      [
        subject("canelones", "Canelones", "2026-11-23"),
        subject("mvdOld", "Montevideo", "2026-10-01"),
        subject("mvdNew", "Montevideo", "2026-11-22"),
        subject("done", "Montevideo", "2026-11-23"),
        subject("changed", "Montevideo", "2026-11-01"),
        subject("oldSchema", "Montevideo", "2026-09-01"),
        subject("waiting", "Montevideo", "2026-11-23"),
        subject("due", "Maldonado", "2026-11-01"),
        subject("mvdNew", "Montevideo", "2026-11-22"),
      ],
      stored,
      NOW,
      1,
    );
    expect(out.map(s => s.id)).toEqual(["mvdNew", "changed", "mvdOld", "oldSchema", "canelones", "due"]);
  });
});

describe("the month", () => {
  it("counts spend from the first day of the month, in UTC", () => {
    expect(monthStartUtc(new Date("2026-12-01T01:00:00.000Z"))).toBe("2026-12-01T00:00:00.000Z");
    expect(monthKey(new Date("2026-11-30T23:59:59.000Z"))).toBe("2026-11");
    expect(monthKey(new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12");
  });
});
