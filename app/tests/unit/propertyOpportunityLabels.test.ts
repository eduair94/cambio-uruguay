import { describe, expect, it } from 'vitest'
import { propertyOpportunityLabels } from '../../utils/propertyOpportunityLabels'
import type { OpportunityItem } from '../../utils/propertyOpportunities'

function item(): OpportunityItem {
  return {
    subject: {
      id: 'rent:infocasas:123',
      operation: 'rent',
      source: 'infocasas',
      listingId: 'infocasas:123',
      url: 'https://www.infocasas.com.uy/apartamento/123',
      title: 'Apartamento en alquiler',
      image: null,
      sellerName: 'Anunciante',
      department: 'Montevideo',
      locality: 'Montevideo',
      neighborhood: 'Cordón',
      propertyType: 'apartamento',
      bedrooms: 1,
      bathrooms: 1,
      area: { value: 40, basis: 'built' },
      price: { amount: 20000, currency: 'UYU' },
      expenses: { amount: 4000, currency: 'UYU' },
      comparisonPrice: 24000,
      lastSeen: '2026-09-07',
      publishedAt: null,
    },
    analysis: {
      pricingBasis: 'monthly_total',
      currency: 'UYU',
      median: 30000,
      q25: 28000,
      q75: 32000,
      spread: 0.1333,
      gapPct: 20,
      conservativeGapPct: 14.3,
      perAreaGapPct: 25,
      distinctN: 12,
      sellersN: 6,
      sources: ['infocasas', 'casasweb'],
      oldestLastSeen: '2026-09-05',
      newestLastSeen: '2026-09-07',
      areaBasis: 'built',
      areaMin: 36,
      areaMax: 46,
      confidence: 'supported',
      signals: ['total_price', 'price_per_m2'],
      evidenceTier: 'standard',
      comparisonScope: 'same_features',
      perAreaMedian: 800,
      perAreaQ25: 750,
      perAreaQ75: 850,
    },
    comparables: [],
    cautions: ['asking_prices_only', 'availability_unverified'],
  }
}

describe('truthful opportunity labels', () => {
  it('uses the existing total signal first and explains the full server cohort, not the visible links', () => {
    const result = propertyOpportunityLabels(item())
    expect(result.primary).toMatchObject({ id: 'total_price', label: 'Menor costo mensual' })
    expect(result.primary?.explanation).toContain(
      '20% por debajo de la mediana de 12 anuncios de 6'
    )
    expect(result.primary?.explanation).toContain('InfoCasas, Casasweb')
    expect(result.primary?.explanation).toContain('UYU 30.000')
    expect(result.primary?.explanation).toContain('no una tasación')
    expect(result.secondary.map(label => label.id)).toEqual(['price_per_m2', 'expenses_known'])
  })

  it('follows an explicitly selected signal without changing any metric or input', () => {
    const input = item()
    const before = JSON.stringify(input)
    const result = propertyOpportunityLabels(input, { selectedSignal: 'price_per_m2' })
    expect(result.primary).toMatchObject({ id: 'price_per_m2', label: 'Menor precio por m²' })
    expect(result.primary?.explanation).toContain('25%')
    expect(result.primary?.explanation).toContain('superficie construida')
    expect(result.secondary.map(label => label.id)).toEqual(['total_price', 'expenses_known'])
    expect(JSON.stringify(input)).toBe(before)
  })

  it('never creates a total-price label from a strong per-area discount', () => {
    const input = item()
    input.analysis.signals = ['price_per_m2']
    input.analysis.gapPct = 4
    const result = propertyOpportunityLabels(input, { selectedSignal: 'total_price' })
    expect(result.primary?.id).toBe('price_per_m2')
    expect(result.secondary.map(label => label.id)).not.toContain('total_price')
  })

  it('always retains the exploratory caution within the one-plus-two badge limit', () => {
    const input = item()
    input.analysis.evidenceTier = 'exploratory'
    const result = propertyOpportunityLabels(input)
    expect(result.secondary.map(label => label.id)).toEqual(['exploratory', 'price_per_m2'])
    expect(result.secondary[0]).toMatchObject({
      tone: 'caution',
      label: 'Comparación exploratoria',
    })
    expect(result.secondary[0]?.explanation).toContain('limitaciones')
  })

  it('keeps legacy strict signals but respects explicit empty or unknown-only signals', () => {
    const input = item()
    input.analysis.signals = undefined
    expect(propertyOpportunityLabels(input).primary?.id).toBe('total_price')
    input.analysis.signals = []
    expect(propertyOpportunityLabels(input)).toEqual({ primary: null, secondary: [] })
    input.analysis.signals = ['hot', 'exclusive'] as unknown as typeof input.analysis.signals
    expect(propertyOpportunityLabels(input)).toEqual({ primary: null, secondary: [] })
  })

  it('suppresses positive labels when the caller reports an old analysis', () => {
    expect(propertyOpportunityLabels(item(), { stale: true })).toEqual({
      primary: null,
      secondary: [],
    })
  })

  it('never treats unknown expenses as zero or as a complete monthly comparison', () => {
    const input = item()
    input.subject.expenses = null
    expect(propertyOpportunityLabels(input)).toEqual({ primary: null, secondary: [] })
    input.subject.expenses = { amount: 0, currency: 'UYU' }
    expect(
      propertyOpportunityLabels(input).secondary.find(label => label.id === 'expenses_known')
    ).toMatchObject({ label: 'Alquiler + GC informados' })
  })

  it('keeps original mixed currencies in the expense breakdown and does not claim all costs are covered', () => {
    const input = item()
    input.analysis.signals = ['total_price']
    input.subject.price = { amount: 500, currency: 'USD' }
    const badge = propertyOpportunityLabels(input).secondary.find(
      label => label.id === 'expenses_known'
    )
    expect(badge?.explanation).toContain('USD 500')
    expect(badge?.explanation).toContain('UYU 4.000')
    expect(badge?.explanation).toContain('No incluye servicios, garantía ni otros gastos')
  })

  it('uses sale asking-price language without interpreting monthly expenses as part of the purchase price', () => {
    const input = item()
    input.subject.operation = 'sale'
    input.analysis.pricingBasis = 'asking_price'
    input.analysis.currency = 'USD'
    const result = propertyOpportunityLabels(input)
    expect(result.primary?.label).toBe('Menor precio')
    expect(result.primary?.explanation).toContain('precio de venta publicado')
    expect(result.secondary.map(label => label.id)).not.toContain('expenses_known')
  })

  it.each(['es', 'en', 'pt'])('provides localized descriptions and labels in %s', locale => {
    const input = item()
    input.analysis.evidenceTier = 'exploratory'
    const result = propertyOpportunityLabels(input, { locale, selectedSignal: 'price_per_m2' })
    const expected = {
      es: 'Menor precio por m²',
      en: 'Lower price per m²',
      pt: 'Menor preço por m²',
    }
    expect(result.primary?.label).toBe(expected[locale as keyof typeof expected])
    expect(result.primary?.explanation).toContain('InfoCasas')
    expect(result.secondary[0]?.explanation.length).toBeGreaterThan(40)
  })

  it('labels total area distinctly and rejects an inconsistent or unknown area basis', () => {
    const input = item()
    input.subject.area.basis = 'total'
    input.analysis.areaBasis = 'total'
    expect(
      propertyOpportunityLabels(input, { selectedSignal: 'price_per_m2' }).primary?.explanation
    ).toContain('superficie total')
    input.subject.area.basis = 'reported'
    expect(propertyOpportunityLabels(input).primary).toBeNull()
  })

  it('preserves the published comparison precision per m²', () => {
    const input = item()
    input.analysis.perAreaMedian = 800.25
    expect(
      propertyOpportunityLabels(input, { selectedSignal: 'price_per_m2' }).primary?.explanation
    ).toContain('UYU 800,25/m²')
  })

  it.each([NaN, Infinity, 0, -20])(
    'rejects invalid reference %s without displaying a discount',
    median => {
      const input = item()
      input.analysis.signals = ['total_price']
      input.analysis.median = median
      expect(propertyOpportunityLabels(input).primary).toBeNull()
    }
  )

  it('does not invent missing per-m² statistics or a below-reference claim at equality', () => {
    const input = item()
    input.analysis.signals = ['price_per_m2']
    input.analysis.perAreaMedian = undefined
    expect(propertyOpportunityLabels(input).primary).toBeNull()
    input.analysis.signals = ['total_price']
    input.analysis.median = input.subject.comparisonPrice
    expect(propertyOpportunityLabels(input).primary).toBeNull()
  })

  it('does not award labels based on high asking prices, many listings, source count or recent readings', () => {
    const input = item()
    input.subject.price.amount = 2000000
    input.subject.comparisonPrice = 2000000
    input.analysis.distinctN = 1000
    input.analysis.signals = []
    expect(propertyOpportunityLabels(input)).toEqual({ primary: null, secondary: [] })
  })
})
