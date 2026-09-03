// Los casos son consultas REALES de la cosecha del 2026-09-03 contra la página que el recuperador
// eligió para cada una, porque el error que este módulo arregla sólo se veía con datos reales: el
// puntaje del recuperador daba 0,02 tanto para la consulta que el sitio cubre con su página
// central como para la que no cubre con nada.
import { describe, expect, it } from "vitest";
import { coverageOf, words } from "../../classes/demand/coverage";

describe("coverageOf", () => {
  it("da alto cuando la página del sitio ES la respuesta", () => {
    const c = coverageOf("casas de cambio uruguay", {
      path: "/casas-de-cambio",
      title: "Casas de cambio en Uruguay: comparativa de 46 casas",
    });
    expect(c).toBe(1);
  });

  it("da cero cuando el recuperador devolvió lo más parecido y no se parece en nada", () => {
    const c = coverageOf("cómo saber si me corresponde canasta bps", {
      path: "/guias/trabajar-para-el-exterior-desde-uruguay",
      title: "Trabajar para el exterior desde Uruguay",
    });
    expect(c).toBe(0);
  });

  it("empareja singular con plural, que es como vuelve el autocompletado", () => {
    // La página se llama "horas-extra" y la gente escribe "horas extras".
    const c = coverageOf("horas extras uruguay", {
      path: "/guias/horas-extra-en-uruguay",
      title: "Horas extra en Uruguay",
    });
    expect(c).toBe(1);
  });

  it("no cuenta la marca de país, que está en casi todos los títulos", () => {
    // Si "uruguay" contara, cualquier consulta parecería medio cubierta por cualquier página.
    expect(
      coverageOf("patente uruguay", { path: "/aguinaldo-uruguay", title: "Aguinaldo en Uruguay" })
    ).toBe(0);
  });

  it("da parcial cuando la página cubre parte del tema", () => {
    const c = coverageOf("licencia por duelo", {
      path: "/licencias-especiales-uruguay",
      title: "Licencias especiales en Uruguay",
    });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });

  it("sin página, la cobertura es cero y no explota", () => {
    expect(coverageOf("cualquier cosa", null)).toBe(0);
  });

  it("una consulta que es toda palabras vacías no inventa cobertura", () => {
    expect(coverageOf("como cuando donde", { path: "/x", title: "X" })).toBe(0);
  });

  it("ignora tildes en los dos lados", () => {
    expect(
      coverageOf("cotización del dólar", { path: "/cotizacion-dolar", title: "Cotizacion dolar" })
    ).toBe(1);
  });
});

describe("words", () => {
  it("saca palabras cortas, vacías y la marca de país", () => {
    expect(words("cuanto es el aguinaldo en uruguay")).toEqual(["aguinaldo"]);
  });

  it("parte la ruta como si fueran palabras", () => {
    expect(words("/guias/horas-extra-en-uruguay".replace(/[-_/]+/g, " "))).toEqual([
      "guias",
      "horas",
      "extra",
    ]);
  });
});
