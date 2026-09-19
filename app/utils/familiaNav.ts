/**
 * La barra de la familia: arriba de cada página de un directorio, sus hermanas (el directorio, sus
 * páginas `tambien` y sus análisis) en una fila, con la actual marcada.
 *
 * Existe porque "estar enlazado" no alcanzaba. Medido en producción el 2026-09-19 a 1280 px: la
 * evolución del precio del alquiler estaba enlazada desde el directorio de alquileres y desde el
 * análisis, pero sólo en el bloque del pie — a 11.341 px de una página de 15.868, después de todos
 * los avisos. Lo mismo en autos (el informe del mercado, la evolución y el tasador aparecían a
 * partir de 4.346 px del directorio) y en venta de viviendas (la evolución, a 8.679 px). El lector
 * que llega a un directorio no se entera de que hay un análisis al lado.
 *
 * Sale del registro (`utils/directorios.ts`), como el bloque directorio ↔ análisis del pie: una
 * página nueva del registro entra sola a la barra de su familia.
 *
 * - Un análisis que comparten dos o más directorios (CyberLunes sale de cinco) no es de ninguna
 *   familia: en la barra de celulares sería una hermana que también es de sillas, tiendas…
 * - Las rutas fuera del sitemap (el tablero de `/estado`) no van en una barra de lectura.
 * - Una familia de una sola página no dibuja barra.
 */
import { navEntryForPath } from './directorioAnalisis'
import { DIRECTORIOS, type DirectorioEntry } from './directorios'
import { normalizeRelatedPath } from './relatedPages'
import { NAV_SECTIONS } from './siteNav'

export interface FamiliaNavItem {
  readonly to: string
  /** Etiqueta del menú (trilingüe). */
  readonly labelKey: string | null
  /** Etiqueta en español, para una ruta que no está en el menú. */
  readonly label: string
  readonly current: boolean
}

export interface FamiliaNav {
  readonly directorio: string
  readonly items: readonly FamiliaNavItem[]
}

/** Análisis que salen de dos o más directorios: no pertenecen a ninguna familia. */
const SHARED: ReadonlySet<string> = (() => {
  const count = new Map<string, number>()
  for (const entry of DIRECTORIOS)
    for (const route of new Set(entry.analisis ?? [])) count.set(route, (count.get(route) ?? 0) + 1)
  return new Set([...count].filter(([, n]) => n >= 2).map(([route]) => route))
})()

/** Rutas que existen pero no se promocionan: fuera del sitemap. */
const INTERNAL: ReadonlySet<string> = new Set(
  NAV_SECTIONS.flatMap(section => section.entries)
    .filter(entry => entry.sitemapExclude && entry.to)
    .map(entry => entry.to as string)
)

/** Las rutas de la familia de un directorio, en orden: directorio, `tambien`, análisis. */
export function familiaDe(entry: DirectorioEntry): string[] {
  const routes = [
    entry.to,
    ...(entry.tambien ?? []).map(link => link.to),
    ...(entry.analisis ?? []).filter(route => !SHARED.has(route)),
  ].filter(route => !INTERNAL.has(route))
  return [...new Set(routes)]
}

/** La barra que corresponde a `path`, o `null` si la página no es de exactamente una familia. */
export function familiaNavParaRuta(path: string): FamiliaNav | null {
  const route = normalizeRelatedPath(path)
  const owners = DIRECTORIOS.filter(entry => familiaDe(entry).includes(route))
  if (owners.length !== 1) return null
  const entry = owners[0]!
  const routes = familiaDe(entry)
  if (routes.length < 2) return null
  const tambienLabel = new Map((entry.tambien ?? []).map(link => [link.to, link.label]))
  return {
    directorio: entry.id,
    items: routes.map(to => ({
      to,
      labelKey: navEntryForPath(to)?.labelKey ?? null,
      label: to === entry.to ? entry.titulo : (tambienLabel.get(to) ?? to),
      current: to === route,
    })),
  }
}
