import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  connection: { asPromise: vi.fn(async () => undefined), collection: vi.fn() },
  readSnapshot: vi.fn(),
  publishMarket: vi.fn(),
  publishContext: vi.fn(),
  loadSources: vi.fn(),
  geometry: vi.fn(),
  project: vi.fn(),
  realProject: null as
    | null
    | typeof import("../../classes/propertyzones/project").projectZoneObservations,
}));
vi.mock("../../classes/appdb", () => ({
  appConnection: () => fake.connection,
}));
vi.mock("../../classes/propertyzones/store", async (original) => ({
  ...(await original<typeof import("../../classes/propertyzones/store")>()),
  readZoneSnapshot: fake.readSnapshot,
  publishZoneMarket: fake.publishMarket,
  publishZoneContext: fake.publishContext,
}));
vi.mock("../../classes/propertyzones/sources", () => ({
  loadOfficialPropertyZoneGeometry: fake.geometry,
  loadPropertyZoneSources: fake.loadSources,
}));
vi.mock("../../classes/propertyzones/project", async (original) => {
  const actual =
    await original<typeof import("../../classes/propertyzones/project")>();
  fake.realProject = actual.projectZoneObservations;
  return { ...actual, projectZoneObservations: fake.project };
});
import {
  captureZoneMarket,
  refreshPropertyZones,
} from "../../classes/propertyzones/refresh";

const stamp = "2026-09-08T12:00:00.000Z";
const generated = "2026-09-08T10:00:00.000Z";
const now = new Date(stamp);
const row = (i: number, extra: Record<string, unknown> = {}) => ({
  key: `property-${i}`,
  offers: [
    {
      source: "infocasas",
      listingId: String(i + 1),
      title: "Alquiler mensual apartamento",
      price: 20000,
      currency: "UYU",
      lastSeen: generated,
      commonExpenses: 1000,
      commonExpensesCurrency: "UYU",
      identity: {
        version: 1,
        propertyType: "apartamento",
        department: "Montevideo",
        neighborhood: `Barrio ${i % 10}`,
        bedrooms: 2,
        description: "Alquiler mensual. Gastos comunes $1000",
      },
      details: { builtArea: 50 },
    },
  ],
  ...extra,
});
const geometry = {
  zones: Array.from({ length: 62 }, (_, i) => ({
    id: `zone-${i + 1}`,
    officialCode: String(i + 1),
    name: `Barrio ${i}`,
    department: "Montevideo",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-56.2 + i * 0.001, -34.9],
          [-56.199 + i * 0.001, -34.9],
          [-56.199 + i * 0.001, -34.899],
          [-56.2 + i * 0.001, -34.899],
          [-56.2 + i * 0.001, -34.9],
        ],
      ],
    },
  })),
  source: {
    name: "Official fixture",
    url: "https://example.gub.uy",
    licenseUrl: "https://example.gub.uy",
    dataAsOf: "2011-01-01",
    fetchedAt: stamp,
    version: "geometry-v1",
  },
};
const previousCrime = {
  periodFrom: "2025-07-01",
  periodTo: "2026-06-30",
  includesAttempts: true,
  source: {
    dataAsOf: "2026-06-30",
    fetchedAt: "2026-09-01T12:00:00Z",
    version: "crime-old",
  },
};
const previousServices = {
  dataAsOf: "2026-09-01",
  fetchedAt: "2026-09-02T12:00:00Z",
  snapshotId: "old-services",
  countsByOfficialCode: {},
};
const previous = {
  version: 1,
  generatedAt: "2026-09-02T12:00:00Z",
  geometry,
  crime: previousCrime,
  services: previousServices,
};

let currentRows: Iterable<any>;
let rentalMeta: any;
let serviceMeta: any;
let cursorError: Error | null;
let rentalCursor: {
  [Symbol.asyncIterator]: () => AsyncGenerator<any>;
  close: ReturnType<typeof vi.fn>;
};
let rentalFind: ReturnType<typeof vi.fn>;
const servicePoints = Array.from({ length: 100 }, (_, i) => ({
  id: `node/${i + 1}`,
  category: "supermarket",
  pointKind: "node",
  location: { type: "Point", coordinates: [-56.1995, -34.8995] },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  currentRows = Array.from({ length: 220 }, (_, i) => row(i));
  rentalMeta = { generatedAt: generated, usdUyu: 40 };
  serviceMeta = {
    version: 1,
    snapshotId: "services-new",
    dataAsOf: "2026-09-07",
    fetchedAt: generated,
    sourceUrl: "https://example.gub.uy",
    total: 100,
  };
  cursorError = null;
  rentalCursor = {
    async *[Symbol.asyncIterator]() {
      yield* currentRows;
      if (cursorError) throw cursorError;
    },
    close: vi.fn(async () => undefined),
  };
  rentalFind = vi.fn(() => rentalCursor);
  fake.connection.collection.mockReset().mockImplementation((name: string) => {
    if (name === "rentalmetas")
      return { findOne: vi.fn(async () => rentalMeta) };
    if (name === "rentallistings") return { find: rentalFind };
    if (name === "propertyservicemetas")
      return { findOne: vi.fn(async () => serviceMeta) };
    if (name === "propertyservicepoints")
      return {
        find: vi.fn(() => ({ toArray: vi.fn(async () => servicePoints) })),
      };
    throw new Error("Unexpected collection in offline refresh tests");
  });
  fake.readSnapshot
    .mockReset()
    .mockImplementation(async (id) =>
      id === "context"
        ? previous
        : id === "source-cache"
          ? { geometry, crime: previousCrime }
          : null,
    );
  fake.publishMarket.mockReset().mockResolvedValue(undefined);
  fake.publishContext.mockReset().mockResolvedValue(undefined);
  fake.geometry.mockReset().mockReturnValue(geometry);
  fake.loadSources.mockReset().mockResolvedValue({
    geometry,
    crime: {
      ...previousCrime,
      source: { ...previousCrime.source, fetchedAt: stamp },
    },
  });
  fake.project.mockReset().mockImplementation(fake.realProject!);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("bounded full rental market capture", () => {
  it("reads every eligible row, preserves source dates and closes the cursor without publishing", async () => {
    const result = await captureZoneMarket(now);
    expect(result).toMatchObject({
      generatedAt: stamp,
      rentalDataAsOf: generated,
      observations: 220,
      scannedRows: 220,
      sampleMinimum: 8,
    });
    expect(result.buckets).toHaveLength(20);
    expect(rentalCursor.close).toHaveBeenCalledOnce();
    expect(rentalFind).toHaveBeenCalledWith(
      expect.objectContaining({ offers: expect.any(Object) }),
      expect.objectContaining({
        limit: 100001,
        batchSize: 100,
        maxTimeMS: 120000,
      }),
    );
    expect(fake.publishMarket).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { generatedAt: "invalid", usdUyu: 40 },
    { generatedAt: "2026-09-09", usdUyu: 40 },
    { generatedAt: "2026-09-04", usdUyu: 40 },
    { generatedAt: generated, usdUyu: NaN },
    { generatedAt: generated, usdUyu: 9 },
    { generatedAt: generated, usdUyu: 101 },
  ])(
    "refuses stale or invalid catalogue metadata before scanning: %j",
    async (value) => {
      rentalMeta = value;
      await expect(captureZoneMarket(now)).rejects.toThrow(
        "Rental metadata unavailable or stale",
      );
      expect(rentalFind).not.toHaveBeenCalled();
    },
  );

  it("refuses a short capture and preserves the previous snapshot", async () => {
    currentRows = [row(0)];
    await expect(captureZoneMarket(now)).rejects.toThrow(
      "Invalid or incomplete market capture",
    );
    expect(rentalCursor.close).toHaveBeenCalledOnce();
    expect(fake.publishMarket).not.toHaveBeenCalled();
  });

  it("does not return a partial market when the cursor fails late", async () => {
    cursorError = new Error("PRIVATE_CURSOR_ENDPOINT");
    await expect(captureZoneMarket(now)).rejects.toThrow();
    expect(rentalCursor.close).toHaveBeenCalledOnce();
    expect(fake.readSnapshot).not.toHaveBeenCalled();
    expect(fake.publishMarket).not.toHaveBeenCalled();
  });

  it("reads one extra row to detect truncation and refuses the full row-budget overflow", async () => {
    currentRows = {
      *[Symbol.iterator]() {
        for (let i = 0; i < 100001; i++) yield {};
      },
    };
    await expect(captureZoneMarket(now)).rejects.toThrow(
      "Rental market row budget exceeded",
    );
    expect(rentalCursor.close).toHaveBeenCalledOnce();
    expect(fake.publishMarket).not.toHaveBeenCalled();
  });

  it("refuses an observation overflow before adding an oversized per-row projection", async () => {
    currentRows = [row(0)];
    fake.project.mockReturnValue(new Array(200001));
    await expect(captureZoneMarket(now)).rejects.toThrow(
      "Rental market memory budget exceeded",
    );
    expect(rentalCursor.close).toHaveBeenCalledOnce();
  });

  it("enforces the serialized byte budget independently of row and offer counts", async () => {
    currentRows = [row(0, { key: "QA_MEMORY_LIMIT" })];
    const byteLength = Buffer.byteLength;
    vi.spyOn(Buffer, "byteLength").mockImplementation(
      (value: any, ...args: any[]) =>
        typeof value === "string" && value.includes("QA_MEMORY_LIMIT")
          ? 128 * 1024 * 1024 + 1
          : byteLength(value, ...args),
    );
    await expect(captureZoneMarket(now)).rejects.toThrow(
      "Rental market memory budget exceeded",
    );
    expect(rentalCursor.close).toHaveBeenCalledOnce();
  });
});

describe("independent offline layer refresh", () => {
  it("dry-run reads and validates all layers but never publishes or overwrites snapshots", async () => {
    const result = await refreshPropertyZones({ dryRun: true });
    expect(result.errors).toEqual([]);
    expect(result.market?.observations).toBe(220);
    expect(result.context.services?.snapshotId).toBe("services-new");
    expect(fake.publishMarket).not.toHaveBeenCalled();
    expect(fake.publishContext).not.toHaveBeenCalled();
    expect(fake.loadSources).toHaveBeenCalledWith({
      previous: { geometry, crime: previousCrime },
      force: undefined,
    });
  });

  it("publishes a validated market and context, forwarding explicit source refresh", async () => {
    const result = await refreshPropertyZones({ forceSources: true });
    expect(result.errors).toEqual([]);
    expect(fake.publishMarket).toHaveBeenCalledOnce();
    expect(fake.publishContext).toHaveBeenCalledWith(
      result.context,
      expect.objectContaining({ geometry }),
    );
    expect(fake.loadSources).toHaveBeenCalledWith(
      expect.objectContaining({ force: true }),
    );
  });

  it("keeps failed crime/service layers and their original dates while refreshing market data", async () => {
    fake.loadSources.mockRejectedValue(new Error("upstream unavailable"));
    serviceMeta = null;
    const result = await refreshPropertyZones();
    expect(result.market?.observations).toBe(220);
    expect(result.context.crime).toEqual(previousCrime);
    expect(result.context.services).toEqual(previousServices);
    expect(result.context.crime?.source.fetchedAt).toBe("2026-09-01T12:00:00Z");
    expect(result.context.crime?.periodTo).toBe("2026-06-30");
    expect(result.errors).toHaveLength(2);
    expect(fake.publishContext).toHaveBeenCalledWith(result.context, undefined);
  });

  it("never attaches old counts to a changed official polygon version after failures", async () => {
    fake.geometry.mockReturnValue({
      ...geometry,
      source: { ...geometry.source, version: "geometry-v2" },
    });
    fake.loadSources.mockRejectedValue(new Error("upstream unavailable"));
    serviceMeta = null;
    const result = await refreshPropertyZones();
    expect(result.context.crime).toBeNull();
    expect(result.context.services).toBeNull();
    expect(result.context.geometry.source.version).toBe("geometry-v2");
  });

  it("preserves the market after a failed capture while allowing an independent context refresh", async () => {
    cursorError = new Error("capture unavailable");
    const result = await refreshPropertyZones();
    expect(result.market).toBeNull();
    expect(fake.publishMarket).not.toHaveBeenCalled();
    expect(fake.publishContext).toHaveBeenCalledOnce();
  });

  it("does not expose dependency messages or private connection strings in loggable errors", async () => {
    cursorError = new Error("PRIVATE_MONGO_URI");
    fake.loadSources.mockRejectedValue(new Error("PRIVATE_PROVIDER_PATH"));
    serviceMeta = null;
    const result = await refreshPropertyZones({ dryRun: true });
    expect(result.errors).toHaveLength(3);
    expect(JSON.stringify(result.errors)).not.toContain("PRIVATE_");
  });
});
