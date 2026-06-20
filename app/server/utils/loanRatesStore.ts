// Durable store for scraped lender TEAs (filesystem-backed `loans` mount, same pattern as the
// courier rates store). The scheduled task writes here; the API reads a merged view. Golden rule:
// **only overwrite a TEA with a fresh successful scrape** — a failed/implausible scrape leaves the
// previous good value untouched, so the public page degrades to "stale but correct".
import type { Lender } from '../../utils/loans'
import { LENDERS } from '../../utils/loans'
import type { ScrapeResult } from './loanScraper'

const STORAGE = 'loans'
const KEY = 'rates.json'

export interface StoredRate {
  teaPct: number
  scrapedAt: string
}

interface RatesDoc {
  rates: Record<string, StoredRate>
  updatedAt: string
}

export interface MergedLender extends Lender {
  scrapedAt?: string
}

async function load(): Promise<RatesDoc> {
  const doc = await useStorage(STORAGE).getItem<RatesDoc>(KEY)
  return doc ?? { rates: {}, updatedAt: '' }
}

export async function applyLoanScrapeResults(results: ScrapeResult[]): Promise<number> {
  const doc = await load()
  const now = new Date().toISOString()
  let updated = 0
  for (const r of results) {
    if (r.ok && r.teaPct != null) {
      doc.rates[r.id] = { teaPct: r.teaPct, scrapedAt: now }
      updated++
    }
  }
  doc.updatedAt = now
  await useStorage(STORAGE).setItem(KEY, doc)
  return updated
}

export async function getMergedLenders(): Promise<MergedLender[]> {
  const { rates } = await load()
  return LENDERS.map(l => {
    const stored = rates[l.id]
    return stored ? { ...l, teaPct: stored.teaPct, scrapedAt: stored.scrapedAt } : { ...l }
  })
}

export async function getLoanRatesUpdatedAt(): Promise<string | null> {
  const { rates } = await load()
  const stamps = Object.values(rates)
    .map(r => r.scrapedAt)
    .filter(Boolean)
    .sort()
  return stamps.length ? stamps[stamps.length - 1]! : null
}
