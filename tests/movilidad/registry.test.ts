// Data with no test rots quietly (see tests/equipar/registry.test.ts): a category with the wrong
// include lets a moto or a triciclo through, and one with no fallback variant silently drops every
// listing whose title does not state a size. The positives/negatives below are the actual titles
// measured 2026-09-17 against delcar, superbikers, covercompany, voltbike, loopbikes and the
// MercadoLibre bridge with scripts/oneoff/movilidad_dry_run.ts — not invented strings.
import { describe, expect, it } from "vitest";
import { categoryFor, itemKey, specsFor, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_BY_KEY } from "../../classes/equipar/registry";
import { MOVILIDAD_BY_KEY, MOVILIDAD_CATEGORIES, MOVILIDAD_STORE_KEYS } from "../../classes/movilidad/registry";
import { titleWithType } from "../../classes/retail/sources/shopify";
import { retailStores } from "../../classes/retail/stores";

const classify = (title: string, context = "") => categoryFor(title, context, MOVILIDAD_CATEGORIES);

/** How `harvestShopifyStore` builds the title it classifies AND publishes when a store sets
 * `productTypeInTitle: true` (voltbike, loopbikes) — see classes/retail/sources/shopify.ts. */
const composed = (productType: string, rawTitle: string) =>
  titleWithType({ productTypeInTitle: true }, { product_type: productType }, rawTitle);

describe("registro de movilidad: forma", () => {
  it("no repite claves entre sí", () => {
    const keys = MOVILIDAD_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ninguna clave colisiona con classes/equipar/registry.ts", () => {
    for (const category of MOVILIDAD_CATEGORIES) {
      expect(EQUIPAR_BY_KEY.has(category.key), `${category.key} ya existe en EQUIPAR_CATEGORIES`).toBe(false);
    }
  });

  it("las dos categorías viven en el room movilidad", () => {
    for (const category of MOVILIDAD_CATEGORIES) {
      expect(category.room).toBe("movilidad");
    }
  });

  it("monopatín es régimen modelo y bicicleta es régimen commodity", () => {
    expect(MOVILIDAD_BY_KEY.get("monopatin-electrico")!.regime).toBe("modelo");
    expect(MOVILIDAD_BY_KEY.get("bicicleta-electrica")!.regime).toBe("commodity");
  });

  it("toda categoría declara exactamente una variante por defecto", () => {
    for (const category of MOVILIDAD_CATEGORIES) {
      const fallbacks = category.variants.filter((variant) => variant.fallback);
      expect(fallbacks.length, `${category.key} tiene ${fallbacks.length} variantes por defecto`).toBe(1);
    }
  });

  it("las variantes no repiten clave dentro de una categoría", () => {
    for (const category of MOVILIDAD_CATEGORIES) {
      const keys = category.variants.map((variant) => variant.key);
      expect(new Set(keys).size, `${category.key} repite una variante`).toBe(keys.length);
    }
  });

  it("toda categoría explica su tier y trae consultas para las tres fuentes", () => {
    for (const category of MOVILIDAD_CATEGORIES) {
      expect(category.reason.length, `${category.key} no explica su tier`).toBeGreaterThan(20);
      expect(category.storeQueries.length, `${category.key} sin storeQueries`).toBeGreaterThan(0);
      expect(category.mlQueries.length, `${category.key} sin mlQueries`).toBeGreaterThan(0);
      expect(category.mlQueries.length, `${category.key} tiene más de 6 mlQueries`).toBeLessThanOrEqual(6);
      expect(category.fbQueries.length, `${category.key} sin fbQueries`).toBeGreaterThan(0);
    }
  });

  it("specsFor produce las dos claves en orden de registro", () => {
    const specs = specsFor(MOVILIDAD_CATEGORIES);
    expect(specs.map((spec) => spec.key)).toEqual(["monopatin-electrico", "bicicleta-electrica"]);
  });

  it("MOVILIDAD_STORE_KEYS sólo nombra tiendas registradas y habilitadas", () => {
    expect(MOVILIDAD_STORE_KEYS.length).toBeGreaterThan(0);
    const resolved = retailStores(MOVILIDAD_STORE_KEYS);
    expect(resolved.map((store) => store.key).sort()).toEqual([...MOVILIDAD_STORE_KEYS].sort());
  });

  it("voltbike y loopbikes están en MOVILIDAD_STORE_KEYS con productTypeInTitle activo", () => {
    // Fix round 1: medido 2026-09-17 sin el flag daba 0 aceptados en ambas (sus modelos reales no
    // llevan "bicicleta"/"eléctrica" en el título, sólo en Shopify product_type). Con
    // `productTypeInTitle: true` (classes/retail/stores.ts) sí aportan productos reales — ver
    // scripts/oneoff/movilidad_dry_run.ts y classes/retail/sources/shopify.ts.
    const both = retailStores(["voltbike", "loopbikes"]);
    expect(both.map((store) => store.key).sort()).toEqual(["loopbikes", "voltbike"]);
    for (const store of both) {
      expect(store.productTypeInTitle, `${store.key} debería tener productTypeInTitle activo`).toBe(true);
    }
    expect(MOVILIDAD_STORE_KEYS).toContain("voltbike");
    expect(MOVILIDAD_STORE_KEYS).toContain("loopbikes");
  });
});

describe("productTypeInTitle + clasificación: positivos y negativos compuestos (fix round 1)", () => {
  it.each([
    ["Bicicleta Eléctrica", "SuperVolt", "bicicleta-electrica", "urbana"], // voltbike
    ["Bicicleta Eléctrica", "Plegable R20", "bicicleta-electrica", "plegable"], // voltbike
    ["Motopatín Eléctrico", "Monopatin Air", "monopatin-electrico", "urbano"], // voltbike
    ["Bicicleta eléctrica", "Loop Cruiser", "bicicleta-electrica", "urbana"], // loopbikes
    ["Bicicleta eléctrica", "Michael Blast Outsider Sport", "bicicleta-electrica", "urbana"], // loopbikes
  ] as const)("%s + %s -> %s:%s", (productType, rawTitle, categoryKey, variantKey) => {
    const title = composed(productType, rawTitle);
    const category = classify(title);
    expect(category?.key, title).toBe(categoryKey);
    expect(variantFor(category!, title).key, title).toBe(variantKey);
  });

  it.each([
    ["Bicicleta", 'Loop Craft Kids 24"'], // loopbikes: bici manual, product_type NUNCA dice "eléctrica"
    ["Accesorio", "Cámara de Monopatin 8 1/2 x 2 Válvula Recta"], // voltbike
    ["Accesorio", "Rele 36V"], // voltbike
    ["Accesorio", "Cargador 60V Motopatin"], // voltbike
    ["Accesorio de bicicleta eléctrica", "Canasto Central Michael Blast Outsider 5.0"], // loopbikes
    ["Accesorio de bicicleta eléctrica", "Espejos Loop Bikes (juego)"], // loopbikes
    ["Accesorio de bicicleta eléctrica", "Apoya pies VLKR"], // loopbikes
    ["Bicicleta eléctrica", "CARGADOR Loop 36v 2ah"], // loopbikes: cargador mal tipeado como bicicleta
    ["Repuesto", "BATERIA SLIM 36v 10.4ah EXTRAÍBLE"], // loopbikes
    ["Repuesto", "MORDAZA DE FRENO TEKTRO"], // loopbikes
    ["Ropa", "T-shirt Octans Skull Black"], // loopbikes
  ] as const)("%s + %s -> rechazado", (productType, rawTitle) => {
    expect(classify(composed(productType, rawTitle))).toBeNull();
  });
});

describe("monopatín eléctrico: positivos medidos", () => {
  const cases: Array<[string, string]> = [
    ["Monopatín Eléctrico XIAOMI SCOOTER 6", "urbano"], // delcar, 2026-09-17
    ["Monopatín Eléctrico MISTYLE ME800", "urbano"], // delcar
    ["Monopatín Eléctrico Go-Green Mod. Concept", "urbano"], // superbikers
    ["Monopatin electrico Xiaomi MI Electric Scooter 6 Ultra", "urbano"], // covercompany
    ["Monopatin electrico Xiaomi MI Electric Scooter 5 Plus GL + Asiento", "urbano"], // covercompany
    ["Scooter Eléctrico Xiaomi 6 Ultra 1200w 75 Km Autonomía", "alto-rendimiento"], // ML, 1200w
    ["Monopatín Eléctrico Knex Urban | Motor 800w | 48v*10.4ah", "alto-rendimiento"], // ML, 800w
    ["Monopatín Eléctrico 1600w Plegable Suspen Velocid 60 Km/h Negro", "alto-rendimiento"], // ML
    ["Monopatín Eléctrico Velocifero Mad 2000w", "alto-rendimiento"], // ML
    ["Monopatin Electrico Infantil Plegable Asiento 12km/h 120w", "infantil"], // ML
    // Xiaomi Electric Scooter/Patinete Eléctrico: sinónimos medidos en ML el 2026-09-17.
    ["Xiaomi Electric Scooter 5 Pro Us Color Negro", "urbano"],
    ["Patinete Eléctrico Adulto 430 W 20 Millas 19 Mph Plegable Negro", "urbano"],
    ["Gotrax Patinete Eléctrico A5 Con Asiento Para Adultos 15.5", "urbano"],
  ];
  it.each(cases)("%s -> %s", (title, variantKey) => {
    const category = classify(title);
    expect(category?.key, title).toBe("monopatin-electrico");
    expect(variantFor(category!, title).key, title).toBe(variantKey);
  });
});

describe("bicicleta eléctrica: positivos medidos", () => {
  const cases: Array<[string, string]> = [
    ["Bicicleta Eléctrica S-PRO Chilly Cargo", "carga"], // delcar
    ["Bicicleta Eléctrica S-PRO WAGON", "urbana"], // delcar
    ["Bicicleta Eléctrica S-PRO e-Strada DLX", "urbana"], // delcar
    ["Bicicleta Eléctrica Trinx Groove Mtb 27,5 Color Verde Musgo", "montana"], // ML
    ["Bicicleta Eléctrica Plegable Gyroor R14 C3 Adultos Circuit", "plegable"], // ML
    ["Bicicleta Electrica Para Delivery Wheele Modelo Cargo Blanco", "carga"], // ML
  ];
  it.each(cases)("%s -> %s", (title, variantKey) => {
    const category = classify(title);
    expect(category?.key, title).toBe("bicicleta-electrica");
    expect(variantFor(category!, title).key, title).toBe(variantKey);
  });
});

describe("negativos: nunca deben publicarse como monopatín o bicicleta", () => {
  const rejected = [
    // repuestos, sueltos, medidos en voltbike/loopbikes/ML 2026-09-17
    "Cámara de Monopatin 8 1/2 x 2 Válvula Recta",
    "Cargador 60V Motopatin",
    "Bateria De Litio 36v 7800mah Para Monopatin O Bicicleta",
    "Batería de litio 48V 20Ah para monopatín eléctrico",
    "Cargador para monopatín eléctrico Xiaomi",
    "Motor De Motopatin 1500W",
    "Cámara Craft 24x1.75",
    "CARGADOR Loop 48v 2ah",
    // cascos
    "CASCO white",
    "Casco Electric Loop Riders Club",
    "Casco para monopatín eléctrico",
    // cubiertas / neumáticos
    "Cubierta de Monopatin",
    "Cubierta 8.5 para monopatín eléctrico Xiaomi",
    // juguetes sin motor (cubierto por NOT_A_PRODUCT, compartido con equipar)
    "Monopatín eléctrico de juguete para niños 6V",
    // "monopatín"/"bicicleta" sin motor: la parte que no puede aflojarse
    'Monopatín Patineta 3 Ruedas para Niños',
    "Bicicleta Rodado 26 Aro Doble Pared",
    "Wolfking Convencional NO Eléctrica",
    // motos eléctricas: NUNCA un monopatín (el caso que señaló el controller)
    "Moto Eléctrica E-YUMBO NEXT",
    // triciclos y cuatriciclos eléctricos: otro vehículo, nunca monopatín ni bicicleta
    "Triciclo Eléctrico - Pre Venta arribo 20/09/26",
    "Triciclo Eléctrico para adultos con motor 500w",
    "Cuatriciclo Eléctrico infantil",
    // accesorio real que matcheaba "ebike" como palabra suelta (loopbikes, medido 2026-09-17)
    "Lubricante de Cadena Zefal eBike 120ml",
  ];
  it.each(rejected)("%s", (title) => {
    expect(classify(title)).toBeNull();
  });
});

describe("fix round 2: un kit o motor de conversión nunca es un vehículo completo", () => {
  // Reproducido por la revisión: el exclude exigía la palabra "de" ("kit de conversion", "motor de
  // conversion", "convertir (tu|la) bicicleta", "con matricula"), y una frase rígida que sólo
  // matchea con un conector exacto es el mismo bug dos veces — la forma sin "de" es al menos tan común
  // en los títulos reales. Las primeras cuatro son las que reprodujo la revisión tal cual.
  const rejected = [
    "Kit Conversión Bicicleta Eléctrica 36v 350w",
    "Motor Conversión Bicicleta Eléctrica 350w",
    "Bicicleta Eléctrica Kit Conversión 350w Rodado 26",
    "Kit Conversión Monopatín Eléctrico 250w",
    // variantes con "de", que ya funcionaban, para que una futura reversión rompa las dos formas
    "Kit de Conversión Bicicleta Eléctrica 36v 350w",
    "Motor de Conversión Bicicleta Eléctrica 350w",
    "Kit de Conversión Monopatín Eléctrico 250w",
    // "convertir" sin "tu"/"la" delante de "bicicleta" (y ni siquiera con la palabra completa
    // "bicicleta": el original exigía "convertir (tu|la) bicicleta" y "convertir tu bici" ya se le
    // escapaba). Se arman con "Bicicleta/Monopatín Eléctrico" al frente para que include() pase y sea
    // realmente el exclude quien decida — si include ya rechazara la frase, la prueba no probaría nada.
    "Bicicleta Eléctrica: Kit Para Convertir Tu Bici Común 350w",
    "Monopatín Eléctrico: Kit Para Convertir Patineta Común En Eléctrica",
    // "matricula" sin la palabra "con" por delante
    "Monopatín Eléctrico con matrícula incluida",
    "Monopatín Eléctrico, ya viene con la matrícula gestionada",
  ];
  it.each(rejected)("%s -> rechazado", (title) => {
    expect(classify(title)).toBeNull();
  });

  it("control positivo: una bicicleta eléctrica completa sigue aceptándose", () => {
    const title = "Bicicleta Eléctrica Rodado 26 350w";
    const category = classify(title);
    expect(category?.key, title).toBe("bicicleta-electrica");
    expect(variantFor(category!, title).key, title).toBe("urbana");
  });
});

describe("umbral de alto rendimiento (monopatín): 350w/500w quedan urbano, 800w/1000w suben", () => {
  it.each([
    ["Monopatín Eléctrico Urbano 350w", "urbano"],
    ["Monopatín Eléctrico Urbano 500w", "urbano"],
    ["Monopatín Eléctrico Urbano 799w", "urbano"],
    ["Monopatín Eléctrico Urbano 800w", "alto-rendimiento"],
    ["Monopatín Eléctrico Urbano 999w", "alto-rendimiento"],
    ["Monopatín Eléctrico Urbano 1000w", "alto-rendimiento"],
  ] as const)("%s -> %s", (title, variantKey) => {
    const category = classify(title);
    expect(category?.key, title).toBe("monopatin-electrico");
    expect(variantFor(category!, title).key, title).toBe(variantKey);
  });
});

describe("clasificación completa: category + variant vía itemKey", () => {
  it("arma la misma clave que usaría el catálogo", () => {
    const category = classify("Bicicleta Eléctrica Plegable Rodado 20 Gyroor Eb033 Gris")!;
    const variant = variantFor(category, "Bicicleta Eléctrica Plegable Rodado 20 Gyroor Eb033 Gris");
    expect(itemKey(category.key, variant.key)).toBe("bicicleta-electrica:plegable");
  });
});

describe("una pieza que abre el título no es un vehículo", () => {
  // Los doce avisos que la primera corrida publicada (622 filas, 22/9/2026) colaba como
  // monopatines y bicicletas. No es cosmético: a $ 2.958 una pantalla LCD entra a la banda por
  // abajo y, con el directorio ordenado por menor precio, encabeza "las ofertas más baratas".
  const piezas = [
    "Pantalla Lcd Para Bicicleta Eléctrica 24v-48v A Prueba De Agua",
    "Pantalla Lcd Para Bicicletas Eléctricas, 318/222 Cm, 24-60v",
    "Palanca De Freno Para E-bike, Izquierda, Plástico Negro Popular",
    "Panel Lcd Para Bicicleta Eléctrica, Odómetro Inalámbrico",
    "Pantalla Lcd Bicicleta Eléctrica 24v-60v E-bike Tamaño 318x22",
    "Faro Led Para Ebike Con Bocina Integrada Y 4 Luces, Resistente",
    "Sprocket Trasero De Acero Para E-bike Y Scooter, 92t 25h",
    "Bolsa Frontal Universal Para Bicicleta Eléctrica Sur Ron - Negra",
    "Llantas Y Cámaras Para E-bike Y Bicicletas Eléctricas Black",
    "Juego De 2 Bielas Praxis E-bike 172,5 Mm. Excelente Estado",
    "Kit bicicleta electrica 1000watts",
    "Kit Bicicleta Eléctrica Lionel Ebikes 1000w 48v Completo",
  ];
  it.each(piezas)("%s -> rechazado", (title) => {
    expect(classify(title)).toBeNull();
  });

  // La regla es estricta A PROPÓSITO: la pieza tiene que ABRIR el título, igual que `IS_A_PART` en
  // autos. Medido sobre los mismos 622 avisos, la variante "abre un segmento" (después de `-`, `|`
  // o `,`) marcaba 10 avisos más y 9 eran vehículos reales. Estos son esos vehículos: si alguno
  // empieza a dar null, alguien aflojó el ancla y se está borrando oferta real.
  const vehiculosQueNombranUnaPieza = [
    ["Monopatín Eléctrico Plegable 250w | Motor Potente | 25 Km/h", "monopatin-electrico"],
    ["Monopatín Eléctrico Knex Urban | Motor 800w | 48v*10.4ah", "monopatin-electrico"],
    ["Segway Ninebot F25 Patinete Eléctrico, Motor Potente De 30", "monopatin-electrico"],
    ["Monopatin Eléctrico Joyor S5 600w Potencia C/pantalla", "monopatin-electrico"],
    ["Bicicleta Eléctrica Rodado 26 Nakto 250w 32km/h C/ Canasto", "bicicleta-electrica"],
    ["Swagtron Eb-6 Bandit E-bike - Motor De 350 W, Asistencia De", "bicicleta-electrica"],
  ] as const;
  it.each(vehiculosQueNombranUnaPieza)("%s sigue siendo %s", (title, key) => {
    expect(classify(title)?.key, title).toBe(key);
  });
});
