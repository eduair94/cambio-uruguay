import { describe, expect, it } from "vitest";
import {
  cleanPublicText, descriptionFlags, engineOf, fuelOf, kmQuality, parseCarLocation, parsePrimaryAttribute,
  slugify, titleFlags, transmissionOf, trimLabel, trimOf,
} from "../../classes/autos/normalize";
import { enrichCarListing, priceDropOf } from "../../classes/autos/enrich";
import { quantile } from "../../classes/autos/stats";
import type { RawCarListing } from "../../classes/autos/types";

describe("engineOf", () => {
  it.each([
    ["Chevrolet Onix 1.0t Hb Premier At", "1.0T"],
    ["Chevrolet Onix 1.0 Ltz Turbo", "1.0T"],
    ["Volkswagen Golf 1.4 Tsi Highline", "1.4T"],
    ["Peugeot 208 1.2 Active 82cv 5p", "1.2"],
    ["Leapmotor C10 0.0 (69,9 Kwh) Rwd", "EV"],
    ["Baw L7 0km Ev Electrico - 5 Puertas", null],
    ["Baw L7 2026 Retira U$d 7.990 Y Financia", null],
    ["Volkswagen Gol Trendline 2021", null],
  ])("%s -> %s", (title, engine) => {
    expect(engineOf(title)).toBe(engine);
  });
});

describe("trimOf", () => {
  const hb20 = ["Premium", "Confort", "Comfort plus", "Comfort", "Unique", "Sport"];
  it("prefers the longest vocabulary match that contains the others", () => {
    expect(trimOf("Hyundai Hb20 1.6 Comfort Plus 5p", hb20)).toBe("comfort plus");
    expect(trimOf("Hyundai Hb20 1.0 Comfort Mt", hb20)).toBe("comfort");
  });
  it("refuses two unrelated matches instead of guessing", () => {
    expect(trimOf("Volkswagen Gol Power Plus 1.6", ["Power", "Plus", "Trendline"])).toBeNull();
    expect(trimOf("Chevrolet Onix Joy Lt Full 2020", ["Joy", "Lt", "Ltz"])).toBeNull();
  });
  it("matches whole words only and ignores accents", () => {
    expect(trimOf("Chevrolet Onix 1.4 Ltz Mt 98cv", ["Lt", "Ltz"])).toBe("ltz");
    expect(trimOf("Renault Clio Authentiqué", ["Authentique"])).toBe("authentique");
    expect(trimOf("Peugeot 208", ["Active"])).toBeNull();
  });
  it("keeps the vocabulary label for display", () => {
    expect(trimLabel("comfort plus", hb20)).toBe("Comfort plus");
    expect(trimLabel(null, hb20)).toBeNull();
  });
});

describe("kmQuality", () => {
  it.each([
    [111111, "placeholder"], [1, "placeholder"], [385, "placeholder"], [1111111, "placeholder"],
    [11111, "placeholder"], [44000, "ok"], [150000, "ok"], [null, "unknown"],
  ])("%s -> %s", (km, quality) => {
    expect(kmQuality(km as number | null)).toBe(quality);
  });
});

describe("card labels", () => {
  it("reads transmission and fuel variants", () => {
    expect(transmissionOf("Automática secuencial")).toBe("automatica");
    expect(transmissionOf("Automática CVT")).toBe("automatica");
    expect(transmissionOf("Manual")).toBe("manual");
    expect(transmissionOf("111.111 Km")).toBeNull();
    expect(fuelOf("Híbrido/Diesel")).toBe("hibrido");
    expect(fuelOf("Nafta/GNC")).toBe("gnc");
    expect(fuelOf("Diésel")).toBe("diesel");
    expect(fuelOf("Eléctrico")).toBe("electrico");
    expect(fuelOf("Nafta")).toBe("nafta");
  });
  it("parses year and km from primary_attribute", () => {
    expect(parsePrimaryAttribute("2017 | 111111 km", 2027)).toEqual({ year: 2017, km: 111111 });
    expect(parsePrimaryAttribute("2031 | 10 km", 2027)).toEqual({ year: null, km: 10 });
    expect(parsePrimaryAttribute("", 2027)).toEqual({ year: null, km: null });
  });
  it("parses both location formats and the seller type", () => {
    expect(parseCarLocation("{icon_location} Salto, SA • Concesionaria")).toEqual({
      neighborhood: null, department: "Salto", sellerType: "dealer",
    });
    expect(parseCarLocation("{icon_location} Brazo Oriental, MO • Vendedor Particular")).toEqual({
      neighborhood: "Brazo Oriental", department: "Montevideo", sellerType: "private",
    });
    expect(parseCarLocation("Fray Bentos - Río Negro")).toEqual({
      neighborhood: "Fray Bentos", department: "Río Negro", sellerType: null,
    });
    expect(parseCarLocation("Montevideo, MO")).toEqual({ neighborhood: null, department: "Montevideo", sellerType: null });
    expect(parseCarLocation("Treinta Y Tres, TT • Vendedor Particular").department).toBe("Treinta y Tres");
    expect(parseCarLocation("Rivera, RI").department).toBe("Rivera");
    expect(parseCarLocation("Florida, FL").department).toBe("Florida");
    expect(parseCarLocation("Trinidad, FS").department).toBe("Flores");
  });
});

describe("text flags", () => {
  it("flags damage but honours negation", () => {
    expect(descriptionFlags("Jac J2 Chocado Entero O Por Partes")).toEqual(["damaged"]);
    expect(descriptionFlags("Nunca fue chocado, sin deudas, impecable")).toEqual([]);
    expect(descriptionFlags("Motor a reparar, se vende como está")).toEqual(["damaged"]);
    expect(descriptionFlags("No tiene deudas. Papeles al día")).toEqual([]);
    expect(descriptionFlags("Recuperado de seguro, todo en regla")).toEqual(["recovered"]);
    expect(descriptionFlags("Vendo peugeot chapa brasilera")).toEqual(["foreign_plate"]);
    expect(descriptionFlags("Matrícula Mercosur, patente paga")).toEqual([]);
    expect(descriptionFlags("Transferencia de leasing")).toEqual(["paperwork"]);
    expect(descriptionFlags("Vendo accidentado para repuestos")).toEqual(["damaged"]);
    expect(descriptionFlags("Nunca fue accidentado, service al día")).toEqual([]);
  });
  it("flags down-payment titles and a second price in the title", () => {
    expect(titleFlags("Topcaruy Usd 5500 Cuotas En Pesos", 10900, "USD")).toEqual(["financing", "price_mismatch"]);
    expect(titleFlags("Geely Coolray Entrega 10 Y Cuot", 21990, "USD")).toEqual(["financing"]);
    expect(titleFlags("Chevrolet Ónix Joy Lt Full 2020 Liquido U$s9900", 10900, "USD")).toEqual(["price_mismatch"]);
    expect(titleFlags("Peugeot 208 Extra Full 1.6 2025 Financio Garzón Automóviles", 16990, "USD")).toEqual([]);
    expect(titleFlags("Renault Kwid 1.0 Sce 66cv Life", 8700, "USD")).toEqual([]);
    expect(titleFlags("Toyota Hilux 2.7 Cd Srv Vvti 4x2 - A3", 19900, "USD")).toEqual([]);
    expect(titleFlags("Chevrolet Onix Ltz 2021 45.000 Kms Entrega Inmediata", 14500, "USD")).toEqual([]);
    expect(titleFlags("Retira Ya Tu Peugeot 208 2019", 12000, "USD")).toEqual([]);
    expect(titleFlags("Baw L7 Eléctrico 2026 Retira U$d 7.990 Y Financia", 12990, "USD")).toEqual(["financing", "price_mismatch"]);
    expect(titleFlags("Anticipo De Usd 5000 Y Financio Hyundai Hb20", 13900, "USD")).toEqual(["financing", "price_mismatch"]);
  });
  it("removes contact data from public text", () => {
    expect(cleanPublicText("Gol 2015 llamar 099 123 456 o mail a@b.com")).toBe("Gol 2015 llamar o mail");
  });
});

describe("enrichment", () => {
  const raw: RawCarListing = {
    id: "MLU700355317", source: "mercadolibre", brandId: "b", brand: "Mercedes-Benz", modelId: "m", model: "Clase C",
    title: "Mercedes-benz Clase C 1.8 C200 Avantgarde", year: 2012, km: 150000, price: 16000, currency: "USD",
    transmission: "automatica", fuel: "nafta", neighborhood: "Pocitos", department: "Montevideo", sellerType: "private",
    sellerId: "1", picture: null, pictureCount: 3, permalink: "https://auto.mercadolibre.com.uy/MLU-700355317-x-_JM",
    observedAt: "2026-09-16T10:00:00.000Z",
  };
  it("derives slugs, engine, trim, km quality and USD price", () => {
    const car = enrichCarListing(raw, {
      usdUyu: 40, trims: ["Avantgarde"], firstSeen: "2026-09-10T00:00:00.000Z", lastSeen: raw.observedAt,
      priceHistory: [], detail: null,
    });
    expect(car).toMatchObject({
      key: "ml-MLU700355317", brandSlug: "mercedes-benz", modelSlug: "clase-c", marketSlug: "mercedes-benz-clase-c",
      engine: "1.8", trim: "avantgarde", trimLabel: "Avantgarde", kmQuality: "ok", priceUsd: 16000, priceConverted: false,
      flags: [], priceDrop: null,
    });
    expect(slugify("Citroën C3 Aircross")).toBe("citroen-c3-aircross");
  });
  it("converts pesos with the cycle rate and marks it", () => {
    const car = enrichCarListing({ ...raw, price: 1115000, currency: "UYU" }, {
      usdUyu: 40, trims: [], firstSeen: raw.observedAt, lastSeen: raw.observedAt, priceHistory: [], detail: null,
    });
    expect(car.priceUsd).toBe(27875);
    expect(car.priceConverted).toBe(true);
  });
  it("reports a price drop only against the previous observed price", () => {
    expect(priceDropOf(raw, [
      { price: 17500, currency: "USD", observedAt: "2026-09-01T00:00:00.000Z" },
      { price: 16000, currency: "USD", observedAt: "2026-09-12T00:00:00.000Z" },
    ])).toEqual({ from: 17500, currency: "USD", since: "2026-09-12T00:00:00.000Z" });
    expect(priceDropOf(raw, [{ price: 16000, currency: "USD", observedAt: "2026-09-12T00:00:00.000Z" }])).toBeNull();
    expect(priceDropOf(raw, [
      { price: 15000, currency: "USD", observedAt: "2026-09-01T00:00:00.000Z" },
      { price: 16000, currency: "USD", observedAt: "2026-09-12T00:00:00.000Z" },
    ])).toBeNull();
  });
});

describe("quantile", () => {
  it("interpolates linearly", () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(quantile([40, 10, 30, 20], 0.25)).toBe(17.5);
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
  });
});
