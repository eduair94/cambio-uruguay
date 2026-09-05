import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRentalCoverageReader } from '../../server/utils/rentalCoverage'

const result = (count = 3) => [
  {
    properties: [{ count }],
    sources: [
      { _id: 'infocasas', properties: 2 },
      { _id: 'mercadolibre', properties: 1 },
      { _id: 'casasweb', properties: 1 },
    ],
  },
]

describe('global rental coverage cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-09-05T03:00:00Z')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps the unique total separate from overlapping sources and includes successful zeros', async () => {
    const read = createRentalCoverageReader(vi.fn().mockResolvedValue(result()))
    const coverage = await read('latest-fast-run', 10)
    expect(coverage).toEqual({
      computedAt: '2026-09-05T03:00:00.000Z',
      properties: 3,
      sources: [
        { key: 'mercadolibre', properties: 1 },
        { key: 'infocasas', properties: 2 },
        { key: 'facebook', properties: 0 },
        { key: 'elpais', properties: 0 },
        { key: 'casasweb', properties: 1 },
      ],
    })
  })

  it('reuses and coalesces the global result across requests until its short cache expires', async () => {
    const aggregate = vi.fn().mockResolvedValue(result())
    const read = createRentalCoverageReader(aggregate)
    const [first, second] = await Promise.all([read('sync-1', 10), read('sync-1', 10)])
    expect(second).toEqual(first)
    expect(aggregate).toHaveBeenCalledTimes(1)
    vi.setSystemTime('2026-09-05T03:00:59Z')
    expect(await read('sync-1', 10)).toEqual(first)
    expect(aggregate).toHaveBeenCalledTimes(1)
    vi.setSystemTime('2026-09-05T03:01:00Z')
    expect((await read('sync-1', 10))?.computedAt).toBe('2026-09-05T03:01:00.000Z')
    expect(aggregate).toHaveBeenCalledTimes(2)
  })

  it('invalidates immediately when a sync changes or the UTC visibility cutoff advances', async () => {
    const aggregate = vi.fn().mockResolvedValue(result())
    const read = createRentalCoverageReader(aggregate)
    vi.setSystemTime('2026-09-05T23:59:55Z')
    await read('sync-1', 10)
    await read('sync-2', 10)
    expect(aggregate).toHaveBeenCalledTimes(2)
    vi.setSystemTime('2026-09-06T00:00:00Z')
    await read('sync-2', 10)
    expect(aggregate).toHaveBeenCalledTimes(3)
    expect(aggregate.mock.calls[2][0][0]).toEqual({
      $match: { lastSeen: { $gte: '2026-08-27' } },
    })
  })

  it('does not let an older pending sync overwrite a newer completed snapshot', async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void
    const aggregate = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<ReturnType<typeof result>>(resolve => (resolveOld = resolve))
      )
      .mockResolvedValueOnce(result(8))
    const read = createRentalCoverageReader(aggregate)
    const old = read('sync-1', 10)
    await Promise.resolve()
    const current = await read('sync-2', 10)
    resolveOld(result(3))
    expect((await old)?.properties).toBe(3)
    expect(await read('sync-2', 10)).toEqual(current)
    expect(current?.properties).toBe(8)
    expect(aggregate).toHaveBeenCalledTimes(2)
  })

  it('returns unavailable on failure without substituting a zero or caching that failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const aggregate = vi
      .fn()
      .mockRejectedValueOnce(new Error('aggregation unavailable'))
      .mockResolvedValueOnce(result())
    const read = createRentalCoverageReader(aggregate)
    expect(await read('sync-1', 10)).toBeNull()
    expect(log).toHaveBeenCalledTimes(1)
    expect((await read('sync-1', 10))?.properties).toBe(3)
    expect(aggregate).toHaveBeenCalledTimes(2)
  })

  it('distinguishes an empty visible catalogue from an unavailable count', async () => {
    const read = createRentalCoverageReader(
      vi.fn().mockResolvedValue([{ properties: [], sources: [] }])
    )
    const coverage = await read(undefined, 10)
    expect(coverage?.properties).toBe(0)
    expect(coverage?.sources).toHaveLength(5)
    expect(coverage?.sources.every(source => source.properties === 0)).toBe(true)
  })
})
