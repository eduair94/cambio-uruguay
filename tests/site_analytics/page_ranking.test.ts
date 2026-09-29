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
import {
  buildPageRanking,
  MAX_PAGES,
  pageRankingIsEmpty,
  pageRankingRequests,
  rankingWeeks,
} from "../../classes/site-analytics/pageRanking";
import type { PageRankRow } from "../../classes/site-analytics/pageRanking";
import { exactDimension } from "../../classes/site-analytics/ga4";
import type { Ga4Report } from "../../classes/site-analytics/ga4";
import { addDays, analyticsWindows } from "../../classes/site-analytics/refresh";

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
    // Con un pico, la base es lo que queda sin esa semana: con dos semanas activas la mediana es el
    // promedio y el empujón la inflaba (/mercado-it-uruguay daba 50 por semana y hace 4).
    expect(baseOf([0, 0, 95, 4])).toBe(4);
    expect(baseOf([192, 32, 34, 19])).toBe(32);
    expect(baseOf([0, 33, 0, 0])).toBe(0);
  });

  it("trendOf: segunda mitad contra primera, con muestra mínima", () => {
    expect(trendOf([303, 210, 124, 27])).toBeCloseTo(151 / 513 - 1, 4);
    expect(trendOf([0, 0, 154, 89])).toBeNull(); // sin primera mitad no hay tendencia: es nueva
    expect(trendOf([5, 4, 6, 3])).toBeNull(); // 9 y 9: ruido
    expect(trendOf([10, 10, 40, 40])).toBe(3);
    // Por semana, contra las semanas en que la página YA existía: lanzada en la semana 2, la
    // mitad cruda (0 + 108 contra 70 + 13) decía −23 % y la página se estaba cayendo.
    expect(trendOf([0, 108, 70, 13])).toBeCloseTo(41.5 / 108 - 1, 4);
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
    // El máximo en la última semana no se distingue todavía de un crecimiento.
    expect(isPico([0, 0, 2, 24])).toBe(false); // /bicicletas-electricas-uruguay, recién lanzada
    expect(isPico([2, 2, 2, 40])).toBe(false);
    expect(isPico([0, 0, 95, 4])).toBe(true); // /mercado-it-uruguay: lanzamiento que se apagó
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
    expect(cae.headline).toContain("250"); // por semana: (300 + 200) / 2
    expect(cae.headline).toContain("75"); // (120 + 30) / 2
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

  it("suben no lleva picos de lanzamiento ni páginas de un puñado de vistas", () => {
    const rows = [
      withSignals(row({ path: "/lanzamiento", weeks: [0, 0, 95, 4] })),
      withSignals(row({ path: "/chiquita", weeks: [0, 0, 4, 6] })),
      withSignals(row({ path: "/arranca", weeks: [0, 0, 2, 24] })),
    ];
    const suben = buildFocus(rows, weekStarts).filter((f) => f.kind === "suben");
    expect(suben.map((f) => f.path)).toEqual(["/arranca"]);
  });

  it("una caída que traían las redes no manda a Search Console", () => {
    const social = { ...noEntrances, total: 80, social: 79, organic: 1 };
    const r = withSignals(row({ path: "/redes", weeks: [16, 131, 57, 14], entrances: social, multiplier: 8 }));
    const cae = buildFocus([r], weekStarts).find((f) => f.kind === "caen")!;
    expect(cae.detail).toMatch(/redes/);
    expect(cae.detail).not.toMatch(/Search Console/);
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

// ---------------------------------------------------------------------------------------------
// Armado desde los reportes de GA4
// ---------------------------------------------------------------------------------------------

/** Un reporte con la forma de GA4 a partir de filas planas. */
function report(dims: string[], metrics: string[], rows: (string | number)[][], rowCount?: number): Ga4Report {
  return {
    dimensionHeaders: dims.map((name) => ({ name })),
    metricHeaders: metrics.map((name) => ({ name })),
    rows: rows.map((r) => ({
      dimensionValues: r.slice(0, dims.length).map((value) => ({ value: String(value) })),
      metricValues: r.slice(dims.length).map((value) => ({ value: String(value) })),
    })),
    rowCount: rowCount ?? rows.length,
  };
}

const windows = analyticsWindows(new Date("2026-09-29T15:00:00Z"), "America/Montevideo");

function fixture(): Ga4Report[] {
  return [
    report(
      ["pagePath", "dateRange"],
      ["screenPageViews"],
      [
        ["/alquileres-uruguay", "w0", 303],
        ["/alquileres-uruguay", "w1", 210],
        ["/alquileres-uruguay", "w2", 124],
        ["/alquileres-uruguay", "w3", 27],
        ["/guias/x/", "w0", 10],
        ["/guias/x?utm_source=a", "w0", 5],
        ["/guias/x", "w2", 20],
        ["/guias/x", "w3", 25],
        ["/solo-semanal", "w3", 12],
        ["(not set)", "w1", 4],
      ]
    ),
    report(
      ["pagePath", "pageTitle"],
      ["screenPageViews", "activeUsers", "userEngagementDuration"],
      [
        ["/alquileres-uruguay", "Alquileres", 664, 107, 49538],
        ["/guias/x", "Guía X viejo", 10, 5, 300],
        ["/guias/x", "Guía X", 50, 20, 1200],
        ["/solo-titulo", "Sólo título", 7, 3, 90],
      ]
    ),
    // Todos los países. Truncado a propósito: GA4 dice 5 filas y manda 2.
    report(["pagePath"], ["screenPageViews"], [["/alquileres-uruguay", 673], ["/guias/x", 200]], 5),
    report(
      ["landingPage", "sessionDefaultChannelGroup"],
      ["sessions", "engagedSessions"],
      [
        ["/alquileres-uruguay", "Direct", 116, 70],
        ["/alquileres-uruguay", "Organic Search", 32, 20],
        ["/alquileres-uruguay", "Referral", 3, 2],
        ["/guias/x", "AI Assistant", 6, 4],
        ["/guias/x", "Organic Social", 2, 1],
        ["(not set)", "Direct", 50, 1],
      ]
    ),
    report(
      ["countryId"],
      ["screenPageViews", "sessions", "activeUsers"],
      [
        ["UY", 10236, 5194, 5082],
        ["SG", 20000, 100, 9000],
        ["US", 500, 50, 40],
      ]
    ),
  ];
}

const build = (reports = fixture()) =>
  buildPageRanking(reports, { asOf: "2026-09-29T15:00:00.000Z", timezone: "America/Montevideo", windows });

describe("ventanas y pedidos", () => {
  it("cuatro semanas contiguas que cubren la ventana", () => {
    const weeks = rankingWeeks(windows);
    expect(weeks).toHaveLength(4);
    expect(weeks[0].start).toBe(windows.current.start);
    expect(weeks[3].end).toBe(windows.current.end);
    for (let i = 1; i < 4; i++) expect(weeks[i].start).toBe(addDays(weeks[i - 1].end, 1));
  });

  it("cinco reportes, en el orden del spec", () => {
    const reqs = pageRankingRequests(windows);
    expect(reqs).toHaveLength(5);
    expect(reqs[0].dateRanges.map((r) => r.name)).toEqual(["w0", "w1", "w2", "w3"]);
    expect(reqs[0].dimensionFilter).toEqual(exactDimension("countryId", "UY"));
    expect(reqs[1].dimensions!.map((d) => d.name)).toEqual(["pagePath", "pageTitle"]);
    expect(reqs[2].dimensionFilter).toBeUndefined(); // el contraste es con TODOS los países
    expect(reqs[3].dimensions!.map((d) => d.name)).toEqual(["landingPage", "sessionDefaultChannelGroup"]);
    expect(reqs[4].dimensions!.map((d) => d.name)).toEqual(["countryId"]);
  });
});

describe("buildPageRanking", () => {
  it("una fila por ruta pública, sin (not set)", () => {
    const s = build();
    expect(s.pages.map((p) => p.path)).toEqual(["/alquileres-uruguay", "/guias/x", "/solo-semanal", "/solo-titulo"]);
    expect(s.pages.map((p) => p.rank)).toEqual([1, 2, 3, 4]);
    expect(s.pageCount).toBe(4);
  });

  it("mezcla barra final y query string, y se queda con el título más visto", () => {
    const g = build().pages.find((p) => p.path === "/guias/x")!;
    expect(g.weeks).toEqual([15, 0, 20, 25]);
    expect(g.base).toBe(17.5);
    expect(g.title).toBe("Guía X");
    expect(g.views).toBe(60);
    expect(g.users).toBe(25);
    expect(g.engagementSeconds).toBe(60);
    expect(g.viewsAll).toBe(200);
    expect(g.uyShare).toBeCloseTo(0.3);
    expect(g.entrances).toEqual({ total: 8, organic: 0, direct: 0, social: 2, ai: 6, other: 0 });
    expect(g.signals).toContain("ia");
    expect(g.family).toBe("/guias/*");
    expect(g.tier).toBe("contenido");
  });

  it("una ruta que sólo está en un reporte igual tiene fila", () => {
    const s = build();
    const semanal = s.pages.find((p) => p.path === "/solo-semanal")!;
    expect(semanal.title).toBe("");
    expect(semanal.views).toBe(12);
    expect(semanal.viewsAll).toBe(12); // ausente del reporte truncado: no puede ser menos que lo uruguayo
    expect(semanal.uyShare).toBe(1);
    expect(semanal.signals).toEqual(["nueva"]);
    const titulo = s.pages.find((p) => p.path === "/solo-titulo")!;
    expect(titulo.weeks).toEqual([0, 0, 0, 0]);
    expect(titulo.views).toBe(7);
    expect(titulo.base).toBe(0);
  });

  it("el directorio que cae lleva tramo, entradas y valor", () => {
    const a = build().pages[0];
    expect(a.tier).toBe("directorio");
    expect(a.multiplier).toBe(0.2);
    expect(a.entrances).toEqual({ total: 151, organic: 32, direct: 116, social: 0, ai: 0, other: 3 });
    expect(a.engagedRate).toBeCloseTo(92 / 151);
    expect(a.signals).toEqual(["cae"]);
    expect(a.value).toBeCloseTo(167 * 0.2);
  });

  it("totales: Uruguay exacto del reporte por país, canales con (not set) incluido", () => {
    const t = build().totals;
    expect(t.viewsUy).toBe(10236);
    expect(t.viewsAll).toBe(30736);
    expect(t.uyShare).toBeCloseTo(10236 / 30736);
    expect(t.sessionsUy).toBe(5194);
    expect(t.usersUy).toBe(5082);
    expect(t.weeklyUy).toEqual([318, 214, 144, 64]);
    expect(t.channels[0]).toEqual({ label: "Direct", sessions: 166, share: 166 / 209 });
    expect(t.channels.map((c) => c.label)).toEqual(["Direct", "Organic Search", "AI Assistant", "Referral", "Organic Social"]);
  });

  it("marca truncado cuando GA4 manda menos filas de las que dice tener", () => {
    expect(build().truncated).toBe(true);
    const whole = fixture();
    whole[2] = report(["pagePath"], ["screenPageViews"], [["/alquileres-uruguay", 673]]);
    expect(build(whole).truncated).toBe(false);
  });

  it("familias y foco", () => {
    const s = build();
    expect(s.families.find((f) => f.family === "/guias/*")).toMatchObject({ urls: 1, views: 60, tier: "contenido" });
    expect(s.focus.find((f) => f.kind === "caen")?.path).toBe("/alquileres-uruguay");
    expect(s.weeks).toEqual(rankingWeeks(windows));
    expect(s.range).toEqual(windows.current);
  });

  it(`recorta a ${MAX_PAGES} filas pero conserva las que están en el foco`, () => {
    const reports = fixture();
    const base = (reports[0].rows || []).map((r) => [
      r.dimensionValues![0].value!,
      r.dimensionValues![1].value!,
      Number(r.metricValues![0].value),
    ]);
    const many = Array.from({ length: MAX_PAGES + 100 }, (_, i) => [`/p${i}`, "w3", 1000 - i]);
    reports[0] = report(["pagePath", "dateRange"], ["screenPageViews"], [...base, ...many]);
    const s = build(reports);
    expect(s.pageCount).toBe(MAX_PAGES + 104);
    const kept = new Set(s.pages.map((p) => p.path));
    for (const f of s.focus) expect(kept.has(f.path)).toBe(true);
    expect(s.pages.length).toBeLessThanOrEqual(MAX_PAGES + s.focus.length);
    expect(kept.has("/alquileres-uruguay")).toBe(true); // está en "caen" aunque su base quede abajo
  });

  it("vacío cuando Uruguay no tiene vistas", () => {
    expect(pageRankingIsEmpty(build())).toBe(false);
    const empty = fixture().map((r) => ({ ...r, rows: [], rowCount: 0 }));
    expect(pageRankingIsEmpty(build(empty))).toBe(true);
  });
});
