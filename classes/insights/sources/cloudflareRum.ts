// Cloudflare Web Analytics (RUM): el denominador que no depende del consentimiento.
//
// El beacon de Cloudflare no usa cookies, así que cuenta a quien rechazó el banner y Google Analytics
// nunca ve. Es un PISO, no un censo (un bloqueador de anuncios bloquea el beacon).
//
// POR QUÉ SE ARCHIVA AYER CADA DÍA (R9). La API muestrea lo viejo: una consulta directa de 14 días
// devolvió los 67 grupos página × dispositivo en múltiplos de 10 (`sampleInterval` 10, muestra real de
// 3–9 por grupo). Un día pedido mientras tiene menos de 7 días vuelve entero. Así que cada corrida pide
// AYER (y los días recientes que falten), lo guarda en `usageinsightdays`, y el bloque de 28 días es la
// SUMA de los días archivados. Las calificaciones salen de sumar bien/regular/mal, que son aditivos; el
// p75 que se muestra es sólo "aprox." (el del último día).
//
// UNIDADES: los tiempos de RUM vienen en MICROSEGUNDOS y un −1 es "sin dato" (R5).
import { addDays } from "../../site-analytics/refresh";
import { SITE_HOSTS } from "../../site-analytics/sourceKinds";
import type { BlockOutcome } from "../blocks";
import {
  CF_BACKFILL_MAX_DAYS,
  CF_COUNTRIES,
  CF_DAILY,
  CF_DEVICES,
  CF_ELEMENTS_PER_METRIC,
  CF_PAGES,
  CF_RECENT_DAYS,
  CF_REFERRERS,
  CF_VITALS,
  CONSENT_PAGES,
  DAY_CF_COUNTRIES,
  DAY_CF_ELEMENTS_PER_METRIC,
  DAY_CF_PAGES_BY_DEVICE,
  DAY_CF_REFERRERS,
  DAY_CF_VITALS,
  THIN_FACTOR,
} from "../caps";
import { sanitizeError } from "../errors";
import { dayBoundsUtc, daysBetween, isSiteHost, sitePath } from "../paths";
import type {
  CfElementRow,
  CfRumData,
  CfRumDay,
  CfRumDayVital,
  CfVitalRow,
  DayWindow,
  InsightState,
  Rated,
  RatedTuple,
  ReferrerKind,
} from "../types";
import { CfAuthzError, CfBudgetError, CfQueryError, secondsToDays } from "./cloudflare";
import type { CfClient } from "./cloudflare";

export const RUM_ENABLE_HINT =
  "Falta CLOUDFLARE_TOKEN o CLOUDFLARE_ANALYTICS_TOKEN (cuenta: Account Analytics Read). docs/analytics/USAGE_INSIGHTS.md, «Cloudflare»";

/** Las siete consultas de un día. El nombre es el de la sub-parte que queda `carried` si falla. */
export const RUM_PARTS = ["pages", "referrers", "countries", "vitals", "clsElements", "inpElements", "lcpElements"] as const;
export type RumPart = (typeof RUM_PARTS)[number];

export type HostMode = "in" | "exact";

// ---- valores --------------------------------------------------------------------------------------

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** µs → ms redondeado; un valor negativo (−1 = N/A) es null. */
export function usToMs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n / 1000);
}

/** CLS sin unidad; negativo = null. */
export function clsValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000) / 1000;
}

export function ratedFromTuple(t: RatedTuple | null | undefined): Rated {
  const [good, ni, poor] = (t || [0, 0, 0]).map((x) => num(x));
  const total = good + ni + poor;
  let rating: Rated["rating"] = null;
  if (total > 0) rating = poor / total > 0.25 ? "poor" : good / total >= 0.75 ? "good" : "ni";
  return { good, ni, poor, total, rating, poorShare: total ? Math.round((poor / total) * 10000) / 10000 : null };
}

export function tupleOf(r: Pick<Rated, "good" | "ni" | "poor">): RatedTuple {
  return [r.good, r.ni, r.poor];
}

const addTuple = (a: RatedTuple, b: RatedTuple): RatedTuple => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export function referrerKind(host: string): ReferrerKind {
  const h = String(host || "").toLowerCase();
  if (!h) return "direct";
  if (isSiteHost(h)) return "internal";
  if (/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai)$/.test(h)) return "ai";
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia)\./.test(h)) return "search";
  if (/(^|\.)(facebook|instagram|reddit|linkedin|whatsapp)\.|(^|\.)t\.co$|(^|\.)x\.com$/.test(h)) return "social";
  return "other";
}

// ---- consultas ------------------------------------------------------------------------------------

export function rumBaseFilter(day: string, mode: HostMode, uy: boolean): Record<string, any> {
  const { geq, lt } = dayBoundsUtc(day);
  const host = mode === "in" ? { requestHost_in: [...SITE_HOSTS] } : { requestHost: SITE_HOSTS[0] };
  return { datetime_geq: geq, datetime_lt: lt, ...host, bot: 0, ...(uy ? { countryName: "UY" } : {}) };
}

const PAGELOAD_TYPE = "AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject";
const VITALS_TYPE = "AccountRumWebVitalsEventsAdaptiveGroupsFilter_InputObject";

function wrap(dataset: string, type: string, body: string, limit: number): string {
  return (
    `query($acct: string!, $filter: ${type}!) { viewer { accounts(filter: { accountTag: $acct }) { ` +
    `${dataset}(limit: ${limit}, filter: $filter, orderBy: [count_DESC]) { ${body} } } } }`
  );
}

const VITAL_SUMS =
  "lcpGood lcpNeedsImprovement lcpPoor lcpTotal inpGood inpNeedsImprovement inpPoor inpTotal " +
  "clsGood clsNeedsImprovement clsPoor clsTotal fcpGood fcpNeedsImprovement fcpPoor fcpTotal " +
  "ttfbGood ttfbNeedsImprovement ttfbPoor ttfbTotal";
const VITAL_P75 = "largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 firstContentfulPaintP75 timeToFirstByteP75";

/** La consulta de una sub-parte para el día `day`. Exportada para que el test lea el filtro. */
export function rumQuery(part: RumPart, day: string, mode: HostMode): { query: string; filter: Record<string, any> } {
  const pl = "rumPageloadEventsAdaptiveGroups";
  const wv = "rumWebVitalsEventsAdaptiveGroups";
  switch (part) {
    case "pages":
      return {
        query: wrap(pl, PAGELOAD_TYPE, "count sum { visits } avg { sampleInterval } dimensions { requestPath deviceType }", 2000),
        filter: rumBaseFilter(day, mode, true),
      };
    case "referrers":
      return {
        query: wrap(pl, PAGELOAD_TYPE, "count sum { visits } avg { sampleInterval } dimensions { refererHost deviceType }", 500),
        filter: rumBaseFilter(day, mode, true),
      };
    case "countries":
      return {
        query: wrap(pl, PAGELOAD_TYPE, "count sum { visits } avg { sampleInterval } dimensions { countryName }", 100),
        filter: rumBaseFilter(day, mode, false),
      };
    case "vitals":
      return {
        query: wrap(
          wv,
          VITALS_TYPE,
          `count avg { sampleInterval } sum { ${VITAL_SUMS} } quantiles { ${VITAL_P75} } dimensions { requestPath deviceType }`,
          2000
        ),
        filter: rumBaseFilter(day, mode, true),
      };
    case "clsElements":
      return {
        query: wrap(
          wv,
          VITALS_TYPE,
          "count avg { sampleInterval } dimensions { requestPath deviceType cumulativeLayoutShiftElement }",
          500
        ),
        filter: { ...rumBaseFilter(day, mode, true), cumulativeLayoutShift_gt: 0.1 },
      };
    case "inpElements":
      return {
        query: wrap(
          wv,
          VITALS_TYPE,
          "count avg { sampleInterval } dimensions { requestPath deviceType interactionToNextPaintElement interactionToNextPaintName }",
          500
        ),
        // Microsegundos: 200 ms = 200000 (R5). El probe con 200 devolvió grupos de 8 ms.
        filter: { ...rumBaseFilter(day, mode, true), interactionToNextPaint_gt: 200000 },
      };
    case "lcpElements":
      return {
        query: wrap(
          wv,
          VITALS_TYPE,
          "count avg { sampleInterval } dimensions { requestPath deviceType largestContentfulPaintElement }",
          500
        ),
        filter: { ...rumBaseFilter(day, mode, true), largestContentfulPaint_gt: 2500000 },
      };
  }
}

/**
 * Los totales uruguayos del día SIN dimensiones: un solo grupo. Se pide sólo cuando la consulta de
 * páginas llegó a su tope, porque entonces sumar sus grupos deja corto el total del sitio (y con él la
 * cobertura de consentimiento y todo denominador de severidad).
 */
export function rumTotalsQuery(day: string, mode: HostMode): { query: string; filter: Record<string, any> } {
  // Sin `orderBy`: no hay dimensión por la que ordenar y un único grupo no lo necesita.
  return {
    query:
      `query($acct: string!, $filter: ${PAGELOAD_TYPE}!) { viewer { accounts(filter: { accountTag: $acct }) { ` +
      "rumPageloadEventsAdaptiveGroups(limit: 1, filter: $filter) { count sum { visits } avg { sampleInterval } } } } }",
    filter: rumBaseFilter(day, mode, true),
  };
}

export const RUM_LIMITS: Record<RumPart, number> = {
  pages: 2000,
  referrers: 500,
  countries: 100,
  vitals: 2000,
  clsElements: 500,
  inpElements: 500,
  lcpElements: 500,
};

export const RUM_SETTINGS_QUERY =
  "query($acct: string!) { viewer { accounts(filter: { accountTag: $acct }) { settings { " +
  "rumPageloadEventsAdaptiveGroups { enabled maxDuration notOlderThan maxPageSize } " +
  "rumWebVitalsEventsAdaptiveGroups { enabled maxDuration notOlderThan maxPageSize } } } } }";

/** Los grupos de un dataset dentro de `data.viewer.accounts[0]`. */
export function rumGroups(data: any, dataset = "rumPageloadEventsAdaptiveGroups"): any[] {
  const acct = data?.viewer?.accounts?.[0] ?? data?.data?.viewer?.accounts?.[0];
  const rows = acct?.[dataset];
  return Array.isArray(rows) ? rows : [];
}

export function parseRumSettings(data: any): CfRumData["settings"] {
  const s = data?.viewer?.accounts?.[0]?.settings ?? data?.data?.viewer?.accounts?.[0]?.settings;
  if (!s) return null;
  return {
    pageloadNotOlderThanDays: secondsToDays(s.rumPageloadEventsAdaptiveGroups?.notOlderThan),
    vitalsNotOlderThanDays: secondsToDays(s.rumWebVitalsEventsAdaptiveGroups?.notOlderThan),
    maxPageSize: Number.isFinite(Number(s.rumPageloadEventsAdaptiveGroups?.maxPageSize))
      ? Number(s.rumPageloadEventsAdaptiveGroups.maxPageSize)
      : null,
  };
}

const intervalOf = (g: any): number => {
  const n = Number(g?.avg?.sampleInterval);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

// ---- analizadores de un día (puros) ---------------------------------------------------------------

export function parsePages(groups: any[]): {
  rows: CfRumDay["pagesByDevice"];
  totals: { loads: number; visits: number };
  sampleInterval: number;
} {
  const merged = new Map<string, { path: string; device: string; loads: number; visits: number }>();
  let loads = 0;
  let visits = 0;
  let interval = 1;
  for (const g of groups) {
    const c = num(g?.count);
    const v = num(g?.sum?.visits);
    loads += c;
    visits += v;
    interval = Math.max(interval, intervalOf(g));
    const path = sitePath(g?.dimensions?.requestPath);
    if (!path) continue;
    const device = String(g?.dimensions?.deviceType || "unknown").toLowerCase();
    const key = `${path}|${device}`;
    const e = merged.get(key) || { path, device, loads: 0, visits: 0 };
    e.loads += c;
    e.visits += v;
    merged.set(key, e);
  }
  const rows = [...merged.values()].sort((a, b) => b.loads - a.loads).slice(0, DAY_CF_PAGES_BY_DEVICE);
  return { rows, totals: { loads, visits }, sampleInterval: interval };
}

export function parseReferrers(groups: any[]): CfRumDay["referrers"] {
  const merged = new Map<string, { host: string; device: string; loads: number; visits: number }>();
  for (const g of groups) {
    // Sólo el host: `refererPath` puede traer la búsqueda de otro sitio y no se pide nunca.
    const host = String(g?.dimensions?.refererHost || "").toLowerCase();
    const device = String(g?.dimensions?.deviceType || "unknown").toLowerCase();
    const key = `${host}|${device}`;
    const e = merged.get(key) || { host, device, loads: 0, visits: 0 };
    e.loads += num(g?.count);
    e.visits += num(g?.sum?.visits);
    merged.set(key, e);
  }
  return [...merged.values()].sort((a, b) => b.loads - a.loads).slice(0, DAY_CF_REFERRERS);
}

export function parseCountries(groups: any[]): { rows: CfRumDay["countries"]; totals: { loads: number; visits: number } } {
  const merged = new Map<string, { country: string; loads: number; visits: number }>();
  let loads = 0;
  let visits = 0;
  for (const g of groups) {
    const country = String(g?.dimensions?.countryName || "??").toUpperCase();
    const e = merged.get(country) || { country, loads: 0, visits: 0 };
    e.loads += num(g?.count);
    e.visits += num(g?.sum?.visits);
    loads += num(g?.count);
    visits += num(g?.sum?.visits);
    merged.set(country, e);
  }
  return { rows: [...merged.values()].sort((a, b) => b.loads - a.loads).slice(0, DAY_CF_COUNTRIES), totals: { loads, visits } };
}

export function parseVitals(groups: any[]): CfRumDayVital[] {
  const out: CfRumDayVital[] = [];
  for (const g of groups) {
    const path = sitePath(g?.dimensions?.requestPath);
    if (!path) continue;
    const s = g?.sum || {};
    const q = g?.quantiles || {};
    const t = (k: string): RatedTuple => [num(s[`${k}Good`]), num(s[`${k}NeedsImprovement`]), num(s[`${k}Poor`])];
    out.push({
      path,
      device: String(g?.dimensions?.deviceType || "unknown").toLowerCase(),
      samples: num(g?.count),
      sampleInterval: intervalOf(g),
      lcp: t("lcp"),
      inp: t("inp"),
      cls: t("cls"),
      fcp: t("fcp"),
      ttfb: t("ttfb"),
      p75: {
        lcpMs: usToMs(q.largestContentfulPaintP75),
        inpMs: usToMs(q.interactionToNextPaintP75),
        cls: clsValue(q.cumulativeLayoutShiftP75),
        fcpMs: usToMs(q.firstContentfulPaintP75),
        ttfbMs: usToMs(q.timeToFirstByteP75),
      },
    });
  }
  return out.sort((a, b) => b.samples - a.samples).slice(0, DAY_CF_VITALS);
}

export function parseElements(metric: CfElementRow["metric"], groups: any[], cap = DAY_CF_ELEMENTS_PER_METRIC): CfElementRow[] {
  const field =
    metric === "cls"
      ? "cumulativeLayoutShiftElement"
      : metric === "inp"
        ? "interactionToNextPaintElement"
        : "largestContentfulPaintElement";
  const merged = new Map<string, CfElementRow>();
  for (const g of groups) {
    const path = sitePath(g?.dimensions?.requestPath);
    if (!path) continue;
    const device = String(g?.dimensions?.deviceType || "unknown").toLowerCase();
    // Un elemento vacío es común (el corrimiento no se pudo atribuir): se guarda "" y nunca se descarta.
    const element = String(g?.dimensions?.[field] ?? "");
    const inpName = metric === "inp" ? String(g?.dimensions?.interactionToNextPaintName || "") || null : null;
    const key = `${path}|${device}|${element}|${inpName ?? ""}`;
    const e = merged.get(key) || { metric, path, device, element, inpName, events: 0 };
    e.events += num(g?.count);
    merged.set(key, e);
  }
  return [...merged.values()].sort((a, b) => b.events - a.events).slice(0, cap);
}

// ---- un día ---------------------------------------------------------------------------------------

export interface DayFetch {
  day: CfRumDay;
  failed: RumPart[];
  truncated: boolean;
  rowsSeen: Record<string, number>;
  hostMode: HostMode;
  hostFallback: boolean;
}

/**
 * Las siete consultas de un día, cada una en su propio try. Un `CfAuthzError` o `CfBudgetError` se
 * propaga (la corrida para); cualquier otro error deja esa sub-parte como `missing`.
 */
export async function fetchRumDay(client: CfClient, account: string, day: string, mode: HostMode): Promise<DayFetch> {
  const failed: RumPart[] = [];
  const rowsSeen: Record<string, number> = {};
  let truncated = false;
  let hostMode = mode;
  let hostFallback = false;
  const raw: Partial<Record<RumPart, any[]>> = {};
  for (const part of RUM_PARTS) {
    const dataset =
      part === "pages" || part === "referrers" || part === "countries"
        ? "rumPageloadEventsAdaptiveGroups"
        : "rumWebVitalsEventsAdaptiveGroups";
    const run = async (m: HostMode) => {
      const { query, filter } = rumQuery(part, day, m);
      const res = await client.graphql(query, { acct: account, filter }, "account");
      return rumGroups(res.data, dataset);
    };
    try {
      let groups: any[];
      try {
        groups = await run(hostMode);
      } catch (e) {
        // R19: si el esquema rechaza `requestHost_in`, se vuelve a la forma exacta capturada en vivo.
        if (e instanceof CfQueryError && e.namesRequestHostIn && hostMode === "in") {
          hostMode = "exact";
          hostFallback = true;
          groups = await run(hostMode);
        } else throw e;
      }
      raw[part] = groups;
      rowsSeen[part] = groups.length;
      if (groups.length >= RUM_LIMITS[part]) truncated = true;
    } catch (e) {
      if (e instanceof CfAuthzError || e instanceof CfBudgetError) throw e;
      failed.push(part);
    }
  }
  const pages = parsePages(raw.pages || []);
  // La lista de páginas llegó al tope: sus grupos suman menos que el día. El total sale de una
  // consulta sin dimensiones; si falla, el día lo dice (`missing: totals`) y se vuelve a pedir.
  const pagesTruncated = !failed.includes("pages") && (raw.pages || []).length >= RUM_LIMITS.pages;
  const extraMissing: string[] = [];
  if (pagesTruncated) {
    try {
      const { query, filter } = rumTotalsQuery(day, hostMode);
      const res = await client.graphql(query, { acct: account, filter }, "account");
      const g = rumGroups(res.data)[0];
      if (!g) throw new Error("sin grupo");
      pages.totals = { loads: num(g.count), visits: num(g.sum?.visits) };
    } catch (e) {
      if (e instanceof CfAuthzError || e instanceof CfBudgetError) throw e;
      extraMissing.push("totals");
    }
  }
  const missing = [...failed, ...extraMissing];
  const countries = parseCountries(raw.countries || []);
  const vitals = parseVitals(raw.vitals || []);
  const elements = [
    ...parseElements("cls", raw.clsElements || []),
    ...parseElements("inp", raw.inpElements || []),
    ...parseElements("lcp", raw.lcpElements || []),
  ];
  const interval = Math.max(
    pages.sampleInterval,
    ...(raw.vitals || []).map(intervalOf),
    ...(raw.referrers || []).map(intervalOf),
    ...(raw.countries || []).map(intervalOf)
  );
  return {
    day: {
      suspect: false,
      sampleInterval: Number.isFinite(interval) && interval > 0 ? interval : 1,
      ...(missing.length ? { missing } : {}),
      ...(pagesTruncated ? { pagesTruncated: true } : {}),
      totals: { uy: pages.totals, all: countries.totals },
      pagesByDevice: pages.rows,
      referrers: parseReferrers(raw.referrers || []),
      countries: countries.rows,
      vitals,
      elements,
    },
    failed,
    truncated,
    rowsSeen,
    hostMode,
    hostFallback,
  };
}

// ---- el bloque de 28 días (puro) ------------------------------------------------------------------

export interface ArchivedRumDay {
  day: string;
  data: CfRumDay;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * ¿El día parece un beacon o una API rota? Cargas uruguayas en 0, o bajo el 30 % de la mediana de
 * los últimos 7 días archivados no sospechosos.
 */
export function dayLooksThin(day: string, loadsUy: number, archived: ArchivedRumDay[]): { thin: boolean; ratio: number | null } {
  if (loadsUy <= 0) return { thin: true, ratio: 0 };
  const before = archived
    .filter((d) => d.day < day && !d.data?.suspect && daysBetween(d.day, day) <= CF_RECENT_DAYS)
    .map((d) => num(d.data?.totals?.uy?.loads))
    .filter((n) => n > 0);
  if (!before.length) return { thin: false, ratio: null };
  const m = median(before);
  const ratio = m > 0 ? loadsUy / m : null;
  return { thin: ratio !== null && ratio < THIN_FACTOR, ratio };
}

/** La racha más larga de días consecutivos que termina en el último día cubierto. */
export function contiguousSuffix(days: string[]): string[] {
  const sorted = [...new Set(days)].sort();
  if (!sorted.length) return [];
  const out = [sorted[sorted.length - 1]];
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (daysBetween(sorted[i], out[0]) === 1) out.unshift(sorted[i]);
    else break;
  }
  return out;
}

export function buildCfRumBlock(
  archived: ArchivedRumDay[],
  window: DayWindow,
  dataDay: string,
  settings: CfRumData["settings"] = null
): CfRumData {
  const inWindow = archived.filter((d) => d.day >= window.start && d.day <= window.end && d.data);
  const byDay = new Map(inWindow.map((d) => [d.day, d.data]));
  const suspectDays = inWindow
    .filter((d) => d.data.suspect)
    .map((d) => d.day)
    .sort();
  const daysCovered = contiguousSuffix(inWindow.filter((d) => !d.data.suspect).map((d) => d.day));
  const covered = daysCovered.map((d) => ({ day: d, data: byDay.get(d)! }));

  const totals = { uy: { loads: 0, visits: 0 }, all: { loads: 0, visits: 0 } };
  const pages = new Map<string, { path: string; loads: number; visits: number; mobile: number; desktop: number; tablet: number }>();
  const devices = new Map<string, { device: string; loads: number; visits: number }>();
  const referrers = new Map<string, { host: string; kind: ReferrerKind; loads: number; visits: number }>();
  const countries = new Map<string, { country: string; loads: number; visits: number }>();
  type VAgg = {
    path: string;
    device: string;
    samples: number;
    realSamples: number;
    lcp: RatedTuple;
    inp: RatedTuple;
    cls: RatedTuple;
    p75: CfVitalRow["p75Approx"];
  };
  const vitals = new Map<string, VAgg>();
  const vitalsDev = new Map<string, VAgg>();
  const elements = new Map<string, CfElementRow>();
  let internalLoads = 0;
  let referrerLoads = 0;

  const addVital = (map: Map<string, VAgg>, key: string, path: string, v: CfRumDayVital, day: string) => {
    const e = map.get(key) || {
      path,
      device: v.device,
      samples: 0,
      realSamples: 0,
      lcp: [0, 0, 0],
      inp: [0, 0, 0],
      cls: [0, 0, 0],
      p75: null,
    };
    e.samples += num(v.samples);
    e.realSamples += num(v.samples) / (v.sampleInterval > 0 ? v.sampleInterval : 1);
    e.lcp = addTuple(e.lcp, v.lcp);
    e.inp = addTuple(e.inp, v.inp);
    e.cls = addTuple(e.cls, v.cls);
    if (path !== "*" && (!e.p75 || e.p75.day < day)) e.p75 = { ...v.p75, day };
    map.set(key, e);
  };

  const partialDays = { countries: 0, vitals: 0, pagesTruncated: 0, totalsUndercount: 0 };
  /** Cargas uruguayas sólo de los días que también tienen el total de todos los países. */
  let uyLoadsWithAll = 0;
  for (const { day, data } of covered) {
    const missing = new Set(data.missing || []);
    totals.uy.loads += num(data.totals?.uy?.loads);
    totals.uy.visits += num(data.totals?.uy?.visits);
    if (data.pagesTruncated) partialDays.pagesTruncated++;
    if (data.pagesTruncated && missing.has("totals")) partialDays.totalsUndercount++;
    // Un día sin `countries` sumaría 0 a todos los países y su total uruguayo entero: la porción
    // uruguaya subiría (hasta pasar de 1). Esos días quedan afuera de `all` y de `uyShare`.
    if (missing.has("countries")) partialDays.countries++;
    else {
      totals.all.loads += num(data.totals?.all?.loads);
      totals.all.visits += num(data.totals?.all?.visits);
      uyLoadsWithAll += num(data.totals?.uy?.loads);
    }
    for (const r of data.pagesByDevice || []) {
      const p = pages.get(r.path) || { path: r.path, loads: 0, visits: 0, mobile: 0, desktop: 0, tablet: 0 };
      p.loads += num(r.loads);
      p.visits += num(r.visits);
      if (r.device === "mobile" || r.device === "desktop" || r.device === "tablet") p[r.device] += num(r.loads);
      pages.set(r.path, p);
      const d = devices.get(r.device) || { device: r.device, loads: 0, visits: 0 };
      d.loads += num(r.loads);
      d.visits += num(r.visits);
      devices.set(r.device, d);
    }
    for (const r of data.referrers || []) {
      const e = referrers.get(r.host) || { host: r.host, kind: referrerKind(r.host), loads: 0, visits: 0 };
      e.loads += num(r.loads);
      e.visits += num(r.visits);
      referrers.set(r.host, e);
      referrerLoads += num(r.loads);
      if (isSiteHost(r.host)) internalLoads += num(r.loads);
    }
    for (const r of data.countries || []) {
      const e = countries.get(r.country) || { country: r.country, loads: 0, visits: 0 };
      e.loads += num(r.loads);
      e.visits += num(r.visits);
      countries.set(r.country, e);
    }
    // Un día sin la consulta de vitals no aporta ceros a las calificaciones: no entra.
    if (missing.has("vitals")) partialDays.vitals++;
    else {
      for (const v of data.vitals || []) {
        addVital(vitals, `${v.path}|${v.device}`, v.path, v, day);
        addVital(vitalsDev, `*|${v.device}`, "*", v, day);
      }
    }
    for (const el of data.elements || []) {
      const key = `${el.metric}|${el.path}|${el.device}|${el.element}|${el.inpName ?? ""}`;
      const e = elements.get(key) || { ...el, events: 0 };
      e.events += num(el.events);
      elements.set(key, e);
    }
  }

  const toVitalRow = (v: VAgg): CfVitalRow => ({
    path: v.path,
    device: v.device,
    samples: v.samples,
    realSamples: Math.round(v.realSamples * 100) / 100,
    lcp: ratedFromTuple(v.lcp),
    inp: ratedFromTuple(v.inp),
    cls: ratedFromTuple(v.cls),
    p75Approx: v.p75,
  });

  const elementRows: CfElementRow[] = [];
  for (const metric of ["cls", "inp", "lcp"] as const) {
    elementRows.push(
      ...[...elements.values()]
        .filter((e) => e.metric === metric)
        .sort((a, b) => b.events - a.events)
        .slice(0, CF_ELEMENTS_PER_METRIC)
    );
  }

  // R1, R17: el lado Cloudflare de la comparación de consentimiento, hasta anteayer.
  let consent: CfRumData["consent"] = null;
  if (daysCovered.length) {
    const start = daysCovered[0];
    const lastCovered = daysCovered[daysCovered.length - 1];
    const end = lastCovered < addDays(dataDay, -1) ? lastCovered : addDays(dataDay, -1);
    if (start <= end) {
      const cp = new Map<string, { path: string; loads: number; visits: number; realVisits: number }>();
      const ct = { loads: 0, visits: 0, realVisits: 0 };
      let days = 0;
      let pagesTruncated = false;
      let totalsUndercount = false;
      for (const { day, data } of covered) {
        if (day < start || day > end) continue;
        days += 1;
        if (data.pagesTruncated) {
          pagesTruncated = true;
          if ((data.missing || []).includes("totals")) totalsUndercount = true;
        }
        const interval = data.sampleInterval > 0 ? data.sampleInterval : 1;
        ct.loads += num(data.totals?.uy?.loads);
        ct.visits += num(data.totals?.uy?.visits);
        ct.realVisits += num(data.totals?.uy?.visits) / interval;
        for (const r of data.pagesByDevice || []) {
          const e = cp.get(r.path) || { path: r.path, loads: 0, visits: 0, realVisits: 0 };
          e.loads += num(r.loads);
          e.visits += num(r.visits);
          e.realVisits += num(r.visits) / interval;
          cp.set(r.path, e);
        }
      }
      const round = (n: number) => Math.round(n * 100) / 100;
      consent = {
        range: { start, end },
        days,
        totals: { loads: ct.loads, visits: ct.visits, realVisits: round(ct.realVisits) },
        pages: [...cp.values()]
          .sort((a, b) => b.visits - a.visits || b.loads - a.loads)
          .slice(0, CONSENT_PAGES)
          .map((p) => ({ ...p, realVisits: round(p.realVisits) })),
        pagesTruncated,
        totalsUndercount,
      };
    }
  }

  return {
    daysCovered,
    suspectDays,
    settings,
    totals: {
      uy: totals.uy,
      all: totals.all,
      uyShare: totals.all.loads ? Math.round((uyLoadsWithAll / totals.all.loads) * 10000) / 10000 : null,
    },
    daily: covered
      .map(({ day, data }) => ({
        day,
        loadsUy: num(data.totals?.uy?.loads),
        visitsUy: num(data.totals?.uy?.visits),
        loadsAll: num(data.totals?.all?.loads),
        sampleInterval: data.sampleInterval || 1,
      }))
      .slice(-CF_DAILY),
    devices: [...devices.values()].sort((a, b) => b.loads - a.loads).slice(0, CF_DEVICES),
    pages: [...pages.values()].sort((a, b) => b.loads - a.loads).slice(0, CF_PAGES),
    referrers: [...referrers.values()].sort((a, b) => b.loads - a.loads).slice(0, CF_REFERRERS),
    countries: [...countries.values()].sort((a, b) => b.loads - a.loads).slice(0, CF_COUNTRIES),
    vitals: [...vitals.values()]
      .sort((a, b) => b.realSamples - a.realSamples)
      .slice(0, CF_VITALS)
      .map(toVitalRow),
    vitalsByDevice: [...vitalsDev.values()].sort((a, b) => b.samples - a.samples).map(toVitalRow),
    elements: elementRows,
    consent,
    internalLoadsShare: referrerLoads && totals.uy.loads ? Math.round((internalLoads / totals.uy.loads) * 10000) / 10000 : null,
    partialDays,
  };
}

// ---- la corrida -----------------------------------------------------------------------------------

export interface CfRumRunInput {
  client: CfClient;
  dataDay: string;
  window: DayWindow;
  /** Lo archivado de [dataDay − 40, dataDay], que el que llama leyó del store. */
  archived: ArchivedRumDay[];
  state: InsightState["cfRum"];
  backfillDays: number;
  nowIso: string;
  log: (line: string) => void;
}

export interface CfRumRunResult {
  outcome: BlockOutcome<CfRumData>;
  /** Días traídos en esta corrida, para archivar (salvo en un dry run). */
  fetched: { day: string; data: CfRumDay }[];
  state: InsightState["cfRum"];
  queries: number;
}

/** Los días a pedir, del más nuevo al más viejo (2.3.2). */
export function planRumDays(dataDay: string, archived: ArchivedRumDay[], backfillTarget: string | null): string[] {
  const have = new Map(archived.map((d) => [d.day, d.data]));
  const out = [dataDay];
  for (let i = 1; i < CF_RECENT_DAYS; i++) {
    const d = addDays(dataDay, -i);
    const stored = have.get(d);
    if (!stored || (stored.missing && stored.missing.length)) out.push(d);
  }
  if (backfillTarget) {
    for (let d = addDays(dataDay, -CF_RECENT_DAYS); d >= backfillTarget; d = addDays(d, -1)) {
      if (!have.has(d)) out.push(d);
    }
  }
  return out;
}

export async function runCloudflareRum(input: CfRumRunInput): Promise<CfRumRunResult> {
  const { client, dataDay, window, log } = input;
  const state = { ...input.state };
  if (!client.hasTokens()) {
    return { outcome: { kind: "inactive", enableHint: RUM_ENABLE_HINT }, fetched: [], state, queries: 0 };
  }
  let account: string;
  try {
    account = await client.accountId();
  } catch (e) {
    if (e instanceof CfAuthzError) {
      return { outcome: { kind: "inactive", enableHint: RUM_ENABLE_HINT }, fetched: [], state, queries: client.queriesUsed() };
    }
    throw e;
  }

  let settings: CfRumData["settings"] = null;
  try {
    const res = await client.graphql(RUM_SETTINGS_QUERY, { acct: account }, "account");
    settings = parseRumSettings(res.data);
  } catch (e) {
    if (e instanceof CfAuthzError) {
      return { outcome: { kind: "inactive", enableHint: RUM_ENABLE_HINT }, fetched: [], state, queries: client.queriesUsed() };
    }
    log(`[usage-insights] cloudflareRum: settings no disponibles (${sanitizeError(e, "cloudflareRum")})`);
  }

  if (input.backfillDays > 0) {
    const limit = Math.min(input.backfillDays, CF_BACKFILL_MAX_DAYS, settings?.pageloadNotOlderThanDays || CF_BACKFILL_MAX_DAYS);
    const target = addDays(dataDay, -(Math.max(1, limit) - 1));
    if (!state.backfillTarget || target < state.backfillTarget) state.backfillTarget = target;
  }

  const archive = [...input.archived];
  const fetched: { day: string; data: CfRumDay }[] = [];
  let mode: HostMode = "in";
  let fallbackNote = false;
  let yesterday: DayFetch | null = null;
  let budgetStopped = false;
  const notes: string[] = [];

  for (const day of planRumDays(dataDay, archive, state.backfillTarget)) {
    let f: DayFetch;
    try {
      f = await fetchRumDay(client, account, day, mode);
    } catch (e) {
      if (e instanceof CfBudgetError) {
        budgetStopped = true;
        break;
      }
      if (e instanceof CfAuthzError) {
        if (!fetched.length) {
          return { outcome: { kind: "inactive", enableHint: RUM_ENABLE_HINT }, fetched: [], state, queries: client.queriesUsed() };
        }
        break;
      }
      throw e;
    }
    mode = f.hostMode;
    if (f.hostFallback) fallbackNote = true;
    if (f.failed.includes("pages")) {
      // Sin las páginas el día no sirve para sumar: no se archiva.
      if (day === dataDay) yesterday = f;
      continue;
    }
    const loads = f.day.totals.uy.loads;
    const guard = dayLooksThin(day, loads, archive);
    if (day === dataDay) {
      const streak = state.suspectSince ? daysBetween(state.suspectSince, dataDay) : 0;
      if (guard.thin && streak < CF_RECENT_DAYS) {
        f.day.suspect = true;
        state.suspectSince = state.suspectSince || dataDay;
        notes.push(
          `las cargas de ayer cayeron a ${guard.ratio === null ? 0 : Math.round(guard.ratio * 100)} % de la mediana: ¿se rompió el beacon o la API?`
        );
      } else if (!guard.thin) {
        state.suspectSince = null;
      }
      yesterday = f;
    } else if (guard.thin && loads <= 0) {
      f.day.suspect = true;
    }
    fetched.push({ day, data: f.day });
    const i = archive.findIndex((d) => d.day === day);
    if (i >= 0) archive[i] = { day, data: f.day };
    else archive.push({ day, data: f.day });
  }

  if (state.backfillTarget) {
    const have = new Set(archive.map((d) => d.day));
    let missing = false;
    for (let d = addDays(dataDay, -1); d >= state.backfillTarget; d = addDays(d, -1)) {
      if (!have.has(d)) {
        missing = true;
        break;
      }
    }
    if (!missing) state.backfillTarget = null;
  }

  const data = buildCfRumBlock(archive, window, dataDay, settings);
  if (fallbackNote) notes.push("requestHost_in rechazado: se usó el host exacto");
  if (budgetStopped) notes.push("tope de consultas por corrida: el resto del backfill sigue mañana");
  const rowsSeen = yesterday?.rowsSeen || {};
  const truncated = !!yesterday?.truncated;

  if (!yesterday) {
    return {
      outcome: { kind: "failed", note: notes.join(" · ") || "cloudflareRum: no se pudo leer el día" },
      fetched,
      state,
      queries: client.queriesUsed(),
    };
  }
  if (yesterday.failed.includes("pages")) {
    return {
      outcome: { kind: "failed", note: "cloudflareRum: falló la consulta de páginas de ayer" },
      fetched,
      state,
      queries: client.queriesUsed(),
    };
  }
  if (yesterday.day.suspect) {
    return {
      outcome: { kind: "thin", data, window, truncated, rowsSeen, note: notes.join(" · ") },
      fetched,
      state,
      queries: client.queriesUsed(),
    };
  }
  if (yesterday.failed.length) {
    return {
      outcome: { kind: "partial", data, carried: [...yesterday.failed], window, truncated, rowsSeen, note: notes.join(" · ") || null },
      fetched,
      state,
      queries: client.queriesUsed(),
    };
  }
  return {
    outcome: { kind: "ok", data, window, truncated, rowsSeen, note: notes.join(" · ") || null },
    fetched,
    state,
    queries: client.queriesUsed(),
  };
}
