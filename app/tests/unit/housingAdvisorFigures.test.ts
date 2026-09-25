import { describe, expect, it } from 'vitest'
import {
  HOUSING_ADVISOR_CHECKLIST,
  HOUSING_ADVISOR_FAQ,
  HOUSING_BUY_ENTRY,
  HOUSING_CREDIT_PROFILES,
  HOUSING_GUARANTEE_CAPS,
  HOUSING_RENT_ENTRY,
  housingInstallment,
  housingMonthlyRate,
} from '../../utils/housingAdvisorFigures'

describe('cuota del sistema francés con tasa efectiva anual', () => {
  it('la TEA se pasa a tasa mensual efectiva, no se divide por 12', () => {
    expect(housingMonthlyRate(0.045)).toBeCloseTo(1.045 ** (1 / 12) - 1, 12)
    expect(housingMonthlyRate(0.045)).toBeLessThan(0.045 / 12)
  })
  it('cuota de 1.000.000 al 4,5 % en 25 años', () => {
    const i = 1.045 ** (1 / 12) - 1
    const expected = (1_000_000 * i) / (1 - (1 + i) ** -300)
    expect(housingInstallment(1_000_000, 0.045, 25)).toBeCloseTo(expected, 6)
  })
  it('con tasa cero es el capital repartido en las cuotas', () => {
    expect(housingInstallment(120_000, 0, 10)).toBe(1_000)
  })
})

describe('cifras con fecha y fuente', () => {
  const figures = [
    HOUSING_GUARANTEE_CAPS.figure,
    HOUSING_BUY_ENTRY.figure,
    HOUSING_RENT_ENTRY.figure,
    ...Object.values(HOUSING_CREDIT_PROFILES).map(profile => profile.figure),
  ]
  it.each(figures.map(figure => [figure.source, figure]))('%s', (_, figure) => {
    expect(figure.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(figure.sourceUrl).toMatch(/^https:\/\//)
  })

  it('los topes publicados, tal como los publica cada uno', () => {
    expect(HOUSING_GUARANTEE_CAPS).toMatchObject({ contaduria: 0.4, anda: 0.4, mapfre: 0.3 })
    expect(HOUSING_CREDIT_PROFILES.bhu).toMatchObject({
      tea: 0.045,
      maxYears: 25,
      financing: 0.9,
      installmentCap: 0.25,
    })
    expect(HOUSING_CREDIT_PROFILES.banco).toMatchObject({
      tea: 0.0475,
      maxYears: 20,
      financing: 0.8,
      installmentCap: 0.35,
    })
    expect(
      HOUSING_BUY_ENTRY.itp + HOUSING_BUY_ENTRY.deedHigh + HOUSING_BUY_ENTRY.commission
    ).toBeCloseTo(0.1066, 6)
    expect(HOUSING_RENT_ENTRY.commissionMonths).toBe(1.22)
  })

  it('el checklist y las preguntas tienen contenido y enlaces seguros', () => {
    expect(HOUSING_ADVISOR_CHECKLIST.length).toBeGreaterThanOrEqual(5)
    for (const item of HOUSING_ADVISOR_CHECKLIST)
      if (item.url) expect(item.url).toMatch(/^https:\/\/|^\/[a-z]/)
    expect(HOUSING_ADVISOR_FAQ.length).toBeGreaterThanOrEqual(5)
  })
})
