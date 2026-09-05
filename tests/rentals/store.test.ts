import { beforeEach, describe, expect, it, vi } from "vitest";

const bulkWrite = vi.hoisted(() => vi.fn());
vi.mock("../../classes/models/RentalListing", () => ({
  RentalListingModel: { bulkWrite },
}));

import {
  mergeOffers,
  recomputeFromOffers,
  writeRentalPropertyPlan,
  type RentalWritePlan,
} from "../../classes/rentals/store";
import { propertyFromRentalOffers } from "../../classes/rentals/reconcile";
import type { RentalOffer, RentalProperty, RentalSource } from "../../classes/rentals/types";

const offer = (
  overrides: Partial<RentalOffer> & { source: RentalSource; listingId: string },
): RentalOffer => ({
  parkingSpaces: null,
  furnished: null,
  url: "https://example.com",
  title: "Apartamento",
  price: 30_000,
  currency: "UYU",
  priceUyu: 30_000,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: "x",
  sellerType: "desconocido",
  image: null,
  publishedAt: null,
  petsAllowed: null,
  guarantees: [],
  firstSeen: "2026-08-01",
  lastSeen: "2026-08-20",
  ...overrides,
});

const context = { today: "2026-08-20", okSources: new Set<RentalSource>(["infocasas"]), staleOfferDays: 4 };

describe("mergeOffers", () => {
  // The rule the hourly run depends on: a fast pass reads only today's adverts, so everything it
  // does NOT see must survive — otherwise every property it touches loses its other portals.
  it("keeps a stored advert a healthy portal simply has not re-shown yet", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", lastSeen: "2026-08-18" })],
      [],
      context,
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:1"]);
  });

  it("drops an advert a healthy portal has not shown for longer than the window", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", lastSeen: "2026-08-01" })],
      [],
      context,
    );
    expect(merged).toHaveLength(0);
  });

  it("never drops an advert whose portal was down this run", () => {
    const merged = mergeOffers(
      [offer({ source: "facebook", listingId: "facebook:1", lastSeen: "2026-01-01" })],
      [],
      context,
    );
    expect(merged).toHaveLength(1);
  });

  it("lets a fresh advert win over the stored copy of itself", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 30_000, priceUyu: 30_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 28_000, priceUyu: 28_000 })],
      context,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.priceUyu).toBe(28_000);
  });
  // La incompatibilidad debe separar propiedades en saveRentalProperties, nunca borrar avisos
  // vigentes durante la unión. El precio divergente sigue siendo una oferta válida del índice.
  it("keeps a live stored advert whose price diverges from the fresh advert", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:viejo", price: 21_000, priceUyu: 21_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:hoy", price: 41_000, priceUyu: 41_000 })],
      context,
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:viejo", "infocasas:hoy"]);
  });

  it("nunca suelta un aviso de la corrida de hoy, aunque sea el que se despega", () => {
    // La partición posterior recibe ambos avisos aunque hayan llegado juntos desde el origen.
    const merged = mergeOffers(
      [],
      [
        offer({ source: "infocasas", listingId: "infocasas:a", price: 21_000, priceUyu: 21_000 }),
        offer({ source: "infocasas", listingId: "infocasas:b", price: 41_000, priceUyu: 41_000 }),
      ],
      context,
    );
    expect(merged).toHaveLength(2);
  });

  it("keeps the minority price group when no fresh adverts were read", () => {
    const merged = mergeOffers(
      [
        offer({ source: "facebook", listingId: "facebook:barato", price: 21_000, priceUyu: 21_000 }),
        offer({ source: "facebook", listingId: "facebook:a", price: 41_000, priceUyu: 41_000 }),
        offer({ source: "facebook", listingId: "facebook:b", price: 41_000, priceUyu: 41_000 }),
      ],
      [],
      context,
    );
    expect(merged.map((item) => item.listingId).sort()).toEqual([
      "facebook:a",
      "facebook:b",
      "facebook:barato",
    ]);
  });

  it("keeps compatible cross-portal offers available for the later partition", () => {
    const merged = mergeOffers(
      [offer({ source: "facebook", listingId: "facebook:1", price: 30_000, priceUyu: 30_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 31_500, priceUyu: 31_500 })],
      context,
    );
    expect(merged).toHaveLength(2);
  });

  it("does not expire anything during a partial run and preserves observation dates", () => {
    const stored = offer({
      source: "infocasas",
      listingId: "infocasas:unseen",
      firstSeen: "2026-03-01",
      lastSeen: "2026-03-20",
      publishedAt: "2026-02-27",
    });
    const before = structuredClone(stored);
    const merged = mergeOffers([stored], [], { ...context, okSources: new Set<RentalSource>() });
    expect(merged).toEqual([before]);
    expect(stored).toEqual(before);
  });

  it("expires only the fully read source after the boundary, without touching other sources", () => {
    const merged = mergeOffers(
      [
        offer({ source: "infocasas", listingId: "infocasas:boundary", lastSeen: "2026-08-16" }),
        offer({ source: "infocasas", listingId: "infocasas:expired", lastSeen: "2026-08-15" }),
        offer({ source: "facebook", listingId: "facebook:down", lastSeen: "2026-01-01" }),
      ],
      [],
      context,
    );
    expect(merged.map((item) => item.listingId).sort()).toEqual(["facebook:down", "infocasas:boundary"]);
  });
});

describe("mergeOffers leaves price compatibility to the lossless partition", () => {
  it("keeps both endpoints of a price chain for subsequent separation", () => {
    // Caso real: quince "1 dormitorio en Tres Cruces" —piso 10, piso 9, PB con entrada propia, con
    // garaje— en una sola fila. Con referencia 26.900, tanto 26.500 como 28.800 estan dentro del
    // 7 %; entre ellos hay 8 %. Cada uno cerca del ancla, ninguno cerca del otro.
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:caro", price: 28_800, priceUyu: 28_800 })],
      [offer({ source: "infocasas", listingId: "infocasas:hoy", price: 26_500, priceUyu: 26_500 })],
      context,
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:hoy", "infocasas:caro"]);
  });

  it("does not discard the fourth advert to choose the largest price window", () => {
    // [26.500, 26.900, 27.000, 28.800]: las tres primeras entran en un 2 %; la cuarta rompe.
    const merged = mergeOffers(
      [
        offer({ source: "facebook", listingId: "facebook:a", price: 26_500, priceUyu: 26_500 }),
        offer({ source: "facebook", listingId: "facebook:b", price: 26_900, priceUyu: 26_900 }),
        offer({ source: "facebook", listingId: "facebook:c", price: 27_000, priceUyu: 27_000 }),
        offer({ source: "facebook", listingId: "facebook:d", price: 28_800, priceUyu: 28_800 }),
      ],
      [],
      context,
    );
    expect(merged.map((item) => item.listingId)).toEqual([
      "facebook:a",
      "facebook:b",
      "facebook:c",
      "facebook:d",
    ]);
  });
});

describe("recomputeFromOffers", () => {
  it("re-prices the property from the cheapest surviving advert", () => {
    const property = {
      key: "k",
      title: "t",
      propertyType: "apartamento",
      department: "Montevideo",
      neighborhood: "Pocitos",
      address: "",
      addressKey: "",
      latitude: null,
      longitude: null,
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
      priceUyu: 99_999,
      price: 99_999,
      currency: "UYU",
      offers: [],
      sources: [],
      firstSeen: "2026-08-10",
      lastSeen: "2026-08-10",
    } as unknown as RentalProperty;

    const result = recomputeFromOffers(property, [
      offer({
        source: "facebook",
        listingId: "facebook:1",
        price: 26_000,
        priceUyu: 26_000,
        firstSeen: "2026-07-02",
      }),
      offer({ source: "infocasas", listingId: "infocasas:1", price: 31_000, priceUyu: 31_000 }),
    ]);

    expect(result.priceUyu).toBe(26_000);
    expect(result.sources.sort()).toEqual(["facebook", "infocasas"]);
    expect(result.firstSeen).toBe("2026-07-02");
    expect(result.lastSeen).toBe("2026-08-20");
  });
});

describe("writeRentalPropertyPlan keeps the reviewed plan immutable", () => {
  beforeEach(() => {
    bulkWrite.mockReset();
  });

  it.each([false, true])("isolates timestamp and nested cast mutations, driver failure: %s", async (fail) => {
    const original = offer({
      source: "infocasas",
      listingId: "infocasas:original",
      guarantees: ["anda"],
      identity: {
        version: 1,
        propertyType: "apartamento",
        department: "Montevideo",
        neighborhood: "Pocitos",
        address: "Rizal 3715 unidad 301",
        street: "rizal",
        streetNumber: "3715",
        latitude: -34.9,
        longitude: -56.15,
        bedrooms: 2,
        bathrooms: 1,
        area: 60,
      },
    });
    const row = propertyFromRentalOffers("reviewed", [original], 40);
    const plan: RentalWritePlan = { assigned: [row], emptied: 0, separated: 0 };
    const before = structuredClone(plan);
    bulkWrite.mockImplementation(async (operations) => {
      const set = operations[0].updateOne.update.$set;
      expect(set).toEqual(before.assigned[0]);
      // Mongoose timestamp/cast processing may mutate the submitted update, including arrays.
      set.updatedAt = new Date("2026-09-05T10:00:00Z");
      set.priceUyu = 99_999;
      set.sources.push("facebook");
      set.guarantees.push("cgn");
      set.offers[0].priceUyu = 99_999;
      set.offers[0].identity.address = "Driver-mutated address";
      set.offers[0].guarantees.push("cgn");
      if (fail) throw new Error("Synthetic driver failure");
      return {};
    });

    if (fail) await expect(writeRentalPropertyPlan(plan)).rejects.toThrow("Synthetic driver failure");
    else expect(await writeRentalPropertyPlan(plan)).toBe(1);

    expect(plan).toEqual(before);
    expect(row).not.toHaveProperty("updatedAt");
    expect(bulkWrite).toHaveBeenCalledTimes(1);
    expect(bulkWrite.mock.calls[0][1]).toEqual({ ordered: false });
  });
});
