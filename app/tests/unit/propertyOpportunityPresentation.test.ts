import { describe, expect, it } from 'vitest'
import {
  opportunityAreaKey,
  opportunityDate,
  opportunityMoney,
  opportunityRentalPath,
  opportunitySignals,
  opportunityPrimaryMetric,
} from '../../utils/propertyOpportunityPresentation'
import type { OpportunityItem, OpportunityPublicListing } from '../../utils/propertyOpportunities'

describe('opportunity evidence presentation', () => {
  const item = {
    subject: { comparisonPrice: 120000, area: { value: 80, basis: 'built' } },
    analysis: {
      median: 125000,
      q25: 121000,
      q75: 132000,
      gapPct: 4,
      perAreaGapPct: 25,
      perAreaMedian: 2000,
      perAreaQ25: 1800,
      perAreaQ75: 2200,
      signals: ['price_per_m2'],
    },
  } as OpportunityItem
  it('uses the full-cohort per-m² reference without replacing the actual total price', () => {
    expect(opportunityPrimaryMetric(item)).toMatchObject({
      signal: 'price_per_m2',
      value: 1500,
      median: 2000,
      q25: 1800,
      gapPct: 25,
    })
    expect(item.subject.comparisonPrice).toBe(120000)
    expect(item.analysis.median).toBe(125000)
  })
  it('uses the selected metric when both signals exist, with total price as the default', () => {
    const both = {
      ...item,
      analysis: { ...item.analysis, signals: ['total_price', 'price_per_m2'] as const },
    } as unknown as OpportunityItem
    expect(opportunityPrimaryMetric(both)?.median).toBe(125000)
    expect(opportunityPrimaryMetric(both, 'price_per_m2')?.median).toBe(2000)
  })
  it('preserves strict legacy evidence but never invents a signal from an explicit empty array or missing per-area statistics', () => {
    const legacy = { ...item, analysis: { ...item.analysis, signals: undefined } }
    expect(opportunitySignals(legacy)).toEqual(['total_price'])
    expect(opportunityPrimaryMetric(legacy)?.signal).toBe('total_price')
    expect(
      opportunityPrimaryMetric({ ...item, analysis: { ...item.analysis, signals: [] } })
    ).toBeNull()
    expect(
      opportunityPrimaryMetric({
        ...item,
        analysis: { ...item.analysis, perAreaMedian: undefined },
      })
    ).toBeNull()
  })
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
