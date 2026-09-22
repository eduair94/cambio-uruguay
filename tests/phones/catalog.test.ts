import { describe, expect, it } from "vitest";
import {
  buildPhoneCatalog,
  PHONE_MIN_BAND_SAMPLE,
  PHONE_NEW_CEILING_UYU,
  PHONE_NEW_FLOOR_UYU,
  PHONE_USED_CEILING_UYU,
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
      // Close enough together that none trips the leave-one-out ratio guard (fix round 1) — this
      // test is about the median PICK among survivors, not about the guard itself.
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Barato", price: 20_000, image: "cheap.jpg" }),
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Medio", price: 25_000, image: "mid.jpg" }),
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Caro", price: 30_000, image: "expensive.jpg" }),
      // Below PHONE_NEW_FLOOR_UYU: dropped before the image pick ever sees it, however striking its
      // own (fake) image would be.
      listing({ title: "Celular Xiaomi Redmi Note 15 256gb Negro Sospechoso", price: 500, image: "suspect.jpg" }),
    ];
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "xiaomi-redmi-note-15-256gb")!;
    expect(model.image).toBe("mid.jpg");
    expect(model.suspectDropped).toBe(1);
  });

  it("image: prefiere ofertas NUEVAS sobre otras condiciones; sólo recurre a otra condición si no sobrevivió ninguna nueva", () => {
    const withNew = [
      listing({ title: "Celular Honor X5c Plus 256gb Negro Nuevo", price: 20_000, image: "new.jpg" }),
      listing({
        title: "Celular Honor X5c Plus 256gb Negro Usado",
        price: 10_000,
        condition: "used",
        image: "used.jpg",
      }),
    ];
    const modelWithNew = byKey(buildPhoneCatalog({ listings: withNew, usdUyu: 40 }), "honor-x5c-plus-256gb")!;
    // A single new survivor beats a single used one, even though the used one is a valid image too.
    expect(modelWithNew.image).toBe("new.jpg");

    const usedOnly = [
      listing({
        title: "Celular Honor X5c Plus 256gb Negro Usado",
        price: 10_000,
        condition: "used",
        image: "used.jpg",
      }),
    ];
    const modelUsedOnly = byKey(buildPhoneCatalog({ listings: usedOnly, usdUyu: 40 }), "honor-x5c-plus-256gb")!;
    // No new offer survived at all (there wasn't one) -> falls back to the used pool.
    expect(modelUsedOnly.image).toBe("used.jpg");
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

  it("las bandas son pesos enteros: el percentil interpolado se redondea, nunca se publica una fracción de peso", () => {
    const listings = [55_000, 55_001, 60_000].map((price, i) =>
      listing({ title: `Celular Samsung Galaxy A36 256gb Negro Vendedor ${i}`, price })
    );
    const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-a36-256gb")!;
    const band = model.bands.new!;
    expect(band.n).toBe(3);
    // percentile() interpolates: p25 = 55000.5, p75 = 57500.5 — both land on a ".5" on purpose, so
    // this test actually exercises Math.round and not a coincidentally-already-integer value.
    expect(band.min).toBe(55_000);
    expect(band.p25).toBe(55_001);
    expect(band.median).toBe(55_001);
    expect(band.p75).toBe(57_501);
    for (const value of [band.min, band.p25, band.median, band.p75]) expect(Number.isInteger(value)).toBe(true);
  });

  describe("techo absoluto (fix round 1, ruling del controlador)", () => {
    it("una oferta NUEVA por encima de PHONE_NEW_CEILING_UYU es sospechosa aunque sea la única del modelo", () => {
      const models = buildPhoneCatalog({
        usdUyu: 40,
        listings: [listing({ title: "Celular Motorola Moto G06 256gb Azul", price: PHONE_NEW_CEILING_UYU + 1_000 })],
      });
      const model = byKey(models, "motorola-moto-g06-256gb")!;
      expect(model).toBeDefined();
      expect(model.offers).toHaveLength(0);
      expect(model.bands.new).toBeUndefined();
      expect(model.suspectDropped).toBe(1);
    });

    it("el caso de moneda mal etiquetada (USD ~2.200 leído como UYU 2.200.000) queda sospechoso por el techo", () => {
      const models = buildPhoneCatalog({
        usdUyu: 40,
        listings: [
          listing({ title: "Celular Apple iPhone 17 Pro 256gb Azul Profundo", price: 2_200_000, currency: "UYU" }),
        ],
      });
      const model = byKey(models, "apple-iphone-17-pro-256gb")!;
      expect(model.offers).toHaveLength(0);
      expect(model.suspectDropped).toBe(1);
    });

    it("usado/reacondicionado/caja abierta tienen su PROPIO techo, más bajo que el de nuevo", () => {
      expect(PHONE_USED_CEILING_UYU).toBeLessThan(PHONE_NEW_CEILING_UYU);
      const price = PHONE_USED_CEILING_UYU + 1_000; // above the used ceiling, below the new one
      expect(price).toBeLessThan(PHONE_NEW_CEILING_UYU);
      const listings = [
        listing({ title: "Celular Apple iPhone 16 Pro 256gb Negro", price, condition: "new", sellerKey: "store:a" }),
        listing({
          title: "Celular Apple iPhone 16 Pro 256gb Negro",
          price,
          condition: "refurbished",
          sellerKey: "store:b",
        }),
      ];
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "apple-iphone-16-pro-256gb")!;
      // The NEW one clears its (higher) ceiling; the REFURBISHED one, at the exact same price,
      // fails its own (lower) ceiling — the two ceilings are genuinely different values.
      expect(model.offers).toHaveLength(1);
      expect(model.offers[0]!.condition).toBe("new");
      expect(model.suspectDropped).toBe(1);
    });
  });

  describe("mediana de las demás ofertas (leave-one-out iterativo, fix round 2, ruling del controlador)", () => {
    it("[56000, 56500, 250000] nueva: 250000 es la única sospechosa; las otras dos sobreviven aunque una pasada única las marcaría a las tres", () => {
      // El bug que corrige este fix round (encontrado revisando eb49d731): una sola pasada calcula
      // la mediana de "las otras" de 56000 sobre {56500, 250000} = 153.250, y 56000/153.250 ≈ 36,5%
      // — por debajo del piso, marcada, aunque 56000 es un precio perfectamente normal. Lo mismo le
      // pasa a 56500. El algoritmo iterativo saca PRIMERO a la peor (250000, la de mayor desvío en
      // escala logarítmica), recalcula sobre lo que queda, y ahí 56000 y 56500 se comparan entre sí
      // y salen "ok".
      const listings = [56_000, 56_500, 250_000].map((price, i) =>
        listing({ title: `Celular Motorola Razr 70 Ultra 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "motorola-razr-70-ultra-256gb")!;
      expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([56_000, 56_500]);
      expect(model.suspectDropped).toBe(1);
      // Con sólo 2 sobrevivientes (por debajo de PHONE_MIN_BAND_SAMPLE) el bucle ya no puede seguir
      // sacando ofertas de a una — se detiene ahí, y esos 2 quedan sin banda, no sin oferta.
      expect(model.bands.new).toBeUndefined();
    });

    it("dos outliers [5000, 56000, 57000, 58000, 290000] nueva: los dos se sacan de a uno, las tres normales sobreviven", () => {
      // 290000 queda DEBAJO de PHONE_NEW_CEILING_UYU (300.000) a propósito, para que el techo
      // absoluto no lo saque antes de llegar a esta guarda — el punto de este test es precisamente
      // que la guarda iterativa, no el techo, es la que tiene que sacar a los dos, uno por vez.
      const listings = [5_000, 56_000, 57_000, 58_000, 290_000].map((price, i) =>
        listing({ title: `Celular Nokia G60 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "nokia-g60-256gb")!;
      expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([56_000, 57_000, 58_000]);
      expect(model.suspectDropped).toBe(2);
      expect(model.bands.new!.n).toBe(3);
    });

    it("es determinístico: el mismo grupo con outliers, en otro orden de entrada, saca las mismas ofertas", () => {
      const prices = [5_000, 56_000, 57_000, 58_000, 290_000];
      // Title, url AND sellerKey keyed by price (not by array index or the module's own listing()
      // counter) on purpose: the whole point of this test is that the SAME listing must produce the
      // SAME offer regardless of where it sits in the input array, so nothing about a listing's own
      // fields may depend on its position or on how many other listing() calls happened before it.
      const build = (order: number[]) =>
        byKey(
          buildPhoneCatalog({
            usdUyu: 40,
            listings: order.map((price) =>
              listing({
                title: `Celular Nokia G60 256gb Negro Vendedor ${price}`,
                price,
                // El id del aviso también va por precio: el helper lo deriva de un contador de
                // llamadas, así que sin esto el "mismo" aviso entra con dos identidades distintas
                // según el orden y el test compararía dos avisos diferentes, no dos órdenes.
                listingId: `store:${price}`,
                sellerKey: `store:${price}`,
                sellerName: `Seller ${price}`,
                url: `https://example.com.uy/p/nokia-g60-${price}`,
              })
            ),
          }),
          "nokia-g60-256gb"
        )!;
      const forward = build(prices);
      const shuffled = build([...prices].reverse());
      expect(shuffled).toEqual(forward);
    });

    it("[30000, 60000, 61000] nueva: 30000 es sospechosa (49,5% de la mediana de las otras dos), las otras dos sobreviven", () => {
      const listings = [30_000, 60_000, 61_000].map((price, i) =>
        listing({ title: `Celular Samsung Galaxy A56 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-a56-256gb")!;
      expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([60_000, 61_000]);
      expect(model.suspectDropped).toBe(1);
      // The shared percentile band ALONE does not catch this (it judges all three "ok"): this case
      // exists specifically to prove the leave-one-out guard adds real coverage on top of it.
      expect(model.bands.new).toBeUndefined(); // only 2 survivors left, below PHONE_MIN_BAND_SAMPLE
    });

    it("[55000, 58000, 120000] nueva: las tres sobreviven — 212% de la mediana de las otras dos está permitido a propósito", () => {
      const listings = [55_000, 58_000, 120_000].map((price, i) =>
        listing({ title: `Celular Samsung Galaxy S26 Ultra 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-s26-ultra-256gb")!;
      // 120000 / mediana(55000, 58000) = 120000 / 56500 ≈ 212%, por debajo del 250% de tope para
      // "new" — una variante más cara (Ultra vs. base, o más almacenamiento) mezclada en el mismo
      // grupo no debe gatillar el guardarraíl.
      expect(model.offers).toHaveLength(3);
      expect(model.suspectDropped).toBe(0);
    });

    it("[5500, 56000, 57000] nueva: 5500 queda sospechosa (la banda por percentiles o el leave-one-out, cualquiera de las dos alcanza)", () => {
      const listings = [5_500, 56_000, 57_000].map((price, i) =>
        listing({ title: `Celular Xiaomi Poco X8 Pro Max 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "xiaomi-poco-x8-pro-max-256gb")!;
      expect(model.offers.map((o) => o.priceUyu)).not.toContain(5_500);
      expect(model.suspectDropped).toBe(1);
    });

    it("[30000, 31000, 60000] nueva: las tres sobreviven (196,7% de la mediana de las otras dos)", () => {
      const listings = [30_000, 31_000, 60_000].map((price, i) =>
        listing({ title: `Celular Honor Magic 8 Lite 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "honor-magic-8-lite-256gb")!;
      expect(model.offers).toHaveLength(3);
      expect(model.suspectDropped).toBe(0);
    });

    it("no-nuevo tolera un rango más ancho que nuevo: el mismo 278% sobrevive en reacondicionado y no en nuevo", () => {
      // Four offers, not three: with three offers ALL of them would actually get flagged in round
      // one (20000 and 21000 too, since their own "others" median is one lone number — the
      // 57000 — dragging their ratio down alongside the real outlier's), and only the worst-first
      // pick (57000, the largest deviation) saves the other two from ever actually being removed —
      // the iterative guard still gets the right answer, but by a less illustrative path for this
      // test's purpose (which is to isolate the new-vs-refurbished THRESHOLD difference, not to
      // re-demonstrate the multi-flag mechanic already covered by the two dedicated tests above).
      // With four offers the median-of-three-others is robust enough that only 57000 is ever flagged
      // at all, in every round, cleanly isolating the 57000/20500 ≈ 278% case.
      const prices = [20_000, 20_500, 21_000, 57_000]; // 57000 / mediana(20000, 20500, 21000) = 57000/20500 ≈ 278%
      const asCondition = (condition: "new" | "refurbished") =>
        prices.map((price, i) =>
          listing({
            title: `Celular Xiaomi Redmi 15c 256gb Negro Vendedor ${condition}-${i}`,
            price,
            condition,
          })
        );

      const newModel = byKey(buildPhoneCatalog({ listings: asCondition("new"), usdUyu: 40 }), "xiaomi-redmi-15c-256gb")!;
      // 278% > 250% (new's own ceiling) -> the 57000 offer is suspect, the other three survive.
      expect(newModel.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([20_000, 20_500, 21_000]);
      expect(newModel.suspectDropped).toBe(1);

      const refurbModel = byKey(
        buildPhoneCatalog({ listings: asCondition("refurbished"), usdUyu: 40 }),
        "xiaomi-redmi-15c-256gb"
      )!;
      // Same 278%, but refurbished's own ceiling is 300% -> all four survive.
      expect(refurbModel.offers).toHaveLength(4);
      expect(refurbModel.suspectDropped).toBe(0);
    });

    it("con menos de PHONE_MIN_BAND_SAMPLE ofertas, el leave-one-out no corre (ya cubierto por el piso/techo absoluto)", () => {
      const listings = [
        listing({ title: "Celular Motorola Edge 70 256gb Negro Uno", price: 30_000, sellerKey: "store:a" }),
        listing({ title: "Celular Motorola Edge 70 256gb Negro Dos", price: 90_000, sellerKey: "store:b" }),
      ];
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "motorola-edge-70-256gb")!;
      expect(model.offers).toHaveLength(2);
      expect(model.suspectDropped).toBe(0);
    });
  });

  it("esimOnlySeen se calcula sobre las ofertas PUBLICADAS (recortadas a 30), no sobre todas las que sobrevivieron el screening", () => {
    const cheap = Array.from({ length: 31 }, (_, i) =>
      listing({
        title: `Celular Apple iPhone 16e 128gb Negro Vendedor ${i}`,
        price: 10_000 + i,
        sellerKey: `store:cheap-${i}`,
      })
    );
    // The priciest of the 32, tight enough to the rest to survive every screen (ratio ~1.003 of the
    // group's leave-one-out median) but still the single most expensive -> sorts last and falls
    // past the 30-offer cap.
    const esimOffer = listing({
      title: "Apple iPhone 16e Esim 128gb Negro Vendedor Esim",
      price: 10_031,
      sellerKey: "store:esim",
    });
    const model = byKey(buildPhoneCatalog({ listings: [...cheap, esimOffer], usdUyu: 40 }), "apple-iphone-16e-128gb")!;
    expect(model.offers).toHaveLength(30);
    expect(model.offers.some((o) => o.esimOnly)).toBe(false);
    expect(model.esimOnlySeen).toBe(false);
  });

  describe("dos poblaciones parejas se abstienen (fix round 3, ruling del controlador)", () => {
    it("3 nuevas baratas + 3 nuevas caras (salto ≥1.8x): el grupo es ambiguo, sin banda ni ofertas nuevas", () => {
      const prices = [40_000, 41_000, 42_000, 90_000, 91_000, 92_000];
      const listings = prices.map((price, i) =>
        listing({ title: `Celular Xiaomi Redmi Note 15 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "xiaomi-redmi-note-15-256gb")!;
      expect(model).toBeDefined();
      expect(model.offers).toHaveLength(0);
      expect(model.bands.new).toBeUndefined();
      expect(model.ambiguousDropped).toBe(6);
      // Nada acá fue juzgado individualmente malo — todo el grupo se abstuvo, no se rechazó oferta
      // por oferta — así que nada de esto pasa por suspectDropped.
      expect(model.suspectDropped).toBe(0);
      expect(model.ambiguousConditions).toEqual(["new"]);
    });

    it("2 nuevas baratas + 3 nuevas caras: también ambiguo (alcanza con ≥2 ofertas de cada lado)", () => {
      const prices = [40_000, 41_000, 90_000, 91_000, 92_000];
      const listings = prices.map((price, i) =>
        listing({ title: `Celular Xiaomi Poco X8 Pro Max 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "xiaomi-poco-x8-pro-max-256gb")!;
      expect(model.offers).toHaveLength(0);
      expect(model.bands.new).toBeUndefined();
      expect(model.ambiguousDropped).toBe(5);
      expect(model.ambiguousConditions).toEqual(["new"]);
    });

    it("1 nueva barata + 3 nuevas caras: NO es ambiguo (un solo lado no es una población) — se screenea como siempre", () => {
      const prices = [40_000, 90_000, 91_000, 92_000];
      const listings = prices.map((price, i) =>
        listing({ title: `Celular Honor X5c Plus 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "honor-x5c-plus-256gb")!;
      expect(model.ambiguousDropped).toBe(0);
      expect(model.ambiguousConditions).toEqual([]);
      // 40000 sigue siendo un outlier de la guarda de siempre (screenByMedianOfOthers), no de la
      // guarda de ambigüedad: un solo outlier junto a un cluster real es exactamente el caso
      // ordinario, no dos poblaciones.
      expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([90_000, 91_000, 92_000]);
      expect(model.suspectDropped).toBe(1);
      expect(model.bands.new!.n).toBe(3);
    });

    it("es determinístico: el grupo ambiguo da el mismo resultado con la entrada en otro orden", () => {
      const prices = [40_000, 41_000, 42_000, 90_000, 91_000, 92_000];
      const build = (order: number[]) =>
        byKey(
          buildPhoneCatalog({
            usdUyu: 40,
            listings: order.map((price) =>
              listing({
                title: `Celular Xiaomi Redmi Note 15 256gb Negro Vendedor ${price}`,
                price,
                sellerKey: `store:${price}`,
                sellerName: `Seller ${price}`,
                url: `https://example.com.uy/p/redmi-note-15-${price}`,
              })
            ),
          }),
          "xiaomi-redmi-note-15-256gb"
        )!;
      const forward = build(prices);
      const shuffled = build([...prices].reverse());
      expect(shuffled).toEqual(forward);
    });

    // Regresión: estos dos casos del fix round 2 no deben verse afectados por la guarda de
    // ambigüedad — ambos tienen un salto ≥1.8x en algún punto, pero el lado más chico de ese salto
    // tiene sólo 1 oferta, así que nunca cuentan como dos poblaciones.
    it("regresión: [55000, 58000, 120000] sigue sin ser ambiguo — las tres sobreviven", () => {
      const listings = [55_000, 58_000, 120_000].map((price, i) =>
        listing({ title: `Celular Samsung Galaxy S26 Ultra 256gb Negro Vendedor rr${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "samsung-galaxy-s26-ultra-256gb")!;
      expect(model.ambiguousConditions).toEqual([]);
      expect(model.offers).toHaveLength(3);
      expect(model.suspectDropped).toBe(0);
    });

    it("regresión: [56000, 56500, 250000] sigue sin ser ambiguo — sólo 250000 se descarta", () => {
      const listings = [56_000, 56_500, 250_000].map((price, i) =>
        listing({ title: `Celular Motorola Razr 70 Ultra 256gb Negro Vendedor rr${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "motorola-razr-70-ultra-256gb")!;
      expect(model.ambiguousConditions).toEqual([]);
      expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([56_000, 56_500]);
      expect(model.suspectDropped).toBe(1);
    });

    it("sesgo conocido y documentado: en un empate exacto entre dos outliers opuestos, la guarda saca al más barato", () => {
      // A=50000, B=90000, C=210000: mediana(B,C)=150000, A/150000=1/3; mediana(A,B)=70000,
      // C/70000=3 exacto. |ln(1/3)| y |ln(3)| difieren sólo por ruido de punto flotante (~2e-16,
      // ver TIE_EPSILON) — un empate real. Con sólo 3 ofertas, sacar a la primera (A, la más
      // barata, por el desempate de screenByMedianOfOthers) deja el grupo en 2, por debajo de
      // PHONE_MIN_BAND_SAMPLE, así que el bucle se detiene ahí: C sobrevive sin haber sido "mejor"
      // que A en ningún sentido real, sólo porque el desempate prefiere sacar la más barata.
      const listings = [50_000, 90_000, 210_000].map((price, i) =>
        listing({ title: `Celular Nokia Xr21 256gb Negro Vendedor ${i}`, price })
      );
      const model = byKey(buildPhoneCatalog({ listings, usdUyu: 40 }), "nokia-xr21-256gb")!;
      expect(model.offers.map((o) => o.priceUyu).sort((a, b) => a - b)).toEqual([90_000, 210_000]);
      expect(model.suspectDropped).toBe(1);
      // Un split 1-contra-2 nunca llega al piso de ambigüedad (que exige ≥2 de cada lado).
      expect(model.ambiguousDropped).toBe(0);
    });
  });
});
