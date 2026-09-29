import { describe, expect, it } from "vitest";
import {
  baseOf,
  buildFocus,
  FOCUS_PER_GROUP,
  isNewPage,
  isPico,
  median,
  signalsOf,
  trendOf,
} from "../../classes/site-analytics/pageRanking";
import type { PageRankRow } from "../../classes/site-analytics/pageRanking";

const noEntrances = { total: 0, organic: 0, direct: 0, social: 0, ai: 0, other: 0 };

/** Una fila con valores neutros; cada test pisa lo que le importa. */
function row(over: Partial<PageRankRow> = {}): PageRankRow {
  const weeks = over.weeks ?? [10, 10, 10, 10];
  const base = over.base ?? baseOf(weeks);
  const multiplier = over.multiplier ?? 1;
  return {
    path: "/x",
    title: "X",
    family: "/x",
    tier: "otro",
    multiplier,
    rank: 1,
    weeks,
    views: weeks.reduce((a, b) => a + b, 0),
    base,
    users: 10,
    engagementSeconds: 60,
    viewsAll: weeks.reduce((a, b) => a + b, 0),
    uyShare: 1,
    entrances: { ...noEntrances },
    engagedRate: 0.6,
    trend: trendOf(weeks),
    value: base * multiplier,
    signals: [],
    ...over,
  };
}

describe("primitivas del ranking", () => {
  it("median", () => {
    expect(median([])).toBe(0);
    expect(median([3])).toBe(3);
    expect(median([4, 1, 3])).toBe(3);
    expect(median([303, 210, 124, 27])).toBe(167);
  });

  it("baseOf: mediana desde la primera semana con vistas (casos medidos 29/9/2026)", () => {
    expect(baseOf([303, 210, 124, 27])).toBe(167); // /alquileres-uruguay
    expect(baseOf([0, 0, 154, 89])).toBe(121.5); // /autos-usados-uruguay, lanzada en la semana 3
    expect(baseOf([0, 0, 0, 12])).toBe(12);
    expect(baseOf([0, 0, 0, 0])).toBe(0);
    // Un cero en el medio sí cuenta: la página existía y nadie entró.
    expect(baseOf([8, 0, 0, 8])).toBe(4);
  });

  it("trendOf: segunda mitad contra primera, con muestra mínima", () => {
    expect(trendOf([303, 210, 124, 27])).toBeCloseTo(151 / 513 - 1, 4);
    expect(trendOf([0, 0, 154, 89])).toBeNull(); // sin primera mitad no hay tendencia: es nueva
    expect(trendOf([5, 4, 6, 3])).toBeNull(); // 9 y 9: ruido
    expect(trendOf([10, 10, 40, 40])).toBe(3);
  });

  it("isNewPage", () => {
    expect(isNewPage([0, 0, 154, 89])).toBe(true);
    expect(isNewPage([0, 0, 0, 12])).toBe(true);
    expect(isNewPage([0, 3, 154, 89])).toBe(false);
    expect(isNewPage([0, 0, 0, 0])).toBe(false);
  });

  it("isPico: una semana que triplica a las otras", () => {
    expect(isPico([192, 32, 34, 19])).toBe(true); // /oportunidades-inmobiliarias-uruguay
    expect(isPico([303, 210, 124, 27])).toBe(false); // cae de verdad, no es un pico
    expect(isPico([0, 33, 0, 0])).toBe(true); // una ficha que alguien compartió una vez
    expect(isPico([0, 0, 154, 89])).toBe(false); // lanzamiento que se sostiene
    expect(isPico([3, 2, 4, 5])).toBe(false);
    expect(isPico([0, 0, 0, 12])).toBe(false); // una sola semana activa no alcanza para decir pico
    expect(isPico([2, 2, 2, 15])).toBe(false); // bajo el piso de 20
  });
});

describe("signalsOf", () => {
  it("una caída sostenida en un directorio es 'cae'", () => {
    const r = row({ weeks: [303, 210, 124, 27], tier: "directorio", multiplier: 0.2, engagementSeconds: 479 });
    expect(signalsOf(r)).toEqual(["cae"]);
  });

  it("un pico no se lee como caída", () => {
    const s = signalsOf(row({ weeks: [192, 32, 34, 19] }));
    expect(s).toContain("pico");
    expect(s).not.toContain("cae");
  });

  it("una página que sólo existe en la última semana es nueva y nada más", () => {
    expect(signalsOf(row({ weeks: [0, 0, 0, 12], views: 12, viewsAll: 12 }))).toEqual(["nueva"]);
  });

  it("crece sólo sin pico y con primera mitad", () => {
    expect(signalsOf(row({ weeks: [10, 10, 40, 40] }))).toEqual(["crece"]);
  });

  it("rebota sólo en contenido u otro: en una cotización la visita corta es el éxito", () => {
    const quick = { weeks: [20, 20, 20, 20], engagementSeconds: 12 };
    expect(signalsOf(row({ ...quick, tier: "contenido" }))).toContain("rebota");
    expect(signalsOf(row({ ...quick, tier: "otro" }))).toContain("rebota");
    expect(signalsOf(row({ ...quick, tier: "dato-vivo" }))).not.toContain("rebota");
  });

  it("afuera: la mayoría de las vistas no son de Uruguay", () => {
    expect(signalsOf(row({ viewsAll: 100, views: 30, uyShare: 0.3 }))).toContain("afuera");
    expect(signalsOf(row({ viewsAll: 40, views: 10, uyShare: 0.25 }))).not.toContain("afuera");
  });

  it("ia: cinco entradas desde asistentes", () => {
    expect(signalsOf(row({ entrances: { ...noEntrances, total: 5, ai: 5 } }))).toContain("ia");
    expect(signalsOf(row({ entrances: { ...noEntrances, total: 4, ai: 4 } }))).not.toContain("ia");
  });
});

describe("buildFocus", () => {
  const weekStarts = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"];
  const withSignals = (r: PageRankRow): PageRankRow => ({ ...r, signals: signalsOf(r) });

  it("grupos en orden fijo y con las cifras en el texto", () => {
    const rows = [
      withSignals(row({ path: "/", title: "Inicio", weeks: [100, 100, 100, 100], tier: "dato-vivo" })),
      withSignals(row({ path: "/cae", title: "Cae", weeks: [300, 200, 120, 30], tier: "directorio", multiplier: 0.2 })),
      withSignals(row({ path: "/nueva", title: "Nueva", weeks: [0, 0, 150, 90] })),
      withSignals(row({ path: "/pico", title: "Pico", weeks: [190, 30, 30, 20] })),
    ];
    const focus = buildFocus(rows, weekStarts);
    const kinds = focus.map((f) => f.kind);
    // El orden de los grupos es el de la lectura, no el de las filas.
    expect(kinds.indexOf("sostienen")).toBeLessThan(kinds.indexOf("caen"));
    expect(kinds.indexOf("caen")).toBeLessThan(kinds.indexOf("suben"));
    expect(kinds.indexOf("suben")).toBeLessThan(kinds.indexOf("picos"));
    const cae = focus.find((f) => f.kind === "caen")!;
    expect(cae.path).toBe("/cae");
    expect(cae.headline).toContain("500");
    expect(cae.headline).toContain("150");
    const pico = focus.find((f) => f.kind === "picos")!;
    expect(pico.path).toBe("/pico");
    expect(pico.headline).toContain("190");
    expect(pico.headline).toContain("1/9");
  });

  it("caen se ordena por vistas perdidas × multiplicador", () => {
    const rows = [
      withSignals(row({ path: "/directorio", weeks: [400, 400, 100, 100], multiplier: 0.2 })), // pierde 600 × 0,2 = 120
      withSignals(row({ path: "/guia", weeks: [100, 100, 40, 40], multiplier: 8 })), // pierde 120 × 8 = 960
    ];
    const caen = buildFocus(rows, weekStarts).filter((f) => f.kind === "caen");
    expect(caen.map((f) => f.path)).toEqual(["/guia", "/directorio"]);
  });

  it(`como mucho ${FOCUS_PER_GROUP} por grupo`, () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      withSignals(row({ path: `/p${i}`, weeks: [0, 0, 30 + i, 30 + i] }))
    );
    const suben = buildFocus(rows, weekStarts).filter((f) => f.kind === "suben");
    expect(suben).toHaveLength(FOCUS_PER_GROUP);
    expect(suben[0].path).toBe("/p11");
  });

  it("sin filas no hay foco", () => {
    expect(buildFocus([], weekStarts)).toEqual([]);
  });
});
