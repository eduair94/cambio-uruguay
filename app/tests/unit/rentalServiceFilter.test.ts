import { describe, expect, it } from 'vitest'
import { buildRentalFilter, normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'

describe('servicios filter in the rental directory', () => {
  it('reads and writes only the offered attributes', () => {
    const query = normalizeRentalQuery({ servicios: 'luz,agua,calles,foo' })
    expect(query.servicios).toEqual([
      { attribute: 'luz', max: null },
      { attribute: 'agua', max: null },
    ])
    expect(rentalQueryToParams(query).servicios).toBe('luz,agua')
    expect(normalizeRentalQuery({}).servicios).toEqual([])
    expect(rentalQueryToParams(normalizeRentalQuery({})).servicios).toBeUndefined()
  })

  it('reads an explicit maximum per attribute and keeps the bare form for the best third', () => {
    const query = normalizeRentalQuery({ servicios: 'denuncias:120,agua:3.5,limpieza:abc,luz:-1' })
    expect(query.servicios).toEqual([
      { attribute: 'denuncias', max: 120 },
      { attribute: 'luz', max: null },
      { attribute: 'agua', max: 3.5 },
      { attribute: 'limpieza', max: null },
    ])
    expect(rentalQueryToParams(query).servicios).toBe('denuncias:120,luz,agua:3.5,limpieza')
  })

  it('keeps the first mention of a repeated attribute', () => {
    expect(normalizeRentalQuery({ servicios: ['agua:2', 'agua'] }).servicios).toEqual([
      { attribute: 'agua', max: 2 },
    ])
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

describe('department in the rental query', () => {
  it('accepts the Spanish alias and any spelling of a known department', () => {
    expect(normalizeRentalQuery({ departamento: 'montevideo' }).department).toBe('Montevideo')
    expect(normalizeRentalQuery({ departamento: 'RIO NEGRO' }).department).toBe('Río Negro')
    expect(normalizeRentalQuery({ department: 'san jose' }).department).toBe('San José')
    expect(normalizeRentalQuery({ department: 'Treinta y tres' }).department).toBe('Treinta y Tres')
  })

  it('prefers the explicit English key and passes unknown text through untouched', () => {
    expect(
      normalizeRentalQuery({ department: 'Maldonado', departamento: 'Canelones' }).department
    ).toBe('Maldonado')
    expect(normalizeRentalQuery({ department: 'Nowhere' }).department).toBe('Nowhere')
    expect(normalizeRentalQuery({}).department).toBe('')
  })
})
