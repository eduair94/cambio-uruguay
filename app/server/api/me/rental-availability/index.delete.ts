import { defineEventHandler, getQuery } from 'h3'
import { requireRentalAvailabilityUser } from '../../../utils/rentalAvailabilityAuth'
import {
  withdrawRentalAvailability,
  rentalAvailabilityRequest,
} from '../../../utils/rentalAvailabilityService'

export default defineEventHandler(event =>
  rentalAvailabilityRequest(event, async () => {
    const user = await requireRentalAvailabilityUser(event)
    return withdrawRentalAvailability(user, getQuery(event))
  })
)
