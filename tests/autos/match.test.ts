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

  // 2026-10-14: the version miner read "onix" in the "Chevrolet Onix Plus" titles, and the rule
  // below deleted Chevrolet Onix, the most listed model. Only Mercado Libre's own versions decide.
  it("drops a model named like a sibling's version only by Mercado Libre's own versions", () => {
    const rows = [ml("67781", "Chevrolet", "67801", "Onix"), ml("67781", "Chevrolet", "67802", "Onix Plus"), ml("67781", "Chevrolet", "67803", "Joy")];
    const official = [{ brandId: "67781", modelId: "67802", trims: ["LT", "Premier"] }, { brandId: "67781", modelId: "67801", trims: ["Joy", "LT"] }];
    const mined = [{ brandId: "67781", modelId: "67802", trims: ["LT", "Onix", "Premier"] }, { brandId: "67781", modelId: "67801", trims: ["Joy", "LT"] }];
    const dictionary = buildCarDictionary(rows, mined, official);
    // "Joy" is an official version of Onix: a seller-chosen "model", not a model.
    expect(dictionary.models.map(model => model.model).sort()).toEqual(["Onix", "Onix Plus"]);
    // The mined versions still feed the version matcher.
    expect(dictionary.models.find(model => model.modelId === "67802")!.trims).toEqual(["LT", "Onix", "Premier"]);
    expect(matchCar("Chevrolet Onix 2024 ls mt 54000km.", dictionary, {}, MAX)).toMatchObject({ modelId: "67801", year: 2024 });
    // Without the official list the mined one decides, as before.
    expect(buildCarDictionary(rows, mined).models.map(model => model.model)).not.toContain("Onix");
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
    // A 0 km is a new car, not an odometer reading; matchCar's isNew says so.
    expect(kmFromText("0 km")).toBeNull();
    expect(kmFromText("consumo 14 km por litro")).toBeNull();
  });

  // Every case below is a real phrasing from the stored adverts (2026-11-25).
  it("reads the label before the number, as Marketplace sellers write it", () => {
    expect(kmFromText("Volkswagen Bora | 2010 | km: 219.000 | al dia")).toBe(219_000);
    expect(kmFromText("extra full aire direccion vidrios♨️ kms 160.000💯 nafta 1.6cc")).toBe(160_000);
    expect(kmFromText("año: 2018 kilometraje: 136901 motor: 1.0")).toBe(136_901);
    expect(kmFromText("kilometraje : 83.423")).toBe(83_423);
    expect(kmFromText("Vw Gol G1 año 94 kms:178.000 originales")).toBe(178_000);
    expect(kmFromText("•año: 2017 •motor: 2.0 •extra full •km 85mil •vidrios")).toBe(85_000);
    expect(kmFromText("ano: 2019 km aprox: 80.000 combustible: nafta")).toBe(80_000);
    expect(kmFromText("hyundai hb 20 new full motor 1.0 nafta año 2023 km. 65.000 oportunidad")).toBe(65_000);
  });

  it("reads the forms the old reader missed", () => {
    expect(kmFromText("Suzuki Celerio GLX 1.0,único dueño,2014,139697km,u$S6990,tomo")).toBe(139_697);
    expect(kmFromText("Chevrolet Spark año 2008 con 145mil kmts motor 1.0")).toBe(145_000);
    expect(kmFromText("138. mil kilometro muy cuidado")).toBe(138_000);
    expect(kmFromText("tiene 152xxx km no tiene nada para hacerle")).toBe(152_000);
    expect(kmFromText("kilometros 194.xxx busco vender")).toBe(194_000);
    expect(kmFromText("-116k km originales -casi unico dueño")).toBe(116_000);
    expect(kmFromText("vendo+exelente+honda+ridgeline+con+105+mil+kilometros!!!!+reales")).toBe(105_000);
    expect(kmFromText("Nissan Tiida con deuda, año 2010 se va con transferencia 200milkm")).toBe(200_000);
    expect(kmFromText("citroen c4 1.6cc año 2014 con 110.000.- km u$s 6.900.-")).toBe(110_000);
    expect(kmFromText("motor : 1600 km : 120..000 tambien podes llevarlo")).toBe(120_000);
  });

  it("does not read the year that sits next to a km label", () => {
    expect(kmFromText("Volkswagen Gol 1.6 trendline año : 2015 km : 118.000 extra full")).toBe(118_000);
    expect(kmFromText("Peugeot Partner K9 diesel año 2021 km 95.000 motor 1.6")).toBe(95_000);
    expect(kmFromText("101.689km - 2016 aceptamos permutas")).toBe(101_689);
    expect(kmFromText("Hyundai Ioniq 122 mil km 2018 hibrido")).toBe(122_000);
    expect(kmFromText("vendo kia picanto 2017 tiene 94000km 8500 dolares")).toBe(94_000);
  });

  it("does not read kilometres that are not the car's", () => {
    expect(kmFromText("consumo medio en ruta: 20 km/l • consumo medio en ciudad: 18 km/l")).toBeNull();
    expect(kmFromText("rendimiento de 12 a 15 kms x litro")).toBeNull();
    expect(kmFromText("aceleracion de 0 a 100 km/h en 9.3 segundos")).toBeNull();
    expect(kmFromText("consumo aprox. 4.3 - 4.8 l/100 km")).toBeNull();
    expect(kmFromText("tesla dual motor 470 cv 450 km autonomia")).toBeNull();
    expect(kmFromText("autonomia: hasta 480 km nedc")).toBeNull();
    expect(kmFromText("garantia extendida de 1 año/ 20.000 km precio contado")).toBeNull();
    expect(kmFromText("garantía por 3 meses o 10.000.- km lo que se cumpla primero")).toBeNull();
    expect(kmFromText("servicio basico incluido hasta 29/10/2028 o 40.000 km")).toBeNull();
    expect(kmFromText("Se hace service cada 10.000 km")).toBeNull();
    expect(kmFromText("distribucion hecha hace 6.000 km")).toBeNull();
    expect(kmFromText("ultimo service 110.000 km de fabrica")).toBeNull();
    expect(kmFromText("2do dueño desde los 11 mil km")).toBeNull();
    expect(kmFromText("4 cubiertas bridgestone (japonesas) con 15mil km")).toBeNull();
    expect(kmFromText("Ficha oficial desde 0km. Servicio recien hecho.")).toBeNull();
    expect(kmFromText("estamos de lun. a vie. altura ruta 8 km 24.500 (barros blancos)")).toBeNull();
    expect(kmFromText("te esperamos en giannttasio km 22500 solymar")).toBeNull();
    expect(kmFromText("📍ruta interbalnearia km28.500")).toBeNull();
    expect(kmFromText("mantenimiento con aproximadamente 38.000 km desde que fue hecho")).toBeNull();
  });

  it("keeps the car's figure when a description also names others", () => {
    expect(kmFromText("Kia Picanto 2017 ✅ kilometraje: 64.000 km (reales comprobables) cubiertas kumho (185/65 r14 86t) con solo 3.000 km de uso")).toBe(64_000);
    expect(kmFromText("vw gol g6 1.6 2014 | 183.000 km | distribucion hecha | cambio de aceite, filtros y bujias con apenas 2.000 km de uso")).toBe(183_000);
    expect(kmFromText("comprada con 14000km actualmente 119000km sin choques")).toBe(119_000);
    expect(kmFromText("Nissan Kicks 75000 km. Automatica unico dueño ficha oficial 77.000 km")).toBe(75_000);
    expect(kmFromText("año 2026 10.800 kilometros 380 kilometros de autonomia")).toBe(10_800);
    expect(kmFromText("Toyota Corolla 2007 vendo, una con 96.000 km ✅ otra con 107.000 km")).toBeNull();
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
