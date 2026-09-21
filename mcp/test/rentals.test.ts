import { describe, expect, it } from "vitest";
import { SiteError } from "../src/site";
import { compactRental } from "../src/rentals/compact";
import { getRental } from "../src/rentals/detail";
import { geocodeAddress, rentalSearchParams, searchRentals } from "../src/rentals/search";
import { fakeSite } from "./fakeSite";

export function rental(over: Record<string, unknown> = {}) {
  const offer = {
    source: "infocasas",
    listingId: "infocasas:1",
    url: "https://www.infocasas.com.uy/x/1",
    title: "Apto 2 dorm Pocitos",
    price: 30000,
    currency: "UYU",
    priceUyu: 30000,
    commonExpenses: 5000,
    commonExpensesCurrency: "UYU",
    sellerName: "Inmo Sur",
    sellerType: "inmobiliaria",
    lastSeen: "2026-09-20",
  };
  return {
    key: "montevideo-pocitos-abc",
    title: "Apto 2 dorm Pocitos",
    propertyType: "apartamento",
    department: "Montevideo",
    neighborhood: "Pocitos",
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    petsAllowed: true,
    guarantees: ["anda"],
    price: 30000,
    priceUyu: 30000,
    currency: "UYU",
    sources: ["infocasas"],
    offers: [offer],
    matchingOffer: offer,
    firstSeen: "2026-09-01",
    lastSeen: "2026-09-20",
    availability: { count: 0, status: "unconfirmed" },
    ...over,
  };
}

describe("compactRental", () => {
  it("adds expenses only from the same advert", () => {
    const r = compactRental(rental() as never);
    expect(r.monthlyUyu).toBe(35000);
    expect(r.siteUrl).toBe("https://cambio-uruguay.com/alquileres/montevideo-pocitos-abc");
    const noGc = compactRental(rental({ matchingOffer: { ...rental().matchingOffer, commonExpenses: null } }) as never);
    expect(noGc.monthlyUyu).toBeUndefined();
  });

  it("converts dollar expenses with the site rate", () => {
    const r = compactRental(
      rental({ matchingOffer: { ...rental().matchingOffer, commonExpenses: 100, commonExpensesCurrency: "USD" } }) as never,
      40
    );
    expect(r.expensesUyu).toBe(4000);
  });

  it("flags community availability reports", () => {
    const r = compactRental(rental({ availability: { count: 2, status: "reported" } }) as never);
    expect(r.reported).toBe("reported");
  });
});

describe("rentalSearchParams", () => {
  it("maps tool names to the site query names", () => {
    const q = rentalSearchParams({
      department: "Montevideo",
      neighborhoods: ["Pocitos", "Cordón"],
      guarantees: ["anda"],
      amenities: ["ascensor"],
      ownerDirect: true,
      monthlyMaxUyu: 40000,
      expensesMaxUyu: 6000,
      text: "terraza",
      neighborhoodQuality: ["denuncias"],
      perPage: 3,
    });
    expect(q).toMatchObject({
      department: "Montevideo",
      neighborhoods: ["Pocitos", "Cordón"],
      garantia: ["anda"],
      comodidades: ["ascensor"],
      dueno: true,
      monthlyMax: 40000,
      expensesMax: 6000,
      q: "terraza",
      servicios: ["denuncias"],
      availability: "hide_multiple",
      perPage: 6,
    });
  });

  it("uses a single neighborhood param and forces distance sort near a point", () => {
    const q = rentalSearchParams({ neighborhoods: ["Centro"], sort: "precio", hideReported: "none" }, { lat: -34.9, lng: -56.2, label: "Trabajo" });
    expect(q.neighborhood).toBe("Centro");
    expect(q.sort).toBe("distancia");
    expect(q.refLat).toBe(-34.9);
    expect(q.availability).toBeUndefined();
  });
});

describe("searchRentals", () => {
  const response = {
    meta: { generatedAt: "2026-09-21T10:00:00Z", usdUyu: 41 },
    items: [rental(), rental({ key: "k2", distanceKm: 3.2 })],
    total: 120,
    page: 1,
    perPage: 6,
    medianUyu: 32000,
    facets: { neighborhoods: [{ value: "Pocitos", count: 80 }] },
  };

  it("queries the directory and links the same search", async () => {
    const { site, calls } = fakeSite({ "/api/rentals": response });
    const out = await searchRentals(site, { department: "Montevideo", bedrooms: 2, perPage: 1 });
    expect(calls[0]).toMatchObject({ path: "/api/rentals", query: { department: "Montevideo", bedrooms: 2 } });
    expect((out.data.items as unknown[]).length).toBe(1);
    expect(out.data.siteUrl).toBe("https://cambio-uruguay.com/alquileres-uruguay?department=Montevideo&bedrooms=2&availability=hide_multiple");
    expect(out.text).toContain("120 viviendas");
    expect(out.text).toContain("$ 30.000 + GC $ 5.000 = $ 35.000/mes");
    expect(out.text).toContain("Pocitos (80)");
  });

  it("geocodes an address and filters by radius", async () => {
    const { site, calls } = fakeSite({
      "/api/rentals/geocode": { items: [{ label: "AV 18 DE JULIO 1234", lat: -34.9, lng: -56.18 }] },
      "/api/rentals": { ...response, items: [rental({ key: "near", distanceKm: 0.8 }), rental({ key: "far", distanceKm: 4 })] },
    });
    const out = await searchRentals(site, { near: { address: "18 de Julio 1234", radiusKm: 2 } });
    expect(calls[0]!.path).toBe("/api/rentals/geocode");
    expect(calls[1]!.query).toMatchObject({ refLat: -34.9, sort: "distancia" });
    expect((out.data.items as Array<{ key: string }>).map((i) => i.key)).toEqual(["near"]);
  });
});

describe("geocodeAddress", () => {
  it("explains how to retry when nothing matches", async () => {
    const { site } = fakeSite({ "/api/rentals/geocode": { items: [] } });
    await expect(geocodeAddress(site, { address: "Facultad" })).rejects.toThrow(/esquina/);
  });
});

describe("getRental", () => {
  const ficha = {
    property: { ...rental(), officialZone: { zone: "mvd:8", name: "Pocitos" } },
    usdUyu: 41,
    market: { status: "available", sampleSize: 50, medianRentUyu: 33000, p25RentUyu: 29000, p75RentUyu: 38000, differencePercent: -9 },
    similar: [rental({ key: "s1" })],
  };

  it("adds the market comparison and neighbourhood profile", async () => {
    const { site, calls } = fakeSite({
      "/api/rentals/ficha/montevideo-pocitos-abc": ficha,
      "/api/rentals/zone-profile": { name: "Pocitos", utilities: { levels: { agua: "high" } }, crime: { total: 2146, periodFrom: "2025-07-01", periodTo: "2026-06-30" } },
    });
    const out = await getRental(site, { key: "https://cambio-uruguay.com/alquileres/montevideo-pocitos-abc" });
    expect(calls[1]).toMatchObject({ path: "/api/rentals/zone-profile", query: { zone: "mvd:8" } });
    expect(out.text).toContain("9 % por debajo");
    expect(out.text).toContain("cortes de agua: alto");
    expect(out.text).toContain("2.146 delitos");
  });

  it("survives a missing neighbourhood profile", async () => {
    const { site } = fakeSite({
      "/api/rentals/ficha/montevideo-pocitos-abc": ficha,
      "/api/rentals/zone-profile": new SiteError(503, "caído"),
    });
    const out = await getRental(site, { key: "montevideo-pocitos-abc" });
    expect(out.data.neighborhood).toBeNull();
  });
});
