// Durable store for scraped courier rates (filesystem-backed `couriers` mount, same pattern as the
// blog store). The scheduled task writes here; the API reads a merged view. The golden rule:
// **only overwrite a rate with a fresh successful scrape** — a failed/implausible scrape leaves the
// previous good value untouched, so the public page degrades to "stale but correct".
import type { Courier } from '../../utils/courierShipping'
import { COURIERS } from '../../utils/courierShipping'
import type { ScrapeResult } from './courierScraper'

const STORAGE = 'couriers'
const KEY = 'rates.json'

/** One stored rate plus when it was last confirmed. */
export interface StoredRate {
  perKgUsd: number
  scrapedAt: string
}

interface RatesDoc {
  rates: Record<string, StoredRate>
  updatedAt: string
}

/** A catalogue courier enriched with the freshest scraped rate + its timestamp. */
export interface MergedCourier extends Courier {
  /** ISO timestamp of the last successful scrape for this courier, if any. */
  scrapedAt?: string
}

async function load(): Promise<RatesDoc> {
  const doc = await useStorage(STORAGE).getItem<RatesDoc>(KEY)
  return doc ?? { rates: {}, updatedAt: '' }
}

/**
 * Merge a scrape run into the store. Successful, plausible results update their rate + timestamp;
 * everything else is left as-is. Returns how many rates were refreshed.
 */
export async function applyScrapeResults(results: ScrapeResult[]): Promise<number> {
  const doc = await load()
  const now = new Date().toISOString()
  let updated = 0
  for (const r of results) {
    if (r.ok && r.perKgUsd != null) {
      doc.rates[r.id] = { perKgUsd: r.perKgUsd, scrapedAt: now }
      updated++
    }
  }
  doc.updatedAt = now
  await useStorage(STORAGE).setItem(KEY, doc)
  return updated
}

/**
 * The catalogue with scraped rates layered on top: a stored `perKgUsd` overrides the seed value and
 * carries its `scrapedAt`. Couriers never scraped keep their seed rate and have no timestamp.
 */
export async function getMergedCouriers(): Promise<MergedCourier[]> {
  const { rates } = await load()
  return COURIERS.map(c => {
    const stored = rates[c.id]
    return stored ? { ...c, perKgUsd: stored.perKgUsd, scrapedAt: stored.scrapedAt } : { ...c }
  })
}

/** Most recent successful-scrape timestamp across all couriers (for the "actualizado" label). */
export async function getRatesUpdatedAt(): Promise<string | null> {
  const { rates } = await load()
  const stamps = Object.values(rates)
    .map(r => r.scrapedAt)
    .filter(Boolean)
    .sort()
  return stamps.length ? stamps[stamps.length - 1]! : null
}
