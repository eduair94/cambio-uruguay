// Optional read-only integration check. $documents runs synthetic fixtures without creating a
// collection or writing anything. Set RENTALS_TEST_MONGO_URI to run it on MongoDB 6+.
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  RENTAL_COLLATION,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMatchingOffer,
  rentalMongoSort,
  rentalOfferStages,
  rentalPublicStages,
  type RentalOffer,
} from '../../utils/rentals'

const uri = process.env.RENTALS_TEST_MONGO_URI

describe.skipIf(!uri)('rental budgets evaluated by Mongo (read-only synthetic documents)', () => {
  let client: mongoose.mongo.MongoClient
  const date = new Date().toISOString().slice(0, 10)
  const offer = (changes: Partial<RentalOffer> = {}): RentalOffer => ({
    source: 'infocasas',
    listingId: 'infocasas:1',
    url: 'https://www.infocasas.com.uy/1',
    title: 'Apartamento',
    price: 30_000,
    currency: 'UYU',
    priceUyu: 30_000,
    commonExpenses: 5_000,
    commonExpensesCurrency: 'UYU',
    sellerName: '',
    sellerType: 'inmobiliaria',
    image: null,
    publishedAt: null,
    firstSeen: date,
    lastSeen: date,
    parkingSpaces: null,
    furnished: null,
    ...changes,
  })
  const doc = (key: string, offers: RentalOffer[], extras = {}) => ({
    key,
    lastSeen: date,
    freshAt: date,
    priceUyu: Math.min(...offers.map(row => row.priceUyu)),
    offers,
    sources: [...new Set(offers.map(row => row.source))],
    ...extras,
  })
  const fixtures = [
    doc('unknown', [offer({ commonExpenses: null })]),
    doc('free', [offer({ commonExpenses: 0, commonExpensesCurrency: null })]),
    doc('dollars', [offer({ commonExpenses: 100, commonExpensesCurrency: 'USD' })]),
    doc('unknown-currency', [offer({ commonExpensesCurrency: null })]),
    doc('split-budget', [
      offer({ commonExpenses: 10_000 }),
      offer({ listingId: 'infocasas:2', priceUyu: 34_000, commonExpenses: 2_000 }),
    ]),
    doc('split-owner', [
      offer({ sellerType: 'particular', commonExpenses: null }),
      offer({ listingId: 'infocasas:2', commonExpenses: 0 }),
    ]),
    doc('split-source', [
      offer({ source: 'casasweb', commonExpenses: 10_000 }),
      offer({ commonExpenses: 0 }),
    ]),
    doc('rounded', [offer({ priceUyu: 30_000, commonExpenses: 0.5 })]),
  ]

  beforeAll(async () => {
    client = new mongoose.mongo.MongoClient(uri!, {
      serverSelectionTimeoutMS: 8_000,
      maxPoolSize: 1,
    })
    await client.connect()
  })
  afterAll(async () => {
    await client?.close()
  })

  it('groups and selects neighborhood spellings consistently across list, map and facets', async () => {
    const documents = ['Cordón', 'CORDON', 'cordon', 'Malvín'].map((neighborhood, index) =>
      doc(`variant-${index}`, [offer()], {
        department: 'Montevideo',
        neighborhood,
        latitude: index === 2 ? null : -34.9,
        longitude: index === 2 ? null : -56.2,
      })
    )
    for (const neighborhood of ['Cordón', 'CORDON', 'cordon']) {
      const query = normalizeRentalQuery({ department: 'montevideo', neighborhood })
      const { filter, withoutNeighborhood } = buildRentalFilter(query, 10, 40)
      const rows = await client
        .db()
        .aggregate(
          [
            { $documents: documents },
            ...rentalPublicStages(filter, 10),
            { $sort: rentalMongoSort(query.sort) },
          ],
          { collation: RENTAL_COLLATION }
        )
        .toArray()
      expect(rows.map(row => row.key).sort()).toEqual(['variant-0', 'variant-1', 'variant-2'])
      const located = await client
        .db()
        .aggregate(
          [
            { $documents: documents },
            ...rentalPublicStages(
              {
                ...filter,
                latitude: { $type: 'number', $gte: -35.5, $lte: -30 },
                longitude: { $type: 'number', $gte: -58.6, $lte: -53 },
              },
              10
            ),
            { $count: 'total' },
          ],
          { collation: RENTAL_COLLATION }
        )
        .toArray()
      expect(located).toEqual([{ total: 2 }])
      const facets = await client
        .db()
        .aggregate(
          [
            { $documents: documents },
            ...rentalPublicStages(withoutNeighborhood, 10),
            { $group: { _id: '$neighborhood', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          { collation: RENTAL_COLLATION }
        )
        .toArray()
      expect(facets).toHaveLength(2)
      expect(facets[0]?.count).toBe(3)
      expect(facets[1]).toEqual({ _id: 'Malvín', count: 1 })
    }
  })

  it('agrees with the display helper across unknown expenses, currency conversion, and cross-offer traps', async () => {
    for (const input of [
      { monthlyMax: 33_000 },
      { monthlyMax: 35_000 },
      { monthlyMax: 37_000 },
      { monthlyMax: 35_000, dueno: 1 },
      { monthlyMax: 35_000, source: 'casasweb' },
      { monthlyMax: 30_000 },
      { expensesMax: 0 },
      { expensesMax: 4_000 },
      { gc: 1 },
      { currency: 'USD' },
      { priceMin: 32_000, priceMax: 38_000 },
    ]) {
      const query = normalizeRentalQuery(input)
      const { filter } = buildRentalFilter(query, 10, 40)
      const rows = await client
        .db()
        .aggregate([{ $documents: fixtures }, { $match: filter }, ...rentalOfferStages(query, 40)])
        .toArray()
      const expected = fixtures.filter(row => rentalMatchingOffer(row.offers, query, 40))
      expect(rows.map(row => row.key).sort(), JSON.stringify(input)).toEqual(
        expected.map(row => row.key).sort()
      )
      for (const row of rows) {
        const selected = rentalMatchingOffer(row.offers, query, 40)
        expect(row.priceUyu, `${row.key} ${JSON.stringify(input)}`).toBe(selected!.priceUyu)
      }
    }
  })

  it('sorts the offer meeting the budget before paging, even if another portal has a lower headline rent', async () => {
    const query = normalizeRentalQuery({ monthlyMax: 40_000, sort: 'precio' })
    const documents = [
      doc('cheap-rent-expensive-expenses', [
        offer({ priceUyu: 20_000, commonExpenses: 30_000 }),
        offer({ listingId: 'infocasas:2', priceUyu: 35_000, commonExpenses: 0 }),
      ]),
      doc('cheaper-valid-offer', [offer({ priceUyu: 32_000, commonExpenses: 1_000 })]),
    ]
    const rows = await client
      .db()
      .aggregate([
        { $documents: documents },
        { $match: buildRentalFilter(query, 10, 40).filter },
        ...rentalOfferStages(query, 40),
        { $sort: rentalMongoSort(query.sort) },
        { $limit: 1 },
      ])
      .toArray()
    expect(rows[0]?.key).toBe('cheaper-valid-offer')
  })

  it('fails closed on missing USD conversion and malformed historical expenses, without throwing', async () => {
    const query = normalizeRentalQuery({ monthlyMax: 40_000 })
    const documents = [
      ...fixtures,
      doc('bad-old-data', [offer({ commonExpenses: 'unknown' as unknown as number })]),
    ]
    const rows = await client
      .db()
      .aggregate([{ $documents: documents }, { $match: buildRentalFilter(query, 10, 0).filter }])
      .toArray()
    expect(rows.map(row => row.key)).not.toContain('dollars')
    expect(rows.map(row => row.key)).not.toContain('bad-old-data')
    expect(rows.map(row => row.key)).toContain('free')
  })

  it('never refreshes an old portal advert through a different portal, including facets and amenities', async () => {
    const oldDate = new Date(Date.now() - 65 * 86_400_000).toISOString().slice(0, 10)
    const old = offer({
      source: 'elpais',
      listingId: 'elpais:old',
      lastSeen: oldDate,
      priceUyu: 29_000,
      price: 725,
      currency: 'USD',
      commonExpenses: 0,
      sellerType: 'particular',
      petsAllowed: true,
      parkingSpaces: 2,
      furnished: true,
      guarantees: ['anda'],
    })
    const current = offer({ commonExpenses: null })
    const documents = [
      doc('refreshed-by-another-portal', [old, current], {
        petsAllowed: true,
        parkingSpaces: 2,
        furnished: true,
        guarantees: ['anda'],
      }),
    ]
    const rows = await client
      .db()
      .aggregate([
        { $documents: documents },
        ...rentalPublicStages(buildRentalFilter(normalizeRentalQuery({}), 10, 40).filter, 10),
      ])
      .toArray()
    expect(rows[0]).toMatchObject({
      priceUyu: 30_000,
      currency: 'UYU',
      sources: ['infocasas'],
      petsAllowed: null,
      parkingSpaces: null,
      furnished: null,
      guarantees: [],
    })
    expect(rows[0]?.offers).toHaveLength(1)
    for (const input of [
      { source: 'elpais' },
      { multi: 1 },
      { currency: 'USD' },
      { dueno: 1 },
      { pets: 1 },
      { parking: 1 },
      { furnished: 1 },
      { garantia: 'anda' },
      { expensesMax: 0 },
      { monthlyMax: 29_500 },
      { gc: 1 },
    ]) {
      const query = normalizeRentalQuery(input)
      const matches = await client
        .db()
        .aggregate([
          { $documents: documents },
          ...rentalPublicStages(buildRentalFilter(query, 10, 40).filter, 10),
        ])
        .toArray()
      expect(matches, JSON.stringify(input)).toEqual([])
    }
    const facets = await client
      .db()
      .aggregate([
        { $documents: documents },
        ...rentalPublicStages(buildRentalFilter(normalizeRentalQuery({}), 10, 40).nonLocation, 10),
        { $unwind: '$sources' },
        { $group: { _id: '$sources', count: { $sum: 1 } } },
      ])
      .toArray()
    expect(facets).toEqual([{ _id: 'infocasas', count: 1 }])
  })

  it('keeps a recently down source for ten days and excludes it after that without deleting history', async () => {
    const dated = (days: number) =>
      new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
    const documents = [
      doc('at-boundary', [offer({ lastSeen: dated(10), guarantees: ['anda'] })]),
      doc('expired', [offer({ lastSeen: dated(11), guarantees: ['anda'] })]),
      doc('missing-observation', [offer({ lastSeen: undefined as unknown as string })]),
    ]
    const query = normalizeRentalQuery({ garantia: 'anda' })
    const rows = await client
      .db()
      .aggregate([
        { $documents: documents },
        ...rentalPublicStages(buildRentalFilter(query, 10, 40).filter, 10),
      ])
      .toArray()
    expect(rows.map(row => row.key)).toEqual(['at-boundary'])
  })
})
