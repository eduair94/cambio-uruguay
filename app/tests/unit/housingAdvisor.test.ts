import { describe, expect, it } from 'vitest'
import {
  adviseHousing,
  currentSaleCohorts,
  foldZoneName,
  housingAdvisorHasAnswers,
  housingAdvisorQueryParams,
  housingAdvisorSubmitParams,
  housingBudget,
  joinHousingZones,
  normalizeHousingAdvisorQuery,
  type HousingAdvisorQuery,
  type HousingScoresInput,
  type HousingZone,
} from '../../utils/housingAdvisor'
import { housingInstallment } from '../../utils/housingAdvisorFigures'
import { computePayroll } from '../../utils/payroll'
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
    // La cuota tope del BHU es sobre el ingreso disponible: el líquido, no el nominal.
    const net = computePayroll({ nominal: 150_000 }).liquido
    expect(budget.incomeNet).toBeCloseTo(net, 4)
    expect(net).toBeLessThan(150_000 * 0.85)
    const maxLoan = (0.25 * net * (1 - (1 + i) ** -300)) / i
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
    resolver: { ine: { malvin: 'mvd:11' }, aliases: {}, localities: {} },
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

  it('un barrio de otro departamento con el nombre de uno de Montevideo no hereda sus datos', () => {
    const input: HousingScoresInput = {
      zones: {
        'mvd:2': {
          name: 'Centro',
          department: 'Montevideo',
          rows: [{ attribute: 'denuncias', value: 900, betterThan: 0.05, zones: 62 }],
        },
      },
      resolver: { ine: { centro: 'mvd:2' }, aliases: {}, localities: {} },
    }
    const [centro] = joinHousingZones([rentZone('Centro', 25_000, null)], [], input, 'Maldonado')
    expect(centro!.scores).toEqual({})
    expect(centro!.official).toBeNull()
  })

  it('fuera de Montevideo se resuelve por la localidad de ese departamento', () => {
    const input: HousingScoresInput = {
      zones: {
        'ute:7': {
          name: 'San Carlos',
          department: 'Maldonado',
          rows: [{ attribute: 'luz', value: 3, betterThan: 0.6, zones: 90 }],
        },
      },
      resolver: { ine: {}, aliases: {}, localities: { 'maldonado|san carlos': 'ute:7' } },
    }
    const [zone] = joinHousingZones([rentZone('San Carlos', 20_000, null)], [], input, 'Maldonado')
    expect(zone!.scores.luz?.betterThan).toBe(0.6)
  })

  it('un barrio oficial con coma se encuentra aunque sólo tenga ventas', () => {
    const input: HousingScoresInput = {
      zones: {
        'mvd:40': {
          name: 'Prado, Nueva Savona',
          department: 'Montevideo',
          rows: [{ attribute: 'denuncias', value: 10, betterThan: 0.7, zones: 62 }],
        },
      },
      resolver: { ine: { 'prado nueva savona': 'mvd:40' }, aliases: {}, localities: {} },
    }
    const [zone] = joinHousingZones(
      [],
      [
        {
          labels: { neighborhood: 'Prado, Nueva Savona' },
          latest: { n: 12, p25: 100_000, med: 120_000, p75: 140_000, m2: null },
        },
      ],
      input,
      'Montevideo'
    )
    expect(zone!.scores.denuncias?.betterThan).toBe(0.7)
  })

  it('la tarjeta enlaza la evolución de precios del mismo barrio, tipo y dormitorios', () => {
    const [zone] = joinHousingZones(
      [rentZone('Malvín', 39_000, null)],
      [
        {
          key: 'venta|USD|apartamento|2|b:montevideo:malvin',
          labels: { neighborhood: 'Malvín' },
          latest: { n: 30, p25: 150_000, med: 180_000, p75: 200_000, m2: null },
        },
      ],
      scoresInput,
      'Montevideo'
    )
    expect(zone!.seriesToken).toBe('b:montevideo:malvin')
    const result = adviseHousing([zone!], query({ operation: 'comprar', savings: 100_000 }), {
      usdUyu: USD,
    }).results[0]!
    expect(result.seriesQuery).toEqual({
      zona: 'b:montevideo:malvin',
      tipo: 'apartamento',
      dormitorios: '2',
    })
  })

  it('una zona sin mediana (menos de 8 avisos) no entra', () => {
    const empty = rentZone('Vacío', 0, null)
    ;(empty.prices.rent as { median: number | null }).median = null
    expect(joinHousingZones([empty], [], scoresInput, 'Montevideo')).toEqual([])
  })
})

describe('revisión final', () => {
  it('los centésimos del recibo no multiplican el monto por cien', () => {
    expect(
      normalizeHousingAdvisorQuery({ ingreso: '85.432,18', ahorro: 'US$ 30.000,00' })
    ).toMatchObject({ income: 85_432, savings: 30_000 })
    expect(normalizeHousingAdvisorQuery({ ingreso: '85432.18' }).income).toBe(85_432)
    expect(normalizeHousingAdvisorQuery({ ingreso: '1.234.567' }).income).toBe(1_234_567)
    expect(normalizeHousingAdvisorQuery({ ingreso: '120.000' }).income).toBe(120_000)
  })

  it('una serie de venta que el job dejó de actualizar no se publica como vigente', () => {
    const point = { n: 10, p25: 90_000, med: 100_000, p75: 110_000, m2: null }
    const fresh = { labels: { neighborhood: 'A' }, latest: { ...point, d: '2026-09-24' } }
    const old = { labels: { neighborhood: 'B' }, latest: { ...point, d: '2026-09-18' } }
    expect(currentSaleCohorts([fresh, old], '2026-09-24')).toEqual([fresh])
  })

  it('sin barrios con avisos no le echa la culpa a la plata', () => {
    const none = adviseHousing([], query({ operation: 'alquilar', income: 50_000 }), {
      usdUyu: USD,
    })
    expect(none.emptyReason).toBe('sin_datos')
    expect(advise({ operation: 'alquilar', rentMax: 10_000 }).emptyReason).toBe('presupuesto')
    expect(advise({ operation: 'alquilar', income: 100_000 }).emptyReason).toBeNull()
  })

  it('sin ingreso ni tope no dice que filtró por plata', () => {
    expect(advise({ operation: 'alquilar' }).budgetApplied).toBe(false)
    expect(advise({ operation: 'alquilar', income: 100_000 }).budgetApplied).toBe(true)
  })

  it('los cortes de luz provisorios lo dicen en cada línea', () => {
    const response = adviseHousing(ZONES, query({ operation: 'alquilar', income: 100_000 }), {
      usdUyu: USD,
      power: { status: 'preliminary', observedDays: 5 },
    })
    const lines = response.results
      .flatMap(result => [...result.reasons, ...result.tradeoffs])
      .filter(line => /cortes de luz/.test(line))
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) expect(line).toContain('provisorio · 5 días medidos')
    expect(response.power).toEqual({ status: 'preliminary', observedDays: 5 })
  })

  it('los días del libro de luz se cuentan enteros, como en el resto del sitio', () => {
    const response = adviseHousing(ZONES, query({ operation: 'alquilar', income: 100_000 }), {
      usdUyu: USD,
      power: { status: 'preliminary', observedDays: 5.3 },
    })
    const text = response.results.flatMap(result => result.tradeoffs).join(' ')
    expect(text).toContain('provisorio · 5 días medidos')
    expect(response.power?.observedDays).toBe(5)
  })

  it('comparar: comprar fuera de alcance va a lo que resignás, no a por qué', () => {
    const result = advise({ income: 150_000, savings: 10_000 }).results.find(
      item => item.name === 'Cordón'
    )!
    expect(result.saleFits).toBe(false)
    expect(result.saleStretch).toBe(false)
    expect(result.reasons.join(' ')).not.toContain('US$')
    expect(result.tradeoffs[0]).toMatch(/^Comprar acá no te alcanza/)
  })

  it('comparar sin ahorro: dice cuánta entrada pide, no "te alcanza hasta US$ 0"', () => {
    const response = advise({})
    const cordon = response.results.find(item => item.name === 'Cordón')!
    expect(cordon.tradeoffs.join(' ')).not.toContain('US$ 0')
    expect(cordon.tradeoffs[0]).toMatch(/^Comprar acá pide ahorro: .*entrada ronda US\$ \d/)
    expect(response.budgetApplied).toBe(false)
  })

  it('comparar: alquilar fuera de alcance también', () => {
    const caro = zone({
      name: 'Caro',
      rent: {
        n: 30,
        p25: 80_000,
        median: 90_000,
        p75: 95_000,
        monthlyMedian: 95_000,
        monthlyP25: 85_000,
        expensesMedian: 5_000,
        m2Median: 900,
      },
      sale: { n: 30, p25: 90_000, median: 100_000, p75: 110_000, m2Median: 2_000 },
    })
    const result = adviseHousing(
      [caro],
      query({ income: 100_000, savings: 200_000, credit: 'contado' }),
      { usdUyu: USD }
    ).results[0]!
    expect(result.rentFits).toBe(false)
    expect(result.reasons.join(' ')).not.toMatch(/^Alquilar/)
    expect(result.tradeoffs[0]).toMatch(/^Alquilar acá no te alcanza/)
  })

  it('la venta se dice en plural y el porcentaje es del alquiler solo', () => {
    const buy = adviseHousing(
      ZONES,
      query({ operation: 'comprar', income: 300_000, savings: 100_000 }),
      { usdUyu: USD }
    ).results.find(item => item.name === 'Cordón')!
    expect(buy.reasons.join(' ')).toContain(
      'La mitad de los apartamentos de 2 dormitorios se piden hasta US$ 172.656.'
    )
    const rent = advise({ operation: 'alquilar', income: 150_000 }).results.find(
      item => item.name === 'Cordón'
    )!
    expect(rent.reasons[0]).toBe(
      'Alquilar un apartamento de 2 dormitorios sale $ 34.500 de mediana (23 % de tu ingreso), más $ 5.500 de gastos comunes.'
    )
  })

  it('enviar el formulario sin tocar nada igual muestra barrios', () => {
    const params = housingAdvisorSubmitParams(normalizeHousingAdvisorQuery({}))
    expect(params).toEqual({ operacion: 'comparar' })
    expect(housingAdvisorHasAnswers(params)).toBe(true)
    expect(housingAdvisorHasAnswers({})).toBe(false)
    expect(housingAdvisorHasAnswers({ utm_source: 'x' })).toBe(false)
    expect(housingAdvisorSubmitParams(normalizeHousingAdvisorQuery({ ingreso: '90000' }))).toEqual({
      ingreso: '90000',
    })
  })
})
