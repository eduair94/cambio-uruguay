// El sitemap, para saber qué rutas son NUEVAS (la muestra de inspección empieza por ellas).
//
// `/api/__sitemap__/urls` es caro para el sitio (los sitemaps tiraron el origen el 6/11): una sola
// lectura por corrida, con tope de tiempo y un User-Agent propio. Menos de 200 URLs es una lectura
// rota y no toca nada.
//
// SÓLO RUTAS EN CASTELLANO. El sitemap lista cada página una vez por idioma: con todos los idiomas la
// lista pasaría cualquier tope razonable, y una ruta que el tope dejó afuera volvería al día siguiente
// con fecha de hoy, contada como nueva. Una ruta traducida toma la fecha de su par en castellano.
import axios from "axios";

import { addDays } from "../../site-analytics/refresh";
import { SITEMAP_GONE_DAYS, SITEMAP_MIN_URLS, STATE_FIRST_SEEN_MAX } from "../caps";
import { daysBetween, sitePath, stripLocale } from "../paths";
import type { InsightState } from "../types";

export class ThinSitemap extends Error {
  constructor(n: number) {
    super(`el sitemap devolvió sólo ${n} URLs`);
    this.name = "ThinSitemap";
  }
}

export function sitemapUrl(): string {
  return `${(process.env.SITE_BASE_URL || "https://cambio-uruguay.com").replace(/\/+$/, "")}/api/__sitemap__/urls`;
}

/** Las rutas del sitemap, sin repetir. Acepta `string | {loc|url}` como `sync_rag_index.ts`. */
export function parseSitemapPaths(data: any): string[] {
  const rows: any[] = Array.isArray(data) ? data : Array.isArray(data?.urls) ? data.urls : [];
  const out = new Set<string>();
  for (const row of rows) {
    const loc = typeof row === "string" ? row : (row?.loc ?? row?.url ?? "");
    const path = sitePath(loc);
    if (path) out.add(path);
  }
  return [...out];
}

export async function fetchSitemapPaths(get: (url: string, config: any) => Promise<{ data: any }> = axios.get): Promise<string[]> {
  const res = await get(sitemapUrl(), {
    timeout: 60000,
    signal: AbortSignal.timeout(62000),
    headers: { "User-Agent": "CambioUruguayUsageInsights/1.0" },
  });
  const paths = parseSitemapPaths(res.data);
  if (paths.length < SITEMAP_MIN_URLS) throw new ThinSitemap(paths.length);
  return paths;
}

export type SitemapState = InsightState["sitemap"];

export const emptySitemapState = (): SitemapState => ({ seededAt: "", fetchedAt: "", capped: false, firstSeen: [], gone: [] });

/**
 * La memoria de "primera vez en el sitemap", actualizada con la lectura de hoy. Pura.
 * - Primera corrida: toda ruta en castellano lleva `seededAt` (nunca "nueva").
 * - Después: una ruta que no estaba lleva `day`, salvo que la lista anterior estuviera topada (no se
 *   puede distinguir una ruta nueva de una que el tope dejó afuera): entonces lleva `seededAt`.
 * - Una ruta que salió del sitemap se recuerda 35 días y se borra.
 * - Tope de 60.000, quedándose con las más nuevas; pasarlo marca `capped`.
 */
export function updateFirstSeen(
  prev: SitemapState | null | undefined,
  paths: string[],
  day: string,
  nowIso: string,
  log: (line: string) => void = () => undefined
): SitemapState {
  const spanish = [...new Set(paths.filter((p) => stripLocale(p).locale === null))];
  const first = !prev || !prev.seededAt || !prev.firstSeen?.length;
  const seededAt = first ? day : prev!.seededAt;
  const known = new Map<string, string>(first ? [] : prev!.firstSeen);
  const goneSince = new Map<string, string>(first ? [] : prev!.gone || []);
  const current = new Set(spanish);
  for (const p of spanish) {
    if (!known.has(p)) known.set(p, first || prev?.capped ? seededAt : day);
    goneSince.delete(p);
  }
  for (const p of [...known.keys()]) {
    if (current.has(p)) continue;
    const since = goneSince.get(p) ?? day;
    if (daysBetween(since, day) > SITEMAP_GONE_DAYS) {
      known.delete(p);
      goneSince.delete(p);
    } else goneSince.set(p, since);
  }
  const capped = spanish.length > STATE_FIRST_SEEN_MAX;
  if (capped) log(`[usage-insights] sitemap: ${spanish.length} rutas en español > 60.000, las nuevas dejan de fecharse`);
  const entries = [...known.entries()]
    .sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] < b[1] ? 1 : -1))
    .slice(0, STATE_FIRST_SEEN_MAX);
  const keptSet = new Set(entries.map((e) => e[0]));
  const gone = [...goneSince.entries()].filter(([p]) => keptSet.has(p));
  return { seededAt, fetchedAt: nowIso, capped, firstSeen: entries, gone };
}

/**
 * La fecha de primera vez de una ruta (o de su par en castellano), o null si no se sabe. Una fecha
 * desconocida o igual a `seededAt` no es "nueva" nunca.
 */
export function firstSeenLookup(state: SitemapState | null | undefined): (path: string) => string | null {
  const map = new Map<string, string>(state?.firstSeen || []);
  return (path: string) => map.get(stripLocale(path).path) ?? null;
}

export function isNewPath(firstSeen: string | null, seededAt: string, day: string, withinDays: number): boolean {
  if (!firstSeen || firstSeen === seededAt) return false;
  return firstSeen >= addDays(day, -withinDays);
}
