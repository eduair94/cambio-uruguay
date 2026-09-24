// sync_phones.ts --dry-run must never write, and must work even with no APP DB configured at all.
// Every heavy dependency is mocked so this proves the CONTROL FLOW inside main() — the write calls
// sit behind `if (!dryRun)` — rather than re-testing buildPhoneCatalog/harvestRetail, which have
// their own suites. If a future edit moved a save call outside that guard, the mocked
// savePhoneCatalog/recordPricewatch/savePhoneStoreSnapshot below would record a call and these tests
// would fail.
//
// This file also proves the store-snapshot wiring that fixes a real bug: the hourly (--fast) run
// skips every Fenicio store and savePhoneCatalog `$set`s the whole model document, so without merging
// the daily run's store snapshot back in first, an hourly run would wipe store offers/bands for ~23h
// a day. See classes/phones/storeSnapshot.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

const appDbState = vi.hoisted(() => ({ configured: true }));
const appConnectionCalls = vi.hoisted(() => [] as string[]);
vi.mock("../../classes/appdb", () => ({
  appDbConfigured: () => appDbState.configured,
  appConnection: () => {
    appConnectionCalls.push("called");
    return { close: async () => undefined };
  },
}));

const storeSnapshotState = vi.hoisted(() => ({
  data: null as null | { generatedAt: string; listings: unknown[] },
  storedPublishable: 0,
}));
const storeCalls = vi.hoisted(() => ({
  loadPrevious: 0,
  countStored: 0,
  save: [] as unknown[][],
  withHistory: 0,
  loadSnapshot: 0,
  saveSnapshot: [] as unknown[][],
}));
vi.mock("../../classes/phones/store", () => ({
  PHONE_META_KEY: "celulares-uruguay",
  loadPreviousPhones: async () => {
    storeCalls.loadPrevious++;
    return new Map();
  },
  // 0 stored by default: the thin-run guard's relative check (`publishable < stored * 0.4`) only
  // engages when `stored > 0` — this keeps the fixture's single FAKE_MODEL from tripping it unless a
  // test sets `storedPublishable` on purpose (the guard's own suite is further down this file).
  countPublishableStoredPhones: async () => {
    storeCalls.countStored++;
    return storeSnapshotState.storedPublishable;
  },
  withPhoneHistory: (models: unknown[]) => {
    storeCalls.withHistory++;
    return models;
  },
  savePhoneCatalog: async (...args: unknown[]) => {
    storeCalls.save.push(args);
  },
  loadPhoneStoreSnapshot: async () => {
    storeCalls.loadSnapshot++;
    return storeSnapshotState.data;
  },
  savePhoneStoreSnapshot: async (...args: unknown[]) => {
    storeCalls.saveSnapshot.push(args);
    return { bytes: 1024, saved: true };
  },
}));

const pricewatchCalls = vi.hoisted(() => [] as unknown[][]);
vi.mock("../../classes/pricewatch/record", () => ({
  recordPricewatch: async (...args: unknown[]) => {
    pricewatchCalls.push(args);
    return { written: 0, skipped: 0, pruned: 0 };
  },
}));

vi.mock("../../classes/chairs/catalog", () => ({
  fetchUsdUyuRate: async () => 42,
}));

const FAKE_MODEL = {
  key: "apple-iphone-17-256gb",
  slug: "apple-iphone-17-256gb",
  brand: "apple",
  brandLabel: "Apple",
  family: "iphone-17",
  familyLabel: "iPhone 17",
  storageGb: 256,
  name: "Apple iPhone 17 256 GB",
  image: null,
  bands: { new: { min: 40000, p25: 41000, median: 42000, p75: 43000, n: 5, sellers: 3 } },
  offers: [],
  newSellers: 3,
  esimOnlySeen: false,
  suspectDropped: 0,
  ambiguousDropped: 0,
  ambiguousConditions: [] as string[],
  observedAt: "2026-09-17T00:00:00.000Z",
};
const catalogCalls = vi.hoisted(() => [] as Array<{ listings: unknown[]; usdUyu: number }>);
vi.mock("../../classes/phones/catalog", () => ({
  buildPhoneCatalog: (input: { listings: unknown[]; usdUyu: number }) => {
    catalogCalls.push(input);
    return [FAKE_MODEL];
  },
}));

vi.mock("../../classes/retail/harvest", () => ({
  harvestRetail: async () => ({
    listings: [],
    runs: [{ key: "mercadolibre", label: "Mercado Libre Uruguay", adapter: "mercadolibre", listings: 0, ok: true, note: "" }],
  }),
}));

import { main } from "../../sync_phones";

const ORIGINAL_ARGV = process.argv;

function setArgv(...flags: string[]): void {
  process.argv = [ORIGINAL_ARGV[0]!, ORIGINAL_ARGV[1]!, ...flags];
}

/** A store listing as the daily run's snapshot would hold it. */
const snapshotListing = (listingId: string, hoursAgo: number): Record<string, unknown> => ({
  listingId,
  source: "store",
  sellerKey: "claro",
  sellerName: "Tienda Claro",
  channel: "local-store",
  title: "iPhone 17 256GB",
  url: `https://x/${listingId}`,
  price: 900,
  currency: "USD",
  condition: "new",
  available: true,
  image: null,
  brand: "",
  model: "",
  catalogId: null,
  attributes: { CATEGORY_SPEC: "celulares" },
  rating: null,
  ratingCount: 0,
  location: null,
  freeShipping: null,
  officialStore: true,
  observedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
});

beforeEach(() => {
  appDbState.configured = true;
  appConnectionCalls.length = 0;
  storeCalls.loadPrevious = 0;
  storeCalls.countStored = 0;
  storeCalls.save.length = 0;
  storeCalls.withHistory = 0;
  storeCalls.loadSnapshot = 0;
  storeCalls.saveSnapshot.length = 0;
  storeSnapshotState.data = null;
  storeSnapshotState.storedPublishable = 0;
  pricewatchCalls.length = 0;
  catalogCalls.length = 0;
  process.argv = ORIGINAL_ARGV;
});

describe("sync_phones.ts --dry-run", () => {
  it("con --dry-run y SIN APP_MONGO_URI: no carga lo guardado, no cuenta, no guarda, no graba pricewatch, nunca conecta ni lee/guarda la foto de tiendas", async () => {
    appDbState.configured = false;
    setArgv("--dry-run", "--fast");
    await main();
    expect(storeCalls.loadPrevious).toBe(0);
    expect(storeCalls.countStored).toBe(0);
    expect(storeCalls.save).toHaveLength(0);
    expect(storeCalls.loadSnapshot).toBe(0);
    expect(storeCalls.saveSnapshot).toHaveLength(0);
    expect(pricewatchCalls).toHaveLength(0);
    expect(appConnectionCalls).toHaveLength(0);
  });

  it("con --dry-run y CON APP_MONGO_URI: carga lo guardado y cuenta igual, pero sigue sin guardar, grabar pricewatch ni escribir la foto de tiendas", async () => {
    appDbState.configured = true;
    setArgv("--dry-run");
    await main();
    expect(storeCalls.loadPrevious).toBe(1);
    expect(storeCalls.countStored).toBe(1);
    expect(storeCalls.save).toHaveLength(0);
    expect(pricewatchCalls).toHaveLength(0);
    expect(storeCalls.saveSnapshot).toHaveLength(0);
  });

  it("--dry-run --fast tampoco escribe la foto de tiendas, aunque sí la lea (con APP DB)", async () => {
    appDbState.configured = true;
    storeSnapshotState.data = { generatedAt: "2026-09-16T12:00:00.000Z", listings: [snapshotListing("store:claro:1", 1)] };
    setArgv("--dry-run", "--fast");
    await main();
    expect(storeCalls.loadSnapshot).toBe(1);
    expect(storeCalls.saveSnapshot).toHaveLength(0);
    expect(storeCalls.save).toHaveLength(0);
  });

  it("SIN --dry-run y sin APP_MONGO_URI: rechaza en vez de escribir a la base equivocada", async () => {
    appDbState.configured = false;
    setArgv();
    await expect(main()).rejects.toThrow(/APP_MONGO_URI/);
    expect(storeCalls.save).toHaveLength(0);
  });

  it("control: SIN --dry-run y CON APP_MONGO_URI sí guarda y graba pricewatch — prueba que la guarda de arriba es --dry-run, no otra cosa", async () => {
    appDbState.configured = true;
    setArgv();
    await main();
    expect(storeCalls.save).toHaveLength(1);
    expect(pricewatchCalls).toHaveLength(1);
  });
});

describe("sync_phones.ts: foto de tiendas entre la diaria y la horaria", () => {
  it("la diaria (sin --fast) NUNCA lee la foto — sólo la escribe, y sólo después de publicar", async () => {
    appDbState.configured = true;
    setArgv();
    await main();
    expect(storeCalls.loadSnapshot).toBe(0);
    expect(storeCalls.saveSnapshot).toHaveLength(1);
  });

  it("la horaria (--fast) lee la foto y nunca la escribe", async () => {
    appDbState.configured = true;
    setArgv("--fast");
    await main();
    expect(storeCalls.loadSnapshot).toBe(1);
    expect(storeCalls.saveSnapshot).toHaveLength(0);
  });

  it("horaria con foto: un aviso de tienda fresco de la foto llega a buildPhoneCatalog, así el modelo conserva su oferta de tienda", async () => {
    appDbState.configured = true;
    storeSnapshotState.data = {
      generatedAt: "2026-09-16T12:00:00.000Z",
      listings: [snapshotListing("store:claro:fresco", 1)],
    };
    setArgv("--fast");
    await main();
    const seen = catalogCalls[0]!.listings as Array<{ listingId: string }>;
    expect(seen.map((l) => l.listingId)).toContain("store:claro:fresco");
  });

  it("horaria con foto: un aviso de tienda de más de 36 horas NO llega a buildPhoneCatalog", async () => {
    appDbState.configured = true;
    storeSnapshotState.data = {
      generatedAt: "2026-09-14T12:00:00.000Z",
      listings: [snapshotListing("store:claro:viejo", 40)],
    };
    setArgv("--fast");
    await main();
    const seen = catalogCalls[0]!.listings as Array<{ listingId: string }>;
    expect(seen.map((l) => l.listingId)).not.toContain("store:claro:viejo");
  });

  it("horaria sin foto: sigue funcionando sólo con lo leído en la corrida", async () => {
    appDbState.configured = true;
    storeSnapshotState.data = null;
    setArgv("--fast");
    await main();
    expect(storeCalls.loadSnapshot).toBe(1);
    expect(catalogCalls[0]!.listings).toEqual([]);
    expect(storeCalls.save).toHaveLength(1);
  });

  it("diaria con APP_MONGO_URI ausente en modo --dry-run: no intenta ni leer ni escribir la foto", async () => {
    appDbState.configured = false;
    setArgv("--dry-run");
    await main();
    expect(storeCalls.loadSnapshot).toBe(0);
    expect(storeCalls.saveSnapshot).toHaveLength(0);
  });
});

describe("sync_phones.ts: la guarda de corrida flaca", () => {
  // Medido 2026-09-24: la guarda contaba TODOS los modelos guardados (225, y crece: un modelo que deja
  // de venderse no se borra) contra los que ESTA corrida puede publicar con banda nueva (95 la
  // diaria, ~71 la horaria). La horaria falló todas las horas desde el 19/9 y la diaria pasaba por 5
  // modelos, con el umbral subiendo ~1,4 por día.
  it("compara contra lo guardado CON banda nueva publicable: la diaria con 1 de 2 publica", async () => {
    storeSnapshotState.storedPublishable = 2;
    setArgv();
    await main();
    expect(storeCalls.save).toHaveLength(1);
    expect(pricewatchCalls).toHaveLength(1);
  });

  it("menos del 40 % de lo publicable guardado sigue siendo un corte: no guarda nada", async () => {
    storeSnapshotState.storedPublishable = 3;
    setArgv();
    await expect(main()).rejects.toThrow(/se conserva el catálogo anterior/);
    expect(storeCalls.save).toHaveLength(0);
    expect(pricewatchCalls).toHaveLength(0);
  });

  it("la horaria que publicaría menos modelos que la diaria no pisa el catálogo, pero sí registra el historial por oferta", async () => {
    storeSnapshotState.storedPublishable = 2;
    setArgv("--fast");
    await main();
    expect(storeCalls.save).toHaveLength(0);
    expect(pricewatchCalls).toHaveLength(1);
  });

  it("la horaria que cubre lo mismo que la diaria sí publica", async () => {
    storeSnapshotState.storedPublishable = 1;
    setArgv("--fast");
    await main();
    expect(storeCalls.save).toHaveLength(1);
    expect(pricewatchCalls).toHaveLength(1);
  });
});
