import { requireRentalAlertUser } from '../../../utils/rentalAlertAuth'
import {
  createRentalAlertSubscription,
  rentalAlertRequest,
} from '../../../utils/rentalAlertSubscriptions'

export default defineEventHandler(event =>
  rentalAlertRequest(event, async () => {
    const user = await requireRentalAlertUser(event)
    return createRentalAlertSubscription(user, await readBody(event))
  })
)
