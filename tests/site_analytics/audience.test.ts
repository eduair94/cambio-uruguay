// /estadisticas-del-sitio publicaba los totales de la propiedad entera. Medido el 16/11/2026: el
// 73 % de las sesiones de 28 días venía de fuera de Uruguay por el canal Directo, con una página y
// cero segundos — tráfico automatizado — y la página pública decía "21 % de interacción, 73 %
// directo" de un sitio cuyos lectores uruguayos interactuaban el 67 % y llegaban 68 % por buscadores.
// El snapshot lleva ahora los mismos ocho reportes filtrados a Uruguay, y todos declaran el host.
import { describe, expect, it } from "vitest";
import {
  analyticsReportRequests,
  analyticsWindows,
  buildSnapshot,
  REPORTS_PER_AUDIENCE,
  siteAnalyticsUpdate,
} from "../../classes/site-analytics/refresh";
import type { Ga4Report } from "../../classes/site-analytics/ga4";

const TZ = "America/Montevideo";
const windows = analyticsWindows(new Date("2026-11-16T13:00:00Z"), TZ);
const ctx = { propertyId: "123456789", windows, asOf: "2026-11-16T13:00:00.000Z", timezone: TZ };

const SUMMARY = [
  "activeUsers",
  "newUsers",
  "sessions",
  "screenPageViews",
  "engagedSessions",
  "engagementRate",
  "averageSessionDuration",
  "eventCount",
];

function report(dims: string[], metrics: string[], rows: (string | number)[][]): Ga4Report {
  return {
    dimensionHeaders: dims.map(name => ({ name })),
    metricHeaders: metrics.map(name => ({ name })),
    rows: rows.map(row => ({
      dimensionValues: row.slice(0, dims.length).map(value => ({ value: String(value) })),
      metricValues: row.slice(dims.length).map(value => ({ value: String(value) })),
    })),
  };
}

/** Los ocho reportes de una audiencia, con `sessions` sesiones y `engaged` con interacción. */
function audience(sessions: number, engaged: number, topPath: string): Ga4Report[] {
  const totals = report([], SUMMARY, [[sessions, sessions, sessions, sessions * 2, engaged, engaged / sessions, 60, 100]]);
  return [
    totals,
    totals,
    report(["date"], ["activeUsers", "sessions", "screenPageViews"], [["20261114", 10, sessions, 20]]),
    report(["pagePath", "pageTitle"], ["screenPageViews", "activeUsers", "userEngagementDuration"], [[topPath, "Título", 50, 10, 600]]),
    report(["sessionDefaultChannelGroup"], ["sessions"], [["Organic Search", sessions]]),
    report(["country"], ["activeUsers"], [["Uruguay", sessions]]),
    report(["deviceCategory"], ["sessions"], [["mobile", sessions]]),
    report(["eventName"], ["eventCount", "activeUsers"], [["page_view", 100, 10]]),
  ];
}

describe("los reportes dicen de qué host y de qué audiencia hablan", () => {
  const all = analyticsReportRequests(windows);
  const uruguay = analyticsReportRequests(windows, "uruguay");

  it("todos filtran por el host del sitio: la propiedad GA4 la comparten otros hosts", () => {
    for (const request of all) {
      expect(request.dimensionFilter).toEqual({
        filter: {
          fieldName: "hostName",
          inListFilter: { values: ["cambio-uruguay.com", "www.cambio-uruguay.com"] },
        },
      });
    }
  });

  it("la audiencia de Uruguay son los MISMOS ocho reportes, con el país además del host", () => {
    expect(uruguay).toHaveLength(REPORTS_PER_AUDIENCE);
    expect(all).toHaveLength(REPORTS_PER_AUDIENCE);
    uruguay.forEach((request, index) => {
      const { dimensionFilter, ...rest } = request;
      const { dimensionFilter: _global, ...globalRest } = all[index];
      expect(rest).toEqual(globalRest);
      const expressions = dimensionFilter.andGroup.expressions;
      expect(expressions).toHaveLength(2);
      expect(expressions[0].filter.fieldName).toBe("hostName");
      expect(expressions[1]).toEqual({
        filter: { fieldName: "countryId", stringFilter: { matchType: "EXACT", value: "UY" } },
      });
    });
  });
});

describe("el bloque de Uruguay en el snapshot", () => {
  it("sale de la segunda tanda de reportes y no toca los totales de la propiedad", () => {
    const snapshot = buildSnapshot([...audience(1000, 210, "/todos"), ...audience(270, 180, "/dolar-hoy")], ctx);
    expect(snapshot.totals.sessions).toBe(1000);
    expect(snapshot.topPages[0].path).toBe("/todos");
    expect(snapshot.uruguay?.totals.sessions).toBe(270);
    expect(snapshot.uruguay?.totals.engagedSessions).toBe(180);
    expect(snapshot.uruguay?.topPages[0].path).toBe("/dolar-hoy");
    expect(snapshot.uruguay?.daily).toEqual([{ date: "2026-11-14", activeUsers: 10, sessions: 270, screenPageViews: 20 }]);
    // Un país solo: el bloque no lleva desglose por país.
    expect(snapshot.uruguay).not.toHaveProperty("countries");
  });

  it("no se publica cuando esa mitad volvió vacía: es una tanda fallida, no un mes sin uruguayos", () => {
    expect(buildSnapshot(audience(1000, 210, "/todos"), ctx).uruguay).toBeUndefined();
    const zero = report([], SUMMARY, [[0, 0, 0, 0, 0, 0, 0, 0]]);
    expect(buildSnapshot([...audience(1000, 210, "/todos"), zero, zero], ctx).uruguay).toBeUndefined();
  });

  it("la tabla de páginas de Uruguay también sale sin querystring", () => {
    const withQuery = audience(270, 180, "/buscar?q=lo+que+alguien+escribio");
    const snapshot = buildSnapshot([...audience(1000, 210, "/todos"), ...withQuery], ctx);
    expect(JSON.stringify(snapshot.uruguay)).not.toContain("lo+que+alguien+escribio");
    expect(snapshot.uruguay?.topPages[0].path).toBe("/buscar");
  });
});

describe("la escritura", () => {
  it("guarda el bloque cuando viene", () => {
    const snapshot = buildSnapshot([...audience(1000, 210, "/todos"), ...audience(270, 180, "/dolar-hoy")], ctx);
    const update = siteAnalyticsUpdate(snapshot);
    expect(update.$set.uruguay?.totals.sessions).toBe(270);
    expect(update).not.toHaveProperty("$unset");
  });

  it("lo BORRA cuando no viene: el de ayer quedaría al lado de la ventana de hoy", () => {
    const update = siteAnalyticsUpdate(buildSnapshot(audience(1000, 210, "/todos"), ctx));
    expect(update.$unset).toEqual({ uruguay: "" });
    expect(update.$set).not.toHaveProperty("uruguay");
    expect(update.$set.key).toBe("site");
  });
});
