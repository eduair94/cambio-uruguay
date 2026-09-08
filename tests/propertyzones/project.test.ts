import { describe, expect, it } from "vitest";
import {
  projectZoneObservations,
  zoneOwnCommonExpenses,
  ZONE_RENTAL_PROJECTION,
} from "../../classes/propertyzones/project";
import { buildRentalZoneMarket } from "../../classes/propertyzones/market";

const stamp = "2026-09-08T12:00:00.000Z",
  now = Date.parse(stamp);
const unknown = { commonExpenses: null, commonExpensesCurrency: null };
const own = (patch: Record<string, unknown> = {}) => ({
  source: "infocasas",
  listingId: "12345",
  title: "Alquiler mensual apartamento de dos dormitorios",
  price: 20000,
  currency: "UYU",
  commonExpenses: 2000,
  commonExpensesCurrency: "UYU",
  lastSeen: stamp,
  identity: {
    version: 1,
    propertyType: "apartamento",
    department: "Montevideo",
    neighborhood: "Cordón",
    bedrooms: 2,
    description: "Alquiler mensual. Gastos comunes $2000. PRIVATE_DESCRIPTION",
  },
  details: {
    builtArea: 50,
    totalArea: 60,
    description: "PRIVATE_DETAILS",
    rawContact: "PRIVATE_CONTACT",
  },
  contact: "PRIVATE_CONTACT",
  address: "PRIVATE_ADDRESS",
  priceUyu: 1,
  ...patch,
});
const property = (
  offers: unknown[] = [own()],
  patch: Record<string, unknown> = {},
) => ({
  key: "property-qa",
  department: "Maldonado",
  neighborhood: "Centro",
  propertyType: "oficina",
  bedrooms: 9,
  offers,
  description: "Sin gastos comunes PRIVATE_GROUP",
  ...patch,
});

describe("same-advert common expense evidence", () => {
  it.each([
    "Sin gastos comunes",
    "No tiene gastos comunes",
    "Gastos comunes sin costo",
    "Gastos comunes $0",
    "GC: 0",
  ])("requires explicit recurring zero: %s", (description) => {
    expect(zoneOwnCommonExpenses({ commonExpenses: 0 }, description)).toEqual({
      commonExpenses: 0,
      commonExpensesCurrency: "UYU",
    });
  });

  it.each([
    "Alquiler mensual apartamento",
    "No es sin gastos comunes",
    "Sin gastos comunes? Consultar",
    "Sin gastos comunes por los primeros 3 meses",
    "Sin gastos comunes durante el primer mes",
    "Primeros tres meses sin gastos comunes",
    "Durante el primer año sin gastos comunes",
    "Sin gastos comunes hasta diciembre",
    "Gastos comunes 0 durante los primeros meses",
  ])(
    "never treats absent, negated or conditional free expenses as recurring zero: %s",
    (description) => {
      expect(zoneOwnCommonExpenses({ commonExpenses: 0 }, description)).toEqual(
        unknown,
      );
    },
  );

  it("does not combine text zero with a positive structured or textual expense", () => {
    expect(
      zoneOwnCommonExpenses(
        { commonExpenses: 2000, commonExpensesCurrency: "UYU" },
        "Sin gastos comunes",
      ),
    ).toEqual(unknown);
    expect(
      zoneOwnCommonExpenses(
        { commonExpenses: 0, commonExpensesCurrency: "UYU" },
        "Sin gastos comunes. Gastos comunes $2000",
      ),
    ).toEqual(unknown);
    expect(
      zoneOwnCommonExpenses(
        { commonExpenses: 0, commonExpensesCurrency: "UYU" },
        "Gastos comunes $2000",
      ),
    ).toEqual(unknown);
  });

  it.each([
    [2000, "UYU", "Gastos comunes USD2000"],
    [100, "UYU", "Gastos comunes 100 USD"],
    [100, "UYU", "Gastos comunes 100 US$"],
    [100, "USD", "Gastos comunes 100 pesos"],
    [3000, "UYU", "Gastos comunes $2.000,50"],
    [3000, "UYU", "Gastos comunes $2,000.50"],
    [3000, "UYU", "Gastos comunes $2000"],
  ])(
    "abstains on conflicting currency or amount: %s %s / %s",
    (commonExpenses, commonExpensesCurrency, description) => {
      expect(
        zoneOwnCommonExpenses(
          { commonExpenses, commonExpensesCurrency },
          description as string,
        ),
      ).toEqual(unknown);
    },
  );

  it("accepts known structured positive expenses with matching own evidence, never inventing currency", () => {
    expect(
      zoneOwnCommonExpenses(
        { commonExpenses: 2000.5, commonExpensesCurrency: "UYU" },
        "Gastos comunes $2.000,50",
      ),
    ).toEqual({ commonExpenses: 2000.5, commonExpensesCurrency: "UYU" });
    expect(
      zoneOwnCommonExpenses(
        { commonExpenses: 100, commonExpensesCurrency: "USD" },
        "Gastos comunes U$S100",
      ),
    ).toEqual({ commonExpenses: 100, commonExpensesCurrency: "USD" });
    expect(
      zoneOwnCommonExpenses({ commonExpenses: 100 }, "Gastos comunes $100"),
    ).toEqual(unknown);
    for (const commonExpenses of [NaN, Infinity, -1, "2000"])
      expect(
        zoneOwnCommonExpenses(
          { commonExpenses, commonExpensesCurrency: "UYU" },
          "",
        ),
      ).toEqual(unknown);
  });
});

describe("own physical identity market projection", () => {
  it("uses own published facts and discards canonical fields, private descriptions, contacts and saved conversions", () => {
    const result = projectZoneObservations(property());
    expect(result).toEqual([
      {
        propertyKey: "property-qa",
        advertId: "infocasas:12345",
        source: "infocasas",
        department: "Montevideo",
        neighborhood: "Cordón",
        propertyType: "apartamento",
        bedrooms: 2,
        price: 20000,
        currency: "UYU",
        commonExpenses: 2000,
        commonExpensesCurrency: "UYU",
        areaBuilt: 50,
        lastSeen: stamp,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_");
    expect(ZONE_RENTAL_PROJECTION).not.toHaveProperty("offers.contact");
    expect(ZONE_RENTAL_PROJECTION).not.toHaveProperty("offers.priceUyu");
    expect(ZONE_RENTAL_PROJECTION).not.toHaveProperty(
      "offers.identity.latitude",
    );
  });

  it.each([
    { identity: undefined },
    { identity: { ...own().identity, version: 0 } },
    { identity: { ...own().identity, neighborhood: undefined } },
    { identity: { ...own().identity, department: undefined } },
    { identity: { ...own().identity, propertyType: "oficina" } },
    { source: "constructor" },
    { source: "[" },
    { listingId: "constructor" },
    { listingId: "__proto__" },
    { listingId: "prototype" },
    { listingId: "" },
    { listingId: "some:other:source" },
    { title: "Alquiler por día apartamento" },
    { price: 0 },
    { price: NaN },
    { price: "20000" },
    { currency: "UI" },
  ])("rejects missing own evidence or unsafe native identity: %j", (patch) => {
    expect(projectZoneObservations(property([own(patch)]))).toEqual([]);
  });

  it("keeps the qualified alternative without borrowing features or expenses from another source", () => {
    const second = own({
      listingId: "67890",
      identity: {
        ...own().identity,
        neighborhood: "Centro",
        description: "Alquiler mensual apartamento",
      },
      commonExpenses: 0,
      details: {},
    });
    const result = projectZoneObservations(
      property([own({ identity: undefined }), second]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      advertId: "infocasas:67890",
      neighborhood: "Centro",
      commonExpenses: null,
      areaBuilt: null,
    });
  });

  it("allows only the exact native source prefix once and preserves different sources with the same native ID", () => {
    const result = projectZoneObservations(
      property([
        own({ listingId: "infocasas:12345" }),
        own({ source: "casasweb", listingId: "12345" }),
      ]),
    );
    expect(result.map((row) => row.advertId)).toEqual([
      "infocasas:12345",
      "casasweb:12345",
    ]);
  });

  it("uses explicit built area only, with bounds and contradicting apartment total area veto", () => {
    for (const details of [
      { area: 50 },
      { totalArea: 50 },
      { landArea: 50 },
      { builtArea: 7 },
      { builtArea: 100001 },
      { builtArea: Infinity },
      { builtArea: 80, totalArea: 50 },
    ]) {
      expect(
        projectZoneObservations(property([own({ details })]))[0]!.areaBuilt,
      ).toBeNull();
    }
    expect(
      projectZoneObservations(
        property([own({ identity: { ...own().identity, bedrooms: null } })]),
      )[0]!.bedrooms,
    ).toBeNull();
  });

  it("never refreshes old reads and leaves the final fresh-date check to the canonical market engine", () => {
    for (const lastSeen of [
      "2026-08-28",
      "2026-09-09",
      "invalid",
      "2026-02-31",
      null,
    ]) {
      const projected = projectZoneObservations(property([own({ lastSeen })]));
      expect(
        buildRentalZoneMarket(projected, { now, usdUyu: 40 }).observations,
      ).toBe(0);
    }
    expect(
      buildRentalZoneMarket(
        projectZoneObservations(property([own({ lastSeen: "2026-08-29" })])),
        { now, usdUyu: 40 },
      ).observations,
    ).toBe(1);
  });
});
