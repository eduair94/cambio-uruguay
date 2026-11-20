// Microsoft Clarity, Data Export API: clics de bronca, clics muertos, vueltas atrás rápidas, scroll y
// errores de JavaScript por URL, dispositivo y país, de las últimas 24 h.
//
// INERTE hasta que exista `CLARITY_EXPORT_TOKEN` (paso 5.1 del doc): cero llamadas y una línea de log.
//
// CUOTA: 10 llamadas por proyecto y por día (UTC), compartidas con todo token del proyecto y con
// cualquier prueba a mano. Este job usa como mucho `USAGE_INSIGHTS_CLARITY_MAX_CALLS` (6) SUMANDO
// todas sus corridas del día: antes de cada llamada reserva una unidad en la base
// (`store.reserveQuota("clarity", …)`), y una unidad reservada no se devuelve aunque la llamada falle.
// Además no se vuelve a leer dentro de las 20 h de una lectura buena.
//
// La API devuelve sólo los últimos 1–3 días: un día que no se pidió se pierde para siempre. Por eso el
// día entero se archiva en `usageinsightdays`.
//
// Varios nombres de campos NO están verificados (sources brief §2): el analizador compara sin mayúsculas,
// acepta las dos grafías conocidas, registra en el log los nombres (nunca los valores) de la primera
// llamada real y guarda en `unknownKeys` lo que no conoce, que nunca se lee como 0.
import axios from "axios";

import type { BlockOutcome } from "../blocks";
import {
  CLARITY_CHANNEL_DEVICE,
  CLARITY_DEVICE_BROWSER,
  CLARITY_MAX_CALLS_CEILING,
  CLARITY_MAX_CALLS_DEFAULT,
  CLARITY_ROW_LIMIT,
  CLARITY_UNKNOWN_KEYS,
  CLARITY_URL_DEVICE,
  CLARITY_URLS,
  CLARITY_URLS_UY,
  REREAD_GUARD_HOURS,
  envInt,
} from "../caps";
import { sitePath } from "../paths";
import type { ClarityData, ClarityMetrics, Friction } from "../types";

export const CLARITY_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights";
export const CLARITY_ENABLE_HINT = "Falta CLARITY_EXPORT_TOKEN en el .env del servidor (docs/analytics/USAGE_INSIGHTS.md, «Clarity»)";
export const CLARITY_INACTIVE_LINE = "[usage-insights] clarity: inactivo — falta CLARITY_EXPORT_TOKEN";

export function clarityConfigProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  return String(env.CLARITY_EXPORT_TOKEN || "").trim() ? null : CLARITY_ENABLE_HINT;
}

export const clarityMaxCalls = () => envInt("USAGE_INSIGHTS_CLARITY_MAX_CALLS", CLARITY_MAX_CALLS_DEFAULT, 0, CLARITY_MAX_CALLS_CEILING);

export const CLARITY_CALLS = [
  { part: "totals", dims: [] as string[] },
  { part: "urls", dims: ["URL"] },
  { part: "urlDevice", dims: ["URL", "Device"] },
  { part: "urlsUy", dims: ["URL", "Country/Region"] },
  { part: "deviceBrowser", dims: ["Device", "Browser"] },
  { part: "channelDevice", dims: ["Channel", "Device"] },
] as const;
export type ClarityPart = (typeof CLARITY_CALLS)[number]["part"];

// ---- analizador (puro) --------------------------------------------------------------------------

const FRICTION_BLOCKS: Record<string, keyof ClarityMetrics> = {
  deadclickcount: "dead",
  rageclickcount: "rage",
  quickbackclick: "quickback",
  excessivescroll: "excessiveScroll",
  scripterrorcount: "scriptErrors",
  errorclickcount: "errorClicks",
};
const METRIC_BLOCKS = new Set(["traffic", "engagementtime", "scrolldepth", ...Object.keys(FRICTION_BLOCKS)]);
/** Bloques que vienen sin dimensión pedida y no se usan (no son desconocidos). */
const IGNORED_BLOCKS = new Set(["popularpages", "pagetitle", "referrerurl", "browser", "device", "os", "country"]);
const METRIC_KEYS = new Set([
  "totalsessioncount",
  "totalbotsessioncount",
  "distantusercount",
  "distinctusercount",
  "pagespersessionpercentage",
  "totaltime",
  "activetime",
  "averagescrolldepth",
  "sessionscount",
  "sessionswithmetricpercentage",
  "sessionswithoutmetricpercentage",
  "pagesviews",
  "subtotal",
]);
export const DIMENSION_KEYS = new Set([
  "url",
  "device",
  "browser",
  "country/region",
  "country",
  "os",
  "channel",
  "source",
  "medium",
  "campaign",
]);

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface Acc {
  dims: Record<string, string>;
  sessions: number;
  bots: number;
  users: number | null;
  pps: number | null;
  active: number | null;
  total: number | null;
  scroll: number | null;
  friction: Partial<Record<keyof ClarityMetrics, Friction>>;
}

const newAcc = (dims: Record<string, string>): Acc => ({
  dims,
  sessions: 0,
  bots: 0,
  users: null,
  pps: null,
  active: null,
  total: null,
  scroll: null,
  friction: {},
});

export interface ParsedClarity {
  rows: (ClarityMetrics & { dims: Record<string, string> })[];
  unknownKeys: string[];
  maxRows: number;
  /** Nombres de bloque y de claves (sin valores), para el log de la primera llamada. */
  shape: string[];
}

/** El cuerpo de una llamada (un array de `{metricName, information[]}`) → filas unidas por dimensión. */
export function parseClarity(body: any): ParsedClarity {
  const blocks: any[] = Array.isArray(body) ? body : [];
  const unknown = new Set<string>();
  const raw = new Map<string, Acc>();
  let maxRows = 0;
  const shape: string[] = [];
  for (const block of blocks) {
    const name = String(block?.metricName || "").toLowerCase();
    const info: any[] = Array.isArray(block?.information) ? block.information : [];
    maxRows = Math.max(maxRows, info.length);
    shape.push(`${block?.metricName}: ${[...new Set(info.flatMap((r) => Object.keys(r || {})))].join(",")}`);
    if (IGNORED_BLOCKS.has(name)) continue;
    if (!METRIC_BLOCKS.has(name)) {
      unknown.add(`block:${block?.metricName}`);
      continue;
    }
    for (const row of info) {
      const dims: Record<string, string> = {};
      const vals: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row || {})) {
        const lk = k.toLowerCase();
        if (DIMENSION_KEYS.has(lk)) dims[lk === "country" ? "country/region" : lk] = String(v ?? "");
        else if (METRIC_KEYS.has(lk)) vals[lk] = v;
        else unknown.add(`${block?.metricName}.${k}`);
      }
      const key = JSON.stringify(
        Object.keys(dims)
          .sort()
          .map((k) => [k, dims[k]])
      );
      const acc = raw.get(key) || newAcc(dims);
      if (name === "traffic") {
        acc.sessions += toNum(vals.totalsessioncount) || 0;
        acc.bots += toNum(vals.totalbotsessioncount) || 0;
        const users = toNum(vals.distinctusercount) ?? toNum(vals.distantusercount);
        if (users !== null) acc.users = (acc.users || 0) + users;
        const pps = toNum(vals.pagespersessionpercentage);
        if (pps !== null) acc.pps = pps;
      } else if (name === "engagementtime") {
        const t = toNum(vals.totaltime);
        const a = toNum(vals.activetime);
        if (t !== null) acc.total = (acc.total || 0) + t;
        if (a !== null) acc.active = (acc.active || 0) + a;
      } else if (name === "scrolldepth") {
        const s = toNum(vals.averagescrolldepth);
        if (s !== null) acc.scroll = s;
      } else {
        const field = FRICTION_BLOCKS[name];
        const pct = toNum(vals.sessionswithmetricpercentage);
        acc.friction[field] = {
          sessionsShare: pct === null ? null : Math.round((pct / 100) * 10000) / 10000,
          events: toNum(vals.subtotal) || 0,
          sessions: toNum(vals.sessionscount) || 0,
        };
      }
      raw.set(key, acc);
    }
  }

  // Segundo paso: la URL a ruta del sitio (sin query ni fragmento); otro host se descarta. Filas que
  // quedan con la misma ruta se suman, con los porcentajes ponderados por sesiones.
  const merged = new Map<string, Acc & { w: number }>();
  for (const acc of raw.values()) {
    const dims = { ...acc.dims };
    if ("url" in dims) {
      const path = sitePath(dims.url);
      if (!path) continue;
      dims.url = path;
    }
    const key = JSON.stringify(
      Object.keys(dims)
        .sort()
        .map((k) => [k, dims[k]])
    );
    const m = merged.get(key);
    if (!m) {
      merged.set(key, { ...acc, dims, friction: { ...acc.friction }, w: acc.sessions });
      continue;
    }
    const w0 = m.w || 1;
    const w1 = acc.sessions || 1;
    const wavg = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : (a * w0 + b * w1) / (w0 + w1));
    m.scroll = wavg(m.scroll, acc.scroll);
    m.pps = wavg(m.pps, acc.pps);
    m.sessions += acc.sessions;
    m.bots += acc.bots;
    m.users = m.users === null ? acc.users : acc.users === null ? m.users : m.users + acc.users;
    m.active = m.active === null ? acc.active : acc.active === null ? m.active : m.active + acc.active;
    m.total = m.total === null ? acc.total : acc.total === null ? m.total : m.total + acc.total;
    for (const [field, f] of Object.entries(acc.friction) as [keyof ClarityMetrics, Friction][]) {
      const cur = m.friction[field];
      if (!cur) m.friction[field] = { ...f };
      else {
        const share =
          cur.sessionsShare === null || f.sessionsShare === null
            ? (cur.sessionsShare ?? f.sessionsShare)
            : (cur.sessionsShare * (cur.sessions || 1) + f.sessionsShare * (f.sessions || 1)) / ((cur.sessions || 1) + (f.sessions || 1));
        m.friction[field] = {
          sessionsShare: share === null ? null : Math.round(share * 10000) / 10000,
          events: cur.events + f.events,
          sessions: cur.sessions + f.sessions,
        };
      }
    }
    m.w = w0 + w1;
  }

  const round = (v: number | null, d = 2) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);
  const rows = [...merged.values()].map((m) => ({
    dims: m.dims,
    sessions: m.sessions,
    botSessions: m.bots,
    users: m.users,
    pagesPerSession: round(m.pps),
    activeSec: m.active,
    totalSec: m.total,
    scrollDepth: round(m.scroll),
    rage: m.friction.rage || null,
    dead: m.friction.dead || null,
    quickback: m.friction.quickback || null,
    excessiveScroll: m.friction.excessiveScroll || null,
    scriptErrors: m.friction.scriptErrors || null,
    errorClicks: m.friction.errorClicks || null,
  })) as (ClarityMetrics & { dims: Record<string, string> })[];
  return { rows, unknownKeys: [...unknown].sort(), maxRows, shape };
}

const metricsOf = (r: ClarityMetrics & { dims: Record<string, string> }): ClarityMetrics => {
  const { dims, ...rest } = r;
  void dims;
  return rest;
};

export const emptyMetrics = (): ClarityMetrics => ({
  sessions: 0,
  botSessions: 0,
  users: null,
  pagesPerSession: null,
  activeSec: null,
  totalSec: null,
  scrollDepth: null,
  rage: null,
  dead: null,
  quickback: null,
  excessiveScroll: null,
  scriptErrors: null,
  errorClicks: null,
});

const bySessions = <T extends { sessions: number }>(a: T, b: T) => b.sessions - a.sessions;
const isUy = (v: string | undefined) => /^(uruguay|uy)$/i.test(String(v || "").trim());

/** Las respuestas parseadas de cada llamada → el bloque. */
export function buildClarityData(
  parsed: Partial<Record<ClarityPart, ParsedClarity>>,
  ctx: { windowEnd: string; callsThisRun: number; callsTodayUtc: number }
): ClarityData {
  const totalsRow = parsed.totals?.rows.find((r) => !Object.keys(r.dims).length) || parsed.totals?.rows[0];
  const unknown = new Set<string>();
  for (const p of Object.values(parsed)) for (const k of p?.unknownKeys || []) unknown.add(k);
  return {
    windowEnd: ctx.windowEnd,
    hours: 24,
    callsThisRun: ctx.callsThisRun,
    callsTodayUtc: ctx.callsTodayUtc,
    totals: totalsRow ? metricsOf(totalsRow) : emptyMetrics(),
    urls: (parsed.urls?.rows || [])
      .filter((r) => r.dims.url)
      .map((r) => ({ ...metricsOf(r), path: r.dims.url }))
      .sort(bySessions)
      .slice(0, CLARITY_URLS),
    urlsUy: parsed.urlsUy
      ? parsed.urlsUy.rows
          .filter((r) => r.dims.url && isUy(r.dims["country/region"]))
          .map((r) => ({ ...metricsOf(r), path: r.dims.url }))
          .sort(bySessions)
          .slice(0, CLARITY_URLS_UY)
      : null,
    urlDevice: (parsed.urlDevice?.rows || [])
      .filter((r) => r.dims.url)
      .map((r) => ({ ...metricsOf(r), path: r.dims.url, device: String(r.dims.device || "").toLowerCase() || "?" }))
      .sort(bySessions)
      .slice(0, CLARITY_URL_DEVICE),
    deviceBrowser: (parsed.deviceBrowser?.rows || [])
      .map((r) => ({
        device: String(r.dims.device || "?").toLowerCase(),
        browser: String(r.dims.browser || "?"),
        sessions: r.sessions,
        rage: r.rage?.sessionsShare ?? null,
        dead: r.dead?.sessionsShare ?? null,
      }))
      .sort(bySessions)
      .slice(0, CLARITY_DEVICE_BROWSER),
    channelDevice: (parsed.channelDevice?.rows || [])
      .map((r) => ({ channel: String(r.dims.channel || "?"), device: String(r.dims.device || "?").toLowerCase(), sessions: r.sessions }))
      .sort(bySessions)
      .slice(0, CLARITY_CHANNEL_DEVICE),
    unknownKeys: [...unknown].slice(0, CLARITY_UNKNOWN_KEYS),
  };
}

// ---- la corrida ---------------------------------------------------------------------------------

export interface ClarityHttp {
  get(url: string, config: any): Promise<{ status: number; data: any }>;
}

export interface ClarityRunInput {
  lastOkAt: string | null;
  now: Date;
  /** `store.reserveQuota("clarity", día UTC, máximo)`. */
  reserve: (max: number) => Promise<number | null>;
  http?: ClarityHttp;
  log: (line: string) => void;
  prevData: ClarityData | null;
  token?: string;
}

export async function runClarity(input: ClarityRunInput): Promise<{ outcome: BlockOutcome<ClarityData>; okAt: string | null }> {
  const token = input.token ?? String(process.env.CLARITY_EXPORT_TOKEN || "").trim();
  if (!token) {
    return { outcome: { kind: "inactive", enableHint: CLARITY_ENABLE_HINT }, okAt: null };
  }
  if (input.lastOkAt) {
    const age = input.now.getTime() - Date.parse(input.lastOkAt);
    if (Number.isFinite(age) && age >= 0 && age < REREAD_GUARD_HOURS * 3600000) {
      return { outcome: { kind: "skipped", note: "ya leído hoy" }, okAt: null };
    }
  }
  const http: ClarityHttp = input.http || (axios as unknown as ClarityHttp);
  const max = clarityMaxCalls();
  const parsed: Partial<Record<ClarityPart, ParsedClarity>> = {};
  const failed: ClarityPart[] = [];
  let calls = 0;
  let lastUsed = 0;
  let stopNote: string | null = null;
  let shapeLogged = false;
  let truncated = false;
  const rowsSeen: Record<string, number> = {};

  for (let i = 0; i < CLARITY_CALLS.length; i++) {
    const call = CLARITY_CALLS[i];
    if (stopNote) {
      failed.push(call.part);
      continue;
    }
    const used = await input.reserve(max);
    if (used === null) {
      failed.push(...CLARITY_CALLS.slice(i).map((c) => c.part));
      if (!calls) return { outcome: { kind: "skipped", note: `cupo diario de Clarity ya usado (${max} de ${max} hoy UTC)` }, okAt: null };
      break;
    }
    lastUsed = used;
    calls++;
    const params: Record<string, string | number> = { numOfDays: 1 };
    call.dims.forEach((dim, k) => (params[`dimension${k + 1}`] = dim));
    let res: { status: number; data: any };
    try {
      res = await http.get(CLARITY_URL, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        params,
        timeout: 60000,
        validateStatus: () => true,
      });
    } catch {
      failed.push(call.part);
      continue;
    }
    const status = Number(res?.status || 0);
    if (status === 401)
      return { outcome: { kind: "inactive", enableHint: "token vencido o inválido: generar otro (paso 5.1)" }, okAt: null };
    if (status === 403) return { outcome: { kind: "inactive", enableHint: CLARITY_ENABLE_HINT }, okAt: null };
    if (status === 429) {
      stopNote = "límite diario de Clarity agotado";
      failed.push(call.part);
      continue;
    }
    if (status !== 200) {
      failed.push(call.part);
      continue;
    }
    const p = parseClarity(res.data);
    if (!shapeLogged) {
      // Nombres de bloque y de claves, nunca valores: varios están sin verificar.
      input.log(`[usage-insights] forma de Clarity — ${p.shape.join(" | ").slice(0, 600)}`);
      shapeLogged = true;
    }
    parsed[call.part] = p;
    rowsSeen[call.part] = p.maxRows;
    if (call.dims.length && p.maxRows >= CLARITY_ROW_LIMIT) truncated = true;
  }

  if (!Object.keys(parsed).length) {
    return { outcome: { kind: "failed", note: stopNote || "clarity: ninguna llamada devolvió datos" }, okAt: null };
  }
  const data = buildClarityData(parsed, { windowEnd: input.now.toISOString(), callsThisRun: calls, callsTodayUtc: lastUsed });
  const prev = input.prevData;
  const carried: string[] = [];
  if (prev) {
    for (const part of failed) {
      if (part === "totals") (data as any).totals = prev.totals;
      else if (part in prev) (data as any)[part] = (prev as any)[part];
      carried.push(part);
    }
  } else carried.push(...failed);
  const okAt = input.now.toISOString();
  if (parsed.totals && data.totals.sessions === 0) {
    return { outcome: { kind: "thin", data, truncated, rowsSeen, note: "cero sesiones en 24 h: ¿token de otro proyecto?" }, okAt: null };
  }
  if (failed.length) return { outcome: { kind: "partial", data, carried, truncated, rowsSeen, note: stopNote }, okAt };
  return { outcome: { kind: "ok", data, truncated, rowsSeen }, okAt };
}
