import { describe, expect, it, vi } from 'vitest'
import { createRentalIndexAllowlistReader } from '../../server/utils/rentalIndexAllowlist'

const NOW = Date.parse('2026-09-22T12:00:00Z')
const fresh = {
  family: 'alquileres',
  asOf: '2026-09-22',
  windowDays: 56,
  minImpressions: 5,
  urls: ['/alquileres/con-demanda'],
  rowCount: 3,
  complete: true,
}

describe('rental index allowlist reader', () => {
  it('reads once per TTL and shares one in-flight read between concurrent callers', async () => {
    const find = vi.fn(async () => fresh)
    const read = createRentalIndexAllowlistReader(find, 60_000)
    const [a, b] = await Promise.all([read(NOW), read(NOW)])
    expect(a?.paths.has('/alquileres/con-demanda')).toBe(true)
    expect(b).toBe(a)
    expect(find).toHaveBeenCalledTimes(1)
    await read(NOW + 59_000)
    expect(find).toHaveBeenCalledTimes(1)
    await read(NOW + 61_000)
    expect(find).toHaveBeenCalledTimes(2)
  })
  it('tolerates a missing document and memoises the miss as well', async () => {
    const find = vi.fn(async () => null)
    const read = createRentalIndexAllowlistReader(find, 60_000)
    expect(await read(NOW)).toBeNull()
    expect(await read(NOW + 1)).toBeNull()
    expect(find).toHaveBeenCalledTimes(1)
  })
  it('answers null on a failed read instead of throwing into the page', async () => {
    const find = vi.fn(async () => {
      throw new Error('mongo down')
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const read = createRentalIndexAllowlistReader(find, 60_000)
      expect(await read(NOW)).toBeNull()
    } finally {
      log.mockRestore()
    }
  })
  it('applies the freshness rule at read time, so a stale document is no allowlist', async () => {
    const read = createRentalIndexAllowlistReader(async () => ({ ...fresh, asOf: '2026-08-01' }))
    expect(await read(NOW)).toBeNull()
  })
})
