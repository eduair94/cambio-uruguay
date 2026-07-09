// Durable store for scraped lender TEAs (filesystem-backed `loans` mount, same pattern as the
// courier rates store). The scheduled task writes here; the API reads a merged view. Golden rule:
// **only overwrite a TEA with a fresh successful scrape** — a failed/implausible scrape leaves the
// previous good value untouched, so the public page degrades to "stale but correct". `history` keeps
// one entry per lender per UTC calendar day (a same-day re-run overwrites that day's entry).
import type { Lender } from '../../utils/loans'
import { LENDERS } from '../../utils/loans'
import type { LenderRateResult } from './loanRateRefresh'

const STORAGE = 'loans'
const KEY = 'rates.json'

export interface StoredRate {
  teaPct: number
  scrapedAt: string
}

export interface HistoryEntry {
  date: string
  teaPct: number
  source?: string
  method: 'regex' | 'gemini'
}

interface RatesDoc {
  rates: Record<string, StoredRate>
  history: Record<string, HistoryEntry[]>
  updatedAt: string
}

export interface MergedLender extends Lender {
  scrapedAt?: string
}

async function load(): Promise<RatesDoc> {
  const doc = await useStorage(STORAGE).getItem<Partial<RatesDoc>>(KEY)
  return {
    rates: doc?.rates ?? {},
    history: doc?.history ?? {},
    updatedAt: doc?.updatedAt ?? '',
  }
}

export async function applyLoanScrapeResults(results: LenderRateResult[]): Promise<number> {
  const doc = await load()
  const now = new Date()
  const iso = now.toISOString()
  const day = iso.slice(0, 10)
  let updated = 0
  for (const r of results) {
    if (r.ok && r.teaPct != null) {
      doc.rates[r.id] = { teaPct: r.teaPct, scrapedAt: iso }
      const priorHistory = (doc.history[r.id] ?? []).filter(h => h.date !== day)
      doc.history[r.id] = [
        ...priorHistory,
        { date: day, teaPct: r.teaPct, source: r.sourceUrl, method: r.method },
      ]
      updated++
    }
  }
  doc.updatedAt = iso
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
