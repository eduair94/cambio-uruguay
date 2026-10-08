import { describe, expect, it } from 'vitest'
import {
  RENTAL_SORTS,
  normalizeRentalQuery,
  rentalMongoSort,
  rentalQueryToParams,
} from '../../utils/rentals'
import { rentalMessages } from '../../utils/rentalMessages'
import { normalizeRentalAlertFilters } from '../../utils/rentalAlerts'

// "Bajó de precio" (#75) filters the drops; this orders by them, largest first, so the list answers
// "what got cheapest" without a second step. Properties without a drop keep "más recientes" order.
describe('sorting the rental directory by price drop', () => {
  it('is an option of the sort menu, in every language', () => {
    expect(RENTAL_SORTS.map(option => option.value)).toContain('baja')
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(rentalMessages[locale]).toHaveProperty('baja')
      expect(rentalMessages[locale]).toHaveProperty('dropSortHint')
    }
  })

  it('reads and writes `sort=baja`', () => {
    expect(normalizeRentalQuery({ sort: 'baja' }).sort).toBe('baja')
    expect(rentalQueryToParams(normalizeRentalQuery({ sort: 'baja' }))).toEqual({ sort: 'baja' })
  })

  it('puts the largest drop first and the rest by freshness, with a stable tie-break', () => {
    expect(rentalMongoSort('baja')).toEqual({
      'priceDrop.pct': -1,
      freshAt: -1,
      _rentalInserted: -1,
      key: 1,
    })
  })

  it('is presentation for a saved-search alert', () => {
    expect(
      normalizeRentalAlertFilters('rental-search', { department: 'Montevideo', sort: 'baja' })
    ).toEqual(normalizeRentalAlertFilters('rental-search', { department: 'Montevideo' }))
  })
})
