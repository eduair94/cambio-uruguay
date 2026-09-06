import { describe, expect, it } from 'vitest'
import { normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'
import {
  normalizeRentalAlertFilters,
  rentalAlertSearchUrl,
  rentalAlertSignature,
} from '../../utils/rentalAlerts'
import { emptyRentalSaved, saveRentalSearch, parseRentalSaved } from '../../utils/rentalSaved'

describe('community visibility is an optional, durable search criterion', () => {
  it('defaults to showing every listing, safely normalizes invalid values, and round-trips URLs', () => {
    for (const value of [undefined, null, 'confirmed', 'false', { $ne: 0 }]) {
      const query = normalizeRentalQuery({ availability: value })
      expect(query.availability).toBe('all')
      expect(rentalQueryToParams(query)).not.toHaveProperty('availability')
    }
    for (const value of ['hide_any', 'hide_multiple']) {
      const query = normalizeRentalQuery({ availability: value, department: 'Montevideo' })
      expect(normalizeRentalQuery(rentalQueryToParams(query)).availability).toBe(value)
    }
  })
  it.each(['rental-search', 'rental-opportunity'] as const)(
    'retains the live visibility rule for %s alerts',
    kind => {
      const filters = normalizeRentalAlertFilters(kind, { availability: 'hide_multiple' })
      expect(filters).toEqual({ availability: 'hide_multiple' })
      expect(rentalAlertSearchUrl({ kind, filters })).toContain('availability=hide_multiple')
      expect(rentalAlertSignature(kind, filters)).not.toBe(rentalAlertSignature(kind, {}))
      expect(() => normalizeRentalAlertFilters(kind, { availability: 'confirmed_only' })).toThrow()
    }
  )
  it('persists the criterion in device-saved searches without freezing report counts', () => {
    const state = saveRentalSearch(
      emptyRentalSaved(),
      'Mi búsqueda',
      normalizeRentalQuery({ availability: 'hide_any' })
    )
    const restored = parseRentalSaved(JSON.stringify(state))
    expect(restored.searches[0].params).toEqual({ availability: 'hide_any' })
  })
})
