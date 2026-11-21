// The coverage of the catalogue (server/utils/rentalCoverage.ts) is read from the default search's
// facet entry since 2026-11-20 (P5). That is only honest if the default facet IS the coverage pass:
// the same public stages, counted the same way. The first test proves it on the pipeline the
// directory actually issues.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as rentals from '../../utils/rentals'
import { rentalCoverageFromFacet, rentalCoverageStages } from '../../server/utils/rentalCoverage'
import {
  createRentalDirectoryAggregate,
  createRentalDirectoryData,
  type RentalAggregateChain,
} from '../../server/utils/rentalDirectoryData'
import { createRentalMemo } from '../../server/utils/rentalMemo'

type Stage = Record<string, any>

describe('the coverage of the catalogue', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-09-05T03:00:00Z')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is the default facet pass: the same public stages, the same counts', async () => {
    const issued: Stage[][] = []
    const start = (pipeline: Stage[]): RentalAggregateChain => {
      issued.push(pipeline)
      const chain: RentalAggregateChain = {
        allowDiskUse: () => chain,
        option: () => chain,
        collation: () =>
          Promise.resolve([{ total: [{ total: 3 }], sources: [{ _id: 'casasweb', count: 1 }] }]),
      }
      return chain
    }
    const data = createRentalDirectoryData({
      aggregate: createRentalDirectoryAggregate(start as never),
      memo: createRentalMemo({ log: () => {}, schedule: () => () => {} }),
    })
    // A fresh worker builds the default facet in the background, from the request's exchange rate.
    expect(data.coverage({ usdUyu: 41.75 })).toBeNull()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(issued).toHaveLength(1)
    const facet = issued[0]!
    const coverage = rentalCoverageStages(rentals.RENTAL_STALE_DAYS)
    // Everything before the `$facet`: the default filter's public stages, no advert excluded.
    expect(facet.slice(0, -1)).toEqual(coverage.slice(0, -1))
    expect(facet.slice(0, -1)).toEqual(
      rentals.rentalPublicStages(
        rentals.buildRentalFilter(rentals.normalizeRentalQuery({}), rentals.RENTAL_STALE_DAYS)
          .filter,
        rentals.RENTAL_STALE_DAYS
      )
    )
    // And the two counts the coverage reads: every property once, each portal once per property.
    const branches = facet.at(-1)!.$facet
    expect(branches.total).toEqual([{ $count: 'total' }])
    expect(branches.sources.slice(0, 2)).toEqual([
      { $unwind: '$sources' },
      { $group: { _id: '$sources', count: { $sum: 1 } } },
    ])
    expect((coverage.at(-1) as Stage).$facet.sources).toEqual([
      { $unwind: '$sources' },
      { $group: { _id: '$sources', properties: { $sum: 1 } } },
    ])
    expect(data.coverage({ usdUyu: 41.75 })?.properties).toBe(3)
  })

  it('keeps the unique total separate from overlapping sources and includes successful zeros', () => {
    const builtAt = Date.now()
    const coverage = rentalCoverageFromFacet(
      {
        total: 3,
        sources: [
          { value: 'infocasas', count: 2 },
          { value: 'mercadolibre', count: 1 },
          { value: 'casasweb', count: 1 },
        ],
      },
      builtAt
    )
    expect(coverage).toEqual({
      computedAt: '2026-09-05T03:00:00.000Z',
      properties: 3,
      sources: [
        { key: 'mercadolibre', properties: 1 },
        { key: 'infocasas', properties: 2 },
        { key: 'facebook', properties: 0 },
        { key: 'elpais', properties: 0 },
        { key: 'casasweb', properties: 1 },
        { key: 'tiktok', properties: 0 },
        { key: 'instagram', properties: 0 },
        { key: 'facebookreels', properties: 0 },
        { key: 'alquileresuy', properties: 0 },
      ],
    })
  })

  it('dates the coverage when its facet was read, not when it is served', () => {
    const builtAt = Date.parse('2026-09-05T02:56:00Z')
    expect(rentalCoverageFromFacet({ total: 1, sources: [] }, builtAt).computedAt).toBe(
      '2026-09-05T02:56:00.000Z'
    )
  })

  it('distinguishes an empty visible catalogue from an unavailable count', () => {
    const coverage = rentalCoverageFromFacet({ total: 0, sources: [] }, Date.now())
    expect(coverage.properties).toBe(0)
    expect(coverage.sources).toHaveLength(9)
    expect(coverage.sources.every(source => source.properties === 0)).toBe(true)
  })

  it('ignores a portal the site does not list', () => {
    const coverage = rentalCoverageFromFacet(
      { total: 1, sources: [{ value: 'otro', count: 1 }] },
      Date.now()
    )
    expect(coverage.sources.map(source => source.key)).not.toContain('otro')
  })
})
