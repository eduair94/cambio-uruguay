import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { parseCasaswebPage, casaswebSearchUrl, harvestCasasweb } from "../../classes/rentals/sources/casasweb";
import { elpaisCategoryUrls, elpaisToRawRental, extractElpaisRows, harvestElpais } from "../../classes/rentals/sources/elpais";
import { isPlausibleRent } from "../../classes/rentals/normalize";
import { toRawRental as infoCasas } from "../../classes/rentals/sources/infocasas";
import { fetchText } from "../../classes/rentals/net";
import { sourcesAllowingExpiry } from "../../classes/rentals/sources/types";
import { sameUnit } from "../../classes/rentals/dedupe";

vi.mock("../../classes/rentals/net", () => ({ fetchText: vi.fn() }));
const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", `${name}.html`), "utf8");
afterEach(() => vi.resetAllMocks());

describe("Casasweb's public monthly-rental cards", () => {
  it("keeps the rental price when the same card also advertises a sale", () => {
    const parsed = parseCasaswebPage(fixture("casasweb"))!;
    expect(parsed.total).toBe(52);
    expect(parsed.listings).toHaveLength(3);
    expect(parsed.listings[0]).toMatchObject({
      listingId: "casasweb:CW243972", currency: "USD", price: 1250,
      department: "Montevideo", neighborhood: "Carrasco", propertyType: "casa",
      bedrooms: 2, bathrooms: 3, area: 80, parkingSpaces: 1,
      sellerName: "Cooper Inmobiliaria", address: "", commonExpenses: null,
    });
    expect(parsed.listings[1]?.price).toBe(3000); // the sale is USD 480,000
    expect(isPlausibleRent(parsed.listings[2]!.price * 40, "casa")).toBe(false);
  });

  it("submits only the next public search button with server-issued form state", () => {
    const parsed = parseCasaswebPage(fixture("casasweb"))!;
    const body = new URLSearchParams(parsed.nextBody!);
    expect(body.get("__VIEWSTATE")).toBe("fixture-state");
    expect(body.get("ctl00$content$btnP1")).toBe("2");
    expect(body.has("ctl00$content$btnP0")).toBe(false);
    expect(body.get("ctl00$content$drpNegocio")).toBe("A");
    expect(casaswebSearchUrl(19, "c")).toBe("https://casasweb.com/resultados.aspx?m=0&n=A&t=c&x=19&z=0");
  });

  it("rejects challenge pages, sale searches, and reserved/seasonal listings", () => {
    expect(parseCasaswebPage("<title>Just a moment...</title>")).toBeNull();
    expect(parseCasaswebPage(fixture("casasweb").replace('selected value="A"', 'selected value="V"'))).toBeNull();
    const html = fixture("casasweb").replace("Alquiler Casa Carrasco 2 Dormitorios 3 Baños Garaje Osaka", "Alquiler temporal por noche");
    expect(parseCasaswebPage(html)!.listings).toHaveLength(2);
  });

  it("stops after three failed responses and cannot expire previous offers", async () => {
    vi.mocked(fetchText).mockResolvedValue(null);
    const run = await harvestCasasweb("full", 40);
    expect(fetchText).toHaveBeenCalledTimes(3);
    expect(run).toMatchObject({ ok: false, complete: false, listings: [] });
    expect(run.note).toContain("departamentos consultados: 1");
  });
});

describe("Inmuebles El País's offline public-page samples", () => {
  it("reassembles split Next Flight chunks without evaluating scripts", () => {
    const rows = extractElpaisRows(fixture("elpais"))!;
    expect(rows).toHaveLength(2);
    expect(elpaisToRawRental(rows[0])).toMatchObject({
      source: "elpais", price: 27500, currency: "UYU", bedrooms: 2, area: 58,
      department: "Montevideo", neighborhood: "CORDON", commonExpenses: null,
      streetNumber: "", publishedAt: null, furnished: null,
    });
    expect(elpaisToRawRental(rows[1])).toMatchObject({ commonExpenses: 4500, commonExpensesCurrency: "UYU" });
    expect(extractElpaisRows('<script>throw new Error("do not run me")</script>')).toBeNull();
  });

  it("retains only same-host permanent rental category URLs from the sitemap", () => {
    const urls = ["https://inmuebles.elpais.com.uy/alquiler/casas/canelones", "https://evil.test/alquiler/casas/canelones", "https://inmuebles.elpais.com.uy/api/properties", "https://inmuebles.elpais.com.uy/alquiler-temporario/casas/canelones", "https://user@inmuebles.elpais.com.uy/alquiler/casas/canelones", "https://inmuebles.elpais.com.uy/alquiler/casas/canelones#fragment"];
    expect(elpaisCategoryUrls(`<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join("")}</urlset>`)).toEqual([urls[0]]);
  });

  it.each(["full", "fast"] as const)("keeps %s external-only without network access or expiry", async mode => {
    const run = await harvestElpais(mode, 40);
    expect(run).toMatchObject({ key: "elpais", ok: false, complete: false, access: "external_only", listings: [] });
    expect(run.note).toBe("Consulta externa; actualización automática no habilitada por las condiciones del portal.");
    expect(fetchText).not.toHaveBeenCalled();
    expect([...sourcesAllowingExpiry([run], "full")]).toEqual([]);
  });

  it("does not convert missing expenses to zero or trust inferred amenities", () => {
    const base = extractElpaisRows(fixture("elpais"))![0] as any;
    expect(elpaisToRawRental({ ...base, expenses: { amount: null }, featureIds: ["FURNISHED", "PETS_ALLOWED"] })).toMatchObject({ commonExpenses: null, furnished: null, petsAllowed: null });
    expect(elpaisToRawRental({ ...base, expenses: { amount: 0 } })).toMatchObject({ commonExpenses: null, commonExpensesCurrency: null });
    expect(elpaisToRawRental({ ...base, expenses: { amount: 0 }, description: "Sin gastos comunes" })).toMatchObject({ commonExpenses: 0, commonExpensesCurrency: null });
    expect(elpaisToRawRental({ ...base, transactionType: "temporary_rental" })).toBeNull();
    expect(elpaisToRawRental({ ...base, status: "inactive" })).toBeNull();
  });

});

describe("explicit InfoCasas search amenities", () => {
  const base = { id: 123, title: "Apartamento en alquiler", link: "/apartamento/123", price: { amount: 25000, currency: { name: "UYU" } } };
  it("keeps positive garage counts and published furniture; absence stays unknown", () => {
    expect(infoCasas({ ...base, garage: 2, facilities: [{ id: 69, name: "Amueblada" }] })).toMatchObject({ parkingSpaces: 2, furnished: true });
    expect(infoCasas({ ...base, garage: 0, facilities: [] })).toMatchObject({ parkingSpaces: null, furnished: null, commonExpenses: null });
  });
  it("preserves explicit zero common expenses without coercing missing values", () => {
    expect(infoCasas({ ...base, commonExpenses: { amount: 0 } })).toMatchObject({ commonExpenses: 0 });
    expect(infoCasas({ ...base, commonExpenses: { amount: null } })).toMatchObject({ commonExpenses: null });
    expect(infoCasas({ ...base, commonExpenses: { amount: 4500 } })).toMatchObject({ commonExpenses: 4500, commonExpensesCurrency: null });
  });
  it("rejects a winter-only contract hidden in a normal rental category", () => {
    expect(infoCasas({ ...base, operation_type_id: 2, title: "Alquiler invernal en Punta del Este" })).toBeNull();
    expect(infoCasas({ ...base, operation_type_id: 2, description: "Alquiler invernal de abril a noviembre." })).toBeNull();
    expect(infoCasas({ ...base, operation_type_id: 2, title: "Alquiler anual", description: "Jardín de invierno." }))
      .toMatchObject({ listingId: "infocasas:123", price: 25000 });
  });
  it("does not merge otherwise matching units whose published parking counts conflict", () => {
    const raw = { ...infoCasas({ ...base, address: "18 de Julio 1500", bedrooms: 2, m2: 60 })!, priceUyu: 25000 };
    expect(sameUnit({ ...raw, parkingSpaces: 1 }, { ...raw, parkingSpaces: 2 })).toBe(false);
    expect(sameUnit({ ...raw, parkingSpaces: 1 }, { ...raw, parkingSpaces: null })).toBe(true);
  });
});

it("only full successful coverage may expire missing offers; an hourly slice never may", () => {
  const runs = [
    { key: "casasweb" as const, ok: true, complete: true, listings: [], note: "" },
    { key: "elpais" as const, ok: true, complete: false, listings: [], note: "" },
    { key: "infocasas" as const, ok: false, listings: [], note: "" },
    { key: "mercadolibre" as const, ok: true, listings: [], note: "coverage not declared" },
    { key: "facebook" as const, ok: true, complete: false, listings: [], note: "disabled or limited" },
  ];
  expect([...sourcesAllowingExpiry(runs, "full")]).toEqual(["casasweb"]);
  expect([...sourcesAllowingExpiry(runs, "fast")]).toEqual([]);
});
