// Lo que el directorio de armadores lee de un TEXTO ajeno (título o descripción de un aviso):
// si es un servicio de armado, qué barrios dice cubrir, qué hace y qué cobra por cada mueble.
// Precisión antes que cobertura: lo dudoso se abstiene.
import { describe, expect, it } from "vitest";
import { coverageFromText, isAssemblyTitle, itemOf, pricesFromText, servicesFromText } from "../../classes/armadores/text";

const SRC = "https://www.facebook.com/marketplace/item/1/";
const DAY = "2026-11-11";

describe("isAssemblyTitle", () => {
  it("acepta los títulos de servicio que se ven en Marketplace y ML", () => {
    for (const title of [
      "Armador de muebles",
      "ARMADOR DE MUEBLES",
      "Armado de Muebles a Domicilio",
      "Armados Y Desarmados De Muebles En Domicilio",
      "Servicio De Armado Nuevos Y Desarmado De Muebles Por Mudanza",
      "Armador De Muebles Ropero Mesa Ratona Cómoda Respaldo Rack",
      "Armador de mueble vamos a todo Montevideo",
      "Armado y desarmado de muebles",
      "Armador",
    ]) expect(isAssemblyTitle(title), title).toBe(true);
  });

  it("rechaza un mueble a la venta con armado incluido, herramientas y otros armados", () => {
    for (const title of [
      "Ropero 6 Puertas 3 Cajones. Armado Gratis. Tienda Max",
      "Mueble Tv Rack Armado Incluido",
      "Galpón De Jardín Montevideo Armado Incluido",
      "Armador De Casetas, Armador De Galpones.",
      "Taladro Inalámbrico 12 V Kit Armado Muebles",
      "Alquiler De Carpas Y Gazebos Con Armado Para Fiestas",
      "Mueble de cocina",
      "Muebles a medida",
      "Armador de casa jardín",
      "Armado de casitas de jardín",
    ]) expect(isAssemblyTitle(title), title).toBe(false);
  });

  it("no descarta a quien arma muebles y además galpones", () => {
    expect(isAssemblyTitle("Armador de muebles y galpones")).toBe(true);
  });
});

describe("coverageFromText", () => {
  it("reconoce que dice cubrir todo Montevideo", () => {
    expect(coverageFromText("Armador de muebles voy a todo Montevideo").allMontevideo).toBe(true);
    expect(coverageFromText("Armador de muebles económico Voy a todo Montevideo en el día").allMontevideo).toBe(true);
    expect(coverageFromText("Armador de muebles a domicilio").allMontevideo).toBe(false);
  });

  it("lee una lista de barrios aunque la una una «y»", () => {
    const coverage = coverageFromText("Trabajo en Pocitos, Buceo y Malvín");
    expect(coverage.barrios).toEqual(["Pocitos", "Buceo", "Malvín"]);
  });

  it("no toma «Centro» ni «Unión» sueltos por barrio, pero sí detrás de «zona»", () => {
    expect(coverageFromText("Armador de muebles Centro de servicios").barrios).toEqual([]);
    expect(coverageFromText("Armador zona Unión").barrios).toEqual(["Unión"]);
  });

  it("separa el área metropolitana de lo que queda afuera", () => {
    const coverage = coverageFromText("Armador De Muebles Montevideo, Carrasco, La Paz, Las Piedras y Maldonado");
    expect(coverage.barrios).toEqual(expect.arrayContaining(["Carrasco", "La Paz", "Las Piedras"]));
    expect(coverage.outside).toEqual(["Maldonado"]);
  });

  it("prefiere el nombre más largo", () => {
    expect(coverageFromText("Armador en Carrasco Norte").barrios).toEqual(["Carrasco Norte"]);
    expect(coverageFromText("Armador de muebles Ciudad De La Costa, Pando").barrios).toEqual(["Ciudad de la Costa", "Pando"]);
  });
});

describe("servicesFromText", () => {
  it("lee armado, desarmado, traslado y colgado", () => {
    expect(servicesFromText("Armador De Muebles A Domicilio Desarmados Traslados")).toEqual(["armado", "desarmado", "traslado"]);
    expect(servicesFromText("Armado de muebles, colgado de TV y estantes")).toEqual(["armado", "colgado"]);
  });
});

describe("itemOf", () => {
  it("clasifica la etiqueta por mueble", () => {
    expect(itemOf("Ropero 3 puertas")).toBe("ropero");
    expect(itemOf("Placard 6 puertas")).toBe("ropero");
    expect(itemOf("Mesa de luz")).toBe("mesa-de-luz");
    expect(itemOf("Cama cucheta")).toBe("cucheta");
    expect(itemOf("Cómoda 6 cajones")).toBe("comoda");
    expect(itemOf("Rack TV")).toBe("rack");
    expect(itemOf("Mesa ratona")).toBe("mesa");
    expect(itemOf("Desarmado de ropero")).toBe("desarmado");
    expect(itemOf("Hola, consultas al privado")).toBeNull();
  });
});

describe("pricesFromText", () => {
  it("toma un mueble con un solo monto por línea", () => {
    const prices = pricesFromText("Precios:\nRopero 3 puertas $1.200\nMesa de luz $ 350\nCama 2 plazas 600 pesos", SRC, DAY);
    expect(prices.map(p => [p.item, p.amount, p.kind])).toEqual([
      ["ropero", 1200, "exact"],
      ["mesa-de-luz", 350, "exact"],
      ["cama", 600, "exact"],
    ]);
    expect(prices[0]).toMatchObject({ currency: "UYU", origin: "ad-text", sourceUrl: SRC, observedAt: DAY, amountMax: null });
  });

  it("lee «desde» y rangos, y nunca parte un rango en dos filas", () => {
    const prices = pricesFromText("Roperos desde $900 • Placares de $800 a $1.500", SRC, DAY);
    expect(prices.map(p => [p.item, p.amount, p.amountMax, p.kind])).toEqual([
      ["ropero", 900, null, "from"],
      ["ropero", 800, 1500, "range"],
    ]);
  });

  it("se abstiene sin mueble, con montos ambiguos o fuera de rango", () => {
    expect(pricesFromText("Precios económicos $500", SRC, DAY)).toEqual([]);
    expect(pricesFromText("Ropero $800 cómoda $600 escritorio $700", SRC, DAY)).toEqual([]);
    expect(pricesFromText("Ropero $5", SRC, DAY)).toEqual([]);
    expect(pricesFromText("Ropero WhatsApp 099 123 456", SRC, DAY)).toEqual([]);
  });

  it("borra teléfonos de la etiqueta", () => {
    const [price] = pricesFromText("Ropero $1.000 llamar 099 123 456", SRC, DAY);
    expect(price?.label).not.toMatch(/099/);
  });
});

describe("hallazgos de la revisión final", () => {
  it("rechaza productos con el armado incluido escrito de otras formas, perchas y piscinas", () => {
    for (const title of [
      "Ropero 6 puertas armador incluido",
      "Cama con armador gratis",
      "Placard envio y armador sin cargo",
      "Ropero 3 puertas, armado de muebles sin costo",
      "Rack TV - armado de muebles bonificado",
      "Escritorio gamer + armado de muebles gratis",
      "Vendo ropero desarmado, muebles de dormitorio",
      "Servicio de armado de piscinas",
      "Armadores de madera para ropa x 10",
    ]) expect(isAssemblyTitle(title), title).toBe(false);
  });

  it("sigue aceptando un servicio que ofrece presupuesto o visita sin costo", () => {
    expect(isAssemblyTitle("Armador de muebles, presupuesto sin costo")).toBe(true);
    expect(isAssemblyTitle("Roperos, camas, cómodas: armado a domicilio")).toBe(true);
  });

  it("no lee «mesas de centro», «centro de entretenimiento» ni «retiro de muebles» como barrios", () => {
    expect(coverageFromText("Armado de muebles: roperos, camas, mesas de centro").barrios).toEqual([]);
    expect(coverageFromText("Armado de centro de entretenimiento").barrios).toEqual([]);
    expect(coverageFromText("Servicio de retiro de muebles viejos").barrios).toEqual([]);
    expect(coverageFromText("Armador en el Cerro").barrios).toEqual(["Cerro"]);
  });

  it("la etiqueta de un precio leído de un aviso no lleva contactos ni nombres", () => {
    const labels = pricesFromText(
      [
        "Ropero $1200 consultas al 099 12 34 56",
        "Cama $800 tel 098123456 Juan",
        "Cómoda $700 juan.perez@gmail.com",
        "Escritorio $600 IG @juanarmados",
        "Rack $650 wa.me/59899123456",
        "Mesa de luz $400 llamar al 2 600 1234",
      ].join("\n"),
      SRC,
      DAY,
    ).map(p => p.label);
    expect(labels).toEqual(["Ropero", "Cama", "Cómoda", "Escritorio", "Rack", "Mesa de luz"]);
  });

  it("lee «$ 800 - $ 1.200» como rango y no confunde «y», cuotas ni «armado y desarmado»", () => {
    expect(pricesFromText("Ropero $ 800 - $ 1.200", SRC, DAY).map(p => [p.amount, p.amountMax, p.kind])).toEqual([[800, 1200, "range"]]);
    expect(pricesFromText("Roperos y camas: $1.500 y $900", SRC, DAY)).toEqual([]);
    expect(pricesFromText("Roperos entre $900 y $1.500", SRC, DAY).map(p => [p.amount, p.amountMax])).toEqual([[900, 1500]]);
    expect(pricesFromText("Cucheta 12 cuotas de $ 250", SRC, DAY)).toEqual([]);
    expect(pricesFromText("Armado y desarmado de roperos $1.200", SRC, DAY).map(p => p.item)).toEqual(["ropero"]);
  });
});
