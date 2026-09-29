// Tipos y utilidades del ranking por página que escribe `currency-site-analytics`
// (classes/site-analytics/pageRanking.ts). SOLO la página privada /estadisticas-por-pagina.
//
// El criterio (base semanal, señales, "dónde enfocarse") vive en el backend y está testeado ahí;
// acá sólo se filtra, se ordena y se formatea lo que ya viene calculado.
import { stripSiteSuffix } from './siteAnalytics'

export type PageSignal = 'pico' | 'cae' | 'crece' | 'nueva' | 'rebota' | 'afuera' | 'ia'

export interface Entrances {
  total: number
  organic: number
  direct: number
  social: number
  ai: number
  other: number
}

export interface PageRankRow {
  path: string
  title: string
  family: string
  tier: string
  multiplier: number
  rank: number
  /** Vistas desde Uruguay por semana, la más vieja primero. */
  weeks: number[]
  views: number
  /** Mediana de las semanas desde la primera con vistas. */
  base: number
  users: number
  engagementSeconds: number
  viewsAll: number
  uyShare: number
  entrances: Entrances
  engagedRate: number
  trend: number | null
  value: number
  signals: PageSignal[]
}

export interface FamilyRankRow {
  family: string
  tier: string
  multiplier: number
  urls: number
  views: number
  base: number
  weeks: number[]
  engagementSeconds: number
  entrances: Entrances
  trend: number | null
  value: number
  share: number
}

export type FocusKind = 'sostienen' | 'caen' | 'suben' | 'rebotan' | 'ia' | 'picos'

export interface FocusItem {
  kind: FocusKind
  path: string
  title: string
  headline: string
  detail: string
}

export interface PageRankingTotals {
  viewsUy: number
  viewsAll: number
  uyShare: number
  sessionsUy: number
  usersUy: number
  weeklyUy: number[]
  channels: { label: string; sessions: number; share: number }[]
}

export interface PageRankingSnapshot {
  key: string
  asOf: string
  timezone: string
  range: { start: string; end: string; days: number }
  weeks: { start: string; end: string }[]
  totals: PageRankingTotals
  pageCount: number
  truncated: boolean
  pages: PageRankRow[]
  families: FamilyRankRow[]
  focus: FocusItem[]
}

export const PR_SIGNAL_LABELS: Record<PageSignal, string> = {
  cae: 'Cae',
  crece: 'Crece',
  nueva: 'Nueva',
  pico: 'Pico',
  rebota: 'Se van rápido',
  afuera: 'Mucho de afuera',
  ia: 'Llega desde IA',
}

export const PR_SIGNAL_COLORS: Record<PageSignal, string> = {
  cae: 'error',
  crece: 'success',
  nueva: 'info',
  pico: 'warning',
  rebota: 'deep-orange',
  afuera: 'grey',
  ia: 'purple',
}

export const PR_SIGNAL_HELP: Record<PageSignal, string> = {
  cae: 'Por semana, las últimas dos tienen 40 % menos vistas que las anteriores (sin pico de por medio).',
  crece: 'Por semana, las últimas dos tienen 50 % más vistas que las anteriores.',
  nueva: 'Sin vistas en las primeras dos semanas de la ventana.',
  pico: 'Una semana triplica a la segunda mejor y después se apaga: fue un empujón. La base se calcula sin esa semana.',
  rebota: 'Contenido con 50+ vistas y menos de 20 s de permanencia por usuario.',
  afuera: 'Menos de la mitad de sus vistas son desde Uruguay.',
  ia: 'Cinco o más entradas desde asistentes de IA (ChatGPT, Gemini, Perplexity…).',
}

export const PR_FOCUS_GROUPS: { kind: FocusKind; title: string; why: string }[] = [
  {
    kind: 'sostienen',
    title: 'Sostienen el sitio',
    why: 'Las de más valor (base semanal × tramo). No se pueden romper ni poner lentas.',
  },
  {
    kind: 'caen',
    title: 'Se están cayendo',
    why: 'Ordenadas por vistas perdidas × tramo: perder poco de una guía pesa más que mucho de un directorio.',
  },
  {
    kind: 'suben',
    title: 'Suben o son nuevas',
    why: 'Lo que conviene empujar con enlaces internos y ampliar.',
  },
  {
    kind: 'rebotan',
    title: 'Se van rápido',
    why: 'Llegan y no encuentran la respuesta arriba de todo.',
  },
  { kind: 'ia', title: 'Llegan desde asistentes de IA', why: 'Un canal nuevo que ya trae gente.' },
  {
    kind: 'picos',
    title: 'Picos (no son base)',
    why: 'Una semana sola infla la suma de 28 días. Para decidir, mirar la base.',
  },
]

const CHANNEL_LABELS: Record<string, string> = {
  'Organic Search': 'Búsqueda',
  Direct: 'Directo',
  'Organic Social': 'Redes',
  'AI Assistant': 'Asistentes de IA',
  Referral: 'Otros sitios',
  Unassigned: 'Sin asignar',
  'Cross-network': 'Campañas',
  'Paid Search': 'Búsqueda paga',
  'Paid Social': 'Redes pagas',
  Email: 'Correo',
  '(not set)': 'Sin dato',
}

export const prChannelLabel = (label: string) => CHANNEL_LABELS[label] || label

export type PrSortKey = 'base' | 'views' | 'trend' | 'value' | 'engagement'

export interface PrFilter {
  q?: string
  family?: string | null
  signal?: PageSignal | null
}

const fold = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

export function filterRankedPages(pages: PageRankRow[], f: PrFilter): PageRankRow[] {
  const q = fold(f.q || '').trim()
  return pages.filter(
    p =>
      (!q || fold(p.path).includes(q) || fold(p.title).includes(q)) &&
      (!f.family || p.family === f.family) &&
      (!f.signal || p.signals.includes(f.signal))
  )
}

const SORT_VALUE: Record<PrSortKey, (p: PageRankRow) => number | null> = {
  base: p => p.base,
  views: p => p.views,
  trend: p => p.trend,
  value: p => p.value,
  engagement: p => p.engagementSeconds,
}

/** Mayor primero; lo que no tiene valor (tendencia `null`) al final; desempate por ruta. */
export function sortRankedPages(pages: PageRankRow[], key: PrSortKey): PageRankRow[] {
  const get = SORT_VALUE[key]
  return [...pages].sort((a, b) => {
    const va = get(a)
    const vb = get(b)
    if (va === null && vb !== null) return 1
    if (vb === null && va !== null) return -1
    return (vb ?? 0) - (va ?? 0) || a.path.localeCompare(b.path)
  })
}

const nf = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 })
export const prNumber = (n: number) => nf.format(n || 0)

export const prPercent = (x: number) => `${Math.round((x || 0) * 100)} %`

export function prTrend(t: number | null): string {
  if (t === null || !Number.isFinite(t)) return '—'
  return `${t >= 0 ? '+' : '−'}${Math.round(Math.abs(t) * 100)} %`
}

export function prSeconds(s: number): string {
  const total = Math.max(0, Math.round(s || 0))
  if (total < 60) return `${total} s`
  return `${Math.floor(total / 60)} min ${total % 60} s`
}

/** Alturas 0..1 de las barritas semanales, relativas a la semana más alta de la fila. */
export function prWeekBars(weeks: number[]): number[] {
  const max = Math.max(0, ...weeks)
  return weeks.map(w => (max > 0 ? w / max : 0))
}

export const prLabel = (row: { path: string; title: string }) =>
  stripSiteSuffix(row.title) || row.path

/** Familias presentes, de la que más vistas suma a la que menos. Para el selector. */
export function prFamilies(pages: PageRankRow[]): string[] {
  const views = new Map<string, number>()
  for (const p of pages) views.set(p.family, (views.get(p.family) || 0) + p.views)
  return [...views.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([f]) => f)
}

/** El job corre una vez por día: más de dos días es que no corrió. */
export function prIsStale(asOf: string, now: Date = new Date()): boolean {
  const t = Date.parse(asOf)
  return !Number.isFinite(t) || now.getTime() - t > 2 * 24 * 60 * 60 * 1000
}
