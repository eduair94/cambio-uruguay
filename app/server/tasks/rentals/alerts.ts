import { runRentalAlerts } from '../../utils/rentalAlertRunner'

export default defineTask({
  meta: {
    name: 'rentals:alerts',
    description: 'Notify opted-in rental searches and rental opportunities',
  },
  async run() {
    return { result: await runRentalAlerts() }
  },
})
