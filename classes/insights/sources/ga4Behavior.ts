// Google Analytics 4: lo que hace la gente en cada página (sólo Uruguay, sólo el sitio).
//
// Lo que `currency-site-analytics` no mira: eventos por página (lectura al 50 %, salidas, navegación
// interna, recomendaciones vistas, "¿Te sirvió?" mostrado), celular contra escritorio por página,
// búsquedas del sitio, recorridos página → página y las dimensiones propias (`content_path`,
// `destination_path`, `link_area`, `placement`, `read_percent`).
//
// TRES TRAMPAS que están resueltas acá y no en cada lector:
// - R3: los eventos propios del sitio sobrescriben `page_location` con la ruta de MEDICIÓN, así que una
//   ruta dinámica llega como `/x/:item` y `page_view` llega con la real. Las tasas por página pliegan las
//   rutas reales en su plantilla (`foldToTemplates`) y lo dicen.
// - R2/R7: una página sin `measurementPath` no manda NINGÚN evento propio. Una tasa de 0 ahí es "sin
//   medición", nunca "nadie lee": `readMeasured`/`measured` lo distinguen.
// - R4: no existe un evento `search`. El buscador manda `search_no_results {q}` y `search_select {q}`, y
//   `q` NO es una dimensión registrada: sin el paso 5.6 del dueño sólo se sabe cuántas, no cuáles.
//
// Nunca se pide una métrica de ingreso ni un evento de anuncios: `tests/insights/ga4_behavior.test.ts`
// lo verifica sobre las consultas armadas.
import { exactDimension, ga4ConfigProblem, ga4Metadata, reportRows, reportTotals, runReports } from "../../site-analytics/ga4";
import type { Ga4Report, Ga4ReportRequest, Ga4Row } from "../../site-analytics/ga4";
import { normalizeGaDate, publicPath } from "../../site-analytics/refresh";
import { SITE_HOSTS } from "../../site-analytics/sourceKinds";
import type { BlockOutcome } from "../blocks";
import {
  DAY_GA4_PAGES,
  GA4_DAILY,
  GA4_LINK_AREAS,
  GA4_MIN_QUOTA_REMAINING,
  GA4_NAV_TARGETS,
  GA4_NO_RESULT_PAGES,
  GA4_NO_RESULT_TERMS,
  GA4_OUTBOUND,
  GA4_PAGE_TERMS,
  GA4_PAGES,
  GA4_PLACEMENTS,
  GA4_SELECT_TERMS,
  GA4_TEMPLATES,
  CONSENT_PAGES,
  GA4_FLOWS,
  THIN_FACTOR,
} from "../caps";
import { foldToTemplates, insightFamily, isSiteHost, sitePath } from "../paths";
import type { DayWindow, DeviceSlice, Ga4BehaviorData, Ga4BehaviorDay, Ga4Events, Ga4PageRow, Ga4Rates, Ga4TemplateRow } from "../types";

export const TRACKED_EVENTS = [
  "page_view",
  "read_progress",
  "helpful_view",
  "helpful_answer",
  "internal_navigation",
  "outbound_click",
  "recommendation_view",
  "related_click",
  "cta_click",
  "external_exit",
  "search_open",
  "search_select",
  "search_no_results",
  "search_results_view",
  "view_search_results",
  "tool_view",
  "form_start",
  "form_submit",
] as const;

/** Eventos que mandan la ruta de MEDICIÓN (plugins/track-clicks y track-reading). */
export const MEASUREMENT_PATH_EVENTS = new Set([
  "read_progress",
  "internal_navigation",
  "outbound_click",
  "recommendation_view",
  "related_click",
  "cta_click",
  "external_exit",
]);

/** Umbrales de "la página está medida" (también en signals.ts, que los publica). */
export const LR_MIN_MEASURED = 20;
export const OR_MIN_MEASURED = 20;

/** Nada de esto se pide nunca (repo público, cero cifras de ingreso). */
export const FORBIDDEN_METRIC_RE = /revenue|adImpressions|adClicks|publisherAd/i;
export const FORBIDDEN_EVENTS = ["ad_impression", "ad_click"];

export const GA4_INACTIVE_PREFIX = "Google Analytics: ";

// ---- filtros y consultas ------------------------------------------------------------------------

const onSite = { filter: { fieldName: "hostName", inListFilter: { values: [...SITE_HOSTS] } } };
const inUy = exactDimension("countryId", "UY");

function filterFor(events?: string | readonly string[]): any {
  const expressions: any[] = [onSite, inUy];
  if (typeof events === "string") expressions.push(exactDimension("eventName", events));
  else if (events) expressions.push({ filter: { fieldName: "eventName", inListFilter: { values: [...events] } } });
  return { andGroup: { expressions } };
}

const m = (...names: string[]) => names.map((name) => ({ name }));
const d = (...names: string[]) => names.map((name) => ({ name }));
const desc = (metricName: string) => [{ metric: { metricName }, desc: true }];

function req(
  range: { start: string; end: string },
  dims: string[],
  metrics: string[],
  limit: number | undefined,
  events?: string | readonly string[]
): Ga4ReportRequest {
  const r: Ga4ReportRequest = {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    metrics: m(...metrics),
    dimensionFilter: filterFor(events),
  };
  if (dims.length) r.dimensions = d(...dims);
  if (limit) r.limit = limit;
  if (dims.length) r.orderBys = desc(metrics[0]);
  return r;
}

export function batch1Requests(w: { start: string; end: string }): Ga4ReportRequest[] {
  const reqs = [
    req(w, ["pagePath"], ["screenPageViews", "sessions", "engagedSessions", "userEngagementDuration"], 2000),
    req(
      w,
      ["pagePath", "deviceCategory"],
      ["screenPageViews", "sessions", "engagedSessions", "userEngagementDuration", "bounceRate"],
      5000
    ),
    req(w, ["landingPage", "deviceCategory"], ["sessions", "engagedSessions", "bounceRate"], 4000),
    req(w, ["pagePath", "eventName"], ["eventCount"], 10000, TRACKED_EVENTS),
    req(w, ["pagePath", "linkDomain"], ["eventCount"], 3000, "outbound_click"),
  ];
  reqs[0].returnPropertyQuota = true;
  return reqs;
}

export function batch2Requests(w: { start: string; end: string }): Ga4ReportRequest[] {
  const daily = req(w, ["date"], ["screenPageViews", "sessions"], 40);
  daily.orderBys = [{ dimension: { dimensionName: "date" } }];
  const reqs = [
    req(w, ["pageReferrer", "pagePath"], ["screenPageViews"], 10000),
    req(w, ["searchTerm"], ["eventCount"], 500, "view_search_results"),
    req(w, ["deviceCategory"], ["sessions", "screenPageViews", "engagedSessions", "userEngagementDuration", "totalUsers"], 10),
    daily,
    req(w, [], ["screenPageViews", "sessions", "engagedSessions", "eventCount"], undefined),
  ];
  reqs[0].returnPropertyQuota = true;
  return reqs;
}

/** 11a–c: EXACTAMENTE el rango del lado Cloudflare (R1, R17). */
export function consentRequests(range: { start: string; end: string }): Ga4ReportRequest[] {
  const reqs = [
    req(range, ["pagePath"], ["screenPageViews"], 2500),
    req(range, ["landingPage"], ["sessions"], 2500),
    req(range, [], ["screenPageViews", "sessions"], undefined),
  ];
  reqs[0].returnPropertyQuota = true;
  return reqs;
}

export type CustomReportId = "read" | "nav" | "exposure" | "searchQ" | "placement";

export const CUSTOM_REPORTS: { id: CustomReportId; dims: string[]; events?: string | readonly string[]; limit: number }[] = [
  { id: "read", dims: ["customEvent:content_path", "customEvent:read_percent"], events: "read_progress", limit: 3000 },
  {
    id: "nav",
    dims: ["customEvent:content_path", "customEvent:destination_path", "customEvent:link_area"],
    events: "internal_navigation",
    limit: 5000,
  },
  { id: "exposure", dims: ["customEvent:content_path", "customEvent:link_area"], events: "recommendation_view", limit: 3000 },
  {
    id: "searchQ",
    dims: ["eventName", "customEvent:q"],
    events: ["search_no_results", "search_select", "search_results_view"],
    limit: 1000,
  },
  { id: "placement", dims: ["customEvent:placement", "eventName"], limit: 200 },
];

/** Sólo las que nombran dimensiones que la propiedad tiene registradas (un batch con una que no, falla entero). */
export function customRequests(
  w: { start: string; end: string },
  available: string[]
): { id: CustomReportId; request: Ga4ReportRequest }[] {
  const have = new Set(available);
  return CUSTOM_REPORTS.filter((c) => c.dims.every((dim) => !dim.startsWith("customEvent:") || have.has(dim))).map((c) => {
    const r = req(w, c.dims, ["eventCount"], c.limit, c.events);
    r.returnPropertyQuota = true;
    return { id: c.id, request: r };
  });
}

// ---- utilidades ---------------------------------------------------------------------------------

const num = (row: Ga4Row, k: string) => {
  const n = Number(row[k]);
  return Number.isFinite(n) ? n : 0;
};
const str = (row: Ga4Row, k: string) => String(row[k] ?? "");
const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10000) / 10000 : null);
const secs = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10) / 10 : null);

export function isTruncated(report: Ga4Report | undefined, limit: number | undefined): boolean {
  const rows = report?.rows?.length || 0;
  const count = Number(report?.rowCount ?? rows);
  return rows < count || (!!limit && rows >= limit);
}

/**
 * El único texto de visitantes que se guarda: un término del buscador del sitio, y sólo si no puede ser
 * un dato personal. Afuera: vacío, `(not set)`, con `@`, con 6 o más dígitos (cédulas, teléfonos), más
 * de 80 caracteres, o con `http`.
 */
export function cleanSearchTerm(raw: unknown): string | null {
  const t = String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  if (!t || t === "(not set)") return null;
  if (t.includes("@")) return null;
  if (t.length > 80) return null;
  if (t.includes("http")) return null;
  // Sin espacios, puntos ni guiones: `1.234.567-8` y `099 123 456` quedan como una tira de dígitos.
  if (/\d{6,}/.test(t.replace(/[\s.\-]/g, ""))) return null;
  return t;
}

function termList(rows: { term: unknown; events: number }[], cap: number): { term: string; events: number }[] {
  const merged = new Map<string, number>();
  for (const r of rows) {
    const t = cleanSearchTerm(r.term);
    if (!t) continue;
    merged.set(t, (merged.get(t) || 0) + r.events);
  }
  return [...merged.entries()]
    .map(([term, events]) => ({ term, events }))
    .sort((a, b) => b.events - a.events || a.term.localeCompare(b.term))
    .slice(0, cap);
}

const emptyEvents = (): Ga4Events => ({
  read50: 0,
  read90: 0,
  readAny: 0,
  outbound: 0,
  internalNav: 0,
  recommendationViews: 0,
  helpfulViews: 0,
  ctaClicks: 0,
});

export function ratesOf(events: Ga4Events, views: number, hasReadPercent: boolean): Ga4Rates {
  return {
    read50: hasReadPercent ? ratio(events.read50, views) : null,
    read90: hasReadPercent ? ratio(events.read90, views) : null,
    outbound: ratio(events.outbound, views),
    internalNav: ratio(events.internalNav, views),
    readMeasured: events.readAny >= LR_MIN_MEASURED,
    measured: events.readAny + events.internalNav + events.outbound + events.recommendationViews >= OR_MIN_MEASURED,
  };
}

// ---- armado (puro) ------------------------------------------------------------------------------

export interface Ga4Reports {
  batch1: Ga4Report[];
  batch2: Ga4Report[];
  consent?: Ga4Report[] | null;
  custom: Partial<Record<CustomReportId, Ga4Report>>;
}

export interface Ga4BuildContext {
  customDimensions: string[];
  /** El rango de consentimiento del lado Cloudflare y sus rutas, en orden. */
  consentRange: { start: string; end: string } | null;
  consentPaths: string[];
  quotaRemaining: number | null;
}

export function buildGa4Behavior(
  reports: Ga4Reports,
  ctx: Ga4BuildContext
): { data: Ga4BehaviorData; truncated: boolean; rowsSeen: Record<string, number> } {
  const [rPages, rDevice, rLanding, rEvents, rOutbound] = reports.batch1;
  const [rFlows, rSearch, rDevices, rDaily, rTotals] = reports.batch2;
  const rowsSeen: Record<string, number> = {};
  const limits = [2000, 5000, 4000, 10000, 3000, 10000, 500, 10, 40, undefined];
  const names = ["pages", "pagesDevice", "landing", "events", "outbound", "flows", "siteSearch", "devices", "daily", "totals"];
  let truncated = false;
  [...reports.batch1, ...reports.batch2].forEach((r, i) => {
    rowsSeen[names[i]] = r?.rows?.length || 0;
    if (limits[i] && isTruncated(r, limits[i])) truncated = true;
  });
  const hasReadPercent = !!reports.custom.read;
  const timeZone = reports.batch1[0]?.metadata?.timeZone || null;

  // páginas reales
  const pages = new Map<string, { path: string; views: number; sessions: number; engaged: number; duration: number }>();
  for (const row of reportRows(rPages)) {
    const path = publicPath(str(row, "pagePath"));
    const e = pages.get(path) || { path, views: 0, sessions: 0, engaged: 0, duration: 0 };
    e.views += num(row, "screenPageViews");
    e.sessions += num(row, "sessions");
    e.engaged += num(row, "engagedSessions");
    e.duration += num(row, "userEngagementDuration");
    pages.set(path, e);
  }

  type Slice = { views: number; sessions: number; engaged: number; duration: number; bounceW: number; landing: number };
  const slices = new Map<string, Slice>();
  const sliceOf = (key: string) => {
    let s = slices.get(key);
    if (!s) {
      s = { views: 0, sessions: 0, engaged: 0, duration: 0, bounceW: 0, landing: 0 };
      slices.set(key, s);
    }
    return s;
  };
  for (const row of reportRows(rDevice)) {
    const s = sliceOf(`${publicPath(str(row, "pagePath"))}|${str(row, "deviceCategory").toLowerCase()}`);
    s.views += num(row, "screenPageViews");
    s.sessions += num(row, "sessions");
    s.engaged += num(row, "engagedSessions");
    s.duration += num(row, "userEngagementDuration");
    s.bounceW += num(row, "bounceRate") * num(row, "sessions");
  }
  const landing = new Map<string, { sessions: number; engaged: number }>();
  for (const row of reportRows(rLanding)) {
    const raw = str(row, "landingPage");
    if (!raw || raw === "(not set)") continue;
    const path = publicPath(raw);
    const dev = str(row, "deviceCategory").toLowerCase();
    sliceOf(`${path}|${dev}`).landing += num(row, "sessions");
    const l = landing.get(path) || { sessions: 0, engaged: 0 };
    l.sessions += num(row, "sessions");
    l.engaged += num(row, "engagedSessions");
    landing.set(path, l);
  }
  const deviceSlice = (path: string, dev: string): DeviceSlice | null => {
    const s = slices.get(`${path}|${dev}`);
    if (!s) return null;
    return {
      views: s.views,
      sessions: s.sessions,
      engagementRate: ratio(s.engaged, s.sessions),
      avgEngagementSec: secs(s.duration, s.sessions),
      bounceRate: s.sessions ? Math.round((s.bounceW / s.sessions) * 10000) / 10000 : null,
      landingSessions: s.landing,
    };
  };

  // eventos por ruta de medición
  const byMeasure = new Map<string, Ga4Events>();
  const measurePaths = new Set<string>();
  const helpfulByPath = new Map<string, number>();
  const eventTotals = new Map<string, number>();
  const noResultPages = new Map<string, number>();
  const evOf = (p: string) => {
    let e = byMeasure.get(p);
    if (!e) {
      e = emptyEvents();
      byMeasure.set(p, e);
    }
    return e;
  };
  for (const row of reportRows(rEvents)) {
    const name = str(row, "eventName");
    if ((FORBIDDEN_EVENTS as string[]).includes(name)) continue;
    const path = publicPath(str(row, "pagePath"));
    const n = num(row, "eventCount");
    eventTotals.set(name, (eventTotals.get(name) || 0) + n);
    if (MEASUREMENT_PATH_EVENTS.has(name)) measurePaths.add(path);
    const e = evOf(path);
    if (name === "read_progress") e.readAny += n;
    else if (name === "outbound_click") e.outbound += n;
    else if (name === "internal_navigation") e.internalNav += n;
    else if (name === "recommendation_view") e.recommendationViews += n;
    else if (name === "cta_click") e.ctaClicks += n;
    else if (name === "helpful_view") {
      e.helpfulViews += n;
      helpfulByPath.set(path, (helpfulByPath.get(path) || 0) + n);
    } else if (name === "search_no_results") noResultPages.set(path, (noResultPages.get(path) || 0) + n);
  }
  for (const row of reportRows(reports.custom.read)) {
    const path = publicPath(str(row, "customEvent:content_path"));
    measurePaths.add(path);
    const pct = str(row, "customEvent:read_percent");
    if (pct === "50") evOf(path).read50 += num(row, "eventCount");
    else if (pct === "90") evOf(path).read90 += num(row, "eventCount");
  }

  const outboundMap = new Map<string, { path: string; domain: string; events: number }>();
  for (const row of reportRows(rOutbound)) {
    const path = publicPath(str(row, "pagePath"));
    measurePaths.add(path);
    const domain = str(row, "linkDomain").toLowerCase() || "(sin dominio)";
    const key = `${path}|${domain}`;
    const e = outboundMap.get(key) || { path, domain, events: 0 };
    e.events += num(row, "eventCount");
    outboundMap.set(key, e);
  }

  // dimensiones propias de navegación
  const areas = new Map<string, { path: string; area: string; navigations: number; exposures: number }>();
  const targets = new Map<string, { path: string; destination: string; area: string; navigations: number }>();
  for (const row of reportRows(reports.custom.nav)) {
    const path = publicPath(str(row, "customEvent:content_path"));
    const destination = publicPath(str(row, "customEvent:destination_path"));
    const area = str(row, "customEvent:link_area") || "(sin área)";
    measurePaths.add(path);
    measurePaths.add(destination);
    const n = num(row, "eventCount");
    const a = areas.get(`${path}|${area}`) || { path, area, navigations: 0, exposures: 0 };
    a.navigations += n;
    areas.set(`${path}|${area}`, a);
    const t = targets.get(`${path}|${destination}|${area}`) || { path, destination, area, navigations: 0 };
    t.navigations += n;
    targets.set(`${path}|${destination}|${area}`, t);
  }
  for (const row of reportRows(reports.custom.exposure)) {
    const path = publicPath(str(row, "customEvent:content_path"));
    const area = str(row, "customEvent:link_area") || "(sin área)";
    measurePaths.add(path);
    const a = areas.get(`${path}|${area}`) || { path, area, navigations: 0, exposures: 0 };
    a.exposures += num(row, "eventCount");
    areas.set(`${path}|${area}`, a);
  }

  // plegado a plantillas (R3)
  const realRows = [...pages.values()].map((p) => ({ path: p.path, views: p.views }));
  const fold = foldToTemplates(realRows, measurePaths);
  const templates: Ga4TemplateRow[] = [...fold.templates.entries()]
    .filter(([, agg]) => agg.views > 0)
    .map(([template, agg]) => {
      const events = { ...(byMeasure.get(template) || emptyEvents()) };
      return {
        template,
        family: insightFamily(template.replace(/:item/g, "x")),
        realPaths: agg.realPaths,
        views: agg.views,
        events,
        rates: ratesOf(events, agg.views, hasReadPercent),
        approx: true as const,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, GA4_TEMPLATES);

  const pageRows: Ga4PageRow[] = [...pages.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, GA4_PAGES)
    .map((p) => {
      const template = fold.assignment.get(p.path) || null;
      const events = template ? null : { ...(byMeasure.get(p.path) || emptyEvents()), helpfulViews: helpfulByPath.get(p.path) || 0 };
      const l = landing.get(p.path);
      return {
        path: p.path,
        family: insightFamily(p.path),
        views: p.views,
        sessions: p.sessions,
        engagementRate: ratio(p.engaged, p.sessions),
        avgEngagementSec: secs(p.duration, p.sessions),
        landingSessions: l?.sessions || 0,
        landingEngagementRate: l ? ratio(l.engaged, l.sessions) : null,
        mobile: deviceSlice(p.path, "mobile"),
        desktop: deviceSlice(p.path, "desktop"),
        template,
        events,
        rates: events ? ratesOf(events, p.views, hasReadPercent) : null,
      };
    });

  // recorridos internos
  const flows = new Map<string, { from: string; to: string; views: number }>();
  let flowsTotalViews = 0;
  for (const row of reportRows(rFlows)) {
    const ref = str(row, "pageReferrer");
    let host = "";
    try {
      host = new URL(ref).hostname;
    } catch {
      continue;
    }
    if (!isSiteHost(host)) continue;
    const from = sitePath(ref);
    const to = publicPath(str(row, "pagePath"));
    if (!from || from === to) continue;
    const v = num(row, "screenPageViews");
    flowsTotalViews += v;
    const key = `${from}|${to}`;
    const e = flows.get(key) || { from, to, views: 0 };
    e.views += v;
    flows.set(key, e);
  }

  // búsquedas
  const searchQRows = reportRows(reports.custom.searchQ);
  const qRegistered = ctx.customDimensions.includes("customEvent:q");
  const termsOf = (event: string) =>
    searchQRows.filter((r) => str(r, "eventName") === event).map((r) => ({ term: r["customEvent:q"], events: num(r, "eventCount") }));

  const placements = new Map<string, { placement: string; event: string; count: number }>();
  for (const row of reportRows(reports.custom.placement)) {
    const placement = str(row, "customEvent:placement");
    const event = str(row, "eventName");
    if (!placement || placement === "(not set)" || (FORBIDDEN_EVENTS as string[]).includes(event)) continue;
    const key = `${placement}|${event}`;
    const e = placements.get(key) || { placement, event, count: 0 };
    e.count += num(row, "eventCount");
    placements.set(key, e);
  }

  // consentimiento
  let consent: Ga4BehaviorData["consent"] = null;
  if (reports.consent && ctx.consentRange) {
    const [cViews, cLanding, cTotals] = reports.consent;
    const cp = new Map<string, { path: string; views: number; landingSessions: number }>();
    const at = (p: string) => {
      let e = cp.get(p);
      if (!e) {
        e = { path: p, views: 0, landingSessions: 0 };
        cp.set(p, e);
      }
      return e;
    };
    const inViews = new Set<string>();
    const inLanding = new Set<string>();
    for (const row of reportRows(cViews)) {
      const p = publicPath(str(row, "pagePath"));
      inViews.add(p);
      at(p).views += num(row, "screenPageViews");
    }
    for (const row of reportRows(cLanding)) {
      const raw = str(row, "landingPage");
      if (!raw || raw === "(not set)") continue;
      const p = publicPath(raw);
      inLanding.add(p);
      at(p).landingSessions += num(row, "sessions");
    }
    const t = reportTotals(cTotals);
    const viewsCut = isTruncated(cViews, 2500);
    const landingCut = isTruncated(cLanding, 2500);
    const consentTruncated = viewsCut || landingCut;
    // Con un reporte cortado, una ruta que no vino en él NO tiene cero: no se sabe. No se rellena con
    // ceros y queda afuera de la lista (consent-gap la salta en vez de inventar un hueco).
    const known = (p: string) => (!viewsCut || inViews.has(p)) && (!landingCut || inLanding.has(p));
    const ordered: { path: string; views: number; landingSessions: number }[] = [];
    const seen = new Set<string>();
    for (const p of ctx.consentPaths) {
      if (seen.has(p) || !known(p)) continue;
      seen.add(p);
      ordered.push(cp.get(p) || { path: p, views: 0, landingSessions: 0 });
    }
    for (const e of [...cp.values()].sort((a, b) => b.landingSessions - a.landingSessions || b.views - a.views)) {
      if (!seen.has(e.path) && known(e.path)) {
        seen.add(e.path);
        ordered.push(e);
      }
    }
    consent = {
      range: { ...ctx.consentRange },
      truncated: consentTruncated,
      totals: { views: num(t, "screenPageViews"), landingSessions: num(t, "sessions") },
      pages: ordered.slice(0, CONSENT_PAGES),
    };
  }

  const totalsRow = reportTotals(rTotals);
  const data: Ga4BehaviorData = {
    customDimensions: [...ctx.customDimensions].sort(),
    timeZone,
    quotaRemaining: ctx.quotaRemaining,
    totals: {
      views: num(totalsRow, "screenPageViews"),
      sessions: num(totalsRow, "sessions"),
      engagedSessions: num(totalsRow, "engagedSessions"),
      eventCount: num(totalsRow, "eventCount"),
    },
    devices: reportRows(rDevices).map((row) => ({
      device: str(row, "deviceCategory").toLowerCase(),
      sessions: num(row, "sessions"),
      views: num(row, "screenPageViews"),
      engagementRate: ratio(num(row, "engagedSessions"), num(row, "sessions")),
      avgEngagementSec: secs(num(row, "userEngagementDuration"), num(row, "sessions")),
      users: num(row, "totalUsers"),
    })),
    daily: reportRows(rDaily)
      .map((row) => ({ day: normalizeGaDate(str(row, "date")), views: num(row, "screenPageViews"), sessions: num(row, "sessions") }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-GA4_DAILY),
    consent,
    pages: pageRows,
    templates,
    events: [...eventTotals.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    outbound: [...outboundMap.values()].sort((a, b) => b.events - a.events).slice(0, GA4_OUTBOUND),
    flows: [...flows.values()].sort((a, b) => b.views - a.views).slice(0, GA4_FLOWS),
    flowsTotalViews,
    linkAreas: [...areas.values()].sort((a, b) => b.navigations + b.exposures - (a.navigations + a.exposures)).slice(0, GA4_LINK_AREAS),
    navTargets: [...targets.values()].sort((a, b) => b.navigations - a.navigations).slice(0, GA4_NAV_TARGETS),
    placements: [...placements.values()].sort((a, b) => b.count - a.count).slice(0, GA4_PLACEMENTS),
    search: {
      qRegistered,
      opens: eventTotals.get("search_open") || 0,
      selects: eventTotals.get("search_select") || 0,
      noResults: eventTotals.get("search_no_results") || 0,
      resultsViews: eventTotals.get("search_results_view") || 0,
      noResultTerms: qRegistered ? termList(termsOf("search_no_results"), GA4_NO_RESULT_TERMS) : [],
      selectTerms: qRegistered ? termList(termsOf("search_select"), GA4_SELECT_TERMS) : [],
      pageTerms: termList(
        reportRows(rSearch).map((r) => ({ term: r.searchTerm, events: num(r, "eventCount") })),
        GA4_PAGE_TERMS
      ),
      noResultPages: [...noResultPages.entries()]
        .map(([path, events]) => ({ path, events }))
        .sort((a, b) => b.events - a.events)
        .slice(0, GA4_NO_RESULT_PAGES),
    },
  };
  return { data, truncated, rowsSeen };
}

/**
 * El reporte de `read_percent` no llegó hoy (cuota baja o falla): se copian los conteos y las tasas de
 * lectura al 50 y al 90 % de la corrida anterior, página por página y plantilla por plantilla. Una
 * página que no estaba en la corrida anterior queda sin el porcentaje (null), nunca en cero.
 */
export function carryRead(data: Ga4BehaviorData, prev: Ga4BehaviorData): Ga4BehaviorData {
  const prevPages = new Map((prev.pages || []).map((p) => [p.path, p]));
  const prevTemplates = new Map((prev.templates || []).map((t) => [t.template, t]));
  const copy = <R extends { events: Ga4Events | null; rates: Ga4Rates | null }>(row: R, old: R | undefined): R => {
    if (!row.events || !row.rates) return row;
    const known = !!old?.events && !!old?.rates && old.rates.read50 !== null;
    return {
      ...row,
      events: { ...row.events, read50: known ? old!.events!.read50 : 0, read90: known ? old!.events!.read90 : 0 },
      rates: { ...row.rates, read50: known ? old!.rates!.read50 : null, read90: known ? old!.rates!.read90 : null },
    } as R;
  };
  return {
    ...data,
    pages: data.pages.map((p) => copy(p, prevPages.get(p.path))),
    templates: data.templates.map((t) => copy(t, prevTemplates.get(t.template))),
  };
}

/** El resumen del día para el archivo. */
export function ga4DayOf(data: Ga4BehaviorData): Ga4BehaviorDay {
  return {
    totals: data.totals,
    pages: data.pages.slice(0, DAY_GA4_PAGES).map((p) => ({
      path: p.path,
      views: p.views,
      sessions: p.sessions,
      engagementRate: p.engagementRate,
      read50: p.events?.read50 || 0,
      outbound: p.events?.outbound || 0,
    })),
  };
}

// ---- la corrida ---------------------------------------------------------------------------------

export interface Ga4Api {
  configProblem: () => string | null;
  metadata: () => Promise<{ dimensions: string[]; metrics: string[] }>;
  runReports: (requests: Ga4ReportRequest[]) => Promise<Ga4Report[]>;
}

export const defaultGa4Api: Ga4Api = {
  configProblem: ga4ConfigProblem,
  metadata: () => ga4Metadata(),
  runReports: (requests) => runReports(requests),
};

export interface Ga4RunInput {
  window: DayWindow;
  consentRange: { start: string; end: string } | null;
  consentPaths: string[];
  prevData: Ga4BehaviorData | null;
  api?: Ga4Api;
}

const quotaOf = (reports: Ga4Report[]): number | null => {
  for (const r of reports) {
    const v = r?.propertyQuota?.tokensPerProjectPerHour?.remaining;
    if (Number.isFinite(Number(v))) return Number(v);
  }
  return null;
};

export async function runGa4Behavior(input: Ga4RunInput): Promise<{ outcome: BlockOutcome<Ga4BehaviorData>; day: Ga4BehaviorDay | null }> {
  const api = input.api ?? defaultGa4Api;
  const problem = api.configProblem();
  if (problem) return { outcome: { kind: "inactive", enableHint: `${GA4_INACTIVE_PREFIX}${problem}` }, day: null };

  const meta = await api.metadata();
  const customDimensions = meta.dimensions.filter((n) => n.startsWith("customEvent:"));
  const w = { start: input.window.start, end: input.window.end };
  const batch1 = await api.runReports(batch1Requests(w));
  let quotaRemaining = quotaOf(batch1);
  const timeZone = batch1[0]?.metadata?.timeZone || null;
  const batch2 = await api.runReports(batch2Requests(w));
  quotaRemaining = quotaOf(batch2) ?? quotaRemaining;

  const carried: string[] = [];
  const notes: string[] = [];
  let consent: Ga4Report[] | null = null;
  let consentRange = input.consentRange;
  // R17: los días de GA4 y de Cloudflare sólo se comparan si los dos se cortan en Montevideo. Una zona
  // que no se informó no se supone: sin ella no se piden los reportes de consentimiento.
  if (timeZone !== "America/Montevideo") {
    if (timeZone) notes.push(`la propiedad GA4 está en ${timeZone}, Cloudflare se corta en America/Montevideo`);
    else if (consentRange) notes.push("la propiedad GA4 no informó su zona horaria: sin comparación de consentimiento");
    consentRange = null;
  } else if (consentRange) {
    try {
      consent = await api.runReports(consentRequests(consentRange));
      quotaRemaining = quotaOf(consent) ?? quotaRemaining;
    } catch {
      carried.push("consent");
      consent = null;
    }
  }

  const custom: Partial<Record<CustomReportId, Ga4Report>> = {};
  for (const c of customRequests(w, customDimensions)) {
    if (quotaRemaining !== null && quotaRemaining < GA4_MIN_QUOTA_REMAINING) {
      carried.push(c.id);
      if (!notes.includes("cuota horaria de GA4 baja")) notes.push("cuota horaria de GA4 baja");
      continue;
    }
    try {
      const [report] = await api.runReports([c.request]);
      custom[c.id] = report;
      quotaRemaining = quotaOf([report]) ?? quotaRemaining;
    } catch {
      carried.push(c.id);
    }
  }
  if (!customDimensions.includes("customEvent:q")) notes.push("registrar la dimensión q para ver los términos sin resultado (paso 5.6)");

  const built = buildGa4Behavior(
    { batch1, batch2, consent, custom },
    { customDimensions, consentRange: consent ? consentRange : null, consentPaths: input.consentPaths, quotaRemaining }
  );
  let data = built.data;
  const prev = input.prevData;
  // Lo que no se pudo traer se copia del bloque anterior, sub-parte por sub-parte.
  const carriedKeys: string[] = [];
  if (prev) {
    if (carried.includes("consent") && prev.consent) {
      data = { ...data, consent: prev.consent };
      carriedKeys.push("consent");
    }
    if (carried.includes("nav")) {
      data = { ...data, navTargets: prev.navTargets, linkAreas: prev.linkAreas };
      carriedKeys.push("navTargets", "linkAreas");
    } else if (carried.includes("exposure")) {
      data = { ...data, linkAreas: prev.linkAreas };
      carriedKeys.push("linkAreas");
    }
    if (carried.includes("placement")) {
      data = { ...data, placements: prev.placements };
      carriedKeys.push("placements");
    }
    if (carried.includes("searchQ")) {
      data = { ...data, search: { ...data.search, noResultTerms: prev.search.noResultTerms, selectTerms: prev.search.selectTerms } };
      carriedKeys.push("search");
    }
    if (carried.includes("read")) data = carryRead(data, prev);
  }
  // "read" queda en carried aunque no haya bloque anterior: low-reading lo lee para no convertir la
  // falta del porcentaje en "ninguna página".
  if (carried.includes("read")) carriedKeys.push("read");
  const note = notes.join(" · ") || null;
  const opts = { window: input.window, truncated: built.truncated, rowsSeen: built.rowsSeen, note };

  if (data.totals.views === 0 || (prev && prev.totals.views > 0 && data.totals.views < prev.totals.views * THIN_FACTOR)) {
    return {
      outcome: {
        kind: "thin",
        data,
        ...opts,
        note: `vistas ${data.totals.views} contra ${prev?.totals.views ?? 0} guardadas: ¿filtro o propiedad rota?`,
      },
      day: null,
    };
  }
  const day = ga4DayOf(data);
  if (carried.length) return { outcome: { kind: "partial", data, carried: carriedKeys.length ? carriedKeys : carried, ...opts }, day };
  return { outcome: { kind: "ok", data, ...opts }, day };
}
