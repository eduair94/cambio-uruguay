import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { htmlText, moneyOf } from "../../classes/autos/sources/common";
import { harvestWooCars, WOO_SITES, wooProductToCar } from "../../classes/autos/sources/woo";

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary(
    [ml("60285", "Nissan", "60286", "Kicks"), ml("60287", "Renault", "60288", "Sandero"), ml("60287", "Renault", "60289", "Clio"), ml("67781", "Chevrolet", "67801", "Onix")],
    [{ brandId: "60285", modelId: "60286", trims: ["Exclusive", "Advance"] }],
  ),
};
const SDA = WOO_SITES.find(site => site.source === "shoppingdeautos")!;
const CARPER = WOO_SITES.find(site => site.source === "carper")!;

describe("common helpers", () => {
  it("decodes html and money", () => {
    expect(htmlText("<p>Autom&aacute;tica &#8211; A&ntilde;o</p>")).toBe("Automática – Año");
    expect(moneyOf("U$S 15,000")).toEqual({ amount: 15_000, currency: "USD" });
    expect(moneyOf("US$ 11.990")).toEqual({ amount: 11_990, currency: "USD" });
    expect(moneyOf("USD 54.890,00")).toEqual({ amount: 54_890, currency: "USD" });
    expect(moneyOf("$U 450.000")).toEqual({ amount: 450_000, currency: "UYU" });
    expect(moneyOf("consultar")).toBeNull();
  });
});

describe("wooProductToCar", () => {
  it("maps Shopping de Autos attributes onto ML ids", () => {
    const [kicks] = read("woo-shoppingdeautos.json");
    const { listing, detail } = wooProductToCar(kicks, SDA, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "153528", source: "shoppingdeautos", brandId: "60285", modelId: "60286", year: 2023, km: 73_168, price: 18_990,
      currency: "USD", transmission: "automatica", fuel: "nafta", sellerType: "dealer", sellerId: "shoppingdeautos:shoppingdeautos",
      dealerName: "Shopping de Autos", permalink: "https://shoppingdeautos.uy/producto/nissan-kicks-exclusive-2023/",
    });
    expect(listing.specText).toContain("1.6");
    expect(listing.picture).toMatch(/^https:\/\/shoppingdeautos\.uy\/wp-content\//);
    expect(detail).toMatchObject({ active: true, price: 18_990, year: 2023, km: 73_168, brand: "Nissan", model: "Kicks", sellerName: "Shopping de Autos" });
  });
  it("divides Carper's minor units and drops units it will not sell", () => {
    const [clio, onix] = read("woo-carper.json");
    expect(wooProductToCar(clio, CARPER, CONTEXT)!.listing).toMatchObject({ price: 18_490, currency: "USD", year: 2023, km: 47_444, modelId: "60289", source: "carper" });
    expect(wooProductToCar(onix, CARPER, CONTEXT)).toBeNull();
  });
  it("drops new cars and out-of-stock products", () => {
    const [kicks] = read("woo-shoppingdeautos.json");
    const renamed = { ...kicks, attributes: kicks.attributes.map((a: { name: string; terms: unknown[] }) => a.name === "Estado" ? { ...a, terms: [{ name: "0km" }] } : a) };
    expect(wooProductToCar(renamed, SDA, CONTEXT)).toBeNull();
    expect(wooProductToCar({ ...kicks, is_in_stock: false }, SDA, CONTEXT)).toBeNull();
  });
  it("keeps a car of a brand the dictionary does not know, outside ML cohorts", () => {
    const [, , logan] = read("woo-shoppingdeautos.json");
    const { listing } = wooProductToCar(logan, SDA, { ...CONTEXT, dictionary: buildCarDictionary([], []) })!;
    expect(listing).toMatchObject({ brandId: "x-renault", brand: "Renault", modelId: "x-logan", model: "Logan", year: 2019 });
  });
});

describe("harvestWooCars", () => {
  it("pages until a short page and reports completeness", async () => {
    const products = read("woo-shoppingdeautos.json");
    const urls: string[] = [];
    const result = await harvestWooCars(SDA, CONTEXT, { fetchPage: async url => { urls.push(url); return products; } });
    expect(urls).toEqual(["https://shoppingdeautos.uy/wp-json/wc/store/v1/products?per_page=100&page=1"]);
    expect(result).toMatchObject({ source: "shoppingdeautos", ok: true, complete: true, requests: 1 });
    expect(result.listings.length).toBeGreaterThan(0);
    expect(result.details.size).toBe(result.listings.length);
    expect([...result.details.keys()][0]).toMatch(/^sda-\d+$/);
  });
  it("never claims completeness after a failed page", async () => {
    const result = await harvestWooCars(SDA, CONTEXT, { fetchPage: async () => null });
    expect(result).toMatchObject({ ok: false, complete: false, note: "página 1 sin respuesta" });
  });
});
