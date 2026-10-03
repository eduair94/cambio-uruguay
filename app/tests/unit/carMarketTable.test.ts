import { describe, expect, it } from 'vitest'
import {
  CAR_MARKET_DEFAULT_SORT,
  carMarketPct,
  carMarketScale,
  displayTrim,
  emptyCarMarketFilters,
  filterCarMarketRows,
  parseCarMarketSort,
  sortCarMarketRows,
} from '../../utils/carMarketTable'
import type { PublicCarMarketRow } from '../../utils/carsPublic'

const row = (patch: Partial<PublicCarMarketRow>): PublicCarMarketRow => ({
  year: 2020,
  trim: 'Cross',
  engine: '1.6',
  transmission: 'manual',
  n: 5,
  sellers: 5,
  p25: 15000,
  median: 16000,
  p75: 17000,
  kmMedian: 90000,
  ...patch,
})

const rows = [
  row({ year: 2025, trim: 'exteme plus', median: 19900, kmMedian: 22000, n: 9 }),
  row({ year: 2022, trim: 'Trendline', median: 14990, kmMedian: 81000, n: 15 }),
  row({ year: 2022, trim: 'Cross', median: 16800, kmMedian: 109000, n: 11 }),
  row({
    year: 2018,
    trim: 'gp ce',
    median: 12500,
    kmMedian: 131000,
    n: 10,
    transmission: 'automatica',
  }),
]

describe('displayTrim', () => {
  it('capitaliza sólo lo que llega todo en minúsculas, y las siglas cortas van en mayúsculas', () => {
    expect(displayTrim('exteme plus')).toBe('Exteme Plus')
    expect(displayTrim('gp ce')).toBe('GP CE')
    expect(displayTrim('Trendline')).toBe('Trendline')
    expect(displayTrim('SRV')).toBe('SRV')
    expect(displayTrim(null)).toBe('Sin versión')
  })
})

describe('sortCarMarketRows', () => {
  it('por defecto, lo más nuevo primero y a igual año lo más barato', () => {
    const sorted = sortCarMarketRows(rows, CAR_MARKET_DEFAULT_SORT)
    expect(sorted.map(r => `${r.year}-${r.trim}`)).toEqual([
      '2025-exteme plus',
      '2022-Trendline',
      '2022-Cross',
      '2018-gp ce',
    ])
  })

  it('ordena por mediana, km, avisos y versión', () => {
    expect(sortCarMarketRows(rows, { key: 'median', dir: 'asc' })[0]!.median).toBe(12500)
    expect(sortCarMarketRows(rows, { key: 'km', dir: 'asc' })[0]!.kmMedian).toBe(22000)
    expect(sortCarMarketRows(rows, { key: 'n', dir: 'desc' })[0]!.n).toBe(15)
    expect(sortCarMarketRows(rows, { key: 'version', dir: 'asc' }).map(r => r.trim)).toEqual([
      'Cross',
      'exteme plus',
      'gp ce',
      'Trendline',
    ])
  })

  it('no muta la entrada', () => {
    const copy = [...rows]
    sortCarMarketRows(rows, { key: 'median', dir: 'asc' })
    expect(rows).toEqual(copy)
  })
})

describe('filterCarMarketRows', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterCarMarketRows(rows, emptyCarMarketFilters())).toHaveLength(4)
  })

  it('combina versión, años, caja y presupuesto', () => {
    const base = emptyCarMarketFilters()
    expect(filterCarMarketRows(rows, { ...base, trims: ['cross', 'gp ce'] })).toHaveLength(2)
    expect(filterCarMarketRows(rows, { ...base, yearMin: 2020, yearMax: 2022 })).toHaveLength(2)
    expect(filterCarMarketRows(rows, { ...base, transmission: 'automatica' })).toHaveLength(1)
    expect(filterCarMarketRows(rows, { ...base, priceMax: 16000 }).map(r => r.median)).toEqual([
      14990, 12500,
    ])
  })
})

describe('parseCarMarketSort', () => {
  it('vuelve al orden por defecto ante un valor inválido', () => {
    expect(parseCarMarketSort('median:asc')).toEqual({ key: 'median', dir: 'asc' })
    expect(parseCarMarketSort('precio:arriba')).toEqual(CAR_MARKET_DEFAULT_SORT)
  })
})

describe('escala de la banda', () => {
  it('va de la P25 más baja a la P75 más alta y recorta al rango', () => {
    const scale = carMarketScale([row({ p25: 10000, p75: 12000 }), row({ p25: 14000, p75: 20000 })])
    expect(scale).toEqual({ min: 10000, max: 20000 })
    expect(carMarketPct(15000, scale!)).toBe(50)
    expect(carMarketPct(5000, scale!)).toBe(0)
  })

  it('sin dispersión no hay escala', () => {
    expect(carMarketScale([row({ p25: 10000, p75: 10000 })])).toBeNull()
    expect(carMarketScale([])).toBeNull()
  })
})
