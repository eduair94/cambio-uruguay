// Display logic for the regional board.
//
// Same discipline as blueDollar's tests: what matters is not the happy path but
// the two ways a page like this misleads — printing a confident number when a
// leg is missing, and printing a rate at a precision that hides or invents
// information.
import { describe, expect, it } from 'vitest'

import {
  REGIONAL_COUNTRIES,
  REGIONAL_KIND_LABELS,
  regionalAge,
  regionalCrossRate,
  regionalDollarQuotes,
  regionalGapTone,
  regionalIsStale,
  regionalPct,
  regionalRate,
  regionalRouteVerdict,
  regionalSeriesChangePct,
  regionalSeriesValues,
  regionalSourceName,
  regionalUnitsFor,
  type RegionalQuote,
  type RegionalSnapshot,
} from '../../utils/regional'

function quote(overrides: Partial<RegionalQuote> = {}): RegionalQuote {
  return {
    id: 'AR:blue:USDARS',
    country: 'AR',
    market: 'blue',
    label: 'Dólar blue',
    kind: 'parallel',
    base: 'USD',
    quote: 'ARS',
    buy: 1530,
    sell: 1550,
    avg: 1540,
    spreadPct: 1.3,
    updatedAt: '2026-08-21T18:00:00.000Z',
    source: 'ar_bluelytics',
    sourceUrl: 'https://example.test',
    ...overrides,
  }
}

const snapshot: RegionalSnapshot = {
  generatedAt: '2026-08-21T18:00:00.000Z',
  oldestQuoteAt: '2026-08-21T12:00:00.000Z',
  quotes: [
    quote(),
    quote({
      id: 'AR:oficial:USDARS',
      market: 'oficial',
      kind: 'official',
      label: 'Dólar oficial',
      avg: 1490,
    }),
    quote({
      id: 'AR:tarjeta:USDARS',
      market: 'tarjeta',
      kind: 'card',
      label: 'Dólar tarjeta',
      buy: null,
      sell: 1976,
      avg: 1976,
    }),
    quote({
      id: 'BR:ptax:USDBRL',
      country: 'BR',
      market: 'ptax',
      kind: 'official',
      quote: 'BRL',
      avg: 5.1622,
    }),
  ],
  board: [],
  gaps: [],
  cross: [{ base: 'ARS', quote: 'UYU', rate: 0.0269, via: ['AR:oficial:USDARS', 'UY:bcu:USDUYU'] }],
  routes: [],
  sources: [],
  rejected: [],
  catalogue: [
    {
      id: 'ar_bluelytics',
      name: 'Bluelytics',
      country: 'AR',
      url: 'https://bluelytics.com.ar',
      access: 'api',
      publisher: 'market-data',
      covers: '',
    },
  ],
}

describe('regionalRate', () => {
  it('scales the decimals to the size of the number', () => {
    // A guaraní per peso uruguayo is 149; a peso uruguayo per guaraní is 0,0067.
    expect(regionalRate(6009.15)).toBe('6.009,15')
    expect(regionalRate(149.67)).toBe('149,67')
    expect(regionalRate(5.1622)).toBe('5,16')
    expect(regionalRate(0.0269)).toBe('0,0269')
    expect(regionalRate(0.0067)).toBe('0,006700')
  })

  it('never prints a number it does not have', () => {
    expect(regionalRate(null)).toBe('—')
    expect(regionalRate(undefined)).toBe('—')
    expect(regionalRate(Number.NaN)).toBe('—')
  })
})

describe('regionalPct', () => {
  it('signs a change and leaves a magnitude unsigned', () => {
    expect(regionalPct(2.31)).toBe('+2,3 %')
    expect(regionalPct(-1.57)).toBe('−1,6 %')
    expect(regionalPct(15.07, false)).toBe('15,1 %')
    expect(regionalPct(0)).toBe('0,0 %')
  })

  it('returns a dash rather than a zero for a missing figure', () => {
    expect(regionalPct(null)).toBe('—')
  })
})

describe('regionalGapTone', () => {
  it('grades a gap by size, not by sign', () => {
    expect(regionalGapTone(2.3)).toBe('success')
    expect(regionalGapTone(-2.3)).toBe('success')
    expect(regionalGapTone(6.5)).toBe('warning')
    expect(regionalGapTone(120)).toBe('error')
    expect(regionalGapTone(null)).toBe('default')
  })
})

describe('freshness', () => {
  const now = new Date('2026-08-21T18:30:00.000Z')

  it('says how old the board is in the units a reader thinks in', () => {
    expect(regionalAge('2026-08-21T18:29:40.000Z', now)).toBe('hace instantes')
    expect(regionalAge('2026-08-21T18:10:00.000Z', now)).toBe('hace 20 min')
    expect(regionalAge('2026-08-21T13:30:00.000Z', now)).toBe('hace 5 h')
    expect(regionalAge('2026-08-19T18:30:00.000Z', now)).toBe('hace 2 días')
    expect(regionalAge(null, now)).toBe('sin datos')
  })

  it('calls the board stale after twelve refresh cycles, not after one', () => {
    expect(regionalIsStale('2026-08-21T18:00:00.000Z', now)).toBe(false)
    expect(regionalIsStale('2026-08-21T13:00:00.000Z', now)).toBe(true)
    expect(regionalIsStale(null, now)).toBe(true)
    expect(regionalIsStale('no es una fecha', now)).toBe(true)
  })
})

describe('snapshot readers', () => {
  it('orders a country dollar quotes from most authoritative to least', () => {
    expect(regionalDollarQuotes(snapshot, 'AR').map(entry => entry.market)).toEqual([
      'oficial',
      'blue',
      'tarjeta',
    ])
  })

  it('does not mix one country quotes into another', () => {
    expect(regionalDollarQuotes(snapshot, 'BR').map(entry => entry.market)).toEqual(['ptax'])
    expect(regionalDollarQuotes(snapshot, 'PY')).toEqual([])
  })

  it('finds a cross rate and returns null for one that was not derivable', () => {
    expect(regionalCrossRate(snapshot, 'ARS', 'UYU')?.rate).toBe(0.0269)
    expect(regionalCrossRate(snapshot, 'PYG', 'BOB')).toBeNull()
  })

  it('names the publisher of a source id and falls back to the id itself', () => {
    expect(regionalSourceName('ar_bluelytics', snapshot.catalogue)).toBe('Bluelytics')
    expect(regionalSourceName('desconocida', snapshot.catalogue)).toBe('desconocida')
    expect(regionalSourceName('ar_bluelytics', undefined)).toBe('ar_bluelytics')
  })

  it('has a plain-language explanation for every kind of price on the board', () => {
    for (const kind of [
      'official',
      'wholesale',
      'parallel',
      'financial',
      'card',
      'retail',
      'reference',
    ] as const) {
      expect(REGIONAL_KIND_LABELS[kind].explain.length).toBeGreaterThan(20)
    }
    expect(Object.keys(REGIONAL_COUNTRIES)).toHaveLength(6)
  })
})

describe('regionalRouteVerdict', () => {
  const comparison = {
    country: 'AR' as const,
    countryName: 'Argentina',
    currency: 'ARS',
    routes: [],
    best: 'dollars' as const,
    differencePct: 15.07,
    missing: [],
  }

  it('states the size of the difference, never a bare "conviene"', () => {
    expect(regionalRouteVerdict(comparison)).toContain('15,1 %')
    expect(regionalRouteVerdict(comparison)).toContain('Argentina')
  })

  it('says the routes tie when the difference is inside the noise', () => {
    expect(regionalRouteVerdict({ ...comparison, differencePct: 0.58 })).toContain('casi lo mismo')
  })

  it('refuses to pick a winner when a leg is missing', () => {
    expect(regionalRouteVerdict({ ...comparison, best: null, differencePct: null })).toContain(
      'Faltan datos'
    )
    expect(regionalRouteVerdict(null)).toContain('Faltan datos')
  })

  it('names the local route when buying here is cheaper', () => {
    expect(regionalRouteVerdict({ ...comparison, best: 'local' })).toContain('casa uruguaya')
  })
})

describe('regionalUnitsFor', () => {
  it('turns a cost per unit into what a given amount of pesos buys', () => {
    expect(
      regionalUnitsFor({ kind: 'local', label: '', costPerUnit: 0.03, legs: [], note: '' }, 3000)
    ).toBe(100_000)
  })

  it('returns null rather than dividing by zero or by nothing', () => {
    expect(
      regionalUnitsFor({ kind: 'local', label: '', costPerUnit: 0, legs: [], note: '' }, 3000)
    ).toBeNull()
    expect(regionalUnitsFor(null, 3000)).toBeNull()
  })
})

describe('series helpers', () => {
  const points = [
    {
      key: 'AR:blue:USDARS',
      country: 'AR' as const,
      market: 'blue',
      base: 'USD',
      quote: 'ARS',
      day: '2026-08-19',
      buy: 1540,
      sell: 1560,
      avg: 1550,
      source: 'x',
    },
    {
      key: 'AR:blue:USDARS',
      country: 'AR' as const,
      market: 'blue',
      base: 'USD',
      quote: 'ARS',
      day: '2026-08-20',
      buy: 1530,
      sell: 1550,
      avg: 1540,
      source: 'x',
    },
    {
      key: 'AR:oficial:USDARS',
      country: 'AR' as const,
      market: 'oficial',
      base: 'USD',
      quote: 'ARS',
      day: '2026-08-20',
      buy: 1465,
      sell: 1515,
      avg: 1490,
      source: 'x',
    },
  ]

  it('picks one series out of a mixed response', () => {
    expect(regionalSeriesValues(points, 'AR:blue:USDARS')).toEqual([1550, 1540])
    expect(regionalSeriesValues(points, 'BR:ptax:USDBRL')).toEqual([])
  })

  it('measures the change across a series and refuses a one-point one', () => {
    expect(regionalSeriesChangePct([1550, 1540])).toBeCloseTo(-0.645, 2)
    expect(regionalSeriesChangePct([1540])).toBeNull()
    expect(regionalSeriesChangePct([])).toBeNull()
  })
})
