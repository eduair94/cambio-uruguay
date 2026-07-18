// Maps the 14 Reddit money-topics (utils/redditTopics.ts) to our content hubs (utils/guideHubs.ts)
// and measures how well our OWN guides cover each topic — using the SAME classifier that measures
// Reddit demand, so demand and coverage are read with one ruler. Pure module (no Vue/Nuxt runtime)
// so it is unit-testable and shared by the page.
import { TOPIC_DEFS } from './redditTopics'
import { guides } from './guides'
import { getHub } from './guideHubs'
import type { CoverageStatus } from './topicColors'

/** Each demand topic → the hub that best answers it on our site. */
export const TOPIC_HUB: Readonly<Record<string, string>> = Object.freeze({
  'dolar-cambio': 'dolar-y-casas-de-cambio-uruguay',
  'ahorro-inversion': 'ahorrar-e-invertir-uruguay',
  'alquiler-vivienda': 'alquiler-y-vivienda-uruguay',
  'deuda-clearing': 'deudas-y-credito-uruguay',
  'credito-prestamo': 'deudas-y-credito-uruguay',
  tarjetas: 'deudas-y-credito-uruguay',
  'bancos-fintech': 'finanzas-personales-y-jubilacion-uruguay',
  impuestos: 'sueldo-trabajo-e-impuestos-uruguay',
  'sueldo-trabajo': 'sueldo-trabajo-e-impuestos-uruguay',
  'compras-import': 'importaciones-y-aduana-uruguay',
  'precios-inflacion': 'economia-y-mercado-uruguay',
  'emprender-empresa': 'emprender-y-empresa-uruguay',
  'jubilacion-afap': 'finanzas-personales-y-jubilacion-uruguay',
  cripto: 'ahorrar-e-invertir-uruguay',
})

// Precomputed once: title + description of every guide, for the coverage classifier.
const GUIDE_HAYSTACK = guides.map(g => `${g.title} ${g.description}`)

/** How many of our guides address a topic (its own matcher run over our guide catalogue). */
export const COVERAGE_COUNT: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(
    TOPIC_DEFS.map(t => [t.id, GUIDE_HAYSTACK.filter(h => t.match.test(h)).length])
  )
)

export function coverageCount(topicId: string): number {
  return COVERAGE_COUNT[topicId] ?? 0
}

/**
 * Coverage status from the guide count and the topic's demand rank. A well-answered topic is
 * `cubierto`; a thin one is `gap`; the middle is an `oportunidad`. High demand + thin coverage is
 * pushed to `gap` even at 2-3 guides, because that is where the content gap actually hurts.
 */
export function coverageStatus(
  count: number,
  demandRank: number,
  topicTotal: number
): CoverageStatus {
  const highDemand = demandRank < topicTotal / 2
  if (count <= 1) return 'gap'
  if (count <= 2) return highDemand ? 'gap' : 'oportunidad'
  if (count <= 3) return 'oportunidad'
  return 'cubierto'
}

export interface TopicHubRef {
  slug: string
  title: string
  guides: number
}

/** The hub that answers a topic, with its guide count, or null when unmapped. */
export function hubFor(topicId: string): TopicHubRef | null {
  const slug = TOPIC_HUB[topicId]
  if (!slug) return null
  const hub = getHub(slug)
  return hub ? { slug: hub.slug, title: hub.title, guides: hub.guideSlugs.length } : null
}
