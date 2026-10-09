import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  alquileresUyAdvertUrl,
  alquileresUySearchBody,
  alquileresUyToRawRental,
  harvestAlquileresUy,
  parseAlquileresUyDetail,
  parseAlquileresUyResults,
  type AlquileresUyCard,
  type AlquileresUyDetail,
} from "../../classes/rentals/sources/alquileresuy";

// The fixtures are trimmed copies of what the site answered on 2026-10-09, stored as UTF-8. The
// site itself speaks ISO-8859-1, and every character in them fits Latin-1, so `latin1` bytes are
// exactly what the server sent.
const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", name), "utf8");
const bytes = (text: string): Buffer => Buffer.from(text, "latin1");
const NOW = new Date("2026-10-09T12:00:00.000Z");
const USD = 41;

function card(ref: string, text = fixture("alquileresuy-ap.txt")): AlquileresUyCard {
  const found = parseAlquileresUyResults(text)!.cards.find(row => row.ref === ref);
  if (!found) throw new Error(`no card ${ref}`);
  return found;
}

function detailOf(html: string): AlquileresUyDetail {
  const detail = parseAlquileresUyDetail(html);
  if (!detail?.found) throw new Error("no advert page");
  return detail;
}

describe("alquileres.uy URLs and search form", () => {
  it("links each advert to its own page on ver.uy, the address the site shares", () => {
    expect(alquileresUyAdvertUrl("696AP1642")).toBe("https://696apa1642.ver.uy/");
    expect(alquileresUyAdvertUrl("0F8CAPP12269")).toBe("https://0f8caapp12269.ver.uy/");
    // A ref that cannot be a host label never becomes a link.
    expect(alquileresUyAdvertUrl("12.AP 4")).toBeNull();
    expect(alquileresUyAdvertUrl("")).toBeNull();
  });

  it("posts the site's default radios with one annual-rental category", () => {
    const body = new URLSearchParams(alquileresUySearchBody("ca"));
    expect(body.get("op")).toBe("a");
    expect(body.get("inmueble")).toBe("ca");
    expect(body.get("inmueble_fav")).toBe("CA");
    expect(body.get("idinmo")).toBe("G10");
    expect(body.get("nresultados")).toBe("500");
    // Without the default radios the search answers zero results.
    expect(body.get("moneda")).toBe("2");
    expect(body.get("distanciamar")).toBe("-1");
  });
});

describe("alquileres.uy search results", () => {
  it("reads the total, every card and the map pins", () => {
    const parsed = parseAlquileresUyResults(fixture("alquileresuy-ap.txt"))!;
    expect(parsed.total).toBe(9);
    expect(parsed.cards).toHaveLength(9);
    expect(parsed.pins.get("696AP1226")).toEqual({ latitude: -34.88131661414981, longitude: -56.163788298783416, agency: "Abacos" });
    expect(parsed.pins.has("111AP571")).toBe(false);
  });

  it("reads an apartment card: price, place, stats, expenses, garage and the update date", () => {
    expect(card("111AP571")).toMatchObject({
      agency: "ANTIBES", price: 2150, currency: "USD",
      zone: "MONTEVIDEO", barrio: "PUNTA CARRETAS", note: "JULIO MARÍA SOSA Y PATRIA",
      bedrooms: 2, bathrooms: 2, area: 130, landArea: null,
      commonExpenses: 17650, parkingSpaces: 1, updatedOn: "2023-12-28", reserved: false,
      photo: "https://www.buscandocasa.com/fotos/111/111AP571_320.jpg",
    });
  });

  it("reads an offer price, a monoambiente and a coast zone", () => {
    expect(card("007AP02102")).toMatchObject({
      price: 31500, currency: "UYU", zone: "CD. DE LA COSTA", barrio: "BARRA CARRASCO",
      bedrooms: 0, bathrooms: 1, area: 30, commonExpenses: 3500, updatedOn: "2026-07-28",
    });
  });

  it("keeps an explicit 'no common expenses' apart from an unknown one", () => {
    expect(card("111AP607").commonExpenses).toBe(0);
    expect(card("259AP5010").commonExpenses).toBeNull();
  });

  it("reads houses: built and land area, carport, reserved marks and a zone without barrio", () => {
    const houses = fixture("alquileresuy-ca.txt");
    expect(card("0Y6CABUCCA1", houses)).toMatchObject({
      price: 6000, currency: "USD", bedrooms: 8, bathrooms: 4, area: 227, landArea: 400, parkingSpaces: 1,
    });
    expect(card("007CA02106", houses).reserved).toBe(true);
    expect(card("0Y6CA1222olg", houses)).toMatchObject({ parkingSpaces: 2, note: "BV. JOSÉ BATLLE Y ORDÓÑEZ 2670" });
    expect(card("189CAPRG", houses)).toMatchObject({ zone: "LA PAZ", barrio: "" });
    expect(card("GUYCA1140", houses).commonExpenses).toBe(800);
  });

  it("reads the surface of shops and plots", () => {
    expect(card("950LO0426", fixture("alquileresuy-lo.txt")).area).toBe(926);
    expect(card("950TE262606", fixture("alquileresuy-te.txt"))).toMatchObject({ area: 440, bedrooms: null, bathrooms: null });
  });

  it("reads the cards whatever view index the server appends to their classes", () => {
    // Our search sends fewer form fields than the browser, and the server then prints
    // "div_resultados_ap_0_" (no trailing index) with CRLF line ends — measured live on 2026-10-09.
    const live = fixture("alquileresuy-ap.txt").replace(/(resultados(?:_lugar)?_(?:[a-z]{2}_)?\d_)\d/g, "$1").replace(/\n/g, "\r\n");
    const parsed = parseAlquileresUyResults(live)!;
    expect(parsed.cards).toHaveLength(9);
    expect(parsed.cards[0]).toMatchObject({ ref: "111AP571", barrio: "PUNTA CARRETAS", bedrooms: 2, area: 130 });
  });

  it("treats the site's own 'nothing found' answer as an empty search, not a broken page", () => {
    const empty = "0||\n\t<div id=\"r_resultados\"><h2>No disponemos de inmuebles que cumplan sus condiciones de b&uacute;squeda.</h2></div>";
    expect(parseAlquileresUyResults(empty)).toEqual({ total: 0, cards: [], pins: new Map() });
    expect(parseAlquileresUyResults("<html>Service Unavailable</html>")).toBeNull();
  });

  it("does not invent a price when the agency asks to consult it", () => {
    const text = fixture("alquileresuy-ap.txt").replace("US$ 2.150", "CONSULTAR");
    expect(card("111AP571", text)).toMatchObject({ price: null, currency: null });
  });
});

describe("alquileres.uy advert page", () => {
  it("reads guarantees, surfaces, amenities, department and photos, and drops contact data", () => {
    const detail = detailOf(fixture("alquileresuy-ficha.html"));
    expect(detail.found).toBe(true);
    expect(detail.ref).toBe("0z8caa1793");
    expect(detail.guarantees).toEqual(["aseguradora"]);
    expect(detail.guaranteeText).toBe("PORTO SEGURO, SURA, SANCOR");
    expect(detail.department).toBe("Canelones");
    expect(detail.location).toBe("PRÓXIMO A PLAYA Y SERVICIOS., MÉDANOS SOLYMAR, CD. DE LA COSTA");
    expect(detail).toMatchObject({ builtArea: 50, landArea: 200, transfer: false, furnished: false, commonExpenses: 0 });
    expect(detail.amenities).toEqual(expect.arrayContaining(["Lavadero", "Jardín"]));
    expect(detail.amenities).not.toContain("Propiedad Horizontal");
    expect(detail.description).toContain("Casa desarrollada en 2 plantas");
    expect(detail.description).toContain("PORTO SEGURO U OTRAS ASEGURADORAS");
    expect(detail.description).not.toMatch(/099\s?123\s?456/);
    expect(detail.images).toHaveLength(3);
    expect(detail.images[0]).toMatch(/^https:\/\/www\.buscandocasa\.com\/fotostemp\/0Z8CA1793_\d+_\d+\.jpg$/);
  });

  it("says when the advert no longer exists", () => {
    expect(parseAlquileresUyDetail("No existe")).toEqual({ found: false });
    expect(parseAlquileresUyDetail("<html><body>Error</body></html>")).toBeNull();
  });
});

describe("alquileres.uy cards as directory rows", () => {
  const ctx = { usdUyu: USD, now: NOW, maxAgeDays: 180, observedAt: NOW.toISOString() };

  it("publishes a fresh apartment with its pin, never the update date as a publication date", () => {
    const parsed = parseAlquileresUyResults(fixture("alquileresuy-ap.txt"))!;
    const { rental } = alquileresUyToRawRental(card("696AP1226"), "apartamento", { ...ctx, pin: parsed.pins.get("696AP1226") });
    expect(rental).toMatchObject({
      source: "alquileresuy", listingId: "alquileresuy:696AP1226", url: "https://696apa1226.ver.uy/",
      title: "Apartamento de 3 dormitorios en alquiler en La Blanqueada",
      price: 35900, currency: "UYU", commonExpenses: 7800, commonExpensesCurrency: "UYU",
      department: "Montevideo", neighborhood: "La Blanqueada", propertyType: "apartamento",
      latitude: -34.88131661414981, longitude: -56.163788298783416,
      sellerName: "Abacos", sellerType: "inmobiliaria", publishedAt: null,
      address: "", street: "", streetNumber: "",
    });
  });

  it("places the coast zones in their department and keeps the town apart from the barrio", () => {
    const { rental } = alquileresUyToRawRental(card("007AP02102"), "apartamento", ctx);
    expect(rental).toMatchObject({
      department: "Canelones", locality: "Ciudad de la Costa", neighborhood: "Barra Carrasco",
      bedrooms: 0, title: "Monoambiente en alquiler en Barra Carrasco",
    });
    const houses = fixture("alquileresuy-ca.txt");
    expect(alquileresUyToRawRental(card("0F8CAPP122193", houses), "casa", ctx).rental).toMatchObject({
      department: "Canelones", neighborhood: "Pque. Plata Sur",
    });
    expect(alquileresUyToRawRental(card("033CA03356", houses), "casa", ctx).rental).toMatchObject({
      department: "Maldonado", locality: "Piriápolis", neighborhood: "Cerro del Toro",
    });
  });

  it("names the agency the way the platform spells it, and keeps short acronyms", () => {
    const houses = fixture("alquileresuy-ca.txt");
    expect(alquileresUyToRawRental(card("033CA03356", houses), "casa", ctx).rental!.sellerName).toBe("Noel");
    expect(alquileresUyToRawRental(card("885CA866", houses), "casa", ctx).rental!.sellerName).toBe("IA");
    expect(alquileresUyToRawRental(card("0F8CAPP122193", houses), "casa", ctx).rental!.sellerName).toBe("Moreno");
  });

  it("drops what nobody updated in half a year, reserved homes and unpriced cards", () => {
    expect(alquileresUyToRawRental(card("111AP571"), "apartamento", ctx)).toEqual({ rental: null, reason: "stale" });
    const houses = fixture("alquileresuy-ca.txt");
    expect(alquileresUyToRawRental(card("007CA02106", houses), "casa", ctx)).toEqual({ rental: null, reason: "reserved" });
    const consult = { ...card("696AP1226"), price: null, currency: null };
    expect(alquileresUyToRawRental(consult, "apartamento", ctx)).toEqual({ rental: null, reason: "price" });
  });

  it("only takes a door number that cannot be a numbered street", () => {
    const base = card("696AP1226");
    const address = (note: string) => alquileresUyToRawRental({ ...base, note }, "apartamento", ctx).rental!;
    expect(address("MONTERO 3104")).toMatchObject({ address: "Montero 3104", street: "montero", streetNumber: "3104" });
    // "Calle 77" is a street in Solymar, not door 77 of a street called "calle".
    expect(address("CALLE 77")).toMatchObject({ address: "", street: "", streetNumber: "" });
    expect(address("JULIO MARÍA SOSA Y PATRIA")).toMatchObject({ address: "", streetNumber: "" });
  });

  it("enriches the row with the advert page: description, guarantees, surfaces and amenities", () => {
    const detail = detailOf(fixture("alquileresuy-ficha.html"));
    const house = { ...card("885CA866", fixture("alquileresuy-ca.txt")), area: null };
    const { rental } = alquileresUyToRawRental(house, "casa", { ...ctx, detail });
    expect(rental!.guarantees).toEqual(["aseguradora"]);
    expect(rental!.area).toBe(50);
    expect(rental!.details).toMatchObject({ builtArea: 50, landArea: 200, guaranteeText: "PORTO SEGURO, SURA, SANCOR" });
    expect(rental!.details!.amenities).toEqual(expect.arrayContaining(["Lavadero", "Jardín"]));
    expect(rental!.description).toContain("Casa desarrollada en 2 plantas");
    expect(rental!.details!.images).toHaveLength(3);
  });

  it("names a lease transfer in the title so the budget view can tell it apart", () => {
    const detail = { ...detailOf(fixture("alquileresuy-ficha.html")), transfer: true };
    const { rental } = alquileresUyToRawRental(card("696AP1226"), "apartamento", { ...ctx, detail });
    expect(rental!.title).toBe("Traspaso: Apartamento de 3 dormitorios en alquiler en La Blanqueada");
  });

  it("rejects a seasonal stay the advert itself describes", () => {
    const detail = { ...detailOf(fixture("alquileresuy-ficha.html")), description: "Alquiler por temporada, primera quincena de enero." };
    expect(alquileresUyToRawRental(card("696AP1226"), "apartamento", { ...ctx, detail }).reason).toBe("stay");
  });

  it("keeps a winter contract, which quotes a month's rent", () => {
    const detail = { ...detailOf(fixture("alquileresuy-ficha.html")), description: "Alquiler invernal de marzo a diciembre." };
    expect(alquileresUyToRawRental(card("696AP1226"), "apartamento", { ...ctx, detail }).rental).not.toBeNull();
  });

  it("passes a ticked 'Amueblado' as the portal's own field", () => {
    const detail = { ...detailOf(fixture("alquileresuy-ficha.html")), furnished: true };
    expect(alquileresUyToRawRental(card("696AP1226"), "apartamento", { ...ctx, detail }).rental).toMatchObject({
      furnished: true, furnishedPortal: true,
    });
    const plain = alquileresUyToRawRental(card("696AP1226"), "apartamento", ctx).rental!;
    expect(plain.furnished).toBeNull();
    expect(plain.furnishedPortal).toBeUndefined();
  });
});

describe("harvestAlquileresUy", () => {
  const EMPTY = "0||<div><h2>No disponemos de inmuebles que cumplan sus condiciones de b&uacute;squeda.</h2></div>";
  const searches: Record<string, string> = {
    ap: fixture("alquileresuy-ap.txt"),
    ca: fixture("alquileresuy-ca.txt"),
    lo: fixture("alquileresuy-lo.txt"),
    te: fixture("alquileresuy-te.txt"),
  };

  function fetcher(overrides: Record<string, string | null> = {}) {
    return vi.fn(async (url: string, options: { body?: string; throttleKey?: string } = {}) => {
      if (url.startsWith("http://alquileres.uy/")) {
        const code = new URLSearchParams(String(options.body)).get("inmueble") || "";
        if (code in overrides) return overrides[code] === null ? null : bytes(overrides[code]!);
        return bytes(searches[code] ?? EMPTY);
      }
      expect(options.throttleKey).toBe("ver.uy");
      if (url === "https://885caa866.ver.uy/") return bytes("No existe");
      if (url === "https://696apa1226.ver.uy/") return bytes(fixture("alquileresuy-ficha.html").replaceAll("0z8caa1793", "696apa1226"));
      // Another advert's page, as a misrouted answer would be: it must not enrich this card.
      if (url === "https://696apa1642.ver.uy/") return bytes(fixture("alquileresuy-ficha.html"));
      return null;
    });
  }

  it("reads nothing in the hourly run", async () => {
    const fetchBuffer = fetcher();
    const run = await harvestAlquileresUy("fast", USD, { fetchBuffer, now: () => NOW, env: {} });
    expect(run).toMatchObject({ key: "alquileresuy", ok: true, complete: false, listings: [], note: "sólo en la corrida completa" });
    expect(fetchBuffer).not.toHaveBeenCalled();
  });

  it("can be switched off without a deploy", async () => {
    const fetchBuffer = fetcher();
    const run = await harvestAlquileresUy("full", USD, { fetchBuffer, now: () => NOW, env: { RENTALS_AU_ENABLED: "0" } });
    expect(run).toMatchObject({ ok: true, complete: false, listings: [] });
    expect(fetchBuffer).not.toHaveBeenCalled();
  });

  it("reads every category, drops withdrawn adverts and declares a complete sweep", async () => {
    const fetchBuffer = fetcher();
    const run = await harvestAlquileresUy("full", USD, { fetchBuffer, now: () => NOW, env: {} });
    expect(run.key).toBe("alquileresuy");
    expect(run.ok).toBe(true);
    expect(run.complete).toBe(true);
    const ids = run.listings.map(row => row.listingId);
    expect(ids).toContain("alquileresuy:696AP1226");
    expect(ids).toContain("alquileresuy:007AP02102");
    expect(ids).not.toContain("alquileresuy:111AP571"); // last updated 2023
    expect(ids).not.toContain("alquileresuy:007CA02106"); // reserved
    expect(ids).not.toContain("alquileresuy:885CA866"); // its page says "No existe"
    expect(run.listings.find(row => row.listingId === "alquileresuy:696AP1226")!.guarantees).toEqual(["aseguradora"]);
    // The page answered for 696AP1642 belongs to another advert: the card stays, unenriched.
    const misrouted = run.listings.find(row => row.listingId === "alquileresuy:696AP1642")!;
    expect(misrouted.guarantees).toEqual([]);
    expect(misrouted.details).toBeUndefined();
    expect(run.note).toMatch(/búsquedas/);
    expect(run.note).toMatch(/sin actualizar/);
  });

  it("keeps the cards but stops claiming completeness when a category does not answer", async () => {
    const run = await harvestAlquileresUy("full", USD, { fetchBuffer: fetcher({ ca: null }), now: () => NOW, env: {} });
    expect(run.ok).toBe(true);
    expect(run.complete).toBe(false);
    expect(run.listings.some(row => row.listingId === "alquileresuy:696AP1226")).toBe(true);
    expect(run.note).toMatch(/fallid/);
  });

  it("is not complete when a category answers fewer cards than its own total", async () => {
    const short = searches.ap!.replace(/^9\|\|/, "12||");
    const run = await harvestAlquileresUy("full", USD, { fetchBuffer: fetcher({ ap: short }), now: () => NOW, env: {} });
    expect(run.complete).toBe(false);
  });

  it("fails the source when no category can be read", async () => {
    const overrides = Object.fromEntries(["ap", "ca", "lo", "of", "te", "ga", "ch"].map(code => [code, null]));
    const run = await harvestAlquileresUy("full", USD, { fetchBuffer: fetcher(overrides), now: () => NOW, env: {} });
    expect(run).toMatchObject({ ok: false, complete: false, listings: [] });
  });
});
