import { describe, expect, it } from 'vitest'
import {
  CHART_SERIES,
  dayLabel,
  engagementRate,
  KIND_LABELS,
  linkableHost,
  monthLabel,
  monthlyChart,
  patternOf,
  shortAnswer,
  trimLeadingEmpty,
  type SourceKind,
  type TrafficSourceRow,
  type TrafficSourcesSnapshot,
} from '../../utils/trafficSources'

const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']

function source(
  over: Partial<TrafficSourceRow> & { id: string; kind: SourceKind }
): TrafficSourceRow {
  return {
    label: over.id,
    sessions: 0,
    engagedSessions: 0,
    sessionsUy: 0,
    engagedSessionsUy: 0,
    history: 0,
    historyUy: 0,
    monthly: MONTHS.map(() => 0),
    activeDays: 0,
    peak: null,
    landings: [],
    ...over,
  }
}

const x = source({
  id: 'x.com',
  label: 'X (Twitter)',
  kind: 'social',
  sessions: 1021,
  history: 1022,
  monthly: [0, 0, 0, 1022, 0, 0],
  activeDays: 19,
  peak: { day: '2026-08-17', sessions: 927 },
  landings: [{ path: '/tarjetas-de-credito-uruguay', sessions: 960 }],
})
const chatgpt = source({
  id: 'chatgpt.com',
  label: 'ChatGPT',
  kind: 'ia',
  sessions: 1434,
  history: 1655,
  monthly: [20, 30, 40, 200, 400, 834],
  activeDays: 230,
  peak: { day: '2026-10-26', sessions: 85 },
})
const reddit = source({
  id: 'reddit.com',
  label: 'Reddit',
  kind: 'social',
  sessions: 688,
  history: 1644,
  monthly: [80, 90, 70, 300, 250, 140],
  activeDays: 361,
  peak: { day: '2026-08-17', sessions: 69 },
})
const github = source({
  id: 'github.com',
  label: 'GitHub',
  kind: 'sitio',
  sessions: 11,
  history: 51,
  monthly: [3, 2, 5, 4, 4, 3],
  activeDays: 43,
  peak: { day: '2026-07-24', sessions: 3 },
})
const google = source({
  id: 'google',
  label: 'Google',
  kind: 'buscador',
  sessions: 8552,
  sessionsUy: 7863,
  history: 21226,
  activeDays: null,
})

const kind = (k: SourceKind, sessionsUy: number, history: number, monthly: number[]) => ({
  kind: k,
  sessions: sessionsUy,
  engagedSessions: 0,
  sessionsUy,
  engagedSessionsUy: 0,
  history,
  historyUy: history,
  monthly,
  monthlyUy: monthly.map(v => Math.round(v / 2)),
})

const doc: TrafficSourcesSnapshot = {
  key: 'site',
  asOf: '2026-10-30T10:51:00Z',
  range: { start: '2026-08-01', end: '2026-10-29', days: 90 },
  history: { start: '2026-05-01', end: '2026-10-29', months: 6 },
  months: MONTHS,
  totals: {
    sessions: 0,
    engagedSessions: 0,
    sessionsUy: 10000,
    engagedSessionsUy: 0,
    history: 0,
    historyUy: 0,
  },
  kinds: [
    kind('buscador', 6000, 20000, [0, 100, 200, 300, 400, 500]),
    kind('directo', 2000, 5000, [0, 50, 50, 50, 50, 50]),
    kind('sitio', 20, 51, [0, 2, 5, 4, 4, 3]),
    kind('sin-atribuir', 700, 900, [0, 1, 1, 1, 1, 1]),
  ],
  sources: [google, chatgpt, reddit, x, github],
  others: { count: 3, history: 5 },
  referrers: [],
}

describe('patternOf', () => {
  it('un día con más de la mitad de todo es un pico', () => {
    expect(patternOf(x)).toBe('pico')
  })
  it('tres meses con el doble que los tres anteriores es en alza', () => {
    expect(patternOf(chatgpt)).toBe('en-alza')
  })
  it('muchos días con visitas sin crecer es constante', () => {
    expect(patternOf({ ...reddit, monthly: [100, 100, 100, 100, 100, 100] })).toBe('constante')
  })
  it('poco y espaciado es de a poco', () => {
    expect(patternOf(github)).toBe('ocasional')
  })
  it('un pico chico no es un pico', () => {
    expect(
      patternOf({
        ...github,
        history: 14,
        peak: { day: '2026-10-29', sessions: 11 },
        activeDays: 3,
      })
    ).toBe('ocasional')
  })
  it('los buscadores no tienen patrón', () => {
    expect(patternOf(google)).toBeNull()
  })
})

describe('shortAnswer', () => {
  const a = shortAnswer(doc)

  it('cuenta qué porción llega por buscador, sólo Uruguay', () => {
    expect(a.searchShareUy).toBeCloseTo(0.6)
  })

  it('encuentra el enlace que trajo gente de golpe, con el día y la página', () => {
    expect(a.spike).toEqual({
      label: 'X (Twitter)',
      day: '2026-08-17',
      sessions: 927,
      share: 927 / 1022,
      landing: '/tarjetas-de-credito-uruguay',
    })
  })

  it('lista los que traen gente casi todos los días, nunca un buscador', () => {
    expect(a.steady.map(s => s.label)).toEqual(['ChatGPT', 'Reddit'])
  })

  it('nombra al que más crece', () => {
    expect(a.rising).toEqual({ label: 'ChatGPT', recent: 1434, before: 90 })
  })

  it('suma lo que trajeron los sitios web y nombra al primero', () => {
    expect(a.websites).toEqual({ total: 51, top: { label: 'GitHub', history: 51 } })
  })

  it('sin picos ni sitios, lo dice como null', () => {
    const quiet = shortAnswer({ ...doc, sources: [google], kinds: [] })
    expect(quiet.spike).toBeNull()
    expect(quiet.rising).toBeNull()
    expect(quiet.websites).toEqual({ total: 0, top: null })
    expect(quiet.searchShareUy).toBe(0)
  })
})

describe('monthlyChart', () => {
  it('agrupa los tipos en cinco series y suma "otros"', () => {
    const months = monthlyChart(doc, false)
    expect(months).toHaveLength(6)
    const oct = months[5]
    expect(oct.values).toHaveLength(CHART_SERIES.length)
    expect(oct.values[CHART_SERIES.findIndex(s => s.id === 'buscador')]).toBe(500)
    expect(oct.values[CHART_SERIES.findIndex(s => s.id === 'otros')]).toBe(4)
    expect(oct.total).toBe(554)
  })

  it('usa la serie de Uruguay cuando se pide', () => {
    expect(monthlyChart(doc, true)[5].values[0]).toBe(250)
  })

  it('cada tipo cae en exactamente una serie', () => {
    const all = CHART_SERIES.flatMap(s => s.kinds).sort()
    expect(all).toEqual((Object.keys(KIND_LABELS) as SourceKind[]).sort())
  })

  it('saca los meses vacíos del principio', () => {
    expect(trimLeadingEmpty(monthlyChart(doc, false)).map(m => m.month)[0]).toBe('2026-06')
    expect(trimLeadingEmpty([])).toEqual([])
  })
})

describe('formato', () => {
  it('meses y días en español', () => {
    expect(monthLabel('2026-08')).toBe('ago 2026')
    expect(monthLabel('2026-08', true)).toBe('ago 26')
    expect(dayLabel('2026-08-17')).toBe('17/8/2026')
  })
  it('tasa de interacción', () => {
    expect(engagementRate(5, 10)).toBe(0.5)
    expect(engagementRate(0, 0)).toBeNull()
  })
  it('sólo enlaza dominios de verdad', () => {
    expect(linkableHost('github.com')).toBe(true)
    expect(linkableHost('webmail.montevideo.com.uy')).toBe(true)
    expect(linkableHost('google')).toBe(false)
    expect(linkableHost('teams')).toBe(false)
  })
})
