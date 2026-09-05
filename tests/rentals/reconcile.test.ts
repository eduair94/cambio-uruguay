import { describe, expect, it } from "vitest";
import {
  detachedRentalKey,
  offerMatchCandidate,
  partitionRentalOffers,
  propertyFromRentalOffers,
} from "../../classes/rentals/reconcile";
import type { RentalOffer, RentalOfferIdentity, RentalProperty } from "../../classes/rentals/types";

const identity: RentalOfferIdentity = {
  version: 1,
  propertyType: "apartamento",
  department: "Montevideo",
  neighborhood: "Pocitos",
  address: "Rizal 3715 apto 301",
  street: "rizal",
  streetNumber: "3715",
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  latitude: -34.9,
  longitude: -56.15,
};
const offer = (overrides: Partial<RentalOffer> = {}): RentalOffer => ({
  source: "infocasas",
  listingId: "infocasas:1",
  url: "https://www.infocasas.com.uy/original/1",
  title: "Apartamento 2 dormitorios en Pocitos",
  price: 32000,
  currency: "UYU",
  priceUyu: 32000,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: "Inmobiliaria",
  sellerType: "inmobiliaria",
  image: null,
  publishedAt: null,
  parkingSpaces: null,
  furnished: null,
  petsAllowed: null,
  guarantees: [],
  firstSeen: "2026-07-01",
  lastSeen: "2026-09-04",
  identity: { ...identity },
  ...overrides,
});
const legacy = (overrides: Partial<RentalOffer> = {}) => offer({ identity: undefined, ...overrides });
const storedProperty = (overrides: Partial<RentalProperty> = {}): RentalProperty => ({
  key: "old-key",
  title: "Título canónico anterior",
  propertyType: "casa",
  department: "Canelones",
  neighborhood: "Las Piedras",
  address: "Dirección de otra vivienda 1550",
  addressKey: "old-address",
  latitude: -34.7,
  longitude: -56.2,
  bedrooms: 4,
  bathrooms: 3,
  area: 150,
  parkingSpaces: 2,
  furnished: true,
  petsAllowed: true,
  guarantees: ["anda"],
  price: 32000,
  currency: "UYU",
  priceUyu: 32000,
  offers: [legacy()],
  sources: ["infocasas"],
  firstSeen: "2026-06-01",
  lastSeen: "2026-09-04",
  freshAt: "2026-06-01",
  ...overrides,
});

describe("offerMatchCandidate", () => {
  it("uses the original per-offer identity without mutating it", () => {
    const input = offer();
    const before = structuredClone(input);
    expect(offerMatchCandidate(input)).toMatchObject({
      source: "infocasas",
      listingId: "infocasas:1",
      address: identity.address,
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
      priceUyu: 32000,
    });
    expect(input).toEqual(before);
    expect(offerMatchCandidate(legacy())).toBeNull();
  });

  it.each([
    { ...identity, version: 0 },
    { ...identity, bedrooms: undefined },
    { ...identity, area: Infinity },
    { ...identity, department: null },
    { ...identity, propertyType: "unknown" },
    { ...identity, bedrooms: -1 },
    { ...identity, bathrooms: 0 },
    { ...identity, area: -1 },
    { ...identity, latitude: Infinity },
  ])("rejects incomplete, unknown-version or malformed historical evidence", (malformed) => {
    expect(offerMatchCandidate(offer({ identity: malformed as RentalOfferIdentity }))).toBeNull();
  });
});

describe("partitionRentalOffers", () => {
  it("keeps every distinct advert while separating conflicting known units and legacy records", () => {
    const a = offer();
    const same = offer({ source: "mercadolibre", listingId: "mercadolibre:1" });
    const upstairs = offer({
      listingId: "infocasas:2",
      identity: { ...identity, address: "Rizal 3715 apto 801" },
    });
    const old = legacy({ listingId: "infocasas:3" });
    const input = [a, same, upstairs, old];
    const before = structuredClone(input);
    const groups = partitionRentalOffers(input);
    expect(groups.map((group) => group.length).sort()).toEqual([1, 1, 2]);
    expect(
      groups
        .flat()
        .map((row) => row.listingId)
        .sort(),
    ).toEqual(input.map((row) => row.listingId).sort());
    expect(groups.find((group) => group.includes(old))).toEqual([old]);
    expect(partitionRentalOffers([...input].reverse())).toEqual(groups);
    expect(input).toEqual(before);
  });

  it("does not hide a divergent price; it becomes a separate property", () => {
    const groups = partitionRentalOffers([offer(), offer({ listingId: "infocasas:2", priceUyu: 65000 })]);
    expect(groups).toHaveLength(2);
    expect(groups.flat()).toHaveLength(2);
  });

  it("does not transitively bridge prices that each match a middle advert", () => {
    const groups = partitionRentalOffers([
      offer({ listingId: "infocasas:a", priceUyu: 30000 }),
      offer({ listingId: "infocasas:b", priceUyu: 32000 }),
      offer({ listingId: "infocasas:c", priceUyu: 34000 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.flat()).toHaveLength(3);
  });

  it("chooses the latest observation of repeated IDs without changing its dates or evidence", () => {
    const old = offer({ lastSeen: "2026-09-03", title: "Anterior" });
    const latest = offer({ lastSeen: "2026-09-04", firstSeen: "2026-07-02", title: "Nuevo" });
    expect(partitionRentalOffers([latest, old])).toEqual([[latest]]);
    expect(partitionRentalOffers([old, latest])).toEqual([[latest]]);
  });

  it("uses deterministic duplicate ties and distinguishes IDs from different sources", () => {
    const a = offer({ title: "Apartamento A" });
    const b = offer({ title: "Apartamento B" });
    expect(partitionRentalOffers([a, b])).toEqual(partitionRentalOffers([b, a]));
    const otherSource = legacy({ source: "facebook", listingId: a.listingId });
    expect(partitionRentalOffers([a, otherSource]).flat()).toHaveLength(2);
  });

  it("does not restore missing evidence on a newer legacy observation using the old snapshot", () => {
    const previous = offer({ lastSeen: "2026-09-03" });
    const current = legacy({ lastSeen: "2026-09-04" });
    expect(partitionRentalOffers([previous, current])).toEqual([[current]]);
  });

  it("compares at the supplied current rate but returns the original snapshots", () => {
    const pesos = offer({ price: 32000, priceUyu: 32000 });
    const dollars = offer({
      source: "mercadolibre",
      listingId: "mercadolibre:2",
      price: 800,
      currency: "USD",
      priceUyu: 24000,
    });
    expect(partitionRentalOffers([pesos, dollars])).toHaveLength(2);
    const current = partitionRentalOffers([pesos, dollars], 40);
    expect(current).toHaveLength(1);
    expect(current[0]).toContain(dollars);
    expect(dollars.priceUyu).toBe(24000);
  });
});

describe("propertyFromRentalOffers", () => {
  it.each([undefined, null, "anda", { anda: true }])(
    "handles non-array legacy guarantees without modifying the original offer: %j",
    (guarantees) => {
      const input = legacy({ guarantees: guarantees as RentalOffer["guarantees"] });
      const before = structuredClone(input);
      const property = propertyFromRentalOffers("legacy-guarantees", [input], 40);
      expect(property.guarantees).toEqual([]);
      expect(property.offers[0]!.guarantees).toEqual(guarantees);
      expect(property.offers[0]!.identity).toBeUndefined();
      expect(input).toEqual(before);
    },
  );

  it("keeps only known guarantee vocabulary in the derived property while retaining the original array", () => {
    const guarantees = ["anda", "unknown-guarantee", null, "anda"] as RentalOffer["guarantees"];
    const input = legacy({ guarantees });
    const property = propertyFromRentalOffers("legacy-guarantees", [input], 40);
    expect(property.guarantees).toEqual(["anda"]);
    expect(property.offers[0]!.guarantees).toEqual(guarantees);
  });

  it("rebuilds physical attributes from real per-offer facts and re-expresses all rents uniformly", () => {
    const pesos = offer({ price: 33000, priceUyu: 99999 });
    const dollars = offer({
      source: "mercadolibre",
      listingId: "mercadolibre:2",
      price: 800,
      currency: "USD",
      priceUyu: 24000,
      identity: { ...identity, area: null },
      parkingSpaces: 1,
      petsAllowed: true,
      guarantees: ["anda"],
      commonExpenses: 0,
      commonExpensesCurrency: null,
      firstSeen: "2026-08-01",
      lastSeen: "2026-09-03",
    });
    const before = structuredClone([pesos, dollars]);
    const property = propertyFromRentalOffers(
      "retained",
      [dollars, pesos],
      40,
      storedProperty({ key: "another" }),
    );
    expect(property).toMatchObject({
      key: "retained",
      department: "Montevideo",
      neighborhood: "Pocitos",
      address: identity.address,
      propertyType: "apartamento",
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
      price: 800,
      currency: "USD",
      priceUyu: 32000,
      parkingSpaces: 1,
      petsAllowed: true,
      guarantees: ["anda"],
      firstSeen: "2026-07-01",
      lastSeen: "2026-09-04",
    });
    expect(property.offers.map((row) => row.priceUyu)).toEqual([32000, 33000]);
    expect(property.offers[0]!.identity).toEqual(dollars.identity);
    expect(property.offers[0]!.commonExpenses).toBe(0);
    expect([pesos, dollars]).toEqual(before);
  });

  it("preserves the observed conversion during cleanup without a fresh exchange rate", () => {
    const usd = offer({ price: 800, currency: "USD", priceUyu: 31555 });
    expect(propertyFromRentalOffers("key", [usd], 0).priceUyu).toBe(31555);
    expect(propertyFromRentalOffers("key", [usd], 41).priceUyu).toBe(32800);
  });

  it("never assigns a multi-offer property's physical attributes to its detached legacy advert", () => {
    const detached = legacy({ title: "Apartamento 2 dormitorios 1 baño 60m²", parkingSpaces: 1 });
    const previous = storedProperty({ offers: [detached, legacy({ listingId: "infocasas:other" })] });
    const property = propertyFromRentalOffers(detachedRentalKey(detached), [detached], 40, previous);
    expect(property).toMatchObject({
      propertyType: "apartamento",
      title: detached.title,
      department: "",
      neighborhood: "",
      address: "",
      latitude: null,
      longitude: null,
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
      parkingSpaces: 1,
      furnished: null,
      petsAllowed: null,
      guarantees: [],
      firstSeen: "2026-07-01",
    });
    expect(property.offers[0]!.identity).toBeUndefined();
    expect(property.addressKey).not.toBe(previous.addressKey);
  });

  it("does not turn an unknown legacy amenity or attribute into zero", () => {
    const detached = legacy({ title: "Alquiler disponible" });
    const property = propertyFromRentalOffers("key", [detached], 40);
    expect(property).toMatchObject({
      bedrooms: null,
      bathrooms: null,
      area: null,
      parkingSpaces: null,
      petsAllowed: null,
      furnished: null,
    });
    expect(property.offers[0]!.commonExpenses).toBeNull();
  });

  it("may retain a singleton's existing presentation while its identity stays absent", () => {
    const single = legacy();
    const previous = storedProperty({
      offers: [single],
      title: single.title,
      propertyType: "apartamento",
      bedrooms: 2,
      bathrooms: 1,
      department: "Montevideo",
      neighborhood: "Pocitos",
    });
    const property = propertyFromRentalOffers(previous.key, [single], 0, previous);
    expect(property).toMatchObject({
      department: previous.department,
      address: previous.address,
      latitude: previous.latitude,
      bedrooms: previous.bedrooms,
      firstSeen: previous.firstSeen,
    });
    expect(property.offers[0]!.identity).toBeUndefined();
    expect(offerMatchCandidate(property.offers[0]!)).toBeNull();
  });

  it("does not preserve a singleton polluted by an earlier separation with a different canonical title", () => {
    const single = legacy();
    const previous = storedProperty({ offers: [single] });
    expect(propertyFromRentalOffers(previous.key, [single], 40, previous)).toMatchObject({
      title: single.title,
      propertyType: "apartamento",
      department: "",
      neighborhood: "",
      address: "",
      bedrooms: 2,
      bathrooms: null,
      area: null,
    });
  });

  it("also rejects a matching canonical title whose previous type or bedroom count contradicts it", () => {
    const single = legacy();
    const previous = storedProperty({ offers: [single], title: single.title });
    const property = propertyFromRentalOffers(previous.key, [single], 40, previous);
    expect(property).toMatchObject({ propertyType: "apartamento", bedrooms: 2, department: "", address: "" });
    expect(property.offers[0]!.identity).toBeUndefined();
  });

  it("does not inherit a different singleton's presentation even when the listing IDs match across sources", () => {
    const detached = legacy();
    const previous = storedProperty({ offers: [legacy({ source: "facebook" })] });
    expect(propertyFromRentalOffers("detached", [detached], 40, previous).department).toBe("");
  });

  it("keeps a uniquely attributable canonical advert when the cheaper advert changes", () => {
    const canonical = offer({ title: "Apartamento luminoso con terraza en Pocitos", price: 34000 });
    const cheaper = offer({ listingId: "infocasas:2", title: "Apartamento 2 dormitorios", price: 32000 });
    const previous = storedProperty({ title: canonical.title, offers: [canonical, cheaper] });
    const property = propertyFromRentalOffers(previous.key, [cheaper, canonical], 40, previous);
    expect(property.title).toBe(canonical.title);
    expect(property.price).toBe(32000);
    expect(property.firstSeen).toBe(previous.firstSeen);
  });

  it("does not let a generic duplicated title claim canonical preference over better evidence", () => {
    const thin = offer({ listingId: "infocasas:1", identity: { ...identity, area: null } });
    const rich = offer({ listingId: "infocasas:2", identity: { ...identity, latitude: -34.91 } });
    const previous = storedProperty({ title: thin.title, offers: [thin, rich] });
    const property = propertyFromRentalOffers(previous.key, [thin, rich], 40, previous);
    expect(property.latitude).toBe(-34.91);
  });

  it("preserves publication and observation dates, without making detached adverts new today", () => {
    const old = legacy({ publishedAt: "2026-06-20", firstSeen: "2026-07-01", lastSeen: "2026-09-01" });
    const property = propertyFromRentalOffers("detached", [old], 40);
    expect(property).toMatchObject({
      freshAt: "2026-06-20",
      firstSeen: "2026-07-01",
      lastSeen: "2026-09-01",
    });
    expect(property.offers[0]!.publishedAt).toBe(old.publishedAt);
    expect(property.offers[0]!.firstSeen).toBe(old.firstSeen);
    expect(property.offers[0]!.lastSeen).toBe(old.lastSeen);
  });

  it("refuses to create a property with no original advert", () => {
    expect(() => propertyFromRentalOffers("empty", [], 40)).toThrow("without adverts");
  });

  it("does not trust missing legacy offer arrays or fail while reconstructing their real input", () => {
    const single = legacy();
    const previous = storedProperty({ title: single.title, offers: undefined });
    const property = propertyFromRentalOffers(previous.key, [single], 40, previous);
    expect(property.department).toBe("");
    expect(property.offers).toHaveLength(1);
    expect(property.offers[0]!.identity).toBeUndefined();
  });
});

describe("detachedRentalKey", () => {
  it("depends on source and original listing ID, not mutable or borrowed property metadata", () => {
    const a = offer();
    const key = detachedRentalKey(a);
    expect(key).toMatch(/^rental-advert-[a-f0-9]{64}$/);
    expect(detachedRentalKey(offer({ title: "Otro título", price: 45000, identity: undefined }))).toBe(key);
    expect(detachedRentalKey(offer({ listingId: "infocasas:2" }))).not.toBe(key);
    expect(detachedRentalKey(offer({ source: "facebook" }))).not.toBe(key);
  });
});
