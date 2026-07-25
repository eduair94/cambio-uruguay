import { describe, expect, it } from "vitest";
import { chairCategory, groupListings, identifyChair, isDeskChair } from "../../classes/chairs/normalize";
import type { ChairListing } from "../../classes/chairs/types";

const listing = (overrides: Partial<ChairListing>): ChairListing => ({
  listingId: "x",
  source: "mercadolibre",
  sellerKey: "ml:1",
  sellerName: "Vendedor",
  channel: "marketplace",
  title: "Silla de escritorio",
  url: "https://example.com",
  price: 1000,
  currency: "UYU",
  condition: "new",
  available: true,
  image: null,
  brand: "",
  model: "",
  catalogId: null,
  attributes: {},
  rating: null,
  ratingCount: 0,
  location: null,
  freeShipping: null,
  officialStore: false,
  observedAt: "2026-07-25T00:00:00.000Z",
  ...overrides,
});

describe("isDeskChair", () => {
  it("accepts chairs sold for a desk", () => {
    expect(isDeskChair("Silla de escritorio ergonómica negra")).toBe(true);
    expect(isDeskChair("Silla gamer reclinable")).toBe(true);
    expect(isDeskChair("Silla ejecutiva de oficina con cabecera")).toBe(true);
  });

  it("rejects chairs that are not for a desk", () => {
    expect(isDeskChair("Silla de comedor de madera")).toBe(false);
    expect(isDeskChair("Silla de bebé para comer")).toBe(false);
    expect(isDeskChair("Silla playera plegable")).toBe(false);
    expect(isDeskChair("Banqueta alta de bar")).toBe(false);
  });

  it("rejects accessories and spare parts that name a desk chair", () => {
    expect(isDeskChair("Funda para silla de escritorio")).toBe(false);
    expect(isDeskChair("Ruedas de repuesto para silla de oficina")).toBe(false);
    expect(isDeskChair("Combo silla de escritorio + escritorio Nora")).toBe(false);
  });

  it("uses the context when the title alone is mute", () => {
    expect(isDeskChair("Silla Michigan")).toBe(false);
    expect(isDeskChair("Silla Michigan", "Silla operativa giratoria para oficina")).toBe(true);
  });

  it("accepts a trademarked task-chair model with no other clue", () => {
    expect(isDeskChair("Silla Sayl")).toBe(true);
    expect(isDeskChair("Silla Embody - Grafito")).toBe(true);
  });
});

describe("identifyChair", () => {
  it("keeps a real brand and model", () => {
    const identity = identifyChair({ title: "Silla gamer Cougar Armor Elite", brand: "Cougar", model: "ARMOR ELITE" });
    expect(identity.brand).toBe("Cougar");
    expect(identity.key).toBe("cougar|armor elite");
    expect(identity.identified).toBe(true);
  });

  it("gives a trademarked model back to its real maker even when the store claims the brand", () => {
    const identity = identifyChair({ title: "Silla Embody - Gaming", brand: "Bertoni" });
    expect(identity.brand).toBe("Herman Miller");
    expect(identity.model).toBe("Embody");
  });

  it("drops a model field that only repeats descriptors", () => {
    const identity = identifyChair({
      title: "Silla ergonómica Wicopet base cromada",
      brand: "Wicopet",
      model: "giratoria ergonomica",
    });
    expect(identity.model.toLowerCase()).not.toBe("giratoria ergonomica");
  });

  it("ignores company suffixes when building the merge key", () => {
    const withSuffix = identifyChair({ title: "Silla Lumax ROM-SA", brand: "Lumax", model: "ROM-SA" });
    const without = identifyChair({ title: "Silla Lumax ROM", brand: "Lumax", model: "ROM" });
    expect(withSuffix.key).toBe(without.key);
  });

  it("falls back to the seller only for its own unbranded line", () => {
    const identity = identifyChair({ title: "Silla Veloce", fallbackBrand: "La Cueva Muebles" });
    expect(identity.brand).toBe("La Cueva Muebles");
    expect(identity.identified).toBe(true);
    const branded = identifyChair({ title: "Silla Cougar Armor", brand: "Cougar", fallbackBrand: "La Cueva" });
    expect(branded.brand).toBe("Cougar");
  });

  it("leaves an unnameable listing unidentified", () => {
    expect(identifyChair({ title: "Silla ergonómica negra" }).identified).toBe(false);
  });
});

describe("groupListings", () => {
  it("merges the same chair across platforms", () => {
    const groups = groupListings([
      listing({ listingId: "ml:1", title: "Silla Herman Miller Aeron", brand: "Herman Miller", model: "Aeron" }),
      listing({
        listingId: "store:bertoni:1",
        source: "store",
        sellerKey: "bertoni",
        sellerName: "Bertoni",
        channel: "local-store",
        title: "Silla New Aeron - Con Forward Tilt",
        currency: "USD",
        price: 2795,
      }),
      listing({
        listingId: "fb:1",
        source: "facebook",
        sellerKey: "facebook",
        sellerName: "Facebook Marketplace",
        channel: "classifieds",
        title: "Silla Aeron usada",
        condition: "used",
      }),
    ]);
    expect(groups.size).toBe(1);
    const rows = [...groups.values()][0]!;
    expect(rows.map((row) => row.source).sort()).toEqual(["facebook", "mercadolibre", "store"]);
  });

  it("keeps different chairs apart", () => {
    const groups = groupListings([
      listing({ listingId: "a", title: "Silla Cougar Armor Elite", brand: "Cougar", model: "Armor Elite" }),
      listing({ listingId: "b", title: "Silla Perseo Pegasus", brand: "Perseo", model: "Pegasus" }),
    ]);
    expect(groups.size).toBe(2);
  });

  it("uses the marketplace catalogue id to unify listings that name the chair differently", () => {
    const groups = groupListings([
      listing({ listingId: "a", catalogId: "MLU1", title: "Silla Imback IBK-S0004", brand: "Imback", model: "IBK-S0004" }),
      listing({
        listingId: "b",
        catalogId: "MLU1",
        title: "Silla de escritorio Imback ibk s0004 ergonómica",
        brand: "Imback",
        model: "IBK S0004",
      }),
    ]);
    expect(groups.size).toBe(1);
  });

  it("drops listings it cannot name", () => {
    const groups = groupListings([listing({ title: "Silla ergonómica negra malla" })]);
    expect(groups.size).toBe(0);
  });
});

describe("chairCategory", () => {
  it("classifies by the words the sellers actually use", () => {
    expect(chairCategory("Silla gamer Redragon")).toBe("gaming");
    expect(chairCategory("Silla ergonómica con soporte lumbar")).toBe("ergonomic");
    expect(chairCategory("Silla ejecutiva de cuero")).toBe("executive");
    expect(chairCategory("Silla operativa para oficina")).toBe("operative");
  });
});

describe("plural nouns in the exclusion list", () => {
  it("rejects casters, stacking and auditorium listings however they are pluralised", () => {
    expect(isDeskChair("Ruedas silla escritorio set x5")).toBe(false);
    expect(isDeskChair("Rueda para silla de oficina")).toBe(false);
    expect(isDeskChair("Sillas apilables auditorio para oficina")).toBe(false);
    expect(isDeskChair("Sillas escolares para aulas")).toBe(false);
    expect(isDeskChair("Pistones para silla de escritorio")).toBe(false);
  });

  it("still accepts a chair that merely rolls", () => {
    expect(isDeskChair("Silla de escritorio ergonómica giratoria")).toBe(true);
  });
});

describe("junk identities", () => {
  it("refuses a model that only echoes the brand", () => {
    // Sellers routinely paste their shop name into both fields.
    expect(identifyChair({ title: "Silla de escritorio", brand: "Tcweb", model: "TCWEB" }).identified).toBe(
      false
    );
  });

  it("refuses a model made of two-letter fragments", () => {
    expect(identifyChair({ title: "Silla de oficina", brand: "Marca", model: "x y" }).identified).toBe(false);
  });
});
