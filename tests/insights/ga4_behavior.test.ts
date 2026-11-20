import { describe, expect, it } from "vitest";
import type { Ga4Report, Ga4ReportRequest } from "../../classes/site-analytics/ga4";
import {
  batch1Requests,
  batch2Requests,
  buildGa4Behavior,
  cleanSearchTerm,
  consentRequests,
  customRequests,
  FORBIDDEN_METRIC_RE,
  runGa4Behavior,
} from "../../classes/insights/sources/ga4Behavior";
import type { Ga4Api, Ga4Reports } from "../../classes/insights/sources/ga4Behavior";
import { lowReading } from "../../classes/insights/signals";
import type { DayWindow } from "../../classes/insights/types";
import { block, NOW, report, sources } from "./helpers";

const W = { start: "2026-10-24", end: "2026-11-20" };
const WINDOW: DayWindow = { ...W, days: 28, tz: "America/Montevideo" };
const ALL_DIMS = [
  "customEvent:content_path",
  "customEvent:destination_path",
  "customEvent:link_area",
  "customEvent:placement",
  "customEvent:read_percent",
];

const hasSiteAndUy = (r: Ga4ReportRequest) => {
  const s = JSON.stringify(r.dimensionFilter);
  return s.includes("cambio-uruguay.com") && s.includes("www.cambio-uruguay.com") && s.includes('"countryId"') && s.includes('"UY"');
};

function baseReports(over: Partial<Ga4Reports> = {}): Ga4Reports {
  return {
    batch1: [
      report(
        ["pagePath"],
        ["screenPageViews", "sessions", "engagedSessions", "userEngagementDuration"],
        [
          ["/guias/a?utm_source=x", 1000, 800, 400, 40000],
          ["/alquileres/abc", 300, 250, 100, 9000],
          ["/alquileres/def", 200, 150, 60, 6000],
          ["/sin-eventos", 5000, 4000, 2000, 100000],
        ],
        { metadata: { timeZone: "America/Montevideo" } }
      ),
      report(
        ["pagePath", "deviceCategory"],
        ["screenPageViews", "sessions", "engagedSessions", "userEngagementDuration", "bounceRate"],
        [
          ["/guias/a", "mobile", 700, 600, 200, 12000, 0.6],
          ["/guias/a", "desktop", 300, 200, 160, 20000, 0.2],
        ]
      ),
      report(
        ["landingPage", "deviceCategory"],
        ["sessions", "engagedSessions", "bounceRate"],
        [
          ["/guias/a", "mobile", 500, 150, 0.6],
          ["(not set)", "mobile", 99, 0, 1],
        ]
      ),
      report(
        ["pagePath", "eventName"],
        ["eventCount"],
        [
          ["/guias/a", "page_view", 1000],
          ["/guias/a", "read_progress", 60],
          ["/guias/a", "outbound_click", 30],
          ["/guias/a", "helpful_view", 40],
          ["/alquileres/:item", "read_progress", 25],
          ["/alquileres/:item", "internal_navigation", 10],
          ["/buscar", "search_no_results", 7],
          ["/buscar", "search_open", 20],
          ["/x", "ad_impression", 99],
        ]
      ),
      report(["pagePath", "linkDomain"], ["eventCount"], [["/guias/a", "www.brou.com.uy", 30]]),
    ],
    batch2: [
      report(
        ["pageReferrer", "pagePath"],
        ["screenPageViews"],
        [
          ["https://cambio-uruguay.com/?q=hola", "/guias/a", 50],
          ["https://www.google.com/", "/guias/a", 900],
          ["https://cambio-uruguay.com/guias/a", "/guias/a", 10],
        ]
      ),
      report(
        ["searchTerm"],
        ["eventCount"],
        [
          ["Dolar Hoy", 9],
          ["juan@example.com", 4],
          ["1.234.567-8", 3],
          ["099 123 456", 2],
          ["http://algo", 2],
          ["x".repeat(81), 2],
          ["(not set)", 2],
        ]
      ),
      report(
        ["deviceCategory"],
        ["sessions", "screenPageViews", "engagedSessions", "userEngagementDuration", "totalUsers"],
        [["mobile", 3000, 4000, 1500, 90000, 2500]]
      ),
      report(["date"], ["screenPageViews", "sessions"], [["20261120", 6500, 5200]]),
      report([], ["screenPageViews", "sessions", "engagedSessions", "eventCount"], [[6500, 5200, 2560, 9000]]),
    ],
    custom: {
      read: report(
        ["customEvent:content_path", "customEvent:read_percent"],
        ["eventCount"],
        [
          ["/guias/a", "50", 50],
          ["/guias/a", "90", 10],
          ["/alquileres/:item", "50", 20],
        ]
      ),
    },
    ...over,
  };
}

describe("consultas de GA4", () => {
  it("cada consulta lleva el sitio + Uruguay, orden descendente y límite", () => {
    const reqs = [
      ...batch1Requests(W),
      ...batch2Requests(W),
      ...consentRequests(W),
      ...customRequests(W, [...ALL_DIMS, "customEvent:q"]).map((c) => c.request),
    ];
    for (const r of reqs) {
      expect(hasSiteAndUy(r)).toBe(true);
      if (r.dimensions?.length) {
        expect(r.limit).toBeGreaterThan(0);
        expect(r.orderBys?.length).toBe(1);
      }
    }
  });

  it("nunca pide métricas de ingreso ni eventos de anuncios", () => {
    const reqs = [
      ...batch1Requests(W),
      ...batch2Requests(W),
      ...consentRequests(W),
      ...customRequests(W, [...ALL_DIMS, "customEvent:q"]).map((c) => c.request),
    ];
    const s = JSON.stringify(reqs);
    for (const r of reqs) for (const m of r.metrics) expect(m.name).not.toMatch(FORBIDDEN_METRIC_RE);
    expect(s).not.toMatch(/ad_impression|ad_click|totalAdRevenue|publisherAdRevenue/);
  });

  it("los reportes propios sólo corren con sus dimensiones registradas; C4 sólo con q", () => {
    expect(customRequests(W, []).map((c) => c.id)).toEqual([]);
    expect(customRequests(W, ALL_DIMS).map((c) => c.id)).toEqual(["read", "nav", "exposure", "placement"]);
    expect(customRequests(W, [...ALL_DIMS, "customEvent:q"]).map((c) => c.id)).toContain("searchQ");
  });
});

describe("cleanSearchTerm", () => {
  it("saca correos, cédulas, teléfonos, URLs y textos largos", () => {
    expect(cleanSearchTerm("  Dolar   HOY ")).toBe("dolar hoy");
    for (const bad of ["juan@example.com", "1.234.567-8", "099 123 456", "http://algo", "x".repeat(81), "(not set)", ""]) {
      expect(cleanSearchTerm(bad)).toBeNull();
    }
    expect(cleanSearchTerm("plazo fijo 2026")).toBe("plazo fijo 2026");
  });
});

describe("buildGa4Behavior", () => {
  const ctx = { customDimensions: ALL_DIMS, consentRange: null, consentPaths: [], quotaRemaining: 30000 };

  it("sin el reporte de read_percent, low-reading no dice 'ninguna página'", () => {
    const r = baseReports();
    delete r.custom.read;
    const { data } = buildGa4Behavior(r, ctx);
    expect(data.pages.find((p) => p.path === "/guias/a")!.rates).toMatchObject({ read50: null, readMeasured: true });
    const s = sources({ ga4Behavior: block("ga4Behavior", data, { status: "partial", carried: ["read"] }) });
    const sig = lowReading({ sources: s, consentCheck: null, previous: null, now: NOW, siteLoadsUy: 10000, gscQueries: null });
    expect(sig.status).not.toBe("ok");
    expect(sig.summary).not.toMatch(/Ninguna página/);
  });

  it("con el reporte de consentimiento cortado, una ruta de Cloudflare que no vino no se rellena con ceros", () => {
    const consent = [
      report(["pagePath"], ["screenPageViews"], [["/guias/a", 111]], { rowCount: 9000 }),
      report(["landingPage"], ["sessions"], [["/guias/a", 44]], { rowCount: 9000 }),
      report([], ["screenPageViews", "sessions"], [[2000, 900]]),
    ];
    const range = { start: "2026-11-10", end: "2026-11-19" };
    const { data } = buildGa4Behavior(baseReports({ consent }), { ...ctx, consentRange: range, consentPaths: ["/no-vino", "/guias/a"] });
    expect(data.consent!.truncated).toBe(true);
    expect(data.consent!.pages.map((p) => p.path)).toEqual(["/guias/a"]);
  });

  it("pliega las rutas dinámicas y marca qué está medido", () => {
    const { data } = buildGa4Behavior(baseReports(), ctx);
    const guia = data.pages.find((p) => p.path === "/guias/a")!;
    expect(guia.template).toBeNull();
    expect(guia.events).toMatchObject({ read50: 50, read90: 10, readAny: 60, outbound: 30, helpfulViews: 40 });
    expect(guia.rates).toMatchObject({ read50: 0.05, readMeasured: true, measured: true });
    expect(guia.mobile?.engagementRate).toBe(0.3333);
    expect(guia.mobile?.landingSessions).toBe(500);
    const abc = data.pages.find((p) => p.path === "/alquileres/abc")!;
    expect(abc.template).toBe("/alquileres/:item");
    expect(abc.events).toBeNull();
    const t = data.templates.find((x) => x.template === "/alquileres/:item")!;
    expect(t).toMatchObject({ realPaths: 2, views: 500 });
    expect(t.rates.readMeasured).toBe(true);
    // 19 lecturas no alcanzan, 20 sí
    const sin = data.pages.find((p) => p.path === "/sin-eventos")!;
    expect(sin.rates).toMatchObject({ readMeasured: false, measured: false });
    expect(data.events.find((e) => e.name === "ad_impression")).toBeUndefined();
  });

  it("los recorridos son sólo internos, sin query, y el total se suma antes del tope", () => {
    const { data } = buildGa4Behavior(baseReports(), ctx);
    expect(data.flows).toEqual([{ from: "/", to: "/guias/a", views: 50 }]);
    expect(data.flowsTotalViews).toBe(50);
  });

  it("filtra los términos de las tres listas", () => {
    const withQ = baseReports({
      custom: {
        searchQ: report(
          ["eventName", "customEvent:q"],
          ["eventCount"],
          [
            ["search_no_results", "cotizacion euro", 6],
            ["search_no_results", "mi cedula 12345678", 9],
            ["search_select", "dolar", 4],
            ["search_select", "yo@mail.com", 4],
          ]
        ),
      },
    });
    const { data } = buildGa4Behavior(withQ, { ...ctx, customDimensions: [...ALL_DIMS, "customEvent:q"] });
    expect(data.search.noResultTerms).toEqual([{ term: "cotizacion euro", events: 6 }]);
    expect(data.search.selectTerms).toEqual([{ term: "dolar", events: 4 }]);
    expect(data.search.pageTerms).toEqual([{ term: "dolar hoy", events: 9 }]);
    expect(data.search.noResultPages).toEqual([{ path: "/buscar", events: 7 }]);
    // sin q registrada no hay términos sino páginas
    const noQ = buildGa4Behavior(withQ, ctx).data;
    expect(noQ.search.qRegistered).toBe(false);
    expect(noQ.search.noResultTerms).toEqual([]);
  });

  it("marca truncado cuando un reporte llega al límite o le faltan filas", () => {
    const r = baseReports();
    r.batch1[0] = { ...r.batch1[0], rowCount: 9999 };
    expect(buildGa4Behavior(r, ctx).truncated).toBe(true);
    expect(buildGa4Behavior(baseReports(), ctx).truncated).toBe(false);
  });
});

function fakeApi(tz = "America/Montevideo") {
  const calls: Ga4ReportRequest[][] = [];
  const api: Ga4Api = {
    configProblem: () => null,
    metadata: async () => ({ dimensions: ["pagePath", ...ALL_DIMS], metrics: [] }),
    runReports: async (reqs) => {
      calls.push(reqs);
      const base = baseReports();
      if (reqs.length === 5 && reqs[0].dimensions?.[0]?.name === "pagePath" && reqs[1].dimensions?.length === 2) {
        base.batch1[0] = { ...base.batch1[0], metadata: { timeZone: tz } };
        return base.batch1;
      }
      if (reqs.length === 5) return base.batch2;
      if (reqs.length === 3) {
        return [
          report(["pagePath"], ["screenPageViews"], [["/guias/a", 111]]),
          report(
            ["landingPage"],
            ["sessions"],
            [
              ["/guias/a", 44],
              ["/otra", 7],
            ]
          ),
          report([], ["screenPageViews", "sessions"], [[2000, 900]]),
        ];
      }
      const id = reqs[0].dimensions?.map((d) => d.name).join(",") || "";
      return [id.includes("read_percent") ? base.custom.read! : report([], ["eventCount"], [])];
    },
  };
  return { api, calls };
}

describe("runGa4Behavior y el consentimiento", () => {
  const range = { start: "2026-11-10", end: "2026-11-19" };

  it("los reportes 11a–c cubren EXACTAMENTE el rango de Cloudflare", async () => {
    const { api, calls } = fakeApi();
    const res = await runGa4Behavior({ window: WINDOW, consentRange: range, consentPaths: ["/otra", "/guias/a"], prevData: null, api });
    expect(res.outcome.kind).toBe("ok");
    const consentBatch = calls.find((c) => c.length === 3)!;
    for (const r of consentBatch) expect(r.dateRanges).toEqual([{ startDate: "2026-11-10", endDate: "2026-11-19" }]);
    const data = (res.outcome as any).data;
    expect(data.consent.range).toEqual(range);
    expect(data.consent.totals).toEqual({ views: 2000, landingSessions: 900 });
    // primero las rutas de Cloudflare, en su orden, con los números de 10 días (no los de 28)
    expect(data.consent.pages.slice(0, 2)).toEqual([
      { path: "/otra", views: 0, landingSessions: 7 },
      { path: "/guias/a", views: 111, landingSessions: 44 },
    ]);
  });

  it("una propiedad en otra zona horaria no compara", async () => {
    const { api, calls } = fakeApi("America/Sao_Paulo");
    const res = await runGa4Behavior({ window: WINDOW, consentRange: range, consentPaths: [], prevData: null, api });
    const data = (res.outcome as any).data;
    expect(data.consent).toBeNull();
    expect(data.timeZone).toBe("America/Sao_Paulo");
    expect((res.outcome as any).note).toMatch(/America\/Sao_Paulo/);
    expect(calls.some((c) => c.length === 3)).toBe(false);
  });

  it("una propiedad que no informa su zona horaria tampoco compara", async () => {
    const { api, calls } = fakeApi("");
    const res = await runGa4Behavior({ window: WINDOW, consentRange: range, consentPaths: [], prevData: null, api });
    const data = (res.outcome as any).data;
    expect(data.timeZone).toBeNull();
    expect(data.consent).toBeNull();
    expect((res.outcome as any).note).toMatch(/no informó su zona horaria/);
    expect(calls.some((c) => c.length === 3)).toBe(false);
  });

  it("sin configuración: inactiva", async () => {
    const res = await runGa4Behavior({
      window: WINDOW,
      consentRange: null,
      consentPaths: [],
      prevData: null,
      api: {
        configProblem: () => "GA4_PROPERTY_ID is not set",
        metadata: async () => ({ dimensions: [], metrics: [] }),
        runReports: async () => [] as Ga4Report[],
      },
    });
    expect(res.outcome.kind).toBe("inactive");
  });
});
