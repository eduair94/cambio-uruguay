import { describe, expect, it } from "vitest";
import { buildRentalProperties, sameUnit } from "../../classes/rentals/dedupe";
import { rentalUnitEvidence } from "../../classes/rentals/matchEvidence";
import type { RawRental } from "../../classes/rentals/types";

const base: RawRental = {
  parkingSpaces: null,
  furnished: null,
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
  address: "Rizal 3715 apto 301",
  street: "rizal",
  streetNumber: "3715",
  latitude: -34.9,
  longitude: -56.15,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  petsAllowed: null,
  guarantees: [],
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
      context,
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
      context,
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
      context,
    );
    expect(properties).toHaveLength(3);
  });

  it("keeps two flats at one address apart when the price is nowhere near", () => {
    const properties = buildRentalProperties(
      [listing({}), listing({ listingId: "infocasas:2", price: 55_000, area: 61 })],
      context,
    );
    expect(properties).toHaveLength(2);
  });

  it("does not merge addressless adverts on barrio + dormitorios + price", () => {
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
    expect(buildRentalProperties([marketplace, same], context)).toHaveLength(2);

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
    expect(new Set(properties.map((property) => property.key)).size).toBe(2);
  });

  it("does not let a new unit steal an existing URL by sorting before its owner", () => {
    const original = listing({ listingId: "infocasas:9" });
    const storedKey = buildRentalProperties([original], context)[0]!.key;
    const newcomer = listing({ listingId: "infocasas:1", price: 55_000 });
    const properties = buildRentalProperties([newcomer, original], {
      ...context,
      offerToProperty: new Map([[original.listingId, storedKey]]),
    });
    expect(properties).toHaveLength(2);
    expect(
      properties.find((property) => property.key === storedKey)?.offers.map((offer) => offer.listingId),
    ).toEqual([original.listingId]);
    expect(new Set(properties.map((property) => property.key)).size).toBe(2);
  });

  it("reserves an absent property's URL during a partial run and keeps the new URL next time", () => {
    const original = listing({ listingId: "infocasas:9" });
    const storedKey = buildRentalProperties([original], context)[0]!.key;
    const newcomer = listing({ listingId: "infocasas:1", price: 55_000 });
    const history = {
      ...context,
      propertyFirstSeen: new Map([[storedKey, "2026-07-01"]]),
      offerToProperty: new Map([[original.listingId, storedKey]]),
    };
    const first = buildRentalProperties([newcomer], history)[0]!;
    expect(first.key).not.toBe(storedKey);
    const after = buildRentalProperties([original, newcomer], {
      ...history,
      offerToProperty: new Map([...history.offerToProperty, [newcomer.listingId, first.key]]),
    });
    expect(after.find((property) => property.key === first.key)?.offers[0]!.listingId).toBe(
      newcomer.listingId,
    );
    expect(after.find((property) => property.key === storedKey)?.offers[0]!.listingId).toBe(
      original.listingId,
    );
  });

  it("checks collision suffixes against stored URLs as well", () => {
    const original = listing({ listingId: "infocasas:9" });
    const computed = buildRentalProperties([original], context)[0]!.key;
    const newcomer = listing({ listingId: "infocasas:1", price: 55_000 });
    const first = buildRentalProperties([newcomer], {
      ...context,
      propertyFirstSeen: new Map([[computed, "2026-07-01"]]),
    })[0]!;
    const after = buildRentalProperties([newcomer], {
      ...context,
      propertyFirstSeen: new Map([
        [computed, "2026-07-01"],
        [first.key, "2026-07-02"],
      ]),
    })[0]!;
    expect(after.key).not.toBe(computed);
    expect(after.key).not.toBe(first.key);
  });

  it("keeps the same known advert's URL when its address and specifications are completed", () => {
    const thin = listing({ address: "", street: "", streetNumber: "", area: null });
    const storedKey = buildRentalProperties([thin], context)[0]!.key;
    const completed = buildRentalProperties([listing({ area: 62 })], {
      ...context,
      propertyFirstSeen: new Map([[storedKey, "2026-07-01"]]),
      offerToProperty: new Map([[thin.listingId, storedKey]]),
    })[0]!;
    expect(completed.key).toBe(storedKey);
    expect(completed.address).toBe("Rizal 3715 apto 301");
    expect(completed.firstSeen).toBe("2026-07-01");
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

  it("no trata barrio, dormitorios y precio como prueba de la misma vivienda", () => {
    // La revisión más estricta retira esta antigua unión: son características compartidas por
    // muchas viviendas del barrio, no una identificación del inmueble.
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
    expect(buildRentalProperties([uno, dos], context)).toHaveLength(2);
  });

  it("no une dos avisos que declaran distinta cantidad de banos", () => {
    const unBano = listing({ listingId: "infocasas:1", bathrooms: 1 });
    const dosBanos = listing({ source: "mercadolibre", listingId: "mercadolibre:1", bathrooms: 2 });
    expect(sameUnit({ ...unBano, priceUyu: unBano.price }, { ...dosBanos, priceUyu: dosBanos.price })).toBe(
      false,
    );
    // Y no descalifica cuando uno de los dos no lo publica: ausente no contradice.
    const sinDato = listing({ source: "mercadolibre", listingId: "mercadolibre:2", bathrooms: null });
    expect(sameUnit({ ...unBano, priceUyu: unBano.price }, { ...sinDato, priceUyu: sinDato.price })).toBe(
      true,
    );
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

describe("conservative unit evidence", () => {
  const matches = (a: Partial<RawRental>, b: Partial<RawRental>) =>
    sameUnit(
      { ...listing({ listingId: "infocasas:first", ...a }), priceUyu: a.price ?? base.price },
      { ...listing({ listingId: "infocasas:second", ...b }), priceUyu: b.price ?? base.price },
    );

  it("requires unit evidence even when every building-level attribute is identical", () => {
    expect(matches({ address: "Rizal 3715" }, { address: "Rizal 3715" })).toBe(false);
    expect(
      matches(
        { address: "Rizal 3715", bedrooms: null, bathrooms: null, area: null },
        { address: "Rizal 3715", bedrooms: null, bathrooms: null, area: null },
      ),
    ).toBe(false);
  });

  it.each([
    ["Rizal 3715 apto. 301", "Rizal 3715 unidad 301"],
    ["Rizal 3715 apartamento N° 301", "Rizal 3715 apto #301"],
    ["Rizal 3715 unidad A", "Rizal 3715 apto A"],
    ["Rizal 3715 unidad 0301", "Rizal 3715 apto 301"],
  ])("accepts the same explicitly identified unit: %s / %s", (a, b) => {
    expect(matches({ address: a }, { address: b })).toBe(true);
  });

  it("matches two explicit BIS entrances while distinguishing the ordinary door", () => {
    const bis = { address: "Rizal 3715 bis apto 301", streetNumber: "3715 bis" };
    expect(matches(bis, { ...bis, address: "Rizal 3715 BIS unidad 301" })).toBe(true);
    expect(matches(bis, {})).toBe(false);
  });

  it.each([
    [{ address: "Rizal 3715 apto 601" }, { address: "Rizal 3715 apto 801" }],
    [{ title: "Apartamento 2 dormitorios unidad 601" }, { title: "Apartamento 2 dormitorios unidad 801" }],
    [{ title: "Apartamento 2 dormitorios piso 9" }, { title: "Apartamento 2 dormitorios piso 10" }],
    [
      { title: "Apartamento 2 dormitorios 9º piso" },
      { title: "Apartamento 2 dormitorios noveno piso", address: "Rizal 3715 apto 302" },
    ],
    [{ title: "Apartamento 2 dormitorios planta baja" }, { title: "Apartamento 2 dormitorios primer piso" }],
    [{ address: "Rizal 3715 torre A apto 301" }, { address: "Rizal 3715 torre B apto 301" }],
    [{ title: "Apartamento 2 dormitorios al frente" }, { title: "Apartamento 2 dormitorios contrafrente" }],
    [
      { title: "Apartamento alquiler en Ciudad Vieja - 601" },
      { title: "Apartamento alquiler en Ciudad Vieja - 801" },
    ],
  ] as Array<[Partial<RawRental>, Partial<RawRental>]>)(
    "vetoes conflicting unit, floor, building or aspect %#",
    (a, b) => {
      expect(matches(a, b)).toBe(false);
      expect(matches(b, a)).toBe(false);
    },
  );

  it("normalizes floor ordinals but never treats a floor as a unit number", () => {
    expect(
      matches(
        { title: "Apartamento 2 dormitorios piso 9" },
        { title: "Apartamento 2 dormitorios noveno piso" },
      ),
    ).toBe(true);
    expect(
      matches(
        { address: "Rizal 3715", title: "Apartamento 2 dormitorios piso 9" },
        { address: "Rizal 3715", title: "Apartamento 2 dormitorios noveno piso" },
      ),
    ).toBe(false);
  });

  it("does not assume an unspecified tower is the one the other advert names", () => {
    expect(matches({ address: "Rizal 3715 torre A apto 301" }, { address: "Rizal 3715 apto 301" })).toBe(
      false,
    );
  });

  it("does not interpret bedroom counts or unlabelled agency codes as unit evidence", () => {
    expect(
      matches(
        { address: "Rizal 3715", title: "Apartamento 2 dormitorios en Pocitos" },
        { address: "Rizal 3715", title: "Apartamento 2 dormitorios en Pocitos" },
      ),
    ).toBe(false);
    expect(
      matches(
        { address: "Rizal 3715", title: "Apartamento en alquiler - 601" },
        { address: "Rizal 3715", title: "Apartamento en alquiler - 601" },
      ),
    ).toBe(false);
    expect(
      matches(
        { address: "Rizal 3715", title: "Apartamento a estrenar en Pocitos" },
        { address: "Rizal 3715", title: "Apartamento a estrenar en Pocitos" },
      ),
    ).toBe(false);
  });

  it.each([
    ["Apartamento 2D Pocitos", 2],
    ["Apartamento 1 d", 1],
    ["Apto 1D Pocitos", 1],
    ["Apto 3D Pocitos", 3],
    ["Apto 4D Pocitos", 4],
    ["Apto 5D Pocitos", 5],
    ["Apto 6D Pocitos", 6],
    ["Apartamento 2 amb.", 2],
    ["Apto 2 ambs. Pocitos", 2],
  ] as const)("does not identify a unit from room-count shorthand: %s", (title, bedrooms) => {
    const advertised = { address: "Rizal 3715", title, bedrooms };
    expect(matches(advertised, advertised)).toBe(false);
  });

  it.each(["Unidad 2D", "Apto N° 2D", "Apartamento número 2D", "Apto #2D"])(
    "retains a letter-suffixed unit when its identifier is explicitly labelled: %s",
    (title) => {
      const advertised = { address: "Rizal 3715", title };
      expect(matches(advertised, advertised)).toBe(true);
    },
  );

  it.each([
    "Apartamento a pasos de la rambla",
    "Apto a metros del shopping",
    "Unidad a precio de oportunidad",
  ])("does not interpret prepositions in prose as the same unit A: %s", (title) => {
    expect(matches({ address: "Rizal 3715", title }, { address: "Rizal 3715", title })).toBe(false);
  });

  it.each([
    { department: "Canelones" },
    { neighborhood: "Buceo" },
    { street: "eduardo acevedo", address: "Eduardo Acevedo 3715 apto 301" },
    { streetNumber: "3716", address: "Rizal 3716 apto 301" },
    { address: "Rizal 3715 bis apto 301" },
    { address: "Rizal 3715 - 3800 apto 301" },
    { address: "Rizal al 3715 apto 301" },
    { address: "Rizal 3715 próximo a Rivera apto 301" },
    { address: "Rizal 3715 esquina Rivera apto 301" },
    { department: "" },
    { address: "" },
  ])("validates exact location inside sameUnit itself: %j", (b) => {
    expect(matches({}, b)).toBe(false);
  });

  it("rejects a raw address that disagrees with the normalized door number", () => {
    expect(matches({}, { address: "Rizal 3716 apto 301", streetNumber: "3715" })).toBe(false);
  });

  it.each([
    { title: "Apartamento dos dormitorios en Pocitos", bedrooms: 1 },
    { title: "Monoambiente en Pocitos", bedrooms: 2 },
    { title: "Apartamento 2 dormitorios y dos baños", bathrooms: 1 },
    { title: "Local en alquiler 25 de Mayo", propertyType: "apartamento" },
    { title: "Alquiler casa Carrasco 2 dormitorios", propertyType: "apartamento" },
    { title: "Apartamento alquiler invernal", propertyType: "apartamento" },
  ] as Partial<RawRental>[])("does not trust internally contradictory or seasonal metadata: %j", (b) => {
    expect(matches({}, b)).toBe(false);
  });

  it("does not equate commercial types or unknown types", () => {
    expect(
      matches(
        { title: "Local en alquiler", propertyType: "local" },
        { title: "Oficina en alquiler", propertyType: "oficina" },
      ),
    ).toBe(false);
    expect(
      matches({ title: "Alquiler", propertyType: "otro" }, { title: "Alquiler", propertyType: "otro" }),
    ).toBe(false);
  });

  it("compares explicit title specifications even if structured bedrooms or bathrooms are unknown", () => {
    expect(
      matches(
        { bedrooms: null, title: "Apartamento 1 dormitorio" },
        { bedrooms: null, title: "Apartamento 2 dormitorios" },
      ),
    ).toBe(false);
    expect(
      matches(
        { bathrooms: null, title: "Apartamento 1 baño" },
        { bathrooms: null, title: "Apartamento 2 baños" },
      ),
    ).toBe(false);
  });

  const photoEvidence = {
    address: "Rizal 3715",
    image: "https://pictures.example.uy/original/rizal-living-1487.jpg",
    title: "Apartamento 2 dormitorios en Rizal con estufa a leña y terraza orientada al norte",
  };
  it("refuses shared original photo, specific title, address and complete specs without a unit identifier", () => {
    expect(matches(photoEvidence, { ...photoEvidence, source: "mercadolibre", price: 32500, area: 61 })).toBe(
      false,
    );
  });

  it("still joins a coherently identified unit when the two adverts publish different photos", () => {
    expect(
      matches(
        { ...photoEvidence, address: "Rizal 3715 apto 301" },
        { ...photoEvidence, address: "Rizal 3715 unidad 301", source: "mercadolibre", image: null },
      ),
    ).toBe(true);
  });

  it("keeps the exact San Luis adverts separate instead of treating '1 dor' and '1 -2 dor' as unit 1", () => {
    // Actual per-offer fields from the audit. Descriptions identify the second and fourth of
    // four apartments; neither title publishes a unit ID. Both previously produced units=['1'].
    const shared: Partial<RawRental> = {
      department: "Canelones",
      neighborhood: "San Luis",
      address: "Rincon 1900",
      street: "rincon",
      streetNumber: "1900",
      bedrooms: 1,
      bathrooms: 1,
      area: 30,
      latitude: -34.767387842572,
      longitude: -55.593019723892,
    };
    const second = listing({
      ...shared,
      listingId: "infocasas:194165703",
      title: "Alquiler apartamento 1 dor amueblado en San Luis",
      image: "https://cdn1.infocasas.com.uy/repo/img/13651_UY.42.14.9.63.V7_153.jpg",
      price: 15900,
    });
    const fourth = listing({
      ...shared,
      listingId: "infocasas:194171253",
      title: "Alquiler apartamento 1 -2 dor amueblado San Luis",
      image: "https://cdn1.infocasas.com.uy/repo/img/13651_UY.42.14.9.64.V7_728.jpg",
      price: 17000,
    });
    expect(rentalUnitEvidence(second).units).toEqual([]);
    expect(rentalUnitEvidence(fourth).units).toEqual([]);
    expect(matches(second, fourth)).toBe(false);
    expect(matches(fourth, second)).toBe(false);
    const properties = buildRentalProperties([second, fourth], context);
    expect(properties).toHaveLength(2);
    expect(properties.every((property) => property.offers.length === 1)).toBe(true);
    expect(properties.flatMap((property) => property.offers.map((offer) => offer.listingId)).sort()).toEqual(
      [second.listingId, fourth.listingId].sort(),
    );
  });

  it.each([
    "Apartamento 1 dor amueblado",
    "Apto 2 dors. en Pocitos",
    "Apartamento 1 -2 dor amueblado",
    "Apartamento 1–2 dormitorios",
    "Apartamento 1/2 dorm",
    "Apartamento 1 o 2 dormitorios",
    "Apartamento 1 y 2 dormitorios",
    "Apartamento 1 a 2 dormitorios",
    "Apartamento 1-2",
    "Apartamento 100 m²",
    "Apartamento 100m²",
    "Apartamento 30 m2",
    "Apartamento 60 metros cuadrados",
    "Apartamento 1500 dólares",
    "Apartamento 1.500 dólares",
    "Apartamento 25.000 UYU",
    "Apartamento 1500 USD",
    "Apartamento 1500 U$S",
    "Apartamento 1500 pesos",
    "Apartamento 1500 $",
  ])("does not extract a unit from bedrooms, ranges, surface areas or asking prices: %s", (title) => {
    const raw = { address: "Rizal 3715", title };
    expect(rentalUnitEvidence(raw).units).toEqual([]);
    expect(matches(raw, raw)).toBe(false);
  });

  it("does not extract the final letter of Apto as unit O in the exact Malvin adverts", () => {
    const shared: Partial<RawRental> = {
      department: "Montevideo",
      neighborhood: "Malvín",
      address: "Rambla República de Chile 4500",
      street: "rambla republica de chile",
      streetNumber: "4500",
      bedrooms: 3,
      bathrooms: 1,
      area: 90,
      price: 42000,
    };
    const infocasas = listing({
      ...shared,
      listingId: "infocasas:194088031",
      title: "Alquiler Apto. Rambla de Malvin, 3D, 1B y garaje",
    });
    const mercadolibre = listing({
      ...shared,
      source: "mercadolibre",
      listingId: "mercadolibre:MLU1477297794",
      neighborhood: "Malvin",
      address: "Rambla República De Chile 4500",
      title: "Alquiler Apto. Rambla De Malvin, 3d, 1b Y Garaje",
    });
    expect(rentalUnitEvidence(infocasas).units).toEqual([]);
    expect(rentalUnitEvidence(mercadolibre).units).toEqual([]);
    expect(matches(infocasas, mercadolibre)).toBe(false);
    expect(buildRentalProperties([infocasas, mercadolibre], context)).toHaveLength(2);
  });

  it.each(["Apto.", "Apto. Rambla", "Apto, Rambla", "Apartamentos en alquiler"])(
    "does not use part of the label itself as an identifier: %s",
    (title) => {
      expect(rentalUnitEvidence({ address: "Rizal 3715", title }).units).toEqual([]);
    },
  );

  it.each(["Unidad301", "Apto301", "Apto N°2D"])(
    "still recognizes an explicit numeric identifier after the complete label: %s",
    (title) => {
      expect(rentalUnitEvidence({ address: "Rizal 3715", title }).units).toHaveLength(1);
      expect(matches({ address: "Rizal 3715", title }, { address: "Rizal 3715", title })).toBe(true);
    },
  );

  it.each([
    { title: "Apartamento 2 dormitorios en Pocitos" },
    { image: "https://pictures.example.uy/logo.png" },
    { image: null },
    { bedrooms: null },
    { bathrooms: null },
    { area: null },
  ])("does not infer a unit identifier from shared media or incomplete attributes: %j", (missing) => {
    expect(matches({ ...photoEvidence, ...missing }, { ...photoEvidence, ...missing })).toBe(false);
  });

  it("does not infer a unit identifier from similar photo URLs or identical image basenames", () => {
    expect(
      matches(photoEvidence, {
        ...photoEvidence,
        image: "https://another.example.uy/original/rizal-living-1487.jpg",
      }),
    ).toBe(false);
    expect(matches(photoEvidence, { ...photoEvidence, image: `${photoEvidence.image}?size=small` })).toBe(
      false,
    );
  });

  it("does not allow a shared photo to override a conflicting published unit", () => {
    expect(
      matches(
        { ...photoEvidence, address: "Rizal 3715 apto 301" },
        { ...photoEvidence, address: "Rizal 3715 apto 302" },
      ),
    ).toBe(false);
  });

  it("does not accept non-finite or non-positive rents as coherent prices", () => {
    for (const price of [NaN, Infinity, 0, -1]) expect(matches({}, { price })).toBe(false);
  });
});

describe("conservative clustering and identity", () => {
  it("reserves the old URL for its attributed canonical advert when stricter evidence splits a group", () => {
    const canonical = listing({
      listingId: "infocasas:9",
      title: "Apartamento unidad 601",
      address: "Rizal 3715 apto 601",
    });
    const other = listing({
      listingId: "infocasas:1",
      title: "Apartamento unidad 801",
      address: "Rizal 3715 apto 801",
    });
    const history = {
      ...context,
      offerToProperty: new Map([
        [canonical.listingId, "existing-canonical-a"],
        [other.listingId, "existing-canonical-a"],
      ]),
      propertyCanonicalOffer: new Map([["existing-canonical-a", canonical.listingId]]),
    };
    const rows = buildRentalProperties([other, canonical], history);
    expect(rows).toHaveLength(2);
    expect(
      rows.find((row) => row.key === "existing-canonical-a")?.offers.map((offer) => offer.listingId),
    ).toEqual([canonical.listingId]);
    expect(rows.find((row) => row.offers[0]?.listingId === other.listingId)?.key).not.toBe(
      "existing-canonical-a",
    );
    expect(buildRentalProperties([canonical, other], history)).toEqual(rows);
  });

  it("does not transfer an absent canonical advert's URL to the other unit in a partial run", () => {
    const other = listing({ listingId: "infocasas:1", address: "Rizal 3715 apto 801" });
    const rows = buildRentalProperties([other], {
      ...context,
      offerToProperty: new Map([
        ["infocasas:9", "old-key"],
        [other.listingId, "old-key"],
      ]),
      propertyCanonicalOffer: new Map([["old-key", "infocasas:9"]]),
    });
    expect(rows[0]!.key).not.toBe("old-key");
    expect(rows[0]!.offers[0]!.listingId).toBe(other.listingId);
  });

  it("does not let a majority of historical offers claim a URL with ambiguous canonical attribution", () => {
    const raw = [listing({ listingId: "infocasas:1" }), listing({ listingId: "infocasas:2" })];
    const rows = buildRentalProperties(raw, {
      ...context,
      offerToProperty: new Map(raw.map((item) => [item.listingId, "ambiguous-old-key"])),
      propertyCanonicalOffer: new Map([["ambiguous-old-key", null]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.offers).toHaveLength(2);
    expect(rows[0]!.key).not.toBe("ambiguous-old-key");
  });

  it("reserves canonical-map keys even if dates and offer ownership are absent", () => {
    const raw = listing({});
    const computed = buildRentalProperties([raw], context)[0]!.key;
    const rows = buildRentalProperties([raw], {
      ...context,
      propertyCanonicalOffer: new Map([[computed, null]]),
    });
    expect(rows[0]!.key).not.toBe(computed);
  });

  it.each([
    {
      street: "gabriel pereira",
      streetNumber: "2976",
      address: "Gabriel Pereira 2976",
      units: ["603", "407", "504"],
      price: 32000,
      bedrooms: 2,
      area: 60,
    },
    {
      street: "plutarco",
      streetNumber: "3978",
      address: "Plutarco 3978",
      units: ["405", "103"],
      price: 23000,
      bedrooms: 0,
      area: 31,
    },
    {
      street: "avenida de las americas",
      streetNumber: "100",
      address: "Avenida de las Americas 100 torre C",
      units: ["105", "102"],
      price: 37000,
      bedrooms: 1,
      area: 45,
    },
  ])("separates the published unit conflicts found in the live audit: $street", (sample) => {
    // The third fixture supplies an illustrative door number: the audited evidence is units
    // 105 and 102 in tower C, not a verified door number. Price/specs cannot erase that conflict.
    const raw = sample.units.map((unit, index) =>
      listing({
        listingId: `infocasas:${index}`,
        street: sample.street,
        streetNumber: sample.streetNumber,
        address: `${sample.address} apto ${unit}`,
        title: `Apartamento unidad ${unit}`,
        price: sample.price,
        bedrooms: sample.bedrooms,
        area: sample.area,
      }),
    );
    expect(buildRentalProperties(raw, context)).toHaveLength(sample.units.length);
  });

  it("uses all pairs, so tolerance cannot chain three different prices into one property", () => {
    const raw = [
      listing({ listingId: "infocasas:a", price: 30000 }),
      listing({ listingId: "infocasas:b", price: 32000 }),
      listing({ listingId: "infocasas:c", price: 34000 }),
    ];
    const before = buildRentalProperties(raw, context);
    const reversed = buildRentalProperties([...raw].reverse(), context);
    expect(before).toHaveLength(2);
    expect(reversed).toEqual(before);
    expect(before.some((row) => row.offers.length === 3)).toBe(false);
  });

  it("deduplicates the same portal ID globally even if repeated queries differ in location completeness", () => {
    const thin = listing({
      address: "",
      street: "",
      streetNumber: "",
      area: null,
      latitude: null,
      longitude: null,
    });
    const complete = listing({});
    const rows = buildRentalProperties([thin, complete], context);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.offers).toHaveLength(1);
    expect(rows[0]!.address).toBe(base.address);
    expect(buildRentalProperties([complete, thin], context)).toEqual(rows);
  });

  it("selects the same duplicate snapshot independently of query order and retains a known amenity", () => {
    const ordinary = listing({});
    const petQuery = listing({ petsAllowed: true });
    const before = buildRentalProperties([ordinary, petQuery], context);
    expect(before).toEqual(buildRentalProperties([petQuery, ordinary], context));
    expect(before[0]!.offers).toHaveLength(1);
    expect(before[0]!.offers[0]!.petsAllowed).toBe(true);
  });

  it("retains every advert when a formerly broad building merge splits and preserves one owner key", () => {
    const a = listing({ listingId: "infocasas:a", address: "Rizal 3715" });
    const b = listing({ listingId: "infocasas:b", address: "Rizal 3715" });
    const rows = buildRentalProperties([a, b], {
      ...context,
      offerToProperty: new Map([
        [a.listingId, "historical-key"],
        [b.listingId, "historical-key"],
      ]),
      propertyFirstSeen: new Map([["historical-key", "2026-07-01"]]),
    });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.key)).size).toBe(2);
    expect(rows.filter((row) => row.key === "historical-key")).toHaveLength(1);
    expect(rows.flatMap((row) => row.offers.map((offer) => offer.listingId)).sort()).toEqual([
      a.listingId,
      b.listingId,
    ]);
  });

  it("preserves evidence per offer rather than assigning canonical specifications to every portal", () => {
    const rows = buildRentalProperties(
      [
        listing({}),
        listing({ listingId: "mercadolibre:2", source: "mercadolibre", area: null, latitude: null }),
      ],
      context,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.offers[0]!.identity).toMatchObject({ version: 1, area: 60, address: base.address });
    expect(rows[0]!.offers[1]!.identity).toMatchObject({
      version: 1,
      area: null,
      latitude: null,
      address: base.address,
    });
  });
});
