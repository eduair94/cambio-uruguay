// El libro de cambios. El test que importa es el de la normalización: sobre un sitio que crece
// solo, un antes/después crudo declara ganador a cualquier cosa, incluido no tocar nada.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import type { GscDay } from "../../classes/gsc/types";
import {
  EXPERIMENT_WINDOW_DAYS,
  measureExperiment,
  parseSpecs,
  pathOf,
  routeMatches,
  sumWindow,
} from "../../classes/revenueplan/experiments";
import type { ExperimentSpec } from "../../classes/revenueplan/types";

const site = "https://cambio-uruguay.com";
const shift = (day: string, delta: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);

/**
 * Archivo sintético: `subject` clics por día en la página dada, `total` clics del sitio por día.
 * Los dos se declaran aparte justamente para poder mover uno sin el otro.
 */
function archive(from: string, days: number, page: string, subject: (i: number) => number, total: (i: number) => number): GscDay[] {
  return Array.from({ length: days }, (_, i) => ({
    day: shift(from, i),
    totals: { clicks: total(i), impressions: total(i) * 100, ctr: 0.01, position: 8 },
    queries: [{ key: "una consulta", clicks: subject(i), impressions: subject(i) * 100, ctr: 0.01, position: 6 }],
    pages: [{ key: `${site}${page}`, clicks: subject(i), impressions: subject(i) * 100, ctr: 0.01, position: 6 }],
    countries: [],
    devices: [],
    queryRowsSeen: 1,
    pageRowsSeen: 1,
  }));
}

describe("rutas", () => {
  it("una ruta exacta no se lleva a sus hijas", () => {
    expect(routeMatches(["/historico/bcu"], `${site}/historico/bcu`)).toBe(true);
    expect(routeMatches(["/historico/bcu"], `${site}/historico/bcu/usd`)).toBe(false);
  });

  it("una ruta con barra o asterisco toma la familia entera", () => {
    expect(routeMatches(["/casa/*"], `${site}/casa/brou/horarios`)).toBe(true);
    expect(routeMatches(["/indicadores/"], `${site}/indicadores/unidad-reajustable`)).toBe(true);
    expect(routeMatches(["/indicadores/"], `${site}/indicadores`)).toBe(true);
  });

  it("el path ignora host, query y barra final", () => {
    expect(pathOf(`${site}/guias/x/?utm=1`)).toBe("/guias/x");
    expect(pathOf(`${site}/`)).toBe("/");
  });
});

describe("medición", () => {
  const shippedOn = "2026-06-01";
  const spec: ExperimentSpec = {
    id: "x",
    shippedOn,
    routes: ["/guias/x"],
    hypothesis: "",
  };
  const from = shift(shippedOn, -EXPERIMENT_WINDOW_DAYS);
  const today = shift(shippedOn, EXPERIMENT_WINDOW_DAYS + 3);

  it("una página que creció EXACTAMENTE como el sitio no mejoró", () => {
    // El sitio duplica clics a mitad de ventana y la página también. Un antes/después crudo diría
    // "+100 %". La porción no se movió, así que el veredicto correcto es "sin cambio".
    const days = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/guias/x", (i) => (i > EXPERIMENT_WINDOW_DAYS ? 2 : 1), (i) =>
      i > EXPERIMENT_WINDOW_DAYS ? 200 : 100
    );
    const result = measureExperiment(spec, days, today);
    expect(result.after.clicks).toBeGreaterThan(result.before.clicks);
    expect(result.relativeLift).toBeCloseTo(1, 2);
    expect(result.verdict).toBe("sin cambio");
  });

  it("una página que creció MÁS que el sitio mejoró", () => {
    const days = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/guias/x", (i) => (i > EXPERIMENT_WINDOW_DAYS ? 4 : 1), () => 100);
    const result = measureExperiment(spec, days, today);
    expect(result.verdict).toBe("mejoró");
    expect(result.relativeLift).toBeCloseTo(4, 1);
  });

  it("una página que se quedó quieta mientras el sitio subía empeoró", () => {
    const days = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/guias/x", () => 1, (i) =>
      i > EXPERIMENT_WINDOW_DAYS ? 300 : 100
    );
    const result = measureExperiment(spec, days, today);
    expect(result.verdict).toBe("empeoró");
  });

  it("no dictamina hasta que el ARCHIVO tenga los 28 días, no el calendario", () => {
    // Search Console cierra cada día con ~3 de atraso: "ya pasaron 28 días" y "ya hay 28 días
    // medidos" no son lo mismo, y confundirlos dictamina con media ventana.
    const days = archive(from, EXPERIMENT_WINDOW_DAYS + 15, "/guias/x", () => 2, () => 100);
    const result = measureExperiment(spec, days, today);
    expect(result.verdict).toBe("esperando");
    expect(result.daysMissing).toBeGreaterThan(0);
  });

  it("una página que no existía se mide contra cero, no con un cociente imposible", () => {
    const days = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/guias/otra", (i) => (i > EXPERIMENT_WINDOW_DAYS ? 3 : 0), () => 100);
    const result = measureExperiment({ ...spec, routes: ["/guias/otra"] }, days, today);
    expect(result.before.clicks).toBe(0);
    expect(result.verdict).toBe("mejoró");
    expect(result.note).toMatch(/no existía antes del cambio/);
  });

  it("sin ventana anterior en el archivo dice que no sabe, en vez de inventar un veredicto", () => {
    const days = archive(shift(shippedOn, -2), EXPERIMENT_WINDOW_DAYS + 5, "/guias/x", () => 2, () => 100);
    expect(measureExperiment(spec, days, today).verdict).toBe("sin datos");
  });

  it("un hueco en el archivo se cae del numerador y del denominador a la vez", () => {
    const full = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/guias/x", () => 2, () => 100);
    const holed = full.filter((_, i) => i % 5 !== 0);
    const a = measureExperiment(spec, full, today);
    const b = measureExperiment(spec, holed, today);
    expect(b.relativeLift).toBeCloseTo(a.relativeLift!, 3);
  });

  it("mide por consulta cuando el cambio apuntaba a consultas", () => {
    const days = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/otra", (i) => (i > EXPERIMENT_WINDOW_DAYS ? 5 : 1), () => 100);
    const result = measureExperiment({ id: "q", shippedOn, routes: [], queries: ["Una Consulta"], hypothesis: "" }, days, today);
    expect(result.verdict).toBe("mejoró");
  });

  it("el día del despliegue no entra en ninguna de las dos ventanas", () => {
    // Media jornada con el cambio y media sin él no pertenece a ninguna punta.
    const days = archive(from, EXPERIMENT_WINDOW_DAYS * 2 + 1, "/guias/x", () => 1, () => 100);
    const result = measureExperiment(spec, days, today);
    expect(result.before.days + result.after.days).toBe(EXPERIMENT_WINDOW_DAYS * 2);
    expect(sumWindow(days, spec, shippedOn, shippedOn).clicks).toBe(1);
  });
});

describe("el archivo declarado", () => {
  it("rechaza filas rotas sin tumbar el job", () => {
    const { specs, problems } = parseSpecs({
      experiments: [
        { id: "ok", shippedOn: "2026-09-16", routes: ["/x"] },
        { id: "sin-fecha", routes: ["/x"] },
        { id: "sin-sujeto", shippedOn: "2026-09-16" },
        { shippedOn: "2026-09-16", routes: ["/x"] },
      ],
    });
    expect(specs.map((s) => s.id)).toEqual(["ok"]);
    expect(problems).toHaveLength(3);
  });

  it("el archivo que se despliega parsea entero", () => {
    // Un JSON roto desactiva el ledger en silencio: el job sigue corriendo y deja de medir todo.
    const file = path.join(__dirname, "..", "..", "docs", "seo", "experiments.json");
    const { specs, problems } = parseSpecs(JSON.parse(fs.readFileSync(file, "utf8")));
    expect(problems).toEqual([]);
    expect(specs.length).toBeGreaterThan(0);
    for (const spec of specs) {
      expect(spec.hypothesis.length).toBeGreaterThan(10);
    }
  });
});
