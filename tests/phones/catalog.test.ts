import { describe, expect, it } from "vitest";
import {
  buildPhoneCatalog,
  PHONE_MIN_BAND_SAMPLE,
  PHONE_NEW_FLOOR_UYU,
  PHONE_USED_FLOOR_UYU,
  type PhoneModel,
} from "../../classes/phones/catalog";
import type { RetailListing } from "../../classes/retail/types";

let counter = 0;

function listing(overrides: Partial<RetailListing> & { title: string }): RetailListing {
  counter += 1;
  return {
    listingId: `x:${counter}`,
    source: "store",
    sellerKey: `store:seller-${counter}`,
    sellerName: `Seller ${counter}`,
    channel: "local-store",
    url: `https://example.com.uy/p/${counter}`,
    price: 30_000,
    currency: "UYU",
    condition: "new",
    available: true,
    image: null,
    brand: "",
    model: "",
    catalogId: null,
    attributes: {},
    rating: null,
    ratingCount: 0,
    location: null,
    freeShipping: null,
    officialStore: false,
    observedAt: "2026-09-16T00:00:00.000Z",
    ...overrides,
  };
}

const byKey = (models: PhoneModel[], key: string): PhoneModel | undefined => models.find((m) => m.key === key);

describe("buildPhoneCatalog", () => {
  it("junta dos títulos distintos del mismo modelo en un solo modelo con dos ofertas", () => {
    const models = buildPhoneCatalog({
      usdUyu: 40,
      listings: [
        listing({ title: "Apple iPhone 17 Pro (256 GB) - Azul profundo", price: 60_000 }),
        listing({ title: "Iphone 17 Pro 256gb Orange Garantía Oficial", price: 61_000 }),
      ],
    });
    expect(models).toHaveLength(1);
    const model = models[0]!;
    expect(model.key).toBe("apple-iphone-17-pro-256gb");
    expect(model.slug).toBe(model.key);
    expect(model.brand).toBe("apple");
    expect(model.storageGb).toBe(256);
    expect(model.offers).toHaveLength(2);
  });

  it("256gb y 512gb del mismo modelo son dos modelos distintos, nunca uno", () => {
    const models = buildPhoneCatalog({
      usdUyu: 40,
      listings: [
        listing({ title: "Apple iPhone 17 Pro (256 GB) - Azul profundo", price: 60_000 }),
        listing({ title: "Apple iPhone 17 Pro (512 GB) - Azul profundo", price: 75_000 }),
      ],
    });
    expect(models.map((m) => m.key).sort()).toEqual(["apple-iphone-17-pro-256gb", "apple-iphone-17-pro-512gb"]);
  });

  it("convierte USD a UYU con usdUyu; la banda se calcula en pesos, no en la moneda original", () => {
    const models = buildPhoneCatalog({
      usdUyu: 40,
      listings: [
        listing({ title: "Apple iPhone 16 (128 GB) - Negro", price: 1_000, currency: "USD" }),
        listing({ title: "Apple iPhone 16 128gb Negro Original", price: 1_010, currency: "USD" }),
        listing({ title: "Celular Apple iPhone 16 128gb Negro Nuevo", price: 40_400, currency: "UYU" }),
      ],
    });
    const model = byKey(models, "apple-iphone-16-128gb")!;
    const usdOffer = model.offers.find((o) => o.currency === "USD" && o.price === 1_000)!;
    expect(usdOffer.priceUyu).toBe(40_000);
    const uyuOffer = model.offers.find((o) => o.currency === "UYU")!;
    expect(uyuOffer.priceUyu).toBe(40_400);
    // If USD were compared unconverted against UYU, the median would sit around 1.000-40.400 instead
    // of a coherent all-UYU distribution.
    expect(model.bands.new!.median).toBeGreaterThan(39_000);
    expect(model.bands.new!.median).toBeLessThan(41_000);
    expect(model.bands.new!.n).toBe(3);
  });

  it("open-box y reacondicionado nunca entran en bands.new; cada condición tiene su propia banda sólo al llegar a PHONE_MIN_BAND_SAMPLE", () => {
    expect(PHONE_MIN_BAND_SAMPLE).toBe(3);
    const listings = [
      // 3 new -> reaches the band floor.
      listing({ title: "Apple iPhone 16 (128 GB) - Negro", price: 30_000 }),
      listing({ title: "Apple iPhone 16 128gb Negro Original", price: 30_500 }),
      listing({ title: "Celular Apple iPhone 16 128gb Negro Nuevo", price: 31_000 }),
      // 2 open-box -> below the band floor, must stay band-less.
      listing({ title: "Apple iPhone 16 (128 GB) - Negro (Nuevo con caja abierta)", price: 27_000 }),
      listing({ title: "Apple iPhone 16 128gb Negro (Nuevo con caja abierta)", price: 27_500 }),
      // 3 refurbished -> reaches the band floor too, but must stay its OWN band, not merged with new.
      listing({ title: "Apple iPhone 16 128gb Negro", price: 24_000, condition: "refurbished" }),
      listing({ title: "Apple iPhone 16 128gb Negro Excelente", price: 24_500, condition: "refurbished" }),
      listing({ title: "Apple iPhone 16 128gb Negro Grado A", price: 25_000, condition: "refurbished" }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "apple-iphone-16-128gb")!;
    expect(model.bands.new).toBeDefined();
    expect(model.bands.new!.n).toBe(3);
    expect(model.bands.new!.min).toBeGreaterThanOrEqual(30_000);
    expect(model.bands["open-box"]).toBeUndefined();
    expect(model.bands.refurbished).toBeDefined();
    expect(model.bands.refurbished!.n).toBe(3);
    expect(model.offers).toHaveLength(8);
  });

  it("screening por modelo y condición: un repuesto mal titulado a 5.500 entre 6 ofertas de 55.000-62.000 no aparece en offers ni en la banda, y cuenta en suspectDropped", () => {
    const goodPrices = [55_000, 56_500, 58_000, 59_500, 61_000, 62_000];
    const listings = goodPrices.map((price, i) =>
      listing({ title: `Celular Samsung Galaxy S26 256gb Negro Vendedor ${i}`, price })
    );
    // Deliberately NOT the word "repuesto" — that is one of identify.ts's own accessory-exclusion
    // words and would make this listing invisible to the harvester entirely (isPhoneTitle false),
    // never reaching the price-screening this test targets. A fully-identified phone at a wildly
    // implausible price is the actual shape a bad title in the wild produces (a case/funda whose
    // title happens to state a phone's model + storage, see PHONE_NEW_FLOOR_UYU's own comment).
    listings.push(listing({ title: "Celular Samsung Galaxy S26 256gb Negro Precio Loco Vendedor Z", price: 5_500 }));
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-s26-256gb")!;
    expect(model.offers).toHaveLength(6);
    expect(model.offers.some((o) => o.priceUyu === 5_500)).toBe(false);
    expect(model.bands.new!.n).toBe(6);
    expect(model.bands.new!.min).toBeGreaterThan(5_500);
    expect(model.suspectDropped).toBe(1);
  });

  it("dedupe: el mismo vendedor con dos avisos nuevos deja sólo el más barato; con uno nuevo y uno reacondicionado deja los dos", () => {
    const listings = [
      listing({
        title: "Celular Motorola Moto G17 256gb Azul",
        price: 20_000,
        sellerKey: "store:tiendax",
        sellerName: "Tienda X",
      }),
      listing({
        title: "Celular Motorola Moto G17 256gb Rojo",
        price: 19_000,
        sellerKey: "store:tiendax",
        sellerName: "Tienda X",
      }),
      listing({
        title: "Celular Motorola Moto G17 256gb Negro",
        price: 15_000,
        condition: "refurbished",
        sellerKey: "store:tiendax",
        sellerName: "Tienda X",
      }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "motorola-moto-g17-256gb")!;
    const newOffers = model.offers.filter((o) => o.condition === "new");
    const refurbOffers = model.offers.filter((o) => o.condition === "refurbished");
    expect(newOffers).toHaveLength(1);
    expect(newOffers[0]!.priceUyu).toBe(19_000);
    expect(refurbOffers).toHaveLength(1);
    expect(refurbOffers[0]!.priceUyu).toBe(15_000);
  });

  it("newSellers cuenta vendedores distintos (normalizados) sólo entre las ofertas nuevas que pasaron el screening", () => {
    const goodPrices = [55_000, 56_500, 58_000, 59_500, 61_000, 62_000];
    const listings = goodPrices.map((price, i) =>
      listing({ title: `Celular Samsung Galaxy S26 256gb Negro Vendedor ${i}`, price })
    );
    listings.push(listing({ title: "Celular Samsung Galaxy S26 256gb Negro Precio Loco Vendedor Z", price: 5_500 }));
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-s26-256gb")!;
    // 6 distinct sellers survived; the 7th (the 5.500 outlier) was screened out and must not count.
    expect(model.newSellers).toBe(6);
  });

  it("offers ordenadas: nuevas por precio, luego caja abierta, reacondicionado, usado — la condición manda sobre el precio", () => {
    const listings = [
      listing({ title: "Apple iPhone 15 (128 GB) - Verde", price: 50_000, sellerKey: "store:s-new" }),
      listing({
        title: "Apple iPhone 15 (128 GB) - Verde (Nuevo con caja abierta)",
        price: 48_000,
        sellerKey: "store:s-ob",
      }),
      listing({
        title: "Apple iPhone 15 128gb Verde",
        price: 30_000,
        condition: "refurbished",
        sellerKey: "store:s-ref",
      }),
      listing({
        title: "Apple iPhone 15 128gb Verde Usado",
        price: 20_000,
        condition: "used",
        sellerKey: "store:s-used",
      }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "apple-iphone-15-128gb")!;
    expect(model.offers.map((o) => o.condition)).toEqual(["new", "open-box", "refurbished", "used"]);
  });

  it("image: de la oferta de precio mediano entre las que pasaron el screening, nunca de una sospechosa", () => {
    const listings = [
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Barato", price: 10_000, image: "cheap.jpg" }),
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Medio", price: 20_000, image: "mid.jpg" }),
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Caro", price: 90_000, image: "expensive.jpg" }),
      // Below PHONE_NEW_FLOOR_UYU: dropped before the image pick ever sees it, however striking its
      // own (fake) image would be.
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Sospechoso", price: 500, image: "suspect.jpg" }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "xiaomi-redmi-note-15-256gb")!;
    expect(model.image).toBe("mid.jpg");
    expect(model.suspectDropped).toBe(1);
  });

  it("un aviso cuyo título no identifica almacenamiento no crea modelo", () => {
    const models = buildPhoneCatalog({
      usdUyu: 40,
      listings: [listing({ title: "Celular Samsung Galaxy A56 5g Como Nuevo", price: 15_000 })],
    });
    expect(models).toHaveLength(0);
  });

  it("piso absoluto: una oferta NUEVA bajo PHONE_NEW_FLOOR_UYU se descarta aunque sea la única del modelo", () => {
    expect(PHONE_NEW_FLOOR_UYU).toBeGreaterThan(0);
    const models = buildPhoneCatalog({
      usdUyu: 40,
      listings: [listing({ title: "Celular Motorola Moto G06 256gb Azul", price: PHONE_NEW_FLOOR_UYU - 100 })],
    });
    const model = byKey(models, "motorola-moto-g06-256gb")!;
    expect(model).toBeDefined();
    expect(model.offers).toHaveLength(0);
    expect(model.bands.new).toBeUndefined();
    expect(model.suspectDropped).toBe(1);
    expect(model.image).toBeNull();
  });

  it("usado/reacondicionado/caja abierta tienen su PROPIO piso, más bajo que el de nuevo", () => {
    expect(PHONE_USED_FLOOR_UYU).toBeLessThan(PHONE_NEW_FLOOR_UYU);
    const price = PHONE_USED_FLOOR_UYU + 100; // above the used floor, below the new floor
    expect(price).toBeLessThan(PHONE_NEW_FLOOR_UYU);
    const listings = [
      listing({ title: "Celular Motorola Moto G06 256gb Azul", price, condition: "new", sellerKey: "store:a" }),
      listing({ title: "Celular Motorola Moto G06 256gb Azul", price, condition: "used", sellerKey: "store:b" }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "motorola-moto-g06-256gb")!;
    // The NEW one fails its (higher) floor; the USED one, at the exact same price, clears its own
    // (lower) floor — proving the two floors are genuinely different values, not the same one twice.
    expect(model.offers).toHaveLength(1);
    expect(model.offers[0]!.condition).toBe("used");
    expect(model.suspectDropped).toBe(1);
  });

  it("con menos ofertas de las que priceVerdict necesita, sólo rige el piso absoluto (sin banda no hay rechazo estadístico)", () => {
    const listings = [
      listing({ title: "Celular Honor Magic 8 Lite 256gb Negro", price: 30_000, sellerKey: "store:a" }),
      listing({ title: "Celular Honor Magic 8 Lite 256gb Negro Premium", price: 300_000, sellerKey: "store:b" }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "honor-magic-8-lite-256gb")!;
    expect(model.offers).toHaveLength(2);
    expect(model.bands.new).toBeUndefined();
    expect(model.suspectDropped).toBe(0);
  });

  it("identidad de vendedor ML: ml:unknown / 'Mercado Libre' se deduplican a un solo vendedor, y cuentan como máximo 1 en newSellers", () => {
    const anon = (price: number) =>
      listing({
        title: `Celular Samsung Galaxy A17 256gb Negro ML ${price}`,
        price,
        source: "mercadolibre",
        channel: "marketplace",
        sellerKey: "ml:unknown",
        sellerName: "Mercado Libre",
      });
    const real = listing({
      title: "Celular Samsung Galaxy A17 256gb Negro Tienda Real",
      price: 43_000,
      source: "mercadolibre",
      channel: "marketplace",
      sellerKey: "ml:12345",
      sellerName: "Tienda Real",
    });
    const listings = [anon(40_000), anon(41_000), anon(42_000), real];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-a17-256gb")!;
    // n counts every screened raw observation (4); sellers counts DISTINCT normalized sellers (2) —
    // the three anonymous ML rows collapse into one seller identity, the real one is untouched.
    expect(model.bands.new!.n).toBe(4);
    expect(model.bands.new!.sellers).toBe(2);
    expect(model.newSellers).toBe(2);
    // Dedupe keeps only the cheapest of the collapsed anonymous bucket, plus the real seller's own.
    expect(model.offers).toHaveLength(2);
    expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([40_000, 43_000]);
  });

  it("esimOnly por oferta y esimOnlySeen a nivel de modelo", () => {
    const listings = [
      listing({ title: "Apple iPhone 17 Pro (512 GB) - Azul profundo - Sólo eSIM", price: 90_000 }),
      listing({ title: "Apple iPhone 17 Pro 512gb Azul Profundo Original", price: 91_000 }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "apple-iphone-17-pro-512gb")!;
    expect(model.esimOnlySeen).toBe(true);
    const esimOffer = model.offers.find((o) => o.priceUyu === 90_000)!;
    const plainOffer = model.offers.find((o) => o.priceUyu === 91_000)!;
    expect(esimOffer.esimOnly).toBe(true);
    expect(plainOffer.esimOnly).toBe(false);
  });

  it("esimOnlySeen es false cuando ninguna oferta es sólo eSIM", () => {
    const model = byKey(
      buildPhoneCatalog({
        usdUyu: 40,
        listings: [listing({ title: "Apple iPhone 17 Pro 512gb Azul Profundo Dual Sim", price: 90_000 })],
      }),
      "apple-iphone-17-pro-512gb"
    )!;
    expect(model.esimOnlySeen).toBe(false);
  });

  it("es determinístico: reordenar el mismo input produce exactamente la misma salida", () => {
    const listings = [
      listing({ title: "Celular Honor X7e 256gb Negro Uno", price: 20_000, sellerKey: "store:a", url: "https://a.uy/1" }),
      listing({ title: "Celular Honor X7e 256gb Negro Dos", price: 20_000, sellerKey: "store:b", url: "https://b.uy/1" }),
      listing({ title: "Celular Honor X7e 256gb Negro Tres", price: 21_000, sellerKey: "store:c", url: "https://c.uy/1" }),
      listing({ title: "Apple iPhone 16e (128 Gb) - Blanco", price: 30_000, sellerKey: "store:d" }),
    ];
    const forward = buildPhoneCatalog({ listings, usdUyu: 40 });
    const shuffled = buildPhoneCatalog({ listings: [...listings].reverse(), usdUyu: 40 });
    expect(shuffled).toEqual(forward);
  });
});
