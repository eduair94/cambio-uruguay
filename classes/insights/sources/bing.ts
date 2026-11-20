// Bing Webmaster Tools API: qué buscan en Bing (que además alimenta la búsqueda de ChatGPT), qué
// páginas aparecen y qué errores de rastreo ve Bing.
//
// INERTE hasta que exista `BING_WEBMASTER_API_KEY` (paso 5.2 del doc): cero llamadas y una línea.
//
// LA CLAVE VIAJA EN LA QUERY STRING (`apikey=`), así que un error de axios la lleva en
// `config.params.apikey` y en `request.path`. Nada de acá pasa un error a texto salvo `sanitizeError`.
//
// Los datos vienen en baldes SEMANALES fechados (sin parámetros de rango): se suman los últimos 4
// baldes por consulta y por página, con posiciones ponderadas por impresiones.
import axios from "axios";

import { sitePath } from "../paths";
import type { BlockOutcome } from "../blocks";
import { BING_BUCKETS, BING_CRAWL, BING_ISSUES, BING_PAGES, BING_QUERIES, BING_TRAFFIC, THIN_FACTOR } from "../caps";
import type { BingData } from "../types";

export const BING_API = "https://ssl.bing.com/webmaster/api.svc/json";
export const BING_ENABLE_HINT = "Falta BING_WEBMASTER_API_KEY en el .env del servidor (docs/analytics/USAGE_INSIGHTS.md, «Bing»)";
export const BING_INACTIVE_LINE = "[usage-insights] bing: inactivo — falta BING_WEBMASTER_API_KEY";

export function bingConfigProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  return String(env.BING_WEBMASTER_API_KEY || "").trim() ? null : BING_ENABLE_HINT;
}

export const bingSiteUrl = (env: NodeJS.ProcessEnv = process.env) => String(env.BING_SITE_URL || "https://cambio-uruguay.com/").trim();

/** `/Date(1763276400000-0700)/` → `2025-11-16` (UTC). */
export function parseWcfDate(v: unknown): string | null {
  const m = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(String(v ?? ""));
  if (!m) return null;
  const ms = Number(m[1]);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
}

/** Saca el sobre `{"d": …}`. */
export function unwrapD(body: any): any {
  return body && typeof body === "object" && "d" in body ? body.d : body;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function normalizeQuery(q: unknown): string {
  return String(q ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

interface Agg {
  impressions: number;
  clicks: number;
  posW: number;
  clickPosW: number;
  weeks: Set<string>;
}

function aggregateStats(rows: any[], buckets: Set<string>, keyOf: (r: any) => string | null): Map<string, Agg> {
  const out = new Map<string, Agg>();
  for (const r of rows) {
    const day = parseWcfDate(r?.Date);
    if (!day || !buckets.has(day)) continue;
    const key = keyOf(r);
    if (!key) continue;
    const a = out.get(key) || { impressions: 0, clicks: 0, posW: 0, clickPosW: 0, weeks: new Set<string>() };
    const imp = num(r?.Impressions);
    const clicks = num(r?.Clicks);
    a.impressions += imp;
    a.clicks += clicks;
    a.posW += num(r?.AvgImpressionPosition) * imp;
    // AvgClickPosition = 0 quiere decir "sin clics".
    if (num(r?.AvgClickPosition) > 0) a.clickPosW += num(r.AvgClickPosition) * clicks;
    a.weeks.add(day);
    out.set(key, a);
  }
  return out;
}

/** Las 4 fechas de balde más nuevas que aparecen en las estadísticas de consultas (o de páginas). */
export function lastBuckets(rows: any[], n = BING_BUCKETS): string[] {
  const days = new Set<string>();
  for (const r of rows) {
    const d = parseWcfDate(r?.Date);
    if (d) days.add(d);
  }
  return [...days].sort().slice(-n);
}

export interface BingBodies {
  traffic?: any;
  queries?: any;
  pages?: any;
  crawl?: any;
  issues?: any;
}

/** Puro: los cuerpos de las cinco llamadas → el bloque. */
export function parseBing(bodies: BingBodies, siteUrl: string): BingData {
  const queryRows: any[] = Array.isArray(unwrapD(bodies.queries)) ? unwrapD(bodies.queries) : [];
  const pageRows: any[] = Array.isArray(unwrapD(bodies.pages)) ? unwrapD(bodies.pages) : [];
  const buckets = lastBuckets(queryRows.length ? queryRows : pageRows);
  const bset = new Set(buckets);
  const round = (v: number) => Math.round(v * 10) / 10;
  const q = aggregateStats(queryRows, bset, (r) => normalizeQuery(r?.Query) || null);
  const p = aggregateStats(pageRows, new Set(lastBuckets(pageRows)), (r) => sitePath(r?.Query));
  const traffic: any[] = Array.isArray(unwrapD(bodies.traffic)) ? unwrapD(bodies.traffic) : [];
  const crawl: any[] = Array.isArray(unwrapD(bodies.crawl)) ? unwrapD(bodies.crawl) : [];
  const issues: any[] = Array.isArray(unwrapD(bodies.issues)) ? unwrapD(bodies.issues) : [];
  return {
    siteUrl,
    buckets,
    traffic: traffic
      .map((r) => ({ day: parseWcfDate(r?.Date) || "", clicks: num(r?.Clicks), impressions: num(r?.Impressions) }))
      .filter((r) => r.day)
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-BING_TRAFFIC),
    queries: [...q.entries()]
      .map(([query, a]) => ({
        query,
        impressions: a.impressions,
        clicks: a.clicks,
        avgPosition: a.impressions ? round(a.posW / a.impressions) : null,
        avgClickPosition: a.clicks && a.clickPosW ? round(a.clickPosW / a.clicks) : null,
        weeks: a.weeks.size,
      }))
      .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query))
      .slice(0, BING_QUERIES),
    pages: [...p.entries()]
      .map(([path, a]) => ({
        path,
        impressions: a.impressions,
        clicks: a.clicks,
        avgPosition: a.impressions ? round(a.posW / a.impressions) : null,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, BING_PAGES),
    crawl: crawl
      .map((r) => ({
        day: parseWcfDate(r?.Date) || "",
        crawled: num(r?.CrawledPages),
        inIndex: num(r?.InIndex),
        errors: num(r?.CrawlErrors),
        code4xx: num(r?.Code4xx),
        code5xx: num(r?.Code5xx),
        code301: num(r?.Code301),
        code302: num(r?.Code302),
        blockedByRobots: num(r?.BlockedByRobotsTxt),
      }))
      .filter((r) => r.day)
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-BING_CRAWL),
    // `Issues` es una máscara de bits cuyos valores NO están verificados: se guarda cruda.
    issues: issues
      .map((r) => ({ path: sitePath(r?.Url) || "", httpCode: num(r?.HttpCode), issuesRaw: num(r?.Issues), inLinks: num(r?.InLinks) }))
      .filter((r) => r.path)
      .sort((a, b) => b.inLinks - a.inLinks)
      .slice(0, BING_ISSUES),
  };
}

/** Las consultas de Search Console de los últimos 28 días finales, por consulta normalizada. Puro. */
export function joinGsc(
  days: { queries?: { key: string; clicks: number; impressions: number }[] }[]
): Map<string, { clicks: number; impressions: number }> {
  const out = new Map<string, { clicks: number; impressions: number }>();
  for (const d of days || []) {
    for (const q of d?.queries || []) {
      const key = normalizeQuery(q?.key);
      if (!key) continue;
      const e = out.get(key) || { clicks: 0, impressions: 0 };
      e.clicks += num(q.clicks);
      e.impressions += num(q.impressions);
      out.set(key, e);
    }
  }
  return out;
}

export class BingApiError extends Error {
  code: number;
  constructor(code: number) {
    super(`ErrorCode ${code}`);
    this.name = "BingApiError";
    this.code = code;
  }
}

export interface BingHttp {
  get(url: string, config: any): Promise<{ status: number; data: any }>;
}

export async function bingCall(http: BingHttp, method: string, key: string, siteUrl: string | null): Promise<any> {
  const params: Record<string, string> = { apikey: key };
  if (siteUrl) params.siteUrl = siteUrl;
  const res = await http.get(`${BING_API}/${method}`, { params, timeout: 60000, validateStatus: () => true });
  const body = res?.data;
  if (body && typeof body === "object" && Number.isFinite(Number(body.ErrorCode)) && Number(body.ErrorCode) !== 0) {
    throw new BingApiError(Number(body.ErrorCode));
  }
  if (Number(res?.status) !== 200) throw new BingApiError(Number(res?.status) === 429 ? 4 : 2);
  return body;
}

export interface BingRunInput {
  http?: BingHttp;
  key?: string;
  siteUrl?: string;
  prevData: BingData | null;
  log: (line: string) => void;
}

const BING_PARTS = [
  ["traffic", "GetRankAndTrafficStats"],
  ["queries", "GetQueryStats"],
  ["pages", "GetPageStats"],
  ["crawl", "GetCrawlStats"],
  ["issues", "GetCrawlIssues"],
] as const;

export async function runBing(input: BingRunInput): Promise<{ outcome: BlockOutcome<BingData> }> {
  const key = input.key ?? String(process.env.BING_WEBMASTER_API_KEY || "").trim();
  if (!key) {
    return { outcome: { kind: "inactive", enableHint: BING_ENABLE_HINT } };
  }
  const http = input.http || (axios as unknown as BingHttp);
  const siteUrl = input.siteUrl ?? bingSiteUrl();
  const access = (code: number): BlockOutcome<BingData> | null => {
    if (code === 3) return { kind: "inactive", enableHint: "la clave de Bing no es válida: generar otra (paso 5.2)" };
    if (code === 14) return { kind: "inactive", enableHint: "verificar el sitio en Bing Webmaster (paso 5.2)" };
    return null;
  };
  try {
    const sites = unwrapD(await bingCall(http, "GetUserSites", key, null));
    const list: any[] = Array.isArray(sites) ? sites : [];
    const norm = (u: string) =>
      String(u || "")
        .toLowerCase()
        .replace(/\/+$/, "");
    if (!list.some((s) => norm(s?.Url ?? s?.url) === norm(siteUrl))) {
      return { outcome: { kind: "inactive", enableHint: "verificar el sitio en Bing Webmaster (paso 5.2)" } };
    }
  } catch (e) {
    if (e instanceof BingApiError) {
      const a = access(e.code);
      if (a) return { outcome: a };
      return { outcome: { kind: "failed", note: `bing: ErrorCode ${e.code}` } };
    }
    throw e;
  }
  const bodies: BingBodies = {};
  const failed: string[] = [];
  const codes: number[] = [];
  for (const [part, method] of BING_PARTS) {
    try {
      bodies[part] = await bingCall(http, method, key, siteUrl);
    } catch (e) {
      if (e instanceof BingApiError) {
        const a = access(e.code);
        if (a) return { outcome: a };
        // 4/5 = ThrottleUser/ThrottleHost: retroceder, la fuente falla hoy entera.
        if (e.code === 4 || e.code === 5) return { outcome: { kind: "failed", note: `bing: ErrorCode ${e.code} (throttle)` } };
        codes.push(e.code);
      }
      failed.push(part);
    }
  }
  if (failed.length === BING_PARTS.length) {
    return { outcome: { kind: "failed", note: `bing: fallaron todas las llamadas${codes.length ? ` (ErrorCode ${codes[0]})` : ""}` } };
  }
  let data = parseBing(bodies, siteUrl);
  const prev = input.prevData;
  if (prev && failed.length) {
    const d: any = { ...data };
    for (const part of failed) d[part] = (prev as any)[part];
    if (failed.includes("queries")) d.buckets = prev.buckets;
    data = d;
  }
  const rowsSeen = Object.fromEntries(Object.entries(bodies).map(([k, v]) => [k, Array.isArray(unwrapD(v)) ? unwrapD(v).length : 0]));
  const impressions = data.queries.reduce((s, q) => s + q.impressions, 0);
  const prevImpr = prev ? prev.queries.reduce((s, q) => s + q.impressions, 0) : 0;
  if (!failed.includes("queries") && impressions === 0 && prevImpr > 100) {
    return { outcome: { kind: "thin", data, rowsSeen, note: "cero impresiones contra más de 100 guardadas" } };
  }
  if (!failed.includes("queries") && prevImpr > 100 && impressions < prevImpr * THIN_FACTOR) {
    return { outcome: { kind: "thin", data, rowsSeen, note: `impresiones ${impressions} contra ${prevImpr} guardadas` } };
  }
  if (failed.length) return { outcome: { kind: "partial", data, carried: failed, rowsSeen } };
  return { outcome: { kind: "ok", data, rowsSeen } };
}
