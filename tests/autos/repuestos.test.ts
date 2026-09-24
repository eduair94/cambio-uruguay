import { describe, expect, it } from "vitest";
import {
  CAR_PARTS, partTitleMatches, partsIndex, partsModelTokens, summarizePart, type CarPartsRecord,
} from "../../classes/autos/repuestos";

const part = (key: string) => CAR_PARTS.find(item => item.key === key)!;
const matches = (title: string, brand: string, model: string, key: string) =>
  partTitleMatches(title, partsModelTokens(brand, model), part(key));

describe("canasta de repuestos", () => {
  it("tiene las seis piezas con su categoría de Mercado Libre", () => {
    expect(CAR_PARTS.map(item => item.key)).toEqual(["pastillas", "filtro_aceite", "amortiguador", "embrague", "distribucion", "optica"]);
    expect(part("pastillas").category).toBe("MLU62414");
    expect(part("optica").category).toBe("MLU442928");
  });
});

describe("partTitleMatches", () => {
  it("un 208 no es un 2008 ni un 308", () => {
    expect(matches("Amortiguador Delantero Izq Peugeot 208 1.2 12-20 Cofap", "Peugeot", "208", "amortiguador")).toBe(true);
    expect(matches("Amortiguador Delantero Der Peugeot 2008 1.2/1.6 14-25 Cofap", "Peugeot", "208", "amortiguador")).toBe(false);
    expect(matches("Amortiguador Delantero Der Peugeot 308 10-25 408 2.0", "Peugeot", "208", "amortiguador")).toBe(false);
  });

  it("C4 Cactus exige las dos palabras, y la trasera no es la delantera", () => {
    expect(matches("Pastillas Freno Delanteras Citroen C4 Cactus 2014 Al 2018", "Citroën", "C4 Cactus", "pastillas")).toBe(true);
    expect(matches("Pastilla Freno Citroen C4 06- Por Santa Cruz Frenos", "Citroën", "C4 Cactus", "pastillas")).toBe(false);
    expect(matches("Pastillas Freno Brembo   Citroën C4 Cactus Trasera", "Citroën", "C4 Cactus", "pastillas")).toBe(false);
  });

  it("un nombre corto exige la marca: Up! no es una pick-up", () => {
    expect(matches("Kit Embrague Vw Up 1.0 190mm 28 Estrias Sachs", "Volkswagen", "Up!", "embrague")).toBe(true);
    expect(matches("Kit Embrague Volkswagen Saveiro 1.6 09-25", "Volkswagen", "Up!", "embrague")).toBe(false);
    expect(matches("Kit Embrague Fiat Strada Pick Up 1.4", "Volkswagen", "Up!", "embrague")).toBe(false);
  });

  it("la distribución exige el kit: una correa suelta es otra pieza", () => {
    expect(matches("Correa Distribucion Chevrolet Onix 1.4", "Chevrolet", "Onix", "distribucion")).toBe(false);
    expect(matches("Kit Distribución Skf Chevrolet Onix 1.4", "Chevrolet", "Onix", "distribucion")).toBe(true);
  });

  it("donde el precio es por unidad, un par o un kit no cuenta", () => {
    expect(matches("Kit Faros Delanteros Toyota Hilux Set X2", "Toyota", "Hilux", "optica")).toBe(false);
    expect(matches("Optico Delantero Toyota Hilux 2021-2024", "Toyota", "Hilux", "optica")).toBe(true);
  });

  it("acentos y barras no esconden el modelo", () => {
    expect(matches("Pastillas Freno Chevrolet Ónix/Prisma 1.4", "Chevrolet", "Onix", "pastillas")).toBe(true);
  });

  it("el título tiene que nombrar la pieza: un filtro de aire o un disco son otra cosa", () => {
    expect(matches("Filtro De Aire Chevrolet Onix 1.4", "Chevrolet", "Onix", "filtro_aceite")).toBe(false);
    expect(matches("Disco De Freno Chevrolet Onix Del", "Chevrolet", "Onix", "pastillas")).toBe(false);
    expect(matches("Discos Y Pastillas Freno Chevrolet Onix 1.4", "Chevrolet", "Onix", "pastillas")).toBe(false);
    expect(matches("Faro Auxiliar Neblinero Toyota Hilux 2016", "Toyota", "Hilux", "optica")).toBe(false);
    expect(matches("Embregue Kit Volkswagen Gol 1.6", "Volkswagen", "Gol", "embrague")).toBe(true);
  });

  it("un modelo escrito junto o separado es el mismo: Tcross, Rav 4, S-10", () => {
    expect(matches("Filtro Aceite Vw Tcross 1.0 Tsi", "Volkswagen", "T-Cross", "filtro_aceite")).toBe(true);
    expect(matches("Amortiguador Delantero Toyota Rav 4 2013", "Toyota", "RAV4", "amortiguador")).toBe(true);
    expect(matches("Kit Embrague Chevrolet S-10 2.8", "Chevrolet", "S10", "embrague")).toBe(true);
  });

  it("la cilindrada no es el modelo: el 2.3 no nombra a un Mazda 3", () => {
    expect(matches("Filtro De Aceite Mazda 6 2.3", "Mazda", "3", "filtro_aceite")).toBe(false);
  });

  it("un modelo más largo de la misma marca no es este: un C4 Cactus no es un C4", () => {
    const c4 = partsModelTokens("Citroën", "C4", ["C4 Cactus", "C3"]);
    expect(partTitleMatches("Pastillas Freno Citroen C4 Cactus 2018", c4, part("pastillas"))).toBe(false);
    expect(partTitleMatches("Pastillas Freno Citroen C4 1.6 Del", c4, part("pastillas"))).toBe(true);
    const onix = partsModelTokens("Chevrolet", "Onix", ["Onix plus", "Prisma"]);
    expect(partTitleMatches("Pastillas Freno Chevrolet Onix Plus 2021", onix, part("pastillas"))).toBe(false);
  });
});

describe("summarizePart", () => {
  it("con menos de tres ofertas no hay precio", () => {
    expect(summarizePart([100, 200], ["a", "b"])).toBeNull();
  });
  it("un solo vendedor no es un mercado", () => {
    expect(summarizePart([100, 200, 300], ["a", "a", "a"])).toBeNull();
  });
  it("mediana, cuartiles y vendedores distintos", () => {
    expect(summarizePart([100, 200, 300, 400], ["a", "a", "b", "c"])).toEqual({ median: 250, p25: 175, p75: 325, offers: 4, sellers: 3 });
  });
});

const record = (marketSlug: string, prices: Partial<Record<string, number>>): CarPartsRecord => ({
  marketSlug, brand: "X", model: marketSlug, readAt: "2026-09-24T02:15:00.000Z",
  parts: Object.entries(prices).map(([key, median]) => ({
    key: key as CarPartsRecord["parts"][number]["key"], median: median!, p25: median!, p75: median!, offers: 10, sellers: 4,
  })),
});

describe("partsIndex", () => {
  const cheap = { pastillas: 1000, filtro_aceite: 200, embrague: 3000 };
  const records = [
    record("caro", { pastillas: 2000, filtro_aceite: 400, embrague: 6000 }),
    record("b", cheap), record("c", cheap), record("d", cheap), record("e", cheap),
    record("dos-piezas", { pastillas: 1000, filtro_aceite: 200 }),
  ];

  it("compara cada pieza contra la mediana de todos los modelos (canasta emparejada)", () => {
    const { baseline, byModel } = partsIndex(records);
    expect(baseline.find(item => item.key === "pastillas")?.median).toBe(1000);
    expect(byModel.get("caro")?.index).toBe(2);
    expect(byModel.get("b")?.index).toBe(1);
    expect(byModel.get("b")?.offers).toBe(30);
  });

  it("con menos de tres piezas no hay índice, pero las piezas se publican", () => {
    const parts = partsIndex(records).byModel.get("dos-piezas")!;
    expect(parts.index).toBeNull();
    expect(parts.parts.map(item => item.key)).toEqual(["pastillas", "filtro_aceite"]);
  });

  it("una pieza medida en menos de cinco modelos no entra al índice", () => {
    const { baseline } = partsIndex([...records, record("solo-optica", { optica: 9000, pastillas: 1000, filtro_aceite: 200, embrague: 3000 })]);
    expect(baseline.some(item => item.key === "optica")).toBe(false);
  });
});
