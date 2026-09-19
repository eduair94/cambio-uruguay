import { describe, expect, it } from "vitest";
import { attachFuelEconomy, readFuelEconomy } from "../../classes/autos/fuelEconomy";

// Phrases copied from live Mercado Libre adverts (2026-09-19). Sellers write km per litre; the
// directory measures litres per 100 km.
describe("the fuel consumption an advert states, in litres per 100 km", () => {
  it("reads city and highway from the dealer template", () => {
    expect(readFuelEconomy("Bluetooth • Entrada USB Consumo medio en ruta: 19 km/l. Consumo medio en ciudad: 17 km/l. El valor estimado de la Patente")).toEqual({
      city: 5.9, highway: 5.3, combined: null, litersPer100Km: 5.6,
    });
    expect(readFuelEconomy("Consumo medio en ruta: 17 km/l.Consumo medio en ciudad: 12,5 km/l.GARANTÍA")).toEqual({
      city: 8, highway: 5.9, combined: null, litersPer100Km: 6.9,
    });
  });

  it.each([
    ["Volkswagen Bora Trendline Manual Motor 2.0 Año 2011 150.000 km Consumo combinado 14km/l Climatizador", 7.1],
    ["-Airbag-ABS-Tasas-Consumo promedio combinado 18km/litro¡TOMAMOS TU VEHÍCULO", 5.6],
    ["Kilometraje: 86.757 Consumo: 12 km por litro Patente $: 14.152", 8.3],
    ["US$12990 Contado\nUS$8990 y cuotas\nHyundai New hb20\n1.0 nafta\n16km Por litro\nAño 2023", 6.3],
    ["Rinde 15 km por litro en ruta y ciudad", 6.7],
    // Already in litres per 100 km: kept as written, not rounded through km per litre and back.
    ["Consumo 6,5 l/100 km combinado", 6.5],
  ])("reads a single figure: %s", (text, litersPer100Km) => {
    expect(readFuelEconomy(text)?.litersPer100Km).toBe(litersPer100Km);
  });

  it("reads 'km x lt' and 'km/lts' with city and highway words around them", () => {
    expect(readFuelEconomy("Rendimiento: En ciudad 11km x lt / En Ruta 14km x lt Valor estimado de la patente")).toEqual({
      city: 9.1, highway: 7.1, combined: null, litersPer100Km: 8.1,
    });
    expect(readFuelEconomy("SÚPER ECONÓMICO Promedio en ruta 18km/lts (a velocidad razonable) Promedio en ciudad 15km/lts aprox")).toEqual({
      city: 6.7, highway: 5.6, combined: null, litersPer100Km: 6.1,
    });
  });

  it("a single city or highway figure is still a figure, and says which one it is", () => {
    expect(readFuelEconomy("Su consumo promedio en ciudad es de 13 km/l, ofreciendo un rendimiento competitivo.")).toEqual({
      city: 7.7, highway: null, combined: null, litersPer100Km: 7.7,
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

  it("a dealer template with litres per 100 km under a km/l label is read as litres", () => {
    expect(readFuelEconomy("Consumo medio en ruta: 5,09 km/l. Consumo medio en ciudad: 7,9 km/l.")).toEqual({
      city: 7.9, highway: 5.1, combined: null, litersPer100Km: 6.5,
    });
    // Backwards and too large to be litres: it is not a figure anyone can trust.
    expect(readFuelEconomy("Consumo medio en ruta: 11 km/l. Consumo medio en ciudad: 14 km/l.")).toBeNull();
  });

  it("an empty text reads nothing", () => {
    expect(readFuelEconomy("")).toBeNull();
  });
});

describe("the fuel consumption of an advert that states none", () => {
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
    // 12, 14 and 13 km/l are 8,3, 7,1 and 7,7 L/100 km.
    expect(out[4]!.fuelEconomy).toEqual({ city: null, highway: null, combined: null, litersPer100Km: 7.7, basis: "model_engine", sellers: 3 });
    expect(out[0]!.fuelEconomy).toMatchObject({ litersPer100Km: 8.3, basis: "advert", sellers: null });
  });

  it("counts one figure per seller: a dealer's template on ten cars is one guess", () => {
    const dealer = Array.from({ length: 10 }, () => described(20, { sellerId: "big" }));
    const out = attachFuelEconomy([...dealer, described(12), car({})]);
    // Two sellers (the dealer and one private seller) are not enough to speak for the model.
    expect(out.at(-1)!.fuelEconomy).toBeNull();
  });

  it("falls back to the model when the engine has too few sellers", () => {
    const out = attachFuelEconomy([described(12, { engine: "1.2" }), described(14, { engine: "1.5" }), described(16, { engine: "1.6" }), car({ engine: "2.0" })]);
    expect(out[3]!.fuelEconomy).toMatchObject({ litersPer100Km: 7.1, basis: "model", sellers: 3 });
  });

  it("groups by the model's name: an unmatched dealer website has a synthetic id", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), car({ brandId: "x-peugeot", modelId: "x-208" })]);
    expect(out[3]!.fuelEconomy).toMatchObject({ litersPer100Km: 7.7, basis: "model_engine" });
  });

  it("an advert with no known fuel takes the model's figure of any fuel", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), car({ fuel: null, engine: null })]);
    expect(out[3]!.fuelEconomy).toMatchObject({ litersPer100Km: 7.7, basis: "model" });
  });

  it("with no seller of the model stating it, takes the same fuel and displacement, from ten sellers", () => {
    const others = Array.from({ length: 10 }, (_, index) =>
      described(10 + index, { marketSlug: `other-${index}`, engine: "2.0" }));
    const bmw = car({ marketSlug: "bmw-serie-3", engine: "2.0" });
    expect(attachFuelEconomy([...others, bmw]).at(-1)!.fuelEconomy).toMatchObject({ litersPer100Km: 6.9, basis: "engine_class", sellers: 10 });
    expect(attachFuelEconomy([...others.slice(0, 9), bmw]).at(-1)!.fuelEconomy).toBeNull();
  });

  it("does not take a claim no car that only burns fuel can do, and keeps it for hybrids", () => {
    const others = [described(12), described(14), described(13)];
    // "25 km/l" is 4 L/100 km: not a Clio 0.9 on petrol.
    const clio = described(25);
    expect(attachFuelEconomy([...others, clio]).at(-1)!.fuelEconomy).toMatchObject({ litersPer100Km: 7.7, basis: "model_engine" });
    // The same figure on a Prius (named so, fuel missing) is the advert's.
    const prius = described(25, { fuel: null, title: "Toyota Prius 1.8", marketSlug: "toyota-prius" });
    expect(attachFuelEconomy([prius]).at(-1)!.fuelEconomy).toMatchObject({ litersPer100Km: 4, basis: "advert" });
    // "hev" inside "Chevrolet" is not a hybrid.
    const onix = described(25, { title: "Chevrolet Onix 1.0 Turbo" });
    expect(attachFuelEconomy([...others, onix]).at(-1)!.fuelEconomy).toMatchObject({ basis: "model_engine" });
  });

  it("never mixes fuels, and gives electric cars no km per litre", () => {
    const out = attachFuelEconomy([described(12), described(14), described(13), car({ fuel: "diesel" }), car({ fuel: "electrico" })]);
    expect(out[3]!.fuelEconomy).toBeNull();
    expect(out[4]!.fuelEconomy).toBeNull();
  });
});
