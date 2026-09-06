import { describe, expect, it } from 'vitest'
import {
  opportunityAreaKey,
  opportunityDate,
  opportunityMoney,
  opportunityRentalPath,
} from '../../utils/propertyOpportunityPresentation'
import type { OpportunityPublicListing } from '../../utils/propertyOpportunities'

describe('opportunity evidence presentation', () => {
  it('never redirects sale listings or unsafe keys into a rental dossier', () => {
    const rent = {
      operation: 'rent',
      propertyKey: 'montevideo-cordon-unidad-301',
    } as OpportunityPublicListing
    expect(opportunityRentalPath(rent)).toBe('/alquileres/montevideo-cordon-unidad-301')
    expect(opportunityRentalPath({ ...rent, operation: 'sale' })).toBeNull()
    expect(opportunityRentalPath({ ...rent, propertyKey: '../cuenta' })).toBeNull()
    expect(opportunityRentalPath({ ...rent, propertyKey: undefined })).toBeNull()
  })
  it('preserves the original currency and distinguishes total from built area', () => {
    expect(opportunityMoney({ amount: 180000, currency: 'USD' }, 'es')).toBe('USD 180.000')
    expect(opportunityMoney({ amount: 36000, currency: 'UYU' }, 'en')).toBe('UYU 36,000')
    expect(opportunityAreaKey({ value: 90, basis: 'total' })).toBe('areaTotal')
    expect(opportunityAreaKey({ value: 40, basis: 'built' })).toBe('areaBuilt')
    expect(opportunityAreaKey({ value: 90, basis: 'reported' })).toBe('area')
  })
  it('does not fabricate a freshness date for missing or malformed dates', () => {
    expect(opportunityDate(null)).toBeNull()
    expect(opportunityDate('unknown')).toBeNull()
    expect(opportunityDate('2026-02-30')).toBeNull()
    expect(opportunityDate('2026-09-06T12:00:00Z', 'en')).toBe('Sep 6, 2026')
  })
  it('preserves a source calendar day and localizes only actual observation timestamps', () => {
    expect(opportunityDate('2026-09-06', 'en')).toBe('Sep 6, 2026')
    expect(opportunityDate('2026-09-06T01:00:00Z', 'en')).toBe('Sep 5, 2026')
  })
})
