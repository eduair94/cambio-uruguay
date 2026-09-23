// De la tarjeta cruda a la moto: kilometraje, evidencia de tipo, moneda y baja de precio.
import { describe, expect, it } from "vitest";
import { enrichMotoListing, motoKmQuality, motoPriceDrop } from "../../classes/motos/enrich";
import type { RawMotoListing } from "../../classes/motos/types";

const SEEN = "2026-09-22T11:00:00.000Z";

const raw = (over: Partial<RawMotoListing> = {}): RawMotoListing => ({
  id: "MLU1",
  source: "mercadolibre",
  brandId: "2102273",
  brand: "Yumbo",
  modelId: "8801",
  model: "GS 200",
  title: "Yumbo Gs 200 Cc 2020",
  year: 2020,
  km: 12_000,
  price: 1_500,
  currency: "USD",
  fuel: "nafta",
  neighborhood: null,
  department: "Montevideo",
  sellerType: "private",
  sellerId: "1",
  picture: null,
  pictureCount: 1,
  permalink: "https://moto.mercadolibre.com.uy/MLU-1-yumbo-_JM",
  observedAt: SEEN,
  ...over,
});

const enrich = (over: Partial<RawMotoListing> = {}, context: Record<string, unknown> = {}) =>
  enrichMotoListing(raw(over), { usdUyu: 42, firstSeen: SEEN, lastSeen: SEEN, priceHistory: [], ...context } as never);

describe("kilometraje", () => {
  it("un 1 es 'no declaré', no un kilómetro", () => {
    expect(motoKmQuality(1)).toBe("placeholder");
    expect(motoKmQuality(0)).toBe("placeholder");
  });

  it("pero 11 km en una moto de 2026 es un número real — el umbral de autos los habría borrado", () => {
    expect(motoKmQuality(11)).toBe("ok");
    expect(motoKmQuality(200)).toBe("ok");
    expect(motoKmQuality(999)).toBe("ok");
  });

  it("el dígito repetido largo sigue siendo el placeholder clásico de Mercado Libre", () => {
    expect(motoKmQuality(111_111)).toBe("placeholder");
    expect(motoKmQuality(11_111)).toBe("placeholder");
    expect(motoKmQuality(1_111)).toBe("placeholder");
    expect(motoKmQuality(111)).toBe("ok");
  });

  it("un kilometraje que no puede ser el de una moto tampoco cuenta", () => {
    expect(motoKmQuality(400_000)).toBe("placeholder");
  });

  it("sin dato es sin dato, no cero", () => {
    expect(motoKmQuality(null)).toBe("unknown");
  });
});

describe("evidencia del tipo", () => {
  it("la faceta del origen le gana al título", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc Naked" }, { declaredType: "scooter" });
    expect(listing.type).toBe("scooter");
    expect(listing.typeBasis).toBe("mercadolibre");
  });

  it("sin faceta, la palabra del título alcanza pero se declara como tal", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc Naked" });
    expect(listing.type).toBe("naked");
    expect(listing.typeBasis).toBe("title");
  });

  it("sin ninguna de las dos, no hay tipo y no hay base", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc" });
    expect(listing.type).toBeNull();
    expect(listing.typeBasis).toBeNull();
  });
});

describe("tramo de cilindrada", () => {
  it("la faceta del origen le gana al título", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc 2020" }, { declaredBand: "hasta-125" });
    expect(listing.displacementBand).toBe("hasta-125");
    expect(listing.displacementBandBasis).toBe("mercadolibre");
    // Y la cilindrada EXACTA sigue siendo la del título: un tramo nunca la inventa.
    expect(listing.displacement).toBe(200);
  });

  it("sin faceta, el tramo se deriva de la cilindrada del título", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc 2020" });
    expect(listing.displacementBand).toBe("126-250");
    expect(listing.displacementBandBasis).toBe("title");
  });

  it("sin ninguna de las dos, no hay tramo y se declara", () => {
    const listing = enrich({ title: "Yumbo Gs 2020 impecable" });
    expect(listing.displacement).toBeNull();
    expect(listing.displacementBand).toBeNull();
    expect(listing.displacementBandBasis).toBeNull();
  });
});

describe("moneda y precio", () => {
  it("un precio en pesos se convierte, y se marca que se convirtió", () => {
    const listing = enrich({ price: 63_000, currency: "UYU" });
    expect(listing.priceUsd).toBe(1_500);
    expect(listing.priceConverted).toBe(true);
    // Nunca DEDUCIDA: Mercado Libre declara la moneda en cada tarjeta.
    expect(listing.currencyInferred).toBe(false);
  });

  it("una baja de precio sólo se afirma si la vimos, y en la misma moneda", () => {
    const history = [
      { price: 1_800, currency: "USD" as const, observedAt: "2026-09-20T11:00:00.000Z" },
      { price: 1_500, currency: "USD" as const, observedAt: SEEN },
    ];
    expect(motoPriceDrop({ price: 1_500, currency: "USD" }, history)).toEqual({
      from: 1_800,
      currency: "USD",
      since: SEEN,
    });
  });

  it("un cambio de moneda no es una baja del 4.000 %", () => {
    const history = [
      { price: 63_000, currency: "UYU" as const, observedAt: "2026-09-20T11:00:00.000Z" },
      { price: 1_500, currency: "USD" as const, observedAt: SEEN },
    ];
    expect(motoPriceDrop({ price: 1_500, currency: "USD" }, history)).toBeNull();
  });
});

describe("combustible", () => {
  it("el título alcanza cuando la etiqueta de Mercado Libre no lo dice", () => {
    expect(enrich({ title: "Yumbo Gs Eléctrica Litio", fuel: null }).fuel).toBe("electrica");
  });

  it("y lo que no dice nada no se declara eléctrico", () => {
    expect(enrich({ title: "Yumbo Gs 200 Cc", fuel: null }).fuel).toBeNull();
  });
});
