// Apply the backend's refreshed TEAs to this app's lender catalogue. Exactly getMergedLenders()'s
// body from the deleted loanRatesStore.ts, now reading the proxied rates (GET {apiBaseServer}/loan-rates)
// instead of useStorage. Zero business logic beyond the overlay — the scrape/Gemini refresh chain
// lives in the backend now (classes/loans/*).
import type { Lender } from '../../utils/loans'
import { LENDERS } from '../../utils/loans'

export interface LoanRatesResponse {
  rates: Record<string, { teaPct: number; scrapedAt: string }>
  history: Record<
    string,
    Array<{ date: string; teaPct: number; source?: string; method: 'regex' | 'gemini' }>
  >
  updatedAt: string
}

export interface MergedLender extends Lender {
  scrapedAt?: string
}

export function mergeLenders(rates: LoanRatesResponse['rates'] | undefined): MergedLender[] {
  return LENDERS.map(l => {
    const stored = rates?.[l.id]
    return stored ? { ...l, teaPct: stored.teaPct, scrapedAt: stored.scrapedAt } : { ...l }
  })
}
