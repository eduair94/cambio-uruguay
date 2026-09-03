// Las dos piezas gratis de la cosecha: de dónde salen las semillas y qué se considera "nuestro".
// Ninguna de las dos sale a la red, y son las que deciden el 100 % de lo que llega a costar plata.
import { describe, expect, it } from "vitest";
import { QUESTION_PREFIXES, buildSeeds } from "../../classes/demand/harvest";
import { isUruguayan } from "../../classes/demand/classify";
import { topicFor } from "../../classes/demand/refresh";
import { SITE_TOPICS } from "../../classes/gaps/topics";

describe("buildSeeds", () => {
  const topics = [{ key: "trabajo", scope: "aguinaldo, licencia, BPS" }];

  it("cruza cada prefijo con cada palabra de la temática", () => {
    const seeds = buildSeeds(topics);
    expect(seeds).toContain("cuanto aguinaldo");
    expect(seeds).toContain("me corresponde licencia");
  });

  it("pide también la palabra sola y la palabra + uruguay", () => {
    // Las tres formas traen cosas distintas y se midieron: la palabra sola es la que más devuelve,
    // la que lleva "uruguay" devuelve poco pero siempre local.
    const seeds = buildSeeds(topics);
    expect(seeds).toContain("aguinaldo");
    expect(seeds).toContain("aguinaldo uruguay");
    expect(seeds).toHaveLength(2 * (2 + QUESTION_PREFIXES.length));
  });

  it("descarta las siglas cortas, que traen sugerencias de cualquier cosa", () => {
    // "bps" sin contexto autocompleta a presión arterial y a puntos básicos.
    expect(buildSeeds(topics).some((s) => s.endsWith(" bps"))).toBe(false);
  });

  it("no repite una semilla que dos temáticas comparten", () => {
    const seeds = buildSeeds([
      { key: "a", scope: "aguinaldo" },
      { key: "b", scope: "aguinaldo" },
    ]);
    expect(seeds).toHaveLength(new Set(seeds).size);
  });

  it("acota cuántas palabras aporta cada temática, para que la cosecha no explote", () => {
    const wide = [{ key: "x", scope: "uno1, dos2, tres3, cuatro4, cinco5, seis66" }];
    expect(buildSeeds(wide, 2)).toHaveLength(2 * (2 + QUESTION_PREFIXES.length));
  });

  it("las temáticas reales del sitio producen semillas y ninguna queda vacía", () => {
    const seeds = buildSeeds(SITE_TOPICS);
    expect(seeds.length).toBeGreaterThan(100);
    expect(seeds.every((s) => s.trim().length > 3)).toBe(true);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});

describe("topicFor", () => {
  it("reconoce una consulta de una temática del sitio", () => {
    expect(topicFor("cuantos dias de licencia por paternidad uruguay")).toBe("trabajo");
  });

  it("devuelve null para lo que no es nuestro, que es el filtro que ahorra el SERP", () => {
    expect(topicFor("cuanto dura un partido de futbol")).toBeNull();
  });

  it("no confunde una palabra contenida en otra", () => {
    // "aguinaldo" no está adentro de "aguinaldos" como palabra suelta al medio de la frase.
    expect(topicFor("cuanto pesa un aguinaldito")).toBeNull();
  });

  it("acepta la palabra al principio y al final de la consulta", () => {
    expect(topicFor("licencia por duelo cuantos dias")).toBe("trabajo");
    expect(topicFor("cuantos dias son de licencia")).toBe("trabajo");
  });

  it("cuando dos temáticas comparten la palabra, elige siempre la misma", () => {
    // "aguinaldo" está en el scope de `impuestos` y en el de `trabajo`. Cualquiera de las dos es
    // una respuesta buena; lo que importa es que no cambie entre corridas, porque el tema viaja en
    // la cola y una cola que se reordena sola no se puede leer.
    expect(topicFor("cuando se cobra el aguinaldo")).toBe(topicFor("aguinaldo cuando se cobra"));
  });
});

describe("isUruguayan", () => {
  // Los cuatro primeros casos son sugerencias REALES de la primera cosecha, que volvió 99 de 102
  // "dentro de las temáticas" y casi ninguna de este país.
  it("descarta la demanda de otros mercados de habla hispana", () => {
    expect(isUruguayan("puedo cambiar dólares en coppel")).toBe(false);
    expect(isUruguayan("cuanto dólar bcv")).toBe(false);
    expect(isUruguayan("cuántos días quetzales en dólares")).toBe(false);
    expect(isUruguayan("que pasa si europa sale de la otan")).toBe(false);
  });

  it("acepta la marca explícita del país y sus formas", () => {
    expect(isUruguayan("licencia por duelo uruguay")).toBe(true);
    expect(isUruguayan("sueldo mínimo uruguayo 2026")).toBe(true);
    expect(isUruguayan("alquileres en montevideo")).toBe(true);
  });

  it("acepta lo que sólo existe acá, aunque no diga uruguay", () => {
    expect(isUruguayan("cuanto cobra el bps")).toBe(true);
    expect(isUruguayan("como salir del clearing")).toBe(true);
    expect(isUruguayan("factura monotributo")).toBe(true);
  });

  it("no confunde una marca metida adentro de otra palabra", () => {
    // "ute" adentro de "minute", "ose" adentro de "manguera": el filtro va por palabra entera.
    expect(isUruguayan("last minute vuelos")).toBe(false);
    expect(isUruguayan("como se dice rose en español")).toBe(false);
  });

  it("no toma por marca a un departamento que también es palabra común", () => {
    // Salto, Colonia, Florida, Rivera y Durazno están afuera de la lista a propósito.
    expect(isUruguayan("salto de linea en excel")).toBe(false);
    expect(isUruguayan("colonia perfume hombre")).toBe(false);
  });
});
