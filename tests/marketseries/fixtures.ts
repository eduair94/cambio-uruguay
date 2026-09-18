import type { MarketObservation } from "../../classes/marketseries/types";

export function observation(overrides: Partial<MarketObservation> = {}): MarketObservation {
  return {
    vertical: "alquiler",
    advertId: "infocasas:1",
    groupKey: "prop-1",
    price: 30000,
    currency: "UYU",
    seenAt: "2026-09-18",
    seenDay: "2026-09-18",
    areaBuilt: null,
    department: "Montevideo",
    neighborhood: "Pocitos",
    propertyType: "apartamento",
    bedrooms: 2,
    marketSlug: null,
    brand: null,
    model: null,
    year: null,
    ...overrides,
  };
}

export function car(overrides: Partial<MarketObservation> = {}): MarketObservation {
  return observation({
    vertical: "autos",
    advertId: "ml-1",
    groupKey: "ml-1",
    price: 15000,
    currency: "USD",
    seenAt: "2026-09-18T10:00:00.000Z",
    department: null,
    neighborhood: null,
    propertyType: null,
    bedrooms: null,
    marketSlug: "toyota-hilux",
    brand: "Toyota",
    model: "Hilux",
    year: 2018,
    ...overrides,
  });
}
