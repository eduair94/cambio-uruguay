// Chrome UX Report API: los Core Web Vitals de campo que mide Google con usuarios reales de Chrome, los
// mismos que usa el buscador. Ventana móvil de 28 días.
//
// INERTE hasta que exista `CRUX_API_KEY` (paso 5.4 del doc): cero llamadas y una línea.
//
// LA CLAVE VA EN LA CABECERA `X-Goog-Api-Key`, NO EN `?key=` (R16): una clave en la URL termina en
// `error.config.url` y `error.request.path` de axios. `tests/insights/crux.test.ts` exige que ninguna URL
// pedida lleve `key=`.
//
// UNIDADES: milisegundos (Cloudflare usa microsegundos) y el CLS llega como TEXTO ("0.26").
// Un 404 "data not found" es lo normal para una URL con poco tráfico de Chrome: se cuenta, no falla.
import axios from "axios";

import type { BlockOutcome } from "../blocks";
import {
  CRUX_HISTORY_EVERY_DAYS,
  CRUX_HISTORY_PERIODS,
  CRUX_PACE_MS,
  CRUX_URLS,
  CRUX_URLS_CEILING,
  CRUX_URLS_DEFAULT,
  CRUX_WALL_MS,
  REREAD_GUARD_HOURS,
  envInt,
} from "../caps";
import type { CruxData, CruxRecord, Rating } from "../types";

export const CRUX_API = "https://chromeuxreport.googleapis.com/v1/records";
export const CRUX_ENABLE_HINT = "Falta CRUX_API_KEY en el .env del servidor (docs/analytics/USAGE_INSIGHTS.md, «CrUX»)";
export const CRUX_INACTIVE_LINE = "[usage-insights] crux: inactivo — falta CRUX_API_KEY";
export const CRUX_METRICS = [
  "largest_contentful_paint",
  "interaction_to_next_paint",
  "cumulative_layout_shift",
  "first_contentful_paint",
  "experimental_time_to_first_byte",
];

export function cruxConfigProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  return String(env.CRUX_API_KEY || "").trim() ? null : CRUX_ENABLE_HINT;
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "" || v === "NaN") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const THRESHOLDS = { lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25] } as const;
export function rateP75(metric: keyof typeof THRESHOLDS, p75: number | null): Rating | null {
  if (p75 === null) return null;
  const [good, poor] = THRESHOLDS[metric];
  return p75 <= good ? "good" : p75 > poor ? "poor" : "ni";
}

const ymd = (d: any) => (d && d.year ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : null);

/** `record` de queryRecord → `CruxRecord`. Puro. */
export function parseCrux(body: any): { record: CruxRecord; period: { first: string; last: string } | null } {
  const metrics = body?.record?.metrics || {};
  const p75 = (m: string) => toNum(metrics?.[m]?.percentiles?.p75);
  const good = (m: string) => toNum(metrics?.[m]?.histogram?.[0]?.density);
  const lcpMs = p75("largest_contentful_paint");
  const inpMs = p75("interaction_to_next_paint");
  const cls = p75("cumulative_layout_shift");
  const cp = body?.record?.collectionPeriod;
  const first = ymd(cp?.firstDate);
  const last = ymd(cp?.lastDate);
  return {
    record: {
      lcpMs,
      inpMs,
      cls,
      fcpMs: p75("first_contentful_paint"),
      ttfbMs: p75("experimental_time_to_first_byte"),
      good: { lcp: good("largest_contentful_paint"), inp: good("interaction_to_next_paint"), cls: good("cumulative_layout_shift") },
      rating: { lcp: rateP75("lcp", lcpMs), inp: rateP75("inp", inpMs), cls: rateP75("cls", cls) },
    },
    period: first && last ? { first, last } : null,
  };
}

/** queryHistoryRecord → series p75 (un "NaN"/null es null). Puro. */
export function parseCruxHistory(body: any, formFactor: "ALL" | "PHONE" | "DESKTOP"): NonNullable<CruxData["history"]>[number] {
  const metrics = body?.record?.metrics || {};
  const series = (m: string) => ((metrics?.[m]?.percentilesTimeseries?.p75s as any[]) || []).map(toNum).slice(-CRUX_HISTORY_PERIODS);
  const periods = ((body?.record?.collectionPeriods as any[]) || []).map((p) => ymd(p?.lastDate) || "").slice(-CRUX_HISTORY_PERIODS);
  return {
    formFactor,
    periods,
    lcpP75: series("largest_contentful_paint"),
    inpP75: series("interaction_to_next_paint"),
    clsP75: series("cumulative_layout_shift"),
  };
}

export interface CruxHttp {
  post(url: string, body: any, config: any): Promise<{ status: number; data: any }>;
}

export interface CruxRunInput {
  http?: CruxHttp;
  key?: string;
  origin?: string;
  /** Rutas de más a menos cargas uruguayas de Cloudflare. */
  topPaths: string[];
  state: { historyFetchedAt: string | null; lastOkAt: string | null };
  prevData: CruxData | null;
  now: Date;
  sleep?: (ms: number) => Promise<void>;
  log: (line: string) => void;
}

export async function runCrux(input: CruxRunInput): Promise<{ outcome: BlockOutcome<CruxData>; state: CruxRunInput["state"] }> {
  const key = input.key ?? String(process.env.CRUX_API_KEY || "").trim();
  const state = { ...input.state };
  if (!key) {
    return { outcome: { kind: "inactive", enableHint: CRUX_ENABLE_HINT }, state };
  }
  if (state.lastOkAt) {
    const age = input.now.getTime() - Date.parse(state.lastOkAt);
    if (Number.isFinite(age) && age >= 0 && age < REREAD_GUARD_HOURS * 3600000) {
      return { outcome: { kind: "skipped", note: "ya leído hoy" }, state };
    }
  }
  const http = input.http || (axios as unknown as CruxHttp);
  const sleep = input.sleep || ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const origin = (input.origin || process.env.SITE_BASE_URL || "https://cambio-uruguay.com").replace(/\/+$/, "");
  const started = Date.now();
  const config = { headers: { "X-Goog-Api-Key": key, "Content-Type": "application/json" }, timeout: 30000, validateStatus: () => true };

  type Ans = { kind: "ok"; body: any } | { kind: "nodata" } | { kind: "skip" } | { kind: "stop" } | { kind: "denied" };
  let first = true;
  const call = async (method: "queryRecord" | "queryHistoryRecord", body: any): Promise<Ans> => {
    if (!first) await sleep(CRUX_PACE_MS);
    first = false;
    const res = await http.post(`${CRUX_API}:${method}`, body, config);
    const status = Number(res?.status || 0);
    if (status === 200) return { kind: "ok", body: res.data };
    if (status === 404) return { kind: "nodata" };
    if (status === 429) return { kind: "stop" };
    if (status === 403) return { kind: "denied" };
    return { kind: "skip" };
  };

  const data: CruxData = {
    origin: { ALL: null, PHONE: null, DESKTOP: null },
    urls: [],
    noData: 0,
    collectionPeriod: null,
    history: input.prevData?.history ?? null,
    historyFetchedAt: input.prevData?.historyFetchedAt ?? state.historyFetchedAt ?? null,
  };
  let stopped = false;
  let calls = 0;
  const denied = (): { outcome: BlockOutcome<CruxData>; state: CruxRunInput["state"] } => ({
    outcome: { kind: "inactive", enableHint: "habilitar Chrome UX Report API o restringir la clave a ella (paso 5.4)" },
    state,
  });

  for (const ff of ["ALL", "PHONE", "DESKTOP"] as const) {
    const ans = await call("queryRecord", { origin, ...(ff === "ALL" ? {} : { formFactor: ff }), metrics: CRUX_METRICS });
    calls++;
    if (ans.kind === "denied") return denied();
    if (ans.kind === "stop") {
      stopped = true;
      break;
    }
    if (ans.kind === "nodata") data.noData++;
    if (ans.kind === "ok") {
      const p = parseCrux(ans.body);
      data.origin[ff] = p.record;
      if (p.period) data.collectionPeriod = p.period;
    }
  }

  const n = envInt("USAGE_INSIGHTS_CRUX_URLS", CRUX_URLS_DEFAULT, 0, CRUX_URLS_CEILING);
  outer: for (const path of stopped ? [] : input.topPaths.slice(0, n)) {
    for (const ff of ["PHONE", "DESKTOP"] as const) {
      if (Date.now() - started > CRUX_WALL_MS) {
        stopped = true;
        break outer;
      }
      const ans = await call("queryRecord", { url: `${origin}${path === "/" ? "/" : path}`, formFactor: ff, metrics: CRUX_METRICS });
      calls++;
      if (ans.kind === "denied") return denied();
      if (ans.kind === "stop") {
        stopped = true;
        break outer;
      }
      if (ans.kind === "nodata") data.noData++;
      if (ans.kind === "ok" && data.urls.length < CRUX_URLS) data.urls.push({ ...parseCrux(ans.body).record, path, formFactor: ff });
    }
  }

  const historyAge = state.historyFetchedAt ? input.now.getTime() - Date.parse(state.historyFetchedAt) : Infinity;
  if (!stopped && !(historyAge < CRUX_HISTORY_EVERY_DAYS * 86400000)) {
    const history: NonNullable<CruxData["history"]> = [];
    for (const ff of ["ALL", "PHONE", "DESKTOP"] as const) {
      const ans = await call("queryHistoryRecord", {
        origin,
        ...(ff === "ALL" ? {} : { formFactor: ff }),
        metrics: ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"],
        collectionPeriodCount: CRUX_HISTORY_PERIODS,
      });
      calls++;
      if (ans.kind === "ok") history.push(parseCruxHistory(ans.body, ff));
      if (ans.kind === "stop") {
        stopped = true;
        break;
      }
    }
    if (history.length) {
      data.history = history;
      data.historyFetchedAt = input.now.toISOString();
      state.historyFetchedAt = data.historyFetchedAt;
    }
  }

  const got = !!(data.origin.ALL || data.origin.PHONE || data.origin.DESKTOP || data.urls.length || data.noData);
  if (!got) return { outcome: { kind: "failed", note: stopped ? "crux: 429 al empezar" : "crux: ninguna respuesta útil" }, state };
  state.lastOkAt = input.now.toISOString();
  const rowsSeen = { calls, urls: data.urls.length, noData: data.noData };
  if (stopped) return { outcome: { kind: "partial", data, carried: [], rowsSeen, note: "cortado por cuota (429) o por el reloj" }, state };
  return { outcome: { kind: "ok", data, rowsSeen }, state };
}
