import { describe, expect, it } from "vitest";
import {
  correctStoredRentCurrencies,
  inferRentalCurrencies,
  rentCurrencyVerdict,
  rentPriceCohorts,
  type RentPriceRow,
} from "../../classes/rentals/currency";
import type { RawRental, RentalOffer } from "../../classes/rentals/types";

const USD = 41.35;

// Cohorts shaped like the published market on 2026-10-07 (p10/p90 per zone).
function market(department: string, neighborhood: string, bedrooms: number | null, from: number, to: number, n = 20): RentPriceRow[] {
  return Array.from({ length: n }, (_, i) => ({
    department,
    neighborhood,
    bedrooms,
    priceUyu: Math.round(from + ((to - from) * i) / (n - 1)),
  }));
}
const cohorts = rentPriceCohorts([
  ...market("Montevideo", "Carrasco", 2, 50_000, 120_000),
  ...market("Montevideo", "Centro", 1, 20_000, 30_000),
  ...market("Maldonado", "Punta del Este", 3, 80_000, 375_000),
  // Maldonado city is in pesos; the department mixes it with Punta del Este's dollars.
  ...market("Maldonado", "Centro", null, 15_000, 30_000, 10),
  ...market("Maldonado", "", null, 33_000, 390_000, 60),
  ...market("Colonia", "Carmelo", 1, 10_000, 33_000),
  ...market("Canelones", "Viñedos de La Tahona", 3, 124_000, 198_000, 10),
]);

const advert = (changes: Partial<RawRental>): RawRental => ({
  source: "facebook",
  listingId: "facebook:1",
  url: "https://www.facebook.com/marketplace/item/1",
  title: "Alquiler anual",
  price: 2_500,
  currency: "UYU",
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: "",
  sellerType: "desconocido",
  image: null,
  publishedAt: null,
  propertyType: "otro",
  department: "Montevideo",
  neighborhood: "Carrasco",
  address: "",
  street: "",
  streetNumber: "",
  latitude: null,
  longitude: null,
  bedrooms: 2,
  bathrooms: null,
  area: null,
  parkingSpaces: null,
  furnished: null,
  petsAllowed: null,
  guarantees: [],
  ...changes,
});

describe("a home priced in pesos below anything its zone costs is a dollar price", () => {
  it.each([
    ["ALQUILER EN CARRASCO 2 DORMITORIOS AMOBLADO VENTURA TOWER", 2_500, "Montevideo", "Carrasco", 2, "otro"],
    ["Alquiler anual 3 dormitorios Punta del Este", 3_000, "Maldonado", "Punta del Este", 3, "otro"],
    ["Casa en alquiler c/ cochera en Viñedos de la Tahona", 4_750, "Canelones", "Viñedos de La Tahona", 3, "casa"],
    // Between $ 5.000 and $ 12.000 only the barrio's own market may decide.
    ["Apartamento En Alquiler Exclusivo 4 Dormitorios Península, Punta Del Este", 9_200, "Maldonado", "Punta del Este", 4, "apartamento"],
  ] as const)("%s ($ %i) is in dollars", (title, price, department, neighborhood, bedrooms, propertyType) => {
    const listing = advert({ title, price, department, neighborhood, bedrooms, propertyType });
    expect(rentCurrencyVerdict(listing, cohorts, USD).kind).toBe("usd");
    const { listings, corrected } = inferRentalCurrencies([listing], cohorts, USD);
    expect(corrected).toBe(1);
    expect(listings[0]).toMatchObject({ currency: "USD", price, currencyInferred: true });
  });

  it("keeps a real cheap peso rent in the interior", () => {
    const carmelo = advert({ title: "Casa en Carmelo", price: 6_500, department: "Colonia", neighborhood: "Carmelo", bedrooms: 1, propertyType: "casa" });
    expect(rentCurrencyVerdict(carmelo, cohorts, USD).kind).toBe("unchanged");
  });

  it("never lets a department that mixes markets convert a peso rent above $ 5.000", () => {
    // Maldonado city: $ 9.500 is cheap but real, and only a department-wide cohort is available.
    const listing = advert({ title: "SE ALQUILA CASA DE UN DORMITORIO. BARRIO HIPODROMO", price: 9_500, department: "Maldonado", neighborhood: "Barrio Hipódromo", bedrooms: null, propertyType: "casa" });
    expect(rentCurrencyVerdict(listing, cohorts, USD).kind).toBe("unchanged");
  });

  it("leaves untouched what is absurd in both currencies", () => {
    const listing = advert({ title: "ALQUILER ZONA CENTRO 1 DORMITORIO", price: 4_000, neighborhood: "Centro", bedrooms: 1 });
    expect(rentCurrencyVerdict(listing, cohorts, USD).kind).toBe("implausible");
    expect(inferRentalCurrencies([listing], cohorts, USD).listings[0]).toBe(listing);
  });

  it.each([
    ["a room", { title: "Residencia Estudiantil Femenina", price: 9_000, propertyType: "casa" as const }],
    ["a bed in a shared flat", { title: "Alquilo Apartamento compartido, Carrasco", price: 4_000, propertyType: "apartamento" as const }],
    ["not a home", { title: "Alquiler de volquetas", price: 2_900, bedrooms: null }],
    ["a premises", { title: "Local comercial", price: 2_500, propertyType: "local" as const }],
    ["already in dollars", { currency: "USD" as const }],
    ["at a peso price", { price: 15_000 }],
  ])("ignores %s", (_, changes) => {
    expect(rentCurrencyVerdict(advert(changes), cohorts, USD).kind).toBe("unchanged");
  });

  it("does nothing without a market to read against", () => {
    expect(rentCurrencyVerdict(advert({}), rentPriceCohorts([]), USD).kind).toBe("unchanged");
    expect(rentCurrencyVerdict(advert({}), cohorts, 0).kind).toBe("unchanged");
  });

  it("needs eight homes before a zone counts as a market", () => {
    const thin = rentPriceCohorts(market("Rocha", "La Paloma", null, 20_000, 60_000, 7));
    expect(thin.size).toBe(0);
  });
});

describe("adverts already stored are read the same way", () => {
  const offer = (changes: Partial<RentalOffer>): RentalOffer => ({
    source: "facebook",
    listingId: "facebook:9",
    url: "https://www.facebook.com/marketplace/item/9",
    title: "ALQUILER EN CARRASCO 2 DORMITORIOS AMOBLADO VENTURA TOWER",
    price: 2_500,
    currency: "UYU",
    priceUyu: 2_500,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: "",
    sellerType: "desconocido",
    image: null,
    publishedAt: null,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: [],
    firstSeen: "2026-10-01",
    lastSeen: "2026-10-07",
    ...changes,
  });
  const property = (offers: RentalOffer[]) => ({
    title: offers[0]!.title,
    propertyType: "otro" as const,
    department: "Montevideo",
    neighborhood: "Carrasco",
    bedrooms: 2,
    offers,
  });

  it("corrects a stored advert the run did not see again, at today's rate", () => {
    const { offers, corrected } = correctStoredRentCurrencies(property([offer({})]), cohorts, USD);
    expect(corrected).toBe(1);
    expect(offers[0]).toMatchObject({ currency: "USD", price: 2_500, currencyInferred: true, priceUyu: Math.round(2_500 * USD) });
  });

  it("reads the advert's own identity before the property's fields", () => {
    const own = offer({
      identity: {
        version: 1, propertyType: "otro", department: "Colonia", neighborhood: "Carmelo", address: "", street: "",
        streetNumber: "", latitude: null, longitude: null, bedrooms: 1, bathrooms: null, area: null,
      },
      title: "Alquilo casa", price: 6_500, priceUyu: 6_500,
    });
    expect(correctStoredRentCurrencies(property([own]), cohorts, USD).corrected).toBe(0);
  });

  it("is idempotent and leaves every other advert untouched", () => {
    const first = correctStoredRentCurrencies(property([offer({}), offer({ listingId: "infocasas:1", source: "infocasas", price: 40_000, priceUyu: 40_000 })]), cohorts, USD);
    expect(first.corrected).toBe(1);
    expect(first.offers[1]).toMatchObject({ currency: "UYU", price: 40_000 });
    const again = correctStoredRentCurrencies(property(first.offers), cohorts, USD);
    expect(again.corrected).toBe(0);
    expect(again.offers).toEqual(first.offers);
  });
});


describe("a room COUNT is not a room", () => {
  it("reads Facebook's own summary as the home it describes", () => {
    const listing = advert({
      title: "1 habitación 1 baño Departamento/condominio",
      price: 2_500, propertyType: "apartamento", department: "Montevideo", neighborhood: "Carrasco", bedrooms: 2,
    });
    expect(rentCurrencyVerdict(listing, cohorts, USD).kind).toBe("usd");
  });

  it("re-reads a stored Facebook advert's type with today's rule before deciding", () => {
    const stored = {
      title: "2 habitaciones 1 baño Departamento/condominio",
      propertyType: "habitacion" as const,
      department: "Montevideo",
      neighborhood: "Carrasco",
      bedrooms: 2,
      offers: [{
        source: "facebook" as const, listingId: "facebook:77", url: "https://www.facebook.com/marketplace/item/77",
        title: "2 habitaciones 1 baño Departamento/condominio", price: 2_500, currency: "UYU" as const, priceUyu: 2_500,
        commonExpenses: null, commonExpensesCurrency: null, sellerName: "", sellerType: "desconocido" as const,
        image: null, publishedAt: null, parkingSpaces: null, furnished: null, petsAllowed: null, guarantees: [],
        firstSeen: "2026-10-01", lastSeen: "2026-10-07",
        identity: {
          version: 1 as const, propertyType: "habitacion" as const, department: "Montevideo", neighborhood: "Carrasco",
          address: "", street: "", streetNumber: "", latitude: null, longitude: null, bedrooms: 2, bathrooms: 1, area: null,
        },
      }],
    };
    expect(correctStoredRentCurrencies(stored, cohorts, USD).corrected).toBe(1);
  });
});
