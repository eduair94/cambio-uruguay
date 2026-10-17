import { describe, expect, it } from 'vitest'
import { RentalAlertModel } from '../../server/models/RentalAlert'
import { RENTAL_ALERT_KINDS } from '../../utils/rentalAlerts'

describe('saved-search alert model', () => {
  it('stores an empty filters object instead of dropping it', () => {
    // Mongoose `minimize` removed `{}` and left unfiltered alerts with no `filters` field at all.
    expect(RentalAlertModel.schema.get('minimize')).toBe(false)
  })
  it('accepts every saved-search kind', () => {
    expect(RentalAlertModel.schema.path('kind').options.enum).toEqual(RENTAL_ALERT_KINDS)
  })
})
