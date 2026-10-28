// La cola de /oportunidades-reddit: lo que comparten la página privada y su API.
//
// Módulo puro (sin Nuxt) para que la suite lo pruebe en Node: cómo se lee la query, qué filtro de
// Mongo sale de ella, cómo se etiqueta cada card. La cola la arma el job de backend
// `currency-reddit-opportunities` (`classes/redditopps/`); esto sólo la muestra.
import { isLocalizedRoute } from './localizedRoutes'

export const OPPS_PAGE_SIZE = 24
export const OPPS_MAX_LIMIT = 60
/** Espejo de `MIN_CONFIDENCE` en `classes/redditopps/judge.ts`: abajo de esto es un "tal vez". */
export const OPPS_MIN_CONFIDENCE = 0.7
/** Espejo de `OPPS_WINDOW_DAYS` en `classes/redditopps/subs.ts`. */
export const OPPS_WINDOW_DAYS = 30
export const OPPS_SITE_ORIGIN = 'https://cambio-uruguay.com'

export const OPPS_SORTS = ['rank', 'new', 'comments', 'score'] as const
export type OppsSort = (typeof OPPS_SORTS)[number]
export const OPPS_STATES = ['open', 'answered', 'dismissed', 'all'] as const
export type OppsStateFilter = (typeof OPPS_STATES)[number]
export type OppState = 'open' | 'answered' | 'dismissed'

export const OPPS_SORT_LABELS: Record<OppsSort, string> = {
  rank: 'Prioridad',
  new: 'Más nuevos',
  comments: 'Más comentados',
  score: 'Más votados',
}

export const OPPS_STATE_LABELS: Record<OppsStateFilter, string> = {
  open: 'Pendientes',
  answered: 'Respondidos',
  dismissed: 'Descartados',
  all: 'Todos',
}

export const OPPS_FAMILY_LABELS: Record<string, string> = {
  alquileres: 'Alquileres',
  viviendas: 'Comprar vivienda',
  autos: 'Autos',
  motos: 'Motos',
  compras: 'Compras y precios',
  movilidad: 'Movilidad',
  cambio: 'Dólar y cambio',
  tarjetas: 'Bancos y tarjetas',
  prestamos: 'Créditos y deudas',
  inversiones: 'Inversiones',
  aduana: 'Aduana y compras afuera',
  trabajo: 'Trabajo y sueldo',
  impuestos: 'Impuestos',
  tramites: 'Trámites',
  otros: 'Otros',
}

/**
 * Lo que hay que saber de cada sub antes de contestar. Medido, con fecha; viene de
 * `classes/redditbot/subrules.ts` y de las memorias del bot. No bloquea: quien contesta es una
 * persona con su cuenta, no el bot.
 */
export const OPPS_SUB_NOTES: Record<string, string> = {
  legaluruguay:
    'Borró en silencio un comentario con enlace (20/8/2026, medido con token anónimo). Mejor responder sin enlace, o pegar el link del comentario al marcarlo para ver si sigue visible.',
  askuruguayan:
    'Baneó a la cuenta del bot por spam (18/8/2026). Con una cuenta personal, enlazar sólo si el enlace es la respuesta.',
  charruadevs: 'Sus reglas prohíben bots. Una persona sí puede contestar.',
  uruguay:
    'Regla 2: el contenido propio no puede tener como única razón traer visitas. La respuesta tiene que servir sin el enlace.',
}

export interface OppsQuery {
  page: number
  /**
   * Desde qué fila, cuando la página la manda (el scroll infinito). Gana sobre `page`: después de
   * marcar tres cards, la "página 2" por número empezaría tres filas más adelante y esas tres no
   * se verían nunca.
   */
  offset: number | null
  limit: number
  sub: string | null
  family: string | null
  state: OppsStateFilter
  q: string
  sort: OppsSort
}

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v)
const str = (v: unknown): string =>
  typeof first(v) === 'string' ? (first(v) as string).trim() : ''
const int = (v: unknown, fallback: number): number => {
  const n = Number.parseInt(str(v), 10)
  return Number.isFinite(n) ? n : fallback
}

/** La query de la URL o de la API, acotada: nada que venga de afuera llega crudo a Mongo. */
export function parseOppsQuery(raw: Record<string, unknown>): OppsQuery {
  const sort = str(raw.sort) as OppsSort
  const state = str(raw.state) as OppsStateFilter
  const sub = str(raw.sub)
  const family = str(raw.family)
  const offset = int(raw.offset, -1)
  return {
    page: Math.max(1, Math.min(500, int(raw.page, 1))),
    offset: offset >= 0 ? Math.min(offset, 30_000) : null,
    limit: Math.max(1, Math.min(OPPS_MAX_LIMIT, int(raw.limit, OPPS_PAGE_SIZE))),
    sub: /^\w{2,40}$/.test(sub) ? sub : null,
    family: family in OPPS_FAMILY_LABELS ? family : null,
    state: (OPPS_STATES as readonly string[]).includes(state) ? state : 'open',
    q: str(raw.q).slice(0, 80),
    sort: (OPPS_SORTS as readonly string[]).includes(sort) ? sort : 'rank',
  }
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * El filtro de Mongo de una query. `omit` saca una dimensión, para contar sus facetas sin que el
 * filtro de esa misma dimensión las deje en una sola opción.
 */
export function buildOppsFilter(
  q: OppsQuery,
  omit: 'sub' | 'family' | 'state' | null = null,
  now: number = Date.now()
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    verdict: 'recommend',
    confidence: { $gte: OPPS_MIN_CONFIDENCE },
    duplicateOf: { $in: ['', null] },
    // La ventana del job. Entre los 30 y los 35 días (la poda) un hilo ya no se refresca: sus
    // votos, su cierre y su borrado quedan congelados, y mostrarlo como pendiente sería mentir.
    createdAt: { $gte: new Date(now - OPPS_WINDOW_DAYS * 86_400_000) },
  }
  if (q.sub && omit !== 'sub') filter.sub = q.sub
  if (q.family && omit !== 'family') filter.family = q.family
  if (omit !== 'state') {
    if (q.state === 'open') {
      // Pendiente = todavía se puede contestar y nadie enlazó el sitio.
      filter.state = 'open'
      filter.locked = false
      filter.removed = false
      filter.alreadyLinked = { $ne: true }
    } else if (q.state !== 'all') {
      filter.state = q.state
    }
  }
  if (q.q) {
    const re = { $regex: escapeRegex(q.q), $options: 'i' }
    filter.$or = [{ title: re }, { excerpt: re }, { pageTitle: re }, { path: re }]
  }
  return filter
}

export function oppsSortOf(sort: OppsSort): Record<string, 1 | -1> {
  if (sort === 'new') return { createdAt: -1, postId: 1 }
  if (sort === 'comments') return { numComments: -1, createdAt: -1, postId: 1 }
  if (sort === 'score') return { score: -1, createdAt: -1, postId: 1 }
  return { rank: -1, createdAt: -1, postId: 1 }
}

/** "hace 3 h", "hace 2 días". `now` inyectado para el test. */
export function oppAgeLabel(createdAt: string | Date, now: number = Date.now()): string {
  const ms = Math.max(0, now - new Date(createdAt).getTime())
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return 'hace menos de 1 h'
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}

/** Un card de la cola, tal como lo devuelve la API. */
export interface OppItem {
  postId: string
  sub: string
  title: string
  excerpt: string
  permalink: string
  linkUrl: string
  flair: string
  lang: 'es' | 'en'
  createdAt: string
  score: number
  numComments: number
  locked: boolean
  removed: boolean
  path: string
  pageTitle: string
  family: string
  confidence: number
  reason: string
  angle: string
  alreadyLinked: boolean | null
  linkCheckedAt: string | null
  state: OppState
  stateAt: string | null
  answerUrl: string
  answerVisible: boolean | null
  answerCheckedAt: string | null
  alsoIn: Array<{ sub: string; permalink: string }>
}

/** Los campos que la API proyecta: el veredicto y el modelo del juez no salen. */
export const OPP_PROJECTION: Record<keyof OppItem | '_id', 0 | 1> = {
  _id: 0,
  postId: 1,
  sub: 1,
  title: 1,
  excerpt: 1,
  permalink: 1,
  linkUrl: 1,
  flair: 1,
  lang: 1,
  createdAt: 1,
  score: 1,
  numComments: 1,
  locked: 1,
  removed: 1,
  path: 1,
  pageTitle: 1,
  family: 1,
  confidence: 1,
  reason: 1,
  angle: 1,
  alreadyLinked: 1,
  linkCheckedAt: 1,
  state: 1,
  stateAt: 1,
  answerUrl: 1,
  answerVisible: 1,
  answerCheckedAt: 1,
  alsoIn: 1,
}

/**
 * El enlace a copiar en la respuesta. A un hilo en inglés le va la versión en inglés de la página
 * cuando existe como página propia; si no, la española (el sitio ya no cambia de idioma solo).
 */
export function oppSuggestedUrl(item: Pick<OppItem, 'path' | 'lang'>): string {
  const localized = item.lang === 'en' && isLocalizedRoute(item.path)
  return `${OPPS_SITE_ORIGIN}${localized ? `/en${item.path === '/' ? '' : item.path}` : item.path}`
}

/** El enlace a UN comentario de Reddit (no al hilo, no un enlace corto `/s/`). */
export function isRedditCommentUrl(url: string): boolean {
  // `…/comments/<hilo>/<slug o "comment">/<comentario>/`: el segmento del medio es cualquiera.
  const COMMENT =
    /^https:\/\/(?:www\.|old\.|new\.)?reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]+\/[^/]+\/[a-z0-9]{4,12}\/?(?:[?#].*)?$/i
  return COMMENT.test(url.trim())
}

export function oppSubNoteOf(sub: string): string | null {
  return OPPS_SUB_NOTES[sub.toLowerCase()] ?? null
}
