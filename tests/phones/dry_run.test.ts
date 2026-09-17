// sync_phones.ts --dry-run must never write, and must work even with no APP DB configured at all.
// Every heavy dependency is mocked so this proves the CONTROL FLOW inside main() — the write calls
// sit behind `if (!dryRun)` — rather than re-testing buildPhoneCatalog/harvestRetail, which have
// their own suites. If a future edit moved a save call outside that guard, the mocked
// savePhoneCatalog/recordPricewatch below would record a call and these tests would fail.
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

const storeCalls = vi.hoisted(() => ({
  loadPrevious: 0,
  countStored: 0,
  save: [] as unknown[][],
  withHistory: 0,
}));
vi.mock("../../classes/phones/store", () => ({
  PHONE_META_KEY: "celulares-uruguay",
  loadPreviousPhones: async () => {
    storeCalls.loadPrevious++;
    return new Map();
  },
  // 0 stored: the thin-run guard's relative check (`publishable < stored * 0.4`) only engages when
  // `stored > 0` — this keeps the fixture's single FAKE_MODEL from tripping it regardless of the
  // scenario under test, which is the write gate, not the guard's own arithmetic (that lives in
  // classes/equipar/catalog.ts's tests for the equivalent equipar guard).
  countStoredPhones: async () => {
    storeCalls.countStored++;
    return 0;
  },
  withPhoneHistory: (models: unknown[]) => {
    storeCalls.withHistory++;
    return models;
  },
  savePhoneCatalog: async (...args: unknown[]) => {
    storeCalls.save.push(args);
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
vi.mock("../../classes/phones/catalog", () => ({
  buildPhoneCatalog: () => [FAKE_MODEL],
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

beforeEach(() => {
  appDbState.configured = true;
  appConnectionCalls.length = 0;
  storeCalls.loadPrevious = 0;
  storeCalls.countStored = 0;
  storeCalls.save.length = 0;
  storeCalls.withHistory = 0;
  pricewatchCalls.length = 0;
  process.argv = ORIGINAL_ARGV;
});

describe("sync_phones.ts --dry-run", () => {
  it("con --dry-run y SIN APP_MONGO_URI: no carga lo guardado, no cuenta, no guarda, no graba pricewatch, nunca conecta", async () => {
    appDbState.configured = false;
    setArgv("--dry-run", "--fast");
    await main();
    expect(storeCalls.loadPrevious).toBe(0);
    expect(storeCalls.countStored).toBe(0);
    expect(storeCalls.save).toHaveLength(0);
    expect(pricewatchCalls).toHaveLength(0);
    expect(appConnectionCalls).toHaveLength(0);
  });

  it("con --dry-run y CON APP_MONGO_URI: carga lo guardado y cuenta igual, pero sigue sin guardar ni grabar pricewatch", async () => {
    appDbState.configured = true;
    setArgv("--dry-run");
    await main();
    expect(storeCalls.loadPrevious).toBe(1);
    expect(storeCalls.countStored).toBe(1);
    expect(storeCalls.save).toHaveLength(0);
    expect(pricewatchCalls).toHaveLength(0);
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
