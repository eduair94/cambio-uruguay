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
 *
 * Además de las hermanas, una familia puede llevar GRUPOS (`GRUPOS`, más abajo): enlaces de la
 * sección que no son páginas del directorio — las guías de antes de alquilar, la venta, las
 * mudanzas. Van adentro de la misma barra porque el directorio de alquileres llegó a tener TRES
 * bloques de enlaces seguidos arriba del título (esta barra, "Otras búsquedas de vivienda" y "Antes
 * de alquilar"), con tres de los siete botones repitiendo hermanas de la barra. El usuario lo
 * describió como "extremadamente confuso" (2026-09-21): la sección es una sola, y la barra también.
 * Un grupo NO da pertenencia: la barra no aparece en la página de una guía, y así `/venta-viviendas`
 * puede seguir teniendo su propia familia.
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
  /** Ícono MDI del menú; el del registro para el directorio. */
  readonly icon: string
  readonly current: boolean
}

export interface FamiliaNavGrupo {
  /** Título del grupo (clave global de i18n). */
  readonly labelKey: string
  readonly items: readonly FamiliaNavItem[]
}

export interface FamiliaNav {
  readonly directorio: string
  readonly items: readonly FamiliaNavItem[]
  /** Enlaces de la sección que no son del directorio; nunca repiten una ruta de `items`. */
  readonly grupos: readonly FamiliaNavGrupo[]
}

interface GrupoDef {
  readonly labelKey: string
  /** `labelKey` propio sólo cuando la etiqueta del menú no sirve acá. */
  readonly links: readonly { readonly to: string; readonly labelKey?: string }[]
}

/**
 * Los grupos de cada familia, por `id` del directorio. Se muestran en TODAS las páginas de la
 * familia, igual que las hermanas: una barra de sección que cambia de una página a otra deja de ser
 * la barra de la sección.
 *
 * Las guías de alquiler llevan la PREGUNTA del lector y no el título de la guía: el que está mirando
 * avisos no busca un artículo, busca saber qué garantía le van a pedir. Estaban arriba del
 * directorio desde el 2026-09-20 porque al pie aparecían a y=13.000 de una página de 22.717 px.
 */
const GRUPOS: Readonly<Record<string, readonly GrupoDef[]>> = {
  alquileres: [
    {
      labelKey: 'familiaNav.grupos.vivienda',
      links: [
        { to: '/venta-viviendas-uruguay' },
        { to: '/inmobiliarias-uruguay' },
        { to: '/alquiler-ideal-uruguay' },
        { to: '/fletes-mudanzas-uruguay' },
      ],
    },
    {
      labelKey: 'familiaNav.grupos.antesDeAlquilar',
      links: [
        { to: '/alquilar-en-uruguay', labelKey: 'familiaNav.preguntas.garantia' },
        { to: '/alquilar-sin-recibo-de-sueldo', labelKey: 'familiaNav.preguntas.sinRecibo' },
        { to: '/alquilar-estando-en-clearing', labelKey: 'familiaNav.preguntas.clearing' },
      ],
    },
  ],
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
  // Una ruta aparece UNA vez en toda la barra: la hermana gana sobre el grupo, y el primer grupo
  // sobre los siguientes. Repetirla fue exactamente lo que volvió confusa la cabecera de alquileres.
  const seen = new Set(routes)
  const grupos = (GRUPOS[entry.id] ?? [])
    .map(grupo => ({
      labelKey: grupo.labelKey,
      items: grupo.links
        .filter(link => {
          if (INTERNAL.has(link.to) || seen.has(link.to)) return false
          seen.add(link.to)
          return true
        })
        .map(link => {
          const nav = navEntryForPath(link.to)
          return {
            to: link.to,
            labelKey: link.labelKey ?? nav?.labelKey ?? null,
            label: link.to,
            icon: nav?.icon ?? 'mdi-file-document-outline',
            current: link.to === route,
          }
        }),
    }))
    .filter(grupo => grupo.items.length > 0)
  return {
    directorio: entry.id,
    items: routes.map(to => {
      const nav = navEntryForPath(to)
      return {
        to,
        labelKey: nav?.labelKey ?? null,
        label: to === entry.to ? entry.titulo : (tambienLabel.get(to) ?? to),
        icon: nav?.icon ?? (to === entry.to ? entry.icon : 'mdi-file-document-outline'),
        current: to === route,
      }
    }),
    grupos,
  }
}

/** Cuántos enlaces tiene la barra entera: las hermanas más los grupos. */
export function familiaNavTotal(nav: FamiliaNav): number {
  return nav.items.length + nav.grupos.reduce((n, grupo) => n + grupo.items.length, 0)
}
