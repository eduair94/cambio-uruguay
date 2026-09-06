import { defineEventHandler, getQuery } from 'h3'
import {
  getRentalAvailabilityPublic,
  rentalAvailabilityRequest,
} from '../../../utils/rentalAvailabilityService'

export default defineEventHandler(event =>
  rentalAvailabilityRequest(event, () => getRentalAvailabilityPublic(getQuery(event)))
)
