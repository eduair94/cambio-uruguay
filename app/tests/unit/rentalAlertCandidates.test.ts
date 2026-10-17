import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  alertEventWanted,
  alertFiltersCurrent,
  alertWithStoredFilters,
  alertWantsPriceDrops,
  groupAlertCandidates,
  matchAlertCandidates,
  readAlertInventory,
} from '../../server/utils/rentalAlertCandidates'
import type { RentalAlertCandidate } from '../../utils/rentalAlerts'

const mocks = vi.hoisted(() => ({
  rentalMatch: vi.fn(),
  rentalInventory: vi.fn(),
  listingMatch: vi.fn(),
  listingInventory: vi.fn(),
}))
vi.mock('../../server/utils/rentalAlertMatching', () => ({
  matchRentalAlertCandidates: mocks.rentalMatch,
  readRentalAlertInventory: mocks.rentalInventory,
}))
vi.mock('../../server/utils/listingAlertSources', () => ({
  matchListingAlertCandidates: mocks.listingMatch,
  readListingAlertInventory: mocks.listingInventory,
}))

const car = (id: string, amount: number): RentalAlertCandidate => ({
  id,
  propertyKey: id,
  title: 'Citroën Xsara',
  url: `/autos-usados-uruguay/${id.slice(4)}`,
  price: { amount, currency: 'USD' },
  expenses: null,
  department: 'Montevideo',
  neighborhood: '',
  bedrooms: null,
  image: null,
})
const drop = 'car:ml-MLU100001~drop~USD~9000~10000'

describe('alert candidates with price drops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('sends a drop only while the advert still has the dropped price', async () => {
    mocks.listingMatch.mockResolvedValue([car('car:ml-MLU100001', 9000)])
    const found = await matchAlertCandidates('car-search', {}, ['car:ml-MLU100001', drop], {
      priceDrops: true,
    })
    expect(found.map(row => row.id)).toEqual(['car:ml-MLU100001', drop])
    expect(found[1]!.previousPrice).toEqual({ amount: 10000, currency: 'USD' })
    expect(found[0]!.previousPrice).toBeUndefined()
    mocks.listingMatch.mockResolvedValue([car('car:ml-MLU100001', 9500)])
    expect(
      (await matchAlertCandidates('car-search', {}, [drop], { priceDrops: true })).map(r => r.id)
    ).toEqual([])
  })
  it('skips drops for a subscription that did not ask for them', async () => {
    mocks.listingMatch.mockResolvedValue([car('car:ml-MLU100001', 9000)])
    const found = await matchAlertCandidates('car-search', {}, ['car:ml-MLU100001', drop], {
      priceDrops: false,
    })
    expect(found.map(row => row.id)).toEqual(['car:ml-MLU100001'])
  })
  it('does not send the advert as new when only its drop was requested', async () => {
    mocks.listingMatch.mockResolvedValue([car('car:ml-MLU100001', 9000)])
    const found = await matchAlertCandidates('car-search', {}, [drop], { priceDrops: true })
    expect(found.map(row => row.id)).toEqual([drop])
  })
  it('routes rental kinds to the rental matcher', async () => {
    mocks.rentalMatch.mockResolvedValue([])
    await matchAlertCandidates('rental-search', { department: 'Montevideo' }, ['rent:a:1'], {
      priceDrops: false,
      now: 5,
    })
    expect(mocks.rentalMatch).toHaveBeenCalledWith(
      'rental-search',
      { department: 'Montevideo' },
      ['rent:a:1'],
      5
    )
    expect(mocks.listingMatch).not.toHaveBeenCalled()
  })
  it('routes the inventory by kind', async () => {
    mocks.listingInventory.mockResolvedValue({ ids: [] })
    mocks.rentalInventory.mockResolvedValue({ ids: [] })
    await readAlertInventory('sale-search')
    await readAlertInventory('rental-opportunity')
    expect(mocks.listingInventory.mock.calls[0]![0]).toBe('sale-search')
    expect(mocks.rentalInventory.mock.calls[0]![0]).toBe('rental-opportunity')
  })
})

describe('alert digest grouping and consent', () => {
  it('shows an advert once, as its drop, when it is new and dropped in the same digest', () => {
    const fresh = car('car:ml-MLU100001', 9000)
    const dropped = {
      ...fresh,
      id: drop,
      previousPrice: { amount: 10000, currency: 'USD' as const },
    }
    expect(groupAlertCandidates([fresh, dropped])).toEqual([dropped])
    expect(groupAlertCandidates([dropped, fresh])).toEqual([dropped])
  })
  it('never sends drops to subscriptions stored before they existed, nor to opportunities', () => {
    expect(alertWantsPriceDrops({ kind: 'rental-search' })).toBe(false)
    expect(alertWantsPriceDrops({ kind: 'rental-search', priceDrops: true })).toBe(true)
    expect(alertWantsPriceDrops({ kind: 'rental-opportunity', priceDrops: true })).toBe(false)
  })
})

describe('which ledger events a subscription reads', () => {
  const at = new Date('2026-10-17T12:00:00Z')
  const event = (candidateId: string, discoveredAt: Date) => ({ candidateId, discoveredAt })
  it('always reads new adverts and reads drops only after consenting to them', () => {
    const alert = { kind: 'car-search' as const, priceDrops: true, priceDropsFrom: at }
    expect(alertEventWanted(alert, event('car:ml-MLU100001', new Date(+at - 1)))).toBe(true)
    expect(alertEventWanted(alert, event(drop, at))).toBe(false)
    expect(alertEventWanted(alert, event(drop, new Date(+at + 1)))).toBe(true)
    expect(alertEventWanted({ kind: 'car-search', priceDrops: true }, event(drop, at))).toBe(true)
    expect(alertEventWanted({ kind: 'car-search' }, event(drop, new Date(+at + 1)))).toBe(false)
  })
})

describe('stored filters that the directory no longer reads the same way', () => {
  it('accepts filters the directory still reads identically, even with new neutral defaults', () => {
    expect(alertFiltersCurrent({ kind: 'car-search', filters: { brand: 'citroen' } })).toBe(true)
  })
  it('refuses filters the directory would now drop or change, so the alert never widens', () => {
    expect(alertFiltersCurrent({ kind: 'car-search', filters: { fuel: 'vapor' } })).toBe(false)
    expect(alertFiltersCurrent({ kind: 'moto-search', filters: { cilindrada: 'x' } })).toBe(false)
    expect(alertFiltersCurrent({ kind: 'sale-search', filters: { amenity: 'helipuerto' } })).toBe(
      false
    )
  })
})

describe('an unfiltered alert stored without its empty filters object', () => {
  it('is current and reads as no filters (Mongoose minimize dropped the empty object)', () => {
    expect(alertFiltersCurrent({ kind: 'rental-search', filters: undefined })).toBe(true)
    expect(alertWithStoredFilters({ kind: 'car-search' as const }).filters).toEqual({})
  })
})
