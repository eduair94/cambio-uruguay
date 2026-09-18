import { describe, expect, it } from 'vitest'
import { carReportFindings, type CarReportResponse } from '../../utils/carsReport'

type Report = CarReportResponse['data']
type Model = Report['models'][number]

const model = (slug: string, median: number, annualDrop: number | null): Model => ({
  marketSlug: slug,
  brand: 'Marca',
  model: slug,
  adverts: 100,
  share: 0.01,
  price: { p25: median * 0.9, median, p75: median * 1.1 },
  medianYear: 2019,
  medianKm: 90_000,
  annualDrop,
  spread: 0.2,
  dealerShare: 0.5,
  automaticShare: 0.2,
  declaredRiskShare: 0,
})

const report = (overrides: Partial<Report> = {}): Report =>
  ({
    models: [
      model('grande-1', 30_000, 0.12),
      model('grande-2', 28_000, 0.1),
      model('grande-3', 35_000, 0.11),
      model('chico-1', 9_000, 0.04),
      model('chico-2', 10_000, 0.03),
      model('chico-3', 11_000, 0.05),
    ],
    depreciation: [],
    negotiation: {
      windowDays: 7,
      changed: 387,
      cut: 359,
      raised: 28,
      medianCut: 0.048,
      shareOfMarket: 0.021,
    },
    sellerGaps: {
      median: 0.027,
      models: [
        {
          marketSlug: 'amarok',
          brand: 'Volkswagen',
          model: 'Amarok',
          dealerMedian: 25_000,
          privateMedian: 26_500,
          gap: -0.06,
          cohorts: 4,
        },
      ],
    },
    valuation: {
      km: { value: 0.016, cohorts: 359, p25: 0.011, p75: 0.022 },
      automatic: { value: 0.051, cohorts: 28, p25: 0.013, p75: 0.098 },
      automaticWithTrim: { value: 0.102, cohorts: 104, p25: 0.047, p75: 0.189 },
      diesel: { value: 0.485, cohorts: 17, p25: 0.308, p75: 0.629 },
      endings: [],
    },
    ...overrides,
  }) as unknown as Report

const titles = (findings: ReturnType<typeof carReportFindings>) => findings.map(item => item.title)

describe('carReportFindings', () => {
  it('turns every measurement it has into a stated conclusion with its number', () => {
    const findings = carReportFindings(report(), { medianGap: 0.21, p25Gap: 0.1, measured: 14 })
    expect(titles(findings)).toEqual([
      'Los autos grandes pierden valor mucho más rápido',
      'La caja automática vale menos de lo que parece',
      'Es un mercado de compradores',
      'La automotora cobra poco más que el dueño',
      'Una deuda declarada se descuenta',
      'Los kilómetros pesan menos que el año',
    ])
    expect(findings[0]!.body).toContain('11,0 %')
    expect(findings[0]!.body).toContain('4,0 %')
    expect(findings[2]!.body).toContain('9 bajan')
    expect(findings[3]!.body).toContain('Volkswagen Amarok')
  })
  it('drops a conclusion the moment the data stops supporting it', () => {
    const flat = report({
      models: [
        model('grande-1', 30_000, 0.03),
        model('grande-2', 28_000, 0.03),
        model('grande-3', 35_000, 0.03),
        model('chico-1', 9_000, 0.05),
        model('chico-2', 10_000, 0.05),
        model('chico-3', 11_000, 0.05),
      ],
    })
    expect(titles(carReportFindings(flat))).not.toContain(
      'Los autos grandes pierden valor mucho más rápido'
    )
    // Sin la deuda medida no se afirma nada sobre la deuda.
    expect(titles(carReportFindings(report()))).not.toContain('Una deuda declarada se descuenta')
    // Ni cuando el 50 % central cruza el cero, que es lo que pasó en producción el 2026-09-19.
    expect(
      titles(carReportFindings(report(), { medianGap: 0.022, p25Gap: -0.038, measured: 13 }))
    ).not.toContain('Una deuda declarada se descuenta')
    // Ni con muestra chica aunque el número sea lindo.
    expect(
      titles(carReportFindings(report(), { medianGap: 0.21, p25Gap: 0.1, measured: 7 }))
    ).not.toContain('Una deuda declarada se descuenta')
  })
  it('does not call it a buyer market when prices go up as often as down', () => {
    const balanced = report({
      negotiation: {
        windowDays: 7,
        changed: 200,
        cut: 100,
        raised: 100,
        medianCut: 0.04,
        shareOfMarket: 0.01,
      },
    })
    expect(titles(carReportFindings(balanced))).not.toContain('Es un mercado de compradores')
  })
})
