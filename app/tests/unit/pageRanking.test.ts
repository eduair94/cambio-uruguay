import { describe, expect, it } from 'vitest'
import {
  PR_FOCUS_GROUPS,
  filterRankedPages,
  prChannelLabel,
  prFamilies,
  prIsStale,
  prLabel,
  prSeconds,
  prTrend,
  prWeekBars,
  sortRankedPages,
  type PageRankRow,
} from '../../utils/pageRanking'

const entrances = { total: 0, organic: 0, direct: 0, social: 0, ai: 0, other: 0 }

function row(over: Partial<PageRankRow>): PageRankRow {
  return {
    path: '/x',
    title: 'X | Cambio Uruguay',
    family: '/x',
    tier: 'otro',
    multiplier: 1,
    rank: 1,
    weeks: [1, 1, 1, 1],
    views: 4,
    base: 1,
    users: 2,
    engagementSeconds: 30,
    viewsAll: 4,
    uyShare: 1,
    entrances,
    engagedRate: 0.5,
    trend: null,
    value: 1,
    signals: [],
    ...over,
  }
}

const pages = [
  row({
    path: '/alquileres-uruguay',
    title: 'Alquileres en Uruguay',
    family: '/alquileres-uruguay',
    base: 167,
    views: 664,
    trend: -0.7,
    value: 33.4,
    engagementSeconds: 479,
    signals: ['cae'],
  }),
  row({
    path: '/guias/testamento',
    title: 'Cómo hacer un testamento',
    family: '/guias/*',
    base: 12,
    views: 26,
    trend: 1.2,
    value: 96,
    signals: ['crece'],
  }),
  row({
    path: '/guias/casarse',
    title: 'Casarse por civil',
    family: '/guias/*',
    base: 12,
    views: 27,
    trend: null,
    value: 96,
    signals: ['nueva', 'ia'],
  }),
  row({
    path: '/',
    title: 'Cambio Uruguay',
    family: '/',
    base: 300,
    views: 1276,
    trend: -0.4,
    value: 300,
    engagementSeconds: 96,
  }),
]

describe('filterRankedPages', () => {
  it('busca en ruta y título, sin acentos ni mayúsculas', () => {
    expect(filterRankedPages(pages, { q: 'COMO hacer' }).map(p => p.path)).toEqual([
      '/guias/testamento',
    ])
    expect(filterRankedPages(pages, { q: 'guias/' }).map(p => p.path)).toEqual([
      '/guias/testamento',
      '/guias/casarse',
    ])
  })

  it('filtra por familia y por señal, y combina', () => {
    expect(filterRankedPages(pages, { family: '/guias/*' })).toHaveLength(2)
    expect(filterRankedPages(pages, { signal: 'ia' }).map(p => p.path)).toEqual(['/guias/casarse'])
    expect(filterRankedPages(pages, { family: '/guias/*', signal: 'cae' })).toEqual([])
  })

  it('sin filtros devuelve todo', () => {
    expect(filterRankedPages(pages, {})).toHaveLength(4)
  })
})

describe('sortRankedPages', () => {
  it('por base, desempate por ruta, sin mutar la entrada', () => {
    const before = pages.map(p => p.path)
    expect(sortRankedPages(pages, 'base').map(p => p.path)).toEqual([
      '/',
      '/alquileres-uruguay',
      '/guias/casarse',
      '/guias/testamento',
    ])
    expect(pages.map(p => p.path)).toEqual(before)
  })

  it('por tendencia: la que más sube primero y sin tendencia al final', () => {
    expect(sortRankedPages(pages, 'trend').map(p => p.path)).toEqual([
      '/guias/testamento',
      '/',
      '/alquileres-uruguay',
      '/guias/casarse',
    ])
  })

  it('por valor, vistas y permanencia', () => {
    expect(sortRankedPages(pages, 'value')[0].path).toBe('/')
    expect(sortRankedPages(pages, 'views')[0].path).toBe('/')
    expect(sortRankedPages(pages, 'engagement')[0].path).toBe('/alquileres-uruguay')
  })
})

describe('formato', () => {
  it('prTrend', () => {
    expect(prTrend(null)).toBe('—')
    expect(prTrend(-0.7057)).toBe('−71 %')
    expect(prTrend(1.2)).toBe('+120 %')
    expect(prTrend(0)).toBe('+0 %')
  })

  it('prSeconds', () => {
    expect(prSeconds(45)).toBe('45 s')
    expect(prSeconds(479)).toBe('7 min 59 s')
    expect(prSeconds(3105)).toBe('51 min 45 s')
    expect(prSeconds(0)).toBe('0 s')
  })

  it('prWeekBars: alturas relativas a la semana más alta', () => {
    expect(prWeekBars([303, 210, 124, 27])).toEqual([1, 210 / 303, 124 / 303, 27 / 303])
    expect(prWeekBars([0, 0, 0, 0])).toEqual([0, 0, 0, 0])
  })

  it('prChannelLabel traduce los grupos de GA4 y deja pasar lo desconocido', () => {
    expect(prChannelLabel('Organic Search')).toBe('Búsqueda')
    expect(prChannelLabel('AI Assistant')).toBe('Asistentes de IA')
    expect(prChannelLabel('Algo nuevo')).toBe('Algo nuevo')
  })

  it('prLabel saca el sufijo del sitio y cae a la ruta', () => {
    expect(prLabel({ path: '/x', title: 'Guía | Cambio Uruguay' })).toBe('Guía')
    expect(prLabel({ path: '/', title: 'Cambio Uruguay' })).toBe('/')
  })

  it('prFamilies: familias únicas por vistas', () => {
    expect(prFamilies(pages)).toEqual(['/', '/alquileres-uruguay', '/guias/*'])
  })

  it('prIsStale a los dos días', () => {
    const now = new Date('2026-09-29T12:00:00Z')
    expect(prIsStale('2026-09-28T11:00:00Z', now)).toBe(false)
    expect(prIsStale('2026-09-27T11:00:00Z', now)).toBe(true)
  })

  it('los grupos de foco van en el orden de lectura', () => {
    expect(PR_FOCUS_GROUPS.map(g => g.kind)).toEqual([
      'sostienen',
      'caen',
      'suben',
      'rebotan',
      'ia',
      'picos',
    ])
  })
})
