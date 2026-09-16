import { describe, expect, it } from "vitest";
import { applyUnitGuard } from "../../classes/retail/unitGuard";
import { wooPrice } from "../../classes/retail/sources/woocommerce";
import type { RetailListing } from "../../classes/retail/types";

const listing = (over: Partial<RetailListing>): RetailListing => ({
  listingId: Math.random().toString(36), source: "store", sellerKey: "tyt", sellerName: "TYT", channel: "local-store",
  title: "Smart TV 32", url: "https://x", price: 100, currency: "UYU", condition: "new", available: true, image: null,
  brand: "", model: "", catalogId: null, attributes: { CATEGORY_SPEC: "tv" }, rating: null, ratingCount: 0,
  location: null, freeShipping: null, officialStore: true, observedAt: "2026-09-16T00:00:00.000Z", ...over,
});

describe("unidad del Store API de WooCommerce", () => {
  it("respeta currency_minor_unit por defecto", () => {
    expect(wooPrice({ price: "399000", currency_code: "UYU", currency_minor_unit: 2 })).toBe(3990);
  });
  it("una tienda marcada priceInMajorUnits manda pesos enteros aunque declare minor unit 2 (TYT)", () => {
    expect(wooPrice({ price: "15900", currency_code: "UYU", currency_minor_unit: 2 }, { priceInMajorUnits: true })).toBe(15900);
  });
});

describe("guarda de unidad por tienda", () => {
  const ml = Array.from({ length: 6 }, (_, i) =>
    listing({ source: "mercadolibre", sellerKey: `ml:${i}`, sellerName: `v${i}`, price: 15000 + i * 500 })
  );
  it("descarta una tienda cuya mediana queda 20 veces por debajo de MercadoLibre en la misma categoría", () => {
    const tyt = Array.from({ length: 5 }, (_, i) => listing({ price: 159 + i }));
    const { listings, dropped } = applyUnitGuard([...ml, ...tyt], 40);
    expect(listings.filter((l) => l.sellerKey === "tyt")).toHaveLength(0);
    expect(dropped).toEqual([expect.objectContaining({ sellerKey: "tyt", spec: "tv", n: 5 })]);
  });
  it("también la que queda 20 veces por encima", () => {
    const wrong = Array.from({ length: 5 }, (_, i) => listing({ sellerKey: "x", price: 1_600_000 + i }));
    expect(applyUnitGuard([...ml, ...wrong], 40).listings.filter((l) => l.sellerKey === "x")).toHaveLength(0);
  });
  it("no toca una tienda con precios normales ni decide con muestras chicas", () => {
    const ok = Array.from({ length: 5 }, (_, i) => listing({ sellerKey: "ok", price: 14000 + i }));
    const few = Array.from({ length: 4 }, (_, i) => listing({ sellerKey: "few", price: 150 + i }));
    const { listings, dropped } = applyUnitGuard([...ml, ...ok, ...few], 40);
    expect(listings.filter((l) => l.sellerKey === "ok")).toHaveLength(5);
    expect(listings.filter((l) => l.sellerKey === "few")).toHaveLength(4);
    expect(dropped).toHaveLength(0);
  });
  it("compara en pesos: una tienda en USD no es sospechosa por el número chico", () => {
    const usd = Array.from({ length: 5 }, (_, i) => listing({ sellerKey: "usd", currency: "USD", price: 380 + i }));
    expect(applyUnitGuard([...ml, ...usd], 40).listings.filter((l) => l.sellerKey === "usd")).toHaveLength(5);
  });
});
