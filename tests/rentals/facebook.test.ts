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

  it("reads the barrio from the advert's own title; the card only ever names a city", () => {
    // Measured 2026-09-22: 3.067 Marketplace offers, 93 % without a barrio, 100 % without a
    // coordinate, while 46 % of their titles name a known barrio or town.
    const buceo = toRawRental({ ...advert("1", "Montevideo, Uruguay"), title: "Alquiler de Apartamento en Buceo ( 1 Dormitorio)" }, "montevideo");
    expect(buceo).toMatchObject({ department: "Montevideo", neighborhood: "Buceo", latitude: null, longitude: null, address: "" });
    expect(toRawRental({ ...advert("2", "Montevideo, Uruguay"), title: "ALQUILER APARTAMENTO 3 DORMITORIOS, 2 BAÑOS EN TRES CRUCES" }, "montevideo")?.neighborhood).toBe("Tres Cruces");
    // A title with no known name leaves the barrio empty rather than guessing from the search anchor.
    expect(toRawRental({ ...advert("3", "Montevideo, Uruguay"), title: "Alquiler apartamento 2 dormitorios" }, "montevideo")?.neighborhood).toBe("");
    // A name that only exists in another department is not attributed to the card's city.
    expect(toRawRental({ ...advert("4", "Montevideo, Uruguay"), title: "Monoambiente en alquiler en Paso Carrasco" }, "montevideo"))
      .toMatchObject({ department: "Montevideo", neighborhood: "" });
  });

  it("lets a more specific title refine the card's town, and names a department only from a unique locality", () => {
    const solymar = toRawRental({ ...advert("1", "Ciudad De La Costa, Canelones, Uruguay"), title: "Alquiler apartamento en Solymar Sur" }, "montevideo");
    expect(solymar).toMatchObject({ department: "Canelones", neighborhood: "Solymar" });
    const kept = toRawRental({ ...advert("2", "Ciudad De La Costa, Canelones, Uruguay"), title: "Alquiler apartamento 2 dormitorios" }, "montevideo");
    expect(kept).toMatchObject({ department: "Canelones", neighborhood: "Ciudad De La Costa" });
    const piriapolis = toRawRental({ ...advert("3", null), title: "Alquiler anual casa 2 dormitorios Piriápolis" }, "maldonado");
    expect(piriapolis).toMatchObject({ department: "Maldonado", neighborhood: "Piriápolis" });
    expect(toRawRental({ ...advert("4", null), title: "Alquiler en Centro" }, "montevideo")).toMatchObject({ department: "", neighborhood: "" });
  });

  it("keeps what the item page taught: description, barrio, coordinate, guarantees", async () => {
    const detail = { description: "Casa en alquiler. Zona Piedras Blancas, a media cuadra de José Belloni. Garantía Anda o Porto. 2 dormitorios, 60 m2", pinCity: "Montevideo", latitude: -34.8412, longitude: -56.1421 };
    const raw = toRawRental({ ...advert("1", "Montevideo, Uruguay"), title: "Casa en alquiler", image: "https://scontent.example/x.jpg" }, "montevideo", detail)!;
    expect(raw).toMatchObject({ department: "Montevideo", neighborhood: "Piedras Blancas", latitude: -34.8412, longitude: -56.1421, bedrooms: 2, area: 60 });
    expect(raw.description).toContain("Piedras Blancas");
    expect(raw.details).toMatchObject({ description: expect.stringContaining("Belloni"), images: ["https://scontent.example/x.jpg"] });
    // "Porto" is Porto Seguro to the guarantee parser: an insurer, not a fund.
    expect(raw.guarantees).toEqual(expect.arrayContaining(["anda", "aseguradora"]));
    expect(raw.petsAllowed).toBeNull();
    // A page that was read but said nothing changes nothing; a card alone still has no coordinate.
    const silent = toRawRental({ ...advert("2", "Montevideo, Uruguay"), title: "Casa en alquiler" }, "montevideo", { description: "", pinCity: "Montevideo", latitude: null, longitude: null })!;
    expect(silent).toMatchObject({ neighborhood: "", latitude: null });
    expect(silent).not.toHaveProperty("details");
    expect(silent).not.toHaveProperty("description");
    // A corner's area, derived by the detail job, names a barrio the text did not.
    expect(toRawRental({ ...advert("5", "Montevideo, Uruguay"), title: "Alquilo apartamento" }, "montevideo", { description: "Sobre Juan Arteaga y José Revuelta", pinCity: "Montevideo", latitude: -34.858, longitude: -56.172, neighborhood: "Cerrito" }))
      .toMatchObject({ neighborhood: "Cerrito", latitude: -34.858 });
    // The pin's city fills a department the card lacked, never more.
    expect(toRawRental({ ...advert("3", null), title: "Alquiler 1 dormitorio en Centro" }, "montevideo", { description: "", pinCity: "Montevideo", latitude: null, longitude: null }))
      .toMatchObject({ department: "Montevideo", neighborhood: "Centro" });
    // The harvest asks the store for the cards it read and passes each its detail.
    vi.mocked(fetchJson).mockResolvedValue({ ok: true, results: [{ ...advert("7", "Montevideo, Uruguay"), title: "Casa en alquiler" }] });
    const details = vi.fn(async (ids: readonly string[]) => new Map(ids.map(id => [id, detail])));
    const result = await harvestFacebookMarketplace("fast", 41.5, { details });
    expect(details).toHaveBeenCalledWith(["facebook:7"]);
    expect(result.listings[0]).toMatchObject({ listingId: "facebook:7", neighborhood: "Piedras Blancas", latitude: -34.8412 });
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
    // Cards are deduplicated before conversion, so a rejected card counts once however many
    // searches returned it.
    expect(result.note).toContain("1 avisos únicos de 4 lecturas; 1 descartados");
    expect(vi.mocked(fetchJson).mock.calls.every(([url]) => new URL(url).searchParams.get("limit") === "120")).toBe(true);
  });
});
