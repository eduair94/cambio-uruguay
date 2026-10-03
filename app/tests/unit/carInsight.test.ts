import { describe, expect, it } from 'vitest'
import { buildCarInsight, carInsightVerdict, type CarInsightInput } from '../../utils/carInsight'
import type {
  PublicCarAdvisorSnapshot,
  PublicCarListing,
  PublicCarMarketRow,
  PublicCarMarketSnapshot,
  PublicCarReportSnapshot,
} from '../../utils/carsPublic'

let serial = 0
function listing(overrides: Partial<PublicCarListing> = {}): PublicCarListing {
  serial += 1
  const price = overrides.priceUsd ?? overrides.price ?? 18_000
  return {
    key: `ml-MLU${serial}`,
    source: 'mercadolibre',
    sourceName: 'Mercado Libre',
    brand: 'Volkswagen',
    brandSlug: 'volkswagen',
    model: 'Saveiro',
    modelSlug: 'saveiro',
    marketSlug: 'volkswagen-saveiro',
    title: `Saveiro ${serial}`,
    year: 2024,
    km: 40_000,
    price,
    listedPrice: null,
    currency: 'USD',
    priceUsd: price,
    priceConverted: false,
    currencyInferred: false,
    transmission: 'manual',
    fuel: 'nafta',
    fuelEconomy: null,
    body: { type: 'pickup', basis: 'model' },
    doors: null,
    color: null,
    engine: null,
    trim: null,
    department: 'Montevideo',
    neighborhood: null,
    sellerType: 'private',
    dealerName: null,
    picture: null,
    pictureCount: null,
    pictures: [],
    permalink: 'https://articulo.mercadolibre.com.uy/MLU-1',
    firstSeen: '2026-09-30T00:00:00.000Z',
    lastSeen: '2026-10-02T00:00:00.000Z',
    priceDrop: null,
    flags: [],
    risks: [],
    opportunity: null,
    reference: null,
    specs: null,
    ...overrides,
  }
}

function row(year: number, median: number, n = 10, kmMedian = 40_000): PublicCarMarketRow {
  return {
    year,
    trim: null,
    engine: null,
    transmission: null,
    n,
    sellers: n,
    p25: median * 0.95,
    median,
    p75: median * 1.05,
    kmMedian,
  }
}

const market: PublicCarMarketSnapshot = {
  version: 1,
  slug: 'volkswagen-saveiro',
  brand: 'Volkswagen',
  model: 'Saveiro',
  brandSlug: 'volkswagen',
  modelSlug: 'saveiro',
  generatedAt: '2026-10-02T00:00:00.000Z',
  listings: 400,
  years: [row(2025, 20_000), row(2024, 18_000), row(2023, 16_000), row(2022, 14_500)],
  rows: [],
  guide: [],
  guideUpdatedAt: null,
}

const report = {
  version: 1,
  generatedAt: '2026-10-02T00:00:00.000Z',
  usdUyu: 40,
  data: {
    valuation: {
      km: { value: 0.03, cohorts: 100, p25: 0.02, p75: 0.04 },
      automatic: { value: null, cohorts: 0, p25: null, p75: null },
      automaticWithTrim: { value: null, cohorts: 0, p25: null, p75: null },
      diesel: { value: null, cohorts: 0, p25: null, p75: null },
      endings: [],
    },
    depreciation: [
      {
        marketSlug: 'volkswagen-saveiro',
        brand: 'Volkswagen',
        model: 'Saveiro',
        annualDrop: 0.08,
        points: [
          { year: 2023, adverts: 20, medianUsd: 16_000 },
          { year: 2024, adverts: 20, medianUsd: 18_000 },
        ],
      },
    ],
    negotiation: {
      windowDays: 30,
      changed: 400,
      cut: 300,
      raised: 100,
      medianCut: 0.045,
      shareOfMarket: 0.1,
    },
    sellerGaps: {
      median: 0.05,
      models: [
        {
          marketSlug: 'volkswagen-saveiro',
          brand: 'Volkswagen',
          model: 'Saveiro',
          dealerMedian: 19_000,
          privateMedian: 18_000,
          gap: 0.06,
          cohorts: 4,
        },
      ],
    },
  },
} as unknown as PublicCarReportSnapshot

const advisor: PublicCarAdvisorSnapshot = {
  version: 1,
  generatedAt: '2026-10-02T00:00:00.000Z',
  usdUyu: 40,
  data: {
    typicalDrop: 0.07,
    partsBaseline: [],
    models: [
      {
        marketSlug: 'volkswagen-saveiro',
        brand: 'Volkswagen',
        model: 'Saveiro',
        brandSlug: 'volkswagen',
        modelSlug: 'saveiro',
        adverts: 400,
        sellers: 300,
        body: 'pickup',
        bodyShare: 1,
        specsN: 50,
        seats: 2,
        trunkL: null,
        lengthMm: null,
        powerHp: null,
        fourByFour: null,
        abs: { share: 1, n: 40 },
        airbags: { share: 1, n: 40 },
        esc: { share: 0.5, n: 4 },
        isofix: null,
        annualDrop: 0.08,
        dealerShare: 0.5,
        declaredRiskShare: 0.05,
        variants: [
          {
            fuel: 'nafta',
            transmission: 'manual',
            adverts: 300,
            litersPer100Km: 8,
            consumptionDeclaredShare: 0.1,
            years: [],
          },
        ],
        parts: {
          readAt: '2026-09-30T00:00:00.000Z',
          index: 0.9,
          offers: 120,
          parts: [
            { key: 'pastillas', median: 1_200, offers: 30 },
            { key: 'filtro_aceite', median: 400, offers: 30 },
            { key: 'amortiguador', median: 3_000, offers: 30 },
          ],
        },
      },
    ],
  },
}

const fuel = { super95: 80, gasoil50s: 70, asOf: '2026-10-01' }

function cohort(prices: number[], overrides: Partial<PublicCarListing> = {}): PublicCarListing[] {
  return prices.map(priceUsd => listing({ priceUsd, price: priceUsd, ...overrides }))
}

function input(overrides: Partial<CarInsightInput> = {}): CarInsightInput {
  return {
    car: listing({ priceUsd: 17_500, price: 17_500, km: 38_000 }),
    peers: cohort([17_000, 17_500, 18_000, 18_500, 19_000, 19_500]),
    alternatives: [],
    market,
    report,
    advisor,
    fuel,
    ...overrides,
  }
}

describe('carInsightVerdict', () => {
  it('maps the gap against the median to five bands', () => {
    expect(carInsightVerdict(-0.2)).toBe('muy-bajo')
    expect(carInsightVerdict(-0.15)).toBe('muy-bajo')
    expect(carInsightVerdict(-0.08)).toBe('bajo')
    expect(carInsightVerdict(0)).toBe('justo')
    expect(carInsightVerdict(0.05)).toBe('justo')
    expect(carInsightVerdict(0.1)).toBe('alto')
    expect(carInsightVerdict(0.3)).toBe('muy-alto')
  })
})

describe('buildCarInsight — position', () => {
  it('places the advert inside its own year and says how many ask less', () => {
    const insight = buildCarInsight(input())
    expect(insight.position).not.toBeNull()
    const position = insight.position!
    expect(position.basis).toBe('year')
    expect(position.n).toBe(6)
    expect(position.min).toBe(17_000)
    expect(position.max).toBe(19_500)
    expect(position.median).toBe(18_250)
    // Only 17.000 asks less than 17.500; the tie does not count as cheaper.
    expect(position.cheaperShare).toBeCloseTo(1 / 6)
    expect(position.gap).toBeCloseTo(17_500 / 18_250 - 1)
    expect(position.verdict).toBe('justo')
  })

  it('uses the version cohort when it has five clean peers', () => {
    const car = listing({ priceUsd: 21_000, price: 21_000, trim: 'Extreme' })
    const peers = [
      ...cohort([20_000, 20_500, 21_500, 22_000, 22_500], { trim: 'Extreme' }),
      ...cohort([15_000, 15_500, 16_000]),
    ]
    const insight = buildCarInsight(input({ car, peers }))
    expect(insight.position?.basis).toBe('version')
    expect(insight.position?.trim).toBe('Extreme')
    expect(insight.position?.n).toBe(5)
  })

  it('widens to year ±1 when the year alone has fewer than five', () => {
    const peers = [
      ...cohort([17_000, 18_000]),
      ...cohort([16_000, 16_500], { year: 2023 }),
      ...cohort([19_500], { year: 2025 }),
    ]
    const insight = buildCarInsight(input({ peers }))
    expect(insight.position?.basis).toBe('years')
    expect(insight.position?.n).toBe(5)
  })

  it('gives no verdict below five comparables', () => {
    const insight = buildCarInsight(input({ peers: cohort([17_000, 18_000, 19_000]) }))
    expect(insight.position).toBeNull()
  })

  it('compares against clean adverts only and never against itself', () => {
    const car = listing({ priceUsd: 17_500, price: 17_500 })
    const peers = [
      car,
      ...cohort([17_000, 18_000, 18_500, 19_000]),
      listing({ priceUsd: 9_000, price: 9_000, flags: ['damaged'] }),
      listing({ priceUsd: 9_500, price: 9_500, currencyInferred: true }),
    ]
    expect(buildCarInsight(input({ car, peers })).position).toBeNull()
    const more = [...peers, listing({ priceUsd: 18_200, price: 18_200 })]
    const insight = buildCarInsight(input({ car, peers: more }))
    expect(insight.position?.n).toBe(5)
    expect(insight.position?.min).toBe(17_000)
  })

  it('compares in dollars even when the advert is in pesos', () => {
    const car = listing({ price: 700_000, currency: 'UYU', priceUsd: 17_500, priceConverted: true })
    expect(buildCarInsight(input({ car })).position?.cheaperShare).toBeCloseTo(1 / 6)
  })
})

describe('buildCarInsight — km and picks', () => {
  it('corrects the expected price by kilometres with the tasador', () => {
    const insight = buildCarInsight(input())
    expect(insight.km).not.toBeNull()
    // 2.000 km under the 40.000 median: a hair above the year median.
    expect(insight.km!.expected).toBeGreaterThan(18_000)
    expect(insight.km!.perTenThousandUsd).toBe(540)
  })

  it('has no km correction when the advert has no km', () => {
    const insight = buildCarInsight(input({ car: listing({ km: null, priceUsd: 17_500 }) }))
    expect(insight.km).toBeNull()
    expect(insight.kmValue).toBeNull()
  })

  it('picks the cheapest of the same year, skipping risky and inferred adverts', () => {
    const cheapRisky = listing({ priceUsd: 12_000, price: 12_000, risks: [{} as never] })
    const inferred = listing({ priceUsd: 12_500, price: 12_500, currencyInferred: true })
    const clean = listing({ priceUsd: 16_800, price: 16_800 })
    const insight = buildCarInsight(
      input({ peers: [cheapRisky, inferred, clean, ...cohort([18_000, 18_500, 19_000, 19_500])] })
    )
    const pick = insight.picks.find(item => item.kind === 'cheapest-same')
    expect(pick?.car.key).toBe(clean.key)
  })

  it('finds the best price for its year and kilometres', () => {
    // 2023 at 15.000 with 30.000 km is well under its year median of 16.000.
    const bargain = listing({ year: 2023, priceUsd: 15_000, price: 15_000, km: 30_000 })
    const insight = buildCarInsight(input({ peers: [...input().peers, bargain] }))
    const pick = insight.picks.find(item => item.kind === 'best-km-value')
    expect(pick?.car.key).toBe(bargain.key)
    expect(insight.kmValue?.of).toBe(8)
    expect(insight.kmValue!.rank).toBeGreaterThan(1)
  })

  it('finds the lowest km and the newest for the same money', () => {
    const lowKm = listing({ priceUsd: 18_000, price: 18_000, km: 9_000 })
    const tooExpensive = listing({ priceUsd: 25_000, price: 25_000, km: 1_000, year: 2025 })
    const newer = listing({ priceUsd: 18_300, price: 18_300, km: 30_000, year: 2025 })
    const insight = buildCarInsight(
      input({ peers: [...input().peers, lowKm, tooExpensive, newer] })
    )
    const keys = insight.picks.map(item => item.car.key)
    // 9.000 km at the year median is also the best price for its kilometres, so it may surface under
    // that card; what matters is that both cars are offered and the expensive one never is.
    expect(keys).toContain(lowKm.key)
    expect(keys).toContain(newer.key)
    expect(keys).not.toContain(tooExpensive.key)
  })

  it('offers the lowest km for the money under its own card when nothing else claims it', () => {
    const lowKm = listing({ priceUsd: 18_300, price: 18_300, km: 20_000 })
    const insight = buildCarInsight(
      input({
        peers: [...input().peers, lowKm],
        report: {
          ...report,
          data: {
            ...report.data,
            valuation: {
              ...report.data.valuation,
              km: { value: null, cohorts: 0, p25: null, p75: null },
            },
          },
        } as PublicCarReportSnapshot,
      })
    )
    expect(insight.picks.find(item => item.kind === 'lowest-km-for-price')?.car.key).toBe(lowKm.key)
  })

  it('treats a title that declares debt or a crash as not clean, unless it denies it', () => {
    const debt = listing({
      priceUsd: 15_000,
      price: 15_000,
      title: 'Saveiro 2024 deuda de patente',
    })
    const denied = listing({ priceUsd: 16_000, price: 16_000, title: 'Saveiro 2024 sin deuda' })
    const insight = buildCarInsight(input({ peers: [...input().peers, debt, denied] }))
    expect(insight.picks.find(item => item.kind === 'cheapest-same')?.car.key).toBe(denied.key)
    expect(insight.picks.map(item => item.car.key)).not.toContain(debt.key)
  })

  it('does not pick lowest km from a placeholder or an implausible odometer', () => {
    const now = new Date('2026-10-03T00:00:00.000Z')
    const placeholder = listing({ priceUsd: 17_000, price: 17_000, km: 12_345, year: 2018 })
    const implausible = listing({ priceUsd: 17_000, price: 17_000, km: 2_000, year: 2015 })
    const real = listing({ priceUsd: 17_000, price: 17_000, km: 20_000 })
    const insight = buildCarInsight(
      input({ now, peers: [...input().peers, placeholder, implausible, real] })
    )
    const keys = insight.picks
      .filter(item => item.kind === 'lowest-km-for-price' || item.kind === 'best-km-value')
      .map(item => item.car.key)
    expect(keys).not.toContain(placeholder.key)
    expect(keys).not.toContain(implausible.key)
  })

  it('never shows the same advert twice', () => {
    const insight = buildCarInsight(input())
    const keys = insight.picks.map(item => item.car.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('groups other models in the same money and picks the newest of them', () => {
    const strada = (year: number, priceUsd: number, km: number) =>
      listing({
        marketSlug: 'fiat-strada',
        brand: 'Fiat',
        model: 'Strada',
        year,
        priceUsd,
        price: priceUsd,
        km,
      })
    const alternatives = [
      strada(2025, 17_000, 10_000),
      strada(2024, 17_200, 30_000),
      strada(2023, 16_500, 50_000),
      listing({ marketSlug: 'volkswagen-saveiro', priceUsd: 17_000, price: 17_000 }),
      listing({ marketSlug: 'renault-oroch', brand: 'Renault', model: 'Oroch', year: 2022 }),
    ]
    const insight = buildCarInsight(input({ alternatives }))
    expect(insight.alternatives.map(item => item.marketSlug)).toEqual(['fiat-strada'])
    expect(insight.alternatives[0]).toMatchObject({ adverts: 3, medianYear: 2024 })
    expect(insight.picks.find(item => item.kind === 'other-newest')?.car.model).toBe('Strada')
  })
})

describe('buildCarInsight — owning it', () => {
  it('uses the model depreciation and projects one year', () => {
    const insight = buildCarInsight(input())
    expect(insight.depreciation).toMatchObject({ annualDrop: 0.08, fromMarket: false })
    expect(insight.depreciation!.inOneYearUsd).toBe(16_100)
  })

  it('falls back to the market drop and says so', () => {
    const car = listing({ marketSlug: 'fiat-uno', priceUsd: 5_000, price: 5_000 })
    const insight = buildCarInsight(input({ car, peers: [], market: null }))
    expect(insight.depreciation).toMatchObject({ annualDrop: 0.07, fromMarket: true })
  })

  it('costs the advert with its own consumption when it declares one', () => {
    const car = listing({
      priceUsd: 17_500,
      price: 17_500,
      fuelEconomy: {
        litersPer100Km: 10,
        city: null,
        highway: null,
        combined: null,
        basis: 'advert',
        sellers: null,
      } as never,
    })
    const insight = buildCarInsight(input({ car }))
    expect(insight.costs?.consumption).toBe(10)
    // 10 L/100 km × 12.000 km × $ 80
    expect(insight.costs?.fuelUyu).toBe(96_000)
    expect(insight.costs?.kmYear).toBe(12_000)
  })

  it('has no costs without fuel prices', () => {
    expect(buildCarInsight(input({ fuel: null })).costs).toBeNull()
  })

  it('carries parts, safety, negotiation and the dealer gap of the model', () => {
    const insight = buildCarInsight(input())
    expect(insight.parts?.parts).toHaveLength(3)
    // ESC with only 4 sheets is not enough to say anything.
    expect(insight.safety.esc).toBeNull()
    expect(insight.safety.abs).toEqual({ share: 1, n: 40 })
    expect(insight.negotiation).toMatchObject({ medianCut: 0.045, cutShare: 0.75 })
    expect(insight.sellerGap?.gap).toBe(0.06)
  })
})
