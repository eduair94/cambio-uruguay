import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RENTAL_SINCE_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalQueryToParams,
  rentalSinceCutoff,
} from '../../utils/rentals'
import { normalizeRentalAlertFilters } from '../../utils/rentalAlerts'
import { rentalDirectoryCacheKey } from '../../server/utils/rentalDirectoryWarm'

// "Publicadas en los últimos N días" filtra por `freshAt`, lo mismo que ordena "más recientes": la
// fecha que publica el portal o, si no la da, el día que vimos el aviso por primera vez. Medido el
// 2026-10-08 sobre 60.895 propiedades vigentes: 4.688 de los últimos 3 días, 10.910 de la semana.
describe('recency filter of the rental directory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T15:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('reads `dias` from the URL and writes it back, ignoring what it cannot honour', () => {
    expect(normalizeRentalQuery({ dias: '7' }).sinceDays).toBe(7)
    expect(rentalQueryToParams(normalizeRentalQuery({ dias: '7' }))).toEqual({ dias: '7' })
    for (const bad of ['0', '-3', '91', 'semana', '2.5', ''])
      expect(normalizeRentalQuery({ dias: bad }).sinceDays).toBeNull()
    expect(rentalQueryToParams(normalizeRentalQuery({}))).toEqual({})
  })

  it('offers the windows people use, from yesterday to a month', () => {
    expect(RENTAL_SINCE_DAYS).toEqual([1, 3, 7, 14, 30])
  })

  it('counts whole days back from today, so "1" keeps yesterday and today', () => {
    expect(rentalSinceCutoff(1)).toBe('2026-10-07')
    expect(rentalSinceCutoff(7)).toBe('2026-10-01')
  })

  it('filters on the indexed freshAt, in the facets too', () => {
    const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(
      normalizeRentalQuery({ dias: '3', department: 'Montevideo', neighborhood: 'Centro' }),
      10
    )
    for (const part of [filter, nonLocation, withoutNeighborhood])
      expect(part.freshAt).toEqual({ $gte: '2026-10-05' })
    expect(buildRentalFilter(normalizeRentalQuery({}), 10).filter).not.toHaveProperty('freshAt')
  })

  it('gives each window its own entry in the directory cache', () => {
    expect(rentalDirectoryCacheKey({ dias: '7' })).toBe('dias=7')
    expect(rentalDirectoryCacheKey({ dias: '7' })).not.toBe(rentalDirectoryCacheKey({ dias: '3' }))
  })

  it('leaves it out of a saved-search alert, which only ever sends new adverts', () => {
    expect(
      normalizeRentalAlertFilters('rental-search', { department: 'Montevideo', dias: '3' })
    ).toEqual(normalizeRentalAlertFilters('rental-search', { department: 'Montevideo' }))
  })
})
