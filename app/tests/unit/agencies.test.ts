import { describe, expect, it } from 'vitest'
import {
  agencyCatalogueLinks,
  buildAgencyDirectory,
  normalizeAgencyQuery,
  queryAgencies,
  type AgencyAggregateRow,
} from '../../utils/agencies'
const now = Date.parse('2026-09-07T10:00:00Z')
const row = (key: string, overrides: Partial<AgencyAggregateRow> = {}): AgencyAggregateRow => ({
  agency: {
    version: 1,
    key,
    name: 'Same company name',
    profileUrl: `https://www.infocasas.com.uy/inmobiliarias/perfil/${key.split(':')[1]}-company`,
    observedAt: new Date(now).toISOString(),
  },
  source: 'infocasas',
  operation: 'rent',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  count: 3,
  lastSeen: new Date(now).toISOString(),
  ...overrides,
})
describe('agency directory identity and honest counts', () => {
  it('keeps homonymous companies separate; rental and sale adverts for one native profile share a page', () => {
    const output = buildAgencyDirectory(
      [row('infocasas:1'), row('infocasas:1', { operation: 'sale', count: 2 }), row('infocasas:2')],
      now
    )
    expect(output).toHaveLength(2)
    expect(output[0]).toMatchObject({
      listings: 5,
      rentals: 3,
      sales: 2,
      zones: [{ department: 'Montevideo', neighborhood: 'Cordón', listings: 5 }],
    })
  })
  it('does not include expired or source-mismatched profiles', () => {
    expect(
      buildAgencyDirectory(
        [
          row('infocasas:1', { source: 'casasweb' }),
          row('infocasas:2', {
            agency: {
              ...(row('infocasas:2').agency as object),
              observedAt: '2025-01-01T00:00:00Z',
            },
          }),
        ],
        now
      )
    ).toEqual([])
  })
  it('filters before pagination while maintaining global partial-source coverage', () => {
    const rows = buildAgencyDirectory(
      [row('infocasas:1'), row('infocasas:2', { operation: 'sale', department: 'Canelones' })],
      now
    )
    const response = queryAgencies(
      rows,
      { department: 'Canelones', operation: 'sale', page: 999 },
      now
    )
    expect(response).toMatchObject({
      total: 1,
      page: 1,
      pages: 1,
      coverage: { agencies: 2, listings: 6 },
    })
    expect(response.items[0]?.agency.key).toBe('infocasas:2')
  })
  it('uses stable filters for both operations and bounds query inputs', () => {
    expect(agencyCatalogueLinks('infocasas:1')).toEqual({
      rentals: '/alquileres-uruguay?agency=infocasas%3A1',
      sales: '/venta-viviendas-uruguay?agency=infocasas%3A1',
    })
    expect(
      normalizeAgencyQuery({ page: -1, perPage: 999, q: ['bad'], operation: 'evil' })
    ).toMatchObject({ page: 1, perPage: 48, q: '', operation: 'all' })
  })
})
