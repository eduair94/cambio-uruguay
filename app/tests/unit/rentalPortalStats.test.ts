import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import * as rentals from '../../utils/rentals'
import * as rentalPortals from '../../utils/rentalPortals'

type Stage = Record<string, any>

const route = readFileSync(join(__dirname, '../../server/api/rentals/portales.get.ts'), 'utf8')
const compiled = ts.transpileModule(route, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

/** Runs the real endpoint with IO stubs so its Mongo pipelines stay exactly as written. */
async function run(gapRows: Array<{ diff: number; pct: number }>) {
  const pipelines: Stage[][] = []
  const facet = {
    total: [{ n: 54_645 }],
    sources: [
      { _id: 'mercadolibre', count: 26_113 },
      { _id: 'infocasas', count: 16_804 },
      { _id: '', count: 9 },
    ],
    multiPortal: [{ n: 3 }],
  }
  const dependencies: Record<string, unknown> = {
    '../../models/RentalListing': {
      RentalListingModel: {
        aggregate: (pipeline: Stage[]) => {
          pipelines.push(pipeline)
          const chain = {
            allowDiskUse: () => chain,
            collation: () =>
              Promise.resolve(pipeline.some(stage => stage.$facet) ? [facet] : gapRows),
          }
          return chain
        },
      },
    },
    '../../models/RentalMeta': {
      RentalMetaModel: {
        findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) }),
      },
    },
    '../../utils/db': { connectDb: async () => {} },
    '../../../utils/rentals': rentals,
    '../../../utils/rentalPortals': rentalPortals,
  }
  const module = { exports: {} as { default?: () => Promise<any> } }
  runInNewContext(compiled, {
    exports: module.exports,
    module,
    require: (id: string) => {
      if (!(id in dependencies)) throw new Error(`Unexpected route dependency: ${id}`)
      return dependencies[id]
    },
    defineCachedEventHandler: (handler: unknown) => handler,
    console,
  })
  const stats = await module.exports.default!()
  return { stats, totals: pipelines[0]!, gaps: pipelines[1]! }
}

describe('rental portal stats endpoint', () => {
  it('reports the catalogue split and the gap statistics', async () => {
    const { stats } = await run([
      { diff: 1000, pct: 4 },
      { diff: 3000, pct: 9 },
      { diff: 5000, pct: 12 },
    ])
    expect(stats).toMatchObject({
      total: 54_645,
      multiPortal: 3,
      withGap: 3,
      medianGapUyu: 3000,
      medianGapPct: 9,
      maxGapUyu: 5000,
      staleDays: rentals.RENTAL_STALE_DAYS,
      gapMinUyu: rentalPortals.RENTAL_GAP_MIN_UYU,
      gapMinPct: rentalPortals.RENTAL_GAP_MIN_PCT,
    })
    // An empty source key is a broken row, not a sixth portal.
    expect(stats.sources).toEqual([
      { source: 'mercadolibre', count: 26_113 },
      { source: 'infocasas', count: 16_804 },
    ])
  })

  it('reports zeroes instead of NaN when no home has a gap', async () => {
    const { stats } = await run([])
    expect(stats).toMatchObject({
      withGap: 0,
      medianGapUyu: 0,
      medianGapPct: 0,
      maxGapUyu: 0,
      multiPortal: 3,
    })
  })

  it('drops rows the database returned without usable numbers', async () => {
    const { stats } = await run([
      { diff: 2000, pct: 5 },
      { diff: Number.NaN, pct: 5 },
      { diff: 4000, pct: null as unknown as number },
    ])
    expect(stats.withGap).toBe(1)
    expect(stats.maxGapUyu).toBe(2000)
  })

  it('counts only homes published on more than one portal, over the public window', async () => {
    const { gaps } = await run([])
    expect(gaps[0]).toEqual({ $match: expect.objectContaining({ lastSeen: expect.anything() }) })
    expect(gaps).toContainEqual({ $match: { 'sources.1': { $exists: true } } })
    // The per-home reduction must group by source before comparing: two adverts from the same
    // portal are two agencies inside one portal, not a difference between portals.
    expect(gaps).toContainEqual({
      $group: {
        _id: { key: '$key', source: '$offers.source' },
        price: { $min: '$offers.priceUyu' },
      },
    })
  })

  it('applies the same thresholds the cards use, from the shared constants', async () => {
    const { gaps } = await run([])
    expect(gaps).toContainEqual({
      $match: {
        diff: { $gte: rentalPortals.RENTAL_GAP_MIN_UYU },
        pct: { $gte: rentalPortals.RENTAL_GAP_MIN_PCT },
      },
    })
  })

  it('never leaks advert evidence into the aggregation buffer', async () => {
    const { gaps } = await run([])
    const projection = gaps.find(stage => stage.$project)!.$project
    expect(projection).toEqual({ _id: 0, key: 1, offers: { source: 1, priceUyu: 1 } })
  })
})
