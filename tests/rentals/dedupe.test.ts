import { describe, expect, it } from "vitest";
import { buildRentalProperties, sameUnit } from "../../classes/rentals/dedupe";
import type { RawRental } from "../../classes/rentals/types";

const base: RawRental = {
  source: "infocasas",
  listingId: "infocasas:1",
  url: "https://www.infocasas.com.uy/x/1",
  title: "Apartamento 2 dormitorios en Pocitos",
  price: 32_000,
  currency: "UYU",
  commonExpenses: 4_000,
  commonExpensesCurrency: "UYU",
  sellerName: "Inmobiliaria X",
  sellerType: "inmobiliaria",
  image: null,
  publishedAt: "2026-08-18",
  propertyType: "apartamento",
  department: "Montevideo",
  neighborhood: "Pocitos",
  address: "Rizal 3715",
  street: "rizal",
  streetNumber: "3715",
  latitude: -34.9,
  longitude: -56.15,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  petsAllowed: null,
};

const listing = (overrides: Partial<RawRental>): RawRental => ({ ...base, ...overrides });

const context = {
  usdUyu: 40,
  today: "2026-08-20",
  offerFirstSeen: new Map<string, string>(),
  propertyFirstSeen: new Map<string, string>(),
  offerToProperty: new Map<string, string>(),
};

describe("buildRentalProperties", () => {
  it("collapses the same flat published on two portals into one row", () => {
    const properties = buildRentalProperties(
      [
        listing({}),
        listing({
          source: "mercadolibre",
          listingId: "mercadolibre:9",
          url: "https://apartamento.mercadolibre.com.uy/MLU-9",
          price: 32_500,
          sellerName: "Mercado Libre",
          commonExpenses: null,
          commonExpensesCurrency: null,
          latitude: null,
          longitude: null,
        }),
      ],
      context
    );

    expect(properties).toHaveLength(1);
    expect(properties[0]!.offers).toHaveLength(2);
    expect(properties[0]!.sources.sort()).toEqual(["infocasas", "mercadolibre"]);
    // The row is priced by the CHEAPEST advert — that is the number a tenant can actually get.
    expect(properties[0]!.priceUyu).toBe(32_000);
    // The richest row names the property, so the address and the geo survive the merge.
    expect(properties[0]!.latitude).toBe(-34.9);
  });

  it("collapses the same agency's repost of its own advert", () => {
    const properties = buildRentalProperties(
      [listing({}), listing({ listingId: "infocasas:2", url: "https://www.infocasas.com.uy/x/2" })],
      context
    );
    expect(properties).toHaveLength(1);
    expect(properties[0]!.offers).toHaveLength(2);
  });

  // THE failure mode that matters: an eight-flat building is eight adverts at one street number.
  // Merging them would hide seven real options behind one card.
  it("keeps different units of the same building apart", () => {
    const properties = buildRentalProperties(
      [
        listing({}),
        listing({ listingId: "infocasas:2", bedrooms: 1, area: 38, price: 24_000 }),
        listing({ listingId: "infocasas:3", bedrooms: 3, area: 95, price: 48_000 }),
      ],
      context
    );
    expect(properties).toHaveLength(3);
  });

  it("keeps two flats at one address apart when the price is nowhere near", () => {
    const properties = buildRentalProperties(
      [listing({}), listing({ listingId: "infocasas:2", price: 55_000, area: 61 })],
      context
    );
    expect(properties).toHaveLength(2);
  });

  it("merges addressless adverts only on barrio + dormitorios + price", () => {
    const marketplace = listing({
      source: "facebook",
      listingId: "facebook:1",
      address: "",
      street: "",
      streetNumber: "",
      latitude: null,
      longitude: null,
      area: null,
      commonExpenses: null,
      commonExpensesCurrency: null,
    });
    const same = listing({
      source: "facebook",
      listingId: "facebook:2",
      address: "",
      street: "",
      streetNumber: "",
      latitude: null,
      longitude: null,
      area: null,
      price: 32_800,
      commonExpenses: null,
      commonExpensesCurrency: null,
    });
    expect(buildRentalProperties([marketplace, same], context)).toHaveLength(1);

    const unknownBedrooms = listing({ ...same, listingId: "facebook:3", bedrooms: null });
    expect(buildRentalProperties([marketplace, unknownBedrooms], context)).toHaveLength(2);
  });

  it("compares a dollar advert against a peso one at the run's rate", () => {
    const inDollars = listing({
      source: "mercadolibre",
      listingId: "mercadolibre:5",
      price: 800,
      currency: "USD",
    });
    const properties = buildRentalProperties([listing({}), inDollars], context);
    // USD 800 * 40 = 32.000, the same flat.
    expect(properties).toHaveLength(1);
    expect(properties[0]!.offers.map((offer) => offer.priceUyu)).toEqual([32_000, 32_000]);
  });

  it("gives a property the same key on two identical runs", () => {
    const first = buildRentalProperties([listing({})], context);
    const second = buildRentalProperties([listing({})], context);
    expect(first[0]!.key).toBe(second[0]!.key);
  });

  it("keeps the day an advert was first seen", () => {
    const properties = buildRentalProperties([listing({})], {
      ...context,
      offerFirstSeen: new Map([["infocasas:1", "2026-07-01"]]),
      propertyFirstSeen: new Map(),
      offerToProperty: new Map(),
    });
    expect(properties[0]!.offers[0]!.firstSeen).toBe("2026-07-01");
    expect(properties[0]!.lastSeen).toBe("2026-08-20");
  });

  // Identity, not just grouping: the computed key is derived from the CANONICAL advert, so the day
  // the richest row disappears the key would change and the same flat would appear twice until the
  // orphan is pruned three weeks later.
  it("keeps the stored key when the canonical advert changes", () => {
    const withGeo = listing({});
    const thin = listing({
      source: "mercadolibre",
      listingId: "mercadolibre:9",
      area: null,
      latitude: null,
      longitude: null,
      commonExpenses: null,
      commonExpensesCurrency: null,
    });

    const before = buildRentalProperties([withGeo, thin], context);
    const storedKey = before[0]!.key;

    // Next run: the InfoCasas row is gone and only the thin MercadoLibre one is left.
    const after = buildRentalProperties([thin], {
      ...context,
      offerToProperty: new Map([
        ["infocasas:1", storedKey],
        ["mercadolibre:9", storedKey],
      ]),
    });
    expect(after[0]!.key).toBe(storedKey);
  });

  it("never lets two properties claim one key when a merge splits", () => {
    const a = listing({});
    const b = listing({ listingId: "infocasas:2", bedrooms: 1, area: 38, price: 24_000 });
    const properties = buildRentalProperties([a, b], {
      ...context,
      // Both adverts used to be the same property; today they no longer merge.
      offerToProperty: new Map([
        ["infocasas:1", "shared-key"],
        ["infocasas:2", "shared-key"],
      ]),
    });
    expect(properties).toHaveLength(2);
    expect(new Set(properties.map(property => property.key)).size).toBe(2);
  });

  it("never merges a shop into a flat", () => {
    const shop = listing({ listingId: "infocasas:9", propertyType: "local", bedrooms: null });
    expect(buildRentalProperties([listing({}), shop], context)).toHaveLength(2);
  });
});

// Los tres defectos que encontró la auditoría del 2026-09-03 sobre los 3.503 merges vivos, donde
// el 10,8 % de las propiedades unificadas publicaba ofertas más separadas que la propia tolerancia
// de la regla. Cada test reproduce un caso REAL de produccion, no uno inventado.
describe("falsos positivos que la auditoria encontro en produccion", () => {
  it("no une una casa con un apartamento aunque coincida todo lo demas", () => {
    // Caso real: "ALQUILER CASA CARRASCO 3 DORMITORIOS, GRAN JARDIN" contra "Alquiler Apartamento
    // Carrasco Norte 3 Dormitorios", misma calle, mismo numero, precio a un 2 %.
    const casa = listing({
      listingId: "infocasas:casa",
      propertyType: "casa",
      title: "ALQUILER CASA CARRASCO 3 DORMITORIOS",
      bedrooms: 3,
    });
    const apto = listing({
      source: "mercadolibre",
      listingId: "mercadolibre:apto",
      propertyType: "apartamento",
      title: "Alquiler Apartamento Carrasco Norte 3 Dormitorios",
      bedrooms: 3,
      price: 32_500,
    });
    expect(sameUnit({ ...casa, priceUyu: casa.price }, { ...apto, priceUyu: apto.price })).toBe(false);
    expect(buildRentalProperties([casa, apto], context)).toHaveLength(2);
  });

  it("no compara dos avisos sin barrio solo porque son del mismo departamento", () => {
    // Caso real: UNA fila con nueve ofertas cuyos titulos nombraban Malvin, La Union y Buceo. Sin
    // barrio y sin calle, el balde era el departamento entero.
    const shared = {
      neighborhood: "",
      address: "",
      street: "",
      streetNumber: "",
      latitude: null,
      longitude: null,
      area: null,
      commonExpenses: null,
      commonExpensesCurrency: null,
    };
    const malvin = listing({
      ...shared,
      listingId: "facebook:malvin",
      source: "facebook",
      title: "Apartamento 2 Dormitorios Malvin",
    });
    const laUnion = listing({
      ...shared,
      listingId: "facebook:launion",
      source: "facebook",
      title: "Alquiler apartamento 2 dormitorios La Union",
    });
    // Mismo departamento, mismos dormitorios, mismo precio exacto: antes alcanzaba para unirlos.
    expect(buildRentalProperties([malvin, laUnion], context)).toHaveLength(2);
  });

  it("sigue uniendo por barrio cuando el barrio esta, que es la evidencia que si existe", () => {
    // El arreglo anterior no puede llevarse puesto el caso legitimo: con barrio la union sigue.
    const shared = {
      address: "",
      street: "",
      streetNumber: "",
      latitude: null,
      longitude: null,
      area: null,
      commonExpenses: null,
      commonExpensesCurrency: null,
    };
    const uno = listing({ ...shared, listingId: "facebook:1", source: "facebook" });
    const dos = listing({ ...shared, listingId: "facebook:2", source: "facebook", price: 32_800 });
    expect(buildRentalProperties([uno, dos], context)).toHaveLength(1);
  });

  it("no une dos avisos que declaran distinta cantidad de banos", () => {
    const unBano = listing({ listingId: "infocasas:1", bathrooms: 1 });
    const dosBanos = listing({ source: "mercadolibre", listingId: "mercadolibre:1", bathrooms: 2 });
    expect(
      sameUnit({ ...unBano, priceUyu: unBano.price }, { ...dosBanos, priceUyu: dosBanos.price })
    ).toBe(false);
    // Y no descalifica cuando uno de los dos no lo publica: ausente no contradice.
    const sinDato = listing({ source: "mercadolibre", listingId: "mercadolibre:2", bathrooms: null });
    expect(
      sameUnit({ ...unBano, priceUyu: unBano.price }, { ...sinDato, priceUyu: sinDato.price })
    ).toBe(true);
  });
});

describe("sameUnit", () => {
  const candidate = (overrides: Partial<RawRental> & { priceUyu: number }) => ({
    ...base,
    ...overrides,
  });

  it("refuses to merge two addressless rows that only share a price", () => {
    const a = candidate({ street: "", streetNumber: "", bedrooms: null, priceUyu: 30_000 });
    const b = candidate({ street: "", streetNumber: "", bedrooms: null, priceUyu: 30_000, listingId: "x" });
    expect(sameUnit(a, b)).toBe(false);
  });
});
