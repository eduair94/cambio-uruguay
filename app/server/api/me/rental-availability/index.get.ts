import { defineEventHandler, getQuery } from 'h3'
import { requireRentalAvailabilityUser } from '../../../utils/rentalAvailabilityAuth'
import {
  getRentalAvailabilityOwnState,
  rentalAvailabilityRequest,
} from '../../../utils/rentalAvailabilityService'

export default defineEventHandler(event =>
  rentalAvailabilityRequest(event, async () => {
    const user = await requireRentalAvailabilityUser(event)
    return getRentalAvailabilityOwnState(user, getQuery(event))
  })
)
