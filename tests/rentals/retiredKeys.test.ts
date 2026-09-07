import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, bulkWrite } = vi.hoisted(() => ({ find: vi.fn(), bulkWrite: vi.fn() }));
vi.mock("../../classes/models/RentalListing", () => ({ RentalListingModel: { find, bulkWrite } }));

import { buildRentalProperties, propertyKey, resolveKey } from "../../classes/rentals/dedupe";
import { detachedRentalKey, propertyFromRentalOffers } from "../../classes/rentals/reconcile";
import { dropReassignedOffers, planRentalPropertyUpdates, rentalHistoryFromRows, writeRentalPropertyPlan } from "../../classes/rentals/store";
import { isRetiredRentalKey, RENTAL_RETIRED_KEY_REGISTRY } from "../../classes/rentals/retiredKeys";
import type { RawRental } from "../../classes/rentals/types";

const retiredKey = "montevideo-cordon-avenida-18-de-julio-1fqazj0";
const listing = (overrides: Partial<RawRental> = {}): RawRental => ({
  source: "elpais", listingId: "elpais:6a9c5467f3081b26a1cbf146",
  title: "ALQUILER APARTAMENTO 5 DOMITORIOS CORDON", url: "https://inmuebles.elpais.com.uy/example",
  propertyType: "apartamento", department: "Montevideo", neighborhood: "Cordón",
  address: "Avenida 18 de Julio 2200 .", street: "avenida 18 de julio", streetNumber: "2200",
  bedrooms: null, bathrooms: 1, area: 135, price: 55000, currency: "UYU",
  latitude: null, longitude: null, parkingSpaces: null, furnished: null,
  commonExpenses: null, commonExpensesCurrency: null, sellerName: "Portal", sellerType: "desconocido",
  image: null, publishedAt: null, petsAllowed: null, guarantees: [], ...overrides,
});
const context = { usdUyu: 41.5, today: "2026-09-07", offerFirstSeen: new Map<string, string>(),
  propertyFirstSeen: new Map<string, string>(), offerToProperty: new Map<string, string>() };
const saveContext = { today: "2026-09-07", usdUyu: 0, okSources: new Set<RawRental["source"]>(), staleOfferDays: 4 };

beforeEach(() => { find.mockReset(); bulkWrite.mockReset(); });

describe("retired rental URLs", () => {
  it("keeps the reviewed withdrawal after the old property is absent from history", () => {
    expect(RENTAL_RETIRED_KEY_REGISTRY.version).toBe(1);
    expect(isRetiredRentalKey(retiredKey)).toBe(true);
    const futureAdvert = listing({ listingId: "elpais:new-independent-advert" });
    const candidate = { ...futureAdvert, priceUyu: 55000 };
    expect(propertyKey(candidate, [candidate])).toBe(retiredKey);
    const rows = buildRentalProperties([futureAdvert], context);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).not.toBe(retiredKey);
    expect(rows[0]!.offers[0]!.listingId).toBe(futureAdvert.listingId);
  });

  it("refuses inheritance and computed reuse even when a caller supplies no reservations", () => {
    const raw = listing();
    const candidate = { ...raw, priceUyu: 55000 };
    const history = { ...context, offerToProperty: new Map([[raw.listingId, retiredKey]]),
      propertyCanonicalOffer: new Map([[retiredKey, raw.listingId]]) };
    expect(resolveKey(candidate, [candidate], history, new Set(), new Set())).not.toBe(retiredKey);
    expect(buildRentalProperties([raw], history)[0]!.key).not.toBe(retiredKey);
  });

  it("retains both detached URLs and original first observations on subsequent actual readings", () => {
    const raw = [listing(), listing({ source: "mercadolibre", listingId: "mercadolibre:MLU1497719400",
      title: "Alquiler Apartamento 5 Domitorios Cordon", bedrooms: 5 })];
    const firstDates = new Map([[raw[0]!.listingId, "2026-08-29"], [raw[1]!.listingId, "2026-09-01"]]);
    const observed = buildRentalProperties(raw, { ...context, offerFirstSeen: firstDates });
    const repaired = observed.map(row => propertyFromRentalOffers(detachedRentalKey(row.offers[0]!), row.offers, 0, row));
    expect(repaired).toHaveLength(2);
    const next = buildRentalProperties(raw, { ...context, ...rentalHistoryFromRows(repaired) });
    expect(next.map(row => row.key).sort()).toEqual(repaired.map(row => row.key).sort());
    for (const row of next) {
      expect(row.offers).toHaveLength(1);
      expect(row.firstSeen).toBe(firstDates.get(row.offers[0]!.listingId));
      expect(row.offers[0]!.firstSeen).toBe(row.firstSeen);
      expect(row.offers[0]!.lastSeen).toBe("2026-09-07");
    }
  });

  it("rejects a retired destination before planning any database reads", async () => {
    const row = buildRentalProperties([listing()], context)[0]!;
    await expect(planRentalPropertyUpdates([{ ...row, key: retiredKey }], saveContext)).rejects.toThrow("retired URL");
    expect(find).not.toHaveBeenCalled();
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("rejects a retired destination in a later chunk before writing the first chunk", async () => {
    const row = buildRentalProperties([listing()], context)[0]!;
    const assigned = Array.from({ length: 400 }, (_, index) => ({ ...row, key: `allowed-${index}` }));
    assigned.push({ ...row, key: retiredKey });
    await expect(writeRentalPropertyPlan({ assigned, emptied: 0, separated: 0 })).rejects.toThrow("retired URL");
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("still permits removing the old empty owner after its adverts have safe destinations", async () => {
    const row = buildRentalProperties([listing()], context)[0]!;
    const original = { ...row, key: retiredKey };
    find.mockReturnValue({ lean: () => ({ cursor: async function* () { yield original; } }) });
    bulkWrite.mockResolvedValue({});
    const result = await dropReassignedOffers([row]);
    expect(result).toEqual({ cleaned: 1, removed: 1, deleted: 1 });
    expect(bulkWrite).toHaveBeenCalledWith([{ deleteOne: { filter: { key: retiredKey } } }], { ordered: false });
  });
});
