import { describe, expect, it } from "vitest";
import { DEALER_ACCOUNT_POLICY, inferDealerAccounts } from "../../classes/autos/contacts/accounts";
import type { CarListing, CarSource } from "../../classes/autos/types";

let serial = 0;
function car(source: CarSource, overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  return {
    id: `${serial}`, source, brandId: "1", brand: "Fiat", modelId: `${serial}`, model: "Uno", title: "Fiat Uno", year: 2015,
    km: 80_000, price: 8_000, currency: "USD", transmission: null, fuel: null, neighborhood: null, department: null,
    sellerType: "dealer", sellerId: source === "mercadolibre" ? "111" : `${source}:${source}`, picture: null, pictureCount: null,
    permalink: "", observedAt: "2026-09-21T00:00:00.000Z", key: `${source}-${serial}`, brandSlug: "fiat", modelSlug: "uno",
    marketSlug: "fiat-uno", engine: null, trim: null, trimLabel: null, kmQuality: "ok", flags: [], priceUsd: 8_000,
    priceConverted: false, firstSeen: "2026-09-21T00:00:00.000Z", lastSeen: "2026-09-21T00:00:00.000Z", priceDrop: null,
    sourceName: source, reference: null, detail: null,
    ...overrides,
  };
}

/** `count` cars that the dealer's website and the ML account both publish. */
function twins(source: CarSource, sellerId: string, count: number): CarListing[] {
  const rows: CarListing[] = [];
  for (let index = 0; index < count; index++) {
    const web = car(source);
    rows.push(web, car("mercadolibre", { brandId: web.brandId, modelId: web.modelId, year: web.year, km: web.km, priceUsd: web.priceUsd, sellerId }));
  }
  return rows;
}

describe("inferDealerAccounts", () => {
  it("recognises a Mercado Libre account by the cars it shares with a dealer's own website", () => {
    const accounts = inferDealerAccounts([...twins("carper", "111", 12), car("mercadolibre", { sellerId: "111" })]);
    expect(accounts.get("111")).toEqual({ sellerId: "111", source: "carper", twins: 12, adverts: 13 });
  });

  it("needs enough twins, and enough of the account's own stock", () => {
    expect(DEALER_ACCOUNT_POLICY).toEqual({ minTwins: 10, minShare: 0.3 });
    expect(inferDealerAccounts(twins("carper", "111", 9)).size).toBe(0);
    const diluted = [...twins("carper", "111", 10), ...Array.from({ length: 30 }, () => car("mercadolibre", { sellerId: "111" }))];
    expect(inferDealerAccounts(diluted).size).toBe(0);
  });

  it("never maps a private seller, and never an account split between two dealers", () => {
    const privateTwins = twins("carper", "222", 12).map(row => (row.source === "mercadolibre" ? { ...row, sellerType: "private" as const } : row));
    expect(inferDealerAccounts(privateTwins).size).toBe(0);
    expect(inferDealerAccounts([...twins("carper", "333", 12), ...twins("fidocar", "333", 11)]).size).toBe(0);
  });

  it("maps several accounts of the same dealer", () => {
    const accounts = inferDealerAccounts([...twins("shoppingdeautos", "1", 10), ...twins("shoppingdeautos", "2", 15)]);
    expect([...accounts.values()].map(account => `${account.sellerId}:${account.source}`).sort()).toEqual(["1:shoppingdeautos", "2:shoppingdeautos"]);
  });

  it("only dealer websites with a contact page can own an account", () => {
    const clasiautos = twins("clasiautos", "444", 12);
    expect(inferDealerAccounts(clasiautos).size).toBe(0);
  });
});
