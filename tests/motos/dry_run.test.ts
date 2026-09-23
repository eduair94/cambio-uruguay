// Las guardas del job, contra colaboradores mockeados: ni red ni base.
//
// La indirección `(...args) => xMock(...args)` en vez de devolver `xMock` directo es deliberada:
// las fábricas de `vi.mock` se hoistean arriba de estos `const`, y la closure no evalúa la variable
// hasta que la función mockeada se LLAMA, cuando el archivo ya terminó de correr. Mismo patrón que
// tests/movilidad/dry_run.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MotoHarvestResult, RawMotoListing, StoredMoto } from "../../classes/motos/types";

const harvestMock = vi.fn();
vi.mock("../../classes/motos/sources/mercadolibre", async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, harvestMercadoLibreMotos: (...args: unknown[]) => harvestMock(...args) };
});

const fetchUsdUyuRateMock = vi.fn();
vi.mock("../../classes/rentals/rate", () => ({
  fetchUsdUyuRate: (...args: unknown[]) => fetchUsdUyuRateMock(...args),
}));

const loadStoredMotosMock = vi.fn();
const countPublishedMotosMock = vi.fn();
const loadCatalogMetaMock = vi.fn();
const loadHarvestMetaMock = vi.fn();
const saveHarvestMetaMock = vi.fn();
const saveMotoHarvestMock = vi.fn();
const saveRefusalMock = vi.fn();
const publishMotoCatalogMock = vi.fn();
const publishMotoModelsMock = vi.fn();
vi.mock("../../classes/motos/store", async importOriginal => {
  // Las reglas puras (`collapseRefusal`, `motoHarvestMetaRecord`) se dejan REALES: lo que este
  // archivo prueba es que el job las aplique, no que un doble devuelva lo que le pidieron.
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    loadStoredMotos: (...args: unknown[]) => loadStoredMotosMock(...args),
    countPublishedMotos: (...args: unknown[]) => countPublishedMotosMock(...args),
    loadCatalogMeta: (...args: unknown[]) => loadCatalogMetaMock(...args),
    loadHarvestMeta: (...args: unknown[]) => loadHarvestMetaMock(...args),
    saveHarvestMeta: (...args: unknown[]) => saveHarvestMetaMock(...args),
    saveMotoHarvest: (...args: unknown[]) => saveMotoHarvestMock(...args),
    saveRefusal: (...args: unknown[]) => saveRefusalMock(...args),
    publishMotoCatalog: (...args: unknown[]) => publishMotoCatalogMock(...args),
    publishMotoModels: (...args: unknown[]) => publishMotoModelsMock(...args),
  };
});

// Importado DESPUÉS de los mocks. `require.main !== module` acá (el entrypoint que vitest corrió es
// este archivo), así que importar nunca dispara el wrapper `.then/.catch` ni un `process.exit`.
import { main } from "../../sync_motos";

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_APP_MONGO_URI = process.env.APP_MONGO_URI;
const ORIGINAL_MONGO_URI = process.env.MONGO_URI;

function setArgv(...flags: string[]): void {
  process.argv = [...ORIGINAL_ARGV.slice(0, 2), ...flags];
}

const NOW = new Date().toISOString();

const raw = (id: string, over: Partial<RawMotoListing> = {}): RawMotoListing => ({
  id,
  source: "mercadolibre",
  brandId: "2102273",
  brand: "Yumbo",
  modelId: "8801",
  model: "GS 200",
  title: "Yumbo Gs 200 Cc 2020",
  year: 2020,
  km: 12_000,
  price: 1_500,
  currency: "USD",
  fuel: "nafta",
  neighborhood: null,
  department: "Montevideo",
  sellerType: "private",
  sellerId: "1",
  picture: null,
  pictureCount: 1,
  permalink: `https://moto.mercadolibre.com.uy/MLU-${id.replace(/^MLU/, "")}-yumbo-_JM`,
  observedAt: NOW,
  ...over,
});

const stored = (id: string, over: Partial<RawMotoListing> = {}): StoredMoto => ({
  key: `ml-${id}`,
  firstSeen: NOW,
  lastSeen: NOW,
  listing: raw(id, over),
  priceHistory: [],
  retiredAt: null,
  missedFullSweeps: 0,
});

const harvestResult = (listings: RawMotoListing[] = []): MotoHarvestResult => ({
  mode: "full",
  startedAt: NOW,
  finishedAt: NOW,
  listings,
  types: [],
  displacements: [],
  excludedIds: [],
  requests: 10,
  pages: 10,
  failedPages: 0,
  rejectedCards: 0,
  cooldowns: 0,
  completeBrands: ["2102273"],
  gaps: [],
  reportedTotal: listings.length,
  note: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchUsdUyuRateMock.mockResolvedValue(42);
  harvestMock.mockResolvedValue(harvestResult([raw("MLU1")]));
  loadStoredMotosMock.mockResolvedValue([stored("MLU1")]);
  countPublishedMotosMock.mockResolvedValue(0);
  loadCatalogMetaMock.mockResolvedValue(null);
  loadHarvestMetaMock.mockResolvedValue(null);
  saveHarvestMetaMock.mockResolvedValue(undefined);
  saveMotoHarvestMock.mockResolvedValue({ upserted: 1, retired: 0 });
  saveRefusalMock.mockResolvedValue(undefined);
  publishMotoCatalogMock.mockResolvedValue(undefined);
  publishMotoModelsMock.mockResolvedValue(undefined);
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

describe("sync_motos main()", () => {
  it("sin --dry-run y sin APP_MONGO_URI/MONGO_URI, se niega antes de tocar nada", async () => {
    setArgv();
    await expect(main()).rejects.toThrow(/APP_MONGO_URI/);
    expect(harvestMock).not.toHaveBeenCalled();
    expect(publishMotoCatalogMock).not.toHaveBeenCalled();
  });

  it("--dry-run nunca escribe ni conecta, aunque haya avisos para publicar", async () => {
    setArgv("--dry-run");
    await expect(main()).resolves.toBeUndefined();
    // Todo lo que abriría la conexión a la APP DB, en cero llamadas.
    expect(loadStoredMotosMock).not.toHaveBeenCalled();
    expect(countPublishedMotosMock).not.toHaveBeenCalled();
    expect(loadCatalogMetaMock).not.toHaveBeenCalled();
    expect(saveMotoHarvestMock).not.toHaveBeenCalled();
    expect(saveHarvestMetaMock).not.toHaveBeenCalled();
    expect(saveRefusalMock).not.toHaveBeenCalled();
    expect(publishMotoCatalogMock).not.toHaveBeenCalled();
    expect(publishMotoModelsMock).not.toHaveBeenCalled();
  });

  it("--dry-run funciona sin APP_MONGO_URI configurada — nunca se niega por eso", async () => {
    setArgv("--dry-run");
    harvestMock.mockResolvedValue(harvestResult([]));
    await expect(main()).resolves.toBeUndefined();
  });

  it("--dry-run le pide al puente un presupuesto chico, no el de una corrida real", async () => {
    // El número exacto lo fija `ML_BUDGET.dry` y está medido: con 40 pedidos y tope de 3 marcas, la
    // corrida de prueba del 2026-09-22 volvió con 73 avisos publicables y 35 fichas de modelo, que es
    // justo lo que una prueba de humo tiene que demostrar. Bajarlo más no la hace más prolija: el
    // recorrido encola las páginas de MARCA antes que las de modelo, así que un presupuesto
    // demasiado chico se gasta entero antes de leer una sola tarjeta y la prueba pasaría sin haber
    // probado nada. Lo que este test fija es lo que importa: que el dry run cueste un orden de
    // magnitud menos que una corrida real y que no dispare los barridos por faceta.
    setArgv("--dry-run");
    await expect(main()).resolves.toBeUndefined();
    const [options] = harvestMock.mock.calls[0] as [
      { maxRequests: number; typeSweep: boolean; displacementSweep: boolean; maxBrands?: number },
    ];
    expect(options.maxRequests).toBeLessThanOrEqual(40);
    expect(options.maxRequests).toBeLessThan(250);
    expect(options.maxBrands).toBeGreaterThan(0);
    expect(options.typeSweep).toBe(false);
    expect(options.displacementSweep).toBe(false);
  });

  it("primera corrida (catálogo vacío) publica sin que la guarda la bloquee", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    countPublishedMotosMock.mockResolvedValue(0);
    await expect(main()).resolves.toBeUndefined();
    expect(publishMotoCatalogMock).toHaveBeenCalledTimes(1);
    expect(publishMotoModelsMock).toHaveBeenCalledTimes(1);
    // La negativa se anota igual, en null: el documento dice "esta corrida publicó".
    expect(saveRefusalMock).toHaveBeenCalledWith(null, expect.any(String));
  });

  it("corrida flaca: con un catálogo publicado y lo nuevo bajo el 40 %, no publica y rechaza", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    countPublishedMotosMock.mockResolvedValue(1_000);
    await expect(main()).rejects.toThrow(/se conserva lo publicado/);
    expect(publishMotoCatalogMock).not.toHaveBeenCalled();
    // Y la negativa queda anotada, con su motivo, para que se pueda leer al día siguiente.
    expect(saveRefusalMock).toHaveBeenCalledWith(expect.stringMatching(/caída de más de 60 %/), expect.any(String));
  });

  it("una corrida sin una sola moto publicable nunca blanquea el catálogo", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    loadStoredMotosMock.mockResolvedValue([]);
    harvestMock.mockResolvedValue(harvestResult([]));
    await expect(main()).rejects.toThrow(/ninguna moto publicable/);
    expect(publishMotoCatalogMock).not.toHaveBeenCalled();
  });

  it("sin referencia USD/UYU no publica nada", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    fetchUsdUyuRateMock.mockResolvedValue(0);
    await expect(main()).rejects.toThrow(/USD\/UYU/);
    expect(harvestMock).not.toHaveBeenCalled();
  });

  it("MOTOS_ML_ENABLED=0 apaga la fuente sin desplegar y el job sigue con lo guardado", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    process.env.MOTOS_ML_ENABLED = "0";
    setArgv();
    try {
      await expect(main()).resolves.toBeUndefined();
      expect(harvestMock).not.toHaveBeenCalled();
      expect(publishMotoCatalogMock).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.MOTOS_ML_ENABLED;
    }
  });

  it("la horaria pide sólo las novedades y no barre los tipos", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv("--fast");
    await expect(main()).resolves.toBeUndefined();
    const [options] = harvestMock.mock.calls[0] as [
      { mode: string; typeSweep: boolean; displacementSweep: boolean },
    ];
    expect(options.mode).toBe("fast");
    expect(options.typeSweep).toBe(false);
    expect(options.displacementSweep).toBe(false);
  });

  it("lo que no es una moto no llega al catálogo publicado", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    loadStoredMotosMock.mockResolvedValue([
      stored("MLU1"),
      stored("MLU2", { title: "Casco Ls2 Talle M" }),
      stored("MLU3", { title: "Monopatin Xiaomi Lite 4 Gen 2" }),
      stored("MLU4", { title: "Zanella Zt 0 Km, 100% Financiada" }),
    ]);
    await expect(main()).resolves.toBeUndefined();
    const [rows] = publishMotoCatalogMock.mock.calls[0] as [Array<{ key: string }>, unknown];
    expect(rows.map(row => row.key)).toEqual(["ml-MLU1"]);
  });

  it("la horaria conserva el tipo y el tramo que midió la diaria, en vez de borrarlos", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv("--fast");
    // La horaria NO barre las facetas: su cosecha vuelve sin `types` ni `displacements`, y lo único
    // que sabe del tipo y del tramo es lo que la diaria dejó guardado junto al aviso.
    harvestMock.mockResolvedValue(harvestResult([raw("MLU1")]));
    loadStoredMotosMock.mockResolvedValue([
      {
        ...stored("MLU1", { title: "Yumbo Gs 2020 impecable" }),
        facets: { type: "scooter", displacementBand: "hasta-125", readAt: NOW },
      },
    ]);

    await expect(main()).resolves.toBeUndefined();

    const [rows] = publishMotoCatalogMock.mock.calls[0] as [
      Array<{ type: string | null; typeBasis: string | null; displacementBand: string | null }>,
    ];
    expect(rows[0]!.type).toBe("scooter");
    expect(rows[0]!.typeBasis).toBe("mercadolibre");
    expect(rows[0]!.displacementBand).toBe("hasta-125");
  });

  it("un cuatriciclo que la faceta de ML marcó no llega al catálogo aunque su título no lo diga", async () => {
    process.env.APP_MONGO_URI = "mongodb://fake-app-db/test";
    setArgv();
    harvestMock.mockResolvedValue({ ...harvestResult([raw("MLU1"), raw("MLU9")]), excludedIds: ["MLU9"] });
    loadStoredMotosMock.mockResolvedValue([stored("MLU1"), stored("MLU9", { title: "Kawasaki Brute Force 750i V-twin" })]);
    await expect(main()).resolves.toBeUndefined();
    const [rows] = publishMotoCatalogMock.mock.calls[0] as [Array<{ key: string }>, unknown];
    expect(rows.map(row => row.key)).toEqual(["ml-MLU1"]);
  });
});
