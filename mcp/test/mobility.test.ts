import { describe, expect, it } from "vitest";
import { searchProducts } from "../src/products/search";
import { fakeSite, type Call } from "./fakeSite";

const listing = (index = 1) => ({
  listingId: `ml:${index}`,
  title: `Monopatín Xiaomi Pro ${index}`,
  brand: "Xiaomi",
  category: "monopatin-electrico",
  variant: "urbano",
  condition: "used",
  sellerName: "Tienda de prueba",
  price: 400 + index,
  currency: "USD",
  priceUyu: 16000 + index,
  url: `https://mercadolibre.com.uy/MLU${index}`,
  lastSeen: "2026-11-05",
});

describe("mobility product searches", () => {
  it("searches accepted adverts with every filter, keeping the matching seller and both price units", async () => {
    const { site, calls } = fakeSite({
      "/api/movilidad/productos": { total: 1, perPage: 24, items: [listing()] },
    });
    const out = await searchProducts(site, {
      vertical: "monopatines", text: "Pro", brand: "XIAOMI", condition: "used", maxPriceUyu: 20000.75,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.query).toEqual({
      categoria: "monopatin-electrico", q: "Pro", marca: "xiaomi", condicion: "usado", precioMax: 20000, orden: "precio_asc",
    });
    expect(out.data.items).toEqual([expect.objectContaining({
      name: "Monopatín Xiaomi Pro 1",
      bestPriceUyu: 16001,
      lastSeen: "2026-11-05",
      bestOffer: {
        seller: "Tienda de prueba", priceUyu: 16001, price: 401, currency: "USD",
        url: "https://mercadolibre.com.uy/MLU1", condition: "usado",
      },
      siteUrl: "https://cambio-uruguay.com/monopatines-electricos-uruguay?q=Pro&marca=xiaomi&condicion=usado&precioMax=20000",
    })]);
    expect(out.text).toContain("visto al 2026-11-05");
    expect(out.text).not.toContain("usado típico");
  });

  it("keeps e-bikes separate and returns a filtered directory link even with zero results", async () => {
    const { site, calls } = fakeSite({
      "/api/movilidad/productos": { total: 0, perPage: 24, items: [] },
    });
    const out = await searchProducts(site, { vertical: "bicicletas-electricas", condition: "new", maxPriceUyu: 10000 });
    expect(calls[0]?.query).toEqual({ categoria: "bicicleta-electrica", condicion: "nuevo", precioMax: 10000, orden: "precio_asc" });
    expect(out.data.total).toBe(0);
    expect(out.text).toContain("https://cambio-uruguay.com/bicicletas-electricas-uruguay?condicion=nuevo&precioMax=10000");
  });

  it("preserves minimum price, variant, seller and source from a directory search", async () => {
    const { site, calls } = fakeSite({
      "/api/movilidad/productos": { total: 1, perPage: 24, items: [listing()] },
    });
    const out = await searchProducts(site, {
      vertical: "monopatines", minPriceUyu: 12000.25, maxPriceUyu: 20000,
      variant: "urbano", seller: "store:delcar", source: "tienda", condition: "new",
    });
    expect(calls[0]?.query).toEqual({
      categoria: "monopatin-electrico", precioMin: 12001, precioMax: 20000,
      variante: "urbano", vendedor: "store:delcar", fuente: "tienda", condicion: "nuevo", orden: "precio_asc",
    });
    const [url] = out.data.searches as string[];
    expect(new URL(url!).pathname).toBe("/monopatines-electricos-uruguay");
    expect(Object.fromEntries(new URL(url!).searchParams)).toEqual({
      precioMin: "12001", precioMax: "20000", variante: "urbano", vendedor: "store:delcar", fuente: "tienda", condicion: "nuevo",
    });
  });

  it("does not replace used-only searches with a new category offer when no advert matches", async () => {
    const { site } = fakeSite({
      "/api/movilidad/productos": { total: 0, perPage: 24, items: [] },
      "/api/movilidad/monopatin-electrico": {
        items: [{ newBand: { min: 5000 }, offers: [{ condition: "new", priceUyu: 5000, seller: "Otra marca" }] }],
      },
    });
    const out = await searchProducts(site, { vertical: "monopatines", brand: "xiaomi", condition: "used" });
    expect(out.data.items).toEqual([]);
    expect(out.text).not.toContain("Otra marca");
  });

  it("loads the second 24-row page only when needed, reporting the full filtered total", async () => {
    const { site, calls } = fakeSite({
      "/api/movilidad/productos": ({ query }: Call) => ({
        total: 71, perPage: 24,
        items: Array.from({ length: 24 }, (_, index) => listing(index + (query?.page === 2 ? 25 : 1))),
      }),
    });
    const out = await searchProducts(site, { vertical: "monopatines", condition: "any", limit: 30 });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.query?.page).toBe(2);
    expect(calls[0]?.query).not.toHaveProperty("condicion");
    expect(out.data.total).toBe(71);
    expect(out.data.items).toHaveLength(30);
    expect(out.text).toContain("se muestran 30");
  });

  it("does not silently broaden unsupported brand keys", async () => {
    const { site, calls } = fakeSite({});
    await expect(searchProducts(site, { vertical: "monopatines", brand: "Segway Ninebot" }))
      .rejects.toThrow("usá text en lugar de brand");
    expect(calls).toEqual([]);
  });

  it("rejects unsupported facet keys and crossed or sub-peso budgets before the API drops them", async () => {
    const { site, calls } = fakeSite({});
    await expect(searchProducts(site, { vertical: "monopatines", seller: "Tienda con espacios" }))
      .rejects.toThrow("claves de los filtros");
    await expect(searchProducts(site, { vertical: "monopatines", minPriceUyu: 20000, maxPriceUyu: 10000 }))
      .rejects.toThrow("mínimo no puede superar el máximo");
    await expect(searchProducts(site, { vertical: "monopatines", maxPriceUyu: 0.5 }))
      .rejects.toThrow("1 peso uruguayo");
    await expect(searchProducts(site, { vertical: "hogar", source: "facebook" }))
      .rejects.toThrow("requieren vertical");
    expect(calls).toEqual([]);
  });
});
