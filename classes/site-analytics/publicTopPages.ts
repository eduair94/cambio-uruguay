// El ranking de páginas, en público: /paginas-mas-visitadas.
//
// La versión privada (`pageRanking.ts`, /estadisticas-por-pagina) lleva cosas que no son para el
// lector: el tramo y el multiplicador de valor de cada familia (la forma del ingreso), la lista
// "dónde enfocarse", la porción de vistas desde Uruguay por página (habla de tráfico automatizado) y
// por dónde entra la gente a cada página. Nada de eso sale de acá.
//
// POR QUÉ UN DOCUMENTO APARTE y no un `.select()` sobre el privado: es la regla del repo desde
// `siterevenuesnapshots`. Un campo privado nuevo en el ranking no puede aparecer publicado porque
// alguien se olvidó de sacarlo de una proyección: este archivo construye cada fila CAMPO POR CAMPO,
// y `tests/site_analytics/public_top_pages.test.ts` recorre el documento buscando claves privadas.
//
// QUÉ ENTRA EN LAS LISTAS: páginas en español, públicas y de lectura. Fuera las privadas (paridad
// con `EXCLUDED_ROUTES` del app, con test), los espejos /en y /pt, y las fichas sueltas de un
// directorio (`/alquileres/<ficha>`), que van y vienen. Las fichas siguen contando en los temas.
import { bucketOf } from "../gsc/opportunities";
import { FOCUS_MIN_VIEWS, trendParts } from "./pageRanking";
import type { FamilyRankRow, PageRankingSnapshot, PageRankRow, WeeklySeries } from "./pageRanking";

export const TOP_PAGES_KEY = "site";
/** Páginas de la lista principal. */
export const PUBLIC_PAGES = 100;
/** Páginas "en alza". */
export const PUBLIC_RISING = 10;
/** Páginas "recomendadas por asistentes de IA". */
export const PUBLIC_AI = 10;
/** Temas (familias). */
export const PUBLIC_TOPICS = 25;
/**
 * "Guías más leídas": las páginas de CONTENIDO más visitadas. Es la lista que enlaza la portada
 * (en español) hacia lo que rinde; el tramo se usa para elegir y no sale en el documento.
 */
export const PUBLIC_GUIDES = 10;
/** Entradas desde asistentes de IA para entrar en esa lista. Más bajo que la señal privada (5): acá
 * se ordena, no se alerta. */
export const PUBLIC_AI_MIN_ENTRANCES = 3;
/** Con menos páginas publicables que esto el documento no se escribe: algo salió mal arriba. */
export const PUBLIC_MIN_PAGES = 10;

/**
 * Rutas que nunca se listan. Las primeras ocho son `EXCLUDED_ROUTES` de `app/utils/siteNav.ts`
 * (el test exige que estén todas); las otras son de cuenta, búsqueda o referencia, públicas pero no
 * páginas para recomendar.
 */
export const PUBLIC_EXCLUDED_PATHS: readonly string[] = Object.freeze([
  "/offline",
  "/equipar-casa-uruguay/mi-lista",
  "/widget",
  "/cuenta",
  "/estadisticas-de-busqueda",
  "/estadisticas-por-pagina",
  "/descuentos-con-tarjeta-uruguay/cerca-de-mi",
  "/ranking-usuarios-charruadevs",
  "/buscar",
  "/conectar",
  "/mi-lista",
  "/api-reference",
  // Tablero de operación de los scrapers: público pero `noindex`, no una página para recomendar.
  "/estado",
]);

/**
 * El título de una página de error. El sitio no tiene página de error propia: un 404 lleva el
 * título por defecto de Nuxt ("404 - Page not found | Nuxt") y GA4 lo cuenta igual. Sin esto, un
 * enlace roto que citó un asistente de IA aparecería recomendado, con enlace, en la lista pública.
 */
const ERROR_TITLE = /^\d{3}\s*-\s|\|\s*Nuxt\s*$/;

export function isPublicListable(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (/^\/(en|pt)(\/|$)/.test(path)) return false;
  if (path.startsWith("/api/")) return false;
  if (PUBLIC_EXCLUDED_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return false;
  // Una ficha suelta: `bucketOf` no la pliega y tiene dos segmentos o más.
  const segments = path.split("/").filter(Boolean).length;
  return !(bucketOf(path) === path && segments >= 2);
}

export interface PublicPageRow {
  path: string;
  /** Título de GA4 tal cual (el app le saca el sufijo del sitio). */
  title: string;
  /** Puesto entre las publicables, 1 = la más visitada. */
  rank: number;
  weeks: number[];
  views: number;
  base: number;
  users: number;
  engagementSeconds: number;
  trend: number | null;
  isNew: boolean;
  isPeak: boolean;
}

export interface PublicRisingRow extends PublicPageRow {
  /** Vistas por semana antes (`null` si es nueva). */
  before: number | null;
  /** Vistas por semana en las dos últimas semanas. */
  after: number;
}

export interface PublicAiRow extends PublicPageRow {
  aiEntrances: number;
}

export interface PublicTopicRow {
  family: string;
  urls: number;
  views: number;
  base: number;
  share: number;
  weeks: number[];
  trend: number | null;
}

export interface PublicTopPagesTotals {
  viewsUy: number;
  sessionsUy: number;
  usersUy: number;
  pageCount: number;
  weeklyUy: number[];
  channels: { label: string; sessions: number; share: number }[];
  weeklyChannels: WeeklySeries[];
  weeklyDevices: WeeklySeries[];
}

export interface PublicTopPagesSnapshot {
  key: string;
  asOf: string;
  range: { start: string; end: string; days: number };
  weeks: { start: string; end: string }[];
  totals: PublicTopPagesTotals;
  pages: PublicPageRow[];
  rising: PublicRisingRow[];
  aiCited: PublicAiRow[];
  topics: PublicTopicRow[];
  guides: PublicPageRow[];
}

const series = (xs: WeeklySeries[] | undefined): WeeklySeries[] =>
  (xs || []).map((s) => ({ label: s.label, weeks: [...s.weeks] }));

/** Campo por campo, a propósito: ver el encabezado. */
function publicRow(r: PageRankRow, rank: number): PublicPageRow {
  return {
    path: r.path,
    title: r.title,
    rank,
    weeks: [...r.weeks],
    views: r.views,
    base: r.base,
    users: r.users,
    engagementSeconds: r.engagementSeconds,
    trend: r.trend,
    isNew: r.signals.includes("nueva"),
    isPeak: r.signals.includes("pico"),
  };
}

function publicTopic(f: FamilyRankRow): PublicTopicRow {
  return {
    family: f.family,
    urls: f.urls,
    views: f.views,
    base: f.base,
    share: f.share,
    weeks: [...f.weeks],
    trend: f.trend,
  };
}

const recentPerWeek = (weeks: number[]) => (weeks[weeks.length - 1] + weeks[weeks.length - 2]) / 2;

export function buildPublicTopPages(ranking: PageRankingSnapshot): PublicTopPagesSnapshot {
  const listable = ranking.pages.filter((r) => isPublicListable(r.path) && !ERROR_TITLE.test(r.title));
  const rankOf = new Map(listable.map((r, i) => [r.path, i + 1]));
  const byPath = (a: PageRankRow, b: PageRankRow) => a.path.localeCompare(b.path);

  // En alza: sin ponderar por plata (eso es de la privada), por vistas ganadas por semana.
  const rising = listable
    .filter(
      (r) =>
        (r.signals.includes("crece") || r.signals.includes("nueva")) &&
        !r.signals.includes("pico") &&
        recentPerWeek(r.weeks) * 2 >= FOCUS_MIN_VIEWS
    )
    .map((r) => {
      const parts = r.signals.includes("nueva") ? null : trendParts(r.weeks);
      const after = parts ? parts.after : recentPerWeek(r.weeks);
      return { r, before: parts ? parts.before : null, after, gain: after - (parts ? parts.before : 0) };
    })
    .sort((a, b) => b.gain - a.gain || byPath(a.r, b.r))
    .slice(0, PUBLIC_RISING)
    .map(({ r, before, after }) => ({ ...publicRow(r, rankOf.get(r.path) || 0), before, after }));

  const aiCited = listable
    .filter((r) => r.entrances.ai >= PUBLIC_AI_MIN_ENTRANCES)
    .sort((a, b) => b.entrances.ai - a.entrances.ai || b.base - a.base || byPath(a, b))
    .slice(0, PUBLIC_AI)
    .map((r) => ({ ...publicRow(r, rankOf.get(r.path) || 0), aiEntrances: r.entrances.ai }));

  // Un tema es una PLANTILLA (`/historico/*`, `/alquileres/*`): una página suelta ya está en la lista
  // principal y repetirla acá como "tema" sólo duplica filas.
  const topics = ranking.families
    .filter(
      (f) =>
        f.family.endsWith("/*") &&
        !/^\/(en|pt)(\/|$)/.test(f.family) &&
        // Contra el HUB: una familia se llama `/x/*` y nunca es igual a una ruta excluida.
        !PUBLIC_EXCLUDED_PATHS.includes(f.family.replace(/\/\*$/, ""))
    )
    .slice(0, PUBLIC_TOPICS)
    .map(publicTopic);

  // Lectura de un campo privado para ELEGIR, nunca para publicar: la fila sale con `publicRow`.
  const guides = listable
    .filter((r) => r.tier === "contenido")
    .slice(0, PUBLIC_GUIDES)
    .map((r) => publicRow(r, rankOf.get(r.path) || 0));

  const t = ranking.totals;
  return {
    key: TOP_PAGES_KEY,
    asOf: ranking.asOf,
    range: { start: ranking.range.start, end: ranking.range.end, days: ranking.range.days },
    weeks: ranking.weeks.map((w) => ({ start: w.start, end: w.end })),
    totals: {
      viewsUy: t.viewsUy,
      sessionsUy: t.sessionsUy,
      usersUy: t.usersUy,
      pageCount: ranking.pageCount,
      weeklyUy: [...t.weeklyUy],
      channels: t.channels.map((c) => ({ label: c.label, sessions: c.sessions, share: c.share })),
      weeklyChannels: series(t.weeklyChannels),
      weeklyDevices: series(t.weeklyDevices),
    },
    pages: listable.slice(0, PUBLIC_PAGES).map((r, i) => publicRow(r, i + 1)),
    rising,
    aiCited,
    topics,
    guides,
  };
}

/** No se escribe un documento con menos de diez páginas o sin vistas: casi seguro, algo falló arriba. */
export function publicTopPagesIsThin(doc: PublicTopPagesSnapshot): boolean {
  return doc.totals.viewsUy === 0 || doc.pages.length < PUBLIC_MIN_PAGES;
}
