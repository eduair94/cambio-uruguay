// Identidad de una moto: cilindrada, tipo y qué se excluye.
//
// Todos los títulos de este archivo son REALES: salen de la muestra de 164 tarjetas de MLU1763
// leída por el puente el 2026-09-22 (5 páginas del listado general más las facetas de cuatriciclo,
// triciclo, motocarro y eléctrico completas). Un test de identidad escrito con títulos inventados
// sólo prueba que la expresión hace lo que la expresión dice.
import { describe, expect, it } from "vitest";
import {
  MOTO_DISPLACEMENT_FACETS,
  MOTO_EXCLUDED_TYPES,
  MOTO_TYPES,
  displacementBandOf,
  displacementOf,
  motoProductKey,
  motoRejection,
  motoTypeFromTitle,
  resolveDisplacementBand,
} from "../../classes/motos/identify";

describe("cilindrada del título", () => {
  it("la lee cuando el aviso escribe la unidad, en cualquiera de sus formas", () => {
    expect(displacementOf("Kawasaki Vn1700  Vaquero 1700 Cc. 2023  Aerocar")).toBe(1700);
    expect(displacementOf("Kawasaki Ninja Zx14r 1440 Cc. 2025 Impecable! Aerocar")).toBe(1440);
    expect(displacementOf("Motomel Strato 125cc")).toBe(125);
    expect(displacementOf("Honda Pcx 150 Cc")).toBe(150);
    expect(displacementOf("Naked Er6n 650cc")).toBe(650);
    expect(displacementOf("Moto Zanela Due 50 Cc")).toBe(50);
    expect(displacementOf("Winner Force Ll 125cc 4 Tiempos")).toBe(125);
    expect(displacementOf("Yamaha Fz 150 c.c. impecable")).toBe(150);
  });

  it("no inventa una cilindrada con un número suelto del nombre del modelo", () => {
    // Los dos casos que más se repiten en la muestra: la cilindrada vive en el NOMBRE y no en un
    // campo. Leerla de ahí haría pasar por medición una coincidencia de nombre.
    expect(displacementOf("Kawasaki Z900 Z 900 Zr 900")).toBeNull();
    expect(displacementOf("Moto Motocicleta Benda Dark Flag 500 - 0km 100% Financiada")).toBeNull();
    expect(displacementOf("Yamaha Mt 07")).toBeNull();
    expect(displacementOf("Moto Eléctrica Max 350 48v 12ah 0km")).toBeNull();
  });

  it("toma el número que lleva la unidad aunque el modelo nombre otro", () => {
    // La F650GS de dos cilindros tiene motor de 800 cc, y es lo único que el aviso declara con unidad.
    expect(displacementOf("Bmw F 650 Gs Motor 800 Cc")).toBe(800);
  });

  it("se abstiene cuando el título declara DOS cilindradas distintas", () => {
    expect(displacementOf("Yamaha Ybr 125 Cc Con Escape De 250 Cc")).toBeNull();
  });

  it("descarta un número con unidad que no puede ser una cilindrada de moto", () => {
    expect(displacementOf("Motor marino 5000 cc")).toBeNull();
    expect(displacementOf("Bomba de 10 cc")).toBeNull();
  });
});

describe("tramo de cilindrada", () => {
  it("lo deriva de una cilindrada exacta ya leída", () => {
    expect(displacementBandOf(110)).toBe("hasta-125");
    expect(displacementBandOf(125)).toBe("hasta-125");
    expect(displacementBandOf(126)).toBe("126-250");
    expect(displacementBandOf(250)).toBe("126-250");
    expect(displacementBandOf(251)).toBe("mas-250");
    expect(displacementBandOf(null)).toBeNull();
  });

  it("un solo tramo de la faceta manda", () => {
    expect(resolveDisplacementBand(["(*-125cc]"])).toBe("hasta-125");
    expect(resolveDisplacementBand(["[250cc-*)"])).toBe("mas-250");
  });

  it("dos tramos ADYACENTES son el borde, y gana el de abajo", () => {
    // Los tramos de ML se solapan: una moto de 125 cc está en "125 cc o menos" y en "125 a 250 cc".
    expect(resolveDisplacementBand(["(*-125cc]", "[125cc-250cc]"])).toBe("hasta-125");
    expect(resolveDisplacementBand(["[125cc-250cc]", "[250cc-*)"])).toBe("126-250");
  });

  it("cualquier otra combinación no decide nada", () => {
    expect(resolveDisplacementBand([])).toBeNull();
    expect(resolveDisplacementBand(["(*-125cc]", "[250cc-*)"])).toBeNull();
    expect(resolveDisplacementBand(["(*-125cc]", "[125cc-250cc]", "[250cc-*)"])).toBeNull();
    expect(resolveDisplacementBand(["inventado"])).toBeNull();
  });

  it("los tres tramos son los que publica la faceta, y los volúmenes medidos suman más que el total", () => {
    expect(MOTO_DISPLACEMENT_FACETS.map(facet => facet.band)).toEqual(["hasta-125", "126-250", "mas-250"]);
    // 434 + 568 + 634 = 1.636 contra 1.391 avisos: el solapamiento de los bordes, medido.
    const suma = MOTO_DISPLACEMENT_FACETS.reduce((total, facet) => total + facet.adverts, 0);
    expect(suma).toBeGreaterThan(1_391);
  });
});

describe("qué NO entra al directorio", () => {
  it("una pieza que ABRE el título es un repuesto", () => {
    expect(motoRejection("Casco Ls2 Talle M Como Nuevo")).toBe("pieza");
    expect(motoRejection("Cubiertas Pirelli 110/70 Para Moto")).toBe("pieza");
    expect(motoRejection("Kit De Arrastre Yumbo Gs 200")).toBe("pieza");
  });

  it("pero la misma palabra adentro del título es equipamiento, no el objeto en venta", () => {
    expect(motoRejection("Honda Xre 300 Con Baul Y Cubiertas Nuevas")).toBeNull();
    expect(motoRejection("Kawasaki Ninja 650 Con Escape Akrapovic")).toBeNull();
  });

  it("no descarta una moto entera cuyo vendedor empieza hablando del motor", () => {
    // Título real de la muestra (US$ 2.600, 2009): es la moto, no el motor. Misma decisión que autos.
    expect(motoRejection("Motor Original, Carburadores Originales. Al Dia. No Permuto")).toBeNull();
  });

  it("un monopatín o una bicicleta eléctrica son otro directorio", () => {
    expect(motoRejection("Monopatin Xiaomi Lite 4 Gen 2 Impecable Estado")).toBe("otro-vehiculo");
    expect(motoRejection("Monopatín Eléctrico 4 Meses De Uso")).toBe("otro-vehiculo");
    expect(motoRejection("Bicicleta Electrica Wheele")).toBe("otro-vehiculo");
    expect(motoRejection("Moto/bici Eléctrica Michael Blast Outsider 5.0")).toBe("otro-vehiculo");
  });

  it("un cuatriciclo o un triciclo que se nombra queda afuera por el título", () => {
    expect(motoRejection("Cuatriciclo Winner 150 Cc")).toBe("no-es-moto");
    expect(motoRejection("Atv 110 Rocket")).toBe("no-es-moto");
    expect(motoRejection("Triciclo Titan Casi Nuevo. Vendo Por No Usar.")).toBe("no-es-moto");
  });

  it("un alquiler publica un precio por mes, no un precio de venta", () => {
    expect(motoRejection("Alquiler De Motos Para Delivery")).toBe("alquiler");
    expect(motoRejection("Alquilo Moto Yumbo Para Pedidos Ya")).toBe("alquiler");
  });

  it("una venta financiada NO es un alquiler aunque hable de cuotas mensuales", () => {
    expect(motoRejection("Kawasaki Zx6 R Ninja Abs 2019 Hermosa!! Hasta 60 Cuotas")).toBeNull();
    expect(motoRejection("Husqvarna 701 Enduro Modelo 2023 100 % Financiada 60 Cuotas")).toBeNull();
  });

  it("una moto 0 km publicada entre las usadas se va, y lo dice el propio vendedor", () => {
    expect(motoRejection("Moto Motocicleta Benda Dark Flag 500 - 0km 100% Financiada")).toBe("cero-km");
    expect(motoRejection("Zanella Zt 0 Km, 100% Financiada Tomamos Su Moto Usada")).toBe("cero-km");
    expect(motoRejection("Scooter Eléctrica Ares 48v .450w 0km")).toBe("cero-km");
  });

  it("un kilometraje que no está en el título nunca vale como declaración de 0 km", () => {
    // Las tres vienen con `km: 1` en la tarjeta y son motos viejas de verdad: el 1 es "no declaré".
    expect(motoRejection("Vespa 125")).toBeNull();
    expect(motoRejection("Honda  50, C-70")).toBeNull();
    expect(motoRejection("Kawasaki Wind 125")).toBeNull();
    // Y un kilometraje real de cuatro cifras que termina en 0 km no se lee como "0 km".
    expect(motoRejection("Yumbo Furia 200 Con 14000km Pronta Para Tranferir")).toBeNull();
    expect(motoRejection("Cfmoto 300sr 300 Cc. 2024 Buen Estado 10.000km")).toBeNull();
  });

  it("una moto corriente entra", () => {
    expect(motoRejection("Kawasaki Vn1700  Vaquero 1700 Cc. 2023  Aerocar")).toBeNull();
    expect(motoRejection("Yumbo Sk 125 Con 9000km En Exelente Estado!!!!")).toBeNull();
    expect(motoRejection("Honda Wave 110 S Cómo Nueva")).toBeNull();
  });
});

describe("tipo de moto", () => {
  it("lo lee del título cuando una sola palabra lo nombra", () => {
    expect(motoTypeFromTitle("Naked Er6n 650cc")).toBe("naked");
    expect(motoTypeFromTitle("Moto Scooter Zanella Inmaculada 2023")).toBe("scooter");
    expect(motoTypeFromTitle("Ktm 390 Adventure R 2025 Doble Proposito Usada Impecableeeee")).toBe("doble-proposito");
  });

  it("se abstiene cuando el título nombra dos tipos", () => {
    // Título real: "Enduro" y "Motocross" en la misma línea no deciden nada, y la evidencia de
    // título es la más débil de las dos que hay.
    expect(motoTypeFromTitle("Sherco Sef 300 My 2026 4 Tiempos Moto Enduro Motocross Usada")).toBeNull();
  });

  it("no inventa un tipo cuando el título no lo nombra", () => {
    expect(motoTypeFromTitle("Yamaha Mt 07")).toBeNull();
  });

  it("la taxonomía publicada es la de Mercado Libre, sin los tres tipos que no son motos", () => {
    const ids = new Set(MOTO_TYPES.map(entry => entry.id));
    for (const excluded of MOTO_EXCLUDED_TYPES) expect(ids.has(excluded.id)).toBe(false);
    expect(MOTO_TYPES.length + MOTO_EXCLUDED_TYPES.length).toBe(16);
  });
});

describe("identidad de producto", () => {
  it("es marca|modelo|cilindrada", () => {
    expect(motoProductKey("Yumbo", "GS 200", 200)).toBe("yumbo|gs-200|200");
  });

  it("una moto sin cilindrada declarada nunca comparte identidad con una que sí la declara", () => {
    expect(motoProductKey("Yumbo", "GS 200", null)).toBe("yumbo|gs-200|sincc");
    expect(motoProductKey("Yumbo", "GS 200", null)).not.toBe(motoProductKey("Yumbo", "GS 200", 200));
  });
});
