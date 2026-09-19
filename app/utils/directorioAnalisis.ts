/**
 * El vínculo entre cada directorio y los análisis que se hacen con sus datos, en los dos sentidos.
 *
 * El sitio tenía el directorio de autos usados y, al lado, el informe del mercado, la evolución de
 * precios, el tablero de autos con deuda y el tasador — todos calculados con los mismos avisos — y
 * casi ninguno se enlazaba con los otros: el directorio de ventas no llevaba a su evolución de
 * precios, el de autos no llevaba a la suya, y un análisis no decía de qué directorio salían sus
 * números. Este módulo lo resuelve desde el registro (`utils/directorios.ts`), no página por página:
 *
 * - En un directorio (o en una de sus páginas `tambien`), el bloque lista sus análisis.
 * - En un análisis, el bloque lleva de vuelta al directorio del que sale y a los análisis hermanos.
 *
 * Lo dibuja `components/DirectorioAnalisis.vue` desde el layout, así que las ~30 páginas quedan
 * vinculadas sin editar ninguna y una página de análisis nueva se vincula con una línea en el
 * registro. Las etiquetas salen del menú (`siteNav`), que ya las tiene en español, inglés y
 * portugués; por eso todo análisis del registro tiene que estar en el menú.
 *
 * Sólo rutas exactas: las fichas (un auto, una casa, un aviso) mueven más de mil páginas
 * programáticas y son otra decisión, como en las migas de los directorios.
 */
import { DIRECTORIOS, type DirectorioEntry } from './directorios'
import { normalizeRelatedPath } from './relatedPages'
import { NAV_SECTIONS, type NavEntry } from './siteNav'

/** Qué es la página en la que se dibuja el bloque. */
export type DirectorioAnalisisRol = 'directorio' | 'analisis'

export interface DirectorioAnalisisLink {
  readonly to: string
  readonly kind: 'directorio' | 'analisis'
  /** Clave i18n de la entrada del menú: la misma etiqueta en los tres idiomas. */
  readonly labelKey: string
  readonly icon: string
}

export interface DirectorioAnalisisBloque {
  readonly rol: DirectorioAnalisisRol
  /** Cuántos directorios alimentan la página (para el singular o plural del texto). */
  readonly directorios: number
  readonly links: readonly DirectorioAnalisisLink[]
}

let navByPath: Map<string, NavEntry> | null = null

/** La entrada del menú de una ruta, o `undefined` si la ruta no está en el menú. */
export function navEntryForPath(path: string): NavEntry | undefined {
  if (!navByPath) {
    navByPath = new Map()
    for (const section of NAV_SECTIONS)
      for (const entry of section.entries)
        if (entry.to && !navByPath.has(entry.to)) navByPath.set(entry.to, entry)
  }
  return navByPath.get(path)
}

function analysisLink(to: string): DirectorioAnalisisLink | null {
  const nav = navEntryForPath(to)
  if (!nav) return null
  return { to, kind: 'analisis', labelKey: nav.labelKey, icon: nav.icon }
}

function directoryLink(entry: DirectorioEntry): DirectorioAnalisisLink | null {
  const nav = navEntryForPath(entry.to)
  if (!nav) return null
  return { to: entry.to, kind: 'directorio', labelKey: nav.labelKey, icon: entry.icon }
}

/** Los directorios de los que `route` es página propia: la principal o una `tambien`. */
export function directoriosDeRuta(route: string): DirectorioEntry[] {
  return DIRECTORIOS.filter(
    entry => entry.to === route || (entry.tambien ?? []).some(link => link.to === route)
  )
}

/** Los directorios con cuyos datos se calcula el análisis `route`. */
export function directoriosDeAnalisis(route: string): DirectorioEntry[] {
  return DIRECTORIOS.filter(entry => (entry.analisis ?? []).includes(route))
}

/**
 * El bloque que corresponde a `path`, o `null` si la ruta no es ni un directorio ni un análisis del
 * registro (o si no tiene nada que enlazar: un directorio sin análisis no dibuja un bloque vacío).
 */
export function directorioAnalisisParaRuta(path: string): DirectorioAnalisisBloque | null {
  const route = normalizeRelatedPath(path)

  const own = directoriosDeRuta(route)
  if (own.length) {
    const links: DirectorioAnalisisLink[] = []
    for (const entry of own)
      for (const to of entry.analisis ?? []) {
        if (to === route || links.some(link => link.to === to)) continue
        const link = analysisLink(to)
        if (link) links.push(link)
      }
    return links.length ? { rol: 'directorio', directorios: own.length, links } : null
  }

  const sources = directoriosDeAnalisis(route)
  if (!sources.length) return null
  const links: DirectorioAnalisisLink[] = []
  // Primero de dónde salen los datos, después lo demás que se mide con ellos.
  for (const entry of sources) {
    const link = directoryLink(entry)
    if (link) links.push(link)
  }
  for (const entry of sources)
    for (const to of entry.analisis ?? []) {
      if (to === route || links.some(link => link.to === to)) continue
      const link = analysisLink(to)
      if (link) links.push(link)
    }
  return { rol: 'analisis', directorios: sources.length, links }
}

/**
 * Para el hub: los análisis de cada tarjeta de una familia, con los que comparten dos o más tarjetas
 * separados, para decirlos una vez sobre la familia en lugar de repetirlos en cada tarjeta.
 * CyberLunes sale de cuatro directorios de Compras; en cuatro tarjetas seguidas sería ruido.
 */
export function analisisDeFamilia(entries: readonly DirectorioEntry[]): {
  compartidos: string[]
  propios: Record<string, string[]>
} {
  const count = new Map<string, number>()
  for (const entry of entries)
    for (const to of new Set(entry.analisis ?? [])) count.set(to, (count.get(to) ?? 0) + 1)
  const compartidos = [...count.keys()].filter(to => (count.get(to) ?? 0) >= 2)
  const propios: Record<string, string[]> = {}
  for (const entry of entries)
    propios[entry.id] = (entry.analisis ?? []).filter(to => !compartidos.includes(to))
  return { compartidos, propios }
}
