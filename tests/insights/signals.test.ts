import { describe, expect, it } from "vitest";
import { buildConsentCheck } from "../../classes/insights/pages";
import {
  aiCrawlerErrors,
  bingOnlyQueries,
  buildSignals,
  consentGap,
  edgeErrors,
  friction,
  helpfulNo,
  lowReading,
  mobileWorse,
  notIndexed,
  orderSignals,
  outboundRate,
  pageSeverity,
  poorVitals,
  searchNoResults,
} from "../../classes/insights/signals";
import type { SignalContext } from "../../classes/insights/signals";
import { SIGNAL_IDS } from "../../classes/insights/types";
import type { InsightSources, Signal } from "../../classes/insights/types";
import { block, NOW, sources } from "./helpers";
import { cfData, clarityData, feedbackData, ga4Data, ga4Page, indexationData, metrics, rated, vital } from "./builders";

function ctx(over: Partial<InsightSources>, extra: Partial<SignalContext> = {}): SignalContext {
  const s = sources(over);
  return { sources: s, consentCheck: buildConsentCheck(s), previous: null, now: NOW, siteLoadsUy: 10000, gscQueries: new Map(), ...extra };
}

const range = { start: "2026-11-01", end: "2026-11-19" };

function consentSources(
  pages: { path: string; visits: number; realVisits: number; landing: number }[],
  over: { days?: number; tz?: string; gaRange?: typeof range } = {}
) {
  const cf = cfData({
    pages: pages.map((p) => ({ path: p.path, loads: p.visits * 2, visits: p.visits, mobile: p.visits, desktop: p.visits, tablet: 0 })),
    consent: {
      range,
      days: over.days ?? 19,
      totals: { loads: 20000, visits: 10000, realVisits: 10000 },
      pages: pages.map((p) => ({ path: p.path, loads: p.visits * 2, visits: p.visits, realVisits: p.realVisits })),
    },
  });
  const ga = ga4Data({
    timeZone: over.tz ?? "America/Montevideo",
    consent: {
      range: over.gaRange ?? range,
      truncated: false,
      // cobertura del sitio: 5000 / 10000 = 50 %
      totals: { views: 12000, landingSessions: 5000 },
      pages: pages.map((p) => ({ path: p.path, views: p.landing * 3, landingSessions: p.landing })),
    },
  });
  return { cloudflareRum: block("cloudflareRum", cf), ga4Behavior: block("ga4Behavior", ga) };
}

describe("consent-gap", () => {
  it("elige por el cociente de ENTRADAS, contra el del sitio × 0,6", () => {
    const s = consentSources([
      { path: "/baja", visits: 1000, realVisits: 1000, landing: 200 }, // 20 % < 30 %
      { path: "/normal", visits: 1000, realVisits: 1000, landing: 450 }, // 45 %
      { path: "/chica", visits: 99, realVisits: 99, landing: 0 }, // < 100 entradas
      { path: "/muestreada", visits: 500, realVisits: 19, landing: 0 }, // < 20 reales
    ]);
    const sig = consentGap(ctx(s));
    expect(sig.status).toBe("ok");
    expect(sig.rows.map((r) => r.path)).toEqual(["/baja"]);
    expect(sig.rows[0]).toMatchObject({ landingCoverage: 0.2, siteCoverage: 0.5 });
  });

  it("una página con el cociente por cargas bajo pero entradas normales no es fila", () => {
    const s = consentSources([{ path: "/spa", visits: 1000, realVisits: 1000, landing: 500 }]);
    (s.ga4Behavior.data as any).consent.pages[0].views = 10; // por cargas: 10 / 2000
    const sig = consentGap(ctx(s));
    expect(sig.rows).toEqual([]);
  });

  it("no disponible con rangos distintos, otra zona horaria o menos de 7 días", () => {
    const diff = consentGap(ctx(consentSources([], { gaRange: { start: "2026-11-02", end: "2026-11-19" } })));
    expect(diff).toMatchObject({ status: "unavailable", reason: expect.stringMatching(/rangos distintos/) });
    const tz = consentGap(ctx(consentSources([], { tz: "America/Sao_Paulo" })));
    expect(tz.reason).toMatch(/America\/Sao_Paulo/);
    const short = consentGap(ctx(consentSources([], { days: 6 })));
    expect(short.reason).toBe("faltan días: 6 de 7");
  });
});

describe("mobile-worse", () => {
  const dev = (views: number, er: number, sec: number) => ({
    views,
    sessions: views,
    engagementRate: er,
    avgEngagementSec: sec,
    bounceRate: null,
    landingSessions: 0,
  });
  it("en, debajo y encima de los umbrales", () => {
    const pages = [
      ga4Page("/peor", { mobile: dev(100, 0.3, 20), desktop: dev(50, 0.45, 25) }),
      ga4Page("/casi", { mobile: dev(100, 0.31, 20), desktop: dev(50, 0.45, 25) }),
      ga4Page("/pocas", { mobile: dev(99, 0.1, 5), desktop: dev(50, 0.9, 100) }),
      ga4Page("/lenta", { mobile: dev(300, 0.5, 10), desktop: dev(80, 0.5, 20) }),
    ];
    const sig = mobileWorse(ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ pages })) }));
    expect(sig.rows.map((r) => r.path).sort()).toEqual(["/lenta", "/peor"]);
  });
});

describe("low-reading", () => {
  it("una página sin medición NO es fila: va al grupo sin-medicion", () => {
    const pages = [
      ga4Page("/sin", { views: 5000 }),
      ga4Page("/19", {
        views: 500,
        events: { read50: 1, read90: 0, readAny: 19, outbound: 0, internalNav: 0, recommendationViews: 0, helpfulViews: 0, ctaClicks: 0 },
        rates: { read50: 0.002, read90: 0, outbound: 0, internalNav: 0, readMeasured: false, measured: false },
      }),
      ga4Page("/20", {
        views: 500,
        events: { read50: 1, read90: 0, readAny: 20, outbound: 0, internalNav: 0, recommendationViews: 0, helpfulViews: 0, ctaClicks: 0 },
        rates: { read50: 0.002, read90: 0, outbound: 0, internalNav: 0, readMeasured: true, measured: true },
      }),
      ga4Page("/lee", { views: 500, rates: { read50: 0.4, read90: 0.2, outbound: 0, internalNav: 0, readMeasured: true, measured: true } }),
    ];
    const sig = lowReading(ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ pages })) }));
    expect(sig.rows.map((r) => r.path)).toEqual(["/20"]);
    expect(sig.groups).toEqual([{ key: "sin-medicion", label: "sin medición de lectura", count: 2, share: null }]);
  });
});

describe("poor-vitals", () => {
  it("con 29 muestras reales no; con 30 sí (un día muestreado de 300 con intervalo 10 son 30)", () => {
    const cf = cfData({
      pages: [{ path: "/", loads: 600, visits: 300, mobile: 500, desktop: 100, tablet: 0 }],
      vitals: [vital("/", "mobile", 30, rated(50, 10, 40)), vital("/b", "mobile", 29, rated(50, 10, 40))],
      elements: [
        { metric: "cls", path: "/", device: "mobile", element: "#main>div.rail", inpName: null, events: 30 },
        { metric: "cls", path: "/", device: "mobile", element: "", inpName: null, events: 10 },
      ],
    });
    const sig = poorVitals(ctx({ cloudflareRum: block("cloudflareRum", cf) }));
    expect(sig.rows.map((r) => r.key)).toEqual(["/|mobile|cls"]);
    expect(sig.rows[0]).toMatchObject({ element: "#main>div.rail", elementShare: 0.75, impact: 500, realSamples: 30 });
  });
});

describe("search-no-results", () => {
  const terms = {
    qRegistered: true,
    opens: 10,
    selects: 0,
    noResults: 4,
    resultsViews: 0,
    noResultTerms: [
      { term: "secreto dolar", events: 5 },
      { term: "cuatro", events: 4 },
    ],
    selectTerms: [],
    pageTerms: [],
    noResultPages: [],
  };
  it("4 eventos no alcanzan, 5 sí; el resumen no cita términos", () => {
    const sig = searchNoResults(ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ search: terms })) }));
    expect(sig.rows.map((r) => r.key)).toEqual(["secreto dolar"]);
    expect(sig.summary).not.toMatch(/secreto|cuatro/);
    expect(sig.severity).toBe("medium");
  });
  it("sin q: páginas y la nota del paso 5.6", () => {
    const s = { ...terms, qRegistered: false, noResultPages: [{ path: "/buscar", events: 5 }] };
    const sig = searchNoResults(ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ search: s })) }));
    expect(sig.status).toBe("ok");
    expect(sig.rows.map((r) => r.path)).toEqual(["/buscar"]);
    expect(sig.reason).toMatch(/5\.6/);
  });
});

describe("outbound-rate", () => {
  it("ignora las páginas sin medición", () => {
    const pages = [
      ga4Page("/sale", {
        views: 100,
        events: { read50: 0, read90: 0, readAny: 0, outbound: 25, internalNav: 0, recommendationViews: 0, helpfulViews: 0, ctaClicks: 0 },
        rates: { read50: 0, read90: 0, outbound: 0.25, internalNav: 0, readMeasured: false, measured: true },
      }),
      ga4Page("/sin", {
        views: 900,
        rates: { read50: null, read90: null, outbound: 0.9, internalNav: 0, readMeasured: false, measured: false },
      }),
    ];
    const sig = outboundRate(
      ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ pages, outbound: [{ path: "/sale", domain: "www.brou.com.uy", events: 25 }] })) })
    );
    expect(sig.rows.map((r) => r.path)).toEqual(["/sale"]);
    expect(sig.rows[0]).toMatchObject({ topDomain: "www.brou.com.uy", topDomainShare: 1 });
    expect(sig.groups[0]).toMatchObject({ key: "sin-medicion", count: 1 });
  });
});

describe("not-indexed", () => {
  const row = (path: string) => ({
    path,
    family: "/guias/*",
    checkedAt: "2026-11-20",
    reason: "random" as const,
    verdict: "NEUTRAL",
    coverageState: "Crawled - currently not indexed",
    class: "crawled-not-indexed" as const,
    pending: false,
    pageFetchState: null,
    indexingState: null,
    robotsTxtState: null,
    lastCrawlTime: null,
    googleCanonical: null,
    userCanonical: null,
    crawledAs: null,
    firstSeenInSitemap: null,
    resultLink: null,
  });
  const fam = (share: number | null, randomChecked: number) => ({
    family: "/guias/*",
    localized: false,
    checked: 50,
    indexed: 30,
    byDesign: 0,
    actionable: 20,
    pending: 0,
    randomChecked,
    randomActionable: Math.round((share || 0) * randomChecked),
    shareActionable: share,
    newChecked: 0,
    newIndexed: 0,
    topReason: null,
  });
  it("la severidad sale de la capa al azar", () => {
    const high = notIndexed(
      ctx({ indexation: block("indexation", indexationData({ rows: [row("/guias/a")], families: [fam(0.5, 20)] })) })
    );
    expect(high.severity).toBe("high");
    const med = notIndexed(
      ctx({ indexation: block("indexation", indexationData({ rows: [row("/guias/a")], families: [fam(0.25, 20)] })) })
    );
    expect(med.severity).toBe("medium");
    // una familia con menos de 10 al azar no cuenta, aunque su proporción sea alta
    const few = notIndexed(ctx({ indexation: block("indexation", indexationData({ rows: [row("/guias/a")], families: [fam(0.9, 9)] })) }));
    expect(few.severity).toBe("low");
    expect(few.groups).toEqual([]);
    const none = notIndexed(ctx({ indexation: block("indexation", indexationData()) }));
    expect(none.severity).toBe("none");
  });
});

describe("helpful-no", () => {
  const sig = (p: any) => helpfulNo(ctx({ feedback: block("feedback", feedbackData([p])) }));
  it("personas distintas, respuestas mínimas y tope de severidad media", () => {
    // 3 «No» de un mismo navegador: una persona
    expect(sig({ path: "/a", helpfulYes: 2, helpfulNo: 8, distinctNo: 1 }).rows).toEqual([]);
    // 3 personas pero 9 respuestas
    expect(sig({ path: "/a", helpfulYes: 1, helpfulNo: 8, distinctNo: 3 }).rows).toEqual([]);
    const ok = sig({ path: "/a", helpfulYes: 2, helpfulNo: 8, distinctNo: 3 });
    expect(ok.rows.map((r) => r.path)).toEqual(["/a"]);
    // El impacto es en cargas de Cloudflare, como el denominador: una sola unidad en toda la señal.
    const big = helpfulNo(
      ctx({
        feedback: block("feedback", feedbackData([{ path: "/a", helpfulYes: 2, helpfulNo: 8, distinctNo: 3 }])),
        ga4Behavior: block(
          "ga4Behavior",
          ga4Data({ pages: [ga4Page("/a", { views: 50, events: { ...ga4Page("/a").events!, helpfulViews: 4 } })] })
        ),
        cloudflareRum: block(
          "cloudflareRum",
          cfData({ pages: [{ path: "/a", loads: 9000, visits: 5000, mobile: 6000, desktop: 3000, tablet: 0 }] })
        ),
      })
    );
    expect(big.impactUnit).toBe("cf-loads");
    expect(big.rows[0]).toMatchObject({ impact: 9000, ga4Views: 50, helpfulViews: 4 });
    // 10 respuestas de todos los países sobre 4 vistas uruguayas: la cota se corta en 1.
    expect(big.rows[0].answerRate).toBe(1);
    expect(big.severity).toBe("medium");
  });
});

describe("friction", () => {
  const f = (share: number, sessions: number) => ({ sessionsShare: share, events: 10, sessions });
  it("99 sesiones no; 100 sí; y hacen falta 5 sesiones afectadas", () => {
    const urls = [
      { path: "/a", ...metrics({ sessions: 100, rage: f(0.05, 100) }) },
      { path: "/b", ...metrics({ sessions: 99, rage: f(0.5, 99) }) },
      { path: "/c", ...metrics({ sessions: 120, rage: f(0.033, 120) }) }, // 3,96 sesiones afectadas
      { path: "/d", ...metrics({ sessions: 160, rage: f(0.032, 160) }) }, // 5,12
    ];
    const sig = friction(ctx({ clarity: block("clarity", clarityData({ urls })) }));
    expect(sig.rows.map((r) => r.path).sort()).toEqual(["/a", "/d"]);
    expect(sig.rows.every((r) => r.which === "rage")).toBe(true);
  });
});

describe("bing-only-queries", () => {
  it("Bing con impresiones y Google sin clics; el resumen no cita consultas", () => {
    const bing = {
      siteUrl: "x",
      buckets: [],
      traffic: [],
      pages: [],
      crawl: [],
      issues: [],
      queries: [
        { query: "consulta secreta", impressions: 30, clicks: 1, avgPosition: 5, avgClickPosition: null, weeks: 2 },
        { query: "la manda google", impressions: 50, clicks: 1, avgPosition: 5, avgClickPosition: null, weeks: 2 },
        { query: "poca", impressions: 29, clicks: 0, avgPosition: 5, avgClickPosition: null, weeks: 2 },
      ],
    };
    const gsc = new Map([["la manda google", { clicks: 3, impressions: 90 }]]);
    const sig = bingOnlyQueries(ctx({ bing: block("bing", bing) }, { gscQueries: gsc }));
    expect(sig.rows.map((r) => r.key)).toEqual(["consulta secreta"]);
    expect(sig.summary).not.toMatch(/secreta|google manda/);
    const noArchive = bingOnlyQueries(ctx({ bing: block("bing", bing) }, { gscQueries: null }));
    expect(noArchive.status).toBe("unavailable");
  });
});

describe("ai-crawler-errors y edge-errors", () => {
  const zone = {
    crawlers: [{ crawler: "OAI-SearchBot", requests: 100, ok2xx: 70, notModified304: 0, redirects: 0, errors4xx: 30, errors5xx: 0 }],
    crawlerPaths: [
      { crawler: "OAI-SearchBot", path: "/x", status: 404, requests: 3 },
      { crawler: "OAI-SearchBot", path: "/y", status: 404, requests: 2 },
      { crawler: "ClaudeBot", path: "/z", status: 301, requests: 10 },
      { crawler: "ClaudeBot", path: "/w", status: 301, requests: 9 },
    ],
    errors: [
      { path: "/x", status: 404, requests: 20, crawlerShare: 0.15 },
      { path: "/q", status: 500, requests: 19, crawlerShare: 0 },
    ],
    cache: [],
    statusTotals: [],
  };
  it("errores ≥ 3, redirecciones ≥ 10, severidad por la porción de errores", () => {
    const sig = aiCrawlerErrors(ctx({ cloudflareZone: block("cloudflareZone", zone) }));
    expect(sig.rows.map((r) => r.key).sort()).toEqual(["ClaudeBot|/z|301", "OAI-SearchBot|/x|404"]);
    expect(sig.severity).toBe("high");
    expect(sig.groups[0].label).toMatch(/declarado, user-agent/);
    const edge = edgeErrors(ctx({ cloudflareZone: block("cloudflareZone", zone) }));
    expect(edge.rows.map((r) => r.key)).toEqual(["/x|404"]);
  });
});

describe("estado, novedad y orden", () => {
  it("sin datos: unavailable; datos viejos: stale con severidad tope baja", () => {
    const un = poorVitals(ctx({}));
    expect(un).toMatchObject({ status: "unavailable", severity: "none", rows: [] });
    expect(un.reason).toBe("falta cloudflareRum");
    const cf = cfData({
      pages: [{ path: "/", loads: 9000, visits: 1, mobile: 9000, desktop: 0, tablet: 0 }],
      vitals: [vital("/", "mobile", 100, rated(0, 0, 10))],
    });
    const old = poorVitals(ctx({ cloudflareRum: block("cloudflareRum", cf, { fetchedAt: "2026-11-15T00:00:00Z" }) }));
    expect(old.status).toBe("stale");
    expect(old.severity).toBe("low");
    expect(old.summary).toMatch(/^Datos del 15\/11/);
  });

  it("isNew y newRows contra el snapshot anterior", () => {
    const cf = (paths: string[]) => cfData({ vitals: paths.map((p) => vital(p, "mobile", 100, rated(0, 0, 10))) });
    const first = poorVitals(ctx({ cloudflareRum: block("cloudflareRum", cf(["/a"])) }));
    const previous: any = { signals: [first] };
    const second = poorVitals(ctx({ cloudflareRum: block("cloudflareRum", cf(["/a", "/b"])) }, { previous }));
    expect(second.newRows).toBe(1);
    expect(second.rows.find((r) => r.path === "/b")!.isNew).toBe(true);
    expect(second.rows.find((r) => r.path === "/a")!.isNew).toBe(false);
  });

  it("severidad por la porción de cargas del sitio", () => {
    expect(pageSeverity(500, 10000, 1)).toBe("high");
    expect(pageSeverity(100, 10000, 1)).toBe("medium");
    expect(pageSeverity(1, 10000, 1)).toBe("low");
    expect(pageSeverity(1, 10000, 0)).toBe("none");
  });

  it("buildSignals: siempre las 12, ordenadas", () => {
    const all = buildSignals(ctx({}));
    expect(all.map((s) => s.id).sort()).toEqual([...SIGNAL_IDS].sort());
    const fake = (id: any, status: Signal["status"], severity: Signal["severity"], rows: number, impact: number) =>
      ({ id, status, severity, rows: Array.from({ length: rows }, () => ({})), impact }) as Signal;
    const ordered = orderSignals([
      fake("edge-errors", "unavailable", "none", 0, 0),
      fake("friction", "stale", "low", 2, 9),
      fake("helpful-no", "ok", "none", 0, 0),
      fake("poor-vitals", "ok", "medium", 3, 100),
      fake("consent-gap", "ok", "high", 1, 5),
      fake("mobile-worse", "ok", "medium", 2, 500),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(["consent-gap", "mobile-worse", "poor-vitals", "helpful-no", "friction", "edge-errors"]);
  });
});
