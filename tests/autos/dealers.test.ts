import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { caroneCards, caroneTotal, CARONE_USED_URL, harvestCarOne } from "../../classes/autos/sources/carone";
import { duenoDirectoCards, duenoDirectoPdpToCar, harvestDuenoDirecto } from "../../classes/autos/sources/duenodirecto";
import { fenicioPdpToCar, fenicioStore, fenicioUrls, harvestFenicio } from "../../classes/autos/sources/fenicio";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary([
    ml("60300", "Hyundai", "60302", "Santa Fe"), ml("67781", "Chevrolet", "67801", "Onix"), ml("60500", "Changan", "60501", "CS35"),
    ml("58217", "Suzuki", "58260", "Vitara"), ml("59993", "Peugeot", "60051", "308"), ml("58989", "Citroën", "59012", "Berlingo"),
  ], []),
};
const FIDOCAR = fenicioStore("fidocar");
const MOTORLIDER = fenicioStore("motorlider");
const PDP_URL = "https://www.usadosfidocar.com.uy/modelo/hyundai-new-santa-fe-3-5-limited-awd-7plz-2022_418633_418633";
const MOTORLIDER_URL = "https://motorlider.com.uy/catalogo/suzuki-vitara-gl-2020-excelente-estado-permuta-financia_136236_136236";

describe("Fidocar", () => {
  it("lists only model pages from the sitemap, once each", () => {
    const urls = fenicioUrls(fixture("fidocar-sitemap.xml"), FIDOCAR);
    expect(urls).toHaveLength(3);
    expect(urls.every(url => /\/modelo\/[\w-]+_\d+_\d+$/.test(url))).toBe(true);
  });
  it("reads the product page", () => {
    const { listing, detail } = fenicioPdpToCar(fixture("fidocar-pdp.html"), PDP_URL, FIDOCAR, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "418633", source: "fidocar", brandId: "60300", modelId: "60302", year: 2022, km: 30_000, price: 54_890, currency: "USD",
      transmission: "automatica", sellerType: "dealer", dealerName: "Usados Fidocar", permalink: PDP_URL,
    });
    expect(listing.specText).toContain("3.5");
    expect(listing.picture).toMatch(/^https:\/\/f\.fcdn\.app\//);
    expect(detail.description).toBe("");
  });
  it("drops a product that is not in stock", () => {
    expect(fenicioPdpToCar(fixture("fidocar-pdp.html").replace("schema.org/InStock", "schema.org/OutOfStock"), PDP_URL, FIDOCAR, CONTEXT)).toBeNull();
  });
  it("is complete only when the sitemap and every page answered", async () => {
    const pages: Record<string, string | null> = { [PDP_URL]: fixture("fidocar-pdp.html") };
    const result = await harvestFenicio(FIDOCAR, CONTEXT, {
      fetchPage: async url => (url.endsWith("catalogo-articulos.xml") ? fixture("fidocar-sitemap.xml") : pages[url] ?? null),
    });
    expect(result).toMatchObject({ source: "fidocar", ok: true, complete: false, requests: 4 });
    expect(result.listings.map(item => item.id)).toEqual(["418633"]);
    expect(result.note).toBe("2 fichas sin respuesta");
  });
});

describe("Car One", () => {
  it("parses cards", () => {
    const cards = caroneCards(fixture("carone-list.html"), CONTEXT);
    expect(cards.map(card => card.listing)).toEqual([
      expect.objectContaining({
        id: "717444", source: "carone", brandId: "67781", modelId: "67801", year: 2023, km: 82_900, price: 11_990, currency: "USD",
        transmission: "manual", fuel: "nafta", dealerName: "Car One", sellerType: "dealer",
        permalink: "https://carone.com.uy/chevrolet-nuevo-onix-10-joy-mt-sku4-717444",
        picture: "https://cdn.impel.io/swipetospin-viewers/carone/717444/20260917125308.X2DURHLL/thumb-lg.jpg",
      }),
      expect.objectContaining({ id: "717443", brandId: "60500", modelId: "60501", year: 2023, km: 50_979, price: 15_290, transmission: "automatica" }),
    ]);
    expect(cards[0]!.listing.title).toBe("Chevrolet Nuevo Onix 1.0 Joy Mt");
    expect(caroneTotal(fixture("carone-list.html"))).toBe(376);
  });
  it("pages with the used filter until nothing new appears", async () => {
    const html = fixture("carone-list.html");
    const urls: string[] = [];
    const result = await harvestCarOne(CONTEXT, { fetchPage: async url => { urls.push(url); return html; } });
    expect(urls).toEqual([`${CARONE_USED_URL}&p=1`, `${CARONE_USED_URL}&p=2`]);
    expect(result.listings).toHaveLength(2);
    expect(result).toMatchObject({ ok: true, complete: false });
  });
  it("fails closed on a missing page", async () => {
    const result = await harvestCarOne(CONTEXT, { fetchPage: async () => null });
    expect(result).toMatchObject({ ok: false, complete: false, note: "página 1 sin respuesta" });
  });
});

describe("Motorlider", () => {
  it("reads the car's own price, not the deposit the storefront sells", () => {
    const { listing } = fenicioPdpToCar(fixture("motorlider-pdp.html"), MOTORLIDER_URL, MOTORLIDER, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "136236", source: "motorlider", brandId: "58217", modelId: "58260", year: 2020, km: 89_037,
      price: 13_990, currency: "USD", transmission: "manual", fuel: "nafta", sellerType: "dealer", dealerName: "Motorlider",
      permalink: MOTORLIDER_URL,
    });
    expect(listing.picture).toMatch(/^https:\/\/f\.fcdn\.app\//);
  });
  it("drops an advert priced like a deposit", () => {
    const html = fixture("motorlider-pdp.html").replace('<span class="val">13990</span>', '<span class="val">500</span>');
    expect(fenicioPdpToCar(html, MOTORLIDER_URL, MOTORLIDER, CONTEXT)).toBeNull();
  });
  it("takes only its own catalog pages from the sitemap, once each", () => {
    expect(fenicioUrls(fixture("motorlider-sitemap.xml"), MOTORLIDER)).toEqual([
      "https://motorlider.com.uy/catalogo/suzuki-vitara-gl-2020-excelente-estado-permuta-financia_136236_136236",
      "https://motorlider.com.uy/catalogo/ktm-duke-200-0km-permuta-financia_125091_125091",
    ]);
  });
  it("leaves the motorbikes it also sells out of the directory", async () => {
    const result = await harvestFenicio(MOTORLIDER, CONTEXT, {
      fetchPage: async url =>
        url.endsWith("catalogo-articulos.xml")
          ? fixture("motorlider-sitemap.xml")
          : url.includes("ktm-duke")
            ? fixture("motorlider-pdp.html")
              .split("Suzuki Vitara GL 2020 EXCELENTE ESTADO! | Permuta / Financia").join("KTM Duke 200 0KM | Permuta / Financia")
              .replace('itemprop="brand">Suzuki<', 'itemprop="brand">KTM<')
            : fixture("motorlider-pdp.html"),
    });
    expect(result.listings.map(item => item.id)).toEqual(["136236"]);
    expect(result).toMatchObject({ ok: true, complete: true });
  });
});

describe("Dueño Directo", () => {
  it("reads the sale cards and skips rentals and adverts without a page of their own", () => {
    const { cards, linkless } = duenoDirectoCards(fixture("duenodirecto-list.html"));
    expect(linkless).toBe(1);
    expect(cards.map(card => card.slug)).toEqual([
      "divino-peugeot-308-1-6-turbo-extra-full-2012",
      "citroen-berlingo-chasis-largo-ao-2014-divina",
    ]);
    expect(cards[0]).toMatchObject({ id: "170", brand: "PEUGEOT", model: "308", price: 12_680, currency: "USD" });
    // Photo names carry spaces; the stored URL is the encoded one.
    expect(cards[0]!.picture).toBe("https://vehiculos.xn--dueodirecto-3db.com.uy/uploads/vehiculos/170/home58559_IMG%203102.jpg");
  });
  it("completes the card with the spec sheet of its own page", () => {
    const { cards } = duenoDirectoCards(fixture("duenodirecto-list.html"));
    const { listing, detail } = duenoDirectoPdpToCar(fixture("duenodirecto-pdp.html"), cards[0]!, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "170", source: "duenodirecto", brandId: "59993", modelId: "60051", year: 2012, km: 92_000,
      price: 12_680, currency: "USD", transmission: "manual", fuel: "nafta", sellerType: "private", dealerName: null,
      permalink: "https://vehiculos.xn--dueodirecto-3db.com.uy/vehiculos/divino-peugeot-308-1-6-turbo-extra-full-2012",
    });
    expect(detail.description).toContain("permuto por menor valor");
  });
  it("stops paging when a page adds nothing and says what it could not read", async () => {
    const urls: string[] = [];
    const result = await harvestDuenoDirecto(CONTEXT, {
      fetchPage: async url => {
        urls.push(url);
        if (url.includes("?page=")) return fixture("duenodirecto-list.html");
        return url.includes("berlingo") ? null : fixture("duenodirecto-pdp.html");
      },
    });
    expect(urls.filter(url => url.includes("?page=")).length).toBe(2);
    expect(result.listings.map(item => item.id)).toEqual(["170"]);
    expect(result).toMatchObject({ ok: true, complete: false, note: "1 fichas sin respuesta; 2 avisos sin ficha propia" });
  });
});
