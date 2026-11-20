import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RetailListing } from "../../classes/retail/types";
import { sampleListings } from "./sample";

// Same pattern as tests/movilidad/dry_run.test.ts: every collaborator that could reach the network or
// a database is mocked, through `(...args) => xMock(...args)` so the hoisted factories never read a
// mock before it exists. The store is mocked PARTIALLY: its pure `withHistory` (equipar's) runs for
// real, so the dry-run JSON is exactly what a real run would save.
const harvestRetailMock = vi.fn();
vi.mock("../../classes/retail/harvest", () => ({
  harvestRetail: (...args: unknown[]) => harvestRetailMock(...args),
}));

const fetchUsdUyuRateMock = vi.fn();
vi.mock("../../classes/chairs/catalog", () => ({
  fetchUsdUyuRate: (...args: unknown[]) => fetchUsdUyuRateMock(...args),
}));

const loadPreviousItemsMock = vi.fn();
const countPricedRecentItemsMock = vi.fn();
const saveProductosVidaCatalogMock = vi.fn();
const saveProductosVidaListingsMock = vi.fn();
vi.mock("../../classes/productosvida/store", async (orig) => ({
  ...(await orig<typeof import("../../classes/productosvida/store")>()),
  loadPreviousItems: (...a: unknown[]) => loadPreviousItemsMock(...a),
  countPricedRecentItems: (...a: unknown[]) => countPricedRecentItemsMock(...a),
  saveProductosVidaCatalog: (...a: unknown[]) => saveProductosVidaCatalogMock(...a),
  saveProductosVidaListings: (...a: unknown[]) => saveProductosVidaListingsMock(...a),
}));

// Imported AFTER the mocks. require.main is the test runner here, so importing never starts the real
// `main().then(...)` wrapper: only calling `main()` does, and it never calls `process.exit`.
import { main } from "../../sync_productos_vida";

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_APP_MONGO_URI = process.env.APP_MONGO_URI;
const ORIGINAL_MONGO_URI = process.env.MONGO_URI;

const IN_WINDOW = "2026-11-20T04:13:30.000Z";
const OUT_OF_WINDOW = "2026-11-20T04:30:00.000Z";

function setArgv(...flags: string[]): void {
  process.argv = [...ORIGINAL_ARGV.slice(0, 2), ...flags];
}

const mlRun = (ok: boolean, listings = 0) => ({
  key: "mercadolibre",
  label: "Mercado Libre Uruguay",
  adapter: "mercadolibre",
  listings,
  ok,
  note: ok ? "66 páginas, 0 descartadas por título" : "sin respuesta de http://bridge/mercadolibre",
});

const harvestOf = (listings: RetailListing[], ok = true) => ({ listings, runs: [mlRun(ok, listings.length)] });

let tmp: string;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(IN_WINDOW));
  loadPreviousItemsMock.mockResolvedValue(new Map());
  countPricedRecentItemsMock.mockResolvedValue(0);
  saveProductosVidaCatalogMock.mockResolvedValue(undefined);
  saveProductosVidaListingsMock.mockResolvedValue({ written: 0, pruned: 0 });
  fetchUsdUyuRateMock.mockResolvedValue(40);
  harvestRetailMock.mockResolvedValue(harvestOf([]));
  delete process.env.APP_MONGO_URI;
  delete process.env.MONGO_URI;
  tmp = mkdtempSync(path.join(tmpdir(), "productos-vida-"));
});

afterEach(() => {
  vi.useRealTimers();
  process.argv = ORIGINAL_ARGV;
  if (ORIGINAL_APP_MONGO_URI === undefined) delete process.env.APP_MONGO_URI;
  else process.env.APP_MONGO_URI = ORIGINAL_APP_MONGO_URI;
  if (ORIGINAL_MONGO_URI === undefined) delete process.env.MONGO_URI;
  else process.env.MONGO_URI = ORIGINAL_MONGO_URI;
  rmSync(tmp, { recursive: true, force: true });
});

const realRun = (): void => {
  process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
};

const storeCalls = (): number =>
  loadPreviousItemsMock.mock.calls.length +
  countPricedRecentItemsMock.mock.calls.length +
  saveProductosVidaCatalogMock.mock.calls.length +
  saveProductosVidaListingsMock.mock.calls.length;

describe("sync_productos_vida main()", () => {
  it("sin --dry-run y sin APP_MONGO_URI/MONGO_URI, se niega antes de cosechar", async () => {
    setArgv();
    await expect(main()).rejects.toThrow(/APP_MONGO_URI/);
    expect(harvestRetailMock).not.toHaveBeenCalled();
    expect(fetchUsdUyuRateMock).not.toHaveBeenCalled();
    expect(storeCalls()).toBe(0);
  });

  for (const at of [OUT_OF_WINDOW, "2026-11-20T05:13:00.000Z", "2026-11-20T08:13:00.000Z"]) {
    it(`fuera de la ventana (${at}) sale sin pedir la cotización, sin cosechar y sin tocar la base`, async () => {
      vi.setSystemTime(new Date(at));
      realRun();
      setArgv();
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      await expect(main()).resolves.toBe("outside-window");
      expect(fetchUsdUyuRateMock).not.toHaveBeenCalled();
      expect(harvestRetailMock).not.toHaveBeenCalled();
      expect(storeCalls()).toBe(0);
      // One line and nothing else.
      expect(log).toHaveBeenCalledTimes(1);
      expect(String(log.mock.calls[0]![0])).toMatch(/fuera de la ventana del puente \(:13–:14 de 0\/4\/16\/20 UTC\)/);
      log.mockRestore();
    });
  }

  it("--ignore-window cosecha a la misma hora fuera de la ventana", async () => {
    vi.setSystemTime(new Date(OUT_OF_WINDOW));
    realRun();
    setArgv("--ignore-window");
    await expect(main()).resolves.toBe("ran");
    expect(harvestRetailMock).toHaveBeenCalledTimes(1);
    expect(saveProductosVidaCatalogMock).toHaveBeenCalledTimes(1);
  });

  it("--dry-run no mira la ventana: cosecha a cualquier hora", async () => {
    vi.setSystemTime(new Date(OUT_OF_WINDOW));
    setArgv("--dry-run");
    await expect(main()).resolves.toBe("ran");
    expect(harvestRetailMock).toHaveBeenCalledTimes(1);
  });

  it("--dry-run nunca lee ni escribe la base, aunque APP_MONGO_URI esté configurada", async () => {
    realRun();
    setArgv("--dry-run");
    harvestRetailMock.mockResolvedValue(harvestOf(sampleListings(IN_WINDOW)));
    await expect(main()).resolves.toBe("ran");
    expect(storeCalls()).toBe(0);
  });

  it("--dry-run --json escribe { meta, items, listings } tal como se guardarían, con su historia", async () => {
    const file = path.join(tmp, "sub", "productos-vida.json");
    setArgv("--dry-run", `--json=${file}`);
    const listings = sampleListings(IN_WINDOW);
    harvestRetailMock.mockResolvedValue(harvestOf(listings));

    await expect(main()).resolves.toBe("ran");

    expect(existsSync(file)).toBe(true);
    const written = JSON.parse(readFileSync(file, "utf8"));
    expect(Object.keys(written).sort()).toEqual(["items", "listings", "meta"]);
    expect(written.meta).toMatchObject({
      key: "productos-que-te-cambian-la-vida-uruguay",
      generatedAt: IN_WINDOW,
      usdUyu: 40,
      listings: listings.length,
      items: written.items.length,
      uncovered: [],
    });
    expect(written.meta.runs.map((run: { key: string }) => run.key)).toEqual(["mercadolibre"]);
    expect(written.items.length).toBeGreaterThan(26);
    for (const item of written.items) {
      expect(item.room).toBe("productos-vida");
      expect(item.firstSeen).toBe("2026-11-20");
      expect(item.lastSeen).toBe("2026-11-20");
      expect(item.history).toEqual([
        { date: "2026-11-20", newMedian: item.newBand?.median ?? null, usedMedian: item.usedBand?.median ?? null },
      ]);
    }
    expect(written.listings.length).toBeGreaterThan(0);
    expect(written.listings[0]).toMatchObject({ room: "productos-vida", source: "mercadolibre", lastSeen: "2026-11-20" });
    expect(storeCalls()).toBe(0);
  });

  it("le pide al cosechador sólo Mercado Libre, con tope de búsquedas, de páginas y el reloj de 6 minutos", async () => {
    realRun();
    setArgv();
    await main();
    expect(harvestRetailMock).toHaveBeenCalledTimes(1);
    const [options] = harvestRetailMock.mock.calls[0]!;
    expect(options.stores).toEqual([]);
    expect(options.maxFbQueries).toBe(0);
    expect(options.specs).toHaveLength(26);
    for (const spec of options.specs) expect(spec.fbQueries).toHaveLength(0);
    expect(options.maxMlScans).toBe(40);
    expect(options.mlMaxPagesPerQuery).toBe(2);
    expect(options.mlDeadlineAt).toBe(Date.parse(IN_WINDOW) + 6 * 60_000);
  });

  it("si Mercado Libre no respondió, falla y no guarda nada, también en la primera corrida", async () => {
    realRun();
    setArgv();
    countPricedRecentItemsMock.mockResolvedValue(0);
    harvestRetailMock.mockResolvedValue(harvestOf([], false));
    await expect(main()).rejects.toThrow(/Mercado Libre no respondió/);
    expect(saveProductosVidaCatalogMock).not.toHaveBeenCalled();
    expect(saveProductosVidaListingsMock).not.toHaveBeenCalled();
  });

  it("primera corrida con Mercado Libre bien y cero avisos: guarda", async () => {
    realRun();
    setArgv();
    harvestRetailMock.mockResolvedValue(harvestOf([]));
    await expect(main()).resolves.toBe("ran");
    expect(saveProductosVidaCatalogMock).toHaveBeenCalledTimes(1);
    const [, meta] = saveProductosVidaCatalogMock.mock.calls[0]!;
    expect(meta.uncovered).toHaveLength(26);
  });

  it("corrida flaca: con ítems guardados y nada con banda nueva, no escribe y rechaza", async () => {
    realRun();
    setArgv();
    countPricedRecentItemsMock.mockResolvedValue(10);
    harvestRetailMock.mockResolvedValue(harvestOf([]));
    await expect(main()).rejects.toThrow(/guardados/);
    expect(countPricedRecentItemsMock).toHaveBeenCalledWith("2026-11-20");
    expect(saveProductosVidaCatalogMock).not.toHaveBeenCalled();
  });

  // The page publishes NEW bands only: a run whose used bands survive while every new one collapsed
  // would otherwise pass and blank every price on the page.
  it("bandas de usado sin ninguna banda nueva tampoco cuentan como precio", async () => {
    realRun();
    setArgv();
    countPricedRecentItemsMock.mockResolvedValue(10);
    const used = sampleListings(IN_WINDOW)
      .filter((listing) => listing.attributes.CATEGORY_SPEC === "freidora-de-aire")
      .map((listing) => ({ ...listing, condition: "used" as const }));
    harvestRetailMock.mockResolvedValue(harvestOf(used));
    await expect(main()).rejects.toThrow(/guardados/);
    expect(saveProductosVidaCatalogMock).not.toHaveBeenCalled();
  });

  it("con la muestra real y 30 guardados, pasa la guarda y guarda catálogo y filas", async () => {
    realRun();
    setArgv();
    countPricedRecentItemsMock.mockResolvedValue(30);
    harvestRetailMock.mockResolvedValue(harvestOf(sampleListings(IN_WINDOW)));
    await expect(main()).resolves.toBe("ran");
    expect(saveProductosVidaCatalogMock).toHaveBeenCalledTimes(1);
    expect(saveProductosVidaListingsMock).toHaveBeenCalledTimes(1);
    const [rows, today] = saveProductosVidaListingsMock.mock.calls[0]!;
    expect(today).toBe("2026-11-20");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("si fallan las filas de avisos, el catálogo ya guardado se queda y la corrida no falla", async () => {
    realRun();
    setArgv();
    harvestRetailMock.mockResolvedValue(harvestOf(sampleListings(IN_WINDOW)));
    saveProductosVidaListingsMock.mockRejectedValue(new Error("mongo caído"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(main()).resolves.toBe("ran");
    expect(saveProductosVidaCatalogMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("sin cotización del dólar falla ANTES de gastar el puente", async () => {
    realRun();
    setArgv();
    fetchUsdUyuRateMock.mockResolvedValue(0);
    await expect(main()).rejects.toThrow(/USD/);
    expect(harvestRetailMock).not.toHaveBeenCalled();
    expect(storeCalls()).toBe(0);
  });
});
