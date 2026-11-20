// Cloudflare, los pedidos al borde (`httpRequestsAdaptiveGroups`): qué rastreadores de IA piden qué
// páginas, cuáles reciben un error o una redirección, qué URLs le dan error a la gente y qué se sirve
// desde la caché.
//
// INERTE hasta que uno de los dos tokens tenga Zone → Analytics → Read: hoy el token contesta `authz`
// (verificado el 2026-11-20). Eso no es una falla: se registra una línea y la fuente queda `inactive`.
//
// PRIVACIDAD: nunca se seleccionan `clientIP`, `clientAsn`, `clientASNDescription`, `ja3Hash`, `ja4`,
// `sessionIdHash`, `clientRequestQuery` ni `clientRequestReferer`, y el user-agent crudo nunca se
// guarda: se reduce a una etiqueta en código (`labelCrawler`). Los user-agents se pueden falsificar, así
// que todo lo que sale de acá dice "declarado (user-agent)".
import { SITE_HOSTS } from "../../site-analytics/sourceKinds";
import type { BlockOutcome } from "../blocks";
import { mergeCarried } from "../blocks";
import { ZONE_CACHE, ZONE_CRAWLER_PATHS, ZONE_CRAWLERS, ZONE_ERRORS, ZONE_STATUS_TOTALS } from "../caps";
import { sitePath } from "../paths";
import type { CfZoneData, DayWindow } from "../types";
import { CfAuthzError, fieldAvailable } from "./cloudflare";
import type { CfClient } from "./cloudflare";

export const ZONE_ENABLE_HINT = "Agregar el permiso Zona → Analytics → Leer al token (paso 5.3 de docs/analytics/USAGE_INSIGHTS.md)";
export const ZONE_INACTIVE_LINE = "[usage-insights] cloudflareZone: inactivo — el token no tiene Zone → Analytics → Read";

/**
 * Etiqueta → patrón `userAgent_like`. Google-Extended NO está: es un token de robots.txt, no un
 * user-agent que pida páginas; el que pide es Googlebot (R13).
 */
export const CRAWLERS: readonly { label: string; pattern: string }[] = Object.freeze([
  { label: "GPTBot", pattern: "%GPTBot%" },
  { label: "OAI-SearchBot", pattern: "%OAI-SearchBot%" },
  { label: "ChatGPT-User", pattern: "%ChatGPT-User%" },
  { label: "PerplexityBot", pattern: "%PerplexityBot%" },
  { label: "Perplexity-User", pattern: "%Perplexity-User%" },
  { label: "ClaudeBot", pattern: "%ClaudeBot%" },
  { label: "Claude-User", pattern: "%Claude-User%" },
  { label: "Claude-SearchBot", pattern: "%Claude-SearchBot%" },
  { label: "Googlebot", pattern: "%Googlebot%" },
  { label: "bingbot", pattern: "%bingbot%" },
  { label: "Applebot", pattern: "%Applebot%" },
  { label: "Bytespider", pattern: "%Bytespider%" },
  { label: "CCBot", pattern: "%CCBot%" },
  { label: "meta-externalagent", pattern: "%meta-externalagent%" },
]);

/** Un user-agent crudo → su etiqueta, o null. El crudo no se guarda nunca. */
export function labelCrawler(ua: string): string | null {
  const s = String(ua || "").toLowerCase();
  for (const c of CRAWLERS) {
    if (s.includes(c.pattern.replace(/%/g, "").toLowerCase())) return c.label;
  }
  return null;
}

export const ZONE_PARTS = ["crawlerTotals", "crawlerPaths", "errors", "cache", "statusTotals"] as const;
export type ZonePart = (typeof ZONE_PARTS)[number];

const FORBIDDEN_FIELDS = [
  "clientIP",
  "clientAsn",
  "clientASNDescription",
  "ja3Hash",
  "ja4",
  "sessionIdHash",
  "clientRequestQuery",
  "clientRequestReferer",
];

const ZONE_TYPE = "ZoneHttpRequestsAdaptiveGroupsFilter_InputObject";

function zoneWrap(dims: string, limit: number): string {
  return (
    `query($zone: string!, $filter: ${ZONE_TYPE}!) { viewer { zones(filter: { zoneTag: $zone }) { ` +
    `httpRequestsAdaptiveGroups(limit: ${limit}, filter: $filter, orderBy: [count_DESC]) { count avg { sampleInterval } dimensions { ${dims} } } } } }`
  );
}

export const ZONE_SETTINGS_QUERY =
  "query($zone: string!) { viewer { zones(filter: { zoneTag: $zone }) { settings { " +
  "httpRequestsAdaptiveGroups { enabled maxDuration notOlderThan maxPageSize availableFields } } } } }";

/** Últimos 7 días UTC completos, acortados a `maxDuration` si es menor. */
export function zoneWindow(now: Date, maxDurationSec: number | null): { geq: string; lt: string; window: DayWindow } {
  const today = now.toISOString().slice(0, 10);
  const lt = `${today}T00:00:00Z`;
  let days = 7;
  if (maxDurationSec && maxDurationSec > 0) days = Math.max(1, Math.min(7, Math.floor(maxDurationSec / 86400)));
  const start = new Date(Date.parse(lt) - days * 86400000).toISOString().slice(0, 10);
  const end = new Date(Date.parse(lt) - 86400000).toISOString().slice(0, 10);
  return { geq: `${start}T00:00:00Z`, lt, window: { start, end, days, tz: "UTC" } };
}

/** Las consultas, con los campos que `availableFields` no lista ya sacados. Exportado para el test. */
export function zoneQueries(geq: string, lt: string, available: string[] | null): Record<ZonePart, { query: string; filter: any }> {
  const base = { datetime_geq: geq, datetime_lt: lt, requestSource: "eyeball", clientRequestHTTPHost: SITE_HOSTS[0] };
  const crawlerOr = { OR: CRAWLERS.map((c) => ({ userAgent_like: c.pattern })) };
  const dims = (...names: string[]) => names.filter((n) => fieldAvailable(available, n)).join(" ");
  return {
    crawlerTotals: { query: zoneWrap(dims("userAgent", "edgeResponseStatus"), 2000), filter: { ...base, ...crawlerOr } },
    crawlerPaths: {
      query: zoneWrap(dims("userAgent", "clientRequestPath", "edgeResponseStatus"), 2000),
      filter: { ...base, ...crawlerOr, edgeResponseStatus_geq: 300 },
    },
    errors: { query: zoneWrap(dims("clientRequestPath", "edgeResponseStatus"), 500), filter: { ...base, edgeResponseStatus_geq: 400 } },
    cache: { query: zoneWrap(dims("clientRequestPath", "cacheStatus"), 2000), filter: { ...base, edgeResponseContentTypeName: "html" } },
    statusTotals: { query: zoneWrap(dims("edgeResponseStatus"), 100), filter: base },
  };
}

export { FORBIDDEN_FIELDS as ZONE_FORBIDDEN_FIELDS };

export function zoneGroups(data: any): any[] {
  const z = data?.viewer?.zones?.[0] ?? data?.data?.viewer?.zones?.[0];
  return Array.isArray(z?.httpRequestsAdaptiveGroups) ? z.httpRequestsAdaptiveGroups : [];
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const share = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10000) / 10000 : null);
const isRedirect = (s: number) => s >= 300 && s < 400 && s !== 304;

export function parseCrawlerTotals(groups: any[]): CfZoneData["crawlers"] {
  const agg = new Map<string, CfZoneData["crawlers"][number]>();
  for (const g of groups) {
    const label = labelCrawler(g?.dimensions?.userAgent);
    if (!label) continue;
    const status = num(g?.dimensions?.edgeResponseStatus);
    const n = num(g?.count);
    const e = agg.get(label) || { crawler: label, requests: 0, ok2xx: 0, notModified304: 0, redirects: 0, errors4xx: 0, errors5xx: 0 };
    e.requests += n;
    if (status >= 200 && status < 300) e.ok2xx += n;
    else if (status === 304) e.notModified304 += n;
    else if (isRedirect(status)) e.redirects += n;
    else if (status >= 400 && status < 500) e.errors4xx += n;
    else if (status >= 500) e.errors5xx += n;
    agg.set(label, e);
  }
  return [...agg.values()].sort((a, b) => b.requests - a.requests).slice(0, ZONE_CRAWLERS);
}

export function parseCrawlerPaths(groups: any[]): CfZoneData["crawlerPaths"] {
  const agg = new Map<string, CfZoneData["crawlerPaths"][number]>();
  for (const g of groups) {
    const label = labelCrawler(g?.dimensions?.userAgent);
    const status = num(g?.dimensions?.edgeResponseStatus);
    // 304 no es una redirección: es "no cambió", la respuesta buena a un pedido condicional.
    if (!label || status < 300 || status === 304) continue;
    const path = sitePath(g?.dimensions?.clientRequestPath);
    if (!path) continue;
    const key = `${label}|${path}|${status}`;
    const e = agg.get(key) || { crawler: label, path, status, requests: 0 };
    e.requests += num(g?.count);
    agg.set(key, e);
  }
  return [...agg.values()].sort((a, b) => b.requests - a.requests).slice(0, ZONE_CRAWLER_PATHS);
}

export function parseErrors(groups: any[], crawlerPaths: CfZoneData["crawlerPaths"]): CfZoneData["errors"] {
  const agg = new Map<string, { path: string; status: number; requests: number }>();
  for (const g of groups) {
    const status = num(g?.dimensions?.edgeResponseStatus);
    if (status < 400) continue;
    const path = sitePath(g?.dimensions?.clientRequestPath);
    if (!path) continue;
    const key = `${path}|${status}`;
    const e = agg.get(key) || { path, status, requests: 0 };
    e.requests += num(g?.count);
    agg.set(key, e);
  }
  const byCrawler = new Map<string, number>();
  for (const c of crawlerPaths) byCrawler.set(`${c.path}|${c.status}`, (byCrawler.get(`${c.path}|${c.status}`) || 0) + c.requests);
  return [...agg.values()]
    .sort((a, b) => b.requests - a.requests)
    .slice(0, ZONE_ERRORS)
    .map((e) => ({ ...e, crawlerShare: share(Math.min(byCrawler.get(`${e.path}|${e.status}`) || 0, e.requests), e.requests) }));
}

export function parseCache(groups: any[]): CfZoneData["cache"] {
  const agg = new Map<string, { path: string; requests: number; hit: number; dynamic: number }>();
  for (const g of groups) {
    const path = sitePath(g?.dimensions?.clientRequestPath);
    if (!path) continue;
    const status = String(g?.dimensions?.cacheStatus || "").toLowerCase();
    const e = agg.get(path) || { path, requests: 0, hit: 0, dynamic: 0 };
    const n = num(g?.count);
    e.requests += n;
    if (status === "hit") e.hit += n;
    if (status === "dynamic") e.dynamic += n;
    agg.set(path, e);
  }
  return [...agg.values()]
    .sort((a, b) => b.requests - a.requests)
    .slice(0, ZONE_CACHE)
    .map((e) => ({ path: e.path, requests: e.requests, hitShare: share(e.hit, e.requests), dynamicShare: share(e.dynamic, e.requests) }));
}

export function parseStatusTotals(groups: any[]): CfZoneData["statusTotals"] {
  const agg = new Map<number, number>();
  for (const g of groups) {
    const s = num(g?.dimensions?.edgeResponseStatus);
    agg.set(s, (agg.get(s) || 0) + num(g?.count));
  }
  return [...agg.entries()]
    .map(([status, requests]) => ({ status, requests }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, ZONE_STATUS_TOTALS);
}

export const emptyZoneData = (): CfZoneData => ({ crawlers: [], crawlerPaths: [], errors: [], cache: [], statusTotals: [] });

export interface ZoneRunResult {
  outcome: BlockOutcome<CfZoneData>;
  inactiveLine: boolean;
}

export async function runCloudflareZone(client: CfClient, now: Date, prevData: CfZoneData | null): Promise<ZoneRunResult> {
  if (!client.hasTokens()) {
    return {
      outcome: {
        kind: "inactive",
        enableHint: "Falta CLOUDFLARE_TOKEN o CLOUDFLARE_ANALYTICS_TOKEN, con Zone → Analytics → Read (paso 5.3)",
      },
      inactiveLine: true,
    };
  }
  const vars = { zone: client.zoneId };
  let available: string[] | null = null;
  let maxDuration: number | null = null;
  try {
    const res = await client.graphql(ZONE_SETTINGS_QUERY, vars, "zone");
    const s = res.data?.viewer?.zones?.[0]?.settings?.httpRequestsAdaptiveGroups;
    if (Array.isArray(s?.availableFields)) available = s.availableFields.map(String);
    if (Number.isFinite(Number(s?.maxDuration))) maxDuration = Number(s.maxDuration);
  } catch (e) {
    if (e instanceof CfAuthzError) return { outcome: { kind: "inactive", enableHint: ZONE_ENABLE_HINT }, inactiveLine: true };
    // Sin settings se sigue con la ventana por defecto.
  }
  const w = zoneWindow(now, maxDuration);
  const queries = zoneQueries(w.geq, w.lt, available);
  const raw: Partial<Record<ZonePart, any[]>> = {};
  const failed: ZonePart[] = [];
  const rowsSeen: Record<string, number> = {};
  let truncated = false;
  const limits: Record<ZonePart, number> = { crawlerTotals: 2000, crawlerPaths: 2000, errors: 500, cache: 2000, statusTotals: 100 };
  for (const part of ZONE_PARTS) {
    try {
      const res = await client.graphql(queries[part].query, { ...vars, filter: queries[part].filter }, "zone");
      raw[part] = zoneGroups(res.data);
      rowsSeen[part] = raw[part]!.length;
      if (raw[part]!.length >= limits[part]) truncated = true;
    } catch (e) {
      if (e instanceof CfAuthzError) {
        if (part === ZONE_PARTS[0]) return { outcome: { kind: "inactive", enableHint: ZONE_ENABLE_HINT }, inactiveLine: true };
        failed.push(part);
        continue;
      }
      // Un campo que el plan gratis no tiene, o una ventana rechazada: sólo esa sub-parte.
      if ((e as any)?.name === "CfBudgetError") throw e;
      failed.push(part);
    }
  }
  const crawlerPaths = parseCrawlerPaths(raw.crawlerPaths || []);
  const fresh: CfZoneData = {
    crawlers: parseCrawlerTotals(raw.crawlerTotals || []),
    crawlerPaths,
    errors: parseErrors(raw.errors || [], crawlerPaths),
    cache: parseCache(raw.cache || []),
    statusTotals: parseStatusTotals(raw.statusTotals || []),
  };
  const carriedKeys = failed.map((p) => (p === "crawlerTotals" ? "crawlers" : p));
  const data = mergeCarried(fresh as any, prevData as any, carriedKeys) as CfZoneData;
  if (failed.length === ZONE_PARTS.length)
    return { outcome: { kind: "failed", note: "cloudflareZone: fallaron todas las consultas" }, inactiveLine: false };
  const total = (raw.statusTotals || []).reduce((s, g) => s + num(g?.count), 0);
  if (!failed.includes("statusTotals") && total === 0) {
    return {
      outcome: { kind: "thin", data, window: w.window, truncated, rowsSeen, note: "cero pedidos en 7 días: ¿filtro de host roto?" },
      inactiveLine: false,
    };
  }
  if (failed.length) {
    return { outcome: { kind: "partial", data, carried: carriedKeys, window: w.window, truncated, rowsSeen }, inactiveLine: false };
  }
  return { outcome: { kind: "ok", data, window: w.window, truncated, rowsSeen }, inactiveLine: false };
}
