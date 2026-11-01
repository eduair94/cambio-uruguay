import { isBareRoute } from './bareRoutes'
import guideMeasurementSlugs from './guideMeasurementSlugs.json'

// Generated from the catalog, with a snapshot parity test. Do not load the full
// guide corpus into every page merely to identify public analytics paths.
const knownGuideSlugs = new Set(guideMeasurementSlugs)

/** Router patterns plus catalog-verified guide slugs; unknown params remain private. */
export interface MeasurementRoute {
  path: string
  matched: readonly { path: string }[]
  meta?: { middleware?: unknown }
}

export function measurementPath(route: MeasurementRoute): string | null {
  const middleware = route.meta?.middleware
  if (middleware === 'auth' || (Array.isArray(middleware) && middleware.includes('auth')))
    return null
  const pattern = route.matched.at(-1)?.path
  if (!pattern || pattern.includes('.*')) return null // Includes unknown/404 routes.
  const path = pattern.replace(/:[a-z_]\w*(?:\([^)]*\))?[?*+]?/gi, ':item')
  const plain = path.replace(/^\/(?:en|pt)(?=\/|$)/, '') || '/'
  if (
    isBareRoute(path) ||
    /^\/(?:api|cuenta|conectar|mi-lista|estadisticas-por-pagina|estadisticas-de-busqueda)(?:\/|$)/.test(
      plain
    ) ||
    !/^\/(?:[\w-]+|:item)?(?:\/(?:[\w-]+|:item))*\/?$/.test(path) ||
    /^\/(?:en\/|pt\/)?:item(?:\/|$)/.test(path)
  )
    return null
  if (plain === '/guias/:item') {
    const prefix = path.slice(0, -':item'.length)
    const pathname = route.path.split(/[?#]/)[0]?.replace(/\/+$/, '') || '/'
    const slug = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ''
    if (knownGuideSlugs.has(slug)) return `${prefix}${slug}`
  }
  return path.replace(/\/+$/, '') || '/'
}

/** Override GA's automatic URL/title fields on these events too. */
export function measurementContext(path: string, origin: string) {
  return {
    content_path: path,
    page_location: `${origin}${path}`,
    page_referrer: '',
    page_title: path,
  }
}

export const LINK_AREAS = [
  'bank_decision',
  'guide_next_steps',
  'guide_section',
  'guide_contents',
  'related_pages',
  'header',
  'drawer',
  'footer',
  'content',
] as const

export type LinkArea = (typeof LINK_AREAS)[number]

export function measurementLinkArea(value: string | undefined): LinkArea {
  return LINK_AREAS.includes(value as LinkArea) ? (value as LinkArea) : 'content'
}

/** A bounded scroll signal, not a reading timer or a replacement for GA engagement. */
export function createReadingProgress() {
  let visitKey: string | null = null
  let contentPath: string | null = null
  let visibleSince: number | null = null
  let visibleMs = 0
  const sent = new Set<number>()

  const setVisible = (visible: boolean, now: number) => {
    if (visibleSince !== null) visibleMs += Math.max(0, now - visibleSince)
    visibleSince = visible ? now : null
  }

  return {
    visit(key: string, path: string | null, now: number, visible: boolean) {
      if (visitKey === key) return // Query/filter/hash changes are not another read.
      visitKey = key
      contentPath = path
      visibleSince = visible ? now : null
      visibleMs = 0
      sent.clear()
    },
    setVisible,
    scroll(percent: number, now: number) {
      if (!contentPath || visibleSince === null || !Number.isFinite(percent)) return []
      const path = contentPath
      const elapsed = visibleMs + Math.max(0, now - visibleSince)
      const milestones = [
        { percent: 50, after: 15_000 },
        { percent: 90, after: 30_000 },
      ]
      return milestones
        .filter(mark => percent >= mark.percent && elapsed >= mark.after && !sent.has(mark.percent))
        .map(mark => {
          sent.add(mark.percent)
          return { content_path: path, read_percent: mark.percent, non_interaction: true }
        })
    },
  }
}

/** Use the page's own box, excluding the layout's recommendations, footer and ad rail. */
export function contentScrollPercent(top: number, height: number, viewport: number): number | null {
  if (![top, height, viewport].every(Number.isFinite) || viewport <= 0 || height <= viewport)
    return null
  return Math.min(100, Math.max(0, ((viewport - top) / height) * 100))
}
