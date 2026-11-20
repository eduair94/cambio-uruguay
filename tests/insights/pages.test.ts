import { describe, expect, it } from "vitest";
import { buildConsentCheck, buildPages, buildTrend } from "../../classes/insights/pages";
import { block, sources } from "./helpers";
import { cfData, ga4Data, ga4Page, rated, vital } from "./builders";

const range = { start: "2026-11-01", end: "2026-11-19" };

function both(over: { gaRange?: typeof range; days?: number } = {}) {
  const cf = cfData({
    pages: Array.from({ length: 160 }, (_, i) => ({
      path: `/p${i}`,
      loads: 1000 - i,
      visits: 400,
      mobile: 600,
      desktop: 400 - i,
      tablet: 0,
    })),
    vitals: [vital("/p0", "mobile", 50, rated(0, 0, 10))],
    consent: {
      range,
      days: over.days ?? 19,
      totals: { loads: 50000, visits: 20000, realVisits: 20000 },
      pages: [{ path: "/p0", loads: 900, visits: 400, realVisits: 400 }],
    },
    internalLoadsShare: 0.18,
  });
  const ga = ga4Data({
    pages: [
      ga4Page("/p0", {
        views: 5000,
        rates: { read50: 0.3, read90: 0.1, outbound: 0.05, internalNav: 0.1, readMeasured: true, measured: true },
      }),
      ga4Page("/solo-ga4", { views: 2000 }),
    ],
    consent: {
      range: over.gaRange ?? range,
      truncated: false,
      totals: { views: 30000, landingSessions: 9000 },
      pages: [{ path: "/p0", views: 800, landingSessions: 100 }],
    },
    flowsTotalViews: 3100,
  });
  return sources({ cloudflareRum: block("cloudflareRum", cf), ga4Behavior: block("ga4Behavior", ga) });
}

describe("buildConsentCheck", () => {
  it("usable con el mismo rango, Montevideo y ≥ 7 días", () => {
    const cc = buildConsentCheck(both());
    expect(cc).toMatchObject({
      usable: true,
      reason: null,
      siteCoverage: 0.45,
      siteCoverageLoads: 0.6,
      cfInternalShare: 0.18,
      ga4InternalShare: 0.31,
      days: 19,
    });
  });
  it("los motivos", () => {
    expect(buildConsentCheck(both({ gaRange: { start: "2026-11-02", end: "2026-11-19" } })).reason).toBe(
      "rangos distintos: GA4 2026-11-02–2026-11-19, Cloudflare 2026-11-01–2026-11-19"
    );
    expect(buildConsentCheck(both({ days: 3 })).reason).toBe("faltan días: 3 de 7");
    expect(buildConsentCheck(sources()).reason).toBe("faltan días: 0 de 7");
  });
});

describe("buildPages", () => {
  it("une las dos fuentes, topa en 150 y lee la cobertura SÓLO de los bloques de consentimiento", () => {
    const s = both();
    const cc = buildConsentCheck(s);
    const pages = buildPages(s, [], cc);
    expect(pages.length).toBe(150);
    expect(pages[0].path).toBe("/p0");
    expect(pages[0].coverage).toBe(0.25);
    expect(pages[0].coverageLoads).toBe(0.8889);
    expect(pages[0].ga4?.read50Rate).toBe(0.3);
    expect(pages[0].vitals?.mobile?.cls).toBe("poor");
    expect(pages.find((p) => p.path === "/solo-ga4")?.cf).toBeNull();
    // sin comparación usable no hay cobertura
    const bad = buildPages(s, [], { ...cc, usable: false });
    expect(bad[0].coverage).toBeNull();
    expect(bad[0].coverageLoads).toBeNull();
  });
  it("una página sin medición no lleva tasa de lectura", () => {
    const s = sources({ ga4Behavior: block("ga4Behavior", ga4Data({ pages: [ga4Page("/x")] })) });
    const [row] = buildPages(s, [], null);
    expect(row.ga4?.read50Rate).toBeNull();
    expect(row.ga4?.readMeasured).toBe(false);
  });
});

describe("buildTrend", () => {
  it("28 días y la cobertura nula el día de datos", () => {
    const cf = cfData({
      daily: [
        { day: "2026-11-19", loadsUy: 100, visitsUy: 50, loadsAll: 200, sampleInterval: 1 },
        { day: "2026-11-20", loadsUy: 100, visitsUy: 50, loadsAll: 200, sampleInterval: 1 },
      ],
    });
    const ga = ga4Data({
      daily: [
        { day: "2026-11-19", views: 60, sessions: 20 },
        { day: "2026-11-20", views: 60, sessions: 20 },
      ],
    });
    const t = buildTrend(sources({ cloudflareRum: block("cloudflareRum", cf), ga4Behavior: block("ga4Behavior", ga) }), "2026-11-20");
    expect(t.days.length).toBe(28);
    expect(t.coverage[26]).toBe(0.4);
    expect(t.coverage[27]).toBeNull();
  });
});
