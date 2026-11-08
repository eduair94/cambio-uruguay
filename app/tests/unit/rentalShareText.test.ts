import { describe, expect, it } from 'vitest'
import { rentalPageMessages } from '../../utils/rentalPageMessages'
import { rentalShareText } from '../../utils/rentalShareText'
import { RENTAL_SCAM_LINES, rentalScamWarning } from '../../utils/rentalVisitSafety'
import type { RentalOffer } from '../../utils/rentals'

const translate =
  (locale: keyof typeof rentalPageMessages) =>
  (key: string, values: Record<string, unknown> = {}) =>
    String((rentalPageMessages[locale] as Record<string, string>)[key] ?? key).replace(
      /\{(\w+)\}/g,
      (_, name: string) => String(values[name])
    )

type ShareOffer = Parameters<typeof rentalShareText>[0]
const offer = (overrides: Partial<ShareOffer> = {}): ShareOffer => ({
  price: 42000,
  currency: 'UYU',
  priceUyu: 42000,
  commonExpenses: 13400,
  commonExpensesCurrency: 'UYU',
  ...overrides,
})

describe('rentalShareText', () => {
  it('says rent + gastos comunes = total, the line the decision card shows', () => {
    expect(rentalShareText(offer(), 40, 'es', translate('es'))).toBe(
      '$ 42.000 + $ 13.400 de gastos comunes = $ 55.400 por mes'
    )
  })

  it('says "sin gastos comunes" only when the advert publishes zero', () => {
    expect(rentalShareText(offer({ commonExpenses: 0 }), 40, 'es', translate('es'))).toBe(
      '$ 42.000 por mes, sin gastos comunes'
    )
  })

  it('never estimates unknown gastos comunes', () => {
    expect(
      rentalShareText(
        offer({ commonExpenses: null, commonExpensesCurrency: null }),
        40,
        'es',
        translate('es')
      )
    ).toBe('$ 42.000 por mes, gastos comunes no informados')
    // Gastos en dólares sin cotización: no hay total que decir.
    expect(
      rentalShareText(
        offer({ commonExpenses: 100, commonExpensesCurrency: 'USD' }),
        0,
        'es',
        translate('es')
      )
    ).toBe('$ 42.000 por mes, gastos comunes no informados')
  })

  it('keeps a dollar rent in dollars and totals in pesos at the page rate', () => {
    expect(
      rentalShareText(
        offer({ price: 1000, currency: 'USD', priceUyu: 40000, commonExpenses: 5000 }),
        40,
        'es',
        translate('es')
      )
    ).toBe('U$S 1.000 + $ 5.000 de gastos comunes = $ 45.000 por mes')
  })

  it('renders in English and Portuguese', () => {
    expect(rentalShareText(offer(), 40, 'en', translate('en'))).toBe(
      '$ 42,000 + $ 13,400 common expenses = $ 55,400 a month'
    )
    expect(rentalShareText(offer(), 40, 'pt', translate('pt'))).toBe(
      '$ 42.000 + $ 13.400 de condomínio = $ 55.400 por mês'
    )
  })
})

describe('rentalScamWarning', () => {
  const advert = (overrides: Partial<RentalOffer> = {}) =>
    ({ source: 'infocasas', ownerDirect: null, ...overrides }) as Pick<
      RentalOffer,
      'source' | 'ownerDirect'
    >

  it('adds the three lines for social-media adverts and declared owner-direct ones', () => {
    for (const source of ['facebook', 'facebookreels', 'tiktok', 'instagram'] as const)
      expect(rentalScamWarning(advert({ source })), source).toBe(true)
    expect(
      rentalScamWarning(
        advert({
          ownerDirect: {
            declared: true,
            evidence: 'advert_text',
            sourceUrl: 'https://www.infocasas.com.uy/one',
            observedAt: '2026-11-08',
          } as RentalOffer['ownerDirect'],
        })
      )
    ).toBe(true)
  })

  it('stays quiet for portal agencies and missing adverts', () => {
    for (const source of ['infocasas', 'mercadolibre', 'elpais', 'casasweb'] as const)
      expect(rentalScamWarning(advert({ source })), source).toBe(false)
    expect(rentalScamWarning(null)).toBe(false)
  })

  it('has the three lines in every page language', () => {
    expect(RENTAL_SCAM_LINES).toHaveLength(3)
    for (const locale of ['es', 'en', 'pt'] as const)
      for (const key of [...RENTAL_SCAM_LINES, 'safetyTitle', 'scamGuide'])
        expect((rentalPageMessages[locale] as Record<string, string>)[key], key).toBeTruthy()
    expect(rentalPageMessages.es.scamDeposit).toContain('No pagues seña ni depósito')
  })
})
