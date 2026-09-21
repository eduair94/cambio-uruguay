import { describe, expect, it } from "vitest";
import { SiteError } from "../src/site";
import { supermarketPrices } from "../src/products/groceries";
import { planHomeSetup } from "../src/products/home";
import { listDirectories, searchProducts } from "../src/products/search";
import { checkOnlineStore } from "../src/products/stores";
import { fakeSite } from "./fakeSite";

const heladera = {
  key: "heladera:frigobar",
  category: "heladera",
  categoryLabel: "Heladera",
  variant: "frigobar",
  variantLabel: "Frigobar (hasta 120 L)",
  newBand: { p25: 7722, median: 8239, p75: 11530, min: 6663, n: 12 },
  usedBand: { p25: 2500, median: 3500, p75: 6000, min: 1500, n: 17 },
  usedSavingPct: 57,
  tier: "S",
  offers: [
    { seller: "El Dorado", url: "https://eldorado/x", priceUyu: 6663, condition: "new" },
    { seller: "Juan", url: "https://fb/x", priceUyu: 1500, condition: "used" },
  ],
  products: [{ name: "GRENNO FR-KH91B", brand: "grenno" }],
};

const routes = {
  "/api/phones": { brands: [{ brandLabel: "Apple", models: [{ slug: "apple-iphone-13-128gb", name: "Apple iPhone 13 128 GB", bestNewUyu: 20049, newSellers: 3 }] }] },
  "/api/chairs": {
    products: [{ slug: "cougar-armor-elite", name: "Cougar armor elite", brand: "Cougar", category: "gaming", price: { median: 10166, min: 9717 }, stars: 4.6, ratingCount: 1886, sellers: 4, offers: [{ seller: "PCCOMPU", priceUyu: 9717, url: "https://ml/x", condition: "new" }] }],
  },
  "/api/equipar": {
    items: [heladera],
    meta: {
      usdUyu: 40,
      baskets: [
        {
          key: "minima",
          label: "Mínima",
          lines: [
            { itemKey: "heladera:frigobar", label: "Heladera", quantity: 1, unitPriceUyu: 3500, totalUyu: 3500, condition: "used" },
            { itemKey: "colchon:1plaza", label: "Colchón", quantity: 1, unitPriceUyu: 5571, totalUyu: 5571, condition: "new" },
          ],
          missing: ["deshumidificador"],
        },
      ],
    },
  },
  "/api/movilidad/monopatin-electrico": { items: [] },
  "/api/movilidad/bicicleta-electrica": new SiteError(503, "caído"),
};

describe("searchProducts", () => {
  it("searches every directory, sorts by price and tolerates one being down", async () => {
    const { site } = fakeSite(routes);
    const out = await searchProducts(site, {});
    const names = (out.data.items as Array<{ name: string }>).map((i) => i.name);
    expect(names[0]).toBe("Heladera — Frigobar (hasta 120 L)");
    expect(names).toContain("Apple iPhone 13 128 GB");
    expect(out.data.unavailable).toEqual(["bicicletas-electricas"]);
    expect(out.text).toContain("No se pudo leer: bicicletas-electricas");
  });

  it("matches product names inside a category and prices used items", async () => {
    const { site } = fakeSite(routes);
    const out = await searchProducts(site, { vertical: "hogar", text: "grenno", condition: "used" });
    const [row] = out.data.items as Array<{ bestPriceUyu: number; keywords?: string; siteUrl: string }>;
    expect(row!.bestPriceUyu).toBe(1500);
    expect(row!.keywords).toBeUndefined();
    expect(row!.siteUrl).toBe("https://cambio-uruguay.com/equipar-casa-uruguay/heladera");
  });

  it("filters chairs by max price and shows ratings", async () => {
    const { site } = fakeSite(routes);
    const out = await searchProducts(site, { vertical: "sillas", maxPriceUyu: 10000 });
    expect(out.text).toContain("4,6★ (1.886 opiniones)");
    const none = await searchProducts(site, { vertical: "sillas", maxPriceUyu: 5000 });
    expect(none.data.total).toBe(0);
  });
});

describe("planHomeSetup", () => {
  it("drops what the person has and warns about a partial total", async () => {
    const { site } = fakeSite(routes);
    const out = await planHomeSetup(site, { have: ["heladera"] });
    expect(out.data.totalUyu).toBe(5571);
    expect(out.data.skipped).toEqual(["Heladera"]);
    expect(out.text).toContain("faltan precios de deshumidificador");
  });

  it("reprices used lines at the new median when asked", async () => {
    const { site } = fakeSite(routes);
    const out = await planHomeSetup(site, { condition: "new" });
    expect(out.data.totalUyu).toBe(8239 + 5571);
  });
});

describe("checkOnlineStore", () => {
  const stores = {
    stores: [
      { key: "aiwa", name: "Aiwa Uruguay", domain: "aiwa.com.uy", rubros: ["tecnologia"], since: "2001-04-04", google: { rating: 4.4, reviews: 142 }, hasProfile: true },
      { key: "temu", name: "Temu", domain: "temu.com", kind: "compra-exterior", trustpilot: { score: 2.9, reviews: 100 }, hasProfile: false },
    ],
  };

  it("finds a store by domain and reports dated signals", async () => {
    const { site } = fakeSite({
      "/api/stores": stores,
      "/api/stores/aiwa": { profile: { site: { https: true, whatsapp: true, rut: null, policies: { returns: "https://aiwa/dev" }, payments: ["visa", "oca"] } } },
    });
    const out = await checkOnlineStore(site, { name: "https://www.aiwa.com.uy/tienda" });
    expect(out.text).toContain("Dominio activo desde 2001-04-04");
    expect(out.text).toContain("4,4★ con 142 reseñas");
    expect(out.text).toContain("política de devoluciones publicada");
    expect(out.text).toContain("no un veredicto");
  });

  it("says when a store is not tracked", async () => {
    const { site } = fakeSite({ "/api/stores": stores });
    const out = await checkOnlineStore(site, { name: "tiendafantasma" });
    expect(out.data.found).toBe(false);
  });
});

describe("listDirectories and supermarketPrices", () => {
  it("lists directories with links", async () => {
    const { site } = fakeSite({ "/api/directorios": { cifras: { autos: { count: 18977, asOf: "2026-09-21" } } } });
    const out = await listDirectories(site);
    expect(out.text).toContain("Autos usados: 18.977 (al 2026-09-21) — https://cambio-uruguay.com/autos-usados-uruguay");
  });

  it("finds articles and the cheapest stores of a department", async () => {
    const { site } = fakeSite({
      "/api/precios": {
        day: "2026-09-20",
        articles: [{ articleId: 1, name: "Aceite de girasol - Óptimo", unitRaw: "900 ml", n: 80, p10: 90, p50: 98, p90: 110 }],
        basket: {
          nationalCost: { total: 9380, items: 33 },
          rankedStores: [
            { storeName: "Persa", department: "Canelones", ratio: 0.87, coverage: 0.73 },
            { storeName: "Tata Centro", department: "Montevideo", ratio: 0.92, coverage: 0.9 },
          ],
        },
      },
    });
    const out = await supermarketPrices(site, { text: "aceite girasol", department: "Montevideo" });
    expect(out.text).toContain("mediana $ 98");
    expect(out.text).toContain("Tata Centro");
    expect(out.text).not.toContain("Persa");
    expect(out.text).toContain("8 % más barato");
  });
});

describe("plausible offers", () => {
  it("ignores junk offers far below the band of their condition", async () => {
    const junk = { ...heladera, offers: [...heladera.offers, { seller: "Facebook Marketplace", priceUyu: 20, condition: "used", url: "https://fb/junk" }] };
    const { site } = fakeSite({ ...routes, "/api/equipar": { items: [junk] } });
    const out = await searchProducts(site, { vertical: "hogar", condition: "used" });
    const [row] = out.data.items as Array<{ bestPriceUyu: number; bestOffer: { url: string } }>;
    expect(row!.bestPriceUyu).toBe(1500);
    expect(row!.bestOffer.url).toBe("https://fb/x");
  });
});
