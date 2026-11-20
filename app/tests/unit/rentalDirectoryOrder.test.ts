// The keys pass and the cards pass of /api/rentals (server/utils/rentalDirectoryOrder.ts).
//
// The two rules a keys pass can break without any test going red: a `$sort` key that does not
// survive the projection before the sort (Mongo sorts it as null and the order silently falls to
// the next key, which the map did twice before 2026-11-20), and a cards pass that is not the
// route's own pipeline (then a card could differ from the one the single pass returned).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as rentals from '../../utils/rentals'
import * as rentalDistance from '../../utils/rentalDistance'
import * as rentalPricePerM2 from '../../utils/rentalPricePerM2'
import * as rentalDetail from '../../server/utils/rentalDetail'
import * as rentalDirectoryOrder from '../../server/utils/rentalDirectoryOrder'
import * as rentalDirectoryParts from '../../utils/rentalDirectoryParts'
import {
  orderByKeys,
  rentalDirectoryCardsPipeline,
  rentalDirectoryCardsStages,
  rentalDirectoryKeysPipeline,
  rentalSortKeyProjection,
  type RentalDirectoryItemsPipeline,
} from '../../server/utils/rentalDirectoryOrder'

type Stage = Record<string, any>

/** The route's own single-pass pipeline, read from the route file itself (no copy that can drift). */
function routeItemsPipeline(): RentalDirectoryItemsPipeline {
  const source = readFileSync(join(__dirname, '../../server/api/rentals/index.get.ts'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const real: Record<string, unknown> = {
    '../../utils/rentalDetail': rentalDetail,
    '../../utils/rentalDirectoryOrder': rentalDirectoryOrder,
    '../../../utils/rentalDirectoryParts': rentalDirectoryParts,
    '../../../utils/rentals': rentals,
    '../../../utils/rentalDistance': rentalDistance,
    '../../../utils/rentalPricePerM2': rentalPricePerM2,
  }
  const module = { exports: {} as { rentalDirectoryItemsPipeline?: RentalDirectoryItemsPipeline } }
  runInNewContext(compiled, {
    exports: module.exports,
    module,
    // Only the pure pipeline is read here: every IO module is an empty stand-in.
    require: (id: string) => real[id] ?? {},
    defineEventHandler: (handler: unknown) => handler,
    defineCachedEventHandler: (handler: unknown) => handler,
    console,
  })
  return module.exports.rentalDirectoryItemsPipeline!
}

const SORTS: rentals.RentalSort[] = [
  'recientes',
  'baja',
  'precio',
  'precio-desc',
  'total',
  'precio-m2',
  'metros',
  'distancia',
]
const REFERENCE = { refLat: '-34.9058', refLng: '-56.1913' }
const queryFor = (sort: rentals.RentalSort, extra: Record<string, string> = {}) =>
  rentals.normalizeRentalQuery({
    sort,
    ...(sort === 'distancia' ? REFERENCE : {}),
    ...extra,
  })
const stagesFor = (query: rentals.RentalQuery) => {
  const { filter } = rentals.buildRentalFilter(query, rentals.RENTAL_STALE_DAYS, 40)
  return {
    filter,
    publicStages: rentals.rentalPublicStages(filter, rentals.RENTAL_STALE_DAYS, ['rent:a:1']),
    offerStages: rentals.rentalOfferStages(query, 40),
  }
}

describe('the keys pass', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it.each(SORTS)('keeps every %s sort key through its projection, and nothing else', sort => {
    // Also with chosen types: "más recientes" computes its homes-first tier differently then.
    for (const extra of [{}, { types: 'apartamento,oficina' }, { pets: '1', priceMin: '10000' }]) {
      const query = queryFor(sort, extra)
      expect(query.sort).toBe(sort)
      const { publicStages, offerStages } = stagesFor(query)
      const pipeline = rentalDirectoryKeysPipeline(query, publicStages, offerStages, {
        skip: 96,
        limit: 24,
      }) as Stage[]
      const sortAt = pipeline.findIndex(stage => stage.$sort)
      const projectAt = pipeline.findIndex(stage => stage.$project)
      expect(projectAt).toBe(sortAt - 1)
      const projection = pipeline[projectAt]!.$project
      const sortKeys = Object.keys(rentals.rentalMongoSort(sort))
      expect(pipeline[sortAt]!.$sort).toEqual(rentals.rentalMongoSort(sort))
      // Nothing but the key and the sort keys enters the blocking sort.
      expect(Object.keys(projection).sort()).toEqual(
        [...new Set(['_id', 'key', ...sortKeys])].sort()
      )
      expect(projection._id).toBe(0)
      const computed = rentals.rentalRecentSortProjection(query)
      for (const key of sortKeys)
        expect(projection[key]).toEqual(key in computed ? computed[key] : 1)
      expect(projection).toEqual(rentalSortKeyProjection(query))
      // Every field the sort reads is computed before the projection, or is a stored field.
      const before = JSON.stringify(pipeline.slice(0, projectAt))
      for (const key of sortKeys.filter(key => key.startsWith('_rental') && !(key in computed)))
        expect(before).toContain(`"${key}"`)
    }
  })

  it('runs the same derivation as the single pass before projecting, then sorts and pages', () => {
    const items = routeItemsPipeline()
    for (const sort of SORTS) {
      const query = queryFor(sort, { page: '5' })
      const { publicStages, offerStages } = stagesFor(query)
      const keys = rentalDirectoryKeysPipeline(query, publicStages, offerStages, {
        skip: 96,
        limit: 24,
      }) as Stage[]
      const single = items(query, publicStages, offerStages) as Stage[]
      const singleProject = single.findIndex(stage => stage.$project)
      // Everything the single pass does before its projection, the keys pass does too, in order.
      expect(keys.slice(0, singleProject)).toEqual(single.slice(0, singleProject))
      expect(keys.slice(singleProject + 1)).toEqual([
        { $sort: rentals.rentalMongoSort(sort) },
        { $skip: 96 },
        { $limit: 24 },
        { $project: { _id: 0, key: 1 } },
      ])
    }
  })

  it('skips the distance stages unless the distance is the sort, since they never filter', () => {
    const query = queryFor('precio', REFERENCE)
    expect(query.refLat).not.toBeNull()
    const { publicStages, offerStages } = stagesFor(query)
    const keys = rentalDirectoryKeysPipeline(query, publicStages, offerStages, {
      skip: 0,
      limit: 24,
    })
    expect(JSON.stringify(keys)).not.toContain('distanceKm')
    for (const stage of rentalDistance.rentalDistanceStages(query)) {
      expect(Object.keys(stage)).toEqual(['$set'])
    }
  })

  it('counts the search and pages it in one $facet when asked to', () => {
    const query = queryFor('precio')
    const { publicStages, offerStages } = stagesFor(query)
    const plain = rentalDirectoryKeysPipeline(query, publicStages, offerStages, {
      skip: 0,
      limit: 480,
    }) as Stage[]
    const counted = rentalDirectoryKeysPipeline(query, publicStages, offerStages, {
      skip: 0,
      limit: 480,
      count: true,
    }) as Stage[]
    expect(counted.slice(0, -1)).toEqual(plain.slice(0, -4))
    expect(counted.at(-1)).toEqual({
      $facet: { n: [{ $count: 'n' }], keys: plain.slice(-4) },
    })
  })
})

describe('the cards pass', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it.each(SORTS)('is the single pass of %s over the keys, on page 1', sort => {
    const items = routeItemsPipeline()
    const query = queryFor(sort, { page: '5', pets: '1' })
    const keys = ['montevideo-pocitos-uno', 'montevideo-cordon-dos', 'canelones-pinar-tres']
    const { filter, publicStages, offerStages } = stagesFor(query)
    const publicForKeys = rentalDirectoryCardsStages(publicStages, keys)
    // The same stages a fresh `rentalPublicStages` over the narrowed filter builds, at the same
    // instant: the cards pass derives nothing the keys pass did not.
    expect(publicForKeys).toEqual(
      rentals.rentalPublicStages({ ...filter, key: { $in: keys } }, rentals.RENTAL_STALE_DAYS, [
        'rent:a:1',
      ])
    )
    const cards = rentalDirectoryCardsPipeline(
      query,
      publicForKeys,
      offerStages,
      keys.length,
      items
    ) as Stage[]
    expect(cards).toEqual(
      items({ ...query, page: 1, perPage: keys.length }, publicForKeys, offerStages)
    )
    // The keys reach the first $match, which is what lets Mongo read them by the key index.
    expect(cards[0]!.$match.key).toEqual({ $in: keys })
    expect(cards.find(stage => stage.$skip !== undefined)).toEqual({ $skip: 0 })
    expect(cards.find(stage => stage.$limit !== undefined)).toEqual({ $limit: keys.length })
    // And it is the page-5 single pass with nothing changed but the keys and the paging.
    const single = items(query, publicStages, offerStages) as Stage[]
    const withoutKeys = (pipeline: Stage[]) =>
      pipeline.map(stage => {
        if (stage.$match && 'key' in stage.$match) {
          const { key: _key, ...rest } = stage.$match
          return { $match: rest }
        }
        if (stage.$skip !== undefined) return { $skip: 'page' }
        if (stage.$limit !== undefined) return { $limit: 'page' }
        return stage
      })
    expect(withoutKeys(cards)).toEqual(withoutKeys(single))
    expect(single.find(stage => stage.$skip !== undefined)).toEqual({ $skip: 96 })
  })

  it('never changes the stages of the keys pass it narrows', () => {
    const { publicStages } = stagesFor(queryFor('precio', { department: 'Montevideo' }))
    const before = structuredClone(publicStages)
    const keys = ['a']
    const narrowed = rentalDirectoryCardsStages(publicStages, keys) as Stage[]
    expect(publicStages).toEqual(before)
    expect(narrowed).toHaveLength(publicStages.length)
    expect(narrowed[0]).toEqual({ $match: { ...before[0]!.$match, key: { $in: ['a'] } } })
    expect(narrowed.at(-1)).toEqual({ $match: { ...before.at(-1)!.$match, key: { $in: ['a'] } } })
    // Everything in between is the keys pass's own stage, by reference.
    for (let i = 1; i < publicStages.length - 1; i++) expect(narrowed[i]).toBe(publicStages[i])
    keys.push('b')
    expect(narrowed[0]!.$match.key).toEqual({ $in: ['a'] })
  })

  it('keeps the keys pass cutoff when the clock passes midnight between the two passes', () => {
    // A property with a cheap offer last seen exactly on the cutoff day and a dearer one seen
    // recently is placed by the cheap price; a cards pass that recomputed the cutoff a second
    // later, after midnight UTC, would drop that offer and show the dearer one in its place.
    vi.setSystemTime(new Date('2026-11-20T23:59:59.900Z'))
    const { publicStages } = stagesFor(queryFor('precio'))
    const cutoffOf = (stages: object[]) => {
      const set = (stages as Stage[]).find(stage => stage.$set?.offers)!
      const conditions = set.$set.offers.$filter.cond.$and as Stage[]
      return conditions.find(condition => condition.$gte?.[0] === '$$offer.lastSeen')!.$gte[1]
    }
    expect(cutoffOf(publicStages)).toBe('2026-11-10')
    vi.setSystemTime(new Date('2026-11-21T00:00:00.400Z'))
    // A fresh derivation would have moved on…
    expect(cutoffOf(rentals.rentalPublicStages({}, rentals.RENTAL_STALE_DAYS))).toBe('2026-11-11')
    // …the cards pass does not.
    expect(cutoffOf(rentalDirectoryCardsStages(publicStages, ['a']))).toBe('2026-11-10')
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'))
  })
})

describe('orderByKeys', () => {
  it('puts the cards in the order of the keys pass', () => {
    const rows = [{ key: 'c' }, { key: 'a' }, { key: 'b' }]
    expect(orderByKeys(rows, ['a', 'b', 'c']).map(row => row.key)).toEqual(['a', 'b', 'c'])
  })

  it('drops a key the cards pass no longer returns: one card short, never a wrong card', () => {
    const rows = [
      { key: 'c', n: 3 },
      { key: 'a', n: 1 },
      { key: 'stray', n: 9 },
    ]
    expect(orderByKeys(rows, ['a', 'b', 'c'])).toEqual([
      { key: 'a', n: 1 },
      { key: 'c', n: 3 },
    ])
    expect(orderByKeys([], ['a'])).toEqual([])
    expect(orderByKeys(rows, [])).toEqual([])
  })
})
