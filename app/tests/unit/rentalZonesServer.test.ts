import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createRentalZoneSnapshotLoader,
  RENTAL_ZONE_SNAPSHOT_QUERY,
  RENTAL_ZONE_SNAPSHOT_PROJECTION,
} from '../../server/utils/rentalZones'

const time = Date.parse('2026-09-08T12:00:00Z')
const market = () => ({
  _id: 'market',
  version: 1,
  generatedAt: new Date(time).toISOString(),
  rentalDataAsOf: new Date(time).toISOString(),
  sampleMinimum: 8,
  buckets: [],
  privateRows: ['PRIVATE_ID'],
})
afterEach(() => vi.useRealTimers())

describe('precomputed public zone loader', () => {
  it('reads only the two fixed IDs and excludes source-cache, leases and raw evidence from its projection', () => {
    expect(RENTAL_ZONE_SNAPSHOT_QUERY).toEqual({ _id: { $in: ['market', 'context'] } })
    const projection = JSON.stringify(RENTAL_ZONE_SNAPSHOT_PROJECTION)
    expect(projection).not.toMatch(/observations|offers|identity|source-cache|lease|owner/)
  })
  it('coalesces concurrent reads and caches only one projected snapshot for120s', async () => {
    let clock = time
    let finish!: (value: unknown[]) => void
    const read = vi.fn(
      () =>
        new Promise<unknown[]>(resolve => {
          finish = resolve
        })
    )
    const load = createRentalZoneSnapshotLoader({ read, now: () => clock })
    const first = load(),
      second = load()
    expect(read).toHaveBeenCalledTimes(1)
    finish([market()])
    const value = await first
    expect(await second).toBe(value)
    expect(JSON.stringify(value)).not.toContain('PRIVATE_ID')
    clock += 119_999
    expect(await load()).toBe(value)
    expect(read).toHaveBeenCalledTimes(1)
    clock++
    const reloaded = load()
    expect(read).toHaveBeenCalledTimes(2)
    finish([market()])
    await reloaded
  })
  it('retains public cached layers after read failure without renewing data dates, and backs off30s', async () => {
    let clock = time
    const read = vi
      .fn()
      .mockResolvedValueOnce([market()])
      .mockRejectedValueOnce(new Error('PRIVATE_CONNECTION'))
      .mockResolvedValueOnce([market()])
    const load = createRentalZoneSnapshotLoader({ read, now: () => clock })
    const first = await load()
    clock += 120_000
    expect(await load()).toBe(first)
    expect(first.market?.generatedAt).toBe(new Date(time).toISOString())
    clock += 29_999
    expect(await load()).toBe(first)
    expect(read).toHaveBeenCalledTimes(2)
    clock++
    await load()
    expect(read).toHaveBeenCalledTimes(3)
  })
  it('returns an explicit unavailable snapshot when no documents have been published', async () => {
    const load = createRentalZoneSnapshotLoader({ read: async () => [], now: () => time })
    expect(await load()).toEqual({ market: null, context: null })
  })
  it.each([
    [{ _id: 'source-cache', private: 'PRIVATE_SOURCE' }],
    [market(), market()],
    [market(), { _id: 'context' }, { _id: 'source-cache' }],
    [{ ...market(), excess: 'x'.repeat(8 * 1024 * 1024) }],
  ])('rejects wrong IDs, duplicate or oversized documents before caching', async rows => {
    const load = createRentalZoneSnapshotLoader({ read: async () => rows, now: () => time })
    await expect(load()).rejects.toMatchObject({ statusCode: 503 })
  })
  it('limits waiting to8s while preserving coalescing of the original pending database read', async () => {
    vi.useFakeTimers()
    let finish!: (value: unknown[]) => void
    const read = vi.fn(
      () =>
        new Promise<unknown[]>(resolve => {
          finish = resolve
        })
    )
    const load = createRentalZoneSnapshotLoader({ read, now: Date.now })
    const first = expect(load()).rejects.toMatchObject({ statusCode: 503 })
    await vi.advanceTimersByTimeAsync(8000)
    await first
    await expect(load()).rejects.toMatchObject({ statusCode: 503 })
    expect(read).toHaveBeenCalledTimes(1)
    finish([market()])
    await vi.advanceTimersByTimeAsync(1)
    expect((await load()).market).not.toBeNull()
    expect(read).toHaveBeenCalledTimes(1)
  })
})
