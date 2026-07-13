// Public loan-comparison data: catalogue + freshest TEAs, proxied from the backend (pm2
// currency-loans refreshes daily) and cached at the edge. Zero business logic, zero Gemini: this
// route only forwards, merges and falls back to the seed catalogue when the backend is unreachable
// — the page must never render an empty comparison table.
import { LENDERS } from '../../utils/loans'
import { mergeLenders, type LoanRatesResponse } from '../utils/loansMerge'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<LoanRatesResponse>(`${base}/loan-rates`, { timeout: 8000 })
      return { lenders: mergeLenders(res?.rates), updatedAt: res?.updatedAt || null }
    } catch {
      return { lenders: LENDERS, updatedAt: null }
    }
  },
  { maxAge: 60 * 30, name: 'prestamos-v2', getKey: () => 'all' }
)
