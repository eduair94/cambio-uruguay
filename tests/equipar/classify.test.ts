import { describe, expect, it } from "vitest";
import { categoryFor, norm, numericValue, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_BY_KEY } from "../../classes/equipar/registry";

const keyOf = (title: string, context = ""): string | null => categoryFor(title, context)?.key ?? null;

describe("normalización", () => {
  it("saca acentos, porque el mismo catálogo escribe Sartén y SARTEN", () => {
    expect(norm("Sartén Antiadherente 24 CM")).toBe("sarten antiadherente 24 cm");
    expect(norm("Colchón  2   Plazas")).toBe("colchon 2 plazas");
  });
});

describe("a qué categoría pertenece un título", () => {
  it("reconoce los grandes por su nombre, que no tiene competencia", () => {
    expect(keyOf("Heladera Samsung No Frost 382 Lts")).toBe("heladera");
    expect(keyOf("Lavarropas Automático Drean Next 6.09")).toBe("lavarropas");
    expect(keyOf("Colchón Suavestar Confort 140x190")).toBe("colchon");
    expect(keyOf("Calefón Rheem 80 litros")).toBe("calefon");
  });

  it("descarta lo que comparte la palabra pero no es el producto", () => {
    // Una conservadora de playa no es una heladera aunque el título diga heladera portátil.
    expect(keyOf("Heladera portátil conservadora 24 litros para auto 12v")).not.toBe("heladera");
    expect(keyOf("Colchón inflable 2 plazas para camping")).not.toBe("colchon");
    expect(keyOf("Mueble bajo mesada para cocina 3 puertas")).not.toBe("cocina");
    expect(keyOf("Monitor gamer 27 pulgadas")).not.toBe("tv");
  });

  it("descarta repuestos y accesorios antes de mirar la categoría", () => {
    expect(keyOf("Goma de puerta para heladera Consul")).toBeNull();
    expect(keyOf("Lavarropas Samsung no funciona, para repuesto")).toBeNull();
    expect(keyOf("Funda para sofá de 3 cuerpos")).toBeNull();
  });

  it("no confunde una tabla de picar de vidrio con la que el sitio recomienda", () => {
    // El motivo del tier dice madera o bambú: el metal y el vidrio le comen el filo al cuchillo.
    expect(keyOf("Tabla de picar de vidrio templado")).toBeNull();
    expect(keyOf("Tabla de picar de bambú 38x28")).toBe("tabla-picar");
  });

  it("usa el contexto de la tienda cuando el título solo no alcanza", () => {
    // Fenicio publica descripción y URL; ahí es donde se ve que la silla es de comedor.
    expect(keyOf("Juego de comedor Nórdico", "mesa con 4 sillas de madera")).toBe("mesa-sillas");
  });
});

describe("en qué variante cae", () => {
  it("lee los litros de una heladera", () => {
    const heladera = EQUIPAR_BY_KEY.get("heladera")!;
    expect(variantFor(heladera, "Frigobar 92 Lts").key).toBe("frigobar");
    expect(variantFor(heladera, "Heladera 302 litros con freezer").key).toBe("media");
    expect(variantFor(heladera, "Heladera Side by Side 550 L").key).toBe("grande");
  });

  it("lee las pulgadas de un televisor", () => {
    const tv = EQUIPAR_BY_KEY.get("tv")!;
    expect(variantFor(tv, 'Smart TV 32"').key).toBe("32");
    expect(variantFor(tv, "Smart TV 55 pulgadas 4K").key).toBe("55");
  });

  it("cae en la variante por defecto cuando el título no dice el tamaño", () => {
    const heladera = EQUIPAR_BY_KEY.get("heladera")!;
    // Es lo que hace Marketplace todo el tiempo, y es la razón de que exista la variante por defecto.
    expect(variantFor(heladera, "Heladera usada funcionando").key).toBe("media");
  });

  it("no lee un precio como si fuera una medida", () => {
    expect(numericValue("sarten 24 cm $1.290", "cm")).toBe(24);
    expect(numericValue("olla sin medida", "cm")).toBeNull();
  });
});
