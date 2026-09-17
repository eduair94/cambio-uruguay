import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { harvestClasiautos, harvestJulio, listivoToCar, vehicaToCar } from "../../classes/autos/sources/wordpress";

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary([
    ml("60297", "Toyota", "60315", "Corolla"), ml("60310", "Fiat", "60311", "Uno"), ml("60310", "Fiat", "60312", "Mobi"),
    ml("60400", "Suzuki", "60401", "Alto"), ml("60330", "Honda", "60332", "Fit"), ml("60340", "Ford", "60341", "Ranger"),
  ], []),
};
const YEARS = new Map<number, number>(
  read("vehica-julio-years.json")
    .filter((term: { name: string }) => /^\d{4}$/.test(term.name))
    .map((term: { id: number; name: string }) => [term.id, Number(term.name)]),
);

describe("listivoToCar (Clasiautos)", () => {
  it("reads the structured fields", () => {
    const [corolla] = read("listivo-clasiautos.json");
    const { listing, detail } = listivoToCar(corolla, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "15715", source: "clasiautos", brandId: "60297", modelId: "60315", year: 2014, km: 250_000, price: 15_000, currency: "USD",
      transmission: "manual", fuel: "nafta", sellerType: "private", sellerId: "clasiautos:879", dealerName: null,
      permalink: "https://clasiautos.uy/avisos/toyota-corolla-le-1-8-extra-full-manual-2014-techo-carplay-clim/",
    });
    expect(listing.specText).toBe("1.8");
    expect(listing.picture).toMatch(/^https:\/\/clasiautos\.uy\/wp-content\//);
    expect(detail.description).toContain("Toyota Corolla 2014");
  });
  it("skips new cars", () => {
    const posts = read("listivo-clasiautos.json");
    expect(listivoToCar(posts[posts.length - 1], CONTEXT)).toBeNull();
  });
});

describe("vehicaToCar (Julio)", () => {
  it("resolves terms, the US$ price and the engine size", () => {
    const [uno, alto] = read("vehica-julio.json");
    expect(vehicaToCar(uno, YEARS, CONTEXT)!.listing).toMatchObject({
      id: "49408", source: "julio", brandId: "60310", modelId: "60311", year: 2018, price: 9_200, currency: "USD", km: 117_131,
      sellerType: "dealer", sellerId: "julio:julio", dealerName: "Julio Automóviles",
      permalink: "https://julioautomoviles.com.uy/vehiculo/fiat-uno-attractive/",
    });
    expect(vehicaToCar(uno, YEARS, CONTEXT)!.listing.specText).toContain("1.4");
    // The title mentions 2026 (the tax year); the year term wins.
    expect(vehicaToCar(alto, YEARS, CONTEXT)!.listing).toMatchObject({ modelId: "60401", year: 2017, title: "SUZUKI ALTO 800 GA AA DA – Patente paga todo 2026-" });
  });
  it("refuses an unknown price currency and new cars", () => {
    const [uno] = read("vehica-julio.json");
    expect(vehicaToCar({ ...uno, vehica_6656: { vehica_currency_6656_9999: 9200 } }, YEARS, CONTEXT)).toBeNull();
    expect(vehicaToCar({ ...uno, class_list: uno.class_list.map((name: string) => name.replace("autos-usados", "autos-0km")) }, YEARS, CONTEXT)).toBeNull();
  });
});

describe("harvesters", () => {
  it("Clasiautos stops at the empty page after the last full one", async () => {
    const posts = read("listivo-clasiautos.json");
    const pages = [posts, []];
    const urls: string[] = [];
    const result = await harvestClasiautos(CONTEXT, { perPage: 4, fetchPage: async url => { urls.push(url); return pages.shift() ?? []; } });
    expect(urls[0]).toBe("https://clasiautos.uy/wp-json/wp/v2/listings?per_page=4&page=1");
    expect(result).toMatchObject({ source: "clasiautos", ok: true, complete: true, requests: 2 });
    expect(result.listings.map(item => item.id)).toEqual(["15715", "15696", "15681"]);
  });
  it("Julio reads its year terms first and fails closed without them", async () => {
    const urls: string[] = [];
    const cars = read("vehica-julio.json");
    const years = read("vehica-julio-years.json");
    const result = await harvestJulio(CONTEXT, {
      fetchPage: async url => { urls.push(url); return url.includes("vehica_19418") ? years : cars; },
    });
    expect(urls).toEqual([
      "https://julioautomoviles.com.uy/wp-json/wp/v2/vehica_19418?per_page=100&page=1",
      "https://julioautomoviles.com.uy/wp-json/wp/v2/cars?per_page=100&page=1",
    ]);
    expect(result.listings).toHaveLength(3);
    const failed = await harvestJulio(CONTEXT, { fetchPage: async () => null });
    expect(failed).toMatchObject({ ok: false, complete: false, listings: [] });
  });
});
