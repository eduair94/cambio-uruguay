// El informe de fuentes que sirve `GET /regional/sources`.
//
// El catálogo solo es una lista de intenciones. Lo que hace confiable a un
// tablero de veintiuna fuentes es lo otro: cuál respondió, qué publicó, dónde
// quedó corroborando y qué se le descartó.
import { describe, expect, it } from "vitest";
import { buildSourcesReport, findSourceReport } from "../../classes/regional/sources_report";
import type { RegionalSnapshot, RegionalSourceMeta } from "../../classes/regional/types";

const catalogue: RegionalSourceMeta[] = [
  {
    id: "py_bcp",
    name: "Banco Central del Paraguay",
    country: "PY",
    url: "https://www.bcp.gov.py/",
    access: "scrape",
    publisher: "central-bank",
    covers: "referencial y planilla",
  },
  {
    id: "py_dolarpy",
    name: "DolarPy",
    country: "PY",
    url: "https://dolar.melizeche.com/",
    access: "api",
    publisher: "market-data",
    covers: "el referencial por segundo camino",
  },
  {
    id: "world_erapi",
    name: "ExchangeRate-API",
    country: "UY",
    global: true,
    url: "https://open.er-api.com/",
    access: "api",
    publisher: "market-data",
    covers: "referencia mid-market",
  },
  {
    id: "uy_local",
    name: "cambio-uruguay.com",
    country: "UY",
    url: "https://cambio-uruguay.com/",
    access: "api",
    publisher: "market-data",
    covers: "el tablero propio",
  },
];

const snapshot = {
  generatedAt: "2026-08-22T18:00:00.000Z",
  oldestQuoteAt: "2026-08-22T12:00:00.000Z",
  quotes: [
    {
      id: "PY:referencial:USDPYG",
      country: "PY",
      market: "referencial",
      label: "referencial",
      kind: "official",
      base: "USD",
      quote: "PYG",
      buy: 6008.1,
      sell: 6011.22,
      avg: 6009.66,
      spreadPct: 0.05,
      updatedAt: "2026-08-22T16:30:00.000Z",
      source: "py_bcp",
      sourceUrl: "https://www.bcp.gov.py/",
      corroboratedBy: ["py_dolarpy"],
      disagreementPct: 0.0085,
    },
    {
      id: "UY:casas:USDUYU",
      country: "UY",
      market: "casas",
      label: "casas",
      kind: "retail",
      base: "USD",
      quote: "UYU",
      buy: 40,
      sell: 40.6,
      avg: 40.3,
      spreadPct: 1.5,
      updatedAt: "2026-08-22T12:00:00.000Z",
      source: "uy_local",
      sourceUrl: "https://cambio-uruguay.com/",
      corroboratedBy: [],
      disagreementPct: null,
    },
  ],
  board: [],
  gaps: [],
  cross: [],
  routes: [],
  sources: [
    { id: "py_bcp", ok: true, note: "8 cotizaciones", ms: 1294, quotes: 8 },
    { id: "py_dolarpy", ok: true, note: "2 cotizaciones", ms: 340, quotes: 2 },
    { id: "world_erapi", ok: true, note: "6 cotizaciones", ms: 458, quotes: 6 },
    { id: "uy_local", ok: true, note: "7 cotizaciones propias", ms: 0, quotes: 7 },
  ],
  rejected: [
    { id: "UY:internacional:USDUYU", source: "world_erapi", reason: "12.3 % lejos de la mediana", value: 35.24 },
  ],
} as unknown as RegionalSnapshot;

describe("buildSourcesReport", () => {
  const report = buildSourcesReport(catalogue, snapshot);

  it("no le inventa un país a un feed mundial", () => {
    // Ponerle "UY" a un feed que cotiza el mundo entero era la menos mala de
    // seis respuestas equivocadas.
    const global = report.sources.find((source) => source.id === "world_erapi")!;
    expect(global.country).toBeNull();
    expect(global.scope).toBe("global");
    expect(report.sources.find((source) => source.id === "py_bcp")!.country).toBe("PY");
  });

  it("dice qué mercados publica cada fuente y en cuáles corrobora", () => {
    expect(report.sources.find((source) => source.id === "py_bcp")!.published).toEqual(["PY:referencial:USDPYG"]);
    expect(report.sources.find((source) => source.id === "py_dolarpy")!.published).toEqual([]);
    expect(report.sources.find((source) => source.id === "py_dolarpy")!.corroborates).toEqual([
      "PY:referencial:USDPYG",
    ]);
  });

  it("le atribuye la diferencia a los dos lados de la comparación", () => {
    // Es una distancia: existe igual desde cualquiera de los dos.
    expect(report.sources.find((source) => source.id === "py_bcp")!.maxDisagreementPct).toBeCloseTo(0.0085, 5);
    expect(report.sources.find((source) => source.id === "py_dolarpy")!.maxDisagreementPct).toBeCloseTo(0.0085, 5);
  });

  it("adjunta lo descartado con su motivo", () => {
    const rejected = report.sources.find((source) => source.id === "world_erapi")!.rejected;
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatch(/lejos de la mediana/);
  });

  it("distingue la fuente interna de las que salen a la red", () => {
    expect(report.sources.find((source) => source.id === "uy_local")!.role).toBe("internal");
    expect(report.sources.find((source) => source.id === "py_bcp")!.role).toBe("live");
  });

  it("cuenta los puntos ciegos que quedan", () => {
    // Un mercado con una sola lectura no tiene forma de notar que esa lectura se
    // rompió: es exactamente el número que hay que vigilar.
    expect(report.summary.corroboratedMarkets).toBe(1);
    expect(report.summary.singleSourceMarkets).toBe(1);
    expect(report.summary.centralBanks).toBe(1);
    expect(report.summary.scrapes).toBe(1);
    expect(report.summary.global).toBe(1);
    expect(report.summary.responding).toBe(4);
    expect(report.summary.failing).toBe(0);
  });

  it("sirve el catálogo aunque no haya snapshot todavía", () => {
    const empty = buildSourcesReport(catalogue, null);
    expect(empty.sources).toHaveLength(4);
    expect(empty.generatedAt).toBeNull();
    expect(empty.sources[0].status).toBeNull();
    expect(empty.summary.corroboratedMarkets).toBe(0);
  });

  it("encuentra una fuente por id y devuelve null para una que no existe", () => {
    expect(findSourceReport(report, "py_bcp")?.name).toBe("Banco Central del Paraguay");
    expect(findSourceReport(report, "no_existe")).toBeNull();
  });
});
