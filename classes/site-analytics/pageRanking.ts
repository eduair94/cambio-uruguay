// Qué páginas mueven el sitio, cuáles suben, cuáles se caen y cuáles engañan.
//
// Alimenta la página PRIVADA /estadisticas-por-pagina. La pública (/estadisticas-del-sitio) ya
// publica un top 25 por vistas; lo que no dice, y lo que hace falta para decidir dónde trabajar, es
// esto. Spec: docs/superpowers/specs/2026-09-29-ranking-de-paginas-design.md.
//
// TRES DECISIONES QUE SALIERON DE LEER GA4 ANTES DE ESCRIBIR (1–28/9/2026):
//
//   * Se rankea SÓLO con visitas desde Uruguay. De 35.749 vistas medidas en la ventana, 10.236 eran
//     uruguayas: la granja "Singapur" (14–22/9) y un salto desde EE.UU. el 23/9 fueron la mayoría.
//     El total de todos los países se guarda al lado, sólo para ver qué parte de cada página es de
//     afuera (señal `afuera`).
//   * El orden lo da la BASE SEMANAL —la mediana de las semanas desde que la página existe— y no la
//     suma de 28 días. `/oportunidades-inmobiliarias-uruguay` hizo 192, 32, 34 y 19 vistas por
//     semana: la suma dice 277 y la base, sin la semana del pico, 32. Un enlace compartido un día no es tráfico.
//   * La tendencia se mide DENTRO de la ventana (primeras dos semanas contra últimas dos), nunca
//     contra la ventana anterior: el 2/9 cambió el consentimiento por región y GA4 pasó de ver ~25 %
//     del tráfico a verlo casi todo. Contra agosto, todo "crece".
//
// El texto de "dónde enfocarse" se arma acá, con las cifras de cada fila, para que la página sólo
// pinte y el criterio viva en un lugar testeado.
//
// SIN PLATA: el valor de una fila es su base × el multiplicador del TRAMO de su familia (`tierOf`,
// el mismo del plan de ingreso), que es forma y no un monto. Este repositorio es público.
import { bucketOf } from "../gsc/opportunities";
import { tierOf } from "../revenueplan/value";
import type { Tier } from "../revenueplan/value";
import { exactDimension, reportRows, runReports } from "./ga4";
import type { Ga4Report, Ga4ReportRequest, Ga4Row } from "./ga4";
import { addDays, analyticsWindows, DEFAULT_TIMEZONE, publicPath } from "./refresh";
import type { AnalyticsWindows } from "./refresh";

// ---------------------------------------------------------------------------------------------
// Umbrales
// ---------------------------------------------------------------------------------------------

/** Filas que guarda el snapshot, por base. Las que están en el foco entran aunque queden afuera. */
export const MAX_PAGES = 600;
/** Familias que guarda el snapshot. La cola larga de `bucketOf` son cientos de rutas sueltas. */
export const MAX_FAMILIES = 120;
/** Ítems por grupo de "dónde enfocarse". Más que eso no se lee. */
export const FOCUS_PER_GROUP = 6;
/** Cuántas páginas entran en "sostienen el sitio". */
export const TOP_SUSTAIN = 5;
/** Una semana es un pico cuando triplica a la segunda mejor… */
export const PICO_FACTOR = 3;
/** …y tiene al menos esto. Debajo, tres vistas contra una es ruido. */
export const PICO_MIN_VIEWS = 20;
/** Vistas mínimas en alguna de las dos mitades para hablar de tendencia. */
export const TREND_MIN_VIEWS = 30;
/** Segunda mitad / primera mitad por debajo de esto: cae. */
export const TREND_DOWN = 0.6;
/** Segunda mitad / primera mitad por encima de esto: crece. */
export const TREND_UP = 1.5;
/** Vistas mínimas para decir que una página "rebota". */
export const REBOTA_MIN_VIEWS = 50;
/** Permanencia por usuario, en segundos, por debajo de la cual rebota. */
export const REBOTA_MAX_SECONDS = 20;
/** Vistas totales (todos los países) mínimas para marcar `afuera`. */
export const AFUERA_MIN_VIEWS = 50;
/** Porción de vistas uruguayas por debajo de la cual la página es sobre todo de afuera. */
export const AFUERA_MAX_UY_SHARE = 0.5;
/** Entradas desde asistentes de IA para marcar `ia`. */
export const IA_MIN_ENTRANCES = 5;
/** Vistas en las últimas dos semanas para que una página entre en "suben". Debajo es anécdota. */
export const FOCUS_MIN_VIEWS = 20;

// ---------------------------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------------------------

export type PageSignal = "pico" | "cae" | "crece" | "nueva" | "rebota" | "afuera" | "ia";

/** Sesiones que EMPEZARON en la página (landingPage), por canal. */
export interface Entrances {
  total: number;
  organic: number;
  direct: number;
  social: number;
  ai: number;
  other: number;
}

export interface PageRankRow {
  /** Sin query string. */
  path: string;
  title: string;
  /** `bucketOf(path)`: el mismo criterio que Search Console y el plan de ingreso. */
  family: string;
  /** Nombre del tramo (`contenido`, `dato-vivo`, `directorio`, `otro`). */
  tier: string;
  /** Multiplicador del tramo, relativo al promedio del sitio. Forma, no plata. */
  multiplier: number;
  /** Puesto por base, 1 = la que más. */
  rank: number;
  /** Vistas uruguayas por semana, la más vieja primero. */
  weeks: number[];
  /** Vistas uruguayas en los 28 días. */
  views: number;
  /** Mediana de las semanas desde la primera con vistas. Lo que ordena. */
  base: number;
  users: number;
  /** Permanencia promedio por usuario, en segundos. */
  engagementSeconds: number;
  /** Vistas desde cualquier país. `>= views`. */
  viewsAll: number;
  /** `views / viewsAll`, 0..1. */
  uyShare: number;
  entrances: Entrances;
  /** Sesiones con interacción / sesiones que entraron por acá, 0..1. */
  engagedRate: number;
  /** Vistas por semana de las dos últimas contra las anteriores activas, − 1. `null` sin muestra o si es nueva. */
  trend: number | null;
  /** base × multiplier. Ordena el foco. */
  value: number;
  signals: PageSignal[];
}

export type FocusKind = "sostienen" | "caen" | "suben" | "rebotan" | "ia" | "picos";

export interface FocusItem {
  kind: FocusKind;
  path: string;
  title: string;
  /** Lo que pasa, con cifras. */
  headline: string;
  /** Qué hacer. */
  detail: string;
}

// ---------------------------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------------------------

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Las semanas desde la primera con vistas: antes de eso la página no existía o nadie la conocía. */
function activeWeeks(weeks: number[]): number[] {
  const first = weeks.findIndex((w) => w > 0);
  return first < 0 ? [] : weeks.slice(first);
}

/**
 * La base semanal. Mediana y no promedio: una semana con un enlace compartido no la mueve.
 * Desde la primera semana con vistas: una página lanzada en la semana 3 no arrastra dos ceros.
 * Y sin la semana del pico, cuando lo hay: con dos semanas activas la mediana ES el promedio, y
 * `[0, 0, 95, 4]` daba 50 por semana a una página que hace 4.
 */
export function baseOf(weeks: number[]): number {
  const active = activeWeeks(weeks);
  if (!isPico(weeks)) return median(active);
  const rest = [...active];
  rest.splice(rest.indexOf(Math.max(...rest)), 1);
  return median(rest);
}

function halves(weeks: number[]): [number, number] {
  const cut = Math.floor(weeks.length / 2);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return [sum(weeks.slice(0, cut)), sum(weeks.slice(cut))];
}

/**
 * Vistas POR SEMANA antes y después: las últimas dos semanas contra las semanas anteriores en que
 * la página ya existía. Por semana y no por mitad cruda: una página lanzada en la semana 2
 * (`[0, 108, 70, 13]`) daba −23 % comparando 108 contra 83, cuando por semana pasó de 108 a 41,5.
 * `null` si la página no existía en la primera mitad (es nueva, no crece).
 */
export function trendParts(weeks: number[]): { before: number; after: number } | null {
  const cut = Math.floor(weeks.length / 2);
  const first = weeks.findIndex((w) => w > 0);
  if (first < 0 || first >= cut) return null;
  const earlier = weeks.slice(first, cut);
  const later = weeks.slice(cut);
  return {
    before: earlier.reduce((a, b) => a + b, 0) / earlier.length,
    after: later.reduce((a, b) => a + b, 0) / later.length,
  };
}

/** Después contra antes, por semana. `null` sin antes o con muestra de ruido. */
export function trendOf(weeks: number[]): number | null {
  const parts = trendParts(weeks);
  if (!parts || parts.before <= 0) return null;
  // Llevado a dos semanas, para que el piso signifique lo mismo que en la mitad cruda.
  if (Math.max(parts.before, parts.after) * 2 < TREND_MIN_VIEWS) return null;
  return parts.after / parts.before - 1;
}

/** Nada en la primera mitad y algo en la segunda. No "crece": es nueva. */
export function isNewPage(weeks: number[]): boolean {
  const [a, b] = halves(weeks);
  return a === 0 && b > 0;
}

/**
 * Una semana sola que triplica a la segunda mejor y después se apaga. Contra la SEGUNDA y no contra
 * la mediana: `[10, 10, 40, 40]` es un cambio de nivel, no un pico. Y el máximo no puede ser la
 * última semana: `[0, 0, 2, 24]` es una página que arranca, y todavía no hay semana que diga si se
 * sostiene.
 */
export function isPico(weeks: number[]): boolean {
  const active = activeWeeks(weeks);
  if (active.length < 2) return false;
  const [top, second] = [...active].sort((a, b) => b - a);
  if (active.indexOf(top) === active.length - 1) return false;
  return top >= PICO_MIN_VIEWS && top >= PICO_FACTOR * second;
}

export function signalsOf(row: Omit<PageRankRow, "signals" | "rank">): PageSignal[] {
  const out: PageSignal[] = [];
  const nueva = isNewPage(row.weeks);
  const pico = isPico(row.weeks);
  if (nueva) out.push("nueva");
  if (pico) out.push("pico");
  // Con un pico en la ventana, la "tendencia" es el pico: no se declara caída ni suba.
  if (!nueva && !pico && row.trend !== null) {
    if (1 + row.trend <= TREND_DOWN) out.push("cae");
    else if (1 + row.trend >= TREND_UP) out.push("crece");
  }
  // Sólo contenido: en una cotización o un conversor, entrar, ver el número e irse ES el éxito, y
  // "otro" es SIN CLASIFICAR — ahí caen /dolar-hoy, /comparar y /pizarra. Sin usuarios medidos la
  // permanencia es 0 por falta de dato, no porque la gente se vaya.
  if (
    row.tier === "contenido" &&
    row.users > 0 &&
    row.views >= REBOTA_MIN_VIEWS &&
    row.engagementSeconds < REBOTA_MAX_SECONDS
  ) {
    out.push("rebota");
  }
  if (row.viewsAll >= AFUERA_MIN_VIEWS && row.uyShare < AFUERA_MAX_UY_SHARE) out.push("afuera");
  if (row.entrances.ai >= IA_MIN_ENTRANCES) out.push("ia");
  return out;
}

// ---------------------------------------------------------------------------------------------
// Dónde enfocarse
// ---------------------------------------------------------------------------------------------

const fmt = (n: number) => new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 }).format(n);
const signedPct = (x: number) => `${x >= 0 ? "+" : "−"}${fmt(Math.abs(x) * 100)} %`;
/** `2026-09-01` → `1/9`. */
const dayMonth = (ymd: string) => {
  const [, m, d] = ymd.split("-").map(Number);
  return m && d ? `${d}/${m}` : ymd;
};

const CHANNEL_WORDS: Record<Exclude<keyof Entrances, "total">, string> = {
  organic: "búsqueda",
  direct: "entrada directa",
  social: "redes",
  ai: "asistentes de IA",
  other: "otros canales",
};

type Channel = Exclude<keyof Entrances, "total">;

/** El canal por el que más se entra, o `null` si nadie entra por esta página. */
function mainChannel(e: Entrances): Channel | null {
  const keys = Object.keys(CHANNEL_WORDS) as Channel[];
  let best: Channel | null = null;
  for (const k of keys) if (e[k] > 0 && (!best || e[k] > e[best])) best = k;
  return best;
}

const label = (r: PageRankRow) => r.title || r.path;

/** Qué mirar ante una caída, según por dónde entraba la gente. */
function whyItFell(main: Channel | null): string {
  switch (main) {
    case "direct":
      return "La mayoría entraba directo (enlace compartido o lanzamiento): puede ser el final de un empujón y no una caída de búsqueda. Si importa, volver a difundirla.";
    case "social":
      return "La traían las redes y el hilo se enfrió. Si importa, volver a compartirla donde se habla del tema; no es un problema de la página.";
    case "ai":
      return "La traían asistentes de IA: revisar que las cifras sigan fechadas y al día, que es lo que los hace citarla.";
    case "organic":
      return "Entra sobre todo por búsqueda: mirar en Search Console si perdió posición y abrir la página para confirmar que responde.";
    default:
      return "Entra por canales mezclados: abrir la página para confirmar que responde y mirar en Search Console si perdió posición.";
  }
}

function top<T extends PageRankRow>(rows: T[], score: (r: T) => number, limit = FOCUS_PER_GROUP): T[] {
  return [...rows]
    .sort((a, b) => score(b) - score(a) || a.path.localeCompare(b.path))
    .slice(0, limit);
}

/**
 * La lectura, en el orden en que conviene hacerla: qué no se puede romper, qué se está perdiendo,
 * qué empujar, qué arreglar, qué canal nuevo aparece, y qué NO leer como base.
 *
 * Caídas y subas se ordenan por vistas movidas × multiplicador del tramo: perder 120 vistas de una
 * guía pesa más que perder 600 de un directorio.
 */
export function buildFocus(rows: PageRankRow[], weekStarts: string[]): FocusItem[] {
  const out: FocusItem[] = [];
  const has = (s: PageSignal) => (r: PageRankRow) => r.signals.includes(s);
  const item = (kind: FocusKind, r: PageRankRow, headline: string, detail: string) =>
    out.push({ kind, path: r.path, title: label(r), headline, detail });

  for (const r of top(rows.filter((r) => r.value > 0), (r) => r.value, TOP_SUSTAIN)) {
    const main = mainChannel(r.entrances);
    item(
      "sostienen",
      r,
      `Base de ${fmt(r.base)} vistas por semana` +
        (main ? `; ${fmt(r.entrances.total)} entradas en 28 días, la mayoría por ${CHANNEL_WORDS[main]}` : ""),
      "No romperla: que cargue rápido y siga respondiendo. Desde acá conviene enlazar lo que se quiere empujar."
    );
  }

  const moved = (r: PageRankRow) => {
    const p = trendParts(r.weeks);
    return p ? p.after - p.before : 0;
  };

  for (const r of top(rows.filter(has("cae")), (r) => -moved(r) * r.multiplier)) {
    const p = trendParts(r.weeks)!;
    item(
      "caen",
      r,
      `Pasó de ${fmt(p.before)} a ${fmt(p.after)} vistas por semana (${signedPct(p.after / p.before - 1)}: últimas dos semanas contra las anteriores)`,
      whyItFell(mainChannel(r.entrances))
    );
  }

  // Un lanzamiento que ya se apagó (`pico`) no "sube", y una página nueva con un puñado de vistas es
  // anécdota: las dos llenaban el grupo en la primera lectura real.
  const recent = (r: PageRankRow) => halves(r.weeks)[1];
  const rising = rows.filter(
    (r) => (has("crece")(r) || has("nueva")(r)) && !has("pico")(r) && recent(r) >= FOCUS_MIN_VIEWS
  );
  const gained = (r: PageRankRow) => (r.signals.includes("nueva") ? recent(r) : moved(r) * 2);
  for (const r of top(rising, (r) => gained(r) * r.multiplier)) {
    const p = trendParts(r.weeks);
    const main = mainChannel(r.entrances);
    item(
      "suben",
      r,
      r.signals.includes("nueva") || !p
        ? `Nueva: ${fmt(recent(r))} vistas en las últimas dos semanas`
        : `De ${fmt(p.before)} a ${fmt(p.after)} vistas por semana (${signedPct(p.after / p.before - 1)})`,
      (main ? `Llega sobre todo por ${CHANNEL_WORDS[main]}. ` : "") +
        "Enlazarla desde las páginas que sostienen el sitio y ampliar lo que la trae."
    );
  }

  for (const r of top(rows.filter(has("rebota")), (r) => r.views * r.multiplier)) {
    item(
      "rebotan",
      r,
      `${fmt(r.views)} vistas y ${fmt(r.engagementSeconds)} s de permanencia por usuario`,
      "Llegan y se van: poner la respuesta arriba de todo y revisar que el título prometa lo que la página da."
    );
  }

  for (const r of top(rows.filter(has("ia")), (r) => r.entrances.ai)) {
    item(
      "ia",
      r,
      `${fmt(r.entrances.ai)} entradas desde asistentes de IA`,
      "Un asistente la cita como fuente: mantener las cifras fechadas y al día. Es el formato que conviene repetir."
    );
  }

  for (const r of top(rows.filter(has("pico")), (r) => Math.max(...r.weeks))) {
    const peak = Math.max(...r.weeks);
    const at = r.weeks.indexOf(peak);
    item(
      "picos",
      r,
      `Pico de ${fmt(peak)} vistas la semana del ${dayMonth(weekStarts[at] || "")}; base de ${fmt(r.base)} por semana`,
      "Un empujón puntual (enlace compartido, redes, lanzamiento). No leer la suma de 28 días como si fuera su tráfico."
    );
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// El armado: cinco reportes de GA4 → un documento
// ---------------------------------------------------------------------------------------------

export const PAGE_RANKING_KEY = "site";
/** Filas por reporte. La Data API acepta hasta 250.000; el sitio mide del orden de decenas de miles. */
const REPORT_LIMIT = 100000;
/** Nombres de las cuatro semanas; GA4 los devuelve en la dimensión `dateRange` de cada fila. */
const WEEK_NAMES = ["w0", "w1", "w2", "w3"];
const WEEK_DAYS = 7;
/** Índice del primer reporte de series semanales (canal, dispositivo) en {@link pageRankingRequests}. */
const WEEKLY_SERIES_FROM = 5;

export interface FamilyRankRow {
  family: string;
  tier: string;
  multiplier: number;
  urls: number;
  views: number;
  /** Mediana de las semanas SUMADAS de la familia, no la suma de las bases. */
  base: number;
  weeks: number[];
  engagementSeconds: number;
  entrances: Entrances;
  trend: number | null;
  value: number;
  /** Porción de las vistas uruguayas del sitio, 0..1. */
  share: number;
}

export interface PageRankingTotals {
  viewsUy: number;
  /** Todos los países. La diferencia con `viewsUy` es la parte que no se usa para rankear. */
  viewsAll: number;
  uyShare: number;
  sessionsUy: number;
  usersUy: number;
  weeklyUy: number[];
  /** Sesiones uruguayas por canal (`sessionDefaultChannelGroup`, etiqueta de GA4 tal cual). */
  channels: { label: string; sessions: number; share: number }[];
  /**
   * Sesiones uruguayas por canal, semana a semana (la más vieja primero), de mayor a menor total.
   * Es lo que mostró que la búsqueda crecía mientras las vistas "caían": los que se iban eran los
   * que entran directo y leen muchas páginas. `[]` si el reporte no vino.
   */
  weeklyChannels: WeeklySeries[];
  /** Lo mismo por dispositivo (`mobile`, `desktop`, `tablet`, etiqueta de GA4 tal cual). */
  weeklyDevices: WeeklySeries[];
}

export interface WeeklySeries {
  label: string;
  weeks: number[];
}

export interface PageRankingSnapshot {
  key: string;
  asOf: string;
  timezone: string;
  range: { start: string; end: string; days: number };
  weeks: { start: string; end: string }[];
  totals: PageRankingTotals;
  /** Páginas con vistas desde Uruguay en la ventana (antes del recorte a `MAX_PAGES`). */
  pageCount: number;
  /** Algún reporte vino con menos filas de las que GA4 dice tener. */
  truncated: boolean;
  pages: PageRankRow[];
  families: FamilyRankRow[];
  focus: FocusItem[];
}

/** Las cuatro semanas de la ventana, la más vieja primero. La última termina donde termina la ventana. */
export function rankingWeeks(w: AnalyticsWindows): { start: string; end: string }[] {
  return WEEK_NAMES.map((_, i) => {
    const start = addDays(w.current.start, i * WEEK_DAYS);
    return { start, end: i === WEEK_NAMES.length - 1 ? w.current.end : addDays(start, WEEK_DAYS - 1) };
  });
}

/**
 * La familia para ESTE ranking. `bucketOf` sólo pliega su lista fija, así que cada ficha de un
 * directorio (`/alquileres/<ficha>`, `/autos-usados-uruguay/<…>`) quedaba como una familia de una
 * URL y la tabla de familias no decía nada de la plantilla. Acá, lo que `bucketOf` deja suelto con
 * dos segmentos o más se pliega bajo su primer segmento. No se toca `bucketOf`: lo comparten
 * Search Console y el plan de ingreso, y sus familias tienen que seguir cruzándose fila a fila.
 */
export function rankingFamily(path: string): string {
  const family = bucketOf(path);
  if (family !== path) return family;
  const seg = path.split("/").filter(Boolean);
  return seg.length >= 2 ? `/${seg[0]}/*` : family;
}

/**
 * El tramo de una familia del ranking. Una ficha sin clasificar hereda el de su hub: una ficha de
 * `/autos-usados-uruguay` es directorio aunque `tierOf` no la conozca. Tampoco se toca `tierOf`,
 * por la misma razón que arriba.
 */
export function rankingTier(family: string): Tier {
  const tier = tierOf(family);
  if (tier.name !== "otro") return tier;
  const hub = /^\/([^/]+)\/\*$/.exec(family);
  return hub ? tierOf(`/${hub[1]}`) : tier;
}

const names = (...list: string[]) => list.map((name) => ({ name }));
const weekRanges = (w: AnalyticsWindows) =>
  rankingWeeks(w).map((r, i) => ({ startDate: r.start, endDate: r.end, name: WEEK_NAMES[i] }));
const uruguay = () => exactDimension("countryId", "UY");

/**
 * Los siete reportes, en el orden que lee {@link buildPageRanking}. `runReports` los parte en dos
 * llamadas (el batch acepta cinco).
 */
export function pageRankingRequests(w: AnalyticsWindows): Ga4ReportRequest[] {
  const window = [{ startDate: w.current.start, endDate: w.current.end }];
  return [
    // 0 — vistas uruguayas por página y por semana (cuatro rangos en un reporte)
    {
      dateRanges: weekRanges(w),
      dimensions: names("pagePath"),
      metrics: names("screenPageViews"),
      dimensionFilter: uruguay(),
      // De mayor a menor en todos: si GA4 trunca, que se pierdan las páginas chicas y no filas al azar.
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: REPORT_LIMIT,
    },
    // 1 — título, usuarios y permanencia (28 días; los usuarios no se suman entre semanas)
    {
      dateRanges: window,
      dimensions: names("pagePath", "pageTitle"),
      metrics: names("screenPageViews", "activeUsers", "userEngagementDuration"),
      dimensionFilter: uruguay(),
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: REPORT_LIMIT,
    },
    // 2 — todos los países, sólo para el contraste
    {
      dateRanges: window,
      dimensions: names("pagePath"),
      metrics: names("screenPageViews"),
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: REPORT_LIMIT,
    },
    // 3 — por dónde se ENTRA a cada página
    {
      dateRanges: window,
      dimensions: names("landingPage", "sessionDefaultChannelGroup"),
      metrics: names("sessions", "engagedSessions"),
      dimensionFilter: uruguay(),
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: REPORT_LIMIT,
    },
    // 4 — totales por país: el de Uruguay exacto y la suma de todos
    {
      dateRanges: window,
      dimensions: names("countryId"),
      metrics: names("screenPageViews", "sessions", "activeUsers"),
      limit: 500,
    },
    // 5 — sesiones uruguayas por canal, semana a semana
    {
      dateRanges: weekRanges(w),
      dimensions: names("sessionDefaultChannelGroup"),
      metrics: names("sessions"),
      dimensionFilter: uruguay(),
      limit: 500,
    },
    // 6 — sesiones uruguayas por dispositivo, semana a semana
    {
      dateRanges: weekRanges(w),
      dimensions: names("deviceCategory"),
      metrics: names("sessions"),
      dimensionFilter: uruguay(),
      limit: 100,
    },
  ];
}

function num(row: Ga4Row, key: string): number {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * `(not set)`, `(other)` (la fila de desborde de GA4) o vacío no son páginas: cuentan en los
 * totales, nunca como fila.
 */
const isNotSet = (raw: string) => !raw || raw === "(not set)" || raw === "(other)";

function channelOf(group: string): Channel {
  switch (group) {
    case "Organic Search":
      return "organic";
    case "Direct":
      return "direct";
    case "Organic Social":
    case "Paid Social":
      return "social";
    case "AI Assistant":
      return "ai";
    default:
      return "other";
  }
}

const emptyEntrances = (): Entrances => ({ total: 0, organic: 0, direct: 0, social: 0, ai: 0, other: 0 });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Menos filas de las que GA4 dice tener, o justo el tope pedido. Lo segundo no depende de cómo
 * cuenta `rowCount` un reporte con varios rangos de fechas.
 */
function isTruncated(report: Ga4Report | undefined, request: Ga4ReportRequest | undefined): boolean {
  const rows = report?.rows?.length || 0;
  const count = report?.rowCount;
  if (typeof count === "number" && rows < count) return true;
  return !!request?.limit && rows >= request.limit;
}

/** Una dimensión × las cuatro semanas → una serie por valor, de mayor a menor total. */
function weeklySeries(report: Ga4Report | undefined, dimension: string, metric: string): WeeklySeries[] {
  const acc = new Map<string, number[]>();
  for (const row of reportRows(report)) {
    const i = WEEK_NAMES.indexOf(String(row.dateRange ?? ""));
    if (i < 0) continue;
    const label = String(row[dimension] ?? "").trim() || "(not set)";
    const weeks = acc.get(label) || WEEK_NAMES.map(() => 0);
    weeks[i] += num(row, metric);
    acc.set(label, weeks);
  }
  return [...acc.entries()]
    .map(([label, weeks]) => ({ label, weeks }))
    .sort((a, b) => sum(b.weeks) - sum(a.weeks) || a.label.localeCompare(b.label));
}

function familiesOf(rows: PageRankRow[]): FamilyRankRow[] {
  const total = sum(rows.map((r) => r.views));
  const acc = new Map<string, FamilyRankRow & { seconds: number; users: number }>();
  for (const r of rows) {
    let f = acc.get(r.family);
    if (!f) {
      f = {
        family: r.family,
        tier: r.tier,
        multiplier: r.multiplier,
        urls: 0,
        views: 0,
        base: 0,
        weeks: WEEK_NAMES.map(() => 0),
        engagementSeconds: 0,
        entrances: emptyEntrances(),
        trend: null,
        value: 0,
        share: 0,
        seconds: 0,
        users: 0,
      };
      acc.set(r.family, f);
    }
    f.urls += 1;
    f.views += r.views;
    r.weeks.forEach((w, i) => (f!.weeks[i] += w));
    f.seconds += r.engagementSeconds * r.users;
    f.users += r.users;
    for (const k of Object.keys(f.entrances) as Array<keyof Entrances>) f.entrances[k] += r.entrances[k];
  }
  return [...acc.values()]
    .map(({ seconds, users, ...f }) => {
      const base = baseOf(f.weeks);
      return {
        ...f,
        base,
        trend: trendOf(f.weeks),
        engagementSeconds: users > 0 ? Math.round(seconds / users) : 0,
        value: base * f.multiplier,
        share: total > 0 ? f.views / total : 0,
      };
    })
    .sort((a, b) => b.base - a.base || b.views - a.views || a.family.localeCompare(b.family))
    .slice(0, MAX_FAMILIES);
}

export interface BuildPageRankingContext {
  asOf: string;
  timezone: string;
  windows: AnalyticsWindows;
}

/**
 * Pura: los siete reportes de {@link pageRankingRequests}, en orden, se vuelven un documento.
 * `requests` sólo se usa para saber si algún reporte llegó al tope pedido.
 */
export function buildPageRanking(
  reports: Ga4Report[],
  ctx: BuildPageRankingContext,
  requests: Ga4ReportRequest[] = pageRankingRequests(ctx.windows)
): PageRankingSnapshot {
  const weeks = rankingWeeks(ctx.windows);

  // 0 — semanas
  const weeklyUy = WEEK_NAMES.map(() => 0);
  const pageWeeks = new Map<string, number[]>();
  for (const row of reportRows(reports[0])) {
    const i = WEEK_NAMES.indexOf(String(row.dateRange ?? ""));
    if (i < 0) continue;
    const views = num(row, "screenPageViews");
    weeklyUy[i] += views;
    const raw = String(row.pagePath ?? "");
    if (isNotSet(raw)) continue;
    const path = publicPath(raw);
    const w = pageWeeks.get(path) || WEEK_NAMES.map(() => 0);
    w[i] += views;
    pageWeeks.set(path, w);
  }

  // 1 — título, usuarios, permanencia. Mismo camino con varios títulos: gana el más visto.
  const detail = new Map<string, { views: number; users: number; seconds: number; title: string; titleViews: number }>();
  for (const row of reportRows(reports[1])) {
    const raw = String(row.pagePath ?? "");
    if (isNotSet(raw)) continue;
    const path = publicPath(raw);
    const views = num(row, "screenPageViews");
    const title = String(row.pageTitle ?? "").trim();
    const d = detail.get(path) || { views: 0, users: 0, seconds: 0, title: "", titleViews: -1 };
    d.views += views;
    d.users += num(row, "activeUsers");
    d.seconds += num(row, "userEngagementDuration");
    if (title && title !== "(not set)" && views > d.titleViews) {
      d.title = title;
      d.titleViews = views;
    }
    detail.set(path, d);
  }

  // 2 — todos los países
  const viewsAll = new Map<string, number>();
  for (const row of reportRows(reports[2])) {
    const raw = String(row.pagePath ?? "");
    if (isNotSet(raw)) continue;
    const path = publicPath(raw);
    viewsAll.set(path, (viewsAll.get(path) || 0) + num(row, "screenPageViews"));
  }

  // 3 — entradas por canal
  const channelSessions = new Map<string, number>();
  const entrances = new Map<string, Entrances & { engaged: number }>();
  for (const row of reportRows(reports[3])) {
    const sessions = num(row, "sessions");
    const group = String(row.sessionDefaultChannelGroup ?? "").trim() || "(not set)";
    channelSessions.set(group, (channelSessions.get(group) || 0) + sessions);
    const raw = String(row.landingPage ?? "");
    if (isNotSet(raw)) continue;
    const path = publicPath(raw);
    const e = entrances.get(path) || { ...emptyEntrances(), engaged: 0 };
    e.total += sessions;
    e[channelOf(group)] += sessions;
    e.engaged += num(row, "engagedSessions");
    entrances.set(path, e);
  }

  // 4 — totales por país
  let viewsUy = 0;
  let sessionsUy = 0;
  let usersUy = 0;
  let viewsAllTotal = 0;
  for (const row of reportRows(reports[4])) {
    const views = num(row, "screenPageViews");
    viewsAllTotal += views;
    if (row.countryId === "UY") {
      viewsUy += views;
      sessionsUy += num(row, "sessions");
      usersUy += num(row, "activeUsers");
    }
  }

  const all: PageRankRow[] = [];
  for (const path of new Set([...pageWeeks.keys(), ...detail.keys()])) {
    const w = pageWeeks.get(path) || WEEK_NAMES.map(() => 0);
    const d = detail.get(path);
    const views = d ? d.views : sum(w);
    const users = d?.users || 0;
    const family = rankingFamily(path);
    const tier = rankingTier(family);
    const base = baseOf(w);
    // Un reporte truncado no puede dejar a una página con menos vistas totales que uruguayas.
    const all_ = Math.max(viewsAll.get(path) || 0, views);
    const e = entrances.get(path);
    const partial: Omit<PageRankRow, "signals" | "rank"> = {
      path,
      title: d?.title || "",
      family,
      tier: tier.name,
      multiplier: tier.multiplier,
      weeks: w,
      views,
      base,
      users,
      engagementSeconds: users > 0 ? Math.round((d?.seconds || 0) / users) : 0,
      viewsAll: all_,
      uyShare: all_ > 0 ? views / all_ : 1,
      entrances: e
        ? { total: e.total, organic: e.organic, direct: e.direct, social: e.social, ai: e.ai, other: e.other }
        : emptyEntrances(),
      engagedRate: e && e.total > 0 ? e.engaged / e.total : 0,
      trend: trendOf(w),
      value: base * tier.multiplier,
    };
    all.push({ ...partial, rank: 0, signals: signalsOf(partial) });
  }
  all.sort((a, b) => b.base - a.base || b.views - a.views || a.path.localeCompare(b.path));
  all.forEach((r, i) => (r.rank = i + 1));

  const focus = buildFocus(all, weeks.map((w) => w.start));
  const inFocus = new Set(focus.map((f) => f.path));

  const channelTotal = sum([...channelSessions.values()]);
  const channels = [...channelSessions.entries()]
    .map(([label, sessions]) => ({ label, sessions, share: channelTotal > 0 ? sessions / channelTotal : 0 }))
    .filter((c) => c.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label));

  return {
    key: PAGE_RANKING_KEY,
    asOf: ctx.asOf,
    timezone: reports[1]?.metadata?.timeZone || ctx.timezone,
    range: ctx.windows.current,
    weeks,
    totals: {
      viewsUy,
      viewsAll: viewsAllTotal,
      uyShare: viewsAllTotal > 0 ? viewsUy / viewsAllTotal : 0,
      sessionsUy,
      usersUy,
      weeklyUy,
      channels,
      weeklyChannels: weeklySeries(reports[5], "sessionDefaultChannelGroup", "sessions"),
      weeklyDevices: weeklySeries(reports[6], "deviceCategory", "sessions"),
    },
    pageCount: all.length,
    truncated: reports.some((r, i) => isTruncated(r, requests[i])),
    pages: all.filter((r, i) => i < MAX_PAGES || inFocus.has(r.path)),
    families: familiesOf(all),
    focus,
  };
}

/** Sin vistas uruguayas es casi seguro una propiedad o un permiso equivocado, no un mes quieto. */
export function pageRankingIsEmpty(s: PageRankingSnapshot): boolean {
  return s.totals.viewsUy === 0 || s.pages.length === 0;
}

export async function refreshPageRanking(now: Date = new Date()): Promise<PageRankingSnapshot> {
  const timezone = process.env.GA4_TIMEZONE || DEFAULT_TIMEZONE;
  const windows = analyticsWindows(now, timezone);
  const requests = pageRankingRequests(windows);
  const reports = await runReports(requests.slice(0, WEEKLY_SERIES_FROM));
  // Canales y dispositivos por semana, en su propia llamada: si fallan, el ranking se guarda igual
  // con las series vacías (`weeklySeries` de un reporte ausente es `[]`).
  try {
    reports.push(...(await runReports(requests.slice(WEEKLY_SERIES_FROM))));
  } catch (e: any) {
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || String(e);
    console.warn(`[site-analytics] series semanales por canal y dispositivo: ${detail}`);
  }
  return buildPageRanking(reports, { asOf: now.toISOString(), timezone, windows }, requests);
}
