import { describe, expect, it } from "vitest";
import { dropImplausiblePrices, priceDropSummary, PRICE_ABSOLUTE_FLOOR_USD } from "../../classes/autos/priceSanity";
import type { CarListing } from "../../classes/autos/types";

let seq = 0;
const car = (overrides: Partial<CarListing> = {}): CarListing =>
  ({
    key: `ml-MLU${++seq}`, id: `MLU${seq}`, source: "mercadolibre", sourceName: "Mercado Libre",
    brandId: "1", brand: "Toyota", modelId: "2", model: "Hilux", brandSlug: "toyota", modelSlug: "hilux",
    marketSlug: "toyota-hilux", title: "Toyota Hilux", year: 2015, km: 90_000, price: 20_000,
    currency: "USD", priceUsd: 20_000, priceConverted: false, transmission: "manual", fuel: "diesel",
    neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: null, picture: null,
    pictureCount: null, permalink: "https://auto.mercadolibre.com.uy/MLU-1", observedAt: "2026-09-21T00:00:00.000Z",
    engine: "3.0", trim: null, trimLabel: null, kmQuality: "ok", flags: [], firstSeen: "2026-09-01T00:00:00.000Z",
    lastSeen: "2026-09-21T00:00:00.000Z", priceDrop: null, detail: null, reference: null,
    ...overrides,
  }) as CarListing;

/** Un grupo de n autos iguales al mismo precio, para que su mediana sea ese precio. */
const cohort = (n: number, priceUsd: number, overrides: Partial<CarListing> = {}): CarListing[] =>
  Array.from({ length: n }, () => car({ priceUsd, price: priceUsd, ...overrides }));

describe("dropImplausiblePrices", () => {
  it("retira el aviso cuyo precio es una fraccion de los de su mismo modelo y ano", () => {
    // El caso medido: una Hilux 2015 "inmaculada" a $U 35.500 entre Hilux 2015 de US$ 16.000.
    const odd = car({ key: "ml-odd", priceUsd: 857, price: 35_500, currency: "UYU", priceConverted: true });
    const { kept, dropped } = dropImplausiblePrices([...cohort(8, 16_000), odd]);
    expect(dropped.map(d => d.key)).toEqual(["ml-odd"]);
    expect(dropped[0]!.basis).toBe("model_year");
    expect(kept).toHaveLength(8);
  });

  it("NO retira un auto que se vende para repuestos a precio de repuestos", () => {
    // Medido: un Fiat Duna del 99 a US$ 483 es un precio real, y esta a 0,088 de la mediana de su
    // ano. Por eso el escalon por ano es mucho mas exigente que el de modelo+ano.
    const scrap = car({ key: "ml-scrap", brandSlug: "fiat", marketSlug: "fiat-duna", year: 1999, priceUsd: 483 });
    const others = cohort(30, 5_500, { brandSlug: "varios", marketSlug: "otro-modelo", year: 1999 });
    expect(dropImplausiblePrices([...others, scrap]).dropped).toEqual([]);
  });

  it("usa la marca y el ano cuando el modelo no alcanza: Mercado Libre parte 'Hilux' de 'Hilux Pick-up'", () => {
    const odd = car({ key: "ml-odd", marketSlug: "toyota-hilux-pick-up", priceUsd: 857 });
    // Sin cohorte de modelo+ano (una sola fila), pero Toyota 2015 tiene de sobra.
    const { dropped } = dropImplausiblePrices([...cohort(25, 20_000), odd]);
    expect(dropped.map(d => d.key)).toEqual(["ml-odd"]);
    expect(dropped[0]!.basis).toBe("brand_year");
  });

  it("la cohorte mas parecida manda: si el modelo+ano lo aprueba, no se sigue preguntando", () => {
    // Un modelo barato dentro de una marca cara: 8 iguales a US$ 1.200 aprueban al noveno.
    const cheapModel = cohort(9, 1_200, { marketSlug: "toyota-starlet", model: "Starlet" });
    const expensive = cohort(30, 40_000, { marketSlug: "toyota-land-cruiser", model: "Land Cruiser" });
    expect(dropImplausiblePrices([...cheapModel, ...expensive]).dropped).toEqual([]);
  });

  it("cae al piso absoluto solo cuando no hay ninguna cohorte", () => {
    const placeholder = car({ key: "ca-1", source: "clasiautos", priceUsd: 9, year: 1981, marketSlug: "daihatsu-55", brandSlug: "daihatsu" });
    const oldButReal = car({ key: "ml-old", priceUsd: 450, year: 1978, marketSlug: "opel-rekord", brandSlug: "opel" });
    const { kept, dropped } = dropImplausiblePrices([placeholder, oldButReal]);
    expect(dropped.map(d => d.key)).toEqual(["ca-1"]);
    expect(dropped[0]!.basis).toBe("floor");
    expect(kept.map(k => k.key)).toEqual(["ml-old"]);
    expect(PRICE_ABSOLUTE_FLOOR_USD).toBe(200);
  });

  it("retira un precio que no es un numero utilizable", () => {
    const broken = car({ key: "ml-zero", priceUsd: 0 });
    expect(dropImplausiblePrices([broken]).dropped.map(d => d.key)).toEqual(["ml-zero"]);
  });

  it("no corrige el precio: retira el aviso entero", () => {
    const odd = car({ key: "fb-1", source: "facebook", priceUsd: 169, price: 6_990, currency: "UYU" });
    const { kept } = dropImplausiblePrices([...cohort(11, 5_000), odd]);
    expect(kept.some(k => k.key === "fb-1")).toBe(false);
    // Nada de lo que queda fue tocado.
    expect(kept.every(k => k.priceUsd === 5_000)).toBe(true);
  });

  it("deja un catalogo sano intacto", () => {
    const listings = [...cohort(40, 16_000), ...cohort(40, 9_000, { marketSlug: "fiat-uno", brandSlug: "fiat", year: 2005 })];
    const { kept, dropped } = dropImplausiblePrices(listings);
    expect(dropped).toEqual([]);
    expect(kept).toHaveLength(80);
  });

  it("cuenta por motivo para el log", () => {
    expect(priceDropSummary([
      { key: "a", priceUsd: 1, basis: "floor", median: null, ratio: null },
      { key: "b", priceUsd: 2, basis: "year", median: 100, ratio: 0.02 },
      { key: "c", priceUsd: 3, basis: "year", median: 100, ratio: 0.03 },
    ])).toEqual({ floor: 1, year: 2 });
  });
});
