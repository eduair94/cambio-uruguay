import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { loadAvailabilityOwners } from '../../server/utils/rentalAvailabilityIndex'
import { RENTAL_COLLATION } from '../../utils/rentals'

const mocks = vi.hoisted(() => {
  const calls: Array<[string, unknown]> = []
  const chain = {
    collation(value: unknown) {
      calls.push(['collation', value])
      return chain
    },
    option(value: unknown) {
      calls.push(['option', value])
      return chain
    },
    then(resolve: (rows: unknown[]) => unknown) {
      return Promise.resolve(resolve([]))
    },
  }
  return { calls, aggregate: vi.fn(() => chain) }
})
vi.mock('../../server/models/RentalListing', () => ({
  RentalListingModel: { aggregate: mocks.aggregate },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))

describe('Mongo access of the rental directory', () => {
  // 2026-11-08: a cold Montevideo search took 10–14 s through the API and ~3 s straight against
  // Mongo; one search runs eight operations at once and the pool had five connections per worker.
  it('gives each worker a pool that fits one directory search and its neighbours', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../server/utils/db.ts', import.meta.url)),
      'utf8'
    )
    const size = Number(/maxPoolSize:\s*(\d+)/.exec(source)?.[1])
    expect(size).toBeGreaterThanOrEqual(20)
  })

  it('looks reported adverts up with the collation their index was built with', async () => {
    await loadAvailabilityOwners([{ source: 'infocasas', listingId: 'infocasas:123' } as never])
    expect(mocks.aggregate).toHaveBeenCalledOnce()
    expect(mocks.calls).toContainEqual(['collation', RENTAL_COLLATION])
  })
})
