import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RENTAL_PRICE_DROP_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  rentalQueryToParams,
} from '../../utils/rentals'
import { normalizeRentalAlertFilters, RentalAlertValidationError } from '../../utils/rentalAlerts'
import { rentalDirectoryCacheKey } from '../../server/utils/rentalDirectoryWarm'
import { rentalPublicPropertyProjection } from '../../server/utils/rentalDetail'
// App tests importing root modules is the established direction (storeConstantsParity.test.ts).
import { RENTAL_PRICE_DROP_DAYS as JOB_DROP_DAYS } from '../../../classes/rentals/priceDrops'

// "Bajó de precio" reads `priceDrop`, which the rentals harvest writes from `marketpricelogs`
// (classes/rentals/priceDrops.ts). Measured 2026-10-08: 2.469 adverts whose last change in 14 days
// was a drop. The directory filters by the drop's own date, so a property the last hourly run did
// not touch stops counting once its drop is older than the window.
describe('price-drop filter of the rental directory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T15:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('reads `bajo` from the URL and writes it back', () => {
    expect(normalizeRentalQuery({ bajo: '1' }).priceDropped).toBe(true)
    expect(normalizeRentalQuery({}).priceDropped).toBe(false)
    expect(rentalQueryToParams(normalizeRentalQuery({ bajo: '1' }))).toEqual({ bajo: '1' })
    expect(rentalDirectoryCacheKey({ bajo: '1' })).toBe('bajo=1')
  })

  it('filters by the date of the drop, inside the window the job uses', () => {
    // The job writes drops of this window and the page filters by it: one number, two copies.
    expect(RENTAL_PRICE_DROP_DAYS).toBe(JOB_DROP_DAYS)
    const { filter, nonLocation } = buildRentalFilter(normalizeRentalQuery({ bajo: '1' }), 10)
    expect(filter['priceDrop.at']).toEqual({ $gte: '2026-09-08' })
    expect(nonLocation['priceDrop.at']).toEqual({ $gte: '2026-09-08' })
    expect(buildRentalFilter(normalizeRentalQuery({}), 10).filter).not.toHaveProperty(
      'priceDrop.at'
    )
  })

  it('drops the drop when the advert that dropped is not among the ones shown', () => {
    // Hiding a portal must not leave a home "cheaper" because of the portal that was hidden.
    const stages = JSON.stringify(rentalPublicStages({}, 10))
    expect(stages).toContain('"$in":["$priceDrop.listingId","$offers.listingId"]')
  })

  it('publishes the drop with the property', () => {
    expect(rentalPublicPropertyProjection).toHaveProperty('priceDrop', 1)
  })

  it('refuses it in a saved-search alert, which sends new adverts and not price changes', () => {
    expect(() =>
      normalizeRentalAlertFilters('rental-search', { department: 'Montevideo', bajo: '1' })
    ).toThrow(RentalAlertValidationError)
  })
})
