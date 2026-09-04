import { describe, expect, it } from "vitest";
import { mergeOffers, recomputeFromOffers } from "../../classes/rentals/store";
import type { RentalOffer, RentalProperty, RentalSource } from "../../classes/rentals/types";

const offer = (overrides: Partial<RentalOffer> & { source: RentalSource; listingId: string }): RentalOffer => ({
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
      context
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:1"]);
  });

  it("drops an advert a healthy portal has not shown for longer than the window", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", lastSeen: "2026-08-01" })],
      [],
      context
    );
    expect(merged).toHaveLength(0);
  });

  it("never drops an advert whose portal was down this run", () => {
    const merged = mergeOffers(
      [offer({ source: "facebook", listingId: "facebook:1", lastSeen: "2026-01-01" })],
      [],
      context
    );
    expect(merged).toHaveLength(1);
  });

  it("lets a fresh advert win over the stored copy of itself", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 30_000, priceUyu: 30_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 28_000, priceUyu: 28_000 })],
      context
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.priceUyu).toBe(28_000);
  });
  // Una union tenia que volver a ganarse cada corrida y no lo hacia: alcanzaba con que el portal
  // estuviera vivo y el aviso no estuviera vencido por dias. Auditado el 2026-09-03: la propiedad
  // de Av. Ing. Luis Ponce publicaba [21.000, 41.000, 41.000] como un solo alquiler.
  it("suelta un aviso guardado cuyo precio se despego del de la corrida de hoy", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:viejo", price: 21_000, priceUyu: 21_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:hoy", price: 41_000, priceUyu: 41_000 })],
      context
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:hoy"]);
  });

  it("nunca suelta un aviso de la corrida de hoy, aunque sea el que se despega", () => {
    // Los frescos ya pasaron por sameUnit hace un instante; el que tiene que reganarse es lo guardado.
    const merged = mergeOffers(
      [],
      [
        offer({ source: "infocasas", listingId: "infocasas:a", price: 21_000, priceUyu: 21_000 }),
        offer({ source: "infocasas", listingId: "infocasas:b", price: 41_000, priceUyu: 41_000 }),
      ],
      context
    );
    expect(merged).toHaveLength(2);
  });

  it("sin avisos frescos manda el grupo mas numeroso, no el mas barato", () => {
    // Con [21.000, 41.000, 41.000] el raro es el barato: anclar al minimo tiraria los dos que si
    // coinciden entre si para quedarse con el unico que no coincide con nadie.
    const merged = mergeOffers(
      [
        offer({ source: "facebook", listingId: "facebook:barato", price: 21_000, priceUyu: 21_000 }),
        offer({ source: "facebook", listingId: "facebook:a", price: 41_000, priceUyu: 41_000 }),
        offer({ source: "facebook", listingId: "facebook:b", price: 41_000, priceUyu: 41_000 }),
      ],
      [],
      context
    );
    expect(merged.map((item) => item.listingId).sort()).toEqual(["facebook:a", "facebook:b"]);
  });

  it("no toca un conjunto coherente: la tolerancia es la misma que usa sameUnit", () => {
    const merged = mergeOffers(
      [offer({ source: "facebook", listingId: "facebook:1", price: 30_000, priceUyu: 30_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 31_500, priceUyu: 31_500 })],
      context
    );
    expect(merged).toHaveLength(2);
  });
});

// La tolerancia encadenada, que fue el hallazgo de medir la primera corrida arreglada.
describe("mergeOffers mide contra los dos extremos", () => {
  it("no deja que el conjunto se estire mas que la tolerancia aunque cada uno pase contra el ancla", () => {
    // Caso real: quince "1 dormitorio en Tres Cruces" —piso 10, piso 9, PB con entrada propia, con
    // garaje— en una sola fila. Con referencia 26.900, tanto 26.500 como 28.800 estan dentro del
    // 7 %; entre ellos hay 8 %. Cada uno cerca del ancla, ninguno cerca del otro.
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:caro", price: 28_800, priceUyu: 28_800 })],
      [offer({ source: "infocasas", listingId: "infocasas:hoy", price: 26_500, priceUyu: 26_500 })],
      context
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:hoy"]);
  });

  it("sin avisos frescos se queda con la ventana coherente mas numerosa", () => {
    // [26.500, 26.900, 27.000, 28.800]: las tres primeras entran en un 2 %; la cuarta rompe.
    const merged = mergeOffers(
      [
        offer({ source: "facebook", listingId: "facebook:a", price: 26_500, priceUyu: 26_500 }),
        offer({ source: "facebook", listingId: "facebook:b", price: 26_900, priceUyu: 26_900 }),
        offer({ source: "facebook", listingId: "facebook:c", price: 27_000, priceUyu: 27_000 }),
        offer({ source: "facebook", listingId: "facebook:d", price: 28_800, priceUyu: 28_800 }),
      ],
      [],
      context
    );
    expect(merged.map((item) => item.listingId)).toEqual(["facebook:a", "facebook:b", "facebook:c"]);
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
      offer({ source: "facebook", listingId: "facebook:1", price: 26_000, priceUyu: 26_000, firstSeen: "2026-07-02" }),
      offer({ source: "infocasas", listingId: "infocasas:1", price: 31_000, priceUyu: 31_000 }),
    ]);

    expect(result.priceUyu).toBe(26_000);
    expect(result.sources.sort()).toEqual(["facebook", "infocasas"]);
    expect(result.firstSeen).toBe("2026-07-02");
    expect(result.lastSeen).toBe("2026-08-20");
  });
});
