import { describe, expect, it } from 'vitest'
import { normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'
import {
  RENTAL_QUICK_FILTERS,
  rentalQuickFilters,
  rentalQuickPatch,
} from '../../utils/rentalQuickFilters'
import { rentalMessages } from '../../utils/rentalMessages'

// The filters a renter reaches for most, one tap away above the results. On the phone the panel is
// long, and "bajó de precio" or "nuevos esta semana" (2026-10-08) lived at its bottom.
describe('filter shortcuts of the rental directory', () => {
  it('offers only the shortcuts that are off: an applied one is already a removable chip', () => {
    expect(rentalQuickFilters(normalizeRentalQuery({}))).toEqual([...RENTAL_QUICK_FILTERS])
    expect(rentalQuickFilters(normalizeRentalQuery({ bajo: '1', pets: '1', dias: '3' }))).toEqual([
      'parking',
      'furnished',
      'owner',
    ])
    // Either furniture choice hides the shortcut.
    expect(rentalQuickFilters(normalizeRentalQuery({ sinMuebles: '1' }))).not.toContain('furnished')
  })

  it('turns each shortcut into the same URL the panel writes', () => {
    const apply = (key: (typeof RENTAL_QUICK_FILTERS)[number]) =>
      rentalQueryToParams({ ...normalizeRentalQuery({}), ...rentalQuickPatch(key) })
    expect(apply('priceDropped')).toEqual({ bajo: '1' })
    expect(apply('sinceDays')).toEqual({ dias: '7' })
    expect(apply('pets')).toEqual({ pets: '1' })
    expect(apply('parking')).toEqual({ parking: '1' })
    expect(apply('furnished')).toEqual({ furnished: '1' })
    expect(apply('owner')).toEqual({ dueno: '1' })
  })

  it('has a label for every shortcut in every language', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(rentalMessages[locale]).toHaveProperty('quickFilters')
      for (const key of RENTAL_QUICK_FILTERS)
        expect(rentalMessages[locale]).toHaveProperty(`quick-${key}`)
    }
  })
})
