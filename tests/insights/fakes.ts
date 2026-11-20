// Fuentes y store de mentira para refresh.test.ts e inert.test.ts. No es un test.
import type { Ga4Report, Ga4ReportRequest } from "../../classes/site-analytics/ga4";
import { createCfClient } from "../../classes/insights/sources/cloudflare";
import type { HttpLike } from "../../classes/insights/sources/cloudflare";
import { rumGroups } from "../../classes/insights/sources/cloudflareRum";
import type { Ga4Api } from "../../classes/insights/sources/ga4Behavior";
import { emptyState, stateUpdate } from "../../classes/insights/store";
import type { InsightStore, QuotaName, StateKey } from "../../classes/insights/store";
import type { RefreshDeps } from "../../classes/insights/refresh";
import type { InsightState, UsageInsightSnapshot } from "../../classes/insights/types";
import { fixture, report } from "./helpers";

export const SEARCH_TERM = "termino-privado-xyz";
export const BING_QUERY = "consulta-bing-privada";

export function memoryStore() {
  const calls: string[] = [];
  const days = new Map<string, any>();
  let snapshot: UsageInsightSnapshot | null = null;
  let state: InsightState = emptyState();
  const quota: Record<QuotaName, { day: string; used: number }> = { clarity: { day: "", used: 0 }, inspection: { day: "", used: 0 } };
  const lastStateUpdates: Record<string, unknown>[] = [];
  const store: InsightStore = {
    loadSnapshot: async () => (snapshot ? JSON.parse(JSON.stringify(snapshot)) : null),
    loadState: async () => ({ ...JSON.parse(JSON.stringify(state)), quota: JSON.parse(JSON.stringify(quota)) }),
    saveSnapshot: async (s) => {
      calls.push("saveSnapshot");
      snapshot = JSON.parse(JSON.stringify(s));
    },
    saveState: async (s: InsightState, keys: StateKey[]) => {
      calls.push("saveState");
      const upd = stateUpdate(s, keys).$set;
      lastStateUpdates.push(upd);
      const next: any = JSON.parse(JSON.stringify(state));
      for (const [k, v] of Object.entries(upd)) {
        if (k === "key") continue;
        const parts = k.split(".").slice(1);
        let o = next;
        for (const p of parts.slice(0, -1)) o = o[p] = o[p] || {};
        o[parts[parts.length - 1]] = JSON.parse(JSON.stringify(v));
      }
      state = next;
    },
    reserveQuota: async (name, day, max) => {
      calls.push(`reserveQuota:${name}`);
      if (quota[name].day !== day) quota[name] = { day, used: 0 };
      if (quota[name].used >= max) return null;
      return ++quota[name].used;
    },
    loadQuota: async (name, day) => (quota[name].day === day ? quota[name].used : 0),
    saveDaySlices: async (day, slices, signals) => {
      calls.push("saveDaySlices");
      const d = days.get(day) || { day, sources: {}, signals: [] };
      Object.assign(d.sources, slices);
      if (signals) d.signals = signals;
      days.set(day, d);
    },
    loadCfRumDays: async (start, end) =>
      [...days.values()]
        .filter((d) => d.day >= start && d.day <= end && d.sources.cloudflareRum)
        .map((d) => ({ day: d.day, data: d.sources.cloudflareRum.data })),
    loadArchiveTrend: async () => [],
    loadGscQueries: async () => [{ day: "2026-11-15", queries: [{ key: "otra cosa", clicks: 3, impressions: 9 }] }],
    loadDay: async (day) => days.get(day) || null,
    feedbackAggregate: async () => [],
  };
  return {
    store,
    calls,
    days,
    quota,
    lastStateUpdates,
    get snapshot() {
      return snapshot;
    },
    get state() {
      return state;
    },
  };
}

export function cfHttp(zoneAuthz = true): HttpLike {
  return {
    get: async () => ({ status: 200, data: fixture("cf_zone_get") }),
    post: async (_url, body) => {
      const q: string = body.query;
      if (q.includes("zones(")) {
        if (zoneAuthz) return { status: 200, data: fixture("cf_graphql_authz_error") };
        if (q.includes("settings")) return { status: 200, data: fixture("cf_settings_http_zone") };
        return { status: 200, data: fixture("cf_http_requests_ai_crawlers") };
      }
      if (q.includes("settings")) return { status: 200, data: fixture("cf_settings_rum") };
      if (q.includes("requestPath deviceType }") && q.includes("rumPageloadEventsAdaptiveGroups")) {
        const g = rumGroups(fixture("cf_rum_pageloads_by_path").data).map((x: any) => ({
          ...x,
          dimensions: { ...x.dimensions, deviceType: "mobile" },
        }));
        return { status: 200, data: { data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: g }] } } } };
      }
      if (q.includes("refererHost")) return { status: 200, data: fixture("cf_rum_pageloads_by_source") };
      if (q.includes("countryName"))
        return {
          status: 200,
          data: {
            data: {
              viewer: {
                accounts: [
                  { rumPageloadEventsAdaptiveGroups: [{ count: 9000, sum: { visits: 5000 }, dimensions: { countryName: "UY" } }] },
                ],
              },
            },
          },
        };
      if (q.includes("cumulativeLayoutShiftElement")) return { status: 200, data: fixture("cf_rum_webvitals_cls_elements") };
      if (q.includes("interactionToNextPaintElement")) return { status: 200, data: fixture("cf_rum_webvitals_inp_elements") };
      if (q.includes("largestContentfulPaintElement")) return { status: 200, data: fixture("cf_rum_webvitals_lcp_elements") };
      return { status: 200, data: fixture("cf_rum_webvitals_by_path_device") };
    },
  };
}

export function ga4Api(over: Partial<Ga4Api> = {}): Ga4Api {
  return {
    configProblem: () => null,
    metadata: async () => ({ dimensions: ["customEvent:q", "customEvent:content_path", "customEvent:read_percent"], metrics: [] }),
    runReports: async (reqs: Ga4ReportRequest[]): Promise<Ga4Report[]> => {
      const dims = (r: Ga4ReportRequest) => (r.dimensions || []).map((d) => d.name).join(",");
      return reqs.map((r) => {
        const d = dims(r);
        if (d === "pagePath" && r.metrics.length === 4)
          return report(
            ["pagePath"],
            ["screenPageViews", "sessions", "engagedSessions", "userEngagementDuration"],
            [["/", 3000, 2000, 900, 50000]],
            { metadata: { timeZone: "America/Montevideo" } }
          );
        if (d === "eventName,customEvent:q")
          return report(["eventName", "customEvent:q"], ["eventCount"], [["search_no_results", SEARCH_TERM, 12]]);
        if (d === "searchTerm") return report(["searchTerm"], ["eventCount"], [[SEARCH_TERM, 9]]);
        if (d === "pagePath,eventName")
          return report(
            ["pagePath", "eventName"],
            ["eventCount"],
            [
              ["/buscar", "search_no_results", 12],
              ["/buscar", "search_open", 20],
            ]
          );
        if (d === "" && r.metrics.length === 4)
          return report([], ["screenPageViews", "sessions", "engagedSessions", "eventCount"], [[3000, 2000, 900, 5000]]);
        if (d === "" && r.metrics.length === 2) return report([], ["screenPageViews", "sessions"], [[2500, 1800]]);
        return report([], ["eventCount"], []);
      });
    },
    ...over,
  };
}

export function bingHttp() {
  return {
    get: async (url: string) => {
      const m = url.split("/").pop();
      if (m === "GetUserSites") return { status: 200, data: { d: [{ Url: "https://cambio-uruguay.com/" }] } };
      if (m === "GetQueryStats") {
        const f = fixture("bing_query_stats");
        f.d.push({ ...f.d[0], Query: BING_QUERY, Impressions: 500, Clicks: 0 });
        return { status: 200, data: f };
      }
      return { status: 200, data: { d: [] } };
    },
  };
}

export const PASS = {
  ok: true as const,
  result: {
    url: "",
    verdict: "PASS",
    coverageState: "Submitted and indexed",
    robotsTxtState: "ALLOWED",
    indexingState: "INDEXING_ALLOWED",
    lastCrawlTime: null,
    googleCanonical: null,
    userCanonical: null,
    pageFetchState: "SUCCESSFUL",
  },
};

export function deps(over: Partial<RefreshDeps> = {}) {
  const counts = { inspect: 0, clarity: 0, crux: 0, sitemap: 0 };
  const d: Partial<RefreshDeps> = {
    cfClient: () => createCfClient({ http: cfHttp(), tokens: ["t1"], sleep: async () => undefined, minIntervalMs: 0 }),
    ga4: ga4Api(),
    gscProblem: () => null,
    inspect: async () => {
      counts.inspect++;
      return PASS;
    },
    fetchSitemap: async () => {
      counts.sitemap++;
      return Array.from({ length: 250 }, (_, i) => `/guias/g${i}`);
    },
    clarityHttp: {
      get: async () => {
        counts.clarity++;
        return { status: 200, data: fixture("clarity_overall").body };
      },
    },
    bingHttp: bingHttp(),
    cruxHttp: {
      post: async () => {
        counts.crux++;
        return { status: 404, data: fixture("crux_not_found").body };
      },
    },
    cruxSleep: async () => undefined,
    ...over,
  };
  return { deps: d, counts };
}
