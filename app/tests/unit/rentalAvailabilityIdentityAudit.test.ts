import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import { rentalAvailabilityAdvertId } from '../../utils/rentalAvailability'
import { requireRentalAvailabilityUser } from '../../server/utils/rentalAvailabilityAuth'
import {
  availabilityEvidence,
  compatibleAvailabilityEvidence,
  resolveAvailabilityOwners,
  type RentalAvailabilityOffer,
} from '../../server/utils/rentalAvailabilityIdentity'
import { buildRentalAvailabilityIndex } from '../../server/utils/rentalAvailabilityIndex'
import type { RentalAvailabilityReportDoc } from '../../server/models/RentalAvailabilityReport'

const auth = vi.hoisted(() => ({ verify: vi.fn(), getUser: vi.fn() }))
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({ verifyIdToken: auth.verify, getUser: auth.getUser }),
}))

const request = (authorization: string | undefined = 'Bearer session-fixture') =>
  ({ node: { req: { headers: { authorization } } } }) as unknown as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  auth.verify.mockResolvedValue({
    uid: 'authenticated-owner',
    firebase: { sign_in_provider: 'custom' },
  })
  auth.getUser.mockResolvedValue({ uid: 'authenticated-owner', disabled: false })
})

describe('independent rental report authentication audit', () => {
  it('supports recoverable custom accounts without inventing an email requirement', async () => {
    await expect(requireRentalAvailabilityUser(request())).resolves.toEqual({
      uid: 'authenticated-owner',
    })
    expect(auth.verify).toHaveBeenCalledWith('session-fixture', true)
    expect(auth.getUser).toHaveBeenCalledWith('authenticated-owner')
  })

  it('rejects an anonymous session even if its account has an email', async () => {
    auth.verify.mockResolvedValue({
      uid: 'temporary-owner',
      firebase: { sign_in_provider: 'anonymous' },
    })
    auth.getUser.mockResolvedValue({
      uid: 'temporary-owner',
      disabled: false,
      email: 'fixture@example.invalid',
      emailVerified: true,
    })
    await expect(requireRentalAvailabilityUser(request())).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('checks the current disabled state rather than trusting a previously issued token', async () => {
    auth.getUser.mockResolvedValue({ uid: 'authenticated-owner', disabled: true })
    await expect(requireRentalAvailabilityUser(request())).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('rejects revoked sessions and does not proceed to account lookup', async () => {
    auth.verify.mockRejectedValue({ code: 'auth/id-token-revoked' })
    await expect(requireRentalAvailabilityUser(request())).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(auth.getUser).not.toHaveBeenCalled()
  })

  it('reports an authentication outage as unavailable without admitting the report', async () => {
    auth.getUser.mockRejectedValue({ code: 'app/network-error' })
    await expect(requireRentalAvailabilityUser(request())).rejects.toMatchObject({
      statusCode: 503,
    })
  })

  it.each(['', 'Bearer ', `Bearer ${'x'.repeat(8192)}`, 'Basic session-fixture'])(
    'rejects an invalid authorization header before calling Firebase',
    async header => {
      await expect(requireRentalAvailabilityUser(request(header))).rejects.toMatchObject({
        statusCode: 401,
      })
      expect(auth.verify).not.toHaveBeenCalled()
    }
  )
})

describe('rental report advert identity audit', () => {
  it('canonicalizes a source prefix once and keeps portals distinct', () => {
    expect(rentalAvailabilityAdvertId('infocasas', 'infocasas:194000001')).toBe(
      'rent:infocasas:194000001'
    )
    expect(rentalAvailabilityAdvertId('infocasas', '194000001')).toBe('rent:infocasas:194000001')
    expect(rentalAvailabilityAdvertId('casasweb', '194000001')).toBe('rent:casasweb:194000001')
  })

  it.each([
    ['infocasas', 'mercadolibre:194000001'],
    ['infocasas', 'rent:infocasas:194000001'],
    ['infocasas', 'sale:infocasas:194000001'],
    ['infocasas', { $ne: null }],
    ['__proto__', '194000001'],
    ['constructor', '194000001'],
  ])('rejects an inconsistent or injected source identity', (source, listingId) => {
    expect(rentalAvailabilityAdvertId(source, listingId)).toBeNull()
  })
})

const offer = (
  changes: Partial<RentalAvailabilityOffer> = {},
  ownChanges: Record<string, unknown> = {}
): RentalAvailabilityOffer => ({
  source: 'infocasas',
  listingId: 'infocasas:194000001',
  url: 'https://www.infocasas.com.uy/apartamento/194000001',
  title: 'Apartamento unidad 101, torre A',
  price: 30000,
  currency: 'UYU',
  priceUyu: 30000,
  commonExpenses: 4000,
  commonExpensesCurrency: 'UYU',
  sellerName: 'Anunciante de prueba',
  sellerType: 'inmobiliaria',
  image: null,
  parkingSpaces: null,
  furnished: null,
  publishedAt: null,
  firstSeen: '2026-08-20',
  lastSeen: '2026-09-06',
  identity: {
    version: 1,
    department: 'Montevideo',
    locality: 'Montevideo',
    neighborhood: 'Pocitos',
    propertyType: 'apartamento',
    address: 'Avenida Brasil 2345',
    street: 'avenida brasil',
    streetNumber: '2345',
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    ...ownChanges,
  },
  ...changes,
})
const now = new Date('2026-09-06T18:00:00Z')

describe('independent report continuity across scraper regrouping', () => {
  it('follows the own advert to a new key without borrowing the other unit in the old group', () => {
    const reported = offer()
    const other = offer({
      listingId: 'infocasas:194000002',
      title: 'Apartamento unidad 102, torre A',
    })
    const before = resolveAvailabilityOwners([{ key: 'old-group', offers: [reported, other] }], now)
    const after = resolveAvailabilityOwners(
      [
        { key: 'old-group', offers: [other] },
        { key: 'new-key-for-101', offers: [reported] },
      ],
      now
    )
    const id = 'rent:infocasas:194000001'
    expect(before.get(id)?.key).toBe('old-group')
    expect(after.get(id)?.key).toBe('new-key-for-101')
    expect(compatibleAvailabilityEvidence(before.get(id)!.evidence, after.get(id)!.evidence)).toBe(
      true
    )
    expect(after.get('rent:infocasas:194000002')?.key).toBe('old-group')
    expect(
      compatibleAvailabilityEvidence(
        before.get(id)!.evidence,
        after.get('rent:infocasas:194000002')!.evidence
      )
    ).toBe(false)
  })

  it('withholds a report target during duplicate-owner writes in either database order', () => {
    const rows = [
      { key: 'old-group', offers: [offer()] },
      { key: 'new-group', offers: [offer()] },
    ]
    expect(resolveAvailabilityOwners(rows, now).size).toBe(0)
    expect(resolveAvailabilityOwners([...rows].reverse(), now).size).toBe(0)
  })

  it('preserves identity through asking-price, expenses, photo and read-date changes', () => {
    const before = availabilityEvidence(offer())
    const after = availabilityEvidence(
      offer({
        price: 27000,
        priceUyu: 27000,
        commonExpenses: 4500,
        image: 'https://example.invalid/new-photo.jpg',
        lastSeen: '2026-09-07',
      })
    )
    expect(after).toEqual(before)
  })

  it.each([
    [{ title: 'Apartamento unidad 102, torre A' }, {}],
    [{ title: 'Apartamento unidad 101, torre B' }, {}],
    [{}, { department: 'Canelones', locality: 'Ciudad de la Costa' }],
    [{ title: 'Casa unidad 101, torre A' }, { propertyType: 'casa' }],
    [{}, { streetNumber: '2347', address: 'Avenida Brasil 2347' }],
  ])(
    'suspends an earlier report when the same portal ID changes physical identity',
    (change, own) => {
      expect(
        compatibleAvailabilityEvidence(
          availabilityEvidence(offer()),
          availabilityEvidence(offer(change, own))
        )
      ).toBe(false)
    }
  )

  it('does not fill missing own evidence from another canonical property', () => {
    const legacy = offer({ identity: undefined, title: 'Apartamento en alquiler' })
    const rows = [
      {
        key: 'canonical-group',
        department: 'Maldonado',
        address: 'Otra calle 99 unidad 401',
        bedrooms: 4,
        offers: [legacy],
      },
    ]
    const own = resolveAvailabilityOwners(rows, now).get('rent:infocasas:194000001')!.evidence
    expect(own.department).toBe('')
    expect(own.streetNumber).toBe('')
    expect(own.bedrooms).toBeNull()
    expect(own.units).toEqual([])
  })

  it('withholds a hidden street from evidence and excludes aged adverts as active targets', () => {
    const hidden = availabilityEvidence(offer({}, { addressHidden: true }))
    expect(hidden.street).toBe('')
    expect(hidden.streetNumber).toBe('')
    expect(
      resolveAvailabilityOwners([{ key: 'aged', offers: [offer({ lastSeen: '2026-08-20' })] }], now)
        .size
    ).toBe(0)
  })

  it('does not let a shared amenity floor mask a changed apartment floor', () => {
    const previous = availabilityEvidence(
      offer({ title: 'Apartamento en tercer piso' }, { description: 'Gimnasio en planta baja.' })
    )
    const current = availabilityEvidence(
      offer({ title: 'Apartamento en cuarto piso' }, { description: 'Gimnasio en planta baja.' })
    )
    expect(compatibleAvailabilityEvidence(previous, current)).toBe(false)
  })
})

const report = (
  uid: string,
  changes: Partial<RentalAvailabilityReportDoc> = {}
): RentalAvailabilityReportDoc => ({
  _id: `private-row-${uid}`,
  revision: '11111111-1111-4111-8111-111111111111',
  uid,
  advertId: 'rent:infocasas:194000001',
  source: 'infocasas',
  listingId: '194000001',
  evidence: availabilityEvidence(offer()),
  reportedAt: new Date('2026-09-05T18:00:00Z'),
  expiresAt: new Date('2026-10-05T18:00:00Z'),
  withdrawnAt: null,
  ...changes,
})

describe('independent public report counting audit', () => {
  it('counts distinct accounts, not repeated records, and publishes no voter or evidence', () => {
    const index = buildRentalAvailabilityIndex(
      [report('account-a'), report('account-a'), report('account-b')],
      resolveAvailabilityOwners([{ key: 'current-owner', offers: [offer()] }], now),
      now
    )
    const summary = index.summaryForOffers([offer()], 'current-owner')
    expect(summary).toEqual({
      count: 2,
      lastReportedAt: '2026-09-05T18:00:00.000Z',
      status: 'unconfirmed',
    })
    expect(index.excludedAdvertIds('all')).toEqual([])
    expect(index.excludedAdvertIds('hide_multiple')).toEqual(['rent:infocasas:194000001'])
    const publicText = JSON.stringify([...index.byAdvertId])
    for (const privateValue of ['account-a', 'account-b', 'evidence', '2345', 'revision'])
      expect(publicText).not.toContain(privateValue)
  })

  it('keeps another unreported source accessible and does not inherit votes through the group key', () => {
    const sibling = offer({ source: 'casasweb', listingId: 'casasweb:194000001' })
    const index = buildRentalAvailabilityIndex(
      [report('account-a'), report('account-b')],
      resolveAvailabilityOwners(
        [
          { key: 'old-group', offers: [sibling] },
          { key: 'new-owner', offers: [offer()] },
        ],
        now
      ),
      now
    )
    expect(index.summaryForOffers([sibling], 'old-group').count).toBe(0)
    expect(index.summaryForOffers([offer()], 'old-group').count).toBe(0)
    expect(index.summaryForOffers([offer()], 'new-owner').count).toBe(2)
    expect(index.excludedAdvertIds('hide_any')).toEqual(['rent:infocasas:194000001'])
  })

  it('counts one account once in a grouped summary even when it reported both source adverts', () => {
    const sibling = offer({ source: 'casasweb', listingId: 'casasweb:194000001' })
    const index = buildRentalAvailabilityIndex(
      [
        report('account-a'),
        report('account-a', {
          advertId: 'rent:casasweb:194000001',
          source: 'casasweb',
        }),
      ],
      resolveAvailabilityOwners([{ key: 'current-owner', offers: [offer(), sibling] }], now),
      now
    )
    expect(index.summaryForOffers([offer(), sibling], 'current-owner').count).toBe(1)
    expect(index.excludedAdvertIds('hide_multiple')).toEqual([])
  })

  it('expires at the report boundary despite a fresh scrape, without modifying stored dates', () => {
    const rows = [
      report('expired', { expiresAt: new Date(now) }),
      report('withdrawn', { withdrawnAt: new Date('2026-09-06T17:00:00Z') }),
      report('future', { reportedAt: new Date('2026-09-07T18:00:00Z') }),
    ]
    const stored = JSON.stringify(rows)
    const index = buildRentalAvailabilityIndex(
      rows,
      resolveAvailabilityOwners([{ key: 'freshly-scraped', offers: [offer()] }], now),
      now
    )
    expect(index.byAdvertId.size).toBe(0)
    expect(JSON.stringify(rows)).toBe(stored)
  })

  it('suppresses earlier votes when the current own advert identifies a different unit', () => {
    const index = buildRentalAvailabilityIndex(
      [report('account-a'), report('account-b')],
      resolveAvailabilityOwners(
        [{ key: 'same-key', offers: [offer({ title: 'Apartamento unidad 102, torre A' })] }],
        now
      ),
      now
    )
    expect(index.byAdvertId.size).toBe(0)
  })
})
