import { describe, expect, it } from 'vitest'
import type { PublicCarMarketSnapshot, PublicCarValuation } from '../../utils/carsPublic'
import {
  carMarketPrice,
  carValuationRowKey,
  carValuationVersions,
  carValuationYearlyLoss,
  carValuationYears,
  estimateCarValue,
} from '../../utils/carsValuation'

const market: PublicCarMarketSnapshot = {
  version: 1,
  slug: 'chevrolet-onix',
  brand: 'Chevrolet',
  model: 'Onix',
  brandSlug: 'chevrolet',
  modelSlug: 'onix',
  generatedAt: '2026-09-19T00:00:00.000Z',
  listings: 600,
  years: [
    {
      year: 2020,
      trim: null,
      engine: null,
      transmission: null,
      n: 56,
      sellers: 40,
      p25: 12_000,
      median: 13_490,
      p75: 14_500,
      kmMedian: 80_000,
    },
    {
      year: 2019,
      trim: null,
      engine: null,
      transmission: null,
      n: 3,
      sellers: 3,
      p25: 11_000,
      median: 11_500,
      p75: 12_000,
      kmMedian: 90_000,
    },
  ],
  rows: [
    {
      year: 2020,
      trim: 'Premier',
      engine: '1.0T',
      transmission: 'automatica',
      n: 8,
      sellers: 7,
      p25: 14_500,
      median: 15_200,
      p75: 15_900,
      kmMedian: 70_000,
    },
    {
      year: 2020,
      trim: 'Joy',
      engine: '1.0',
      transmission: 'manual',
      n: 4,
      sellers: 4,
      p25: 10_900,
      median: 11_200,
      p75: 11_600,
      kmMedian: 90_000,
    },
  ],
  guide: [],
  guideUpdatedAt: null,
}

const coefficients: PublicCarValuation = {
  km: { value: 0.016, cohorts: 358, p25: 0.011, p75: 0.022 },
  automatic: { value: 0.06, cohorts: 40, p25: 0.02, p75: 0.1 },
  automaticWithTrim: { value: 0.104, cohorts: 104, p25: 0.048, p75: 0.189 },
  diesel: { value: 0.485, cohorts: 17, p25: 0.308, p75: 0.629 },
  endings: [],
}

describe('estimateCarValue', () => {
  it('uses the model-year cohort and leaves its prices alone at its own median km', () => {
    const estimate = estimateCarValue(market, coefficients, {
      year: 2020,
      km: 80_000,
      rowKey: null,
    })!
    expect(estimate.basis).toBe('year')
    expect(estimate).toMatchObject({ low: 12_000, mid: 13_490, high: 14_500, kmFactor: 1 })
  })
  it('lowers the price for a car with more kilometres than its twins, and raises it for fewer', () => {
    const worn = estimateCarValue(market, coefficients, { year: 2020, km: 130_000, rowKey: null })!
    const fresh = estimateCarValue(market, coefficients, { year: 2020, km: 40_000, rowKey: null })!
    // 50.000 km más a 1,6 % cada 10.000: 0,984^5 ≈ 0,922.
    expect(worn.kmFactor).toBeCloseTo(0.922, 2)
    expect(worn.mid).toBeLessThan(13_490)
    expect(fresh.mid).toBeGreaterThan(13_490)
  })
  it('never stretches the km correction beyond a quarter of the price', () => {
    const extreme = estimateCarValue(market, coefficients, {
      year: 2020,
      km: 900_000,
      rowKey: null,
    })!
    expect(extreme.kmFactor).toBe(0.75)
    expect(extreme.kmCapped).toBe(true)
  })
  it('prefers the exact version when it has its own cohort', () => {
    const premier = carValuationRowKey({
      trim: 'Premier',
      engine: '1.0T',
      transmission: 'automatica',
    })
    const estimate = estimateCarValue(market, coefficients, {
      year: 2020,
      km: 70_000,
      rowKey: premier,
    })!
    expect(estimate.basis).toBe('version')
    expect(estimate.mid).toBe(15_200)
  })
  it('falls back to the year when the chosen version is too thin to trust', () => {
    const joy = carValuationRowKey({ trim: 'Joy', engine: '1.0', transmission: 'manual' })
    expect(
      estimateCarValue(market, coefficients, { year: 2020, km: null, rowKey: joy })!.basis
    ).toBe('year')
  })
  it('abstains instead of guessing when the year has too few adverts', () => {
    expect(
      estimateCarValue(market, coefficients, { year: 2019, km: 90_000, rowKey: null })
    ).toBeNull()
    expect(
      estimateCarValue(market, coefficients, { year: 2008, km: 90_000, rowKey: null })
    ).toBeNull()
  })
  it('works without coefficients, just without the km correction', () => {
    const estimate = estimateCarValue(market, null, { year: 2020, km: 200_000, rowKey: null })!
    expect(estimate.kmFactor).toBe(1)
  })
})

describe('carMarketPrice', () => {
  it('snaps to the endings the market itself uses', () => {
    expect(carMarketPrice(13_460)).toBe(13_500)
    expect(carMarketPrice(13_870)).toBe(13_900)
    expect(carMarketPrice(13_975)).toBe(13_990)
    expect(carMarketPrice(0)).toBe(0)
  })
})

describe('the selectors', () => {
  it('only offer years and versions that can carry a number', () => {
    expect(carValuationYears(market)).toEqual([2020])
    expect(carValuationVersions(market, 2020).map(row => row.trim)).toEqual(['Premier'])
  })
  it('turns the yearly drop into dollars', () => {
    expect(carValuationYearlyLoss(13_490, 0.05)).toBe(675)
    expect(carValuationYearlyLoss(13_490, null)).toBeNull()
  })
})
