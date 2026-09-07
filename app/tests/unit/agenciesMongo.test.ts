// Optional read-only Mongo integration; $documents creates no collections or rows.
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { agencyGroupingStages, loadAgencyProfileContact } from '../../server/utils/agencies'
import { RentalListingModel } from '../../server/models/RentalListing'
import { PropertySaleCatalogModel } from '../../server/models/PropertySaleCatalog'
import { buildAgencyDirectory } from '../../utils/agencies'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  rentalOfferStages,
  rentalPublicStages,
} from '../../utils/rentals'
import { normalizePropertySalesQuery } from '../../utils/propertySales'
import { propertySalesStages } from '../../utils/propertySalesQuery'
import { advertiserMatches } from '../../utils/propertyAdvertiser'
const uri = process.env.RENTALS_TEST_MONGO_URI
describe.skipIf(!uri)('source-agency matching in Mongo without writes', () => {
  let client: mongoose.mongo.MongoClient
  const now = Date.now(),
    at = new Date(now).toISOString(),
    day = at.slice(0, 10)
  const agency = (id: string) => ({
    version: 1,
    key: `infocasas:${id}`,
    name: 'Homónimo',
    profileUrl: `https://www.infocasas.com.uy/inmobiliarias/perfil/${id}-empresa`,
    observedAt: at,
  })
  const offer = (id: string, company: string | null, amount = 20000) => ({
    source: 'infocasas',
    listingId: id,
    url: `https://www.infocasas.com.uy/propiedad/${id}`,
    title: 'Alquiler',
    price: amount,
    priceUyu: amount,
    currency: 'UYU',
    sellerType: company ? 'inmobiliaria' : 'particular',
    agency: company ? agency(company) : null,
    lastSeen: day,
    firstSeen: day,
    commonExpenses: 1000,
    commonExpensesCurrency: 'UYU',
  })
  const property = (key: string, offers: ReturnType<typeof offer>[]) => ({
    key,
    title: 'Alquiler',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    priceUyu: Math.min(...offers.map(o => o.priceUyu)),
    price: 20000,
    currency: 'UYU',
    lastSeen: day,
    firstSeen: day,
    freshAt: day,
    sources: ['infocasas'],
    offers,
  })
  beforeAll(async () => {
    client = new mongoose.mongo.MongoClient(uri!)
    await client.connect()
  })
  afterAll(async () => {
    await client?.close()
  })
  it('counts a qualified/unqualified ID once and excludes ambiguous source-agency ownership', async () => {
    const docs = [
      property('a', [offer('1', '10')]),
      property('legacy', [offer('infocasas:1', '10')]),
      property('b', [offer('2', '10')]),
      property('c', [offer('2', '20')]),
      property('d', [offer('3', '20')]),
    ]
    const rows = await client
      .db()
      .aggregate([{ $documents: docs }, ...agencyGroupingStages('rent', now)])
      .toArray()
    const output = buildAgencyDirectory(rows as any, now)
    expect(output).toHaveLength(2)
    expect(output.map(a => a.listings)).toEqual([1, 1])
    expect(JSON.stringify(rows)).not.toContain('offers')
  })
  it('validates every contributing source/profile before adding it to a valid agency counter', async () => {
    const malformed = [
      { ...offer('wrong-source', '10'), source: 'casasweb' },
      {
        ...offer('wrong-profile', '10'),
        agency: { ...agency('10'), profileUrl: agency('20').profileUrl },
      },
      { ...offer('private', '10'), sellerType: 'particular' },
      { ...offer('script', '10'), agency: { ...agency('10'), profileUrl: 'javascript:alert(1)' } },
    ]
    const docs = [
      property('valid', [offer('1', '10')]),
      ...malformed.map((row, index) => property(`bad-${index}`, [row])),
    ]
    const rows = await client
      .db()
      .aggregate([{ $documents: docs }, ...agencyGroupingStages('rent', now)])
      .toArray()
    expect(buildAgencyDirectory(rows as any, now)).toMatchObject([
      { agency: { key: 'infocasas:10' }, listings: 1 },
    ])
  })
  it('preserves the particular/agency contradiction guard in the real profile-contact projection', async () => {
    const profile = agency('10')
    const channels = [
      { kind: 'email', value: 'public@example.org', sourceUrl: profile.profileUrl, observedAt: at },
    ]
    let documents = [
      property('contact', [
        {
          ...offer('1', '10'),
          sellerType: 'particular',
          publicContact: { version: 1, name: 'Office', channels },
        } as any,
      ]),
    ]
    const rent = vi.spyOn(RentalListingModel, 'aggregate').mockImplementation(
      (stages: any) =>
        ({
          option: () =>
            client
              .db()
              .aggregate([{ $documents: documents }, ...stages])
              .toArray(),
        }) as any
    )
    const sales = vi
      .spyOn(PropertySaleCatalogModel, 'aggregate')
      .mockImplementation(() => ({ option: async () => [] }) as any)
    try {
      expect(await loadAgencyProfileContact(profile as any)).toBeNull()
      documents = [
        property('contact', [
          { ...offer('1', '10'), publicContact: { version: 1, name: 'Office', channels } } as any,
        ]),
      ]
      expect(await loadAgencyProfileContact(profile as any)).toMatchObject({ channels })
    } finally {
      rent.mockRestore()
      sales.mockRestore()
    }
  })
  it('prices only the chosen agency offer before counts and sort; stale evidence does not pass', async () => {
    const old = {
      ...offer('old', '10'),
      agency: { ...agency('10'), observedAt: '2020-01-01T00:00:00Z' },
    }
    const docs = [
      property('mixed', [offer('1', '20', 10000), offer('2', '10', 30000)]),
      property('stale', [old]),
    ]
    const query = normalizeRentalQuery({ agency: 'infocasas:10' })
    const rows = await client
      .db()
      .aggregate([
        { $documents: docs },
        ...rentalPublicStages(buildRentalFilter(query, 10, 40).filter, 10),
        ...rentalOfferStages(query, 40),
      ])
      .toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      key: 'mixed',
      priceUyu: 30000,
      matchingOffer: { listingId: '2' },
    })
  })
  it('explicit owner agrees in JS/Mongo and cannot borrow a declaration from another publication', async () => {
    const base = offer('owner', null)
    const declaration = {
      declared: true,
      evidence: 'advert_text',
      sourceUrl: base.url,
      observedAt: at,
    }
    const rows = [
      base,
      { ...base, listingId: 'explicit', ownerDirect: declaration },
      {
        ...base,
        listingId: 'stale',
        ownerDirect: { ...declaration, observedAt: '2020-01-01T00:00:00Z' },
      },
      { ...base, listingId: 'agency', ownerDirect: declaration, agency: agency('10') },
      {
        ...base,
        listingId: 'foreign',
        ownerDirect: { ...declaration, sourceUrl: 'https://www.infocasas.com.uy/another/5' },
      },
    ]
    const docs = rows.map((row, index) => property(String(index), [row]))
    const query = normalizeRentalQuery({ dueno: 1 })
    const result = await client
      .db()
      .aggregate([
        { $documents: docs },
        ...rentalPublicStages(buildRentalFilter(query, 10, 40).filter, 10),
        ...rentalOfferStages(query, 40),
      ])
      .toArray()
    expect(result.map(row => row.matchingOffer.listingId)).toEqual(
      rows.filter(row => advertiserMatches(row, query, now)).map(row => row.listingId)
    )
    expect(result).toHaveLength(1)
  })
  it('sales uses the same native profile predicate, without operation or source collisions', async () => {
    const sale = (id: string, company: string) => ({
      ...offer(id, company),
      operation: 'sale',
      propertyType: 'apartamento',
      price: { amount: 100000, currency: 'USD' },
      lastSeen: at,
      areas: { built: 50 },
    })
    const rows = await client
      .db()
      .aggregate([
        {
          $documents: [
            sale('a', '10'),
            sale('b', '20'),
            { ...sale('c', '10'), source: 'casasweb' },
          ],
        },
        ...propertySalesStages(normalizePropertySalesQuery({ agency: 'infocasas:10' }), 40, now),
      ])
      .toArray()
    expect(rows.map(row => row.listingId)).toEqual(['a'])
  })
})
