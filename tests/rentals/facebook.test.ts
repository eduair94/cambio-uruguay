import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { harvestFacebookMarketplace, toRawRental } from "../../classes/rentals/sources/facebook";
import { fetchJson } from "../../classes/rentals/net";

vi.mock("../../classes/rentals/net", () => ({ fetchJson: vi.fn() }));
const advert = (id: string, location: string | null = "Colonia Del Sacramento, Colonia, Uruguay") => ({
  id, title: "Casa en alquiler anual", price: { amount: 20000, currency: "UYU" }, location,
});
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("Facebook partial coverage and source-owned location", () => {
  it.each(["Apartamento en alquiler", "ALQUILO CASA", "Alq. apartamento", "Alq: casa", "Arriendo casa anual"])("requires rental evidence on the card itself: %s", title => {
    expect(toRawRental({ ...advert("1"), title }, "montevideo")).not.toBeNull();
  });

  it.each(["Montevideo, Uruguay", "4 habitaciones 2 baños Casa", "Casa en venta", "No se alquila, sólo venta", "Sin opción de alquiler", "No es para alquiler", "Apartamento con renta"])("abstains on sale/automatic/negated titles, even within an alquiler search: %s", title => {
    expect(toRawRental({ ...advert("1"), title }, "montevideo")).toBeNull();
  });

  it("does not attribute the requested city to missing or unrecognized card locations", () => {
    expect(toRawRental(advert("1", null), "montevideo")?.department).toBe("");
    expect(toRawRental(advert("2", "Lugar no identificado"), "maldonado")?.department).toBe("");
    expect(toRawRental(advert("3", "Montevideo, Uruguay"), "colonia-del-sacramento")?.department).toBe("Montevideo");
    expect(toRawRental(advert("4"), "montevideo")?.department).toBe("Colonia");
  });

  it("adds the corroborated Colonia anchor only to the full sample; never claims completeness", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ ok: true, results: [advert("1")] });
    const result = await harvestFacebookMarketplace("full", 41.5);
    expect(fetchJson).toHaveBeenCalledTimes(24);
    expect(vi.mocked(fetchJson).mock.calls.filter(([url]) => new URL(url).searchParams.get("location") === "colonia-del-sacramento")).toHaveLength(4);
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(result.listings).toHaveLength(1);
    expect(result.note).toContain("24/24 consultas respondidas, 0 fallidas");
    expect(result.note).toContain("sugerencias de otras zonas");
    vi.mocked(fetchJson).mockClear();
    await harvestFacebookMarketplace("fast", 41.5);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchJson).mock.calls.every(([url]) => new URL(url).searchParams.get("location") === "montevideo")).toBe(true);
  });

  it("exposes partial failures without discarding accepted data or copying provider diagnostics", async () => {
    vi.mocked(fetchJson)
      .mockResolvedValueOnce({ ok: true, results: [advert("1")] })
      .mockResolvedValueOnce({ ok: false, results: [advert("2")], code: "FB_MARKETPLACE_SESSION_UNAVAILABLE", error: "private account diagnostic" });
    const result = await harvestFacebookMarketplace("fast", 41.5);
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(result.listings.map(row => row.listingId)).toEqual(["facebook:1"]);
    expect(result.note).toContain("1/2 consultas respondidas, 1 fallidas");
    expect(result.note).toContain("FB_MARKETPLACE_SESSION_UNAVAILABLE");
    expect(result.note).not.toContain("private account");
  });

  it("distinguishes a successful empty search from a broken session", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ ok: true, results: [] });
    expect(await harvestFacebookMarketplace("fast", 41.5)).toMatchObject({ ok: true, complete: false, listings: [] });
    vi.mocked(fetchJson).mockResolvedValue(null);
    const result = await harvestFacebookMarketplace("fast", 41.5);
    expect(result.ok).toBe(false);
    expect(result.note).toContain("0/2 consultas respondidas, 2 fallidas");
  });

  it("says why the bridge did not answer", async () => {
    // 2026-09-11 23:48 → 2026-09-12 16:16: sixteen hourly runs said only "sin respuesta del
    // servicio", which cannot tell a dead bridge from a slow one.
    vi.mocked(fetchJson).mockImplementation(async (_url: string, options?: { onFailure?: (reason: string) => void }) => {
      options?.onFailure?.("error de red ECONNREFUSED");
      return null;
    });
    const result = await harvestFacebookMarketplace("fast", 41.5);
    expect(result.ok).toBe(false);
    expect(result.note).toContain("último fallo: sin respuesta del servicio (error de red ECONNREFUSED)");
  });

  it("records rejected rows and keeps the advertised bound within the bridge limit", async () => {
    vi.stubEnv("RENTALS_FB_LIMIT", "500");
    vi.mocked(fetchJson).mockResolvedValue({ ok: true, results: [advert("1"), { ...advert("2"), title: "Busco alquiler" }] });
    const result = await harvestFacebookMarketplace("fast", 41.5);
    expect(result.listings).toHaveLength(1);
    expect(result.note).toContain("1 avisos únicos de 4 lecturas; 2 descartados");
    expect(vi.mocked(fetchJson).mock.calls.every(([url]) => new URL(url).searchParams.get("limit") === "120")).toBe(true);
  });
});
