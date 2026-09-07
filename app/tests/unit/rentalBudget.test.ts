import { describe, expect, it } from 'vitest'
import {
  normalizeRentalBudgetQuery,
  rentalBudgetQueryToParams,
  RENTAL_BUDGET_BANDS,
} from '../../utils/rentalBudget'
import {
  projectRentalBudgetProperty,
  queryRentalBudget,
  rentalBudgetExplicitNoExpenses,
  rentalBudgetOwnExpenses,
  selectRentalBudgetOffer,
} from '../../server/utils/rentalBudget'
import { buildRentalAvailabilityIndex } from '../../server/utils/rentalAvailabilityIndex'
import {
  availabilityEvidence,
  resolveAvailabilityOwners,
} from '../../server/utils/rentalAvailabilityIdentity'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'
import type { RentalAvailabilityReportDoc } from '../../server/models/RentalAvailabilityReport'

const now = new Date('2026-09-07T00:00:00Z')
const own = (id: string, price = 10000, changes: Record<string, unknown> = {}) =>
  ({
    source: 'infocasas',
    listingId: id,
    title: 'Alquiler apartamento unidad 101',
    url: 'https://www.infocasas.com.uy/fixture/101',
    price,
    priceUyu: price,
    currency: 'UYU',
    commonExpenses: null,
    commonExpensesCurrency: null,
    lastSeen: now.toISOString(),
    firstSeen: now.toISOString(),
    sellerName: 'Anunciante QA',
    sellerType: 'inmobiliaria',
    identity: {
      version: 1,
      propertyType: 'apartamento',
      description: 'Alquiler mensual de vivienda. Unidad 101.',
    },
    details: {
      description: 'Alquiler mensual de vivienda. Unidad 101.',
      images: ['PRIVATE-LARGE-GALLERY'],
    },
    privateContact: 'PRIVATE-CONTACT',
    ...changes,
  }) as unknown as RentalOffer & {
    identity: { version: number; propertyType: string; description: string }
  }
const property = (key: string, offers = [own(key)], changes: Record<string, unknown> = {}) =>
  ({
    key,
    title: 'Apartamento QA',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    bedrooms: 1,
    bathrooms: 1,
    area: 40,
    price: offers[0]!.price,
    priceUyu: offers[0]!.priceUyu,
    currency: 'UYU',
    firstSeen: now.toISOString(),
    lastSeen: now.toISOString(),
    offers,
    sources: ['infocasas'],
    privateOwner: 'PRIVATE-OWNER',
    addressKey: 'PRIVATE-ADDRESS',
    ...changes,
  }) as unknown as RentalPublicProperty
const index = () => buildRentalAvailabilityIndex([], new Map(), now)
const catalogue = (rows: RentalPublicProperty[]) => ({
  generatedAt: now.toISOString(),
  usdUyu: 40,
  properties: rows.map(row => projectRentalBudgetProperty(row)!).filter(Boolean),
})

describe('economic rental contracts', () => {
  it('has five exact disjoint UYU bands and safely round-trips URL state', () => {
    expect(RENTAL_BUDGET_BANDS.map(band => [band.minExclusive, band.maxInclusive])).toEqual([
      [0, 10000],
      [10000, 13000],
      [13000, 16000],
      [16000, 20000],
      [20000, 25000],
    ])
    const query = normalizeRentalBudgetQuery({
      band: '13000_16000',
      basis: 'monthly',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      type: 'casa',
      bedrooms: '0',
      availability: 'hide_any',
      page: '2',
    })
    expect(normalizeRentalBudgetQuery(rentalBudgetQueryToParams(query))).toEqual(query)
    expect(
      normalizeRentalBudgetQuery({
        band: {},
        basis: 'unknown',
        type: 'oficina',
        page: '-1',
        perPage: 1000,
      })
    ).toMatchObject({ band: 'under10000', basis: 'rent', type: 'all', page: 1, perPage: 48 })
  })

  it('puts exact boundaries in only one band and paginates the complete sorted universe', () => {
    const source = catalogue(
      [10000, 10001, 13000, 13001, 16000, 16001, 20000, 20001, 25000].map((price, i) =>
        property(`p${i}`, [own(`a${i}`, price)])
      )
    )
    const counts = RENTAL_BUDGET_BANDS.map(
      band => queryRentalBudget(source, { band: band.id }, index(), now).total
    )
    expect(counts).toEqual([1, 2, 2, 2, 2])
    expect(counts.reduce((a, b) => a + b, 0)).toBe(source.properties.length)
    const many = catalogue(
      Array.from({ length: 401 }, (_, i) =>
        property(`p${String(i).padStart(3, '0')}`, [own(`a${i}`, 10001 + i)])
      )
    )
    const result = queryRentalBudget(
      many,
      { band: '10000_13000', page: 9, perPage: 48 },
      index(),
      now
    )
    expect(result.total).toBe(401)
    expect(result.items).toHaveLength(17)
    expect(result.items[0]!.key).toBe('p384')
  })
})

describe('economic rental amounts and projection', () => {
  it('never pairs one portal rent with another portal common expenses', () => {
    const a = own('a', 10000, { commonExpenses: 6000, commonExpensesCurrency: 'UYU' })
    const b = own('b', 12000, {
      source: 'casasweb',
      commonExpenses: 1000,
      commonExpensesCurrency: 'UYU',
    })
    expect(selectRentalBudgetOffer([a, b], 'rent', 40)?.offer.listingId).toBe('a')
    expect(selectRentalBudgetOffer([a, b], 'monthly', 40)).toMatchObject({
      offer: { listingId: 'b' },
      budget: { amountUyu: 13000, rentUyu: 12000, expensesUyu: 1000, monthlyUyu: 13000 },
    })
    const source = catalogue([property('group', [a, b])])
    expect(
      queryRentalBudget(source, { basis: 'monthly', band: '10000_13000' }, index(), now).total
    ).toBe(1)
    expect(
      queryRentalBudget(source, { basis: 'monthly', band: '13000_16000' }, index(), now).total
    ).toBe(0)
  })

  it('base price accepts pending expenses while total excludes unknown amount or currency', () => {
    const source = catalogue([
      property('unknown', [own('unknown')]),
      property('currency', [
        own('currency', 9000, { commonExpenses: 100, commonExpensesCurrency: 'ARS' }),
      ]),
    ])
    const base = queryRentalBudget(source, {}, index(), now)
    expect(base.total).toBe(2)
    expect(base.pendingExpensesCount).toBe(2)
    expect(queryRentalBudget(source, { basis: 'monthly' }, index(), now)).toMatchObject({
      total: 0,
      pendingExpensesCount: 2,
      bands: [
        expect.objectContaining({ pendingExpensesCount: 2 }),
        ...RENTAL_BUDGET_BANDS.slice(1).map(band =>
          expect.objectContaining({ id: band.id, pendingExpensesCount: 0 })
        ),
      ],
    })
  })

  it('zero expenses needs explicit own monthly-expenses evidence and does not borrow it', () => {
    for (const text of ['Sin gastos comunes', 'Gastos comunes: no tiene', 'G.C.: $0'])
      expect(rentalBudgetExplicitNoExpenses('', text)).toBe(true)
    expect(rentalBudgetExplicitNoExpenses('', 'Gastos de ocupación exonerados')).toBe(false)
    const original = own('a', 10000, { commonExpenses: 0, commonExpensesCurrency: 'UYU' })
    expect(projectRentalBudgetProperty(property('g', [original]))!.offers[0]!.commonExpenses).toBe(
      null
    )
    const declared = own('b', 10000, {
      commonExpenses: 0,
      commonExpensesCurrency: 'UYU',
      identity: {
        version: 1,
        propertyType: 'apartamento',
        description: 'Alquiler mensual. Sin gastos comunes.',
      },
    })
    expect(
      projectRentalBudgetProperty(property('g', [original, declared]))!.offers.map(
        o => o.commonExpenses
      )
    ).toEqual([null, 0])
  })

  it('uses the directory FX math and cannot calculate positive USD expenses without a rate', () => {
    const offer = own('a', 10000, { commonExpenses: 100, commonExpensesCurrency: 'USD' })
    expect(selectRentalBudgetOffer([offer], 'monthly', 40)?.budget.monthlyUyu).toBe(14000)
    expect(selectRentalBudgetOffer([offer], 'monthly', 0)).toBe(null)
  })

  it('recovers only an unconditional explicit zero from the same advert', () => {
    for (const text of ['PRECIO 12000\nSIN GC', 'Gastos comunes: NO TIENE', 'G.C.: $0']) {
      expect(rentalBudgetOwnExpenses(own('same'), text)).toEqual({
        commonExpenses: 0,
        commonExpensesCurrency: 'UYU',
      })
    }
    for (const text of [
      'No es sin gastos comunes',
      'Nunca se ofrece sin GC',
      'Sin gastos comunes durante el primer mes',
      'GC $0 por los primeros meses',
      '¿Sin gastos comunes?',
      'Gastos de ocupación exonerados',
    ]) {
      expect(rentalBudgetExplicitNoExpenses('', text)).toBe(false)
      expect(
        rentalBudgetOwnExpenses(own('same', 12000, { commonExpenses: 0 }), text).commonExpenses
      ).toBe(null)
    }
  })

  it('withholds conflicting own expenses rather than claim a reliable monthly total', () => {
    const published = own('same', 12000, { commonExpenses: 1500, commonExpensesCurrency: 'UYU' })
    for (const text of [
      'Sin GC',
      'GC $1.000',
      'Gastos comunes: 1500. Otra unidad GC 1000',
      'Gastos comunes USD 1500',
      'Gastos comunes $0; GC aprox $1.500',
    ])
      expect(rentalBudgetOwnExpenses(published, text).commonExpenses).toBe(null)
    expect(rentalBudgetOwnExpenses(published, 'Gastos comunes: $1.500')).toEqual({
      commonExpenses: 1500,
      commonExpensesCurrency: 'UYU',
    })
    expect(
      rentalBudgetOwnExpenses(own('unknown'), 'Sin GC. Gastos comunes $1000').commonExpenses
    ).toBe(null)
  })

  it('only own residential/rental evidence can admit an advert and no private text survives', () => {
    const temporal = own('day', 3000, { title: 'Alquiler por día apartamento' })
    const legacy = own('old', 5000, { identity: undefined })
    const source = property('g', [temporal, legacy, own('valid')], {
      privateOwner: 'PRIVATE-OWNER',
    })
    const output = projectRentalBudgetProperty(source)!
    expect(output.offers.map(offer => offer.listingId)).toEqual(['valid'])
    expect(JSON.stringify(output)).not.toMatch(
      /PRIVATE-|identity|description|details|privateContact|addressKey/
    )
    expect(source.offers).toHaveLength(3)
  })
})

describe('economic rental live filters', () => {
  it('reapplies expiry and per-advert reports before choosing price, band and page', () => {
    const a = own('a', 9000),
      b = own('b', 11000, { source: 'casasweb' })
    const row = property('group', [a, b])
    const reports = ['u1', 'u2'].map(uid => ({
      _id: uid,
      uid,
      advertId: 'rent:infocasas:a',
      source: 'infocasas',
      listingId: 'a',
      revision: uid,
      evidence: availabilityEvidence(a),
      reportedAt: now,
      expiresAt: new Date(now.getTime() + 86400000),
      withdrawnAt: null,
    })) as RentalAvailabilityReportDoc[]
    const reportsIndex = buildRentalAvailabilityIndex(
      reports,
      resolveAvailabilityOwners([row], now),
      now
    )
    const source = catalogue([
      row,
      property('old', [own('stale', 8000, { lastSeen: '2000-01-01' })]),
    ])
    expect(queryRentalBudget(source, {}, reportsIndex, now).total).toBe(1)
    expect(
      queryRentalBudget(source, { availability: 'hide_multiple' }, reportsIndex, now).total
    ).toBe(0)
    const remaining = queryRentalBudget(
      source,
      { availability: 'hide_multiple', band: '10000_13000' },
      reportsIndex,
      now
    )
    expect(remaining.total).toBe(1)
    expect(remaining.items[0]!.matchingOffer?.listingId).toBe('b')
    expect(remaining.items[0]!.availability?.count).toBe(0)
  })

  it('matches accented location filters and bedrooms without budget-selection hiding sibling facets', () => {
    const source = catalogue([
      property('a'),
      property('b', [own('b', 12000)], { neighborhood: 'Buceo', bedrooms: 2 }),
      property('c', [own('c', 17000)], { department: 'Canelones', neighborhood: 'Las Piedras' }),
    ])
    const result = queryRentalBudget(
      source,
      { department: 'montevideo', neighborhood: 'cordon' },
      index(),
      now
    )
    expect(result.total).toBe(1)
    expect(result.facets.neighborhoods).toEqual(['Buceo', 'Cordón'])
    expect(result.facets.departments).toEqual(['Canelones', 'Montevideo'])
    expect(
      queryRentalBudget(source, { bedrooms: 2, band: '10000_13000' }, index(), now).total
    ).toBe(1)
  })
})

describe('economic rental own structured guarantee evidence', () => {
  it('accepts only the advert with its own guarantee and strips the evidence before caching', () => {
    const bare = {
      title: 'Apartamento',
      identity: { version: 1, propertyType: 'apartamento', description: '' },
      details: {},
    }
    const unrelated = own('infocasas:999000001', 6000, bare)
    const supported = own('infocasas:194064544', 12000, {
      ...bare,
      details: { guaranteeText: 'Anda, Porto Seguros o Sura.' },
    })
    const row = projectRentalBudgetProperty(
      property('guarantee-group', [unrelated, supported], {
        title: 'Alquiler mensual. Garantías Anda.',
      })
    )!
    expect(row.offers.map(offer => offer.listingId)).toEqual(['infocasas:194064544'])
    expect(JSON.stringify(row)).not.toMatch(/guaranteeText|identity|Porto Seguros|PRIVATE-/)
    expect(row.offers[0]).not.toHaveProperty('details')
    const result = queryRentalBudget(
      { generatedAt: now.toISOString(), usdUyu: 40, properties: [row] },
      { band: '10000_13000' },
      index(),
      now
    )
    expect(result.items[0]?.matchingOffer?.listingId).toBe('infocasas:194064544')
    expect(result.items[0]?.budget.rentUyu).toBe(12000)
    expect(JSON.stringify(result)).not.toMatch(/guaranteeText|identity|Porto Seguros|PRIVATE-/)
  })
  it('never substitutes a canonical guarantee or a negative own guarantee', () => {
    const bare = {
      title: 'Apartamento',
      identity: { version: 1, propertyType: 'apartamento', description: '' },
      details: {},
    }
    expect(
      projectRentalBudgetProperty(
        property('unknown-guarantee', [own('infocasas:999000002', 12000, bare)], {
          details: { guaranteeText: 'Anda' },
          title: 'Garantías Anda',
        })
      )
    ).toBeNull()
    expect(
      projectRentalBudgetProperty(
        property('negative-guarantee', [
          own('infocasas:999000003', 12000, {
            ...bare,
            details: { guaranteeText: 'No acepta Anda' },
          }),
        ])
      )
    ).toBeNull()
  })
})
