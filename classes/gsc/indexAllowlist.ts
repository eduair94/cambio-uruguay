// La lista blanca de indexación de una familia programática, medida en Search Console.
//
// POR QUÉ EXISTE. Medido en producción el 22/9/2026: las fichas de alquiler (`/alquileres/<slug>`)
// son `index, follow` y 9.647 de ellas están en el sitemap, mientras Search Console muestra ~40 con
// alguna impresión en 28 días. Eso es inflar el índice: Google gasta presupuesto de rastreo en miles
// de páginas que nadie busca y el hub (`/alquileres-uruguay`) compite con sus propias hijas vacías.
// La regla de corte está en docs/seo/2026-09-16-directorios-de-producto-plan.md §8: a las 8 semanas,
// una ficha con menos de 5 impresiones pasa a `noindex` y el hub se conserva.
//
// QUÉ HACE ESTE MÓDULO. Una consulta a Search Analytics por dimensión `page`, ventana de 56 días
// (datos finales), filtrada a la familia, y de ahí UN documento en la APP DB (`seoindexallowlists`):
// las rutas que SÍ tienen demanda. El app (`app/utils/rentalIndexHygiene.ts`) hace el resto: una
// ficha vieja que no está en la lista deja de indexarse y sale del sitemap.
//
// LO QUE NO HACE, A PROPÓSITO. No guarda consultas, ni métricas, ni escribe nada si la API falla,
// devuelve cero filas, corta por su tope de filas o achica la lista a menos del 30 % de la guardada:
// un documento ausente o vencido significa "sin cambio" del lado del app, así que una corrida rota
// nunca puede desindexar nada, y una corrida a medias nunca pisa la última lista buena. Y no toca a las fichas jóvenes: a 56 días de
// vida una ficha todavía no tuvo tiempo de ser rastreada, y juzgarla por sus impresiones sería medir
// la cola del rastreo, no la demanda.
import { dayOffset, lastFinalDay, MAX_ROWS_PER_REQUEST, searchAnalytics } from "./client";
import { SeoIndexAllowlistModel } from "../models/SeoIndexAllowlist";
import type { GscRow } from "./types";

/** Ventana medida. 56 = 8 semanas, la regla del plan; múltiplo de 7 para no partir la semana. */
export const INDEX_ALLOWLIST_WINDOW_DAYS = 56;
/** Impresiones mínimas en la ventana para que una ficha conserve el `index`. */
export const INDEX_ALLOWLIST_MIN_IMPRESSIONS = 5;

/** Las familias medidas. La clave es el `family` del documento; el prefijo es lo que Search Console
 *  recibe como filtro `contains` y lo que las rutas tienen que abrir para contar. */
export const INDEX_ALLOWLIST_FAMILIES: ReadonlyArray<{ family: string; pathPrefix: string }> = [
  { family: "alquileres", pathPrefix: "/alquileres/" },
];

export interface SeoIndexAllowlist {
  family: string;
  /** Día de la corrida, `YYYY-MM-DD`. El app lo usa para vencer la lista si el job deja de correr. */
  asOf: string;
  windowDays: number;
  minImpressions: number;
  /** Rutas (sin host ni query) con ≥ `minImpressions` impresiones en la ventana. */
  urls: string[];
  /** Filas que Search Console devolvió para la familia, antes del umbral. */
  rowCount: number;
  /** `false` si la respuesta llegó al tope de filas de la API y puede faltar alguna ruta. */
  complete: boolean;
}

/**
 * La ruta propia detrás de una URL de Search Console, o `null` si no es de la familia.
 *
 * Los espejos `/en/...` y `/pt/...` se pliegan a la ruta española: el sujeto es la vivienda, no el
 * idioma, y esos espejos ya no existen como rutas (la ficha es sólo en español). Sin query ni hash:
 * Search Console lista `?utm_...` como página distinta y la demanda es la misma.
 */
export function allowlistPath(page: string, pathPrefix: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(page).pathname;
  } catch {
    return null;
  }
  pathname = pathname.replace(/^\/(?:en|pt)(?=\/)/, "").replace(/\/+$/, "");
  return pathname.startsWith(pathPrefix) && pathname.length > pathPrefix.length ? pathname : null;
}

/** Construye el documento a partir de las filas crudas (por `page`) de Search Console. Puro. */
export function buildIndexAllowlist(
  rows: GscRow[],
  options: {
    family: string;
    pathPrefix: string;
    asOf: string;
    windowDays?: number;
    minImpressions?: number;
    complete: boolean;
  }
): SeoIndexAllowlist {
  const windowDays = options.windowDays ?? INDEX_ALLOWLIST_WINDOW_DAYS;
  const minImpressions = options.minImpressions ?? INDEX_ALLOWLIST_MIN_IMPRESSIONS;
  const impressions = new Map<string, number>();
  let rowCount = 0;
  for (const row of rows) {
    const path = allowlistPath(row.keys[0] || "", options.pathPrefix);
    if (!path) continue;
    rowCount++;
    impressions.set(path, (impressions.get(path) || 0) + (row.impressions || 0));
  }
  const urls = [...impressions.entries()]
    .filter(([, total]) => total >= minImpressions)
    .map(([path]) => path)
    .sort();
  return {
    family: options.family,
    asOf: options.asOf,
    windowDays,
    minImpressions,
    urls,
    rowCount,
    complete: options.complete,
  };
}

/**
 * Trae la ventana de la familia y arma la lista. `null` cuando Search Console no devolvió NINGUNA
 * fila: eso es una respuesta rota o una propiedad mal configurada, no una familia sin demanda (el
 * hub solo ya garantiza filas con el prefijo), y un `null` acá es lo que impide pisar la lista
 * anterior.
 */
export async function refreshIndexAllowlist(
  family: { family: string; pathPrefix: string },
  now: number = Date.now()
): Promise<SeoIndexAllowlist | null> {
  const endDate = lastFinalDay(now);
  const startDate = dayOffset(INDEX_ALLOWLIST_WINDOW_DAYS - 1, Date.parse(`${endDate}T00:00:00Z`));
  const rows = await searchAnalytics({
    startDate,
    endDate,
    dimensions: ["page"],
    dimensionFilterGroups: [
      { filters: [{ dimension: "page", operator: "contains", expression: family.pathPrefix }] },
    ],
    dataState: "final",
    maxRows: MAX_ROWS_PER_REQUEST,
  });
  if (!rows.length) return null;
  return buildIndexAllowlist(rows, {
    ...family,
    asOf: dayOffset(0, now),
    complete: rows.length < MAX_ROWS_PER_REQUEST,
  });
}

/**
 * Una lista que se achicó a menos del 30 % de la guardada es una respuesta parcial de Google, no
 * 70 % de fichas que dejaron de buscarse en un día. Misma guarda que el snapshot del panel: se
 * conserva la anterior. Sólo aplica cuando la anterior tenía cuerpo (≥ 20 rutas); con menos, el
 * 30 % es ruido de una o dos fichas.
 */
export function allowlistIsThin(next: SeoIndexAllowlist, previous: SeoIndexAllowlist | null): boolean {
  if (!previous || previous.urls.length < 20) return false;
  return next.urls.length < previous.urls.length * 0.3;
}

export async function loadIndexAllowlist(family: string): Promise<SeoIndexAllowlist | null> {
  return SeoIndexAllowlistModel.findOne({ family }).lean<SeoIndexAllowlist>().exec();
}

export async function saveIndexAllowlist(doc: SeoIndexAllowlist): Promise<void> {
  await SeoIndexAllowlistModel.updateOne({ family: doc.family }, { $set: doc }, { upsert: true });
}

/**
 * El paso completo, una familia por vez, para `sync_gsc.ts`. Nunca lanza: una familia que falla se
 * registra y se conserva su documento anterior, y el resto del job (el archivo, el panel) sigue.
 * Devuelve un resumen por familia para el log.
 */
export async function syncIndexAllowlists(options: {
  dryRun: boolean;
  now?: number;
  families?: ReadonlyArray<{ family: string; pathPrefix: string }>;
}): Promise<Array<{ family: string; urls: number; rowCount: number; written: boolean; note: string }>> {
  const out: Array<{ family: string; urls: number; rowCount: number; written: boolean; note: string }> = [];
  for (const family of options.families ?? INDEX_ALLOWLIST_FAMILIES) {
    try {
      const next = await refreshIndexAllowlist(family, options.now);
      if (!next) {
        out.push({ family: family.family, urls: 0, rowCount: 0, written: false, note: "cero filas, se conserva la anterior" });
        continue;
      }
      if (options.dryRun) {
        out.push({
          family: family.family,
          urls: next.urls.length,
          rowCount: next.rowCount,
          written: false,
          note: next.complete ? "dry run" : "dry run, INCOMPLETA (tope de filas de la API)",
        });
        continue;
      }
      // Una respuesta cortada por el tope de filas puede omitir rutas con demanda. El app ya se
      // niega a aplicar un documento `complete: false`, pero escribirlo igual pisaría la última
      // lista completa y buena — la única que el app sí aplica — con una que no sirve para nada.
      if (!next.complete) {
        out.push({
          family: family.family,
          urls: next.urls.length,
          rowCount: next.rowCount,
          written: false,
          note: "INCOMPLETA (tope de filas de la API), se conserva la anterior",
        });
        continue;
      }
      const previous = await loadIndexAllowlist(family.family);
      if (allowlistIsThin(next, previous)) {
        out.push({
          family: family.family,
          urls: next.urls.length,
          rowCount: next.rowCount,
          written: false,
          note: `flaca contra ${previous!.urls.length} guardadas, se conserva la anterior`,
        });
        continue;
      }
      await saveIndexAllowlist(next);
      out.push({
        family: family.family,
        urls: next.urls.length,
        rowCount: next.rowCount,
        written: true,
        note: "ok",
      });
    } catch (e: any) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || String(e);
      out.push({ family: family.family, urls: 0, rowCount: 0, written: false, note: `falló: ${detail}` });
    }
  }
  return out;
}
