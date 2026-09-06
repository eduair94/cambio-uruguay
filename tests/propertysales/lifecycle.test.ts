import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ collections: new Map<string, any>() }));
vi.mock("../../classes/appdb", () => ({
  appModel: (_name: string, _schema: unknown, name: string) => ({ collection: { name } }),
  appConnection: () => ({ collection: (name: string) => state.collections.get(name) }),
}));
import { loadSaleCatalogInputs, saveSaleHarvest } from "../../classes/propertyopportunities/store";
import { publishSaleCatalog } from "../../classes/propertysales/store";

const NOW = "2026-09-06T12:00:00.000Z";
const listing = { id: "sale:infocasas:123", operation: "sale", source: "infocasas", listingId: "infocasas:123",
  url: "https://www.infocasas.com.uy/apartamento/123", title: "Apartamento luminoso", description: "", image: null, sellerName: "Agencia Uno",
  department: "Montevideo", locality: "Montevideo", neighborhood: "Cordón", propertyType: "apartamento", bedrooms: 1, bathrooms: 1,
  area: { value: 40, basis: "built" }, price: { amount: 120000, currency: "USD" }, expenses: null, lastSeen: NOW, publishedAt: null,
  parkingSpaces: null, furnished: null,
} as any;

beforeEach(() => {
  state.collections.clear();
  for (const name of ["propertysalelistings", "propertysalemetas", "propertysalecatalog", "propertysalecatalogmetas"]) state.collections.set(name, {
    createIndex: vi.fn().mockResolvedValue(undefined), findOne: vi.fn().mockResolvedValue(null),
    bulkWrite: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}), deleteMany: vi.fn().mockResolvedValue({}), replaceOne: vi.fn().mockResolvedValue({}),
    find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([{ listing, firstSeen: null }]) })),
  });
});

describe("sales projection and positive withdrawal lifecycle", () => {
  it("reactivates only observed active IDs, marks explicit retirements and never deletes private history", async () => {
    const harvest = { operation: "sale", source: "infocasas", ok: true, complete: false, listings: [listing], unavailableIds: ["sale:infocasas:124"], readAt: NOW,
      coverage: { pagesRequested: 2, failedPages: 0 }, note: "Partial capture" } as any;
    await saveSaleHarvest(harvest, NOW);
    const privateRows = state.collections.get("propertysalelistings");
    const write = privateRows.bulkWrite.mock.calls[0][0][0].updateOne;
    expect(write).toMatchObject({ filter: { id: listing.id }, update: { $unset: { retiredAt: "" }, $setOnInsert: { firstSeen: NOW }, $set: { lastSeen: NOW } } });
    expect(privateRows.updateMany).toHaveBeenCalledExactlyOnceWith({ id: { $in: ["sale:infocasas:124"] } }, { $set: { retiredAt: NOW } });
    expect(privateRows.deleteMany).not.toHaveBeenCalled();
  });
  it("omits known retired IDs when rebuilding, retaining an unknown legacy firstSeen", async () => {
    const result = await loadSaleCatalogInputs();
    expect(state.collections.get("propertysalelistings").find).toHaveBeenCalledWith({ retiredAt: { $exists: false } }, expect.anything());
    expect(result).toEqual([{ listing, firstSeen: null }]);
  });
  it("does not delete public rows or replace metadata after a partial write failure", async () => {
    const publicRows = state.collections.get("propertysalecatalog"), meta = state.collections.get("propertysalecatalogmetas");
    publicRows.bulkWrite.mockRejectedValueOnce(new Error("storage failed"));
    await expect(publishSaleCatalog([{ listing }], NOW, 41.5)).rejects.toThrow("storage failed");
    expect(publicRows.deleteMany).not.toHaveBeenCalled(); expect(meta.replaceOne).not.toHaveBeenCalled();
  });
  it("replaces public rows with a projection and only then removes expired or invalid projections", async () => {
    await publishSaleCatalog([{ listing: { ...listing, identity: { secret: true }, address: "Hidden street", phone: "private" } }], NOW, 41.5);
    const publicRows = state.collections.get("propertysalecatalog");
    const replacement = publicRows.bulkWrite.mock.calls[0][0][0].replaceOne.replacement;
    expect(replacement.key).toBe("infocasas-123");
    expect(replacement).not.toHaveProperty("identity"); expect(replacement).not.toHaveProperty("address"); expect(replacement).not.toHaveProperty("phone");
    expect(publicRows.deleteMany).toHaveBeenCalledExactlyOnceWith({ key: { $nin: ["infocasas-123"] } });
    expect(publicRows.deleteMany.mock.invocationCallOrder[0]).toBeGreaterThan(publicRows.bulkWrite.mock.invocationCallOrder[0]);
  });
});
