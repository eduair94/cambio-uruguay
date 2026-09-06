import { requireRentalAlertUser } from '../../../utils/rentalAlertAuth'
import {
  deleteRentalAlertSubscription,
  rentalAlertRequest,
} from '../../../utils/rentalAlertSubscriptions'

export default defineEventHandler(event =>
  rentalAlertRequest(event, async () =>
    deleteRentalAlertSubscription(await requireRentalAlertUser(event), getRouterParam(event, 'id'))
  )
)
