import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../classes/appdb", () => ({
  appConnection: vi.fn(() => {
    throw new Error("Database access forbidden in pure guard tests");
  }),
}));
import {
  zoneMarketProblem,
  withZoneRefreshLease,
  type PropertyZoneMarketSnapshot,
} from "../../classes/propertyzones/store";
import { appConnection } from "../../classes/appdb";

beforeEach(() => {
  vi.mocked(appConnection)
    .mockReset()
    .mockImplementation(() => {
      throw new Error("Database access forbidden in pure guard tests");
    });
});

const stamp = "2026-09-08T12:00:00.000Z";
const snapshot = (
  patch: Partial<PropertyZoneMarketSnapshot> = {},
): PropertyZoneMarketSnapshot => ({
  version: 1,
  generatedAt: stamp,
  rentalDataAsOf: "2026-09-08T10:00:00.000Z",
  usdUyu: 40,
  sampleMinimum: 8,
  observations: 1000,
  scannedRows: 1200,
  buckets: Array.from({ length: 10 }, (_, i) => ({
    department: "Montevideo",
    neighborhood: `Barrio ${i}`,
    propertyType: "apartamento",
    bedrooms: "any",
    prices: {
      rent: { count: 100, mean: 20000, median: 20000, p25: 18000, p75: 22000 },
      commonExpenses: {
        count: 100,
        mean: 2000,
        median: 2000,
        p25: 1500,
        p75: 2500,
      },
      monthlyTotal: {
        count: 100,
        mean: 22000,
        median: 22000,
        p25: 21000,
        p75: 24000,
      },
      builtSquareMeter: {
        count: 100,
        mean: 400,
        median: 400,
        p25: 350,
        p75: 450,
      },
      sources: 2,
      lastSeenFrom: "2026-09-07T12:00:00.000Z",
      lastSeenTo: "2026-09-08T10:00:00.000Z",
    },
  })),
  ...patch,
});

describe("pure zone market publication guards", () => {
  it("accepts a complete bounded first capture without opening a database connection", () => {
    expect(zoneMarketProblem(snapshot(), null)).toBeNull();
    expect(appConnection).not.toHaveBeenCalled();
  });

  it.each([
    { version: 0 },
    { generatedAt: "invalid" },
    { rentalDataAsOf: "invalid" },
    { usdUyu: NaN },
    { usdUyu: Infinity },
    { usdUyu: 9.99 },
    { usdUyu: 100.01 },
    { observations: NaN },
    { observations: Infinity },
    { observations: 1000.5 },
    { observations: -1 },
    { observations: 199 },
    { scannedRows: NaN },
    { scannedRows: Infinity },
    { scannedRows: 1200.5 },
    { scannedRows: 199 },
    { scannedRows: 100001 },
    { observations: 1201, scannedRows: 1200 },
    { sampleMinimum: 7 },
    { buckets: [] },
    { buckets: null },
  ])("rejects invalid values or an incomplete capture: %j", (patch) => {
    expect(zoneMarketProblem(snapshot(patch as any), null)).toBe(
      "Invalid or incomplete market capture",
    );
  });

  it("bounds bucket count independently from the number of observations", () => {
    expect(
      zoneMarketProblem(
        snapshot({ buckets: snapshot().buckets.slice(0, 9) }),
        null,
      ),
    ).not.toBeNull();
    expect(
      zoneMarketProblem(
        snapshot({
          buckets: Array.from({ length: 20001 }, () => snapshot().buckets[0]),
        }),
        null,
      ),
    ).not.toBeNull();
  });

  it("refuses an older generation while allowing deterministic publication of the same generation", () => {
    const previous = snapshot();
    expect(
      zoneMarketProblem(
        snapshot({ generatedAt: "2026-09-08T11:59:59.999Z" }),
        previous,
      ),
    ).toBe("Newer market capture already published");
    expect(zoneMarketProblem(snapshot(), previous)).toBeNull();
    expect(
      zoneMarketProblem(
        snapshot({ generatedAt: "2026-09-09T12:00:00.000Z" }),
        previous,
      ),
    ).toBeNull();
  });

  it("refuses a collapse below forty percent of a substantial previous capture", () => {
    expect(zoneMarketProblem(snapshot({ observations: 399 }), snapshot())).toBe(
      "Market coverage collapsed",
    );
    expect(
      zoneMarketProblem(snapshot({ observations: 400 }), snapshot()),
    ).toBeNull();
    expect(
      zoneMarketProblem(
        snapshot({ observations: 200 }),
        snapshot({ observations: 499 }),
      ),
    ).toBeNull();
    expect(
      zoneMarketProblem(
        snapshot({ observations: 199 }),
        snapshot({ observations: 499 }),
      ),
    ).toBe("Invalid or incomplete market capture");
  });
});

describe("single-owner zone refresh lease", () => {
  const fakeLease = () => {
    const collection = {
      findOneAndUpdate: vi.fn(
        async (_filter: unknown, update: any, _options: unknown) => ({
          value: { owner: update.$set.owner },
        }),
      ),
      deleteOne: vi.fn(async () => undefined),
    };
    const connection = {
      asPromise: vi.fn(async () => undefined),
      collection: vi.fn(() => collection),
    };
    vi.mocked(appConnection).mockReturnValue(connection as any);
    return { collection, connection };
  };

  it("returns the work result and releases only its own lease", async () => {
    const { collection } = fakeLease();
    const run = vi.fn(async () => "complete");
    expect(await withZoneRefreshLease(run)).toBe("complete");
    const [filter, update, options] = collection.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({
      _id: "refresh-lock",
      expiresAt: { $lte: expect.any(Date) },
    });
    expect(
      (update as any).$set.expiresAt.getTime() -
        (filter as any).expiresAt.$lte.getTime(),
    ).toBe(30 * 60000);
    expect(options).toEqual({ upsert: true, returnDocument: "after" });
    expect(collection.deleteOne).toHaveBeenCalledWith({
      _id: "refresh-lock",
      owner: (update as any).$set.owner,
    });
    expect(run).toHaveBeenCalledOnce();
  });

  it("releases its lease after the job fails without discarding the job error", async () => {
    const { collection } = fakeLease();
    const error = new Error("fixture failure");
    await expect(
      withZoneRefreshLease(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(collection.deleteOne).toHaveBeenCalledOnce();
  });

  it("does not run or delete another worker lease when the lock is occupied", async () => {
    const { collection } = fakeLease();
    collection.findOneAndUpdate.mockRejectedValue(
      Object.assign(new Error("fixture conflict"), { code: 11000 }),
    );
    const run = vi.fn();
    await expect(withZoneRefreshLease(run)).rejects.toThrow(
      "Property zone refresh already running",
    );
    expect(run).not.toHaveBeenCalled();
    expect(collection.deleteOne).not.toHaveBeenCalled();
  });

  it("requires its returned ownership token before running", async () => {
    const { collection } = fakeLease();
    collection.findOneAndUpdate.mockResolvedValue({
      value: { owner: "another-worker" },
    });
    const run = vi.fn();
    await expect(withZoneRefreshLease(run)).rejects.toThrow(
      "Property zone refresh lease unavailable",
    );
    expect(run).not.toHaveBeenCalled();
    expect(collection.deleteOne).not.toHaveBeenCalled();
  });
});
