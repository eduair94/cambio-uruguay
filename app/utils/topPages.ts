// Tipos y utilidades de /paginas-mas-visitadas: la versión PÚBLICA del ranking de páginas que
// escribe `currency-site-analytics` (classes/site-analytics/publicTopPages.ts).
//
// El documento ya viene sin nada privado; acá sólo se le pone nombre humano a cada ruta (con la
// navegación del sitio) y se formatea.
import { NAV_SECTIONS } from './siteNav'

export interface WeeklySeries {
  label: string
  weeks: number[]
}

export interface TopPageRow {
  path: string
  title: string
  rank: number
  weeks: number[]
  views: number
  base: number
  users: number
  engagementSeconds: number
  trend: number | null
  isNew: boolean
  isPeak: boolean
}

export interface TopRisingRow extends TopPageRow {
  before: number | null
  after: number
}

export interface TopAiRow extends TopPageRow {
  aiEntrances: number
}

export interface TopTopicRow {
  family: string
  urls: number
  views: number
  base: number
  share: number
  weeks: number[]
  trend: number | null
}

export interface TopPagesSnapshot {
  key: string
  asOf: string
  range: { start: string; end: string; days: number }
  weeks: { start: string; end: string }[]
  totals: {
    viewsUy: number
    sessionsUy: number
    usersUy: number
    pageCount: number
    weeklyUy: number[]
    channels: { label: string; sessions: number; share: number }[]
    weeklyChannels: WeeklySeries[]
    weeklyDevices: WeeklySeries[]
  }
  pages: TopPageRow[]
  rising: TopRisingRow[]
  aiCited: TopAiRow[]
  topics: TopTopicRow[]
}

export interface Topic {
  /** Nombre de la entrada de la navegación (su `labelKey` traducido). */
  label: string
  /** Nombre de la sección de la navegación. */
  section: string
}

/**
 * El tema de una ruta según la navegación del sitio: la entrada cuyo `to` es la ruta, o si no la
 * de prefijo más largo (`/historico/brou/usd` cae en `/historico`). La portada sólo por igualdad:
 * como prefijo, `/` sería el tema de todo.
 */
export function topicOf(path: string, t: (key: string) => string): Topic | null {
  let best: { to: string; labelKey: string; titleKey: string } | null = null
  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      const to = entry.to
      if (!to) continue
      const hit = to === path || (to !== '/' && path.startsWith(`${to}/`))
      if (hit && (!best || to.length > best.to.length)) {
        best = { to, labelKey: entry.labelKey, titleKey: section.titleKey }
      }
    }
  }
  return best ? { label: t(best.labelKey), section: t(best.titleKey) } : null
}

/** `/historico/*` → `/historico`: la ruta del hub de una familia. */
export const familyHub = (family: string) => family.replace(/\/\*$/, '')

/**
 * Hubs que no tienen página propia (`pages/alquileres/` y `pages/casa/` sólo tienen fichas): sin
 * esto el tema se llamaría `/alquileres` y su enlace daría 404.
 */
const FAMILY_OVERRIDES: Record<string, { label: string; to: string }> = {
  '/alquileres/*': { label: 'Fichas de alquiler', to: '/alquileres-uruguay' },
  '/casa/*': { label: 'Casas de cambio, una por una', to: '/casas-de-cambio' },
}

/** `/algo-nuevo` → `Algo nuevo`. */
const humanize = (hub: string) => {
  const words = hub.replace(/^\//, '').replace(/-/g, ' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : hub
}

/**
 * Nombre y destino de un tema (familia). Con entrada en la navegación, su etiqueta y el hub; si no,
 * un nombre legible y SIN enlace — mejor que un enlace a una ruta que no existe.
 */
export function familyTopic(
  family: string,
  t: (key: string) => string
): { label: string; to: string | null } {
  const override = FAMILY_OVERRIDES[family]
  if (override) return { ...override }
  const hub = familyHub(family)
  const topic = topicOf(hub, t)
  return topic ? { label: topic.label, to: hub } : { label: humanize(hub), to: null }
}

/** Última semana contra la primera, − 1. `null` si la primera es cero o no hay serie. */
export function channelChange(weeks: number[]): number | null {
  if (weeks.length < 2 || !(weeks[0] > 0)) return null
  return weeks[weeks.length - 1] / weeks[0] - 1
}

/** Porción de cada serie en la semana `week`, en el orden de entrada. */
export function weekShares(series: WeeklySeries[], week: number) {
  const total = series.reduce((acc, s) => acc + (s.weeks[week] || 0), 0)
  return series.map(s => ({ label: s.label, share: total > 0 ? (s.weeks[week] || 0) / total : 0 }))
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Celular',
  desktop: 'Computadora',
  tablet: 'Tablet',
}

export const deviceLabel = (label: string) => DEVICE_LABELS[label] || label
