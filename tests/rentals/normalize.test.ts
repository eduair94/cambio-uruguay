import { describe, expect, it } from "vitest";
import {
  canonicalDepartment,
  inferPropertyType,
  isPlausibleRent,
  looksLikeRentalAdvert,
  parseAttributes,
  parseCurrency,
  parseLocationLine,
  parseMoney,
  parseStreet,
} from "../../classes/rentals/normalize";

describe("canonicalDepartment", () => {
  it("accepts a department spelled with or without its accent", () => {
    expect(canonicalDepartment("Paysandú")).toBe("Paysandú");
    expect(canonicalDepartment("paysandu")).toBe("Paysandú");
    expect(canonicalDepartment("RIO NEGRO")).toBe("Río Negro");
  });

  it("digs the department out of the portals' longer strings", () => {
    expect(canonicalDepartment("Montevideo Departamento de Montevideo, Uruguay")).toBe("Montevideo");
    expect(canonicalDepartment("Departamento de San José")).toBe("San José");
  });

  it("returns empty rather than guessing", () => {
    expect(canonicalDepartment("Pocitos")).toBe("");
    expect(canonicalDepartment("")).toBe("");
  });
});

describe("parseStreet", () => {
  // The bug this pins: half of Montevideo's streets ARE numbers. Reading the FIRST number as the
  // door number left "25 de Mayo 500" with no street name at all, which split one building into
  // two properties and defeated the dedupe.
  it("reads the trailing number as the door, not the leading one", () => {
    expect(parseStreet("25 De Mayo 477")).toEqual({ street: "25 de mayo", number: "477" });
    expect(parseStreet("18 de Julio 1234")).toEqual({ street: "18 de julio", number: "1234" });
    expect(parseStreet("8 de Octubre 3550")).toEqual({ street: "8 de octubre", number: "3550" });
  });

  it("expands the abbreviations the portals use interchangeably", () => {
    expect(parseStreet("Av. Garzón 1975 Bis")).toEqual({ street: "avenida garzon", number: "1975 bis" });
    expect(parseStreet("Avenida Garzon 1975")).toEqual({ street: "avenida garzon", number: "1975" });
    expect(parseStreet("Cno. Maldonado 5500")).toEqual({ street: "camino maldonado", number: "5500" });
  });

  it("does not treat the low end of a range as an exact door", () => {
    expect(parseStreet("Colorado 1500 - 1800")).toEqual({ street: "colorado 1500 - 1800", number: "" });
  });

  it("drops Google plus codes and apartment tails", () => {
    expect(parseStreet("4QJ9+664, C. Doctor Martín Berinduague 600 - 900")).toEqual({
      street: "c doctor martin berinduague 600 - 900",
      number: "",
    });
    expect(parseStreet("Rizal 3715 apto 402")).toEqual({ street: "rizal", number: "3715" });
  });

  it("keeps only the first street of a corner", () => {
    expect(parseStreet("Sena Esq. 20 De Febrero")).toEqual({ street: "sena", number: "" });
    expect(parseStreet("Bernardina Fragoso De Rivera Y Liber Arce")).toEqual({
      street: "bernardina fragoso de rivera",
      number: "",
    });
  });

  it("refuses to call a bare number a street", () => {
    expect(parseStreet("1975")).toEqual({ street: "", number: "" });
  });
});

describe("parseLocationLine", () => {
  it("splits MercadoLibre's street / barrio / departamento line", () => {
    expect(parseLocationLine("Av. Garzón 1975 Bis, Colón, Montevideo")).toMatchObject({
      street: "avenida garzon",
      number: "1975 bis",
      neighborhood: "Colón",
      department: "Montevideo",
    });
  });

  it("handles a line with no street", () => {
    expect(parseLocationLine("Brazo Oriental, Montevideo")).toMatchObject({
      street: "",
      number: "",
      neighborhood: "Brazo Oriental",
      department: "Montevideo",
    });
  });

  it("ignores a city that repeats the department", () => {
    expect(parseLocationLine("Colorado 1500 - 1800, Montevideo, Goes, Montevideo")).toMatchObject({
      neighborhood: "Goes",
      department: "Montevideo",
      number: "",
    });
  });

  it("falls back to the hint when the line carries no department", () => {
    expect(parseLocationLine("Punta del Este", "Maldonado")).toMatchObject({ department: "Maldonado" });
  });
});

describe("parseMoney", () => {
  // The last separator decides: three digits after it means thousands.
  it("reads a Uruguayan thousands separator as thousands", () => {
    expect(parseMoney("$ 4.500")).toBe(4500);
    expect(parseMoney("U$S 1.200")).toBe(1200);
    expect(parseMoney("25,000")).toBe(25000);
  });

  it("reads a real decimal as a decimal", () => {
    expect(parseMoney("4,50")).toBe(4.5);
  });

  it("rejects what is not a price", () => {
    expect(parseMoney("consultar")).toBeNull();
    expect(parseMoney(0)).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });
});

describe("parseCurrency", () => {
  it("tells the two currencies apart", () => {
    expect(parseCurrency("U$S")).toBe("USD");
    expect(parseCurrency("$")).toBe("UYU");
    expect(parseCurrency("USD")).toBe("USD");
    expect(parseCurrency("")).toBeNull();
  });
});

describe("parseAttributes", () => {
  it("reads MercadoLibre's attribute strip", () => {
    expect(parseAttributes(["2 dormitorios", "1 baño", "40 m² cubiertos"])).toEqual({
      bedrooms: 2,
      bathrooms: 1,
      area: 40,
    });
  });

  it("treats a monoambiente as zero bedrooms, not as unknown", () => {
    expect(parseAttributes(["Monoambiente a estrenar"]).bedrooms).toBe(0);
  });

  it("leaves what the portal never said as null", () => {
    expect(parseAttributes(["Apartamento en alquiler"])).toEqual({ bedrooms: null, bathrooms: null, area: null });
  });
});

describe("looksLikeRentalAdvert", () => {
  it("keeps ordinary rental adverts", () => {
    expect(looksLikeRentalAdvert("Alquilo apartamento 2 dormitorios en Pocitos")).toBe(true);
  });

  it("drops sales, wanted-ads and by-the-night rentals", () => {
    expect(looksLikeRentalAdvert("Vendo apartamento en Pocitos")).toBe(false);
    expect(looksLikeRentalAdvert("Busco alquilar apartamento en Cordón")).toBe(false);
    expect(looksLikeRentalAdvert("Alquiler por día en Punta del Este")).toBe(false);
  });

  it("excludes explicit winter-only contracts even when their monthly price is plausible", () => {
    expect(looksLikeRentalAdvert("ALQUILER INVERNAL PUNTA DEL ESTE 2026")).toBe(false);
    expect(looksLikeRentalAdvert("Apartamento en alquiler por invierno")).toBe(false);
    expect(looksLikeRentalAdvert("Apartamento en alquiler", "Alquiler invernal de abril a noviembre: USD 750 mensuales.")).toBe(false);
    expect(looksLikeRentalAdvert("Apartamento en alquiler", "<p>Alquiler&nbsp;<strong>invernal</strong> de abril a noviembre.</p>")).toBe(false);
    expect(isPlausibleRent(750 * 40, "apartamento")).toBe(true);
  });

  it("does not confuse winter amenities or an available annual contract with winter-only rent", () => {
    expect(looksLikeRentalAdvert("Alquiler anual con jardín de invierno")).toBe(true);
    expect(looksLikeRentalAdvert("Casa en alquiler", "Ropa de cama para invierno y calefacción.")).toBe(true);
    expect(looksLikeRentalAdvert("Apartamento en alquiler anual", "Alquiler invernal también disponible.")).toBe(true);
    expect(looksLikeRentalAdvert("Apartamento en alquiler", "Alquiler anual USD 1.000. Alquiler invernal USD 750.")).toBe(true);
  });
});

describe("isPlausibleRent", () => {
  it("rejects prices that cannot be a monthly rent", () => {
    expect(isPlausibleRent(180_000 * 40)).toBe(false);
    expect(isPlausibleRent(1)).toBe(false);
    expect(isPlausibleRent(28_000, "apartamento")).toBe(true);
  });

  // From the first live run: a two-bedroom in Pocitos advertised at "U$S 90" — a seller asking you
  // to call, not a rent. One shared floor either lets that through or throws away the garage
  // market, which really does rent at $3.500.
  it("holds a dwelling to a higher floor than a garage", () => {
    expect(isPlausibleRent(3_721, "apartamento")).toBe(false);
    expect(isPlausibleRent(3_721, "otro")).toBe(true);
    expect(isPlausibleRent(3_500, "habitacion")).toBe(true);
  });
});

describe("inferPropertyType", () => {
  it("prefers the portal's own taxonomy over the title's words", () => {
    expect(inferPropertyType("Casa de altos frente al mar", "MLU-APARTMENTS_FOR_RENT")).toBe("apartamento");
    expect(inferPropertyType("Excelente oportunidad", "Local Comercial")).toBe("local");
  });

  it("falls back to the title when there is no taxonomy", () => {
    expect(inferPropertyType("Alquilo habitación en pensión")).toBe("habitacion");
    expect(inferPropertyType("Alquilo casa 3 dormitorios")).toBe("casa");
    expect(inferPropertyType("Oportunidad única")).toBe("otro");
  });

  // Real public titles, 2026-10-07: two thirds of the `habitacion` type were whole homes.
  it.each([
    ["2 habitaciones 1 baño Casa", "casa"],
    ["3 habitaciones 1 baño Departamento/condominio", "apartamento"],
    ["1+habitación+1+baño+Departamento/condominio", "apartamento"],
    ["3 habitaciones 1 baño Apartamento o piso", "apartamento"],
    ["1 habitación 1 baño Townhouse", "casa"],
    ["1 habitación 1 baño Solo habitación", "habitacion"],
    ["Alquilo apto de 1 dormitorio en Maroñas. Consulta wpp", "apartamento"],
    ["Alquiler Apartamento 1 Dormitorio en Cordon Sur", "apartamento"],
    ["Alquilo casa de un dormitorio en la bota", "casa"],
    ["Alquiler amplio apartamento de tres habitaciones y dos baños en ciudad vieja", "apartamento"],
    ["Alquiler de Apartamento 1 Dormitorio con Salida a balcón en Tres Cruces con Cochera Compartida", "apartamento"],
    ["Alquiler Atlantida apto con cuarto dos cuadras de la playa mansa", "apartamento"],
    ["Alquilo! Casa 2 dormitorios living, comedor , cocina y baño Patio,Pieza al fondo", "casa"],
    ["Alquilo consultorio compartido", "oficina"],
    ["Alquiler 1 Dormitorio en La Blanqueada", "otro"],
    ["3 habitaciones 1 baño - Departamento", "apartamento"],
    ["Alquiler la teja 2 cuartos $17000", "otro"],
    ["Monoambiente 1 baño Departamento/condominio", "apartamento"],
  ])("a counted room describes a home: %s", (title, expected) => {
    expect(inferPropertyType(title)).toBe(expected);
  });

  it.each([
    "Alquilo habitación para persona sola",
    "Alquiler Habitación Privada en Apartamento compartido Punta del Este",
    "Alquiler habitación en apto céntrico",
    "Se alquila una habitación en casa de familia",
    "Casa Compartida Para Estudiantes Del Interior",
    "Alquilo Apartamento compartido , CENTRO. Para 2 muchachos",
    "Alquilo pieza a señora en capurro",
    "Pension / habitaciones / equipadas / ingreso inmediato",
    "Alquilo cuartos",
    "RENTA DE PIEZAS INDIVIDUALES Y COMPARTIDAS EN EL CORAZON DE LA CIUDAD VIEJA",
    "10 habitaciones 6 baños Solo habitación",
    "Monoambiente 1 baño Solo habitación",
  ])("a room offered on its own is still a room: %s", (title) => {
    expect(inferPropertyType(title)).toBe("habitacion");
  });
});


describe("attribute numbers belong to their own labels", () => {
  it("does not use unit, door, rent or another attribute as the count", () => {
    expect(parseAttributes(["Apto 301, 2 dormitorios, 1 baño, 60 m² por $ 30000"])).toEqual({ bedrooms: 2, bathrooms: 1, area: 60 });
    expect(parseAttributes(["18 de Julio 1234, 3 dormitorios y 2 baños, 95m2"])).toEqual({ bedrooms: 3, bathrooms: 2, area: 95 });
    expect(parseAttributes(["2026: baño nuevo y dormitorio amplio"])).toEqual({ bedrooms: null, bathrooms: null, area: null });
  });
  it("handles explicit field labels, abbreviations and decimal areas", () => {
    expect(parseAttributes(["Dormitorios: 2", "Baños: 1", "50,6 m²"])).toEqual({ bedrooms: 2, bathrooms: 1, area: 51 });
    expect(parseAttributes(["1 habitación, 1 baño, 22 m2"])).toEqual({ bedrooms: 1, bathrooms: 1, area: 22 });
  });
});

// Public adverts on 2026-10-07 that the directory listed as monthly homes.
describe("what is not a monthly home rental", () => {
  it.each([
    "Alquiler castillos inflabes y cama elástica",
    "Alquiler maquina soprano titanium alma depilación definitiva",
    "SE ALQUILA FOOD TRUCK",
    "Alquiler de volquetas",
    "Alquiler para eventos cumpleaños reuniones",
    "Alquiler de amplio salón de fiestas y eventos",
    "ALQUILO $2390 LA NOCHE 1 cuadra de la playa / 6 PERSONAS",
    "ALQUILER por Días COSTA AZUL, CANELONES",
    "Alquiler segunda quincena de enero y febrero",
    "Alquiler primer quincena de enero Balneario Buenos Aires",
    "Alquiler De Verano, Apartamento De 3 Dormitorios En La Barra",
    "Alquiler enero 2 dormitorios en Península Punta del Este",
    "Casa en alquiler para verano pinares, Punta del Este",
  ])("rejects %s", (title) => {
    expect(looksLikeRentalAdvert(title)).toBe(false);
  });

  it.each([
    "Oficinas Equipada Para Escribana, Contadora Sicóloga Etc Con Sala De Reuniones",
    "Complejo De 3 Edificios En Palermo Con Seguridad. Barbacoa y salón de fiestas",
    "Ideal Clínica O Salón De Fiestas",
    "Se alquila por Luc salón para fiestas o pizzería en Estación Atlántida",
    "Apartamento En Alquiler De Verano 6 Meses O Más 1 Dormitorio Santos Dumont",
    "Alquilo apartamento 2 dormitorios, ingreso en enero",
    "Alquilo apartamento, visitas toda la semana",
  ])("keeps %s", (title) => {
    expect(looksLikeRentalAdvert(title)).toBe(true);
  });
});

describe("a title that opens with a residence rents beds", () => {
  it.each([
    "Residencia Estudiantil En El Centro",
    "Hogar - Residencia Estudiantil En El Centro.la Mejor!!",
    "RESIDENCIA FEMENINA EN EL CENTRO",
    "Alquilo Residencia Estudiante O Trabajadores O Pensionista U Otro",
  ])("%s is a room even when the portal says house", (title) => {
    expect(inferPropertyType(title, "MLU-HOUSES_FOR_RENT")).toBe("habitacion");
  });

  it.each([
    ["Alquiler Casa De 5 Dormitorios, 3 Baños Y Cochera En Reducto | Cowork | Residencia Estudiantil.", "casa"],
    ["Exclusiva Residencia en Alquiler en Los Olivos, Carrasco", "casa"],
    ["Residencia de categoría en alquiler con piscina", "casa"],
  ])("%s keeps the portal's type", (title, expected) => {
    expect(inferPropertyType(title, "MLU-HOUSES_FOR_RENT")).toBe(expected);
  });
});
