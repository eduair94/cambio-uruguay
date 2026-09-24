import { describe, expect, it } from "vitest";
import { carObservation, freshSeen, rentalObservation, saleObservation } from "../../classes/marketseries/sources";

const NOW = new Date("2026-09-18T13:03:00.000Z");

describe("freshSeen", () => {
  it("inside the window, by calendar day", () => {
    expect(freshSeen("2026-09-08", NOW, 10)).toBe("2026-09-08");
    expect(freshSeen("2026-09-07", NOW, 10)).toBeNull();
    expect(freshSeen("2026-09-18T12:00:00.000Z", NOW, 4)).toBe("2026-09-18");
  });
  it("refuses the future and garbage", () => {
    expect(freshSeen("2026-09-19T00:00:00.000Z", NOW, 4)).toBeNull();
    expect(freshSeen("ayer", NOW, 4)).toBeNull();
    expect(freshSeen(undefined, NOW, 4)).toBeNull();
  });
});

const rental = {
  propertyKey: "p1",
  advertId: "infocasas:9",
  source: "infocasas",
  department: "Montevideo",
  neighborhood: "Pocitos",
  propertyType: "apartamento" as const,
  bedrooms: 2,
  price: 30000,
  currency: "UYU" as const,
  commonExpenses: null,
  commonExpensesCurrency: null,
  areaBuilt: 60,
  lastSeen: "2026-09-17",
};

describe("rentalObservation", () => {
  it("maps the validated zone observation; the property is the level's unit", () => {
    expect(rentalObservation(rental, NOW)).toMatchObject({
      vertical: "alquiler", advertId: "infocasas:9", groupKey: "p1", seenDay: "2026-09-17", areaBuilt: 60, bedrooms: 2,
    });
  });
  it("older than the directory's 10 days is stale", () => {
    expect(rentalObservation({ ...rental, lastSeen: "2026-09-01" }, NOW)).toBe("stale");
  });
  it("a placeholder price (11.111) is not an asking price: counted apart, never logged", () => {
    expect(rentalObservation({ ...rental, price: 11111 }, NOW)).toBe("placeholder");
  });
});

const sale = {
  key: "infocasas-123",
  propertyType: "casa",
  department: "Canelones",
  neighborhood: "Solymar",
  bedrooms: 3,
  price: { amount: 180000, currency: "USD" },
  areas: { built: 120 },
  lastSeen: "2026-09-16T06:30:00.000Z",
};

describe("saleObservation", () => {
  it("one advert, native price", () => {
    expect(saleObservation(sale, NOW, 21)).toMatchObject({
      vertical: "venta", advertId: "infocasas-123", groupKey: "infocasas-123", price: 180000, currency: "USD", areaBuilt: 120, bedrooms: 3, seenDay: "2026-09-16",
    });
  });
  it("invalid or stale rows are counted apart", () => {
    expect(saleObservation({ ...sale, propertyType: "terreno" }, NOW, 21)).toBe("invalid");
    expect(saleObservation({ ...sale, price: { amount: 0, currency: "USD" } }, NOW, 21)).toBe("invalid");
    expect(saleObservation({ ...sale, price: { amount: 10, currency: "EUR" } }, NOW, 21)).toBe("invalid");
    expect(saleObservation({ ...sale, lastSeen: "2026-08-01T00:00:00.000Z" }, NOW, 21)).toBe("stale");
    expect(saleObservation({ ...sale, price: { amount: 111111, currency: "USD" } }, NOW, 21)).toBe("placeholder");
  });
  it("a built area outside 8..100000 m2 is unknown, not a reason to drop the row", () => {
    expect((saleObservation({ ...sale, areas: { built: 3 } }, NOW, 21) as { areaBuilt: unknown }).areaBuilt).toBeNull();
  });
});

const carRow = {
  key: "ml-MLU1",
  marketSlug: "toyota-hilux",
  brand: "Toyota",
  model: "Hilux",
  year: 2018,
  price: 32990,
  currency: "USD",
  currencyInferred: false,
  flags: [],
  lastSeen: "2026-09-18T08:00:00.000Z",
};

describe("carObservation", () => {
  it("native dollars only, never a deduced currency", () => {
    expect(carObservation(carRow, NOW, 4)).toMatchObject({ vertical: "autos", marketSlug: "toyota-hilux", year: 2018, price: 32990, groupKey: "ml-MLU1" });
    expect(carObservation({ ...carRow, currency: "UYU" }, NOW, 4)).toBe("currency");
    expect(carObservation({ ...carRow, currencyInferred: true }, NOW, 4)).toBe("currency");
  });
  it("a declared problem (damaged, debt, foreign plate...) stays out, as in the model page", () => {
    expect(carObservation({ ...carRow, flags: ["damaged"] }, NOW, 4)).toBe("flags");
  });
  it("a deposit is not a car, and a model needs a clean slug", () => {
    expect(carObservation({ ...carRow, price: 500 }, NOW, 4)).toBe("invalid");
    expect(carObservation({ ...carRow, marketSlug: "Toyota Hilux" }, NOW, 4)).toBe("invalid");
  });
  it("an implausible year leaves the model-year cohort, not the model", () => {
    expect((carObservation({ ...carRow, year: 1800 }, NOW, 4) as { year: unknown }).year).toBeNull();
  });
  it("stale after the catalogue's own window", () => {
    expect(carObservation({ ...carRow, lastSeen: "2026-09-10T08:00:00.000Z" }, NOW, 4)).toBe("stale");
  });
});

describe("carObservation: placeholder", () => {
  it("US$ 11.111 is a placeholder, US$ 9.999 a price", () => {
    expect(carObservation({ ...carRow, price: 11111 }, NOW, 4)).toBe("placeholder");
    expect(carObservation({ ...carRow, price: 9999 }, NOW, 4)).not.toBe("placeholder");
  });
});
