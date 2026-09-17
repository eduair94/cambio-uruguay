import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RetailListing } from "../../classes/retail/types";

// Every collaborator that could touch the network or a database is mocked. The indirection
// (`(...args) => xMock(...args)` instead of returning `xMock` itself) is deliberate: `vi.mock`
// factories are hoisted above these `const`s, and building the closure below does not evaluate the
// mock variable until the mocked function is actually CALLED — by which time the file has finished
// running and every `const` is initialised. Same pattern as tests/autos/detail.test.ts.
const harvestRetailMock = vi.fn();
vi.mock("../../classes/retail/harvest", () => ({
  harvestRetail: (...args: unknown[]) => harvestRetailMock(...args),
}));

const fetchUsdUyuRateMock = vi.fn();
vi.mock("../../classes/chairs/catalog", () => ({
  fetchUsdUyuRate: (...args: unknown[]) => fetchUsdUyuRateMock(...args),
}));

const loadPreviousItemsMock = vi.fn();
const countStoredItemsMock = vi.fn();
const loadStoreSnapshotMock = vi.fn();
const saveMovilidadCatalogMock = vi.fn();
const saveStoreSnapshotMock = vi.fn();
const withHistoryMock = vi.fn();
vi.mock("../../classes/movilidad/store", () => ({
  loadPreviousItems: (...args: unknown[]) => loadPreviousItemsMock(...args),
  countStoredItems: (...args: unknown[]) => countStoredItemsMock(...args),
  loadStoreSnapshot: (...args: unknown[]) => loadStoreSnapshotMock(...args),
  saveMovilidadCatalog: (...args: unknown[]) => saveMovilidadCatalogMock(...args),
  saveStoreSnapshot: (...args: unknown[]) => saveStoreSnapshotMock(...args),
  withHistory: (...args: unknown[]) => withHistoryMock(...args),
}));

const recordPricewatchMock = vi.fn();
vi.mock("../../classes/pricewatch/record", () => ({
  recordPricewatch: (...args: unknown[]) => recordPricewatchMock(...args),
}));

// Imported AFTER the mocks above so sync_movilidad.ts resolves its collaborators against them.
// require.main !== module here (the test file, not sync_movilidad.ts, is the entrypoint vitest
// actually ran), so importing this never triggers the real `main().then(...).catch(...)` wrapper —
// only calling `main()` ourselves does, and it never calls `process.exit`.
import { main } from "../../sync_movilidad";

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_APP_MONGO_URI = process.env.APP_MONGO_URI;
const ORIGINAL_MONGO_URI = process.env.MONGO_URI;

function setArgv(...flags: string[]): void {
  process.argv = [...ORIGINAL_ARGV.slice(0, 2), ...flags];
}

const storeListing = (over: Partial<RetailListing> = {}): RetailListing => ({
  listingId: "store:delcar:1",
  source: "store",
  sellerKey: "delcar",
  sellerName: "Delcar Motos",
  channel: "local-store",
  title: "Monopatin Electrico Urbano",
  url: "https://delcar.com.uy/producto/1",
  price: 300,
  currency: "USD",
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
  officialStore: true,
  observedAt: new Date().toISOString(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  loadPreviousItemsMock.mockResolvedValue(new Map());
  countStoredItemsMock.mockResolvedValue(0);
  loadStoreSnapshotMock.mockResolvedValue(null);
  saveMovilidadCatalogMock.mockResolvedValue(undefined);
  saveStoreSnapshotMock.mockResolvedValue({ bytes: 10, saved: true });
  withHistoryMock.mockImplementation((items: Array<Record<string, unknown>>) =>
    items.map((item) => ({ ...item, firstSeen: "2026-01-01", lastSeen: "2026-09-17", history: [] }))
  );
  recordPricewatchMock.mockResolvedValue({ written: 0, skipped: 0, pruned: 0 });
  fetchUsdUyuRateMock.mockResolvedValue(40);
  harvestRetailMock.mockResolvedValue({ listings: [], runs: [] });
  delete process.env.APP_MONGO_URI;
  delete process.env.MONGO_URI;
});

afterEach(() => {
  process.argv = ORIGINAL_ARGV;
  if (ORIGINAL_APP_MONGO_URI === undefined) delete process.env.APP_MONGO_URI;
  else process.env.APP_MONGO_URI = ORIGINAL_APP_MONGO_URI;
  if (ORIGINAL_MONGO_URI === undefined) delete process.env.MONGO_URI;
  else process.env.MONGO_URI = ORIGINAL_MONGO_URI;
});

describe("sync_movilidad main()", () => {
  it("sin --dry-run y sin APP_MONGO_URI/MONGO_URI, se niega antes de tocar nada", async () => {
    setArgv();
    await expect(main()).rejects.toThrow(/APP_MONGO_URI/);
    expect(harvestRetailMock).not.toHaveBeenCalled();
    expect(saveMovilidadCatalogMock).not.toHaveBeenCalled();
  });

  // The property a save-path bug would break: every function that could open the APP DB connection
  // (the three loaders, the two savers) is asserted at zero calls, not just "no error thrown".
  it("--dry-run nunca escribe ni conecta a la base, aunque haya avisos para publicar", async () => {
    setArgv("--dry-run", "--fast");
    harvestRetailMock.mockResolvedValue({
      listings: [storeListing({ attributes: { CATEGORY_SPEC: "monopatin-electrico" } })],
      runs: [{ key: "delcar", label: "Delcar Motos", adapter: "woocommerce", listings: 1, ok: true, note: "" }],
    });

    await expect(main()).resolves.toBeUndefined();

    expect(loadPreviousItemsMock).not.toHaveBeenCalled();
    expect(countStoredItemsMock).not.toHaveBeenCalled();
    expect(loadStoreSnapshotMock).not.toHaveBeenCalled();
    expect(saveMovilidadCatalogMock).not.toHaveBeenCalled();
    expect(saveStoreSnapshotMock).not.toHaveBeenCalled();
    expect(recordPricewatchMock).not.toHaveBeenCalled();
  });

  it("--dry-run funciona sin APP_MONGO_URI configurada — nunca se niega por eso", async () => {
    setArgv("--dry-run");
    harvestRetailMock.mockResolvedValue({ listings: [], runs: [] });
    await expect(main()).resolves.toBeUndefined();
  });

  it("primera corrida (nada guardado) nunca bloquea aunque no haya nada para publicar", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    countStoredItemsMock.mockResolvedValue(0);
    harvestRetailMock.mockResolvedValue({ listings: [], runs: [] });

    await expect(main()).resolves.toBeUndefined();
    expect(saveMovilidadCatalogMock).toHaveBeenCalledTimes(1);
  });

  it("corrida flaca: con más de 0 guardados y lo nuevo bajo el 40%, no escribe y rechaza", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    countStoredItemsMock.mockResolvedValue(10);
    harvestRetailMock.mockResolvedValue({ listings: [], runs: [] });

    await expect(main()).rejects.toThrow(/guardados/);
    expect(saveMovilidadCatalogMock).not.toHaveBeenCalled();
  });

  // The hourly `--fast` run searches a smaller budget than the daily one; the daily run's store
  // snapshot fills in whatever it did not re-scan. Two DIFFERENT variants prove the merge actually
  // happened — one that only the fresh harvest saw, one that only the snapshot had.
  it("la corrida horaria conserva las ofertas de tiendas de la foto diaria", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv("--fast");

    const fresh = storeListing({
      listingId: "store:delcar:fresh",
      title: "Monopatin Electrico Urbano",
      attributes: { CATEGORY_SPEC: "monopatin-electrico" },
    });
    const fromSnapshot = storeListing({
      listingId: "store:delcar:snapshot",
      title: "Monopatin Electrico 1200w Todo Terreno",
      attributes: { CATEGORY_SPEC: "monopatin-electrico" },
      observedAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    });
    harvestRetailMock.mockResolvedValue({ listings: [fresh], runs: [] });
    loadStoreSnapshotMock.mockResolvedValue({ generatedAt: "2026-09-16T12:00:00.000Z", listings: [fromSnapshot] });

    await expect(main()).resolves.toBeUndefined();

    expect(loadStoreSnapshotMock).toHaveBeenCalledTimes(1);
    expect(saveMovilidadCatalogMock).toHaveBeenCalledTimes(1);
    const [savedItems] = saveMovilidadCatalogMock.mock.calls[0] as [Array<{ key: string }>, unknown];
    const keys = savedItems.map((item) => item.key);
    // "urbano" only exists in `fresh`; "alto-rendimiento" (1200w, todo terreno) only exists in
    // `fromSnapshot` — both reaching the saved catalogue proves the snapshot rows were merged in,
    // not just the fresh harvest re-published on its own.
    expect(keys).toContain("monopatin-electrico:urbano");
    expect(keys).toContain("monopatin-electrico:alto-rendimiento");
  });

  it("un aviso de la foto con más de 36 horas no se suma en la horaria", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv("--fast");

    const stale = storeListing({
      listingId: "store:delcar:stale",
      title: "Monopatin Electrico 1200w Todo Terreno",
      attributes: { CATEGORY_SPEC: "monopatin-electrico" },
      observedAt: new Date(Date.now() - 40 * 3_600_000).toISOString(),
    });
    harvestRetailMock.mockResolvedValue({ listings: [], runs: [] });
    loadStoreSnapshotMock.mockResolvedValue({ generatedAt: "2026-09-15T12:00:00.000Z", listings: [stale] });

    await expect(main()).resolves.toBeUndefined();

    const [savedItems] = saveMovilidadCatalogMock.mock.calls[0] as [Array<{ key: string }>, unknown];
    expect(savedItems.map((item) => item.key)).not.toContain("monopatin-electrico:alto-rendimiento");
  });
});
