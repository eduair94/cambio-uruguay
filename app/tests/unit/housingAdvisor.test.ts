import { describe, expect, it } from 'vitest'
import {
  adviseHousing,
  foldZoneName,
  housingAdvisorQueryParams,
  housingBudget,
  joinHousingZones,
  normalizeHousingAdvisorQuery,
  type HousingAdvisorQuery,
  type HousingScoresInput,
  type HousingZone,
} from '../../utils/housingAdvisor'
import { housingInstallment } from '../../utils/housingAdvisorFigures'
import type { RentalZone } from '../../utils/rentalZoneTypes'

const USD = 40
const scores = (values: Partial<Record<string, number>>) =>
  Object.fromEntries(
    Object.entries(values).map(([attribute, betterThan]) => [
      attribute,
      { betterThan: betterThan!, value: 1, zones: 62 },
    ])
  )

const zone = (overrides: Partial<HousingZone> & { name: string }): HousingZone => ({
  id: foldZoneName(overrides.name),
  department: 'Montevideo',
  rent: null,
  sale: null,
  scores: {},
  official: null,
  ...overrides,
})

const cordon = zone({
  name: 'Cordón',
  rent: {
    n: 739,
    p25: 30_000,
    median: 34_500,
    p75: 38_000,
    monthlyMedian: 40_000,
    monthlyP25: 35_000,
    expensesMedian: 5_500,
    m2Median: 582,
  },
  sale: { n: 593, p25: 150_000, median: 172_656, p75: 200_000, m2Median: 3_029 },
  scores: scores({
    denuncias: 0.3,
    luz: 0.2,
    agua: 0.6,
    saneamiento: 0.5,
    limpieza: 0.5,
    alumbrado: 0.5,
    servicios: 0.9,
  }),
  official: 'Cordón',
})
const pocitos = zone({
  name: 'Pocitos',
  rent: {
    n: 555,
    p25: 38_000,
    median: 42_000,
    p75: 48_000,
    monthlyMedian: 50_000,
    monthlyP25: 45_000,
    expensesMedian: 8_000,
    m2Median: 637,
  },
  sale: { n: 400, p25: 190_000, median: 230_000, p75: 280_000, m2Median: 3_600 },
  scores: scores({
    denuncias: 0.6,
    luz: 0.5,
    agua: 0.3,
    saneamiento: 0.6,
    limpieza: 0.6,
    alumbrado: 0.6,
    servicios: 0.95,
  }),
  official: 'Pocitos',
})
const blanqueada = zone({
  name: 'La Blanqueada',
  rent: {
    n: 462,
    p25: 30_000,
    median: 33_000,
    p75: 36_000,
    monthlyMedian: 38_000,
    monthlyP25: 34_000,
    expensesMedian: 5_000,
    m2Median: 613,
  },
  sale: { n: 120, p25: 130_000, median: 150_000, p75: 170_000, m2Median: 2_900 },
  scores: scores({
    denuncias: 0.7,
    luz: 0.9,
    agua: 0.2,
    saneamiento: 0.5,
    limpieza: 0.5,
    alumbrado: 0.5,
    servicios: 0.5,
  }),
  official: 'La Blanqueada',
})
const malvin = zone({
  name: 'Malvín',
  rent: {
    n: 12,
    p25: 36_000,
    median: 39_000,
    p75: 43_000,
    monthlyMedian: 47_000,
    monthlyP25: 43_000,
    expensesMedian: 8_000,
    m2Median: 600,
  },
})
const carrasco = zone({
  name: 'Carrasco',
  rent: {
    n: 80,
    p25: 60_000,
    median: 70_000,
    p75: 90_000,
    monthlyMedian: 80_000,
    monthlyP25: 70_000,
    expensesMedian: 10_000,
    m2Median: 700,
  },
  sale: { n: 90, p25: 350_000, median: 410_000, p75: 520_000, m2Median: 4_200 },
  scores: scores({
    denuncias: 0.8,
    luz: 0.4,
    agua: 0.5,
    saneamiento: 0.6,
    limpieza: 0.6,
    alumbrado: 0.6,
    servicios: 0.4,
  }),
  official: 'Carrasco',
})
const ZONES = [cordon, pocitos, blanqueada, malvin, carrasco]

const query = (overrides: Partial<HousingAdvisorQuery> = {}): HousingAdvisorQuery => ({
  ...normalizeHousingAdvisorQuery({}),
  ...overrides,
})
const advise = (overrides: Partial<HousingAdvisorQuery> = {}) =>
  adviseHousing(ZONES, query(overrides), { usdUyu: USD })
const names = (overrides: Partial<HousingAdvisorQuery> = {}) =>
  advise(overrides).results.map(result => result.name)

describe('normalizeHousingAdvisorQuery', () => {
  it('lo malformado vuelve a valores seguros sin tirar', () => {
    expect(
      normalizeHousingAdvisorQuery({
        operacion: 'x',
        dormitorios: '9',
        ingreso: '-5',
        prioridad: 'a,precio,seguridad,metros,luz',
        credito: 'zzz',
        departamento: 'Narnia',
      })
    ).toMatchObject({
      operation: 'comparar',
      bedrooms: 2,
      income: null,
      priorities: ['precio', 'seguridad', 'metros'],
      credit: 'bhu',
      department: 'Montevideo',
    })
  })
  it('lee los montos como los escribe la gente y vuelve a la URL', () => {
    const normalized = normalizeHousingAdvisorQuery({ ingreso: '$ 80.000', ahorro: 'US$ 25.000' })
    expect(normalized).toMatchObject({ income: 80_000, savings: 25_000 })
    expect(housingAdvisorQueryParams(normalized)).toEqual({ ingreso: '80000', ahorro: '25000' })
  })
})

describe('housingBudget', () => {
  it('el alquiler que acepta la garantía: 40 % del ingreso, y 30 % con Mapfre', () => {
    const budget = housingBudget(query({ income: 100_000 }), USD)
    expect(budget).toMatchObject({ rentMax: 40_000, rentBasis: 'alquiler', rentMaxMapfre: 30_000 })
  })
  it('si la persona pone su tope, manda el suyo, y es alquiler con gastos comunes', () => {
    expect(housingBudget(query({ income: 100_000, rentMax: 45_000 }), USD)).toMatchObject({
      rentMax: 45_000,
      rentBasis: 'total',
    })
  })
  it('para comprar manda lo menor entre lo que cubre el ahorro y lo que permite la cuota', () => {
    const budget = housingBudget(query({ income: 150_000, savings: 30_000, credit: 'bhu' }), USD)
    const bySavings = 30_000 / (1 - 0.9 + 0.1066)
    const i = 1.045 ** (1 / 12) - 1
    const maxLoan = (0.25 * 150_000 * (1 - (1 + i) ** -300)) / i
    const byIncome = maxLoan / 0.9 / USD
    expect(budget.buyMaxBySavings).toBeCloseTo(bySavings, 4)
    expect(budget.buyMaxByIncome).toBeCloseTo(byIncome, 4)
    expect(budget.buyMax).toBeCloseTo(Math.min(bySavings, byIncome), 4)
  })
  it('al contado alcanza el ahorro menos los gastos de compra', () => {
    expect(housingBudget(query({ savings: 200_000, credit: 'contado' }), USD).buyMax).toBeCloseTo(
      200_000 / 1.1066,
      4
    )
  })
  it('sin ahorro no hay anticipo: no se puede comprar', () => {
    expect(housingBudget(query({ income: 150_000, savings: null }), USD).buyMax).toBe(0)
  })
})

describe('adviseHousing', () => {
  it('alquilar: entra lo que la garantía acepta, y lo que se pasa por poco queda como "negociando"', () => {
    const response = advise({ operation: 'alquilar', income: 100_000 })
    expect(response.results.map(result => result.name).sort()).toEqual(
      ['Cordón', 'La Blanqueada', 'Malvín', 'Pocitos'].sort()
    )
    expect(response.results.find(result => result.name === 'Pocitos')!.rentStretch).toBe(true)
    expect(response.excluded).toContainEqual({ reason: 'presupuesto', count: 1 })
  })

  it('comprar sin datos de venta deja el barrio afuera', () => {
    const response = advise({ operation: 'comprar', income: 200_000, savings: 60_000 })
    expect(response.results.map(result => result.name)).not.toContain('Malvín')
    expect(response.excluded).toContainEqual({ reason: 'sin_datos', count: 1 })
  })

  it('las prioridades cambian el orden', () => {
    const base = { operation: 'alquilar' as const, income: 100_000 }
    const safe = names({ ...base, priorities: ['seguridad'] })
    const cheap = names({ ...base, priorities: ['precio'] })
    const services = names({ ...base, priorities: ['servicios'] })
    expect(safe.indexOf('La Blanqueada')).toBeLessThan(safe.indexOf('Cordón'))
    expect(cheap[0]).toBe('La Blanqueada')
    expect(services.indexOf('Cordón')).toBeLessThan(services.indexOf('La Blanqueada'))
  })

  it('un barrio sin datos de contexto queda neutro y no se afirma nada de él', () => {
    const result = advise({ operation: 'alquilar', income: 100_000 }).results.find(
      item => item.name === 'Malvín'
    )!
    expect(result.scores.seguridad).toBe(0.5)
    expect([...result.reasons, ...result.tradeoffs].join(' ')).not.toMatch(/denuncia/i)
    expect(result.notes.join(' ')).toMatch(/no tenemos/i)
  })

  it('alquilar o comprar en el barrio: años de alquiler, cuota contra alquiler y entrada', () => {
    const result = advise({ income: 150_000, savings: 40_000 }).results.find(
      item => item.name === 'Cordón'
    )!
    const loanUyu = 0.9 * 172_656 * USD
    expect(result.rentVsBuy!.yearsOfRent).toBeCloseTo((172_656 * USD) / (34_500 * 12), 6)
    expect(result.buy!.installmentUyu).toBeCloseTo(housingInstallment(loanUyu, 0.045, 25), 4)
    expect(result.rentVsBuy!.buyMonthly).toBeCloseTo(result.buy!.installmentUyu + 5_500, 4)
    expect(result.rentVsBuy!.rentMonthly).toBe(40_000)
    expect(result.buy!.cashNeeded).toBeCloseTo(172_656 * (0.1 + 0.1066), 4)
  })

  it('si nada entra, dice desde cuánto empieza a haber', () => {
    const response = advise({ operation: 'alquilar', rentMax: 10_000 })
    expect(response.results).toEqual([])
    expect(response.minimum).toEqual({ rent: 38_000, sale: null })
  })

  it('cada razón y cada contra dice su número', () => {
    for (const result of advise({ income: 150_000, savings: 60_000 }).results)
      for (const line of [...result.reasons, ...result.tradeoffs]) expect(line).toMatch(/\d/)
  })

  it('arma los enlaces a los directorios con los mismos filtros', () => {
    const result = advise({ income: 100_000, savings: 40_000 }).results.find(
      item => item.name === 'Cordón'
    )!
    expect(result.rentalsQuery).toEqual({
      department: 'Montevideo',
      neighborhood: 'Cordón',
      type: 'apartamento',
      bedrooms: '2',
      bedroomsExact: '1',
      priceMax: '40000',
      currency: 'UYU',
    })
    expect(result.salesQuery).toMatchObject({
      department: 'Montevideo',
      neighborhood: 'Cordón',
      type: 'apartamento',
      bedrooms: '2',
      currency: 'USD',
    })
  })
})

describe('alquiler más gastos comunes', () => {
  // El total mediano de los avisos que declaran gastos comunes es otro subconjunto: $ 24.500 de
  // alquiler "con gastos comunes $ 25.000" confunde. Se suman las dos medianas y se dicen las dos.
  const odd = zone({
    name: 'Odd',
    rent: {
      n: 50,
      p25: 22_000,
      median: 24_500,
      p75: 27_000,
      monthlyMedian: 25_000,
      monthlyP25: 23_000,
      expensesMedian: 3_500,
      m2Median: 500,
    },
  })
  it('el tope propio se compara contra alquiler + gastos comunes medianos', () => {
    const fits = adviseHousing([odd], query({ operation: 'alquilar', rentMax: 25_000 }), {
      usdUyu: USD,
    })
    expect(fits.results).toEqual([])
    expect(fits.minimum).toEqual({ rent: 28_000, sale: null })
  })
  it('la razón nombra las dos cifras', () => {
    const result = adviseHousing([odd], query({ operation: 'alquilar', income: 100_000 }), {
      usdUyu: USD,
    }).results[0]!
    expect(result.reasons[0]).toContain('$ 24.500')
    expect(result.reasons[0]).toContain('más $ 3.500 de gastos comunes')
  })
})

describe('gastos comunes en cero', () => {
  it('si la mitad de los avisos no tiene gastos comunes, no se escribe "más $ 0"', () => {
    const noFees = zone({
      name: 'Casas',
      rent: {
        n: 60,
        p25: 23_000,
        median: 26_000,
        p75: 28_000,
        monthlyMedian: 26_000,
        monthlyP25: 23_000,
        expensesMedian: 0,
        m2Median: 400,
      },
    })
    const result = adviseHousing([noFees], query({ operation: 'alquilar', income: 100_000 }), {
      usdUyu: USD,
    }).results[0]!
    expect(result.reasons[0]).not.toContain('$ 0')
    expect(result.reasons[0]).toContain('sin gastos comunes')
  })
})

describe('joinHousingZones', () => {
  const rentZone = (neighborhood: string, median: number, official: string | null) =>
    ({
      id: foldZoneName(neighborhood),
      ref: { department: 'Montevideo', neighborhood },
      officialCode: null,
      prices: {
        rent: { count: 20, mean: median, median, p25: median - 1_000, p75: median + 1_000 },
        commonExpenses: { count: 20, mean: 5_000, median: 5_000, p25: 4_000, p75: 6_000 },
        monthlyTotal: {
          count: 20,
          mean: median + 5_000,
          median: median + 5_000,
          p25: median,
          p75: median + 6_000,
        },
        builtSquareMeter: { count: 20, mean: 600, median: 600, p25: 550, p75: 650 },
        sources: 2,
        lastSeenFrom: null,
        lastSeenTo: null,
      },
      services: null,
      crime: null,
      utilities: official
        ? {
            official: { id: official, name: 'x', match: 'exact', share: 1 },
            power: null,
            water: null,
            claims: null,
            levels: {},
          }
        : null,
      boundaryAvailable: false,
    }) as unknown as RentalZone

  const scoresInput: HousingScoresInput = {
    zones: {
      'mvd:11': {
        name: 'Malvin',
        department: 'Montevideo',
        rows: [{ attribute: 'denuncias', value: 10, betterThan: 0.4, zones: 62 }],
      },
    },
    resolver: { ine: { malvin: 'mvd:11' } },
  }

  it('une alquiler y venta por nombre sin tildes ni mayúsculas, y encuentra el barrio oficial', () => {
    const joined = joinHousingZones(
      [rentZone('Malvín', 39_000, null), rentZone('Poco', 20_000, null)],
      [
        {
          labels: { neighborhood: 'MALVIN' },
          latest: { n: 30, p25: 150_000, med: 180_000, p75: 200_000, m2: { n: 20, med: 3_000 } },
        },
      ],
      scoresInput,
      'Montevideo'
    )
    const malvin = joined.find(item => item.id === 'malvin')!
    expect(malvin.name).toBe('Malvín')
    expect(malvin.rent?.median).toBe(39_000)
    expect(malvin.sale?.median).toBe(180_000)
    expect(malvin.scores.denuncias?.betterThan).toBe(0.4)
  })

  it('una zona sin mediana (menos de 8 avisos) no entra', () => {
    const empty = rentZone('Vacío', 0, null)
    ;(empty.prices.rent as { median: number | null }).median = null
    expect(joinHousingZones([empty], [], scoresInput, 'Montevideo')).toEqual([])
  })
})
