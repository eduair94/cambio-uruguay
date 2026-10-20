import { describe, expect, it } from "vitest";
import { categoryFor, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_BY_KEY, EQUIPAR_CATEGORIES } from "../../classes/equipar/registry";
import { buildBaskets } from "../../classes/equipar/basket";

const keyOf = (title: string, context = ""): string | null => categoryFor(title, context)?.key ?? null;
const sommier = EQUIPAR_BY_KEY.get("sommier")!;
const variantOf = (title: string): string => variantFor(sommier, title).key;

/**
 * En una tienda uruguaya "sommier" es la base CON su colchón. Hasta el 2026-10-20 nadie medía el
 * conjunto y la fila del colchón se quedaba con todos esos títulos, porque todos dicen "colchón".
 */
describe("sommier: el conjunto base + colchón tiene su propia fila", () => {
  it.each([
    "Sommier Inducol Bonnell 2 Plazas 140x190",
    "Conjunto Sommier Y Colchón 2 Plazas Resortes Pocket",
    "Sommier + Colchón 2 Plazas Divino Grand Royal",
    "Colchón Y Sommier 1 Plaza Espuma Alta Densidad",
    "Base Sommier Con Colchón 2 Plazas",
    "Colchón 2 Plazas + Base Box Resortes",
    "Somier 2 plazas impecable",
    "Sommier + Colchón + 2 Almohadas De Regalo 2 Plazas",
  ])("%s es un sommier", (title) => {
    expect(keyOf(title)).toBe("sommier");
  });

  it.each([
    "Colchón Inducol Ortopédico 2 Plazas",
    "Colchón 2 Plazas Kingshouse Espuma Alta Densidad Premium 14 188x138x14 Cm",
    "Colchon Divino Buen Sueño Espuma 80x185x17",
  ])("%s sigue siendo un colchón", (title) => {
    expect(keyOf(title)).toBe("colchon");
  });

  it("la góndola 'Colchones y Sommiers' no le saca el colchón a la fila del colchón", () => {
    // `titleExclude` mira el título y nada más: el pasillo de la tienda no dice qué es el producto.
    expect(keyOf("Colchón Inducol Bonnell 2 Plazas", "Dormitorio > Colchones y Sommiers")).toBe("colchon");
    expect(keyOf("Sommier Inducol Bonnell 2 Plazas", "Dormitorio > Colchones y Sommiers")).toBe("sommier");
  });

  it.each([
    ["Base Sommier 2 Plazas Divino", "la base sola"],
    ["Base De Sommier 140x190 Sin Colchón", "la base sola"],
    ["Cama Box Base Para Colchon De 140x190 032 Altura Ecoline Azul Oscuro O Negro", "la base sola"],
    ["Juego De Sábanas 2 Plazas Para Sommier Alto", "las sábanas"],
    ["Protector De Colchón Impermeable Para Sommier 2 Plazas", "el protector"],
    ["Respaldo Para Sommier 2 Plazas Tapizado", "el respaldo"],
    ["Pollera Para Sommier 2 Plazas", "la pollera"],
    ["Almohada Viscoelástica Ideal Sommier", "la almohada"],
    ["Cama Para Perro Tipo Sommier Grande", "una cama de perro"],
  ])("%s no es un sommier: es %s", (title) => {
    expect(keyOf(title)).not.toBe("sommier");
  });

  it("lo que vende el accesorio para sommier cae en su propia fila", () => {
    expect(keyOf("Juego De Sábanas 2 Plazas Para Sommier Alto")).toBe("sabanas");
    expect(keyOf("Almohada Viscoelástica Ideal Sommier")).toBe("almohada");
  });

  it("la base sola tampoco vuelve a la fila del colchón", () => {
    expect(keyOf("Base Sommier 2 Plazas Divino")).toBeNull();
    expect(keyOf("Cama Box Base Para Colchon De 140x190 032 Altura Ecoline Azul Oscuro O Negro")).toBeNull();
  });

  it.each([
    ["Sommier Inducol Bonnell 2 Plazas 140x190", "2plazas"],
    ["Sommier 138x188 Resortes", "2plazas"],
    ["Sommier Divino Pocket 160x200", "queen"],
    ["Sommier King 200x200", "queen"],
    ["Conjunto Sommier Y Colchón 2 1/2 Plazas", "queen"],
    ["Sommier 2 Plazas Y Media Pillow", "queen"],
    ["Sommier 1 Plaza 80x190", "1plaza"],
    ["Sommier 1 1/2 Plaza Resortes", "1plaza"],
    ["Sommier Plaza Y Media Inducol", "1plaza"],
    ["Sommier Inducol Elegance", "2plazas"],
  ])("%s es la medida %s", (title, variant) => {
    expect(variantOf(title)).toBe(variant);
  });

  it("puede esperar: tier C, que ninguna canasta suma, así el colchón no se cuenta dos veces", () => {
    expect(sommier.tier).toBe("C");
    expect(sommier.usedOk).toBe(false);
    const items = EQUIPAR_CATEGORIES.flatMap((category) =>
      category.variants.map((variant) => ({
        key: `${category.key}:${variant.key}`,
        category: category.key,
        variant: variant.key,
        newBand: { p25: 1000, median: 2000, p75: 3000, min: 500, n: 20 },
        usedBand: null,
      }))
    );
    const baskets = buildBaskets(items as never, 40);
    for (const basket of baskets) {
      expect(basket.lines.some((line) => line.itemKey.startsWith("sommier:")), basket.key).toBe(false);
    }
  });
});
