import { describe, expect, it } from 'vitest'
import {
  adviseCars,
  carAdvisorQueryParams,
  normalizeCarAdvisorQuery,
  type CarAdvisorQuery,
} from '../../utils/carAdvisor'
import type {
  PublicCarAdvisorModel,
  PublicCarAdvisorSnapshot,
  PublicCarAdvisorVariant,
} from '../../utils/carsPublic'

const years = (rows: Array<[number, number, number?]>) =>
  rows.map(([year, median, p25]) => ({
    year,
    n: 10,
    p25: p25 ?? median - 1000,
    median,
    p75: median + 1000,
    kmMedian: (2027 - year) * 15_000,
  }))

const variant = (overrides: Partial<PublicCarAdvisorVariant>): PublicCarAdvisorVariant => ({
  fuel: 'nafta',
  transmission: 'manual',
  adverts: 50,
  litersPer100Km: 7,
  consumptionDeclaredShare: 0.3,
  years: [],
  ...overrides,
})

const model = (overrides: Partial<PublicCarAdvisorModel>): PublicCarAdvisorModel => ({
  marketSlug: 'x-y',
  brand: 'X',
  model: 'Y',
  brandSlug: 'x',
  modelSlug: 'y',
  adverts: 100,
  sellers: 80,
  body: 'hatchback',
  bodyShare: 0.9,
  specsN: 40,
  seats: 5,
  trunkL: 300,
  lengthMm: 4000,
  powerHp: 100,
  fourByFour: null,
  abs: { share: 1, n: 30 },
  airbags: { share: 1, n: 30 },
  esc: { share: 0.5, n: 30 },
  isofix: null,
  annualDrop: 0.05,
  dealerShare: 0.5,
  declaredRiskShare: 0.02,
  variants: [],
  parts: null,
  ...overrides,
})

const parts = (index: number | null, offers: number) => ({
  readAt: '2026-09-24T02:15:00.000Z',
  index,
  offers,
  parts: [{ key: 'pastillas' as const, median: 1000, offers: 20 }],
})

const onix = model({
  marketSlug: 'chevrolet-onix',
  brand: 'Chevrolet',
  model: 'Onix',
  brandSlug: 'chevrolet',
  modelSlug: 'onix',
  adverts: 600,
  annualDrop: 0.046,
  esc: { share: 0.9, n: 20 },
  parts: parts(0.8, 200),
  variants: [
    variant({
      litersPer100Km: 6.2,
      years: years([
        [2021, 15_000],
        [2020, 13_500, 12_500],
        [2019, 12_000],
      ]),
    }),
  ],
})
const p208 = model({
  marketSlug: 'peugeot-208',
  brand: 'Peugeot',
  model: '208',
  brandSlug: 'peugeot',
  modelSlug: '208',
  adverts: 400,
  annualDrop: 0.06,
  esc: { share: 0.9, n: 20 },
  parts: parts(1.3, 40),
  variants: [variant({ litersPer100Km: 6.5, years: years([[2023, 12_900]]) })],
})
const hilux = model({
  marketSlug: 'toyota-hilux',
  brand: 'Toyota',
  model: 'Hilux',
  brandSlug: 'toyota',
  modelSlug: 'hilux',
  adverts: 250,
  body: 'pickup',
  annualDrop: 0.079,
  fourByFour: { share: 0.6, n: 50 },
  parts: parts(1.2, 150),
  variants: [
    variant({
      fuel: 'diesel',
      litersPer100Km: null,
      years: years([
        [2016, 29_000],
        [2014, 25_000],
      ]),
    }),
  ],
})
const corolla = model({
  marketSlug: 'toyota-corolla',
  brand: 'Toyota',
  model: 'Corolla',
  brandSlug: 'toyota',
  modelSlug: 'corolla',
  body: 'sedan',
  variants: [
    variant({
      fuel: 'hibrido',
      transmission: 'automatica',
      litersPer100Km: 4.8,
      years: years([
        [2021, 22_000],
        [2019, 19_000],
      ]),
    }),
    variant({ transmission: 'automatica', years: years([[2018, 15_000]]) }),
  ],
})
const kwid = model({
  marketSlug: 'renault-kwid',
  brand: 'Renault',
  model: 'Kwid',
  brandSlug: 'renault',
  modelSlug: 'kwid',
  seats: 4,
  variants: [variant({ years: years([[2022, 10_000]]) })],
})

const snapshot: PublicCarAdvisorSnapshot = {
  version: 1,
  generatedAt: '2026-09-24T12:00:00.000Z',
  usdUyu: 40,
  data: { typicalDrop: 0.055, partsBaseline: [], models: [onix, p208, hilux, corolla, kwid] },
}
const prices = { super95: 80, gasoil50s: 60 }
const query = (overrides: Partial<CarAdvisorQuery> = {}): CarAdvisorQuery => ({
  ...normalizeCarAdvisorQuery({}),
  ...overrides,
})
const slugs = (overrides: Partial<CarAdvisorQuery>) =>
  adviseCars(snapshot, query(overrides), prices).results.map(result => result.marketSlug)

describe('normalizeCarAdvisorQuery', () => {
  it('lo malformado vuelve a valores seguros sin tirar', () => {
    const normalized = normalizeCarAdvisorQuery({
      presupuesto: '-5',
      uso: 'x',
      personas: '99',
      prioridad: 'a,b,costo,reventa,repuestos,seguridad',
      combustible: 'gnc,nafta,nafta',
      carroceria: ['suv,pickup', 'otra'],
    })
    expect(normalized).toMatchObject({
      budget: null,
      use: 'mixto',
      people: 2,
      priorities: ['costo', 'reventa', 'repuestos'],
      fuels: ['nafta'],
      bodies: ['suv', 'pickup'],
    })
  })
  it('lee el presupuesto como lo escribe la gente, y vuelve a la URL', () => {
    const normalized = normalizeCarAdvisorQuery({ presupuesto: 'US$ 15.000', km: '20000' })
    expect(normalized.budget).toBe(15_000)
    expect(carAdvisorQueryParams(normalized)).toEqual({ presupuesto: '15000', km: '20000' })
  })
})

describe('adviseCars', () => {
  it('elige el año más nuevo cuya mediana entra, y el siguiente si su p25 entra', () => {
    const onixResult = adviseCars(snapshot, query({ budget: 13_000 }), prices).results.find(
      result => result.marketSlug === 'chevrolet-onix'
    )!
    expect(onixResult.year).toBe(2019)
    expect(onixResult.stretch).toEqual({ year: 2020, p25: 12_500 })
  })

  it('filtra por caja, combustible, plazas y uso', () => {
    expect(slugs({ budget: 25_000, transmission: 'automatica' })).toEqual(['toyota-corolla'])
    expect(slugs({ budget: 30_000, fuels: ['diesel'] })).toEqual(['toyota-hilux'])
    expect(slugs({ budget: 30_000, use: 'carga' })).toEqual(['toyota-hilux'])
    const five = adviseCars(snapshot, query({ budget: 11_000, people: 5 }), prices)
    expect(five.results.map(result => result.marketSlug)).not.toContain('renault-kwid')
    expect(five.excluded).toContainEqual({ reason: 'plazas', count: 1 })
  })

  it('una sola variante por modelo', () => {
    const results = slugs({ budget: 25_000 })
    expect(results.filter(slug => slug === 'toyota-corolla')).toHaveLength(1)
  })

  it('costos con las cifras de la página', () => {
    const result = adviseCars(
      snapshot,
      query({ budget: 13_000, kmYear: 12_000 }),
      prices
    ).results.find(item => item.marketSlug === 'chevrolet-onix')!
    expect(result.costs.fuelUyu).toBeCloseTo(6.2 * 120 * 80, 5)
    expect(result.costs.patenteUyu).toBeCloseTo(12_000 * 41.826 * 0.045, 2)
    expect(result.costs.soaUyu).toBe(7_238)
    expect(result.costs.maintenanceUyu).toBeCloseTo(12_000 + 2 * 12_000 * 0.8, 5)
    expect(result.costs.depreciationUyu).toBeCloseTo(0.046 * 12_000 * 40, 5)
    const cash =
      result.costs.fuelUyu +
      result.costs.patenteUyu +
      result.costs.soaUyu +
      result.costs.maintenanceUyu
    expect(result.costs.annualUyu).toBeCloseTo(cash + result.costs.depreciationUyu, 5)
    expect(result.costs.monthlyCashUyu).toBeCloseTo(cash / 12, 5)
  })

  it('sin consumo de la variante usa el de su combustible y lo marca estimado', () => {
    const result = adviseCars(snapshot, query({ budget: 30_000, fuels: ['diesel'] }), prices)
      .results[0]!
    expect(result.costs.consumptionEstimated).toBe(true)
    expect(result.costs.consumption).toBeGreaterThan(0)
  })

  it('las prioridades cambian el orden', () => {
    const newer = slugs({ budget: 13_000, fuels: ['nafta'], priorities: ['nuevo'] })
    const cheapParts = slugs({ budget: 13_000, fuels: ['nafta'], priorities: ['repuestos'] })
    expect(newer.indexOf('peugeot-208')).toBeLessThan(newer.indexOf('chevrolet-onix'))
    expect(cheapParts.indexOf('chevrolet-onix')).toBeLessThan(cheapParts.indexOf('peugeot-208'))
  })

  it('lo que se pasa del gasto mensual baja al final, avisado', () => {
    const response = adviseCars(
      snapshot,
      query({ budget: 13_000, fuels: ['nafta'], priorities: ['nuevo'], monthlyMax: 1 }),
      prices
    )
    expect(response.results.every(result => result.overMonthly)).toBe(true)
    const onixCash = adviseCars(snapshot, query({ budget: 13_000 }), prices).results.find(
      result => result.marketSlug === 'chevrolet-onix'
    )!.costs.monthlyCashUyu
    const mixed = adviseCars(
      snapshot,
      query({
        budget: 13_000,
        fuels: ['nafta'],
        priorities: ['nuevo'],
        monthlyMax: Math.ceil(onixCash),
      }),
      prices
    ).results
    expect(mixed[0]!.overMonthly).toBe(false)
  })

  it('con un presupuesto que no alcanza dice cuánto hace falta', () => {
    const response = adviseCars(snapshot, query({ budget: 3_000 }), prices)
    expect(response.results).toEqual([])
    expect(response.minimumBudget).toBe(10_000)
  })

  it('un modelo sin relevamiento de repuestos queda neutro y no se habla de repuestos', () => {
    const result = adviseCars(snapshot, query({ budget: 25_000 }), prices).results.find(
      item => item.marketSlug === 'toyota-corolla'
    )!
    expect(result.scores.repuestos).toBe(0.5)
    expect([...result.reasons, ...result.tradeoffs].join(' ')).not.toMatch(/repuesto/i)
  })

  it('cada razón dice su número', () => {
    for (const result of adviseCars(snapshot, query({ budget: 30_000 }), prices).results) {
      expect(result.reasons.length).toBeGreaterThan(0)
      for (const line of [...result.reasons, ...result.tradeoffs]) expect(line).toMatch(/\d/)
    }
  })

  it('arma el enlace al directorio con los mismos filtros', () => {
    const result = adviseCars(snapshot, query({ budget: 13_000 }), prices).results.find(
      item => item.marketSlug === 'chevrolet-onix'
    )!
    expect(result.listingsQuery).toEqual({
      brand: 'chevrolet',
      model: 'chevrolet-onix',
      yearMin: '2019',
      yearMax: '2020',
      priceMax: '13000',
      fuel: 'nafta',
      transmission: 'manual',
      noRisk: '1',
    })
  })

  it('sin presupuesto no recomienda nada', () => {
    expect(adviseCars(snapshot, query({ budget: null }), prices).results).toEqual([])
  })
})
