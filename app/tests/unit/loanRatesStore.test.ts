import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LenderRateResult } from '../../server/utils/loanRateRefresh'

class FakeStorage {
  private data = new Map<string, unknown>()
  async getItem<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null
  }
  async setItem(key: string, value: unknown): Promise<void> {
    this.data.set(key, value)
  }
}

const fakeStorage = new FakeStorage()
const useStorage = vi.fn(() => fakeStorage)
vi.stubGlobal('useStorage', useStorage)

beforeEach(async () => {
  // reset the backing map between tests
  ;(fakeStorage as unknown as { data: Map<string, unknown> }).data = new Map()
  vi.resetModules()
})

function result(over: Partial<LenderRateResult> & Pick<LenderRateResult, 'id'>): LenderRateResult {
  return { teaPct: null, ok: false, method: 'regex', ...over }
}

describe('applyLoanScrapeResults', () => {
  it('stores the latest TEA and a history entry for the day on a successful scrape', async () => {
    const { applyLoanScrapeResults } = await import('../../server/utils/loanRatesStore')
    const updated = await applyLoanScrapeResults([
      result({
        id: 'oca',
        teaPct: 39,
        ok: true,
        method: 'regex',
        sourceUrl: 'https://oca.uy/prestamos/',
      }),
    ])
    expect(updated).toBe(1)

    const doc = await fakeStorage.getItem<{
      rates: Record<string, { teaPct: number; scrapedAt: string }>
      history: Record<
        string,
        Array<{ date: string; teaPct: number; source?: string; method: string }>
      >
    }>('rates.json')
    expect(doc!.rates.oca!.teaPct).toBe(39)
    expect(doc!.history.oca).toHaveLength(1)
    expect(doc!.history.oca![0]).toMatchObject({
      teaPct: 39,
      method: 'regex',
      source: 'https://oca.uy/prestamos/',
    })
  })

  it('does not touch the stored value or history on a failed result', async () => {
    const { applyLoanScrapeResults } = await import('../../server/utils/loanRatesStore')
    await applyLoanScrapeResults([result({ id: 'oca', teaPct: 39, ok: true, method: 'regex' })])
    const updated = await applyLoanScrapeResults([
      result({ id: 'oca', teaPct: null, ok: false, method: 'regex' }),
    ])
    expect(updated).toBe(0)

    const doc = await fakeStorage.getItem<{
      rates: Record<string, { teaPct: number }>
      history: Record<string, unknown[]>
    }>('rates.json')
    expect(doc!.rates.oca!.teaPct).toBe(39)
    expect(doc!.history.oca).toHaveLength(1)
  })

  it('overwrites, rather than duplicates, a same-day history entry on re-run', async () => {
    const { applyLoanScrapeResults } = await import('../../server/utils/loanRatesStore')
    await applyLoanScrapeResults([result({ id: 'oca', teaPct: 39, ok: true, method: 'regex' })])
    await applyLoanScrapeResults([result({ id: 'oca', teaPct: 40, ok: true, method: 'regex' })])

    const doc = await fakeStorage.getItem<{
      history: Record<string, Array<{ teaPct: number }>>
    }>('rates.json')
    expect(doc!.history.oca).toHaveLength(1)
    expect(doc!.history.oca![0]!.teaPct).toBe(40)
  })

  it('tolerates a pre-existing doc with no history key (migration)', async () => {
    await fakeStorage.setItem('rates.json', {
      rates: { oca: { teaPct: 39, scrapedAt: '2026-01-01T00:00:00.000Z' } },
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const { applyLoanScrapeResults, getMergedLenders } = await import(
      '../../server/utils/loanRatesStore'
    )
    await applyLoanScrapeResults([result({ id: 'pronto', teaPct: 49, ok: true, method: 'regex' })])

    const doc = await fakeStorage.getItem<{ history: Record<string, unknown[]> }>('rates.json')
    expect(doc!.history.pronto).toHaveLength(1)
    const lenders = await getMergedLenders()
    expect(lenders.find(l => l.id === 'oca')!.teaPct).toBe(39)
  })
})
