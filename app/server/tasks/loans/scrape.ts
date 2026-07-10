// Nitro scheduled task: refresh lender TEAs once a day. Registered in nuxt.config under
// nitro.scheduledTasks. Failed/implausible scrapes keep the previous good value (see the store).
import { refreshAllLenderRates } from '../../utils/loanRateRefresh'
import { applyLoanScrapeResults } from '../../utils/loanRatesStore'

export default defineTask({
  meta: { name: 'loans:scrape', description: 'Scrape and refresh lender TEA rates' },
  async run() {
    const results = await refreshAllLenderRates()
    const updated = await applyLoanScrapeResults(results)
    return { result: { updated, results } }
  },
})
