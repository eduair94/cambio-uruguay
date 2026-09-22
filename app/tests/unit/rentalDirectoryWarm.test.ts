import { describe, expect, it } from 'vitest'
import {
  RENTAL_DIRECTORY_WARM_QUERIES,
  rentalDirectoryCacheKey,
  runRentalDirectoryWarm,
  warmRentalDirectory,
} from '../../server/utils/rentalDirectoryWarm'

describe('rental directory warm-up', () => {
  it('warms the front page, the three big departments and page 2, in order and one at a time', async () => {
    const seen: string[] = []
    let active = 0
    let maxActive = 0
    const report = await warmRentalDirectory(async query => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      seen.push(new URLSearchParams(query).toString())
      active--
    })
    expect(report.status).toBe('warmed')
    expect(seen).toEqual([
      '',
      'department=Montevideo',
      'department=Canelones',
      'department=Maldonado',
      'page=2',
    ])
    expect(maxActive).toBe(1)
    expect(report.failed).toEqual([])
    expect(report.warmed).toEqual(seen)
  })

  it('keeps going when one query fails and reports which one', async () => {
    const report = await warmRentalDirectory(async query => {
      if (query.department === 'Canelones') throw new Error('Mongo unavailable')
    })
    expect(report.warmed).toEqual(['', 'department=Montevideo', 'department=Maldonado', 'page=2'])
    expect(report.failed).toEqual([{ query: 'department=Canelones', error: 'Mongo unavailable' }])
  })

  it('refuses to stack a second run on the same process while one is in flight', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    const first = runRentalDirectoryWarm(() => gate, [{}])
    const second = await runRentalDirectoryWarm(async () => {}, [{}])
    expect(second.status).toBe('busy')
    release()
    expect((await first).status).toBe('warmed')
    // Once the first run finished the guard opens again.
    expect((await runRentalDirectoryWarm(async () => {}, [{}])).status).toBe('warmed')
  })

  it('warms exactly the cache keys the handler would mint for those queries', () => {
    // A warm-up that lands on a different key than the visitor's request warms nothing.
    for (const query of RENTAL_DIRECTORY_WARM_QUERIES) {
      const key = rentalDirectoryCacheKey({ ...query })
      expect(key).toBe(new URLSearchParams(query).toString() || 'default')
    }
    // `?page=1`, `?` and a stray tracking parameter all collapse into the front-page entry.
    expect(rentalDirectoryCacheKey({ page: '1' })).toBe('default')
    expect(rentalDirectoryCacheKey({ utm_source: 'x' })).toBe('default')
    expect(rentalDirectoryCacheKey({ availabilityRevision: '3' })).toBe('default')
  })
})
