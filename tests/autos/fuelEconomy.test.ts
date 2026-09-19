import { describe, expect, it } from "vitest";
import { attachFuelEconomy, readFuelEconomy } from "../../classes/autos/fuelEconomy";

// Phrases copied from live Mercado Libre adverts (2026-09-19).
describe("the fuel economy an advert states", () => {
  it("reads city and highway from the dealer template", () => {
    expect(readFuelEconomy("Bluetooth • Entrada USB Consumo medio en ruta: 19 km/l. Consumo medio en ciudad: 17 km/l. El valor estimado de la Patente")).toEqual({
      city: 17, highway: 19, combined: null, kmPerLiter: 18,
    });
    expect(readFuelEconomy("Consumo medio en ruta: 17 km/l.Consumo medio en ciudad: 12,5 km/l.GARANTÍA")).toEqual({
      city: 12.5, highway: 17, combined: null, kmPerLiter: 14.8,
    });
  });

  it.each([
    ["Volkswagen Bora Trendline Manual Motor 2.0 Año 2011 150.000 km Consumo combinado 14km/l Climatizador", 14],
    ["-Airbag-ABS-Tasas-Consumo promedio combinado 18km/litro¡TOMAMOS TU VEHÍCULO", 18],
    ["Kilometraje: 86.757 Consumo: 12 km por litro Patente $: 14.152", 12],
    ["US$12990 Contado\nUS$8990 y cuotas\nHyundai New hb20\n1.0 nafta\n16km Por litro\nAño 2023", 16],
    ["Rinde 15 km por litro en ruta y ciudad", 15],
    ["Consumo 6,5 l/100 km combinado", 15.4],
  ])("reads a single figure: %s", (text, kmPerLiter) => {
    expect(readFuelEconomy(text)?.kmPerLiter).toBe(kmPerLiter);
  });

  it("reads 'km x lt' and 'km/lts' with city and highway words around them", () => {
    expect(readFuelEconomy("Rendimiento: En ciudad 11km x lt / En Ruta 14km x lt Valor estimado de la patente")).toEqual({
      city: 11, highway: 14, combined: null, kmPerLiter: 12.5,
    });
    expect(readFuelEconomy("SÚPER ECONÓMICO Promedio en ruta 18km/lts (a velocidad razonable) Promedio en ciudad 15km/lts aprox")).toEqual({
      city: 15, highway: 18, combined: null, kmPerLiter: 16.5,
    });
  });

  it("a single city or highway figure is still a figure, and says which one it is", () => {
    expect(readFuelEconomy("Su consumo promedio en ciudad es de 13 km/l, ofreciendo un rendimiento competitivo.")).toEqual({
      city: 13, highway: null, combined: null, kmPerLiter: 13,
    });
  });

  it.each([
    "Velocidad máxima 180 km/h, 0 a 100 en 10 segundos",
    "Kilómetros: 130.000 - Motor 1.6 - 5 puertas",
    "Excelente consumo y rendimiento",
    "Tanque de 55 L, baúl de 280 L",
    "Autonomía eléctrica 300 km",
  ])("reads nothing where there is no figure: %s", text => {
    expect(readFuelEconomy(text)).toBeNull();
  });

  it("drops a figure no car can do", () => {
    expect(readFuelEconomy("Consumo: 2 km/l")).toBeNull();
    expect(readFuelEconomy("Consumo: 90 km/l")).toBeNull();
  });

  it("a link is not a figure", () => {
    expect(readFuelEconomy("> Ficha Técnica: http://specs.multiaviso.com/a7w3w7kl > Patente Anual Aproximada")).toBeNull();
  });

  it("a dealer template with litres per 100 km under a km/l label is converted", () => {
    expect(readFuelEconomy("Consumo medio en ruta: 5,09 km/l. Consumo medio en ciudad: 7,9 km/l.")).toEqual({
      city: 12.7, highway: 19.6, combined: null, kmPerLiter: 16.2,
    });
    // Backwards and too large to be litres: it is not a figure anyone can trust.
    expect(readFuelEconomy("Consumo medio en ruta: 11 km/l. Consumo medio en ciudad: 14 km/l.")).toBeNull();
  });

  it("an empty text reads nothing", () => {
    expect(readFuelEconomy("")).toBeNull();
  });
});

describe("the fuel economy of an advert that states none", () => {
  const base = {
    source: "mercadolibre", brand: "Peugeot", model: "208", year: 2019, km: 80000, price: 12000, currency: "USD",
    transmission: "manual", neighborhood: null, department: "Montevideo", sellerType: "dealer", picture: null,
    pictureCount: 1, permalink: "https://auto.mercadolibre.com.uy/MLU-1-x-_JM", observedAt: "2026-09-19T00:00:00.000Z",
    sourceName: "Mercado Libre", reference: null, brandSlug: "peugeot", modelSlug: "208", marketSlug: "peugeot-208",
    trim: null, trimLabel: null, kmQuality: "ok", flags: [], priceUsd: 12000, priceConverted: false,
    firstSeen: "2026-09-10T00:00:00.000Z", lastSeen: "2026-09-19T00:00:00.000Z", priceDrop: null, photoCheck: null,
  } as const;
  let serial = 0;
  const car = (overrides: Record<string, unknown>) => {
    serial++;
    return {
      ...base, id: `MLU${serial}`, key: `ml-MLU${serial}`, brandId: "b", modelId: "m", fuel: "nafta", engine: "1.6",
      title: "Peugeot 208 1.6", sellerId: `s${serial}`, detail: null, ...overrides,
    } as unknown as import("../../classes/autos/types").CarListing;
  };
  const described = (kml: number, overrides: Record<string, unknown> = {}) =>
    car({ detail: { description: `Consumo combinado ${kml} km/l` }, ...overrides });

  it("takes the median of other sellers of the same model and engine", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), described(30, { engine: "1.0" }), car({})]);
    expect(out[4]!.fuelEconomy).toEqual({ city: null, highway: null, combined: null, kmPerLiter: 13, basis: "model_engine", sellers: 3 });
    expect(out[0]!.fuelEconomy).toMatchObject({ kmPerLiter: 12, basis: "advert", sellers: null });
  });

  it("counts one figure per seller: a dealer's template on ten cars is one guess", () => {
    const dealer = Array.from({ length: 10 }, () => described(20, { sellerId: "big" }));
    const out = attachFuelEconomy([...dealer, described(12), car({})]);
    // Two sellers (the dealer and one private seller) are not enough to speak for the model.
    expect(out.at(-1)!.fuelEconomy).toBeNull();
  });

  it("falls back to the model when the engine has too few sellers", () => {
    const out = attachFuelEconomy([described(12, { engine: "1.2" }), described(14, { engine: "1.5" }), described(16, { engine: "1.6" }), car({ engine: "2.0" })]);
    expect(out[3]!.fuelEconomy).toMatchObject({ kmPerLiter: 14, basis: "model", sellers: 3 });
  });

  it("groups by the model's name: an unmatched dealer website has a synthetic id", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), car({ brandId: "x-peugeot", modelId: "x-208" })]);
    expect(out[3]!.fuelEconomy).toMatchObject({ kmPerLiter: 13, basis: "model_engine" });
  });

  it("an advert with no known fuel takes the model's figure of any fuel", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), car({ fuel: null, engine: null })]);
    expect(out[3]!.fuelEconomy).toMatchObject({ kmPerLiter: 13, basis: "model" });
  });

  it("with no seller of the model stating it, takes the same fuel and displacement, from ten sellers", () => {
    const others = Array.from({ length: 10 }, (_, index) =>
      described(10 + index, { marketSlug: `other-${index}`, engine: "2.0" }));
    const bmw = car({ marketSlug: "bmw-serie-3", engine: "2.0" });
    expect(attachFuelEconomy([...others, bmw]).at(-1)!.fuelEconomy).toMatchObject({ kmPerLiter: 14.5, basis: "engine_class", sellers: 10 });
    expect(attachFuelEconomy([...others.slice(0, 9), bmw]).at(-1)!.fuelEconomy).toBeNull();
  });

  it("never mixes fuels, and gives electric cars no km per litre", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), car({ fuel: "diesel" }), car({ fuel: "electrico" })]);
    expect(out[3]!.fuelEconomy).toBeNull();
    expect(out[4]!.fuelEconomy).toBeNull();
  });
});
