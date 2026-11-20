import { describe, expect, it, vi } from 'vitest'
import type { EvolutionResponse } from '../../types/api'
import { loadComparisonEvolutions } from '../../utils/comparisonLoad'

const history = (origin: string): EvolutionResponse => ({
  origin,
  code: 'USD',
  type: null,
  localData: { name: origin, website: '', maps: '', bcu: '', departments: [] },
  statistics: {
    totalDataPoints: 1,
    dateRange: { start: '2026-10-22', end: '2026-10-22', periodMonths: 6 },
    buy: { min: 40, max: 40, avg: 40, current: 40, change: 0 },
    sell: { min: 42, max: 42, avg: 42, current: 42, change: 0 },
  },
  evolution: [
    { origin, code: 'USD', type: '', name: 'Dólar', date: '2026-10-22', buy: 40, sell: 42 },
  ],
})

describe('loadComparisonEvolutions', () => {
  it('loads every selected house and preserves successful series in selection order', async () => {
    const fetch = vi.fn(async (origin: string) => ({ data: history(origin), error: null }))
    const result = await loadComparisonEvolutions(['a', 'b'], 'USD', fetch)
    expect(result).toEqual({
      series: [history('a'), history('b')],
      failedOrigins: [],
      emptyOrigins: [],
    })
    expect(fetch.mock.calls).toEqual([
      ['a', 'USD'],
      ['b', 'USD'],
    ])
  })

  it('keeps total fetch failure distinct from a successful empty history', async () => {
    const result = await loadComparisonEvolutions(['a', 'b'], 'USD', async () => ({
      data: null,
      error: { status: 503 },
    }))
    expect(result).toEqual({ series: [], failedOrigins: ['a', 'b'], emptyOrigins: [] })
  })

  it('preserves the successful house when another request rejects', async () => {
    const result = await loadComparisonEvolutions(['a', 'b'], 'USD', async origin => {
      if (origin === 'a') throw new Error('network unavailable')
      return { data: history(origin), error: null }
    })
    expect(result).toEqual({ series: [history('b')], failedOrigins: ['a'], emptyOrigins: [] })
  })

  it('reports an explicitly empty response separately while retaining other histories', async () => {
    const result = await loadComparisonEvolutions(['a', 'b'], 'USD', async origin => ({
      data: origin === 'a' ? { ...history(origin), evolution: [] } : history(origin),
      error: null,
    }))
    expect(result).toEqual({ series: [history('b')], failedOrigins: [], emptyOrigins: ['a'] })
  })

  it.each([
    null,
    { ...history('a'), evolution: null },
    { ...history('a'), code: 'EUR' },
    history('wrong-house'),
  ])('does not call malformed or mismatched data an empty history: %j', async data => {
    const result = await loadComparisonEvolutions(['a'], 'USD', async () => ({ data, error: null }))
    expect(result).toEqual({ series: [], failedOrigins: ['a'], emptyOrigins: [] })
  })

  it('allows a retry to recover without keeping the prior failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { status: 503 } })
      .mockResolvedValueOnce({ data: history('a'), error: null })
    expect((await loadComparisonEvolutions(['a'], 'USD', fetch)).failedOrigins).toEqual(['a'])
    expect(await loadComparisonEvolutions(['a'], 'USD', fetch)).toEqual({
      series: [history('a')],
      failedOrigins: [],
      emptyOrigins: [],
    })
  })

  it('does not request histories without a selection', async () => {
    const fetch = vi.fn()
    expect(await loadComparisonEvolutions([], 'USD', fetch)).toEqual({
      series: [],
      failedOrigins: [],
      emptyOrigins: [],
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
