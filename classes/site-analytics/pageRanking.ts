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
//     semana: la suma dice 277 y la base dice 33. Un enlace compartido un día no es tráfico.
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
  /** (semanas 3+4) / (semanas 1+2) − 1. `null` sin muestra o sin primera mitad. */
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
 */
export function baseOf(weeks: number[]): number {
  return median(activeWeeks(weeks));
}

function halves(weeks: number[]): [number, number] {
  const cut = Math.floor(weeks.length / 2);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return [sum(weeks.slice(0, cut)), sum(weeks.slice(cut))];
}

/** Segunda mitad contra primera. `null` cuando no hay contra qué comparar o la muestra es ruido. */
export function trendOf(weeks: number[]): number | null {
  const [a, b] = halves(weeks);
  if (a <= 0) return null;
  if (Math.max(a, b) < TREND_MIN_VIEWS) return null;
  return b / a - 1;
}

/** Nada en la primera mitad y algo en la segunda. No "crece": es nueva. */
export function isNewPage(weeks: number[]): boolean {
  const [a, b] = halves(weeks);
  return a === 0 && b > 0;
}

/**
 * Una semana sola que triplica a la segunda mejor. Contra la SEGUNDA y no contra la mediana:
 * `[10, 10, 40, 40]` es un cambio de nivel (dos semanas iguales arriba), no un pico.
 */
export function isPico(weeks: number[]): boolean {
  const active = activeWeeks(weeks);
  if (active.length < 2) return false;
  const [top, second] = [...active].sort((a, b) => b - a);
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
  // En una cotización o un conversor, entrar, ver el número e irse ES el éxito.
  if (
    (row.tier === "contenido" || row.tier === "otro") &&
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

/** El canal por el que más se entra, o `null` si nadie entra por esta página. */
function mainChannel(e: Entrances): Exclude<keyof Entrances, "total"> | null {
  const keys = Object.keys(CHANNEL_WORDS) as Array<Exclude<keyof Entrances, "total">>;
  let best: Exclude<keyof Entrances, "total"> | null = null;
  for (const k of keys) if (e[k] > 0 && (!best || e[k] > e[best])) best = k;
  return best;
}

const label = (r: PageRankRow) => r.title || r.path;

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

  for (const r of top(rows.filter(has("cae")), (r) => {
    const [a, b] = halves(r.weeks);
    return (a - b) * r.multiplier;
  })) {
    const [a, b] = halves(r.weeks);
    const main = mainChannel(r.entrances);
    item(
      "caen",
      r,
      `Pasó de ${fmt(a)} a ${fmt(b)} vistas (${signedPct(b / a - 1)}, primeras dos semanas contra últimas dos)`,
      main === "direct"
        ? "La mayoría entraba directo (enlace compartido o lanzamiento): puede ser el final de un empujón y no una caída de búsqueda. Si importa, volver a difundirla."
        : `Entra sobre todo por ${main ? CHANNEL_WORDS[main] : "—"}: mirar en Search Console si perdió posición y abrir la página para confirmar que responde.`
    );
  }

  for (const r of top(rows.filter((r) => has("crece")(r) || has("nueva")(r)), (r) => {
    const [a, b] = halves(r.weeks);
    return (b - a) * r.multiplier;
  })) {
    const [a, b] = halves(r.weeks);
    const main = mainChannel(r.entrances);
    item(
      "suben",
      r,
      r.signals.includes("nueva")
        ? `Nueva: ${fmt(b)} vistas en las últimas dos semanas`
        : `De ${fmt(a)} a ${fmt(b)} vistas (${signedPct(b / a - 1)})`,
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
