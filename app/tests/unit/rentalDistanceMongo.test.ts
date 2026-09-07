// Read-only: Mongo $documents evaluates synthetic fixtures without collection writes.
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  RENTAL_DISTANCE_SORT_FIELDS,
  rentalDistanceKm,
  rentalDistanceProjection,
  rentalDistanceStages,
} from '../../utils/rentalDistance'
import {
  RENTAL_COLLATION,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMongoSort,
  rentalOfferStages,
  rentalPublicStages,
} from '../../utils/rentals'
import { rentalPublicPropertyProjection } from '../../server/utils/rentalDetail'

const uri = process.env.RENTALS_TEST_MONGO_URI
describe.skipIf(!uri)('rental reference sorting in Mongo (read-only)', () => {
  let client: mongoose.mongo.MongoClient
  const today = new Date().toISOString().slice(0, 10)
  const old = '2020-01-01'
  const reference = { refLat: -34.9, refLng: -56.17 }
  const offer = (id: string, lat: unknown, lng: unknown, extra = {}) => ({
    listingId: id,
    source: 'infocasas',
    url: `https://www.infocasas.com.uy/qa/${id}`,
    priceUyu: 20000,
    price: 20000,
    currency: 'UYU',
    commonExpenses: 1000,
    commonExpensesCurrency: 'UYU',
    petsAllowed: true,
    firstSeen: today,
    lastSeen: today,
    identity: { version: 1, latitude: lat, longitude: lng, description: 'PRIVATE_IDENTITY' },
    details: { description: 'PRIVATE_RICH', images: ['PRIVATE_GALLERY'] },
    ...extra,
  })
  const doc = (key: string, lat: unknown, lng: unknown = -56.17, extra = {}) => ({
    key,
    title: 'Alquiler mensual sintético',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    latitude: lat,
    longitude: lng,
    lastSeen: today,
    priceUyu: 20000,
    offers: [offer(key, lat, lng)],
    ...extra,
  })
  const documents = [
    doc('near-b', -34.899),
    doc('far', -34.8),
    doc('origin', -34.9),
    doc('near-a', -34.899),
    doc('unknown-null', null),
    doc('unknown-missing', undefined),
    doc('unknown-string', '-34.9'),
    doc('unknown-object', { $gte: -34.9 }),
    doc('unknown-array', [-34.9]),
    doc('unknown-nan', NaN),
    doc('unknown-infinity', Infinity),
    doc('unknown-zero', 0, 0),
    doc('unknown-range', -34.9, -60),
    doc('unknown-no-evidence', -34.9, -56.17, {
      offers: [offer('legacy', -34.9, -56.17, { identity: {} })],
    }),
    doc('unknown-hidden', -34.9, -56.17, {
      offers: [
        offer('hidden', -34.9, -56.17, {
          identity: { version: 1, latitude: -34.9, longitude: -56.17, addressHidden: true },
        }),
      ],
    }),
    doc('unknown-conflict', -34.9, -56.17, {
      offers: [offer('own', -34.9, -56.17), offer('conflict', -34.89, -56.17)],
    }),
    doc('unknown-stale-evidence', -34.9, -56.17, {
      offers: [offer('old', -34.9, -56.17, { lastSeen: old }), offer('current', null, null)],
    }),
    doc('filtered-office', -34.9, -56.17, { propertyType: 'oficina' }),
    doc('filtered-pets', -34.9, -56.17, {
      offers: [offer('pets', -34.9, -56.17, { petsAllowed: null })],
    }),
    doc('filtered-price', -34.9, -56.17, {
      offers: [offer('expensive', -34.9, -56.17, { priceUyu: 40000 })],
    }),
    doc('filtered-stale', -34.9, -56.17, {
      offers: [offer('stale', -34.9, -56.17, { lastSeen: old })],
    }),
    doc('matching-offer', -34.898, -56.17, {
      offers: [
        offer('lower-ineligible', -34.898, -56.17, { priceUyu: 10000, petsAllowed: null }),
        offer('selected', -34.898, -56.17, { priceUyu: 22000 }),
      ],
    }),
  ]
  const query = normalizeRentalQuery({
    ...reference,
    sort: 'distancia',
    type: 'vivienda',
    pets: 1,
    monthlyMax: 30000,
  })
  const stages = () => [
    ...rentalPublicStages(buildRentalFilter(query, 10, 40).filter, 10),
    ...rentalOfferStages(query, 40),
    ...rentalDistanceStages(query),
    { $project: { ...rentalPublicPropertyProjection, ...rentalDistanceProjection(query) } },
    { $sort: rentalMongoSort(query.sort) },
  ]
  beforeAll(async () => {
    client = new mongoose.mongo.MongoClient(uri!, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 1,
    })
    await client.connect()
  })
  afterAll(async () => client?.close())
  const aggregate = (pipeline: Array<Record<string, unknown>>) =>
    client
      .db()
      .aggregate([{ $documents: { $literal: documents } }, ...pipeline], {
        collation: RENTAL_COLLATION,
        maxTimeMS: 10000,
        allowDiskUse: false,
      })
      .toArray()

  it('sorts the entire matching set before pagination, unknown last, with exact stable ties and no private evidence', async () => {
    const rows = await aggregate([...stages(), { $unset: [...RENTAL_DISTANCE_SORT_FIELDS] }])
    expect(rows.slice(0, 5).map(row => row.key)).toEqual([
      'origin',
      'near-a',
      'near-b',
      'matching-offer',
      'far',
    ])
    expect(rows.filter(row => row.distanceKm === null)).toHaveLength(13)
    expect(rows).toHaveLength(18)
    expect(rows.some(row => row.key.startsWith('filtered-'))).toBe(false)
    expect(rows.find(row => row.key === 'matching-offer')).toMatchObject({
      priceUyu: 22000,
      matchingOffer: { listingId: 'selected', priceUyu: 22000 },
    })
    for (const row of rows) {
      const raw = documents.find(doc => doc.key === row.key)!
      const current = { ...raw, offers: raw.offers.filter(offer => offer.lastSeen === today) }
      const expected = rentalDistanceKm(current, reference)
      if (expected === null) expect(row.distanceKm).toBeNull()
      else expect(row.distanceKm).toBeCloseTo(expected, 9)
    }
    expect(JSON.stringify(rows)).not.toMatch(/identity|PRIVATE|_rentalDistance/)
    const pages = []
    for (let page = 0; page < 3; page++) {
      pages.push(...(await aggregate([...stages(), { $skip: page * 6 }, { $limit: 6 }])))
    }
    expect(pages.map(row => row.key)).toEqual(rows.map(row => row.key))
  })

  it('keeps the same count and matching prices when only reference and presentation sort change', async () => {
    const without = normalizeRentalQuery({ ...query, sort: 'precio', refLat: null, refLng: null })
    const base = await aggregate([
      ...rentalPublicStages(buildRentalFilter(without, 10, 40).filter, 10),
      ...rentalOfferStages(without, 40),
      { $project: { _id: 0, key: 1, priceUyu: 1 } },
      { $sort: { key: 1 } },
    ])
    const ranked = await aggregate([
      ...stages(),
      { $project: { _id: 0, key: 1, priceUyu: 1 } },
      { $sort: { key: 1 } },
    ])
    expect(ranked).toEqual(base)
  })
})
