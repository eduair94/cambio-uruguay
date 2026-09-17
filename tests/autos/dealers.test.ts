import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { caroneCards, caroneTotal, CARONE_USED_URL, harvestCarOne } from "../../classes/autos/sources/carone";
import { fidocarPdpToCar, fidocarUrls, harvestFidocar } from "../../classes/autos/sources/fenicio";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary([ml("60300", "Hyundai", "60302", "Santa Fe"), ml("67781", "Chevrolet", "67801", "Onix"), ml("60500", "Changan", "60501", "CS35")], []),
};
const PDP_URL = "https://www.usadosfidocar.com.uy/modelo/hyundai-new-santa-fe-3-5-limited-awd-7plz-2022_418633_418633";

describe("Fidocar", () => {
  it("lists only model pages from the sitemap, once each", () => {
    const urls = fidocarUrls(fixture("fidocar-sitemap.xml"));
    expect(urls).toHaveLength(3);
    expect(urls.every(url => /\/modelo\/[\w-]+_\d+_\d+$/.test(url))).toBe(true);
  });
  it("reads the product page", () => {
    const { listing, detail } = fidocarPdpToCar(fixture("fidocar-pdp.html"), PDP_URL, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "418633", source: "fidocar", brandId: "60300", modelId: "60302", year: 2022, km: 30_000, price: 54_890, currency: "USD",
      transmission: "automatica", sellerType: "dealer", dealerName: "Usados Fidocar", permalink: PDP_URL,
    });
    expect(listing.specText).toContain("3.5");
    expect(listing.picture).toMatch(/^https:\/\/f\.fcdn\.app\//);
    expect(detail.description).toBe("");
  });
  it("drops a product that is not in stock", () => {
    expect(fidocarPdpToCar(fixture("fidocar-pdp.html").replace("schema.org/InStock", "schema.org/OutOfStock"), PDP_URL, CONTEXT)).toBeNull();
  });
  it("is complete only when the sitemap and every page answered", async () => {
    const pages: Record<string, string | null> = { [PDP_URL]: fixture("fidocar-pdp.html") };
    const result = await harvestFidocar(CONTEXT, {
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
