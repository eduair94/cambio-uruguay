import { describe, expect, it } from "vitest";
import { categoryFor, norm, numericValue, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_BY_KEY } from "../../classes/equipar/registry";

const keyOf = (title: string): string | null => categoryFor(title)?.key ?? null;
const variantOf = (category: string, title: string): string => variantFor(EQUIPAR_BY_KEY.get(category)!, title).key;

describe("lo que se coló en producción el 16/9/2026", () => {
  it.each([
    ["Convector Kassel Ks-Con3002 Split Digital 2000w", "aire-acondicionado"],
    ["Mueble Mf211 Blanco 130X63X47Cm Para Microondas", "microondas"],
    ["Batidora Arno Chef, con bowl de 5 litros apto microondas y freezer (-20°C Mín y 80 °C Máx)", "microondas"],
    ["Gas Butano 220 Gr. Cocinilla O Anafe Isobutano 4 Vientos", "cocina"],
    ["Cartucho Gas Butano Campgas Ntk Anafe Camping Repostería", "cocina"],
    ["Linterna de camping multifunción Xiaomi", "impresora"],
    ["Arrocera Inteligente Xiaomi Smart Multifunción Rice Cooker", "impresora"],
    ["Cama Box Base Para Colchon De 140x190 032 Altura Ecoline Azul Oscuro O Negro", "colchon"],
    ["Lavarropas Semi-automático Enxuta Lenx7500 Blanco 5kg Amv", "lavarropas"],
    ["Lavarropas 13 Kg Arno Semi-automatico (Sin centrifutgado), posee 5 Programas Y Timer Negro", "lavarropas"],
    ["Lavarropas Enxuta Leb7200 7.2 Kgs Doble Cuba", "lavarropas"],
    ["Calentador Instantáneo Calefon A Gas Mega 7lts Tiro Natural", "calefon"],
  ])("%s no es %s", (title, category) => {
    expect(keyOf(title)).not.toBe(category);
  });

  // El yogur de "colchón 2 plazas" no era una mezcla de SKUs de VTEX: el título mismo dice
  // "colchón". En la góndola uruguaya un "colchón de frutillas" es el yogur con la capa de fruta en
  // el fondo, y El Dorado es supermercado. Reproducido con scripts/oneoff/equipar_dry_run.ts el
  // 16/9/2026: `ft=colchon` devolvió 11 productos, 5 aceptados, 4 de ellos yogures de $ 69,9 a $ 77
  // con ruta /Frescos/Lacteos/Yogurt/. Sin modelo publicado, el nombre del "producto" salió de la
  // cola del título: "calcar de frutillas 130gr".
  it.each([
    "Yogur Griego Calcar Colchon De Frutillas 130gr",
    "Yogur Ser Colchon Frutilla Pote 175Gr .",
    "Yogur Griego Calcar Colchon De Frutas Del Bosque 130gr",
    "Yogur Claldy Colchon Durazno 180ml",
  ])("%s es un yogur, no un colchón", (title) => {
    expect(keyOf(title)).not.toBe("colchon");
  });

  it("la ruta de categoría de la tienda alcanza para descartar el colchón de fruta aunque el título no lo diga", () => {
    const vtexPath = "/Frescos/Lacteos/Yogurt/ /Frescos/Lacteos/ /Frescos/";
    expect(categoryFor("Colchon De Frutillas Calcar", vtexPath)?.key ?? null).not.toBe("colchon");
    // Y el colchón de verdad de la misma tienda sigue entrando con su propia ruta.
    expect(categoryFor("Colchon Divino Buen Sueño Espuma 80x185x17", "/Hogar/Colchones/Espuma/ /Hogar/Colchones/ /Hogar/")?.key).toBe(
      "colchon"
    );
  });

  it("un anafe de camping que el filtro de cocina saca no cae en estufa por decir 'estufa'", () => {
    // Medido en TYT al correr el dry run: al excluir los anafes a cartucho de "cocina", este título
    // pasó a la siguiente categoría que lo aceptaba, que era la de calefacción.
    expect(keyOf("Anafe Estufa A Gas Butano Portatil 1 Hornalla Camping Truper")).toBeNull();
    expect(keyOf("Estufa A Gas Supergas Tiro Balanceado 3000 Kcal")).toBe("estufa");
  });

  it("siguen entrando los que sí son", () => {
    expect(keyOf("Impresora Multifuncion Brother DCP-T230")).toBe("impresora");
    expect(keyOf("Microondas Panavox M20n 20l 700w 11 Niveles Mecánico Negro")).toBe("microondas");
    expect(keyOf("Anafe A Gas Smartlife 5 Hornallas 70x60cm Inox C/encendido Color Plateado")).toBe("cocina");
    expect(keyOf("Aire Acondicionado Split Hogaron 12000 BTU Frío/Calor con Gas R32 y Caño de Cobre")).toBe("aire-acondicionado");
    expect(keyOf("Colchón 2 Plazas Kingshouse Espuma Alta Densidad Premium 14 188x138x14 Cm")).toBe("colchon");
    expect(keyOf("Calefón Termotanque Eléctrico Enxuta 40L Aislación Acero Anticorrosivo")).toBe("calefon");
  });

  it("aire: los accesorios de instalación no son un aire, aunque el aire sí mencione su caño", () => {
    // `norm` convierte la ñ en n, así que un "caño" escrito con ñ en el filtro nunca coincidía.
    expect(keyOf("Caño De Cobre Para Aire Acondicionado 1/4 3/8 Rollo 15 Metros")).not.toBe("aire-acondicionado");
    expect(keyOf("Kit De Caños Para Aire Acondicionado Split 3 Metros")).not.toBe("aire-acondicionado");
  });

  it("aire: lee los BTU con separador de miles y no inventa un número sin unidad", () => {
    expect(numericValue(norm("Aire Acondicionado 12.000 BTU Inverter"), "btu")).toBe(12000);
    expect(numericValue(norm("Aire Acondicionado Split 9,000 BTUs"), "btu")).toBe(9000);
    expect(numericValue(norm("Aire Acondicionado Split 18000btu"), "btu")).toBe(18000);
    expect(numericValue(norm("Aire Acondicionado Split Inverter Frío Calor 2026"), "btu")).toBeNull();
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Split 12.000 BTU Frío Calor")).toBe("12000");
  });

  it("aire: 9.000 BTU es su propia variante, con o sin espacio antes de BTU", () => {
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Futura 9000btu Fut-09aa-c")).toBe("9000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Greenwind 9000 Btu Color Blanco")).toBe("9000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Greenwind Inverter Con Wifi 12000 Btu Bla")).toBe("12000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Split Xion Frio Calor 18000 Btu Eficien B")).toBe("18000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Portátil 12000 BTU Frío")).toBe("portatil");
  });
});
