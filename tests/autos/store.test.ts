import { describe, expect, it, vi } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;
const collections = vi.hoisted(() => new Map<string, unknown>());
function fakeCollection(docs: Doc[] = []) {
  const writes: Doc[] = [];
  return {
    writes,
    createIndex: vi.fn(async () => "ok"),
    find: vi.fn((filter: Doc) => ({
      toArray: async () => docs.filter(doc => {
        if (filter.key?.$in) return filter.key.$in.includes(doc.key);
        if (filter.key?.$nin?.includes(doc.key)) return false;
        if (filter["listing.brandId"]?.$in && !filter["listing.brandId"].$in.includes(doc.listing.brandId)) return false;
        if (filter.lastSeen?.$lt && !(String(doc.lastSeen) < filter.lastSeen.$lt)) return false;
        if (filter.lastSeen?.$gte && !(String(doc.lastSeen) >= filter.lastSeen.$gte)) return false;
        if ("retiredAt" in filter && doc.retiredAt) return false;
        return true;
      }),
    })),
    bulkWrite: vi.fn(async (operations: Doc[]) => {
      writes.push(...operations);
      return { upsertedCount: operations.length, modifiedCount: 0 };
    }),
  };
}
vi.mock("../../classes/appdb", () => ({
  appConnection: () => ({ collection: (name: string) => collections.get(name) }),
  appModel: (_name: string, schema: unknown, collection: string) => ({
    schema, collection: { name: collection }, updateOne: vi.fn(async () => ({ acknowledged: true })),
  }),
}));

import {
  collapseRefusal, harvestMetaRecord, mergeVocabularies, nextPriceHistory, publishCarCatalog, publishCarMarkets,
  saveCarHarvest, saveRefusal, sweepUpdate,
} from "../../classes/autos/store";
import { CarHarvestMetaModel } from "../../classes/models/CarHarvestMeta";
import type { CarHarvestResult, RawCarListing } from "../../classes/autos/types";
import type { PublicCarCatalogMeta, PublicCarListing, PublicCarMarketSnapshot } from "../../classes/autos/publicTypes";

const raw = (id: string, price = 10_000): RawCarListing => ({
  id, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "1", model: "Onix", title: "Onix", year: 2019,
  km: 90_000, price, currency: "USD", transmission: "manual", fuel: "nafta", neighborhood: null, department: null,
  sellerType: null, sellerId: null, picture: null, pictureCount: null, permalink: `https://auto.mercadolibre.com.uy/MLU-${id}`,
  observedAt: "2026-09-16T10:00:00.000Z",
});

const harvest = (listings: RawCarListing[], overrides: Partial<CarHarvestResult> = {}): CarHarvestResult => ({
  mode: "full", startedAt: "2026-09-16T09:00:00.000Z", finishedAt: "2026-09-16T10:30:00.000Z", listings, vocabularies: [],
  requests: 10, pages: 10, failedPages: 0, rejectedCards: 0, completeBrands: ["58955"], gaps: [], reportedTotal: listings.length,
  note: null, ...overrides,
});

describe("pure store rules", () => {
  it("appends a price point only when price or currency changed, keeping 20", () => {
    const history = [{ price: 10_000, currency: "USD" as const, observedAt: "2026-09-01T00:00:00.000Z" }];
    expect(nextPriceHistory(history, raw("MLU1", 10_000))).toEqual(history);
    expect(nextPriceHistory(history, raw("MLU1", 9_500))).toHaveLength(2);
    const long = Array.from({ length: 20 }, (_, i) => ({ price: i, currency: "USD" as const, observedAt: String(i) }));
    expect(nextPriceHistory(long, raw("MLU1", 99))).toHaveLength(20);
  });
  it("retires only after two complete sweeps without the advert", () => {
    expect(sweepUpdate({ missedFullSweeps: 0, retiredAt: null }, "T")).toEqual({ missedFullSweeps: 1, retiredAt: null });
    expect(sweepUpdate({ missedFullSweeps: 1, retiredAt: null }, "T")).toEqual({ missedFullSweeps: 2, retiredAt: "T" });
  });
  it("refuses a collapse of more than 60 %", () => {
    expect(collapseRefusal(17_000, 6_000, "catálogo")).toMatch(/caída/);
    expect(collapseRefusal(17_000, 7_000, "catálogo")).toBeNull();
    expect(collapseRefusal(50, 1, "catálogo")).toBeNull();
    expect(collapseRefusal(null, 0, "catálogo")).toBeNull();
  });
  it("merges version vocabularies without losing earlier names", () => {
    expect(mergeVocabularies(
      [{ brandId: "1", modelId: "2", trims: ["Lt"] }],
      [{ brandId: "1", modelId: "2", trims: ["Ltz", "Lt"] }, { brandId: "1", modelId: "3", trims: ["Joy"] }],
    )).toEqual([{ brandId: "1", modelId: "2", trims: ["Lt", "Ltz"] }, { brandId: "1", modelId: "3", trims: ["Joy"] }]);
  });
  it("tracks since when a source is failing", () => {
    const failing = harvestMetaRecord(harvest([], { failedPages: 3, note: "3 páginas sin respuesta válida" }), { lastOkAt: "2026-09-15T10:00:00.000Z", failingSince: null });
    expect(failing).toMatchObject({ ok: false, lastOkAt: "2026-09-15T10:00:00.000Z", failingSince: "2026-09-16T10:30:00.000Z" });
    const ok = harvestMetaRecord(harvest([raw("MLU1")]), { lastOkAt: null, failingSince: "2026-09-15T10:00:00.000Z" });
    expect(ok).toMatchObject({ ok: true, lastOkAt: "2026-09-16T10:30:00.000Z", failingSince: null, listings: 1 });
  });
  it("a fast run with zero adverts is still ok (an early since=today sweep can legitimately be empty)", () => {
    const record = harvestMetaRecord(harvest([], { mode: "fast" }), null);
    expect(record).toMatchObject({ ok: true, listings: 0 });
  });
  it("a full run with zero adverts is NOT ok (full mode still requires listings)", () => {
    const record = harvestMetaRecord(harvest([], { mode: "full" }), null);
    expect(record).toMatchObject({ ok: false, listings: 0 });
  });
});

describe("saveRefusal", () => {
  it("persists a refusal and can clear it with null", async () => {
    await saveRefusal("catálogo: caída de más de 60 %", "2026-09-16T10:30:00.000Z");
    expect(CarHarvestMetaModel.updateOne).toHaveBeenLastCalledWith(
      { key: "uy-cars" },
      { $set: { "data.publishRefusal": { reason: "catálogo: caída de más de 60 %", at: "2026-09-16T10:30:00.000Z" } } },
      { upsert: true },
    );
    await saveRefusal(null, "2026-09-16T11:00:00.000Z");
    expect(CarHarvestMetaModel.updateOne).toHaveBeenLastCalledWith(
      { key: "uy-cars" },
      { $set: { "data.publishRefusal": { reason: null, at: "2026-09-16T11:00:00.000Z" } } },
      { upsert: true },
    );
  });
});

describe("publish guards refuse to wipe the public collection", () => {
  const meta: PublicCarCatalogMeta = {
    key: "uy-cars", generatedAt: "2026-09-16T10:30:00.000Z", freshDays: 4, sourceCoverage: "partial", listings: 0,
    usdUyu: 40, lastFullReadAt: null, lastReadAt: null, reportedTotal: null, opportunities: 0, models: [],
  };
  it("publishCarCatalog throws instead of publishing an empty array", async () => {
    collections.set("carcatalog", fakeCollection());
    await expect(publishCarCatalog([] as PublicCarListing[], meta)).rejects.toThrow(/empty/);
  });
  it("publishCarMarkets throws instead of publishing an empty array", async () => {
    collections.set("carmarketsnapshots", fakeCollection());
    await expect(publishCarMarkets([] as PublicCarMarketSnapshot[])).rejects.toThrow(/empty/);
  });
});

describe("saveCarHarvest", () => {
  it("upserts seen adverts and counts a miss only for complete brands", async () => {
    const listings = fakeCollection([
      { key: "ml-MLU1", priceHistory: [{ price: 11_000, currency: "USD", observedAt: "2026-09-10T00:00:00.000Z" }], listing: raw("MLU1"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 0 },
      { key: "ml-MLU9", priceHistory: [], listing: raw("MLU9"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 },
      { key: "ml-MLU8", priceHistory: [], listing: { ...raw("MLU8"), brandId: "other" }, lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 },
    ]);
    collections.set("carlistings", listings);
    const result = await saveCarHarvest(harvest([raw("MLU1", 10_000)]));
    expect(result.retired).toBe(1);
    const upsert = listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU1" && op.updateOne.upsert)!;
    expect(upsert.updateOne.update.$set.priceHistory).toHaveLength(2);
    const retire = listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU9")!;
    expect(retire.updateOne.update.$set).toEqual({ missedFullSweeps: 2, retiredAt: "2026-09-16T10:30:00.000Z" });
    expect(listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU8")).toBeUndefined();
  });
  it("never counts misses in fast mode", async () => {
    const listings = fakeCollection([{ key: "ml-MLU9", priceHistory: [], listing: raw("MLU9"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 }]);
    collections.set("carlistings", listings);
    const result = await saveCarHarvest(harvest([raw("MLU1")], { mode: "fast" }));
    expect(result.retired).toBe(0);
    expect(listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU9")).toBeUndefined();
  });
  it("never scans past a 21-day lower bound for misses", async () => {
    const listings = fakeCollection([
      { key: "ml-MLU9", priceHistory: [], listing: raw("MLU9"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 },
      { key: "ml-MLU7", priceHistory: [], listing: raw("MLU7"), lastSeen: "2026-08-01T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 },
    ]);
    collections.set("carlistings", listings);
    const result = await saveCarHarvest(harvest([raw("MLU1")]));
    expect(result.retired).toBe(1);
    expect(listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU9")).toBeDefined();
    expect(listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU7")).toBeUndefined();
  });
});
