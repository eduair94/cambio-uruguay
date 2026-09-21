import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import {
  declaredCurrencyFor, declaredCurrencyOf, engineFromCc, kmFromText, matchCar, versionTransmission, yearFromText,
} from "../../classes/autos/catalog/match";

const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const DICT = buildCarDictionary([
  ml("60297", "Toyota", "60315", "Corolla"), ml("60297", "Toyota", "60318", "Corolla Cross"), ml("60297", "Toyota", "60320", "Hilux"),
  ml("67781", "Chevrolet", "67800", "Aveo"), ml("67781", "Chevrolet", "67801", "Onix"), ml("60249", "Volkswagen", "60260", "Golf"),
  ml("60249", "Volkswagen", "60261", "Gol"), ml("60279", "Peugeot", "60280", "208"), ml("60279", "Peugeot", "60281", "2008"),
  ml("60300", "Hyundai", "60301", "Creta"), ml("60310", "Fiat", "60311", "Uno"), ml("60330", "Honda", "60331", "CR-V"), ml("60600", "FAW", "60601", "V5"),
  { source: "facebook" as const, brandId: "x-foo", brand: "Foo", modelId: "x-bar", model: "Bar" },
], [{ brandId: "60297", modelId: "60315", trims: ["LE", "XEI"] }]);
const MAX = 2027;

describe("buildCarDictionary", () => {
  it("keeps ML ids only and carries trims", () => {
    expect(DICT.brands.find(brand => brand.slug === "foo")).toBeUndefined();
    expect(DICT.models.find(model => model.modelId === "60315")!.trims).toEqual(["LE", "XEI"]);
    expect(DICT.brands.find(brand => brand.slug === "volkswagen")!.aliases).toContain("vw");
  });
});

describe("matchCar", () => {
  it("prefers the longest model name", () => {
    expect(matchCar("2022 Toyota corolla cross xei hybrid", DICT, {}, MAX)).toMatchObject({ modelId: "60318", year: 2022 });
    expect(matchCar("TOYOTA COROLLA 2.0 DIÉSEL", DICT, {}, MAX)).toMatchObject({ modelId: "60315", year: null });
  });
  it("finds the brand from the model when the title omits it", () => {
    expect(matchCar("golf tsi 2016", DICT, {}, MAX)).toMatchObject({ brandId: "60249", modelId: "60260", year: 2016 });
    expect(matchCar("Vendo+gol+", DICT, {}, MAX)).toMatchObject({ modelId: "60261" });
  });
  it("understands aliases and misspellings", () => {
    expect(matchCar("VW Gol 1.6 2012", DICT, {}, MAX)).toMatchObject({ brandId: "60249", modelId: "60261" });
    expect(matchCar("2015 Toyota corola+", DICT, {}, MAX)).toMatchObject({ modelId: "60315", year: 2015 });
    expect(matchCar("Honda CRV 2010", DICT, {}, MAX)).toMatchObject({ modelId: "60331" });
  });
  it("matches numeric models only with their brand", () => {
    expect(matchCar("Peugeot 2008 Allure 2019", DICT, {}, MAX)).toMatchObject({ modelId: "60281", year: 2019 });
    expect(matchCar("vendo 208 impecable", DICT, {}, MAX)).toBeNull();
  });
  it("never borrows another brand's model", () => {
    // Fidocar wrote "Brillance": unknown brand, so FAW's V5 must not be picked.
    expect(matchCar("Brillance V5 1.6 Comfort MT - 2013", DICT, { brand: "Brillance" }, MAX)).toBeNull();
    expect(matchCar("vendo v5 2013", DICT, {}, MAX)).toBeNull();
    expect(matchCar("FAW V5 2013", DICT, {}, MAX)).toMatchObject({ modelId: "60601" });
  });
  it("gives up on titles that name no car", () => {
    expect(matchCar("Vendo o permuto", DICT, {}, MAX)).toBeNull();
    expect(matchCar("Venta de repuestos de todas las marcas", DICT, {}, MAX)).toBeNull();
  });
  it("uses structured hints before the text", () => {
    expect(matchCar("NISSAN KICKS EXCLUSIVE 2023", DICT, { brand: "TOYOTA", model: "COROLLA", year: 2021, km: 5_000 }, MAX))
      .toMatchObject({ modelId: "60315", year: 2021, km: 5_000 });
    expect(matchCar("UNO ATTRACTIVE", DICT, { brand: "fiat", model: "uno-attractive" }, MAX)).toMatchObject({ modelId: "60311" });
  });
  it("reads km, gearbox, fuel and declared currency from prose", () => {
    const hit = matchCar("Golf 1.4t año 2016 ✅Caja automática DSG ✅95000km nafta U$S 22.500", DICT, {}, MAX)!;
    expect(hit).toMatchObject({ year: 2016, km: 95_000, transmission: "automatica", fuel: "nafta", declaredCurrency: "USD" });
  });
});

describe("text helpers", () => {
  it("reads years", () => {
    expect(yearFromText("Saveiro del 99 nafta", MAX)).toBe(1999);
    expect(yearFromText("Corolla 1.8 2014 extra full", MAX)).toBe(2014);
    expect(yearFromText("modelo 2019 igual al 2021", MAX)).toBe(2019);
    expect(yearFromText("2019 o 2021", MAX)).toBeNull();
    expect(yearFromText("motor 1600 cc", MAX)).toBeNull();
  });
  it("reads km", () => {
    expect(kmFromText("250,000km")).toBe(250_000);
    expect(kmFromText("180 mil kilómetros")).toBe(180_000);
    expect(kmFromText("70.000km 2023")).toBe(70_000);
    expect(kmFromText("0 km")).toBe(0);
    expect(kmFromText("consumo 14 km por litro")).toBe(14);
  });
  it("reads declared currencies", () => {
    expect(declaredCurrencyOf("U$S 15,000")).toBe("USD");
    expect(declaredCurrencyOf("Debe 52 mil pesos")).toBe("UYU");
    expect(declaredCurrencyOf("$U 450.000")).toBe("UYU");
    expect(declaredCurrencyOf("USD 5000 o su equivalente en pesos")).toBeNull();
    expect(declaredCurrencyOf("impecable")).toBeNull();
  });
  it("reads a currency only when it is attached to the asked amount", () => {
    expect(declaredCurrencyFor("Debe 52 mil pesos con titulos", 4_000)).toBeNull();
    expect(declaredCurrencyFor("vendo U$S 4.000 o permuto", 4_000)).toBe("USD");
    expect(declaredCurrencyFor("precio 4 mil dólares", 4_000)).toBe("USD");
    expect(declaredCurrencyFor("$U 180.000 negociable", 180_000)).toBe("UYU");
    expect(declaredCurrencyFor("4000 pesos de deuda, pido 4000 dolares", 4_000)).toBeNull();
  });
  it("lee U$U como dolares y no como el '$U' de adentro", () => {
    // Medido 2026-09-21: un Chevrolet Spark 2008 de Facebook decia "Precio contado U$U6990
    // (bonificado)" y se publico a $ 6.990, o sea US$ 169. "u$s" no engancha en la posicion 0, el
    // motor avanza una letra y ahi "$u" -marcador de PESOS- matchea el medio de "u$u".
    expect(declaredCurrencyFor("Precio contado U$U6990 (bonificado)", 6_990)).toBe("USD");
    expect(declaredCurrencyFor("entrega U$U 3750 y saldo en cuotas", 3_750)).toBe("USD");
    expect(declaredCurrencyOf("Precio contado U$U6990")).toBe("USD");
    expect(declaredCurrencyOf("U$U 15.000")).toBe("USD");
    // Y el marcador de pesos de verdad sigue leyendose como pesos.
    expect(declaredCurrencyOf("$U 450.000")).toBe("UYU");
    expect(declaredCurrencyFor("$U 180.000 negociable", 180_000)).toBe("UYU");
  });
  it("reads dealer version gearboxes and engine sizes", () => {
    expect(versionTransmission("NUEVO ONIX 1.0 JOY MT")).toBe("manual");
    expect(versionTransmission("NEW CS35 PLUS 1.4T 5P AT")).toBe("automatica");
    expect(versionTransmission("SWIFT 1.2 GLS MHEV")).toBeNull();
    expect(engineFromCc("1600cc")).toBe("1.6");
    expect(engineFromCc("1400")).toBe("1.4");
    expect(engineFromCc("3,5")).toBe("3.5");
    expect(engineFromCc("abc")).toBeNull();
  });
});
