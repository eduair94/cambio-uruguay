// Los arreglos de la revisión adversaria del 20/11/2026, cada uno con el caso que lo rompía.
import { describe, expect, it } from "vitest";
import { STATE_SIGNAL_KEYS_MAX } from "../../classes/insights/caps";
import { buildConsentCheck, buildPages, buildTrend } from "../../classes/insights/pages";
import { sitePath } from "../../classes/insights/paths";
import { buildTelegramText } from "../../classes/insights/refresh";
import {
  aiCrawlerErrors,
  bingOnlyQueries,
  consentGap,
  edgeErrors,
  friction,
  lowReading,
  mobileWorse,
  poorVitals,
} from "../../classes/insights/signals";
import type { SignalContext } from "../../classes/insights/signals";
import { buildCfRumBlock } from "../../classes/insights/sources/cloudflareRum";
import { carryRead } from "../../classes/insights/sources/ga4Behavior";
import { planInspections } from "../../classes/insights/sources/indexation";
import type { CfRumDay, DayWindow, InsightSources, SignalId, UsageInsightSnapshot } from "../../classes/insights/types";
import { block, NOW, sources } from "./helpers";
import { cfData, clarityData, ga4Data, ga4Page, metrics } from "./builders";

function ctx(over: Partial<InsightSources>, extra: Partial<SignalContext> = {}): SignalContext {
  const s = sources(over);
  return { sources: s, consentCheck: buildConsentCheck(s), previous: null, now: NOW, siteLoadsUy: 10000, gscQueries: new Map(), ...extra };
}

const zone = (n: number, extraRow?: { path: string; status: number; requests: number }) => ({
  crawlers: [],
  crawlerPaths: [],
  cache: [],
  statusTotals: [],
  errors: [
    ...Array.from({ length: n }, (_, i) => ({ path: `/p${i}`, status: 404, requests: 1000 + i, crawlerShare: 0.5 })),
    ...(extraRow ? [{ ...extraRow, crawlerShare: 0 }] : []),
  ],
});
const zoneWindow: DayWindow = { start: "2026-11-14", end: "2026-11-20", days: 7, tz: "UTC" };

describe("newRows con más filas que las que guarda el snapshot", () => {
  it("las mismas 30 filas dos días seguidos: cero nuevas y ningún Telegram", () => {
    const z = block("cloudflareZone", zone(30), { window: zoneWindow });
    const first = edgeErrors(ctx({ cloudflareZone: z }));
    expect(first.count).toBe(30);
    expect(first.rows.length).toBe(20);
    const previous = { signals: [first] } as unknown as UsageInsightSnapshot;
    const second = edgeErrors(ctx({ cloudflareZone: z }, { previous }));
    expect(second.severity).toBe("high");
    expect(second.newRows).toBe(0);
    const okSources = new Proxy({}, { get: () => ({ status: "ok" }) }) as any;
    const tg = buildTelegramText(
      { day: "2026-11-20", signals: [second], sources: okSources } as unknown as UsageInsightSnapshot,
      { signals: [first], sources: okSources } as unknown as UsageInsightSnapshot
    );
    expect(tg).toBeNull();
  });

  it("con las claves enteras del estado, una fila nueva del puesto 25 sí cuenta", () => {
    const keysOut = new Map<SignalId, string[]>();
    edgeErrors(ctx({ cloudflareZone: block("cloudflareZone", zone(30), { window: zoneWindow }) }, { keysOut }));
    expect(keysOut.get("edge-errors")!.length).toBe(30);
    const previousKeys = Object.fromEntries(keysOut);
    // Una URL nueva con pocos pedidos: queda en el puesto 31, fuera de las 20 del snapshot.
    const z2 = block("cloudflareZone", zone(30, { path: "/nueva", status: 404, requests: 25 }), { window: zoneWindow });
    const second = edgeErrors(ctx({ cloudflareZone: z2 }, { previousKeys }));
    expect(second.count).toBe(31);
    expect(second.newRows).toBe(1);
    expect(second.rows.every((r) => !r.isNew)).toBe(true);
  });

  it("sin estado y con el snapshot anterior cortado, no afirma que nada sea nuevo", () => {
    const z = block("cloudflareZone", zone(30), { window: zoneWindow });
    const first = edgeErrors(ctx({ cloudflareZone: z }));
    const previous = { signals: [first] } as unknown as UsageInsightSnapshot;
    const z2 = block("cloudflareZone", zone(30, { path: "/nueva", status: 404, requests: 5000 }), { window: zoneWindow });
    const second = edgeErrors(ctx({ cloudflareZone: z2 }, { previous }));
    expect(second.newRows).toBe(0);
  });

  it("una lista guardada al tope sólo se compara hasta el tope", () => {
    const stored = Array.from({ length: STATE_SIGNAL_KEYS_MAX }, (_, i) => `/p${i}|404`);
    const sig = edgeErrors(
      ctx({ cloudflareZone: block("cloudflareZone", zone(5), { window: zoneWindow }) }, { previousKeys: { "edge-errors": stored } })
    );
    expect(sig.newRows).toBe(0);
  });
});

describe("low-reading sin el reporte de read_percent", () => {
  const measured = { read50: null, read90: null, outbound: 0, internalNav: 0, readMeasured: true, measured: true };
  const dims = ["customEvent:content_path", "customEvent:read_percent"];

  it("páginas medidas sin porcentaje: no disponible, nunca 'ninguna página'", () => {
    const pages = [ga4Page("/a", { views: 5000, rates: measured }), ga4Page("/b", { views: 900, rates: measured })];
    const sig = lowReading(
      ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ pages, customDimensions: dims }), { status: "partial", carried: ["read"] }) })
    );
    expect(sig.status).toBe("unavailable");
    expect(sig.reason).toMatch(/read_percent/);
    expect(sig.summary).not.toMatch(/Ninguna página/);
  });

  it("sin las dimensiones registradas, el motivo lo dice", () => {
    const pages = [ga4Page("/a", { views: 5000, rates: measured })];
    const sig = lowReading(ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ pages, customDimensions: [] })) }));
    expect(sig.status).toBe("unavailable");
    expect(sig.reason).toMatch(/no tiene registradas/);
  });

  it("si sólo faltan algunas, se cuentan aparte y el resumen lo dice", () => {
    const pages = [
      ga4Page("/a", { views: 5000, rates: measured }),
      ga4Page("/b", { views: 900, rates: { ...measured, read50: 0.05, read90: 0.01 } }),
    ];
    const sig = lowReading(ctx({ ga4Behavior: block("ga4Behavior", ga4Data({ pages, customDimensions: dims })) }));
    expect(sig.status).toBe("ok");
    expect(sig.rows.map((r) => r.path)).toEqual(["/b"]);
    expect(sig.groups.find((g) => g.key === "sin-porcentaje")?.count).toBe(1);
    expect(sig.summary).toMatch(/sin el porcentaje/);
  });

  it("carryRead copia la lectura de la corrida anterior; lo que no estaba queda null", () => {
    const prev = ga4Data({
      pages: [
        ga4Page("/a", {
          views: 4000,
          events: { ...ga4Page("/a").events!, read50: 100, read90: 20, readAny: 300 },
          rates: { read50: 0.025, read90: 0.005, outbound: 0, internalNav: 0, readMeasured: true, measured: true },
        }),
      ],
    });
    const now = ga4Data({
      pages: [ga4Page("/a", { views: 5000, rates: measured }), ga4Page("/nueva", { views: 900, rates: measured })],
    });
    const out = carryRead(now, prev);
    expect(out.pages[0].rates).toMatchObject({ read50: 0.025, read90: 0.005, readMeasured: true });
    expect(out.pages[0].events).toMatchObject({ read50: 100, read90: 20 });
    expect(out.pages[1].rates!.read50).toBeNull();
    const sig = lowReading(
      ctx({ ga4Behavior: block("ga4Behavior", { ...out, customDimensions: dims }, { status: "partial", carried: ["read"] }) })
    );
    expect(sig.status).toBe("ok");
    expect(sig.severity).toBe("low");
    expect(sig.reason).toMatch(/corrida anterior/);
  });
});

describe("zona horaria de GA4 que no se informó", () => {
  it("no se supone Montevideo: consentimiento no usable y tendencia sin cobertura", () => {
    const range = { start: "2026-11-01", end: "2026-11-19" };
    const s = sources({
      cloudflareRum: block(
        "cloudflareRum",
        cfData({
          daily: [{ day: "2026-11-18", loadsUy: 100, visitsUy: 80, loadsAll: 200, sampleInterval: 1 }],
          consent: { range, days: 19, totals: { loads: 2000, visits: 1000, realVisits: 1000 }, pages: [] },
        })
      ),
      ga4Behavior: block(
        "ga4Behavior",
        ga4Data({
          timeZone: null,
          daily: [{ day: "2026-11-18", views: 50, sessions: 40 }],
          consent: { range, truncated: false, totals: { views: 900, landingSessions: 500 }, pages: [] },
        })
      ),
    });
    const cc = buildConsentCheck(s);
    expect(cc.usable).toBe(false);
    expect(cc.reason).toMatch(/no informó su zona horaria/);
    const trend = buildTrend(s, "2026-11-20");
    expect(trend.coverage.every((c) => c === null)).toBe(true);
  });
});

describe("listas cortadas en la comparación de consentimiento", () => {
  const range = { start: "2026-11-01", end: "2026-11-19" };
  const cf = (over: any = {}) =>
    cfData({
      pages: [{ path: "/falta", loads: 2000, visits: 1000, mobile: 1000, desktop: 1000, tablet: 0 }],
      consent: {
        range,
        days: 19,
        totals: { loads: 20000, visits: 10000, realVisits: 10000 },
        pages: [{ path: "/falta", loads: 2000, visits: 1000, realVisits: 1000 }],
        ...over,
      },
    });
  const ga = (truncated: boolean) => ga4Data({ consent: { range, truncated, totals: { views: 12000, landingSessions: 5000 }, pages: [] } });

  it("una ruta que no vino en un reporte de GA4 cortado se salta, no es un hueco", () => {
    const s = { cloudflareRum: block("cloudflareRum", cf()), ga4Behavior: block("ga4Behavior", ga(true)) };
    const sig = consentGap(ctx(s));
    expect(sig.status).toBe("ok");
    expect(sig.rows).toEqual([]);
    expect(sig.summary).toMatch(/1 rutas sin comparar/);
    expect(buildConsentCheck(sources(s)).ga4Truncated).toBe(true);
    const pages = buildPages(sources(s), [sig], buildConsentCheck(sources(s)));
    expect(pages.find((p) => p.path === "/falta")!.coverage).toBeNull();
    // Sin corte, la misma ruta ausente SÍ es cero entradas.
    const full = consentGap(ctx({ cloudflareRum: block("cloudflareRum", cf()), ga4Behavior: block("ga4Behavior", ga(false)) }));
    expect(full.rows.map((r) => r.path)).toEqual(["/falta"]);
  });

  it("un día con la lista de Cloudflare cortada y sin total deja la comparación no usable", () => {
    const s = sources({
      cloudflareRum: block("cloudflareRum", cf({ pagesTruncated: true, totalsUndercount: true })),
      ga4Behavior: block("ga4Behavior", ga(false)),
    });
    const cc = buildConsentCheck(s);
    expect(cc.usable).toBe(false);
    expect(cc.cfPagesTruncated).toBe(true);
    expect(cc.reason).toMatch(/cortó la lista de páginas/);
  });
});

describe("el bloque de 28 días con días a medias", () => {
  const W: DayWindow = { start: "2026-10-24", end: "2026-11-20", days: 28, tz: "America/Montevideo" };
  const day = (over: Partial<CfRumDay> = {}): CfRumDay => ({
    suspect: false,
    sampleInterval: 1,
    totals: { uy: { loads: 1000, visits: 500 }, all: { loads: 2000, visits: 1000 } },
    pagesByDevice: [{ path: "/", device: "mobile", loads: 1000, visits: 500 }],
    referrers: [],
    countries: [{ country: "UY", loads: 1000, visits: 500 }],
    vitals: [
      {
        path: "/",
        device: "mobile",
        samples: 100,
        sampleInterval: 1,
        lcp: [100, 0, 0],
        inp: [100, 0, 0],
        cls: [100, 0, 0],
        fcp: [100, 0, 0],
        ttfb: [100, 0, 0],
        p75: { lcpMs: 1000, inpMs: 50, cls: 0.01, fcpMs: null, ttfbMs: null },
      },
    ],
    elements: [],
    ...over,
  });

  it("un día sin countries no infla la porción uruguaya; uno sin vitals no suma ceros", () => {
    const archived = [
      { day: "2026-11-19", data: day() },
      {
        day: "2026-11-20",
        data: day({
          missing: ["countries", "vitals"],
          totals: { uy: { loads: 1000, visits: 500 }, all: { loads: 0, visits: 0 } },
          vitals: [],
        }),
      },
    ];
    const b = buildCfRumBlock(archived, W, "2026-11-20");
    expect(b.totals.uy.loads).toBe(2000);
    expect(b.totals.all.loads).toBe(2000);
    expect(b.totals.uyShare).toBe(0.5);
    expect(b.partialDays).toEqual({ countries: 1, vitals: 1, pagesTruncated: 0, totalsUndercount: 0 });
    expect(b.vitals[0].samples).toBe(100);
  });

  it("marca el corte de páginas y el total que falta en el rango de consentimiento", () => {
    const archived = Array.from({ length: 9 }, (_, i) => ({
      day: `2026-11-${String(12 + i).padStart(2, "0")}`,
      data: i === 3 ? day({ pagesTruncated: true, missing: ["totals"] }) : day(),
    }));
    const b = buildCfRumBlock(archived, W, "2026-11-20");
    expect(b.consent?.pagesTruncated).toBe(true);
    expect(b.consent?.totalsUndercount).toBe(true);
    expect(b.partialDays?.totalsUndercount).toBe(1);
  });

  it("poor-vitals sin ninguna fila de vitals: no disponible, no 'ninguna página'", () => {
    const cf = cfData({ pages: [{ path: "/", loads: 9000, visits: 1, mobile: 9000, desktop: 0, tablet: 0 }], vitals: [] });
    const sig = poorVitals(ctx({ cloudflareRum: block("cloudflareRum", cf) }));
    expect(sig.status).toBe("unavailable");
    expect(sig.reason).toMatch(/Web Vitals/);
  });
});

describe("severidad en la unidad del impacto", () => {
  it("vistas de GA4 se miden contra las vistas de GA4 del sitio, no contra cargas de Cloudflare", () => {
    const dev = (views: number, er: number) => ({
      views,
      sessions: views,
      engagementRate: er,
      avgEngagementSec: 30,
      bounceRate: null,
      landingSessions: 0,
    });
    const pages = [ga4Page("/peor", { views: 600, mobile: dev(600, 0.2), desktop: dev(200, 0.6) })];
    // 600 vistas de celular sobre 10.000 vistas del sitio = 6 %: alta. Contra 100.000 cargas sería baja.
    const sig = mobileWorse(
      ctx(
        {
          ga4Behavior: block(
            "ga4Behavior",
            ga4Data({ pages, totals: { views: 10000, sessions: 8000, engagedSessions: 4000, eventCount: 1 } })
          ),
        },
        { siteLoadsUy: 100000 }
      )
    );
    expect(sig.impactUnit).toBe("ga4-views");
    expect(sig.severity).toBe("high");
  });
});

describe("friction: personas, no bots, y de qué países es cada fila", () => {
  it("resta las sesiones de bots y rotula la población", () => {
    const f = (share: number, sessions: number) => ({ sessionsShare: share, events: 10, sessions });
    const urlsUy = [{ path: "/a", ...metrics({ sessions: 150, botSessions: 60, rage: f(0.2, 150) }) }];
    const urlDevice = [{ path: "/b", device: "mobile", ...metrics({ sessions: 300, botSessions: 10, rage: f(0.2, 300) }) }];
    const sig = friction(ctx({ clarity: block("clarity", clarityData({ urls: [], urlsUy, urlDevice })) }));
    // /a: 150 − 60 = 90 sesiones de personas, debajo de 100.
    expect(sig.rows.map((r) => r.path)).toEqual(["/b"]);
    expect(sig.rows[0]).toMatchObject({ sessions: 290, population: "todos los países" });
  });
});

describe("ventana de la zona en los resúmenes", () => {
  it("dice los días que de verdad cubrió la consulta", () => {
    const z = {
      crawlers: [{ crawler: "GPTBot", requests: 10, ok2xx: 0, notModified304: 0, redirects: 0, errors4xx: 10, errors5xx: 0 }],
      crawlerPaths: [{ crawler: "GPTBot", path: "/x", status: 404, requests: 10 }],
      errors: [{ path: "/x", status: 404, requests: 40, crawlerShare: 0.25 }],
      cache: [],
      statusTotals: [],
    };
    const one: DayWindow = { start: "2026-11-20", end: "2026-11-20", days: 1, tz: "UTC" };
    const zb = block("cloudflareZone", z, { window: one });
    expect(aiCrawlerErrors(ctx({ cloudflareZone: zb })).summary).toMatch(/en 1 día/);
    const edge = edgeErrors(ctx({ cloudflareZone: zb }));
    expect(edge.summary).toMatch(/en 1 día/);
    expect(edge.summary).toMatch(/personas y bots/);
    expect(edge.summary).toMatch(/25 % de rastreadores/);
    expect(edge.title).toMatch(/personas y bots/);
  });
});

describe("bing-only-queries con Bing conservado", () => {
  const bing = {
    siteUrl: "x",
    buckets: [],
    traffic: [],
    pages: [],
    crawl: [],
    issues: [],
    queries: [{ query: "algo", impressions: 40, clicks: 0, avgPosition: 3, avgClickPosition: null, weeks: 1 }],
  };
  it("Bing viejo y Search Console leído: stale con sus filas", () => {
    const old = block("bing", bing, { status: "failed", ok: false, fetchedAt: "2026-11-01T00:00:00Z" });
    const sig = bingOnlyQueries(ctx({ bing: old }, { gscQueries: new Map() }));
    expect(sig.status).toBe("stale");
    expect(sig.rows.map((r) => r.key)).toEqual(["algo"]);
  });
  it("sin base el motivo no dice que la lectura falló", () => {
    const sig = bingOnlyQueries(ctx({ bing: block("bing", bing) }, { gscQueries: null, gscUnavailable: "sin base del app" }));
    expect(sig.status).toBe("unavailable");
    expect(sig.reason).toBe("sin base del app");
  });
});

describe("plan de inspección: las nuevas son en castellano", () => {
  it("una página nueva publicada en 38 idiomas no llena la capa de nuevas", () => {
    const locales = ["en", "pt", "fr", "de", "it", "nl", "ca", "ro", "pl", "cs"];
    const sitemap = ["/guia-nueva", ...locales.map((l) => `/${l}/guia-nueva`), "/otra-nueva", "/vieja"];
    const plan = planInspections({
      sitemapPaths: sitemap,
      firstSeenOf: (p) => (p === "/vieja" ? "2026-10-01" : "2026-11-18"),
      seededAt: "2026-10-01",
      lastInspected: new Map(),
      trafficRank: [],
      budget: 5,
      day: "2026-11-20",
    });
    const fresh = plan.filter((x) => x.reason === "new").map((x) => x.path);
    expect(fresh.sort()).toEqual(["/guia-nueva", "/otra-nueva"]);
  });
});

describe("rutas con barra invertida o caracteres de control", () => {
  it("sitePath las descarta", () => {
    expect(sitePath("/\\evil.com")).toBeNull();
    expect(sitePath("https://cambio-uruguay.com/\\evil.com")).toBeNull();
    expect(sitePath("/a\u0000b")).toBeNull();
    expect(sitePath("/dolar-hoy")).toBe("/dolar-hoy");
  });
});
