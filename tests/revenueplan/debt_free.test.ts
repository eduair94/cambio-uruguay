import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  DebtRoute,
  RESERVE_DAYS,
  parseNumber,
  parseStringList,
  reserveOf,
  reserveReport,
} from "../../classes/revenueplan/debtFree";
import { EXPERIMENT_WINDOW_DAYS } from "../../classes/revenueplan/experiments";
import type { ExperimentSpec } from "../../classes/revenueplan/types";

/**
 * El informe de deuda libre, y los dos modos que tiene de mentir.
 *
 * Uno es la ARITMÉTICA: el límite está en 29 días y no en 28, porque el test de solape marca un par
 * con `|Δfecha| ≤ 28`. Si esta reserva se quedara en 28, el informe declararía libre una ruta el
 * mismo día en que una fila nueva sobre ella pone CI en rojo — un error de un día, en el único día
 * en que importa.
 *
 * El otro es el LECTOR de las listas del app, que falla hacia el silencio: un `const` renombrado
 * devuelve `[]`, y «no hay deuda» se lee igual que «no hay nada que hacer», que es justamente la
 * conclusión que este informe existe para no inventar. Por eso tira excepción y por eso se lee acá
 * contra los archivos de verdad.
 */
const fila = (id: string, shippedOn: string, routes: string[]): ExperimentSpec => ({
  id,
  shippedOn,
  routes,
  hypothesis: "",
});

describe("la reserva mide los mismos días que el test de solape", () => {
  it("son 29: uno más que la ventana que mide el libro", () => {
    expect(RESERVE_DAYS).toBe(EXPERIMENT_WINDOW_DAYS + 1);
  });

  it("al día 28 la ruta sigue reservada, porque una fila nueva ahí se pisa con la vieja", () => {
    const estado = reserveOf("/x", [fila("a", "2026-01-01", ["/x"])], "2026-01-29");
    expect(estado.free).toBe(false);
    expect(estado.freeOn).toBe("2026-01-30");
    expect(estado.blockedBy).toEqual(["a"]);
  });

  it("al día 29 queda libre", () => {
    const estado = reserveOf("/x", [fila("a", "2026-01-01", ["/x"])], "2026-01-30");
    expect(estado.free).toBe(true);
    expect(estado.blockedBy).toEqual([]);
  });

  it("una ruta sin ninguna fila está libre hoy", () => {
    const estado = reserveOf("/x", [fila("a", "2026-01-01", ["/y"])], "2026-01-02");
    expect(estado).toEqual({ route: "/x", freeOn: "2026-01-02", free: true, blockedBy: [] });
  });

  it("con dos filas abiertas manda la más nueva, no la primera que aparece", () => {
    const specs = [fila("vieja", "2026-01-01", ["/x"]), fila("nueva", "2026-01-20", ["/x"])];
    const estado = reserveOf("/x", specs, "2026-01-25");
    expect(estado.freeOn).toBe("2026-02-18");
    expect(estado.blockedBy).toEqual(["nueva", "vieja"]);
  });

  // Una fila cuya reserva ya venció no bloquea nada y no tiene que figurar como si lo hiciera: el
  // informe nombra al que reserva para que se pueda ir a leer ESA fila, y una vencida ahí mandaría
  // a mirar un experimento que ya cerró.
  it("una fila que ya cumplió sus 29 días se cae de la reserva", () => {
    const specs = [fila("vieja", "2026-01-01", ["/x"]), fila("nueva", "2026-01-20", ["/x"])];
    const estado = reserveOf("/x", specs, "2026-01-30");
    expect(estado.freeOn).toBe("2026-02-18");
    expect(estado.blockedBy).toEqual(["nueva"]);
  });

  // El matcher es el del job, así que una familia declarada reserva las páginas de abajo. Sin esto
  // una fila sobre `/guias/` dejaría "libres" las 146 guías que está midiendo.
  it("una familia declarada reserva una página de abajo", () => {
    expect(reserveOf("/guias/propinas-en-uruguay", [fila("a", "2026-01-01", ["/guias/"])], "2026-01-10").free).toBe(
      false
    );
    expect(reserveOf("/guias/propinas-en-uruguay", [fila("a", "2026-01-01", ["/guias/*"])], "2026-01-10").free).toBe(
      false
    );
  });

  it("ordena por fecha de liberación y es determinista", () => {
    const items: DebtRoute[] = [
      { pool: "b", route: "/tarde" },
      { pool: "a", route: "/pronto" },
      { pool: "a", route: "/libre" },
    ];
    const specs = [fila("t", "2026-01-20", ["/tarde"]), fila("p", "2026-01-02", ["/pronto"])];
    const report = reserveReport(items, specs, "2026-01-25");
    expect(report.map((row) => row.route)).toEqual(["/libre", "/pronto", "/tarde"]);
    expect(report.map((row) => row.free)).toEqual([true, false, false]);
  });
});

describe("el lector de las listas del app no puede fallar en silencio", () => {
  const APP_TESTS = path.resolve(__dirname, "..", "..", "app", "tests", "unit");
  const read = (file: string) => fs.readFileSync(path.join(APP_TESTS, file), "utf8");

  it("tira excepción si el `const` no está, en vez de devolver una lista vacía", () => {
    expect(() => parseStringList("const OTRA = ['/x']\n]\n", "DEUDA_SIN_ENLACE")).toThrow(/renombraron/);
    expect(() => parseNumber("const OTRA = 3", "DEUDA_MAXIMA")).toThrow(/renombraron/);
  });

  it("tira excepción si la lista existe pero no reconoce su forma", () => {
    expect(() => parseStringList(['const VACIA = [', '  // sólo un comentario', ']'].join("\n"), "VACIA")).toThrow(
      /vacía/
    );
  });

  it("lee las cadenas y descarta los comentarios de alrededor", () => {
    const source = ["const L = [", "  // un comentario con 'comillas'", "  '/uno',", "  '/dos',", "]"].join("\n");
    expect(parseStringList(source, "L")).toEqual(["/uno", "/dos"]);
  });

  // La prueba que importa: las CINCO listas de verdad, como las declara el app hoy. Si alguien
  // renombra un `const` o le cambia la forma, esto se pone rojo y el informe no miente.
  //
  // Las tres últimas entraron el 2026-10-20, cuando `seoContract.test.ts` y
  // `guideSnippetBudget.test.ts` pasaron de declarar sólo un número a declarar también sus
  // miembros. Son los dos pozos que el encabezado de `seo_debt_report.ts` daba por no cubiertos, y
  // el motivo de cubrirlos es el de siempre: la respuesta a «¿cuál puedo tocar hoy?» vivía en prosa
  // dentro del comentario de cada presupuesto, con la fecha de liberación escrita a mano.
  it.each([
    ["temaHuerfanas.test.ts", "DEUDA_SIN_TEMA", "DEUDA_MAXIMA", "/"],
    ["temaHuerfanas.test.ts", "GUIAS_SIN_TEMA", "DEUDA_MAXIMA_GUIAS", ""],
    ["enlacesDeContexto.test.ts", "DEUDA_SIN_ENLACE", "DEUDA_MAXIMA", "/"],
    ["seoContract.test.ts", "DEUDA_SIN_MIGAS", "BREADCRUMB_BUDGET", "/"],
    ["guideSnippetBudget.test.ts", "DEUDA_TITULO_LARGO", "TITLE_OVER_BUDGET", ""],
    ["guideSnippetBudget.test.ts", "DEUDA_DESCRIPCION_LARGA", "DESCRIPTION_OVER_BUDGET", ""],
  ])("lee %s → %s y cabe en su propio trinquete", (file, list, budget, prefix) => {
    const source = read(file);
    const declared = parseStringList(source, list);
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.length).toBeLessThanOrEqual(parseNumber(source, budget));
    for (const value of declared) {
      expect(value.startsWith("/"), value).toBe(prefix === "/");
      expect(value.trim(), value).toBe(value);
    }
    expect([...new Set(declared)]).toHaveLength(declared.length);
  });
});
