import { describe, expect, it } from "vitest";
import { buildCarContacts, carContactFor, CAR_CONTACT_MAX_AGE_DAYS, contactSummary, type ContactOptions } from "../../classes/autos/contacts/build";
import { nextDealerContact, type DealerContactRecord } from "../../classes/autos/contacts/dealers";
import { carContactHash } from "../../classes/autos/contacts/optout";
import type { CarListing, CarSource } from "../../classes/autos/types";

const NOW = new Date("2026-09-21T12:00:00.000Z");
const daysAgo = (days: number): string => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function car(overrides: Partial<CarListing> = {}): CarListing {
  return {
    id: "MLU1", source: "mercadolibre", brandId: "1", brand: "Peugeot", modelId: "2", model: "208",
    title: "Peugeot 208 1.5 Allure", year: 2017, km: 112_000, price: 7_900, currency: "USD",
    transmission: "manual", fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private",
    sellerId: "SELLERID", picture: null, pictureCount: null,
    permalink: "https://auto.mercadolibre.com.uy/MLU-1-peugeot-_JM", observedAt: daysAgo(0), key: "ml-MLU1",
    brandSlug: "peugeot", modelSlug: "208", marketSlug: "peugeot-208", engine: "1.5", trim: null, trimLabel: null,
    kmQuality: "ok", flags: [], priceUsd: 7_900, priceConverted: false, firstSeen: daysAgo(10), lastSeen: daysAgo(0),
    priceDrop: null, sourceName: "Mercado Libre", reference: null,
    detail: { readAt: daysAgo(1), price: 7_900, currency: "USD", active: true, brand: "Peugeot", model: "208", year: 2017,
      km: 112_000, version: null, engineText: null, sellerName: null, bodyType: null, color: null, doors: null,
      flags: [], description: "Impecable, service al día. Llamar al 099 123 456" },
    ...overrides,
  };
}

const JULIO = "https://julioautomoviles.com.uy/vehiculo/fiat-uno/";
const dealer = (source: CarSource, at: string): DealerContactRecord =>
  nextDealerContact(null, { phones: [{ value: "+59891000111", mobile: true }], failure: null }, source, at);
const options = (overrides: Partial<ContactOptions> = {}): ContactOptions => ({ now: NOW, dealers: new Map(), optOuts: new Set(), ...overrides });

describe("carContactFor", () => {
  it("takes the number the seller wrote in the advert, dated by the advert's own read", () => {
    expect(carContactFor(car(), options())).toEqual({
      key: "ml-MLU1", source: "mercadolibre", sellerType: "private", origin: "advert_text",
      phones: [{ value: "+59899123456", mobile: true }],
      sourceUrl: "https://auto.mercadolibre.com.uy/MLU-1-peugeot-_JM", observedAt: daysAgo(1),
      dealer: null, accountTwins: null,
    });
  });

  it("drops a description read more than 21 days ago", () => {
    expect(CAR_CONTACT_MAX_AGE_DAYS).toBe(21);
    expect(carContactFor(car({ detail: { ...car().detail!, readAt: daysAgo(22) } }), options())).toBeNull();
  });

  it("reads the title when there is no advert page yet", () => {
    const record = carContactFor(car({ title: "Gol 2012 wsp 098 765 432", detail: null }), options());
    expect(record).toMatchObject({ origin: "advert_text", observedAt: daysAgo(0), phones: [{ value: "+59898765432", mobile: true }] });
  });

  it("never publishes a Facebook number", () => {
    const listing = car({ source: "facebook", key: "fb-1", permalink: "https://www.facebook.com/marketplace/item/1234567890/" });
    expect(carContactFor(listing, options())).toBeNull();
  });

  it("falls back to the dealer's own contact page only for that dealer's adverts", () => {
    const julio = car({ source: "julio", key: "julio-1", permalink: JULIO, sellerType: "dealer", detail: { ...car().detail!, description: "Fiat Uno impecable" } });
    const dealers = new Map([["julio", dealer("julio", daysAgo(2))]] as const);
    expect(carContactFor(julio, options({ dealers }))).toMatchObject({
      origin: "dealer_site", sourceUrl: "https://julioautomoviles.com.uy/contacto/", observedAt: daysAgo(2),
      phones: [{ value: "+59891000111", mobile: true }],
    });
    expect(carContactFor(julio, options({ dealers: new Map([["julio", dealer("julio", daysAgo(30))]] as const) }))).toBeNull();
    expect(carContactFor({ ...julio, sellerType: "private" }, options({ dealers }))).toBeNull();
    // A portal has no dealer page even if a record somehow exists for it.
    const mlDealer = car({ detail: null, sellerType: "dealer" });
    expect(carContactFor(mlDealer, options({ dealers: new Map([["mercadolibre", dealer("julio", daysAgo(1))]] as const) }))).toBeNull();
  });

  it("gives a recognised Mercado Libre account its dealer's number, with the evidence", () => {
    const account = { sellerId: "535", source: "carper" as const, twins: 61, adverts: 120 };
    const carper = new Map([["carper", dealer("carper", daysAgo(1))]] as const);
    const ml = car({ sellerType: "dealer", sellerId: "535", detail: { ...car().detail!, description: "Impecable" } });
    expect(carContactFor(ml, options({ dealers: carper, accounts: new Map([["535", account]]) }))).toMatchObject({
      origin: "dealer_site", dealer: "carper", accountTwins: 61, sourceUrl: "https://usados.carper.com.uy/contacto/",
    });
    // Another account, or a private seller with the same id, gets nothing.
    expect(carContactFor({ ...ml, sellerId: "999" }, options({ dealers: carper, accounts: new Map([["535", account]]) }))).toBeNull();
    expect(carContactFor({ ...ml, sellerType: "private" }, options({ dealers: carper, accounts: new Map([["535", account]]) }))).toBeNull();
  });

  it("the advert's own number wins over the dealer's", () => {
    const julio = car({ source: "julio", key: "julio-1", permalink: JULIO, sellerType: "dealer" });
    const dealers = new Map([["julio", dealer("julio", daysAgo(2))]] as const);
    expect(carContactFor(julio, options({ dealers }))).toMatchObject({ origin: "advert_text", sourceUrl: JULIO });
  });

  it("honours opt-outs", () => {
    const optOuts = new Set([carContactHash("+59899123456")]);
    expect(carContactFor(car(), options({ optOuts }))).toBeNull();
    const two = car({ detail: { ...car().detail!, description: "cel 099 123 456 o 098 765 432" } });
    expect(carContactFor(two, options({ optOuts }))!.phones).toEqual([{ value: "+59898765432", mobile: true }]);
  });

  it("refuses a permalink that is not the source's own", () => {
    expect(carContactFor(car({ permalink: "https://evil.example/MLU-1" }), options())).toBeNull();
  });
});

describe("buildCarContacts", () => {
  it("keeps one record per advert with a number, sorted by key", () => {
    const records = buildCarContacts([car({ key: "ml-MLU2" }), car({ key: "ml-MLU3", detail: null }), car()], options());
    expect(records.map(record => record.key)).toEqual(["ml-MLU1", "ml-MLU2"]);
  });
});

describe("contactSummary", () => {
  it("counts by origin and source and never carries a number", () => {
    const summary = contactSummary(buildCarContacts([car(), car({ key: "ml-MLU2" })], options()));
    expect(summary).toEqual({ total: 2, byOrigin: { advert_text: 2 }, bySource: { mercadolibre: 2 } });
    expect(JSON.stringify(summary)).not.toMatch(/\d{6}/);
  });
});
