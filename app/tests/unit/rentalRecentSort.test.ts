import { describe, expect, it } from 'vitest'
import {
  RENTAL_RECENT_SORT_FIELDS,
  RENTAL_SORTS,
  RENTAL_TYPE_FILTER_TYPES,
  normalizeRentalQuery,
  rentalMongoSort,
  rentalRecentSortProjection,
  type RentalQuery,
  type RentalSort,
} from '../../utils/rentals'

// 2026-11-20: "Más recientes" opened on two houses of $ 210.000 and $ 185.000 against a directory
// median of $ 31.000 and walked the price down to $ 2.400 cabins. The tie inside one day went to the
// ObjectId, and classes/rentals/dedupe.ts hands each run to the store sorted by price, so the
// insertion order WAS the price order. None of the steps of this order may be the price again.
describe('the default order of the rental directory ("Más recientes")', () => {
  const recentTail = { freshAt: -1, _rentalTier: 1, _rentalHour: -1, _rentalMix: 1, key: 1 }

  it('sorts by day, then homes first, then the newest insertion hour, then a fixed mix, then the unique key', () => {
    const sort = rentalMongoSort('recientes')
    expect(Object.entries(sort)).toEqual(Object.entries(recentTail))
  })

  it('never ranks by price, nor by the insertion order that carried the price', () => {
    for (const field of Object.keys(rentalMongoSort('recientes'))) {
      expect(field).not.toMatch(/price/i)
      expect(field).not.toBe('_id')
      expect(field).not.toBe('_rentalInserted')
    }
  })

  it('keeps the largest drop first in "baja" and the same tail behind it', () => {
    expect(Object.entries(rentalMongoSort('baja'))).toEqual(
      Object.entries({ 'priceDrop.pct': -1, ...recentTail })
    )
  })

  it('computes its temporary fields only for the sorts that use them', () => {
    for (const { value } of RENTAL_SORTS) {
      // Without a reference point "distancia" falls back to the default order.
      const query = normalizeRentalQuery(
        value === 'distancia' ? { sort: value, refLat: '-34.9', refLng: '-56.17' } : { sort: value }
      )
      expect(query.sort).toBe(value)
      const projection = rentalRecentSortProjection(query)
      const sortFields = Object.keys(rentalMongoSort(value as RentalSort))
      if (value === 'recientes' || value === 'baja') {
        expect(Object.keys(projection).sort()).toEqual([...RENTAL_RECENT_SORT_FIELDS].sort())
        for (const field of RENTAL_RECENT_SORT_FIELDS) expect(sortFields).toContain(field)
      } else {
        expect(projection).toEqual({})
        for (const field of RENTAL_RECENT_SORT_FIELDS) expect(sortFields).not.toContain(field)
      }
    }
  })

  it('puts homes first only when the person chose no type', () => {
    const homesFirst = {
      $cond: [{ $in: ['$propertyType', [...RENTAL_TYPE_FILTER_TYPES.vivienda]] }, 0, 1],
    }
    expect(rentalRecentSortProjection(normalizeRentalQuery({}))._rentalTier).toEqual(homesFirst)
    // Excluding a type still mixes homes and the rest, so the tier stays.
    expect(
      rentalRecentSortProjection(normalizeRentalQuery({ sinTipos: 'habitacion' }))._rentalTier
    ).toEqual(homesFirst)
    for (const input of [{ type: 'local' }, { types: 'apartamento,local' }, { type: 'vivienda' }])
      expect(rentalRecentSortProjection(normalizeRentalQuery(input))._rentalTier).toEqual({
        $literal: 0,
      })
  })

  it('reads the chosen types the way the filter does, even on a query built by hand', () => {
    // buildRentalFilter: `query.types ?? (query.type ? [query.type] : [])`.
    const byHand = { sort: 'recientes', type: 'local' } as unknown as Pick<
      RentalQuery,
      'sort' | 'types' | 'type'
    >
    expect(rentalRecentSortProjection(byHand)._rentalTier).toEqual({ $literal: 0 })
    const none = { sort: 'recientes', type: '' } as unknown as Pick<
      RentalQuery,
      'sort' | 'types' | 'type'
    >
    expect(rentalRecentSortProjection(none)._rentalTier).toHaveProperty('$cond')
  })

  // After review (2026-11-20): without the hour, a home saved at 20:00 had the same chance of page 1
  // as one saved at 01:00 of the same day, and an evening visit re-served morning homes.
  it('puts the newest insertion hour first inside one day and tier, as a number of whole hours', () => {
    const hour = rentalRecentSortProjection(normalizeRentalQuery({}))._rentalHour
    // A number, not a date string: the route sorts under the "es" collation, which never touches
    // numbers. `$convert` with onError/onNull: an `_id` that is not an ObjectId ties, it does not fail.
    expect(hour).toEqual({
      $trunc: {
        $divide: [
          { $toLong: { $convert: { input: '$_id', to: 'date', onError: null, onNull: null } } },
          3_600_000,
        ],
      },
    })
    expect(rentalMongoSort('recientes')._rentalHour).toBe(-1)
    // The hour only orders inside a day: freshAt stays the first key, so the label stays true.
    expect(Object.keys(rentalMongoSort('recientes')).indexOf('_rentalHour')).toBeGreaterThan(
      Object.keys(rentalMongoSort('recientes')).indexOf('freshAt')
    )
  })

  it('mixes by a binary hash of the key, which no collation can reorder', () => {
    expect(rentalRecentSortProjection(normalizeRentalQuery({}))._rentalMix).toEqual({
      $toHashedIndexKey: '$key',
    })
  })
})
