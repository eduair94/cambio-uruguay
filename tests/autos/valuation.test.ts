import { describe, expect, it } from "vitest";
import { buildValuationCoefficients, kmEffectOf, matchedPremiumOf, priceEndingsOf } from "../../classes/autos/valuation";
import type { CarListing } from "../../classes/autos/types";

let serial = 0;
const NOW = "2026-09-19T12:00:00.000Z";

function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const price = overrides.price ?? 12_000;
  return {
    id: `MLU${serial}`, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
    title: "Chevrolet Onix 1.4 Lt", year: 2019, km: 90_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: `s${serial}`,
    picture: null, pictureCount: null, permalink: "https://auto.mercadolibre.com.uy/MLU-1-x-_JM",
    observedAt: NOW, key: `ml-MLU${serial}`, brandSlug: "chevrolet", modelSlug: "onix", marketSlug: "chevrolet-onix",
    engine: "1.4", trim: "lt", trimLabel: "Lt", kmQuality: "ok", flags: [], priceUsd: overrides.priceUsd ?? price,
    priceConverted: false, firstSeen: NOW, lastSeen: NOW, priceDrop: null, detail: null,
    sourceName: "Mercado Libre", reference: null,
    ...overrides,
  };
}

/** Diez cohortes idénticas de modelos distintos: lo que hace falta para que un coeficiente salga. */
const cohorts = (build: (slug: string) => CarListing[]): CarListing[] =>
  Array.from({ length: 10 }, (_, index) => build(`modelo-${index}`)).flat();

describe("kmEffectOf", () => {
  it("lee la pérdida por kilómetro dentro del mismo modelo y año", () => {
    const rows = cohorts(slug =>
      Array.from({ length: 12 }, (_, index) => {
        const km = 20_000 + index * 20_000;
        // 3 % cada 10.000 km, exacto.
        return car({ marketSlug: slug, km, price: Math.round(20_000 * 0.97 ** (km / 10_000)) });
      }));
    const effect = kmEffectOf(rows);
    expect(effect.value).toBeCloseTo(0.03, 2);
    expect(effect.cohorts).toBe(10);
  });
  it("no opina cuando los avisos de la cohorte tienen todos el mismo kilometraje", () => {
    const rows = cohorts(slug => Array.from({ length: 12 }, () => car({ marketSlug: slug, km: 90_000 })));
    expect(kmEffectOf(rows).value).toBeNull();
  });
  it("descarta la cohorte que dice que el auto se encarece con el uso", () => {
    const rows = cohorts(slug =>
      Array.from({ length: 12 }, (_, index) => car({ marketSlug: slug, km: 20_000 + index * 20_000, price: 10_000 + index * 500 })));
    expect(kmEffectOf(rows).value).toBeNull();
  });
});

describe("matchedPremiumOf", () => {
  const gearbox = (listing: CarListing) =>
    listing.transmission === "automatica" ? ("with" as const) : listing.transmission === "manual" ? ("without" as const) : null;

  it("compara caja contra caja dentro del mismo modelo y año", () => {
    const rows = cohorts(slug => [
      ...Array.from({ length: 5 }, () => car({ marketSlug: slug, transmission: "automatica", price: 13_200 })),
      ...Array.from({ length: 5 }, () => car({ marketSlug: slug, transmission: "manual", price: 12_000 })),
    ]);
    expect(matchedPremiumOf(rows, gearbox).value).toBeCloseTo(0.1, 2);
  });
  it("no mezcla modelos: sin los dos lados en la misma cohorte, no hay comparación", () => {
    const rows = [
      ...Array.from({ length: 60 }, () => car({ marketSlug: "caro", transmission: "automatica", price: 30_000 })),
      ...Array.from({ length: 60 }, () => car({ marketSlug: "barato", transmission: "manual", price: 8_000 })),
    ];
    // Sin emparejar diría "las automáticas valen 275 % más", que es la edad y el segmento hablando.
    expect(matchedPremiumOf(rows, gearbox).value).toBeNull();
  });
});

describe("priceEndingsOf", () => {
  it("cuenta cómo termina el precio que pide la gente", () => {
    const rows = [
      car({ price: 12_990, priceUsd: 12_990 }), car({ price: 9_990, priceUsd: 9_990 }),
      car({ price: 11_900, priceUsd: 11_900 }), car({ price: 10_500, priceUsd: 10_500 }),
      car({ price: 15_000, priceUsd: 15_000 }), car({ price: 8_745, priceUsd: 8_745 }),
    ];
    const endings = Object.fromEntries(priceEndingsOf(rows).map(entry => [entry.ending, entry.adverts]));
    expect(endings).toMatchObject({ "990": 2, "900": 1, "500": 1, "000": 1, otro: 1 });
  });
});

describe("buildValuationCoefficients", () => {
  it("devuelve las tres palancas y las terminaciones", () => {
    const coefficients = buildValuationCoefficients(cohorts(slug =>
      Array.from({ length: 12 }, (_, index) => car({ marketSlug: slug, km: 20_000 + index * 20_000, price: 20_000 - index * 700 }))));
    expect(coefficients.km.value).toBeGreaterThan(0);
    expect(coefficients.automatic.value).toBeNull();
    expect(coefficients.endings.length).toBeGreaterThan(0);
  });
});
