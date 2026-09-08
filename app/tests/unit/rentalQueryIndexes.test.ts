import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import {
  RENTAL_QUERY_INDEXES,
  planRentalQueryIndexes,
  prepareRentalQueryIndexes,
} from '../../scripts/rental-query-indexes.mjs'
import { rentalDetailStages } from '../../server/utils/rentalDetail'
import { rentalPageEvidenceStages, rentalPageIdentityStages } from '../../server/utils/rentalPage'
import { normalizeRentalQuery, RENTAL_COLLATION, RENTAL_STALE_DAYS } from '../../utils/rentals'

const unique = { name: 'key_1', key: { key: 1 }, unique: true }
describe('explicit rental index plan', () => {
  it('plans three nonunique indexes without replacing the simple unique key', async () => {
    const collection = {
      collectionName: 'rentallistings',
      listIndexes: () => ({ toArray: async () => [unique] }),
      createIndex: vi.fn(),
    }
    expect((await prepareRentalQueryIndexes(collection)).indexes).toEqual(
      RENTAL_QUERY_INDEXES.map(index => ({ ...index, action: 'create' }))
    )
    expect(collection.createIndex).not.toHaveBeenCalled()
    expect(RENTAL_QUERY_INDEXES.every(index => index.unique === false)).toBe(true)
  })

  it('recognizes equivalent named indexes with Mongo collation defaults', () => {
    const existing = RENTAL_QUERY_INDEXES.map(index => ({
      ...index,
      collation: { ...index.collation, caseLevel: false, numericOrdering: false, version: '57.1' },
    }))
    expect(
      planRentalQueryIndexes([unique, ...existing]).every(index => index.action === 'present')
    ).toBe(true)
  })

  it.each([
    { unique: true },
    { hidden: true },
    { sparse: true },
    { partialFilterExpression: { active: true } },
    { expireAfterSeconds: 60 },
    { collation: { locale: 'es', strength: 2 } },
    { collation: { locale: 'es', strength: 1, numericOrdering: true } },
    { key: { department: 1 } },
  ])(
    'preflights every definition before any write when reserved options conflict %j',
    async changed => {
      const last = { ...RENTAL_QUERY_INDEXES[2], ...changed }
      const collection = {
        listIndexes: () => ({ toArray: async () => [unique, last] }),
        createIndex: vi.fn(),
      }
      await expect(prepareRentalQueryIndexes(collection, true)).rejects.toThrow(
        'Index definition conflicts'
      )
      expect(collection.createIndex).not.toHaveBeenCalled()
    }
  )

  it('refuses to operate without the unique simple key invariant', () => {
    expect(() => planRentalQueryIndexes(RENTAL_QUERY_INDEXES)).toThrow('unique simple key')
  })
})

const uri = process.env.RENTALS_INDEX_TEST_MONGO_URI
describe.skipIf(!uri)('actual rental pipelines with reviewed indexes on isolated Mongo', () => {
  let client: mongoose.mongo.MongoClient
  let collection: mongoose.mongo.Collection
  const at = new Date().toISOString()
  const offer = (source: string, listingId: string, lastSeen = at) => ({
    source,
    listingId,
    title: 'Alquiler permanente apartamento',
    price: 16000,
    priceUyu: 16000,
    currency: 'UYU',
    url: `https://www.infocasas.com.uy/${listingId}`,
    firstSeen: at,
    lastSeen,
  })
  const target = {
    key: 'qa-target',
    title: 'Alquiler de apartamento en Cordón',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    bedrooms: 1,
    bathrooms: 1,
    price: 16000,
    priceUyu: 16000,
    currency: 'UYU',
    firstSeen: at,
    lastSeen: at,
    offers: [offer('infocasas', 'infocasas:qa-shared')],
  }
  const plans = (value: any): Array<{ stage: string; indexName?: string }> => {
    if (!value || typeof value !== 'object') return []
    const own = value.stage
      ? [{ stage: value.stage, ...(value.indexName ? { indexName: value.indexName } : {}) }]
      : []
    return [...own, ...Object.values(value).flatMap(child => plans(child))]
  }

  beforeAll(async () => {
    const location = new URL(uri!)
    if (
      !['127.0.0.1', 'localhost'].includes(location.hostname) ||
      location.pathname !== '/rental-index-qa'
    ) {
      throw new Error('Index tests may write only to localhost/rental-index-qa')
    }
    client = new mongoose.mongo.MongoClient(uri!, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 3000,
    })
    await client.connect()
    collection = client.db().collection(`qa_rental_indexes_${process.pid}`)
    await collection.insertMany([
      ...Array.from({ length: 900 }, (_, i) => ({
        ...target,
        key: `qa-background-${i}`,
        neighborhood: `Zona ${i % 40}`,
        bedrooms: i % 4,
        offers: [offer('infocasas', `infocasas:background-${i}`)],
      })),
      { ...target },
      { ...target, key: 'qa-real-other-owner' },
      { ...target, key: 'qa-wrong-source', offers: [offer('casasweb', 'infocasas:qa-shared')] },
      {
        ...target,
        key: 'qa-split-offers',
        offers: [offer('infocasas', 'other'), offer('casasweb', 'infocasas:qa-shared')],
      },
      {
        ...target,
        key: 'qa-expired-offer',
        offers: [
          offer('infocasas', 'infocasas:qa-shared', '2020-01-01'),
          offer('infocasas', 'active-other'),
        ],
      },
    ])
    await collection.createIndex({ key: 1 }, { unique: true, name: 'key_1' })
  })
  afterAll(async () => {
    if (collection?.collectionName === `qa_rental_indexes_${process.pid}`) await collection.drop()
    await client?.close()
  })

  it('preserves exact results while replacing three initial scans with index scans, then reapplies idempotently', async () => {
    const pipelines = [
      rentalDetailStages(target.key, normalizeRentalQuery({}), RENTAL_STALE_DAYS, 40),
      rentalPageIdentityStages(target as any),
      rentalPageEvidenceStages(target as any)!,
    ]
    const read = (pipeline: any[]) =>
      collection.aggregate(pipeline, { collation: RENTAL_COLLATION, maxTimeMS: 10000 }).toArray()
    const explain = (pipeline: any[]) =>
      collection
        .aggregate(pipeline, { collation: RENTAL_COLLATION, maxTimeMS: 10000 })
        .explain('executionStats')
    const before = []
    for (const pipeline of pipelines) {
      before.push(await read(pipeline))
      expect(plans(await explain(pipeline)).some(plan => plan.stage === 'COLLSCAN')).toBe(true)
    }
    expect(before[1].map(row => row.key)).toEqual(['qa-real-other-owner'])

    const applied = await prepareRentalQueryIndexes(collection, true)
    expect(applied.created).toEqual(RENTAL_QUERY_INDEXES.map(index => index.name))
    for (const [i, pipeline] of pipelines.entries()) {
      const result = await read(pipeline)
      expect(result.sort((a, b) => a.key.localeCompare(b.key))).toEqual(
        before[i].sort((a, b) => a.key.localeCompare(b.key))
      )
      const plan = plans(await explain(pipeline))
      expect(plan.some(stage => stage.stage === 'COLLSCAN')).toBe(false)
      expect(plan.some(stage => stage.indexName === RENTAL_QUERY_INDEXES[i].name)).toBe(true)
    }
    expect((await prepareRentalQueryIndexes(collection, true)).created).toEqual([])
    expect((await collection.indexes()).find(index => index.name === 'key_1')?.unique).toBe(true)
    // The new collated lookup must not introduce case/accent-insensitive uniqueness.
    await expect(collection.insertOne({ ...target, key: 'QÁ-TARGET' })).resolves.toBeDefined()
    await expect(collection.insertOne({ ...target })).rejects.toMatchObject({ code: 11000 })
  }, 30000)
})
