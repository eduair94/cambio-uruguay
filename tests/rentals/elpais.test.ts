import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elpaisToRawRental, harvestElpais, parseElpaisResultsPage } from "../../classes/rentals/sources/elpais";
import { fetchJson } from "../../classes/rentals/net";
import { sourcesAllowingExpiry } from "../../classes/rentals/sources/types";

vi.mock("../../classes/rentals/net", () => ({ fetchJson: vi.fn(), sleep: vi.fn() }));
vi.mock("../../classes/rentals/sources/elpais_browser", () => ({ openSearchesWithBrowser: vi.fn(async () => new Map()) }));
vi.mock("node:fs", async () => {
  const original = await vi.importActual<typeof import("node:fs")>("node:fs");
  const provinces = ["MONTEVIDEO", "MALDONADO", "CANELONES", "SAN JOSE", "COLONIA", "PAYSANDU", "FLORIDA", "ROCHA", "RIVERA", "TACUAREMBO", "DURAZNO", "SORIANO", "ARTIGAS", "SALTO", "CERRO LARGO", "LAVALLEJA", "FLORES", "TREINTA Y TRES", "RIO NEGRO"];
  return {
    ...original,
    readFileSync: (...args: Parameters<typeof original.readFileSync>) => args[0] === "ep-pagination-fixture"
      ? JSON.stringify(Object.fromEntries(provinces.map((province, index) => [province, (index + 1).toString(16).padStart(16, "0")])))
      : original.readFileSync(...args),
    writeFileSync: (...args: Parameters<typeof original.writeFileSync>) => {
      if (args[0] !== "ep-pagination-fixture") original.writeFileSync(...args);
    },
  };
});

const base = {
  _id: "6a42b0f33b79e8db94e28523", title: "Apartamento en alquiler", transactionType: "rental",
  status: "active", province: "Maldonado", price: { amount: 550, currency: "USD" },
};

describe("El País offline period and metadata checks", () => {
  // Minimal period excerpts observed 2026-09-05; no full descriptions or contact records.
  it.each([
    ["6a41db4c3b79e8db94dc3ac7", "ALQUILER APTO PUNTA DEL ESTE", "Disponible a la fecha, segunda quincena de Enero 2026"],
    ["6a41f4373b79e8db94dcb41d", "mansa primera linea", "Disponible en alquiler en febrero 2023"],
    ["6a42b0f33b79e8db94e28523", "Apartamento en alquiler c/ cochera en Playa Mansa", "Disponible en alquiler invernal desde el 6 de abril al 30 de noviembre"],
  ])("rejects an explicitly bounded stay despite active rental classification: %s", (_id, title, description) => {
    expect(elpaisToRawRental({ ...base, _id, title, description })).toBeNull();
  });

  it.each([
    ["Alquiler anual", "Disponible en alquiler desde febrero de 2027"],
    ["Apartamento en alquiler", "Disponible desde febrero. Comedor diario y jardín de invierno."],
    ["Alquiler anual", "Disponible en alquiler en febrero 2027. Contrato de dos años."],
    ["Alquiler anual", "También se ofrece una opción para la segunda quincena de enero."],
  ])("keeps annual options and dates that describe the start of a tenancy: %s", (title, description) => {
    expect(elpaisToRawRental({ ...base, title, description })).toMatchObject({ price: 550, currency: "USD" });
  });

  it("does not turn the portal's import snapshot into a publication date or ignore withdrawal", () => {
    const row = { ...base, createdAt: "2026-09-05T06:00:00Z", snapshotDate: "2026-08-31" };
    expect(elpaisToRawRental(row)?.publishedAt).toBeNull();
    expect(elpaisToRawRental({ ...row, trashedAt: "2026-07-06T20:08:30.486Z" })).toBeNull();
    expect(elpaisToRawRental({ ...row, pausedByAdmin: true })).toBeNull();
  });

  it("reads only the public agency name and tolerates malformed image arrays", () => {
    expect(elpaisToRawRental({ ...base, sourceAgency: { provider: "elpais", id: "internal", raw: "ABATE" }, images: {} }))
      .toMatchObject({ sellerName: "ABATE", sellerType: "desconocido", image: null });
    expect(elpaisToRawRental({ ...base, sourceAgency: { provider: "elpais" }, images: [null] }))
      .toMatchObject({ sellerName: "Inmuebles El País", sellerType: "desconocido", image: null });
  });
});

describe("El País pagination cannot authorize expiry on incomplete evidence", () => {
  const row = (suffix: number) => ({ ...base, _id: suffix.toString(16).padStart(24, "0"), price: { amount: 20000, currency: "UYU" } });
  const response = (page: number, total: number, totalPages: number, rows: unknown[]) => ({
    success: true, data: { results: rows, pagination: { page, total, totalPages } },
  });
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("RENTALS_EP_CHATS_FILE", "ep-pagination-fixture"); });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    undefined,
    { page: 1, total: 2 },
    { page: 2, total: 2, totalPages: 2 },
    { page: 1, total: 2, totalPages: 0 },
    { page: 1, total: "", totalPages: 1 },
    { page: 1, total: 2, totalPages: 1.5 },
    { page: 1, total: -1, totalPages: 1 },
  ])("rejects absent, wrong-page or malformed metadata: %j", pagination => {
    expect(parseElpaisResultsPage({ success: true, data: { results: [row(1)], pagination } }, 1)).toBeNull();
  });

  it("accepts a proven empty department but rejects empty pages with outstanding results", () => {
    expect(parseElpaisResultsPage(response(1, 0, 0, []), 1)).toMatchObject({ total: 0, rows: [] });
    expect(parseElpaisResultsPage(response(1, 0, 1, []), 1)).toMatchObject({ total: 0, rows: [] });
    expect(parseElpaisResultsPage(response(1, 2, 2, []), 1)).toBeNull();
    expect(parseElpaisResultsPage(response(1, 0, 1, [row(1)]), 1)).toBeNull();
  });

  async function harvest(pages: Record<number, unknown>, mode: "full" | "fast" = "full") {
    vi.mocked(fetchJson).mockImplementation(async raw => {
      const url = new URL(raw);
      if (url.pathname.endsWith("/init")) return null;
      if (url.pathname.includes("/0000000000000001/")) return pages[Number(url.searchParams.get("page"))] as any;
      return response(1, 0, 0, []) as any;
    });
    return harvestElpais(mode, 41.5);
  }

  it("permits expiry only after complete distinct raw coverage, including parser exclusions", async () => {
    const run = await harvest({ 1: response(1, 3, 2, [row(1), { ...row(2), transactionType: "sale" }]), 2: response(2, 3, 2, [row(3)]) });
    expect(run.complete).toBe(true);
    expect(run.listings).toHaveLength(2);
    expect(sourcesAllowingExpiry([run], "full").has("elpais")).toBe(true);
  });

  it.each([
    ["repeated page with an advancing paginator", response(2, 3, 2, [row(1), row(2)])],
    ["partial overlap", response(2, 3, 2, [row(2), row(3)])],
    ["early empty last page", response(2, 3, 2, [])],
    ["wrong returned page", response(1, 3, 2, [row(3)])],
    ["total changed during pagination", response(2, 4, 2, [row(3), row(4)])],
    ["page count changed", response(2, 3, 3, [row(3)])],
    ["network failure", null],
  ])("preserves accepted adverts without expiry after %s", async (_label, lastPage) => {
    const run = await harvest({ 1: response(1, 3, 2, [row(1), row(2)]), 2: lastPage });
    expect(run.ok).toBe(true);
    expect(run.complete).toBe(false);
    expect(run.listings.map(listing => listing.listingId)).toContain(`elpais:${row(1)._id}`);
    expect(sourcesAllowingExpiry([run], "full").size).toBe(0);
  });

  it("does not certify a last page whose distinct ID count is below total", async () => {
    const run = await harvest({ 1: response(1, 4, 2, [row(1), row(2)]), 2: response(2, 4, 2, [row(3)]) });
    expect(run.listings).toHaveLength(3);
    expect(run.complete).toBe(false);
  });

  it("keeps hourly reads partial even when their first page is the whole result", async () => {
    const run = await harvest({ 1: response(1, 1, 1, [row(1)]) }, "fast");
    expect(run.ok).toBe(true);
    expect(run.complete).toBe(false);
  });
});
