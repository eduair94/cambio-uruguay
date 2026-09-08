import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeRentalFitInput, rankRentalFits } from '../../utils/rentalFit'
import { haversineKm } from '../../utils/nearbyRates'
import type {
  FitDestination,
  FitPerson,
  RentalFitCandidate,
  RentalFitInput,
} from '../../utils/rentalFitTypes'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

const now = '2026-09-07T15:00:00.000Z'
const point = { lat: -34.9, lng: -56.18 }
const destination = (id = 'work-1', changes: Partial<FitDestination> = {}): FitDestination => ({
  id,
  label: 'Destino',
  kind: 'work',
  lat: -34.89,
  lng: -56.18,
  days: 5,
  mode: 'transit',
  targetKm: 3,
  ...changes,
})
const person = (id = 'person-1', changes: Partial<FitPerson> = {}): FitPerson => ({
  id,
  label: 'Persona',
  incomeUyu: 50_000,
  remoteDays: 0,
  destinations: [destination(`work-${id}`)],
  ...changes,
})
const input = (changes: Partial<RentalFitInput> = {}): RentalFitInput => ({
  people: [person()],
  housingBudgetUyu: 25_000,
  otherExpensesUyu: 5000,
  savingsUyu: 3000,
  transportUyu: 2000,
  department: '',
  types: ['apartamento', 'casa'],
  minBedrooms: 0,
  minArea: 0,
  pets: false,
  parking: false,
  furnished: false,
  hideReported: false,
  includeOverBudget: false,
  priority: 'balanced',
  ...changes,
})
const offer = (listingId = 'advert-1', changes: Partial<RentalOffer> = {}): RentalOffer => ({
  source: 'infocasas',
  listingId,
  url: 'https://www.infocasas.com.uy/fixture/101',
  title: 'Apartamento de prueba',
  price: 20_000,
  currency: 'UYU',
  priceUyu: 20_000,
  commonExpenses: 2000,
  commonExpensesCurrency: 'UYU',
  sellerName: 'Agencia',
  sellerType: 'inmobiliaria',
  image: null,
  parkingSpaces: null,
  furnished: null,
  petsAllowed: null,
  publishedAt: null,
  firstSeen: now,
  lastSeen: now,
  availability: { count: 0, lastReportedAt: null, status: 'unconfirmed' },
  ...changes,
})
const candidate = (
  key = 'home-1',
  changes: Partial<RentalPublicProperty> = {},
  ownPoint: RentalFitCandidate['point'] = point
): RentalFitCandidate => ({
  property: {
    key,
    title: 'Vivienda',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: '',
    latitude: point.lat,
    longitude: point.lng,
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: [],
    priceUyu: 20_000,
    price: 20_000,
    currency: 'UYU',
    offers: [offer()],
    sources: ['infocasas'],
    freshAt: now,
    firstSeen: now,
    lastSeen: now,
    ...changes,
  },
  point: ownPoint,
})
const rank = (rows: RentalFitCandidate[], changes: Partial<RentalFitInput> = {}, rate = 40) =>
  rankRentalFits(rows, input(changes), rate)

const cordon = { department: 'Montevideo', neighborhood: 'Cordón' }
const centro = { department: 'Montevideo', neighborhood: 'Centro' }
const withZones = (
  row: RentalFitCandidate,
  zones: Array<typeof cordon | null>
): RentalFitCandidate => ({
  ...row,
  offerZones: row.property.offers.map((offer, i) => ({
    source: offer.source,
    listingId: offer.listingId,
    zone: zones[i] ?? null,
  })),
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => vi.useRealTimers())

describe('explicit household neighborhood choices', () => {
  it('normalizes legacy omissions to empty zones and deduplicates exact accent/spacing scoped matches', () => {
    expect(normalizeRentalFitInput(input()).zones).toEqual({
      mode: 'prefer',
      include: [],
      exclude: [],
    })
    expect(
      normalizeRentalFitInput(
        input({
          zones: {
            mode: 'only',
            include: [
              cordon,
              { department: ' MONTEVIDEO ', neighborhood: ' CORDON ' },
              { department: 'Maldonado', neighborhood: 'Cordón' },
            ],
            exclude: [],
          },
        })
      ).zones
    ).toEqual({
      mode: 'only',
      include: [
        { department: 'MONTEVIDEO', neighborhood: 'CORDON' },
        { department: 'Maldonado', neighborhood: 'Cordón' },
      ],
      exclude: [],
    })
  })

  it.each([
    null,
    { mode: 'invalid' },
    { include: [{ neighborhood: 'Centro' }] },
    { include: [{ department: '', neighborhood: 'Centro' }] },
    { include: [{ department: 'Montevideo', neighborhood: '<img src=x>' }] },
    { include: [cordon], exclude: [{ department: 'MONTEVIDEO', neighborhood: 'CORDON' }] },
    { include: Array.from({ length: 21 }, () => cordon) },
    { exclude: Array.from({ length: 21 }, () => centro) },
    { include: 'Centro' },
  ])('rejects invalid/conflicting zone input as a whole without echoing it: %j', zones => {
    expect(() => normalizeRentalFitInput({ ...input(), zones })).toThrow(
      'Invalid household rental criteria'
    )
  })

  it('preserves legacy scores and ordering exactly with no active zone criteria', () => {
    const rows = [
      withZones(candidate('a'), [cordon]),
      withZones(candidate('b'), [centro]),
      candidate('c'),
    ]
    expect(rank(rows)).toEqual(rank(rows, { zones: { mode: 'prefer', include: [], exclude: [] } }))
    expect(rank(rows).results.every(row => !row.warnings.includes('unknown_zone'))).toBe(true)
  })

  it('applies exact department-scoped selection without commercial aliases or canonical label inheritance', () => {
    const rows = [
      withZones(candidate('yes'), [{ department: ' montevideo ', neighborhood: 'CORDON' }]),
      withZones(candidate('different-department'), [
        { department: 'Maldonado', neighborhood: 'Cordón' },
      ]),
      withZones(candidate('commercial-alias'), [{ ...cordon, neighborhood: 'Cordón Sur' }]),
      candidate('unknown'),
    ]
    const result = rank(rows, { zones: { mode: 'only', include: [cordon], exclude: [] } })
    expect(result.results.map(row => row.property.key)).toEqual(['yes'])
    expect(result.results[0]!.zoneMatch).toBe('preferred')
    expect(result.results[0]!.reasons).toContain('preferred_zone')
  })

  it('retains an alternative eligible own offer when the cheapest offer is in an excluded zone', () => {
    const row = withZones(
      candidate('alternative', {
        offers: [
          offer('cheap', { priceUyu: 10000, commonExpenses: 0, petsAllowed: false }),
          offer('allowed', { priceUyu: 20000, commonExpenses: 1000, petsAllowed: true }),
        ],
      }),
      [centro, cordon]
    )
    const result = rank([row], {
      pets: true,
      zones: { mode: 'only', include: [cordon], exclude: [centro] },
    }).results[0]!
    expect(result.offer.listingId).toBe('allowed')
    expect(result.monthlyUyu).toBe(21000)
    expect(result.property.neighborhood).toBe('Cordón')
    const inverse = withZones(row, [cordon, centro])
    expect(
      rank([inverse], { pets: true, zones: { mode: 'only', include: [cordon], exclude: [] } })
        .matched
    ).toBe(0)
  })

  it('does not borrow a preferred zone from another source or another advert', () => {
    const row = candidate('wrong-ad')
    row.offerZones = [
      { source: 'casasweb', listingId: 'advert-1', zone: cordon },
      { source: 'infocasas', listingId: 'different', zone: cordon },
    ]
    expect(rank([row], { zones: { mode: 'only', include: [cordon], exclude: [] } }).matched).toBe(0)
  })

  it('keeps unknown zones for exclude-only searches with an explicit warning and no preference bonus', () => {
    const result = rank([candidate('unknown'), withZones(candidate('excluded'), [centro])], {
      zones: { mode: 'prefer', include: [], exclude: [centro] },
    })
    expect(result.matched).toBe(1)
    expect(result.results[0]!.zoneMatch).toBe('unknown')
    expect(result.results[0]!.warnings).toContain('unknown_zone')
    expect(result.results[0]!.score).toBe(rank([candidate('unknown')]).results[0]!.score)
  })

  it('adds at most ten score points for preference without turning it into a hidden exclusion', () => {
    const rows = [
      withZones(candidate('preferred'), [cordon]),
      withZones(candidate('neutral'), [centro]),
      candidate('unknown'),
    ]
    const base = rank(rows).results[0]!.score
    const result = rank(rows, { zones: { mode: 'prefer', include: [cordon], exclude: [] } })
    expect(result.matched).toBe(3)
    expect(result.results.map(row => row.property.key)).toEqual(['preferred', 'neutral', 'unknown'])
    expect(result.results[0]!.score).toBeCloseTo(base * 0.9 + 10)
    expect(result.results[1]!.score).toBeCloseTo(base * 0.9)
    expect(result.results[2]!.score).toBeCloseTo(base * 0.9)
  })

  it('never promotes preferred zones above financially feasible complete results or promotes incomplete results', () => {
    const rows = [
      withZones(
        candidate('preferred-deficit', {
          offers: [offer('costly', { priceUyu: 20000, commonExpenses: 0 })],
        }),
        [cordon]
      ),
      withZones(
        candidate('preferred-incomplete', {
          offers: [offer('partial', { priceUyu: 1000, commonExpenses: null })],
        }),
        [cordon]
      ),
      withZones(
        candidate('neutral-feasible', {
          offers: [offer('affordable', { priceUyu: 10000, commonExpenses: 0 })],
        }),
        [centro]
      ),
    ]
    const result = rank(rows, {
      people: [person('p', { incomeUyu: 25000 })],
      zones: { mode: 'prefer', include: [cordon], exclude: [] },
    })
    expect(result.results.map(row => row.property.key)).toEqual([
      'neutral-feasible',
      'preferred-deficit',
      'preferred-incomplete',
    ])
  })

  it('applies zone preference across the full universe before top24 and keeps deterministic ties', () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      withZones(candidate(`home-${String(i).padStart(2, '0')}`), [i >= 40 ? cordon : centro])
    )
    const criteria = { zones: { mode: 'prefer' as const, include: [cordon], exclude: [] } }
    const result = rank(rows, criteria)
    expect(result.matched).toBe(50)
    expect(result.results.slice(0, 10).every(row => row.zoneMatch === 'preferred')).toBe(true)
    expect(result.results).toEqual(rank([...rows].reverse(), criteria).results)
  })
})

describe('strict household input', () => {
  it('normalizes decimal form values and a detached bounded household', () => {
    const raw = input()
    const normalized = normalizeRentalFitInput({
      ...raw,
      housingBudgetUyu: '25000.50',
      people: [
        {
          ...person(),
          incomeUyu: '50000',
          label: ' <b>Ana</b>\n López ',
          destinations: [{ ...destination(), lat: '-34.890001', days: '2.5' }],
        },
      ],
    })
    expect(normalized.housingBudgetUyu).toBe(25000.5)
    expect(normalized.people[0]).toMatchObject({ label: 'Ana López', incomeUyu: 50000 })
    expect(normalized.people[0]!.destinations[0]).toMatchObject({ lat: -34.89, days: 2.5 })
    expect(normalizeRentalFitInput(normalized)).toEqual(normalized)
    expect(normalized.people).not.toBe(raw.people)
  })

  it('keeps zero income and remote context without guessing destinations', () => {
    expect(
      normalizeRentalFitInput({ people: [{ id: 'p' }], housingBudgetUyu: 10_000 })
    ).toMatchObject({
      people: [{ id: 'p', incomeUyu: 0, remoteDays: 0, destinations: [] }],
      types: ['apartamento', 'casa'],
      priority: 'balanced',
      includeOverBudget: false,
    })
  })

  it.each([
    null,
    [],
    {},
    true,
    'private salary',
    { people: [], housingBudgetUyu: 10000 },
    new Date(),
  ])('rejects malformed root %# with the same generic message', raw => {
    expect(() => normalizeRentalFitInput(raw)).toThrowError('Invalid household rental criteria')
  })

  it.each(['housingBudgetUyu', 'otherExpensesUyu', 'savingsUyu', 'transportUyu'] as const)(
    'rejects invalid amount %s without coercion or clamping',
    field => {
      for (const value of [null, NaN, Infinity, -1, 10_000_001, true, '', '1e4', '0x10', [], {}]) {
        expect(() => normalizeRentalFitInput({ ...input(), [field]: value })).toThrow()
      }
      expect(() => normalizeRentalFitInput({ ...input(), [field]: 10_000_000 })).not.toThrow()
    }
  )

  it('requires a positive manual budget and valid priorities, types, flags and minima', () => {
    for (const changes of [
      { housingBudgetUyu: 0 },
      { priority: 'wealth' },
      { types: ['oficina'] },
      { types: [] },
      { types: null },
      { types: Array(1) },
      { pets: 'false' },
      { hideReported: 1 },
      { includeOverBudget: 'true' },
      { minBedrooms: 1.5 },
      { minBedrooms: -1 },
      { minArea: Infinity },
      { department: { $ne: '' } },
    ])
      expect(() => normalizeRentalFitInput({ ...input(), ...changes })).toThrow()
  })

  it('rejects ninth people and fifth destinations instead of silently truncating', () => {
    expect(() =>
      normalizeRentalFitInput(
        input({ people: Array.from({ length: 8 }, (_, i) => person(`p${i}`)) })
      )
    ).not.toThrow()
    expect(() =>
      normalizeRentalFitInput(
        input({ people: Array.from({ length: 9 }, (_, i) => person(`p${i}`)) })
      )
    ).toThrow()
    expect(() =>
      normalizeRentalFitInput(
        input({
          people: [
            person('p', {
              destinations: Array.from({ length: 5 }, (_, i) => destination(`d${i}`)),
            }),
          ],
        })
      )
    ).toThrow()
  })

  it('rejects unsafe or repeated person/destination IDs across the household', () => {
    for (const id of [
      '',
      '__proto__',
      'constructor',
      'prototype',
      '<p>',
      'space id',
      'a'.repeat(65),
    ]) {
      expect(() => normalizeRentalFitInput(input({ people: [person(id)] }))).toThrow()
      expect(() =>
        normalizeRentalFitInput(
          input({ people: [person('p', { destinations: [destination(id)] })] })
        )
      ).toThrow()
    }
    expect(() => normalizeRentalFitInput(input({ people: [person(), person()] }))).toThrow()
    expect(() =>
      normalizeRentalFitInput(
        input({
          people: [
            person('p1', { destinations: [destination('same')] }),
            person('p2', { destinations: [destination('same')] }),
          ],
        })
      )
    ).toThrow()
  })

  it('rejects invalid destinations including null, sparse arrays and partial coordinates', () => {
    const invalidDestinations = [
      null,
      [null],
      Array(1),
      [destination('d', { lat: NaN })],
      [destination('d', { lng: -90 })],
      [{ ...destination(), lat: undefined }],
      [destination('d', { targetKm: 0 })],
      [destination('d', { targetKm: 301 })],
      [destination('d', { days: 8 })],
      [{ ...destination(), mode: 'flying' }],
      [{ ...destination(), kind: 'school' }],
    ]
    for (const destinations of invalidDestinations) {
      expect(() =>
        normalizeRentalFitInput({ ...input(), people: [{ ...person(), destinations }] })
      ).toThrow()
    }
    expect(() => normalizeRentalFitInput({ ...input(), people: Array(1) })).toThrow()
  })

  it('rejects hostile objects without reflecting private input or invoking number coercion', () => {
    const valueOf = vi.fn(() => {
      throw new Error('PRIVATE salary address')
    })
    expect(() =>
      normalizeRentalFitInput({ ...input(), housingBudgetUyu: { valueOf } })
    ).toThrowError('Invalid household rental criteria')
    expect(valueOf).not.toHaveBeenCalled()
    const throwing = {
      get people() {
        throw new Error('PRIVATE salary address')
      },
    }
    expect(() => normalizeRentalFitInput(throwing)).toThrowError(
      'Invalid household rental criteria'
    )
    expect(() => normalizeRentalFitInput(Object.create(input()))).toThrow()
  })
})

describe('same-advert housing costs and eligibility', () => {
  it('sums rent and expenses from the same qualifying offer, not group minima', () => {
    const result = rank(
      [
        candidate('home', {
          petsAllowed: true,
          parkingSpaces: 1,
          offers: [
            offer('cheap', { priceUyu: 10_000, petsAllowed: true, commonExpenses: 5000 }),
            offer('parking', { priceUyu: 12_000, parkingSpaces: 1, commonExpenses: 1000 }),
          ],
        }),
      ],
      { pets: true, parking: true }
    )
    expect(result.matched).toBe(0)
    const chosen = rank(
      [
        candidate('home', {
          offers: [
            offer('base-cheap', {
              priceUyu: 15_000,
              commonExpenses: 9000,
              petsAllowed: true,
              parkingSpaces: 1,
              furnished: true,
            }),
            offer('total-cheap', {
              priceUyu: 18_000,
              commonExpenses: 1000,
              petsAllowed: true,
              parkingSpaces: 1,
              furnished: true,
            }),
            offer('not-furnished', {
              priceUyu: 12_000,
              commonExpenses: 0,
              petsAllowed: true,
              parkingSpaces: 1,
            }),
          ],
        }),
      ],
      { pets: true, parking: true, furnished: true }
    ).results[0]!
    expect(chosen.offer.listingId).toBe('total-cheap')
    expect(chosen.monthlyUyu).toBe(19000)
  })

  it('chooses complete monthly costs over a cheaper unknown total and respects the ceiling', () => {
    const home = candidate('home', {
      offers: [offer('unknown', { priceUyu: 8000, commonExpenses: null }), offer('known')],
    })
    expect(rank([home]).results[0]!.offer.listingId).toBe('known')
    const below = rank([home], { housingBudgetUyu: 20_000 }).results[0]!
    expect(below.offer.listingId).toBe('unknown')
    expect(below).toMatchObject({
      monthlyUyu: null,
      complete: false,
      overBudget: false,
      budgetScore: 0,
    })
    expect(below.warnings).toContain('unknown_expenses')
    expect(below.reasons).not.toContain('within_budget')
    expect(rank([candidate()], { housingBudgetUyu: 20_000 }).matched).toBe(0)
    expect(
      rank([candidate()], { housingBudgetUyu: 20_000, includeOverBudget: true }).results[0]
    ).toMatchObject({ overBudget: true, warnings: ['over_budget'] })
    expect(
      rank([
        candidate('high-base', { offers: [offer('x', { priceUyu: 30000, commonExpenses: null })] }),
      ]).matched
    ).toBe(0)
  })

  it('converts only declared expenses and never changes unknown currency into zero', () => {
    const rows = [
      candidate('usd', {
        offers: [offer('usd', { commonExpenses: 50, commonExpensesCurrency: 'USD' })],
      }),
      candidate('unknown', {
        offers: [offer('unknown', { commonExpenses: 50, commonExpensesCurrency: null })],
      }),
      candidate('zero', {
        offers: [offer('zero', { commonExpenses: 0, commonExpensesCurrency: null })],
      }),
    ]
    const results = rank(rows).results
    expect(results.find(row => row.property.key === 'usd')).toMatchObject({
      expensesUyu: 2000,
      monthlyUyu: 22000,
    })
    expect(results.find(row => row.property.key === 'unknown')).toMatchObject({
      expensesUyu: null,
      monthlyUyu: null,
    })
    expect(results.find(row => row.property.key === 'zero')).toMatchObject({
      expensesUyu: 0,
      monthlyUyu: 20000,
    })
    expect(rank([rows[0]!], {}, NaN).results[0]!.complete).toBe(false)
  })

  it('uses the common freshness cutoff per offer; refreshing the group cannot revive old facts', () => {
    const homes = [
      candidate('stale', {
        offers: [
          offer('old', { priceUyu: 5000, petsAllowed: true, lastSeen: '2026-08-27T23:59:59Z' }),
          offer('fresh'),
        ],
      }),
      candidate('boundary', {
        offers: [offer('boundary', { petsAllowed: true, lastSeen: '2026-08-28' })],
      }),
    ]
    expect(rank(homes, { pets: true }).results.map(row => row.property.key)).toEqual(['boundary'])
    for (const lastSeen of ['', 'not-a-date', '9999', '2026-13-01']) {
      expect(rank([candidate('malformed', { offers: [offer('x', { lastSeen })] })]).matched).toBe(0)
    }
    for (const priceUyu of [0, -100, NaN, Infinity])
      expect(rank([candidate('price', { offers: [offer('x', { priceUyu })] })]).matched).toBe(0)
  })

  it('restricts homes, exact normalized department and known minimum specifications', () => {
    const homes = [
      candidate('office', { propertyType: 'oficina' }),
      candidate('room', { propertyType: 'habitacion' }),
      candidate('house', { propertyType: 'casa', department: 'SAN JOSE' }),
      candidate('unknown-beds', { bedrooms: null }),
      candidate('unknown-area', { area: null }),
      candidate('small', { area: 30 }),
      candidate('valid'),
    ]
    expect(
      rank(homes, { minBedrooms: 1, minArea: 40, department: 'montevídeo' }).results.map(
        row => row.property.key
      )
    ).toEqual(['valid'])
    expect(
      rank(homes, { types: ['casa'], department: 'San José' }).results.map(row => row.property.key)
    ).toEqual(['house'])
    expect(rank(homes).matched).toBe(5)
  })

  it('hides only reported adverts, preserving another explicitly unreported offer', () => {
    const reported = { count: 3, status: 'unconfirmed' as const, lastReportedAt: now }
    const home = candidate('home', {
      availability: reported,
      offers: [offer('reported', { priceUyu: 10000, availability: reported }), offer('clean')],
    })
    expect(rank([home]).results[0]!.warnings).toContain('reported')
    const filtered = rank([home], { hideReported: true }).results[0]!
    expect(filtered.offer.listingId).toBe('clean')
    expect(filtered.warnings).not.toContain('reported')
    expect(
      rank([candidate('only', { offers: [offer('reported', { availability: reported })] })], {
        hideReported: true,
      }).matched
    ).toBe(0)
  })

  it('subtracts household reservations separately and uses housing-only income share', () => {
    const result = rank([candidate()], {
      people: [person('p1', { incomeUyu: 30000 }), person('p2', { incomeUyu: 10000 })],
    }).results[0]!
    expect(result.remainingUyu).toBe(8000)
    expect(result.incomeShare).toBe(0.55)
    expect(result.warnings).not.toContain('low_remaining')
    expect(rank([candidate()], { otherExpensesUyu: 40000 }).results[0]!.warnings).toContain(
      'low_remaining'
    )
    expect(
      rank([candidate()], { people: [person('p', { incomeUyu: 0 })] }).results[0]
    ).toMatchObject({ remainingUyu: null, incomeShare: null })
  })
})

describe('household proximity and transparent ranking', () => {
  it('weights each destination by explicit visits and blends household mean with worst person', () => {
    const a = destination('a', { lat: -34.89, days: 4, targetKm: 1 })
    const b = destination('b', { lat: -34.86, days: 1, targetKm: 2 })
    const c = destination('c', { lat: -34.88, days: 2, targetKm: 3 })
    const people = [person('p1', { destinations: [a, b] }), person('p2', { destinations: [c] })]
    const result = rank([candidate()], { people }).results[0]!
    const [da, db, dc] = [a, b, c].map(destination => haversineKm(point, destination)) as [
      number,
      number,
      number,
    ]
    const r1 = ((da / a.targetKm) * 4 + db / b.targetKm) / 7
    const r2 = ((dc / c.targetKm) * 2) / 7
    const expected = 100 / (1 + ((r1 + r2) / 2 + Math.max(r1, r2)) / 2)
    expect(result.commuteScore).toBeCloseTo(expected, 10)
    expect(result.weeklyDistanceKm).toBeCloseTo(2 * (da * 4 + db + dc * 2), 10)
    expect(result.worstPersonDistanceKm).toBeCloseTo(Math.max((da * 4 + db) / 5, dc), 10)
    expect(result.trips).toHaveLength(3)
    expect(result.trips.map(trip => [trip.personId, trip.destinationId])).toEqual([
      ['p1', 'a'],
      ['p1', 'b'],
      ['p2', 'c'],
    ])
  })

  it('does not change burden by salary, remote context or mode without changing actual visits', () => {
    const a = person('p1', { incomeUyu: 1, destinations: [destination('a')] })
    const b = person('p2', {
      incomeUyu: 9_000_000,
      destinations: [destination('b', { lat: -34.85 })],
    })
    const baseline = rank([candidate()], { people: [a, b] }).results[0]!
    const changed = rank([candidate()], {
      people: [
        {
          ...a,
          incomeUyu: b.incomeUyu,
          remoteDays: 7,
          destinations: [{ ...a.destinations[0]!, mode: 'driving' }],
        },
        { ...b, incomeUyu: a.incomeUyu },
      ],
    }).results[0]!
    expect(changed.score).toBe(baseline.score)
    expect(changed.commuteScore).toBe(baseline.commuteScore)
    expect(changed.weeklyDistanceKm).toBe(baseline.weeklyDistanceKm)
  })

  it('weights a five-visit destination more than a two-visit destination across people', () => {
    const firstPoint = { lat: -34.89, lng: -56.18 }
    const secondPoint = { lat: -34.95, lng: -56.18 }
    const homes = [
      candidate('near-first', {}, firstPoint),
      candidate('near-second', {}, secondPoint),
    ]
    const first = person('first', { destinations: [destination('a', { ...firstPoint, days: 2 })] })
    const second = person('second', {
      destinations: [destination('b', { ...secondPoint, days: 5 })],
    })
    const original = rank(homes, { people: [first, second] })
    expect(original.results.map(row => row.property.key)).toEqual(['near-second', 'near-first'])
    const switched = rank(homes, {
      people: [
        { ...first, destinations: [{ ...first.destinations[0]!, days: 5 }] },
        { ...second, destinations: [{ ...second.destinations[0]!, days: 2 }] },
      ],
    })
    expect(switched.results.map(row => row.property.key)).toEqual(['near-first', 'near-second'])
  })

  it('never worsens proximity as a hybrid member reduces visits all the way to remote', () => {
    const second = person('second', {
      destinations: [destination('fulltime', { lat: -34.85, days: 5 })],
    })
    const scores = [5, 2, 1, 0.1, 0].map(
      days =>
        rank([candidate()], {
          people: [
            person('hybrid', {
              remoteDays: 7 - days,
              destinations: [destination('hybrid-work', { days })],
            }),
            second,
          ],
        }).results[0]!
    )
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!.commuteScore!).toBeGreaterThanOrEqual(scores[i - 1]!.commuteScore!)
      expect(scores[i]!.weeklyDistanceKm!).toBeLessThan(scores[i - 1]!.weeklyDistanceKm!)
    }
    const removed = rank([candidate()], {
      people: [person('hybrid', { remoteDays: 7, destinations: [] }), second],
    }).results[0]!
    expect(removed.commuteScore).toBe(scores.at(-1)!.commuteScore)
    expect(removed.weeklyDistanceKm).toBe(scores.at(-1)!.weeklyDistanceKm)
    const distance = haversineKm(point, second.destinations[0]!)
    const weeklyBurden = ((distance / second.destinations[0]!.targetKm) * 5) / 7
    expect(removed.commuteScore).toBeCloseTo(100 / (1 + (weeklyBurden / 2 + weeklyBurden) / 2), 10)
  })

  it('counts independent visits to multiple jobs even when their weekly sum exceeds seven', () => {
    const destinations = [destination('morning', { days: 5 }), destination('evening', { days: 5 })]
    const result = rank([candidate()], { people: [person('p', { destinations })] }).results[0]!
    const distance = haversineKm(point, destinations[0]!)
    expect(result.weeklyDistanceKm).toBeCloseTo(distance * 2 * 10, 10)
    expect(result.commuteScore).toBeCloseTo(100 / (1 + ((distance / 3) * 10) / 7), 10)
    expect(result.worstPersonDistanceKm).toBeCloseTo(distance, 10)
  })

  it('prefers housing covered by entered income and reserves before a closer deficit option', () => {
    const nearby = candidate(
      'nearby',
      { offers: [offer('nearby', { priceUyu: 20_000, commonExpenses: 0 })] },
      { lat: -34.89, lng: -56.18 }
    )
    const cheaper = candidate(
      'cheaper',
      { offers: [offer('cheaper', { priceUyu: 10_000, commonExpenses: 0 })] },
      { lat: -34.99, lng: -56.18 }
    )
    const enoughIncome = rank([nearby, cheaper], {
      people: [person('p', { incomeUyu: 40_000 })],
    })
    expect(enoughIncome.results.map(row => row.property.key)).toEqual(['nearby', 'cheaper'])
    const lowerIncome = rank([nearby, cheaper], {
      people: [person('p', { incomeUyu: 25_000 })],
    })
    expect(lowerIncome.results.map(row => row.property.key)).toEqual(['cheaper', 'nearby'])
    expect(lowerIncome.results[0]!.remainingUyu).toBe(5000)
    expect(lowerIncome.results[1]!.remainingUyu).toBe(-5000)
    expect(lowerIncome.results[1]!.warnings).toContain('low_remaining')
    // Financial priority does not alter the manual ceiling, proximity or comparative score.
    expect(lowerIncome.matched).toBe(2)
    expect(lowerIncome.results[1]!.overBudget).toBe(false)
    expect(lowerIncome.results[1]!.score).toBe(enoughIncome.results[0]!.score)
    expect(lowerIncome.results[0]!.score).toBeLessThan(lowerIncome.results[1]!.score)
  })

  it('treats income permutations equally and keeps manual ranking when income is omitted', () => {
    const rows = [
      candidate(
        'expensive-near',
        { offers: [offer('e', { priceUyu: 20_000, commonExpenses: 0 })] },
        { lat: -34.89, lng: -56.18 }
      ),
      candidate(
        'cheap-far',
        { offers: [offer('c', { priceUyu: 10_000, commonExpenses: 0 })] },
        { lat: -34.99, lng: -56.18 }
      ),
    ]
    const households = [
      [person('a', { incomeUyu: 5000 }), person('b', { incomeUyu: 20_000 })],
      [person('a', { incomeUyu: 20_000 }), person('b', { incomeUyu: 5000 })],
    ]
    expect(rank(rows, { people: households[0]! }).results).toEqual(
      rank(rows, { people: households[1]! }).results
    )
    const omitted = rank(rows, {
      people: [person('a', { incomeUyu: 0 }), person('b', { incomeUyu: 0 })],
    })
    expect(omitted.results.map(row => row.property.key)).toEqual(['expensive-near', 'cheap-far'])
    expect(omitted.results.every(row => row.remainingUyu === null)).toBe(true)
    expect(omitted.results.every(row => !row.warnings.includes('low_remaining'))).toBe(true)
  })

  it('keeps known complete options before partials and cheaper ranking when all incomes run short', () => {
    const rows = [
      candidate('incomplete', { offers: [offer('u', { priceUyu: 1000, commonExpenses: null })] }),
      candidate('more-costly', { offers: [offer('e', { priceUyu: 20_000, commonExpenses: 0 })] }),
      candidate('less-costly', { offers: [offer('c', { priceUyu: 10_000, commonExpenses: 0 })] }),
    ]
    const result = rank(rows, { people: [person('p', { incomeUyu: 1, destinations: [] })] })
    expect(result.results.map(row => row.property.key)).toEqual([
      'less-costly',
      'more-costly',
      'incomplete',
    ])
    expect(result.results[0]!.budgetScore).toBeGreaterThan(result.results[1]!.budgetScore)
    expect(result.results.slice(0, 2).every(row => row.warnings.includes('low_remaining'))).toBe(
      true
    )
  })

  it('ranks households without active destinations by budget alone, even without location', () => {
    const people = [
      person('remote', { remoteDays: 7, destinations: [destination('optional', { days: 0 })] }),
    ]
    const result = rank([candidate('without-point', {}, null)], { people, priority: 'commute' })
      .results[0]!
    expect(result).toMatchObject({
      complete: true,
      point: null,
      commuteScore: null,
      worstPersonDistanceKm: null,
      weeklyDistanceKm: 0,
    })
    expect(result.score).toBe(result.budgetScore)
    expect(result.reasons).toContain('remote_household')
    expect(result.warnings).not.toContain('unknown_location')
  })

  it('never favors missing expenses or absent/invalid evidence-checked locations', () => {
    const rows = [
      candidate('missing-cost', {
        offers: [offer('cheap', { priceUyu: 1000, commonExpenses: null })],
      }),
      candidate('missing-point', { offers: [offer('cheap', { priceUyu: 1000 })] }, null),
      candidate('complete'),
      candidate('invalid-point', {}, { lat: NaN, lng: -56 }),
    ]
    const result = rank(rows)
    expect(result).toMatchObject({ matched: 4, complete: 1, incomplete: 3 })
    expect(result.results[0]!.property.key).toBe('complete')
    const partial = result.results.find(row => row.property.key === 'missing-point')!
    expect(partial).toMatchObject({
      complete: false,
      commuteScore: null,
      weeklyDistanceKm: null,
      worstPersonDistanceKm: null,
    })
    expect(partial.trips[0]).toMatchObject({ distanceKm: null, withinTarget: null })
    expect(partial.warnings).toContain('unknown_location')
  })

  it('uses monotonic budget scores and user-selected weighting without affordability assumptions', () => {
    const remote = [person('p', { destinations: [] })]
    const rows = [10_000, 20_000, 25_000, 40_000].map(cost =>
      candidate(`home-${cost}`, {
        offers: [offer(`${cost}`, { priceUyu: cost, commonExpenses: 0 })],
      })
    )
    const scored = rank(rows, { people: remote, includeOverBudget: true }).results
    expect(scored.map(row => row.monthlyUyu)).toEqual([10000, 20000, 25000, 40000])
    expect(scored[2]!.budgetScore).toBe(50)
    expect(scored.every(row => row.score >= 0 && row.score <= 100)).toBe(true)
    const near = candidate('near', {}, { lat: -34.89, lng: -56.18 })
    const farCheap = candidate(
      'cheap',
      { offers: [offer('cheap', { priceUyu: 5000, commonExpenses: 0 })] },
      { lat: -34.99, lng: -56.18 }
    )
    expect(rank([near, farCheap], { priority: 'budget' }).results[0]!.property.key).toBe('cheap')
    expect(rank([near, farCheap], { priority: 'commute' }).results[0]!.property.key).toBe('near')
  })

  it('evaluates the entire universe before top24 and reports complete/incomplete totals', () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      candidate(`home-${String(i).padStart(3, '0')}`, {
        offers: [offer(`a${i}`, { priceUyu: 20000 - i * 100, commonExpenses: 0 })],
      })
    )
    rows.push(candidate('partial', { offers: [offer('partial', { commonExpenses: null })] }))
    const result = rank(rows, { people: [person('remote', { destinations: [] })] })
    expect(result).toMatchObject({ matched: 101, complete: 100, incomplete: 1 })
    expect(result.results).toHaveLength(24)
    expect(result.results[0]!.property.key).toBe('home-099')
    expect(result.results[23]!.property.key).toBe('home-076')
  })

  it('uses deterministic key ties and advert ties without mutating input arrays', () => {
    const rows = ['c', 'a', 'b'].map(key => candidate(key, { offers: [offer('z'), offer('a')] }))
    const before = JSON.stringify(rows)
    expect(rank(rows).results.map(row => row.property.key)).toEqual(['a', 'b', 'c'])
    expect(rank([...rows].reverse()).results).toEqual(rank(rows).results)
    expect(rank(rows).results.every(row => row.offer.listingId === 'a')).toBe(true)
    expect(JSON.stringify(rows)).toBe(before)
  })

  it('retains the same global best24 as an exhaustive sort, including partial results and ties', () => {
    const rows = Array.from({ length: 213 }, (_, index) =>
      candidate(
        `home-${String(index).padStart(3, '0')}`,
        {
          offers: [
            offer(`a${index}`, {
              priceUyu: 9000 + (index % 19) * 500,
              commonExpenses: index % 3 === 0 ? null : 1500,
            }),
          ],
        },
        index % 5 === 0 ? null : { lat: -34.9 + (index % 7) * 0.01, lng: -56.18 }
      )
    )
    const exhaustive = rows
      .flatMap(row => rank([row]).results)
      .sort(
        (a, b) =>
          Number(b.complete) - Number(a.complete) ||
          b.score - a.score ||
          (a.property.key < b.property.key ? -1 : a.property.key > b.property.key ? 1 : 0)
      )
    const result = rank([...rows].reverse())
    expect(result.results).toEqual(exhaustive.slice(0, 24))
    expect(result.matched).toBe(exhaustive.length)
    expect(result.complete).toBe(exhaustive.filter(row => row.complete).length)
    expect(result.incomplete).toBe(exhaustive.filter(row => !row.complete).length)
  })
})
