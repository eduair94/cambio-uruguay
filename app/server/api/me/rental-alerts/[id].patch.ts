import { requireRentalAlertUser } from '../../../utils/rentalAlertAuth'
import {
  updateRentalAlertSubscription,
  rentalAlertRequest,
} from '../../../utils/rentalAlertSubscriptions'

export default defineEventHandler(event =>
  rentalAlertRequest(event, async () => {
    const user = await requireRentalAlertUser(event)
    return updateRentalAlertSubscription(user, getRouterParam(event, 'id'), await readBody(event))
  })
)
