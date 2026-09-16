import { describe, expect, it } from "vitest";
import { applyUnitGuard, resolveAmbiguousUnits } from "../../classes/retail/unitGuard";
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

describe("unidades mixtas por aviso en un vendedor ambiguo", () => {
  // TYT, medido el 16/9/2026 en la misma corrida y con el mismo currency_minor_unit: 2:
  // "Calefon Termotanque De Acero Enxuta 60 L" en 20500 (pesos) y "Termotanque Calefon Enxuta 60
  // Lts" en 960000 (centavos); "Telefunken Calefón TLF30V" en 487900. La guarda por mediana no ve
  // eso: la mitad buena de la tienda sostiene la mediana y la otra mitad se publica 100 veces cara.
  //
  // Banda de ML para calefon: p10 = 7000 y p90 = 15000 sobre estos seis precios, así que se
  // acepta [2333,33; 45000].
  const mlCalefon = [6000, 8000, 10000, 12000, 14000, 16000].map((price, i) =>
    listing({ source: "mercadolibre", sellerKey: `ml:${i}`, price, attributes: { CATEGORY_SPEC: "calefon" } })
  );
  const tyt = (price: number, over: Partial<RetailListing> = {}): RetailListing =>
    listing({ sellerKey: "tyt", price, attributes: { CATEGORY_SPEC: "calefon" }, ...over });
  const ambiguous = new Set(["tyt"]);

  it("deja el precio que ya es creíble y no lo es dividido por 100", () => {
    const pesos = tyt(20500, { listingId: "pesos" });
    const result = resolveAmbiguousUnits([...mlCalefon, pesos], 40, ambiguous);
    expect(result.listings.find((l) => l.listingId === "pesos")!.price).toBe(20500);
    expect(result).toMatchObject({ rescaled: 0, dropped: 0 });
  });

  it("reescala el que sólo es creíble dividido por 100, precio tachado incluido", () => {
    const cents = tyt(960000, { listingId: "centavos", listPrice: 1_100_000 });
    const result = resolveAmbiguousUnits([...mlCalefon, cents], 40, ambiguous);
    const fixed = result.listings.find((l) => l.listingId === "centavos")!;
    expect(fixed.price).toBe(9600);
    expect(fixed.listPrice).toBe(11000);
    expect(result).toMatchObject({ rescaled: 1, dropped: 0 });
    // No muta la entrada: el aviso original sigue diciendo lo que la tienda publicó.
    expect(cents.price).toBe(960000);
  });

  it("descarta el que no es creíble de ninguna de las dos formas", () => {
    const nonsense = tyt(90_000_000, { listingId: "ninguno" });
    const result = resolveAmbiguousUnits([...mlCalefon, nonsense], 40, ambiguous);
    expect(result.listings.some((l) => l.listingId === "ninguno")).toBe(false);
    expect(result).toMatchObject({ rescaled: 0, dropped: 1 });
  });

  it("descarta el que es creíble de las dos formas: ahí no se puede saber", () => {
    // Banda ancha, como la de televisores: p10 = 5500 y p90 = 250000 -> [1833,33; 750000]. 300000
    // entra tal cual y 3000 también.
    const mlTv = [5000, 6000, 8000, 50000, 200000, 300000].map((price, i) =>
      listing({ source: "mercadolibre", sellerKey: `ml:tv${i}`, price })
    );
    const both = listing({ sellerKey: "tyt", listingId: "ambos", price: 300000 });
    const result = resolveAmbiguousUnits([...mlTv, both], 40, ambiguous);
    expect(result.listings.some((l) => l.listingId === "ambos")).toBe(false);
    expect(result).toMatchObject({ rescaled: 0, dropped: 1 });
  });

  it("no divide por 100 un producto caro de verdad que apenas se pasa de la banda", () => {
    // Medido en TYT el 16/9/2026: "Smart Tv Samsung Qled 85« 4k" en 229900. La banda de ML de
    // televisores (p10 6760, p90 30768) era [2253; 92304]: 229900 queda afuera y 2299 adentro, así
    // que la regla sola lo publicaba a $ 2.299. Un error de centavos multiplica por 100 un precio
    // que está DENTRO de la banda, así que cae muy lejos de ella (los calefones de TYT quedaron entre
    // 16 y 33 veces el p90); este queda a 7,5 veces. Para reescalar, lo publicado tiene que pasar el
    // techo de la banda por otro factor 3 (9 veces el p90); si no, no se sabe y se descarta.
    //
    // Acá: p10 = 6500 y p90 = 26000 -> banda [2166,67; 78000], y reescalar exige más de 234000.
    const mlTv = [6000, 7000, 10000, 12000, 20000, 32000].map((price, i) =>
      listing({ source: "mercadolibre", sellerKey: `ml:tv${i}`, price })
    );
    const premium = listing({ sellerKey: "tyt", listingId: "qled85", price: 229900 });
    const cents = listing({ sellerKey: "tyt", listingId: "centavos-tv", price: 1_790_000 });
    const result = resolveAmbiguousUnits([...mlTv, premium, cents], 40, ambiguous);
    expect(result.listings.some((l) => l.listingId === "qled85")).toBe(false);
    expect(result.listings.find((l) => l.listingId === "centavos-tv")!.price).toBe(17900);
    expect(result).toMatchObject({ rescaled: 1, dropped: 1 });
  });

  it("descarta el aviso de una categoría sin banda de MercadoLibre (menos de 5 avisos o ninguno)", () => {
    const thinMl = mlCalefon.slice(0, 4);
    const orphan = tyt(20500, { listingId: "sin-banda" });
    const noSpec = tyt(20500, { listingId: "sin-categoria", attributes: {} });
    const result = resolveAmbiguousUnits([...thinMl, orphan, noSpec], 40, ambiguous);
    expect(result.listings.some((l) => l.listingId === "sin-banda")).toBe(false);
    expect(result.listings.some((l) => l.listingId === "sin-categoria")).toBe(false);
    expect(result).toMatchObject({ rescaled: 0, dropped: 2 });
  });

  it("no toca a un vendedor que no está marcado ni a MercadoLibre", () => {
    const other = listing({ sellerKey: "puntounion", listingId: "otro", price: 960000, attributes: { CATEGORY_SPEC: "calefon" } });
    const result = resolveAmbiguousUnits([...mlCalefon, other], 40, ambiguous);
    expect(result.listings).toHaveLength(mlCalefon.length + 1);
    expect(result.listings.find((l) => l.listingId === "otro")!.price).toBe(960000);
    expect(result).toMatchObject({ rescaled: 0, dropped: 0 });
  });

  it("compara en pesos aunque el aviso ambiguo esté en dólares, y reescala en su propia moneda", () => {
    // 24000 USD * 40 = 960000 UYU fuera de banda; 240 USD = 9600 UYU dentro.
    const usd = tyt(24000, { listingId: "usd", currency: "USD" });
    const result = resolveAmbiguousUnits([...mlCalefon, usd], 40, ambiguous);
    const fixed = result.listings.find((l) => l.listingId === "usd")!;
    expect(fixed.price).toBe(240);
    expect(fixed.currency).toBe("USD");
  });
});
