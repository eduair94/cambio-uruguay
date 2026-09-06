import { requireRentalAlertUser } from '../../../utils/rentalAlertAuth'
import {
  listRentalAlertSubscriptions,
  rentalAlertRequest,
} from '../../../utils/rentalAlertSubscriptions'

export default defineEventHandler(event =>
  rentalAlertRequest(event, async () =>
    listRentalAlertSubscriptions(await requireRentalAlertUser(event))
  )
)
