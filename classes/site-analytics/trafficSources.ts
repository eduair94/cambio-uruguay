// De dónde viene la gente: /origen-del-trafico.
//
// Quinto documento del job `currency-site-analytics` (`sitetrafficsources`, APP DB, PÚBLICO). Igual
// que `publicTopPages.ts`, se arma CAMPO POR CAMPO: lo que no está escrito acá no se publica.
//
// Dos mitades, como `refresh.ts`: `buildTrafficSources()` es PURO (reportes → documento, con test) y
// `refreshTrafficSources()` es el envoltorio de red que llama el job.
//
// TRES REGLAS QUE SALIERON DE MEDIR (2026-10-30):
//   * Todo reporte filtra por `hostName`. La propiedad GA4 la compartió otra aplicación del mismo
//     dueño hasta julio de 2026 y la usan los servidores de desarrollo: sin el filtro, el segundo
//     "referente" del sitio era esa aplicación y Reddit "llevaba gente" a páginas que acá no existen.
//   * La ventana es de 90 días, no de 28: los sitios que enlazan mandan pocas visitas y en 28 días
//     casi todos quedan debajo del umbral. La historia mensual es de 24 meses, para que un enlace
//     grande de hace un año no desaparezca de la respuesta.
//   * Un sitio se nombra con ≥ {@link MIN_LISTED_SESSIONS} sesiones en la historia, y una página que
//     enlaza con ≥ {@link MIN_REFERRER_VIEWS} vistas, sin querystring. Una visita suelta desde una
//     intranet o un documento de Office no es un dato para publicar.
import { exactDimension, ga4PropertyId, reportRows, runReports } from "./ga4";
import type { Ga4Report, Ga4ReportRequest } from "./ga4";
import { addDays, DEFAULT_TIMEZONE, normalizeGaDate, publicPath, ymdInTimeZone } from "./refresh";
import { kindOf, SITE_HOSTS, SOURCE_KINDS, sourceId, sourceLabel } from "./sourceKinds";
import type { SourceKind } from "./sourceKinds";

export const TRAFFIC_SOURCES_KEY = "site";
export const CURRENT_DAYS = 90;
export const HISTORY_MONTHS = 24;
export const MIN_LISTED_SESSIONS = 3;
export const MIN_REFERRER_VIEWS = 3;
export const MAX_SOURCES = 80;
export const MAX_REFERRERS = 40;
export const MAX_LANDINGS = 3;
/** Tipos que nunca se listan por nombre: no son un "de dónde". */
const UNLISTED_KINDS: readonly SourceKind[] = ["directo", "sin-atribuir"];
/** Tipos cuyas páginas de origen se publican. Nunca correo (puede ser una bandeja), IA ni buscadores. */
const REFERRER_KINDS: readonly SourceKind[] = ["sitio", "social", "propio"];

export interface TrafficWindows {
  current: { start: string; end: string; days: number };
  history: { start: string; end: string; months: number };
  /** `YYYY-MM`, del más viejo al más nuevo (el último puede estar en curso). */
  months: string[];
}

export function trafficWindows(now: Date, tz: string = DEFAULT_TIMEZONE): TrafficWindows {
  const end = addDays(ymdInTimeZone(now, tz), -1);
  const [y, m] = end.split("-").map(Number);
  const months: string[] = [];
  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
    const at = new Date(Date.UTC(y, m - 1 - i, 1));
    months.push(at.toISOString().slice(0, 7));
  }
  return {
    current: { start: addDays(end, -(CURRENT_DAYS - 1)), end, days: CURRENT_DAYS },
    history: { start: `${months[0]}-01`, end, months: HISTORY_MONTHS },
    months,
  };
}

const onSite = { filter: { fieldName: "hostName", inListFilter: { values: [...SITE_HOSTS] } } };
const notSearchNorDirect = {
  notExpression: { filter: { fieldName: "sessionMedium", inListFilter: { values: ["organic", "(none)"] } } },
};
const notOwnReferrer = {
  notExpression: {
    filter: { fieldName: "pageReferrer", stringFilter: { matchType: "CONTAINS", value: "cambio-uruguay.com" } },
  },
};
const and = (...expressions: any[]) => ({ andGroup: { expressions } });

/** Los reportes del documento. El orden importa: `buildTrafficSources` los lee por posición. */
export function trafficSourceRequests(w: TrafficWindows): Ga4ReportRequest[] {
  const metrics = (names: string[]) => names.map((name) => ({ name }));
  const dims = (names: string[]) => names.map((name) => ({ name }));
  const cur = [{ startDate: w.current.start, endDate: w.current.end }];
  const hist = [{ startDate: w.history.start, endDate: w.history.end }];
  const uy = exactDimension("countryId", "UY");
  return [
    // 0, 1 — ventana actual por fuente: todo el mundo y sólo Uruguay
    {
      dateRanges: cur,
      dimensions: dims(["sessionSource", "sessionMedium"]),
      metrics: metrics(["sessions", "engagedSessions"]),
      dimensionFilter: onSite,
      limit: 5000,
    },
    {
      dateRanges: cur,
      dimensions: dims(["sessionSource", "sessionMedium"]),
      metrics: metrics(["sessions", "engagedSessions"]),
      dimensionFilter: and(onSite, uy),
      limit: 5000,
    },
    // 2, 3 — historia mensual por fuente: todo el mundo y sólo Uruguay
    {
      dateRanges: hist,
      dimensions: dims(["yearMonth", "sessionSource", "sessionMedium"]),
      metrics: metrics(["sessions"]),
      dimensionFilter: onSite,
      limit: 50000,
    },
    {
      dateRanges: hist,
      dimensions: dims(["yearMonth", "sessionSource", "sessionMedium"]),
      metrics: metrics(["sessions"]),
      dimensionFilter: and(onSite, uy),
      limit: 50000,
    },
    // 4 — por día, sin buscadores ni directo: el pico y los días activos de cada referente
    {
      dateRanges: hist,
      dimensions: dims(["date", "sessionSource", "sessionMedium"]),
      metrics: metrics(["sessions"]),
      dimensionFilter: and(onSite, notSearchNorDirect),
      limit: 100000,
    },
    // 5 — a qué página llega la gente de cada referente
    {
      dateRanges: hist,
      dimensions: dims(["sessionSource", "sessionMedium", "landingPage"]),
      metrics: metrics(["sessions"]),
      dimensionFilter: and(onSite, notSearchNorDirect),
      limit: 50000,
    },
    // 6 — la página exacta que tenía el enlace
    {
      dateRanges: hist,
      dimensions: dims(["pageReferrer"]),
      metrics: metrics(["screenPageViews"]),
      dimensionFilter: and(onSite, notOwnReferrer),
      limit: 50000,
    },
  ];
}

export interface TrafficLanding {
  path: string;
  sessions: number;
}

export interface TrafficSourceRow {
  id: string;
  label: string;
  kind: SourceKind;
  /** Ventana actual (90 días), todo el mundo. */
  sessions: number;
  engagedSessions: number;
  /** Ventana actual, sólo Uruguay. */
  sessionsUy: number;
  engagedSessionsUy: number;
  /** 24 meses. */
  history: number;
  historyUy: number;
  /** Sesiones por mes, todo el mundo, alineado con `months`. */
  monthly: number[];
  /** Días con al menos una sesión en la historia; `null` para buscadores (no se pide su diario). */
  activeDays: number | null;
  /** El día que más sesiones trajo. */
  peak: { day: string; sessions: number } | null;
  landings: TrafficLanding[];
}

export interface TrafficKindRow {
  kind: SourceKind;
  sessions: number;
  engagedSessions: number;
  sessionsUy: number;
  engagedSessionsUy: number;
  history: number;
  historyUy: number;
  monthly: number[];
  monthlyUy: number[];
}

export interface TrafficReferrerRow {
  /** `host/ruta`, sin esquema, querystring ni ancla. */
  url: string;
  sourceId: string;
  kind: SourceKind;
  views: number;
}

export interface TrafficSourcesSnapshot {
  key: string;
  asOf: string;
  range: { start: string; end: string; days: number };
  history: { start: string; end: string; months: number };
  months: string[];
  totals: {
    sessions: number;
    engagedSessions: number;
    sessionsUy: number;
    engagedSessionsUy: number;
    history: number;
    historyUy: number;
  };
  kinds: TrafficKindRow[];
  sources: TrafficSourceRow[];
  /** Fuentes con nombre que no llegaron al umbral: sólo cuántas y cuánto suman. */
  others: { count: number; history: number };
  referrers: TrafficReferrerRow[];
}

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

interface Acc {
  id: string;
  kind: SourceKind;
  kindWeight: number;
  sessions: number;
  engagedSessions: number;
  sessionsUy: number;
  engagedSessionsUy: number;
  history: number;
  historyUy: number;
  monthly: number[];
  monthlyUy: number[];
  days: Map<string, number>;
  landings: Map<string, number>;
}

/**
 * La página que tenía el enlace, como se publica: host + ruta, sin `www.`, querystring ni ancla, y
 * sólo si es una URL web. `null` si no hay nada publicable.
 */
export function publicReferrer(raw: string): { url: string; host: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(String(raw || ""));
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, "") : "";
  return { url: `${host}${path}`, host };
}

export interface BuildTrafficContext {
  windows: TrafficWindows;
  asOf: string;
}

/** Puro: los siete reportes de {@link trafficSourceRequests}, en orden, se vuelven un documento. */
export function buildTrafficSources(reports: Ga4Report[], ctx: BuildTrafficContext): TrafficSourcesSnapshot {
  const { windows } = ctx;
  const monthIndex = new Map(windows.months.map((m, i) => [m, i]));
  const zeros = () => windows.months.map(() => 0);
  const accs = new Map<string, Acc>();

  const accOf = (source: unknown, medium: unknown, weight: number): Acc => {
    const id = sourceId(String(source ?? ""));
    const kind = kindOf(id, String(medium ?? ""));
    let acc = accs.get(id);
    if (!acc) {
      acc = {
        id,
        kind,
        kindWeight: 0,
        sessions: 0,
        engagedSessions: 0,
        sessionsUy: 0,
        engagedSessionsUy: 0,
        history: 0,
        historyUy: 0,
        monthly: zeros(),
        monthlyUy: zeros(),
        days: new Map(),
        landings: new Map(),
      };
      accs.set(id, acc);
    }
    // Un mismo id puede llegar con dos medios (`chatgpt.com` como referral y como ai-assistant):
    // manda el tipo del medio que más sesiones trajo.
    if (weight > acc.kindWeight) {
      acc.kindWeight = weight;
      acc.kind = kind;
    }
    return acc;
  };

  for (const row of reportRows(reports[0])) {
    const acc = accOf(row.sessionSource, row.sessionMedium, n(row.sessions));
    acc.sessions += n(row.sessions);
    acc.engagedSessions += n(row.engagedSessions);
  }
  for (const row of reportRows(reports[1])) {
    const acc = accOf(row.sessionSource, row.sessionMedium, 0);
    acc.sessionsUy += n(row.sessions);
    acc.engagedSessionsUy += n(row.engagedSessions);
  }
  for (const [report, uy] of [
    [reports[2], false],
    [reports[3], true],
  ] as const) {
    for (const row of reportRows(report)) {
      const ym = String(row.yearMonth ?? "");
      const i = monthIndex.get(`${ym.slice(0, 4)}-${ym.slice(4, 6)}`);
      const acc = accOf(row.sessionSource, row.sessionMedium, uy ? 0 : n(row.sessions));
      if (uy) acc.historyUy += n(row.sessions);
      else acc.history += n(row.sessions);
      if (i !== undefined) (uy ? acc.monthlyUy : acc.monthly)[i] += n(row.sessions);
    }
  }
  for (const row of reportRows(reports[4])) {
    const acc = accs.get(sourceId(String(row.sessionSource ?? "")));
    if (!acc) continue;
    const day = normalizeGaDate(String(row.date ?? ""));
    acc.days.set(day, (acc.days.get(day) || 0) + n(row.sessions));
  }
  for (const row of reportRows(reports[5])) {
    const acc = accs.get(sourceId(String(row.sessionSource ?? "")));
    const raw = String(row.landingPage ?? "");
    if (!acc || !raw.startsWith("/")) continue;
    const path = publicPath(raw);
    acc.landings.set(path, (acc.landings.get(path) || 0) + n(row.sessions));
  }

  const all = [...accs.values()];
  const kinds: TrafficKindRow[] = SOURCE_KINDS.map((kind) => {
    const of = all.filter((a) => a.kind === kind);
    const sum = (f: (a: Acc) => number) => of.reduce((s, a) => s + f(a), 0);
    return {
      kind,
      sessions: sum((a) => a.sessions),
      engagedSessions: sum((a) => a.engagedSessions),
      sessionsUy: sum((a) => a.sessionsUy),
      engagedSessionsUy: sum((a) => a.engagedSessionsUy),
      history: sum((a) => a.history),
      historyUy: sum((a) => a.historyUy),
      monthly: windows.months.map((_, i) => sum((a) => a.monthly[i])),
      monthlyUy: windows.months.map((_, i) => sum((a) => a.monthlyUy[i])),
    };
  }).filter((k) => k.history > 0 || k.sessions > 0);

  const named = all
    .filter((a) => !UNLISTED_KINDS.includes(a.kind))
    .sort((a, b) => b.history - a.history || b.sessions - a.sessions || a.id.localeCompare(b.id));
  const listed = named.filter((a) => a.history >= MIN_LISTED_SESSIONS).slice(0, MAX_SOURCES);
  const listedIds = new Set(listed.map((a) => a.id));
  const unlisted = named.filter((a) => !listedIds.has(a.id));

  const sources: TrafficSourceRow[] = listed.map((a) => {
    // De los buscadores no se pide el diario ni el aterrizaje (el reporte saca `organic`): lo poco
    // que llega es su parte `referral` (`es.search.yahoo.com`) y publicarlo diría "Bing: 1 día".
    const search = a.kind === "buscador";
    let peak: { day: string; sessions: number } | null = null;
    for (const [day, sessions] of search ? [] : a.days) {
      if (!peak || sessions > peak.sessions || (sessions === peak.sessions && day < peak.day)) peak = { day, sessions };
    }
    return {
      id: a.id,
      label: sourceLabel(a.id),
      kind: a.kind,
      sessions: a.sessions,
      engagedSessions: a.engagedSessions,
      sessionsUy: a.sessionsUy,
      engagedSessionsUy: a.engagedSessionsUy,
      history: a.history,
      historyUy: a.historyUy,
      monthly: [...a.monthly],
      activeDays: !search && a.days.size ? [...a.days.values()].filter((v) => v > 0).length : null,
      peak,
      landings: [...(search ? [] : a.landings.entries())]
        .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
        .slice(0, MAX_LANDINGS)
        .map(([path, sessions]) => ({ path, sessions })),
    };
  });

  const referrerViews = new Map<string, { sourceId: string; kind: SourceKind; views: number }>();
  for (const row of reportRows(reports[6])) {
    const ref = publicReferrer(String(row.pageReferrer ?? ""));
    if (!ref || SITE_HOSTS.includes(ref.host) || SITE_HOSTS.includes(`www.${ref.host}`)) continue;
    const id = sourceId(ref.host);
    // El tipo del referente: el que ya tiene la fuente si está en el documento; si no, por el host.
    const kind = accs.get(id)?.kind ?? kindOf(id, "referral");
    if (!REFERRER_KINDS.includes(kind)) continue;
    const entry = referrerViews.get(ref.url) || { sourceId: id, kind, views: 0 };
    entry.views += n(row.screenPageViews);
    referrerViews.set(ref.url, entry);
  }
  const referrers = [...referrerViews.entries()]
    // Una URL que es sólo el dominio no dice más que la fila del sitio (Reddit y X, por su política
    // de referer, mandan sólo el dominio): esta lista es para las páginas exactas.
    .filter(([url, r]) => r.views >= MIN_REFERRER_VIEWS && url.includes("/"))
    .sort((a, b) => b[1].views - a[1].views || a[0].localeCompare(b[0]))
    .slice(0, MAX_REFERRERS)
    .map(([url, r]) => ({ url, sourceId: r.sourceId, kind: r.kind, views: r.views }));

  const sum = (f: (a: Acc) => number) => all.reduce((s, a) => s + f(a), 0);
  return {
    key: TRAFFIC_SOURCES_KEY,
    asOf: ctx.asOf,
    range: { ...windows.current },
    history: { ...windows.history },
    months: [...windows.months],
    totals: {
      sessions: sum((a) => a.sessions),
      engagedSessions: sum((a) => a.engagedSessions),
      sessionsUy: sum((a) => a.sessionsUy),
      engagedSessionsUy: sum((a) => a.engagedSessionsUy),
      history: sum((a) => a.history),
      historyUy: sum((a) => a.historyUy),
    },
    kinds,
    sources,
    others: { count: unlisted.length, history: unlisted.reduce((s, a) => s + a.history, 0) },
    referrers,
  };
}

/** No se escribe un documento sin sesiones o sin ninguna fuente con nombre: algo falló arriba. */
export function trafficSourcesIsThin(doc: TrafficSourcesSnapshot): boolean {
  return doc.totals.sessions === 0 || doc.sources.length === 0;
}

export async function refreshTrafficSources(now: Date = new Date()): Promise<TrafficSourcesSnapshot> {
  if (!ga4PropertyId()) throw new Error("GA4: GA4_PROPERTY_ID is not set");
  const windows = trafficWindows(now, process.env.GA4_TIMEZONE || DEFAULT_TIMEZONE);
  const reports = await runReports(trafficSourceRequests(windows));
  return buildTrafficSources(reports, { windows, asOf: now.toISOString() });
}
