import { defineEventHandler, readBody } from 'h3'
import { requireRentalAvailabilityUser } from '../../../utils/rentalAvailabilityAuth'
import {
  reportRentalAvailability,
  rentalAvailabilityRequest,
} from '../../../utils/rentalAvailabilityService'

export default defineEventHandler(event =>
  rentalAvailabilityRequest(event, async () => {
    const user = await requireRentalAvailabilityUser(event)
    return reportRentalAvailability(user, await readBody(event))
  })
)
