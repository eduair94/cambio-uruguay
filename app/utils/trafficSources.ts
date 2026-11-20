// Tipos y utilidades de /origen-del-trafico: de dónde viene la gente que visita el sitio.
//
// El documento lo escribe `currency-site-analytics` (classes/site-analytics/trafficSources.ts) ya
// sin nada privado; acá se decide cómo se cuenta: el patrón de cada fuente (un pico de un día, algo
// que crece, algo constante) y la respuesta corta de arriba de la página.

export type SourceKind =
  'buscador' | 'ia' | 'social' | 'mensajes' | 'sitio' | 'propio' | 'directo' | 'sin-atribuir'

export interface TrafficLanding {
  path: string
  sessions: number
}

export interface TrafficSourceRow {
  id: string
  label: string
  kind: SourceKind
  sessions: number
  engagedSessions: number
  sessionsUy: number
  engagedSessionsUy: number
  history: number
  historyUy: number
  monthly: number[]
  activeDays: number | null
  peak: { day: string; sessions: number } | null
  landings: TrafficLanding[]
}

export interface TrafficKindRow {
  kind: SourceKind
  sessions: number
  engagedSessions: number
  sessionsUy: number
  engagedSessionsUy: number
  history: number
  historyUy: number
  monthly: number[]
  monthlyUy: number[]
}

export interface TrafficReferrerRow {
  url: string
  sourceId: string
  kind: SourceKind
  views: number
}

export interface TrafficSourcesSnapshot {
  key: string
  asOf: string
  range: { start: string; end: string; days: number }
  history: { start: string; end: string; months: number }
  months: string[]
  totals: {
    sessions: number
    engagedSessions: number
    sessionsUy: number
    engagedSessionsUy: number
    history: number
    historyUy: number
  }
  kinds: TrafficKindRow[]
  sources: TrafficSourceRow[]
  others: { count: number; history: number }
  referrers: TrafficReferrerRow[]
}

export const KIND_LABELS: Record<SourceKind, string> = {
  buscador: 'Buscadores',
  directo: 'Directo',
  ia: 'Asistentes de IA',
  social: 'Redes sociales',
  sitio: 'Otros sitios web',
  mensajes: 'Correo, chats y documentos',
  propio: 'Sitios y apps propios',
  'sin-atribuir': 'Sin atribuir',
}

export const KIND_HINTS: Record<SourceKind, string> = {
  buscador: 'Google, Bing, Yahoo, DuckDuckGo y parecidos.',
  directo:
    'Escribieron la dirección, usaron un favorito o vinieron de una app que no avisa de dónde. ' +
    'Con todos los países, acá cae también el tráfico automatizado.',
  ia: 'ChatGPT, Gemini, Perplexity, Copilot y Claude citaron una página y alguien hizo clic.',
  social: 'X (Twitter), Reddit, Facebook, Instagram, LinkedIn y YouTube.',
  sitio: 'Páginas de otros sitios con un enlace hacia acá: los backlinks que traen gente.',
  mensajes: 'Un enlace abierto desde Gmail, Outlook, un webmail, Teams o una planilla.',
  propio: 'Otros sitios y la app de Android del mismo autor.',
  'sin-atribuir':
    'Visitas que Google Analytics no pudo atribuir, herramientas de medición y etiquetas internas ' +
    'mal leídas como campaña.',
}

/**
 * Las cinco series del gráfico mes a mes, de abajo hacia arriba, con su color. Los colores son las
 * cinco primeras ranuras de la paleta categórica validada (claro y oscuro, daltonismo incluido), en
 * ese orden y sin saltear: cambiar el orden obliga a volver a validar los pares vecinos. Lo chico
 * (sitios, correo, propios, sin atribuir) va junto en "Otros" para no pasar de cinco colores.
 */
export const CHART_SERIES: { id: string; label: string; kinds: SourceKind[] }[] = [
  { id: 'buscador', label: 'Buscadores', kinds: ['buscador'] },
  { id: 'ia', label: 'Asistentes de IA', kinds: ['ia'] },
  { id: 'social', label: 'Redes sociales', kinds: ['social'] },
  {
    id: 'otros',
    label: 'Sitios, correo y otros',
    kinds: ['sitio', 'mensajes', 'propio', 'sin-atribuir'],
  },
  { id: 'directo', label: 'Directo', kinds: ['directo'] },
]

export interface ChartMonth {
  month: string
  total: number
  /** Una entrada por serie de {@link CHART_SERIES}, en el mismo orden. */
  values: number[]
}

export function monthlyChart(doc: TrafficSourcesSnapshot, uy: boolean): ChartMonth[] {
  return doc.months.map((month, i) => {
    const values = CHART_SERIES.map(series =>
      doc.kinds
        .filter(k => series.kinds.includes(k.kind))
        .reduce((sum, k) => sum + ((uy ? k.monthlyUy : k.monthly)[i] || 0), 0)
    )
    return { month, total: values.reduce((a, b) => a + b, 0), values }
  })
}

/** Los meses vacíos del principio (antes de que hubiera medición) no se dibujan. */
export function trimLeadingEmpty(months: ChartMonth[]): ChartMonth[] {
  const first = months.findIndex(m => m.total > 0)
  return first < 0 ? [] : months.slice(first)
}

export type SourcePattern = 'pico' | 'en-alza' | 'constante' | 'ocasional'

export const PATTERN_LABELS: Record<SourcePattern, string> = {
  pico: 'Un pico',
  'en-alza': 'En alza',
  constante: 'Constante',
  ocasional: 'De a poco',
}

/** Un día con al menos esta porción de todo lo que trajo la fuente en 24 meses es "un pico". */
export const PEAK_SHARE = 0.5
export const PEAK_MIN_SESSIONS = 20
/** Días con visitas, en 24 meses, para llamarla "constante". */
export const STEADY_DAYS = 60
/** Tres meses recientes con al menos esto, y el doble que los tres anteriores: "en alza". */
export const RISING_MIN_SESSIONS = 30

/**
 * Cómo trae gente una fuente. Un pico pesa más que todo: lo que se quiere saber de un enlace que
 * trajo novecientas visitas en un día es eso, aunque también aparezca algún otro día.
 * Los buscadores no tienen patrón (`null`): no se pide su diario.
 */
export function patternOf(row: TrafficSourceRow): SourcePattern | null {
  if (row.kind === 'buscador' || row.activeDays === null) return null
  if (
    row.peak &&
    row.peak.sessions >= PEAK_MIN_SESSIONS &&
    row.history > 0 &&
    row.peak.sessions / row.history >= PEAK_SHARE
  )
    return 'pico'
  const m = row.monthly
  const recent = (m[m.length - 1] || 0) + (m[m.length - 2] || 0) + (m[m.length - 3] || 0)
  const before = (m[m.length - 4] || 0) + (m[m.length - 5] || 0) + (m[m.length - 6] || 0)
  if (recent >= RISING_MIN_SESSIONS && recent >= before * 2) return 'en-alza'
  if (row.activeDays >= STEADY_DAYS) return 'constante'
  return 'ocasional'
}

/** Sesiones con interacción sobre sesiones; `null` sin sesiones. */
export function engagementRate(engaged: number, sessions: number): number | null {
  return sessions > 0 ? engaged / sessions : null
}

/** Tipos que son "alguien te mandó": todo menos buscadores, directo y lo que no se sabe. */
const REFERRAL_KINDS: SourceKind[] = ['social', 'sitio', 'ia', 'mensajes', 'propio']

export interface ShortAnswer {
  /** La porción de las visitas desde Uruguay (90 días) que llega desde un buscador. */
  searchShareUy: number
  /** El enlace que más gente trajo en un solo día, si alguno lo hizo de golpe. */
  spike: {
    label: string
    day: string
    sessions: number
    share: number
    landing: string | null
  } | null
  /** Las fuentes que mandan gente casi todos los días, de la que más trae a la que menos. */
  steady: { label: string; sessions: number; activeDays: number }[]
  /** La que más crece. */
  rising: { label: string; recent: number; before: number } | null
  /** Lo que trajeron los sitios web que enlazan, en 24 meses, y el que más. */
  websites: { total: number; top: { label: string; history: number } | null }
}

export function shortAnswer(doc: TrafficSourcesSnapshot): ShortAnswer {
  const kind = (k: SourceKind) => doc.kinds.find(r => r.kind === k)
  const referral = doc.sources.filter(s => REFERRAL_KINDS.includes(s.kind))

  const spikes = referral
    .filter(s => patternOf(s) === 'pico' && s.peak)
    .sort((a, b) => b.peak!.sessions - a.peak!.sessions)
  const top = spikes[0]
  const spike = top
    ? {
        label: top.label,
        day: top.peak!.day,
        sessions: top.peak!.sessions,
        share: top.peak!.sessions / top.history,
        landing: top.landings[0]?.path ?? null,
      }
    : null

  const steady = referral
    .filter(s => (s.activeDays || 0) >= STEADY_DAYS)
    .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label))
    .slice(0, 3)
    .map(s => ({ label: s.label, sessions: s.sessions, activeDays: s.activeDays || 0 }))

  const risers = referral
    .filter(s => patternOf(s) === 'en-alza')
    .map(s => {
      const m = s.monthly
      const recent = m.slice(-3).reduce((a, b) => a + b, 0)
      const before = m.slice(-6, -3).reduce((a, b) => a + b, 0)
      return { label: s.label, recent, before }
    })
    .sort((a, b) => b.recent - b.before - (a.recent - a.before))

  const sites = doc.sources.filter(s => s.kind === 'sitio')
  const searchUy = kind('buscador')?.sessionsUy || 0
  return {
    searchShareUy: doc.totals.sessionsUy > 0 ? searchUy / doc.totals.sessionsUy : 0,
    spike,
    steady,
    rising: risers[0] || null,
    websites: {
      total: kind('sitio')?.history || 0,
      top: sites[0] ? { label: sites[0].label, history: sites[0].history } : null,
    },
  }
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** `2026-08` → `ago 2026`; con `short`, `ago 26`. */
export function monthLabel(ym: string, short = false): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return `${MONTHS[m - 1]} ${short ? String(y).slice(2) : y}`
}

/** `2026-08-17` → `17/8/2026`. */
export function dayLabel(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return y && m && d ? `${d}/${m}/${y}` : ymd
}

/** Un dominio que se puede enlazar: tiene un punto y no es un alias interno (`google`, `teams`). */
export function linkableHost(id: string): boolean {
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(id)
}
