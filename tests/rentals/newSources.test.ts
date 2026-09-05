import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { parseCasaswebPage, casaswebSearchUrl, harvestCasasweb } from "../../classes/rentals/sources/casasweb";
import { elpaisCategoryUrls, elpaisToRawRental, extractElpaisRows, harvestElpais } from "../../classes/rentals/sources/elpais";
import { isPlausibleRent } from "../../classes/rentals/normalize";
import { toRawRental as infoCasas } from "../../classes/rentals/sources/infocasas";
import { fetchJson, fetchText } from "../../classes/rentals/net";
import { sourcesAllowingExpiry } from "../../classes/rentals/sources/types";
import { sameUnit } from "../../classes/rentals/dedupe";
import { openSearchesWithBrowser } from "../../classes/rentals/sources/elpais_browser";

// `sleep` is stubbed out, not shortened: El País paces the searches it has to OPEN seven seconds
// apart, and a suite that actually waited would take two minutes to assert nothing about waiting.
vi.mock("../../classes/rentals/net", () => ({ fetchText: vi.fn(), fetchJson: vi.fn(), sleep: vi.fn(async () => {}) }));
// Chrome never starts in the unit suite. The fallback is asserted by what the harvester ASKS it
// for and what it does with the answer, which is the part that can break.
vi.mock("../../classes/rentals/sources/elpais_browser", () => ({ openSearchesWithBrowser: vi.fn(async () => new Map<string, string>()) }));
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

  /**
   * The authorised harvest. Two endpoints: one `init` per department that opens a saved search,
   * then `results` pages against the chat id it returns. The fake below answers both and lets each
   * test say how many rows and pages a department has.
   */
  const elpaisRow = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...(extractElpaisRows(fixture("elpais"))![0] as Record<string, unknown>),
    _id: id.padStart(24, "0"),
    ...extra,
  });

  interface Plan { rowsPerPage?: number; totalPages?: number; initFails?: boolean; pageFails?: number }

  const serveElpais = (plan: Plan = {}): { inits: FormData[]; urls: string[] } => {
    const inits: FormData[] = [];
    const urls: string[] = [];
    let chats = 0;
    vi.mocked(fetchJson).mockImplementation(async (url: string, options: any = {}) => {
      if (url.endsWith("/api/chat/init")) {
        inits.push(options.body as FormData);
        if (plan.initFails) return null;
        chats++;
        return { success: true, data: { chatId: `0000000${chats}-0000-4000-8000-00000000000${chats}` } } as any;
      }
      urls.push(url);
      const page = Number(new URL(url).searchParams.get("page"));
      if (plan.pageFails && page >= plan.pageFails) return null;
      const rows = Array.from({ length: plan.rowsPerPage ?? 2 }, (_, index) => elpaisRow(`${chats}${page}${index}`));
      return { success: true, data: { results: rows, pagination: { page, totalPages: plan.totalPages ?? 1 } } } as any;
    });
    return { inits, urls };
  };

  const province = (form: FormData): string => JSON.parse(String(form.get("manualFilters"))).zones.province;

  // Every test starts with NO saved searches: the cache path points inside a directory that does
  // not exist, so the read finds nothing and the write is swallowed. The reuse case below writes a
  // real file of its own.
  const noCache = join(tmpdir(), "cambio-uruguay-elpais-tests-absent", "chats.json");
  const cacheFile = join(tmpdir(), "cambio-uruguay-elpais-tests-chats.json");
  beforeEach(() => vi.stubEnv("RENTALS_EP_CHATS_FILE", noCache));
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(cacheFile, { force: true });
  });

  it("opens one authorised search per department and declares full coverage", async () => {
    const { inits, urls } = serveElpais({ rowsPerPage: 3, totalPages: 2 });
    const run = await harvestElpais("full", 40);

    expect(inits).toHaveLength(19);
    expect(new Set(inits.map(province)).size).toBe(19);
    // Biggest first, because only about three searches get opened per run: alphabetical would
    // spend them on Artigas (1 advert) and Cerro Largo (none).
    expect(inits.slice(0, 3).map(province)).toEqual(["MONTEVIDEO", "MALDONADO", "CANELONES"]);
    // The anchor is the department, not its capital: "Colonia del Sacramento" narrows the search
    // to that city and loses the rest of the province.
    expect(JSON.parse(String(inits[3]!.get("anchorLocation"))).name).toBe("Colonia");
    // Developments are for sale. A rental index does not ask for them.
    expect(inits[0]!.get("includeProjects")).toBe("false");
    expect(urls).toHaveLength(38);
    expect(urls[0]).toContain("page=1&limit=500");
    expect(urls[0]).not.toContain("sort=");
    expect(run).toMatchObject({ key: "elpais", ok: true, complete: true, listings: expect.any(Array) });
    expect(run.access).toBeUndefined();
    expect(run.note).toContain("departamentos consultados: 19 de 19");
    expect([...sourcesAllowingExpiry([run], "full")]).toEqual(["elpais"]);
  });

  it("reuses the saved searches it already has and opens none", async () => {
    const saved = Object.fromEntries(
      ["ARTIGAS", "CANELONES", "CERRO LARGO", "COLONIA", "DURAZNO", "FLORES", "FLORIDA", "LAVALLEJA", "MALDONADO",
        "MONTEVIDEO", "PAYSANDU", "RIO NEGRO", "RIVERA", "ROCHA", "SALTO", "SAN JOSE", "SORIANO", "TACUAREMBO",
        "TREINTA Y TRES"].map((code, index) => [code, `0000000${index % 9}-0000-4000-8000-00000000000${index % 9}`])
    );
    writeFileSync(cacheFile, JSON.stringify(saved), "utf8");
    vi.stubEnv("RENTALS_EP_CHATS_FILE", cacheFile);

    const { inits, urls } = serveElpais();
    const run = await harvestElpais("full", 40);

    // Opening a search is an AI call on the portal's side. A run that already has the ids makes none.
    expect(inits).toHaveLength(0);
    expect(urls).toHaveLength(19);
    expect(run.complete).toBe(true);
    expect(run.note).toContain("departamentos consultados: 19 de 19");
  });

  it("re-opens a search the portal has forgotten and stores the new id", async () => {
    writeFileSync(cacheFile, JSON.stringify({ MONTEVIDEO: "dead0000-0000-4000-8000-00000000dead" }), "utf8");
    vi.stubEnv("RENTALS_EP_CHATS_FILE", cacheFile);

    const dead = "dead0000-0000-4000-8000-00000000dead";
    const { inits } = serveElpais();
    const live = vi.mocked(fetchJson).getMockImplementation()!;
    vi.mocked(fetchJson).mockImplementation(async (url: string, options?: any) =>
      url.includes(dead) ? null : live(url, options));

    await harvestElpais("fast", 40);
    // Canelones and Maldonado had no id; Montevideo's was stale. All three end up opened.
    expect(inits.map(province)).toEqual(["MONTEVIDEO", "MALDONADO", "CANELONES"]);
    expect(JSON.parse(readFileSync(cacheFile, "utf8")).MONTEVIDEO).not.toBe(dead);
  });

  it("limits the hourly pass to the three live departments and never claims coverage", async () => {
    const { inits, urls } = serveElpais({ totalPages: 9 });
    const run = await harvestElpais("fast", 40);

    expect(inits.map(province)).toEqual(["MONTEVIDEO", "MALDONADO", "CANELONES"]);
    expect(urls).toHaveLength(3);
    expect(urls.every(url => url.includes("sort=newest"))).toBe(true);
    expect(run.complete).toBe(false);
    expect(run.note).toContain("repaso horario");
    // A partial pass must never let an unseen advert expire, not even inside a full sweep's set.
    expect([...sourcesAllowingExpiry([run], "full")]).toEqual([]);
  });

  it("hands the challenged searches to the browser after three plain refusals", async () => {
    const { inits } = serveElpais({ initFails: true });
    const run = await harvestElpais("full", 40);

    // Plain HTTP gets three tries — it is free when it works. The other 16 go to the browser in
    // ONE handover, not one launch each.
    expect(inits).toHaveLength(3);
    expect(openSearchesWithBrowser).toHaveBeenCalledTimes(1);
    const handed = vi.mocked(openSearchesWithBrowser).mock.calls[0]![0].map(search => search.province);
    expect(handed).toHaveLength(19);
    // The three plain HTTP was refused on are handed over TOO. They were not tried and rejected,
    // they were challenged, and the browser is the thing that answers a challenge.
    expect(handed[0]).toBe("MONTEVIDEO");

    // The browser found nothing either: every department is a hole in the sweep, not an empty one.
    expect(run).toMatchObject({ ok: false, complete: false, listings: [] });
    expect(run.note).toContain("19 búsquedas sin abrir");
    expect(run.note).toContain("departamentos consultados: 0 de 19");
    expect([...sourcesAllowingExpiry([run], "full")]).toEqual([]);
  });

  it("reads what the browser opened and stays partial while any is still missing", async () => {
    serveElpais({ initFails: true });
    // Chrome answers the challenge for ten of the nineteen and gives up on the rest.
    vi.mocked(openSearchesWithBrowser).mockImplementation(async searches =>
      new Map(searches.slice(0, 10).map((search, index) => [search.province, `b000000${index}-0000-4000-8000-00000000000${index}`])));

    const run = await harvestElpais("full", 40);

    expect(run.ok).toBe(true);
    expect(run.listings.length).toBeGreaterThan(0);
    expect(run.note).toContain("10 abiertas con navegador");
    expect(run.note).toContain("departamentos consultados: 10 de 19");
    expect(run.note).toContain("9 búsquedas sin abrir");
    // Nine departments never opened, so nothing may expire on this run's evidence.
    expect(run.complete).toBe(false);
    expect([...sourcesAllowingExpiry([run], "full")]).toEqual([]);
  });

  it("skips the browser entirely when plain HTTP opened everything", async () => {
    serveElpais();
    await harvestElpais("full", 40);
    expect(openSearchesWithBrowser).not.toHaveBeenCalled();
  });

  it("stops claiming coverage when a department has more pages than the budget", async () => {
    serveElpais({ totalPages: 999 });
    const run = await harvestElpais("full", 40);
    expect(run.complete).toBe(false);
    expect(run.note).toContain("cobertura parcial");
  });

  it("returns to external consultation when the operator's permission is withdrawn", async () => {
    vi.stubEnv("RENTALS_ELPAIS_ENABLED", "0");
    vi.resetModules();
    const [{ harvestElpais: disabled }, net] = await Promise.all([
      import("../../classes/rentals/sources/elpais"),
      import("../../classes/rentals/net"),
    ]);
    const run = await disabled("full", 40);
    expect(run).toMatchObject({ key: "elpais", ok: false, complete: false, access: "external_only", listings: [] });
    expect(net.fetchJson).not.toHaveBeenCalled();
    expect(net.fetchText).not.toHaveBeenCalled();
    expect([...sourcesAllowingExpiry([run], "full")]).toEqual([]);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never copies the agency's phone or e-mail into the index", async () => {
    const row = elpaisRow("1", {
      contact: { company: "VARELA INM", phone: "095110110" },
      sourceAgency: { provider: "elpais", id: "1001084", raw: "VARELA INM", emails: ["casacentral@ejemplo.com"] },
    });
    const listing = elpaisToRawRental(row)!;
    expect(listing.sellerName).toBe("VARELA INM");
    expect(listing.sellerType).toBe("inmobiliaria");
    const serialised = JSON.stringify(listing);
    expect(serialised).not.toContain("095110110");
    expect(serialised).not.toContain("ejemplo.com");
  });

  it("reads the portal's structured guarantees and drops the codes it cannot name", async () => {
    expect(elpaisToRawRental(elpaisRow("2", {
      rentalGuarantees: [{ type: "porto_seguros" }, { type: "anda" }, { type: "cgn" }, { type: "mvotma" }],
      guaranteesAccepted: ["bhu"],
      description: "Apartamento en alquiler",
    }))!.guarantees).toEqual(["anda", "contaduria", "aseguradora", "bhu"]);
    // No structured field and no phrase in the text is an empty list, never a guess.
    expect(elpaisToRawRental(elpaisRow("3", { rentalGuarantees: [], guaranteesAccepted: null, description: "Apartamento en alquiler" }))!.guarantees).toEqual([]);
  });

  it("drops adverts whose monthly price cannot be a rent", async () => {
    serveElpais({ rowsPerPage: 1 });
    vi.mocked(fetchJson).mockImplementation(async (url: string) => {
      if (url.endsWith("/api/chat/init")) return { success: true, data: { chatId: "00000001-0000-4000-8000-000000000001" } } as any;
      return {
        success: true,
        data: {
          results: [elpaisRow("4", { price: { amount: 120_000_000, currency: "UYU" } }), elpaisRow("5")],
          pagination: { page: 1, totalPages: 1 },
        },
      } as any;
    });
    const run = await harvestElpais("full", 40);
    // Same advert id in all 19 departments plus one absurd rent: one row survives.
    expect(run.listings).toHaveLength(1);
    expect(run.listings[0]!.listingId).toBe("elpais:000000000000000000000005");
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
