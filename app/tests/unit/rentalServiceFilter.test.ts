import { describe, expect, it } from 'vitest'
import { buildRentalFilter, normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'

describe('servicios filter in the rental directory', () => {
  it('reads and writes only the offered attributes', () => {
    const query = normalizeRentalQuery({ servicios: 'luz,agua,calles,foo' })
    expect(query.servicios).toEqual(['luz', 'agua'])
    expect(rentalQueryToParams(query).servicios).toBe('luz,agua')
    expect(normalizeRentalQuery({}).servicios).toEqual([])
    expect(rentalQueryToParams(normalizeRentalQuery({})).servicios).toBeUndefined()
  })

  it('restricts to the official areas the caller resolved', () => {
    const query = normalizeRentalQuery({ servicios: 'luz' })
    const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(query, 10, 40, [
      'mvd:8',
      'ute:3210',
    ])
    expect(filter['officialZone.zone']).toEqual({ $in: ['mvd:8', 'ute:3210'] })
    expect(nonLocation['officialZone.zone']).toEqual({ $in: ['mvd:8', 'ute:3210'] })
    expect(withoutNeighborhood['officialZone.zone']).toEqual({ $in: ['mvd:8', 'ute:3210'] })
  })

  it('matches nothing when the layers cannot be evaluated, instead of dropping the filter', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({ servicios: 'agua' }), 10, 40, null)
    expect(filter['officialZone.zone']).toEqual({ $in: [] })
  })

  it('is ignored by callers that do not resolve it (detail pages, alerts) and without a request', () => {
    expect(
      buildRentalFilter(normalizeRentalQuery({ servicios: 'luz' }), 10, 40).filter[
        'officialZone.zone'
      ]
    ).toBeUndefined()
    expect(
      buildRentalFilter(normalizeRentalQuery({}), 10, 40, ['mvd:8']).filter['officialZone.zone']
    ).toBeUndefined()
  })
})
