import { beforeEach, describe, expect, it, vi } from "vitest";

const find = vi.fn();
const bulkWrite = vi.fn();
vi.mock("../../classes/models/RentalListing", () => ({
  RentalListingModel: {
    find: (...args: unknown[]) => find(...args),
    bulkWrite: (...args: unknown[]) => bulkWrite(...args),
  },
}));

import { detachedRentalKey } from "../../classes/rentals/reconcile";
import { dropReassignedOffers, saveRentalProperties } from "../../classes/rentals/store";
import type {
  RentalOffer,
  RentalOfferIdentity,
  RentalProperty,
  RentalSource,
} from "../../classes/rentals/types";

const identity: RentalOfferIdentity = {
  version: 1,
  propertyType: "apartamento",
  department: "Montevideo",
  neighborhood: "Pocitos",
  address: "Rizal 3715 apartamento 301",
  street: "rizal",
  streetNumber: "3715",
  latitude: -34.9,
  longitude: -56.15,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
};
const offer = (listingId: string, overrides: Partial<RentalOffer> = {}): RentalOffer => ({
  identity: { ...identity },
  parkingSpaces: null,
  furnished: null,
  source: listingId.split(":")[0] as RentalSource,
  listingId,
  url: `https://example.com/${listingId}`,
  title: "Apartamento 2 dormitorios unidad 301",
  price: 30_000,
  currency: "UYU",
  priceUyu: 30_000,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: "x",
  sellerType: "desconocido",
  image: null,
  publishedAt: "2026-07-29",
  petsAllowed: null,
  guarantees: [],
  firstSeen: "2026-08-01",
  lastSeen: "2026-09-03",
  ...overrides,
});
const property = (
  key: string,
  offers: RentalOffer[],
  overrides: Partial<RentalProperty> = {},
): RentalProperty => ({
  key,
  title: offers[0]?.title || "Apartamento",
  propertyType: "apartamento",
  department: "Montevideo",
  neighborhood: "Pocitos",
  address: identity.address,
  addressKey: "addr|montevideo|rizal|3715",
  latitude: identity.latitude,
  longitude: identity.longitude,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  parkingSpaces: null,
  furnished: null,
  petsAllowed: null,
  guarantees: [],
  price: offers[0]?.price || 30_000,
  currency: "UYU",
  priceUyu: offers[0]?.priceUyu || 30_000,
  sources: [...new Set(offers.map((item) => item.source))],
  offers,
  firstSeen: "2026-08-01",
  lastSeen: "2026-09-03",
  freshAt: "2026-09-03",
  ...overrides,
});
const context = {
  today: "2026-09-03",
  usdUyu: 40,
  okSources: new Set<RentalSource>(["infocasas"]),
  staleOfferDays: 4,
};
type WriteOperation =
  | { updateOne: { filter: { key: string }; update: { $set: RentalProperty }; upsert?: boolean } }
  | { deleteOne: { filter: { key: string } } };

// Model both planning queries and later runs without connecting to Mongo.
let database: Map<string, RentalProperty>;
const seed = (...rows: RentalProperty[]) => {
  database = new Map(rows.map((row) => [row.key, structuredClone(row)]));
};
const written = () =>
  bulkWrite.mock.calls
    .flatMap((call) => call[0] as WriteOperation[])
    .flatMap((op) => ("updateOne" in op ? [op.updateOne.update.$set] : []));
const allIds = (rows: RentalProperty[]) =>
  rows.flatMap((row) => row.offers.map((item) => item.listingId)).sort();

beforeEach(() => {
  find.mockReset();
  bulkWrite.mockReset();
  seed();
  find.mockImplementation((query: { key?: { $in: string[] } }) => ({
    select: () => ({
      lean: async () =>
        [...database.values()]
          .filter((row) => query.key?.$in.includes(row.key))
          .map((row) => structuredClone(row)),
    }),
    lean: () => ({
      cursor: () =>
        (async function* () {
          for (const row of [...database.values()]) yield structuredClone(row);
        })(),
    }),
  }));
  bulkWrite.mockImplementation(async (operations: WriteOperation[]) => {
    for (const op of operations) {
      if ("updateOne" in op) database.set(op.updateOne.filter.key, structuredClone(op.updateOne.update.$set));
      else database.delete(op.deleteOne.filter.key);
    }
    return {};
  });
});

describe("saveRentalProperties plans lossless separation", () => {
  it("removes an advert from the old row when the incoming run assigns it elsewhere", async () => {
    const a = offer("infocasas:a");
    const b = offer("infocasas:b");
    seed(property("old", [a, b]));
    const result = await saveRentalProperties([property("old", [a]), property("new", [b])], context);
    expect(result).toMatchObject({ written: 2, emptied: 0, separated: 0 });
    expect(result.assigned).toEqual(written());
    expect(database.get("old")!.offers.map((item) => item.listingId)).toEqual([a.listingId]);
    expect(database.get("new")!.offers.map((item) => item.listingId)).toEqual([b.listingId]);
    expect(allIds([...database.values()])).toEqual([a.listingId, b.listingId]);
  });

  it("keeps a compatible unseen advert together during a partial read", async () => {
    const fresh = offer("infocasas:fresh");
    const unseen = offer("mercadolibre:unseen", { lastSeen: "2026-08-02" });
    seed(property("old", [fresh, unseen]));
    const result = await saveRentalProperties([property("old", [fresh])], context);
    expect(result).toMatchObject({ written: 1, separated: 0, emptied: 0 });
    expect(allIds(result.assigned)).toEqual([fresh.listingId, unseen.listingId]);
    expect(database.get("old")!.offers.find((item) => item.listingId === unseen.listingId)).toEqual(unseen);
  });

  it("preserves divergent prices in separate rows instead of losing the cheaper advert", async () => {
    const old = offer("infocasas:old", {
      price: 21_000,
      priceUyu: 21_000,
      firstSeen: "2026-06-01",
      lastSeen: "2026-09-01",
      publishedAt: "2026-05-30",
    });
    const fresh = offer("infocasas:fresh", { price: 41_000, priceUyu: 41_000 });
    seed(property("old", [old]));
    const result = await saveRentalProperties([property("old", [fresh])], context);
    expect(result).toMatchObject({ written: 2, separated: 1, emptied: 0 });
    expect(allIds(result.assigned)).toEqual([fresh.listingId, old.listingId]);
    expect(database.get(detachedRentalKey(old))!.offers).toEqual([old]);
    expect(database.get("old")!.offers).toEqual([fresh]);
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("detaches legacy evidence without inheriting another home's canonical attributes", async () => {
    const fresh = offer("infocasas:fresh");
    const legacy = offer("facebook:legacy", {
      identity: undefined,
      title: "Casa 3 dormitorios 2 baños",
      firstSeen: "2026-03-01",
      lastSeen: "2026-07-15",
      publishedAt: "2026-02-27",
    });
    seed(property("old", [fresh, legacy]));
    const result = await saveRentalProperties([property("old", [fresh])], context);
    const detached = result.assigned.find((row) => row.key === detachedRentalKey(legacy))!;
    expect(result).toMatchObject({ written: 2, separated: 1, emptied: 0 });
    expect(detached).toMatchObject({
      title: legacy.title,
      propertyType: "casa",
      bedrooms: 3,
      bathrooms: 2,
      department: "",
      neighborhood: "",
      address: "",
      area: null,
      latitude: null,
      longitude: null,
      firstSeen: legacy.firstSeen,
      lastSeen: legacy.lastSeen,
    });
    expect(detached.offers).toEqual([legacy]);
    expect(detached.addressKey).not.toBe("addr|montevideo|rizal|3715");
    expect(allIds(result.assigned)).toEqual([legacy.listingId, fresh.listingId].sort());
  });

  it("does not reintroduce a historical duplicate whose persisted owner is elsewhere", async () => {
    const a = offer("infocasas:a");
    const b = offer("infocasas:b", { identity: undefined, title: "Casa 1 dormitorio" });
    const owner = detachedRentalKey(b);
    seed(property("old", [a, b]), property(owner, [b]));
    const result = await saveRentalProperties([property("old", [a])], {
      ...context,
      offerOwners: new Map([[b.listingId, owner]]),
    });
    expect(result).toMatchObject({ written: 1, separated: 0, emptied: 0 });
    expect(database.get("old")!.offers.map((item) => item.listingId)).toEqual([a.listingId]);
    expect(database.get(owner)!.offers).toEqual([b]);
    expect(allIds([...database.values()])).toEqual([a.listingId, b.listingId]);
  });

  it("keeps assignment and dates when a separated advert is seen again", async () => {
    const a = offer("infocasas:a");
    const b = offer("facebook:b", {
      identity: undefined,
      title: "Casa 1 dormitorio",
      lastSeen: "2026-08-25",
    });
    seed(property("old", [a, b]));
    const first = await saveRentalProperties([property("old", [a])], context);
    bulkWrite.mockClear();
    const second = await saveRentalProperties(first.assigned, context);
    expect(second).toMatchObject({ written: 2, separated: 0, emptied: 0 });
    expect(second.assigned).toEqual(first.assigned);
    expect(allIds([...database.values()])).toEqual([b.listingId, a.listingId].sort());
    expect(database.get(detachedRentalKey(b))!.offers[0]).toEqual(b);
  });

  it("expires only old adverts from the complete source while retaining an unavailable source", async () => {
    const fresh = offer("infocasas:fresh");
    const expired = offer("infocasas:expired", { lastSeen: "2026-08-01" });
    const down = offer("facebook:down", { identity: undefined, lastSeen: "2026-08-01" });
    seed(property("old", [fresh, expired, down]));
    const result = await saveRentalProperties([property("old", [fresh])], context);
    expect(allIds(result.assigned)).toEqual([down.listingId, fresh.listingId].sort());
    expect(result.separated).toBe(1);
    expect(database.get(detachedRentalKey(down))!.offers).toEqual([down]);
  });

  it("reports an emptied plan when its only offer expired instead of writing an empty property", async () => {
    seed(property("old", [offer("infocasas:expired", { lastSeen: "2026-08-01" })]));
    const result = await saveRentalProperties([property("old", [])], context);
    expect(result).toEqual({ written: 0, emptied: 1, separated: 0, assigned: [] });
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("rejects two incoming owners of one advert before querying or writing", async () => {
    const shared = offer("infocasas:shared");
    await expect(
      saveRentalProperties([property("a", [shared]), property("b", [shared])], context),
    ).rejects.toThrow("two owners");
    expect(find).not.toHaveBeenCalled();
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("rejects a detached key reserved by an incoming property without writing", async () => {
    const a = offer("infocasas:a");
    const legacy = offer("facebook:legacy", { identity: undefined });
    const other = offer("infocasas:other");
    seed(property("old", [a, legacy]));
    await expect(
      saveRentalProperties([property("old", [a]), property(detachedRentalKey(legacy), [other])], context),
    ).rejects.toThrow("collides with incoming property");
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("checks detached ownership after planning every batch and before any write", async () => {
    const a = offer("infocasas:last");
    const legacy = offer("facebook:legacy", { identity: undefined });
    const other = offer("infocasas:collision");
    seed(property("last", [a, legacy]), property(detachedRentalKey(legacy), [other]));
    const before = structuredClone([...database.values()]);
    const firstBatch = Array.from({ length: 400 }, (_, index) =>
      property(`safe-${index}`, [offer(`infocasas:safe-${index}`)]),
    );
    await expect(saveRentalProperties([...firstBatch, property("last", [a])], context)).rejects.toThrow(
      "detached key already belongs to another advert",
    );
    expect(find).toHaveBeenCalledTimes(3);
    expect(bulkWrite).not.toHaveBeenCalled();
    expect([...database.values()]).toEqual(before);
  });

  it("rejects inconsistent properties sharing an incoming key without writing", async () => {
    await expect(
      saveRentalProperties(
        [property("same-key", [offer("infocasas:a")]), property("same-key", [offer("infocasas:b")])],
        context,
      ),
    ).rejects.toThrow("inconsistent duplicate assignment");
    expect(bulkWrite).not.toHaveBeenCalled();
  });
});

describe("dropReassignedOffers", () => {
  it("cleans every old owner, preserves unseen adverts, and uses surviving identity", async () => {
    const a = offer("infocasas:a");
    const b = offer("infocasas:b", {
      title: "Casa 3 dormitorios en Salto",
      identity: {
        ...identity,
        propertyType: "casa",
        department: "Salto",
        neighborhood: "Centro",
        address: "Uruguay 500",
        street: "uruguay",
        streetNumber: "500",
        latitude: -31.4,
        longitude: -57.9,
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
      },
      firstSeen: "2026-05-10",
      lastSeen: "2026-08-28",
      publishedAt: "2026-05-01",
    });
    seed(property("old", [a, b]), property("duplicate", [a]), property("current", [a]));
    const result = await dropReassignedOffers([property("current", [a])]);
    expect(result).toEqual({ cleaned: 2, removed: 2, deleted: 1 });
    expect(database.has("duplicate")).toBe(false);
    expect(database.get("old")).toMatchObject({
      title: b.title,
      propertyType: "casa",
      department: "Salto",
      neighborhood: "Centro",
      address: "Uruguay 500",
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
      latitude: -31.4,
      longitude: -57.9,
      firstSeen: b.firstSeen,
      lastSeen: b.lastSeen,
    });
    expect(database.get("old")!.offers).toEqual([b]);
    expect(allIds([...database.values()])).toEqual([a.listingId, b.listingId]);
  });

  it("clears another home's canonical fields when unidentified legacy evidence survives", async () => {
    const a = offer("infocasas:a");
    const legacy = offer("facebook:legacy", { identity: undefined, title: "Casa 1 dormitorio" });
    seed(property("old", [a, legacy]));
    await dropReassignedOffers([property("current", [a])]);
    expect(database.get("old")).toMatchObject({
      title: legacy.title,
      propertyType: "casa",
      bedrooms: 1,
      department: "",
      neighborhood: "",
      address: "",
      bathrooms: null,
      area: null,
      latitude: null,
      longitude: null,
    });
    expect(database.get("old")!.offers).toEqual([legacy]);
  });

  it("does not read mongoose-managed fields into a rewritten document", async () => {
    await dropReassignedOffers([property("new", [offer("infocasas:1")])]);
    expect(find.mock.calls[0][1]).toEqual({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 });
  });

  it("does not touch a row containing only adverts the run did not see", async () => {
    seed(property("old", [offer("infocasas:unseen")]));
    const result = await dropReassignedOffers([property("new", [offer("infocasas:other")])]);
    expect(result).toEqual({ cleaned: 0, removed: 0, deleted: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });
});
