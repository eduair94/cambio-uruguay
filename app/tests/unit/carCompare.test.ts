import { describe, expect, it } from 'vitest'
import {
  buildCarCompareResponse,
  carCompareBest,
  carCompareDefaultYear,
  carCompareListingsQuery,
  carCompareNcap,
  carCompareOutcome,
  carComparePopular,
  carCompareQueryParams,
  carCompareRivals,
  compareCars,
  normalizeCarCompareQuery,
  sharedVariant,
  type CarCompareQuery,
  type CarCompareResponse,
} from '../../utils/carCompare'
import type { LatinNcapEntry } from '../../utils/carAdvisorFigures'
import type {
  PublicCarAdvisorModel,
  PublicCarAdvisorSnapshot,
  PublicCarAdvisorVariant,
} from '../../utils/carsPublic'

const years = (rows: Array<[number, number, number?]>) =>
  rows.map(([year, median, n]) => ({
    year,
    n: n ?? 10,
    p25: median - 1000,
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

const onix = model({
  marketSlug: 'chevrolet-onix',
  brand: 'Chevrolet',
  model: 'Onix',
  brandSlug: 'chevrolet',
  adverts: 600,
  annualDrop: 0.046,
  powerHp: 90,
  variants: [
    variant({
      adverts: 500,
      litersPer100Km: 6.3,
      years: years([
        [2018, 10_900],
        [2019, 10_900],
        [2020, 12_900],
        [2022, 13_200],
      ]),
    }),
    variant({
      transmission: 'automatica',
      adverts: 80,
      litersPer100Km: 6,
      years: years([[2022, 15_700]]),
    }),
  ],
})
const gol = model({
  marketSlug: 'volkswagen-gol',
  brand: 'Volkswagen',
  model: 'Gol',
  brandSlug: 'volkswagen',
  adverts: 500,
  annualDrop: 0.037,
  powerHp: 101,
  variants: [
    variant({
      adverts: 400,
      litersPer100Km: 7.4,
      years: years([
        [2018, 9_500],
        [2019, 10_400],
        [2022, 13_700, 30],
      ]),
    }),
  ],
})
const p208 = model({
  marketSlug: 'peugeot-208',
  brand: 'Peugeot',
  model: '208',
  brandSlug: 'peugeot',
  adverts: 480,
  annualDrop: null,
  powerHp: 82,
  variants: [
    variant({
      adverts: 360,
      litersPer100Km: 6.4,
      years: years([
        [2019, 11_000],
        [2020, 12_500],
        [2022, 13_700, 40],
      ]),
    }),
  ],
})
const hilux = model({
  marketSlug: 'toyota-hilux',
  brand: 'Toyota',
  model: 'Hilux',
  brandSlug: 'toyota',
  body: 'pickup',
  adverts: 280,
  variants: [
    variant({
      fuel: 'diesel',
      adverts: 130,
      years: years([
        [2014, 28_000],
        [2016, 33_000],
        [2018, 35_000],
      ]),
    }),
    variant({
      adverts: 70,
      years: years([
        [2014, 19_000],
        [2016, 24_000],
        [2018, 22_000],
      ]),
    }),
  ],
})
const ranger = model({
  marketSlug: 'ford-ranger',
  brand: 'Ford',
  model: 'Ranger',
  brandSlug: 'ford',
  body: 'pickup',
  adverts: 150,
  variants: [
    variant({
      adverts: 75,
      years: years([
        [2014, 17_000],
        [2016, 21_000],
        [2018, 20_000],
      ]),
    }),
    variant({
      fuel: 'diesel',
      adverts: 30,
      years: years([
        [2014, 25_000],
        [2016, 30_000],
        [2018, 33_000],
      ]),
    }),
  ],
})

const snapshot: PublicCarAdvisorSnapshot = {
  version: 1,
  generatedAt: '2026-10-29T01:39:40.693Z',
  usdUyu: 41.3,
  data: { typicalDrop: 0.057, partsBaseline: [], models: [onix, gol, p208, hilux, ranger] },
}

const fuel = { asOf: '2026-10-01', super95: 80, gasoil50s: 56 }
const ncap: LatinNcapEntry[] = [
  {
    marketSlug: 'chevrolet-onix',
    testedName: 'Onix',
    testYear: 2019,
    protocol: '2016-2019',
    adultStars: 5,
    childStars: 5,
    stars: null,
    url: 'https://www.latinncap.com/es/resultado/1/onix',
  },
]
const respond = (picks: CarCompareQuery['picks']): CarCompareResponse =>
  buildCarCompareResponse(snapshot, picks, {
    fuel,
    ncapOf: slug => (slug === 'chevrolet-onix' ? ncap : []),
  })
const query = (overrides: Partial<CarCompareQuery> = {}): CarCompareQuery => ({
  picks: [],
  year: null,
  budget: null,
  kmYear: 12_000,
  ...overrides,
})
const pick = (slug: string) => ({ slug, fuel: null, transmission: null })
/** Las cifras llevan espacios duros contra su unidad; los tests leen el texto plano. */
const plain = (text: string | undefined) => (text ?? '').replace(/\xA0/g, ' ')

describe('la consulta en la URL', () => {
  it('lee modelos con y sin variante, sin repetir y hasta tres', () => {
    const parsed = normalizeCarCompareQuery({
      modelos: 'chevrolet-onix~nafta-automatica,peugeot-208,chevrolet-onix,volkswagen-gol,fiat-uno',
      presupuesto: 'US$ 15.000',
      km: '20000',
    })
    expect(parsed.picks).toEqual([
      { slug: 'chevrolet-onix', fuel: 'nafta', transmission: 'automatica' },
      { slug: 'peugeot-208', fuel: null, transmission: null },
      { slug: 'volkswagen-gol', fuel: null, transmission: null },
    ])
    expect(parsed.budget).toBe(15_000)
    expect(parsed.kmYear).toBe(20_000)
  })

  it('descarta lo que no es un slug ni una variante conocida', () => {
    const parsed = normalizeCarCompareQuery({ modelos: '../etc,Onix!,ok-model~gas-turbo' })
    expect(parsed.picks).toEqual([{ slug: 'ok-model', fuel: null, transmission: null }])
  })

  it('vuelve a la URL con lo mínimo: el presupuesto le gana al año', () => {
    expect(
      carCompareQueryParams(
        query({
          picks: [
            { slug: 'chevrolet-onix', fuel: 'nafta', transmission: 'manual' },
            pick('peugeot-208'),
          ],
          year: 2019,
          budget: 12_000,
        })
      )
    ).toEqual({ modelos: 'chevrolet-onix~nafta-manual,peugeot-208', presupuesto: '12000' })
    expect(carCompareQueryParams(query({ picks: [pick('a-b')], year: 2019 }))).toEqual({
      modelos: 'a-b',
      anio: '2019',
    })
  })
})

describe('quién le gana a quién', () => {
  it('par a par: estar cerca del mejor no gana contra el que está cerca de uno', () => {
    // 101, 90 y 82 cv con 12 % de ruido: 90 contra 82 es ruido; 101 contra 82 no.
    const outcome = carCompareOutcome([90, 101, 82], 'high', { rel: 0.12 })
    expect(outcome.best).toEqual([false, true, false])
    expect(outcome.beats[0]![2]).toBe(false)
    expect(outcome.beats[1]![2]).toBe(true)
  })

  it('todos parejos: nadie gana', () => {
    expect(carCompareBest([13_200, 13_700, 13_700], 'low', { rel: 0.05 })).toEqual([
      false,
      false,
      false,
    ])
  })

  it('lo que falta no gana ni pierde', () => {
    expect(carCompareBest([0.05, null], 'low', { abs: 0.015 })).toEqual([false, false])
    expect(carCompareBest([0.03, null, 0.06], 'low', { abs: 0.015 })).toEqual([true, false, false])
  })
})

describe('las columnas', () => {
  it('sin modelos en la URL muestra la comparación frecuente más grande', () => {
    const response = respond([])
    expect(response.example).toBe(true)
    expect(response.columns.map(column => column.slug)).toEqual([
      'chevrolet-onix',
      'volkswagen-gol',
      'peugeot-208',
    ])
  })

  it('dice qué modelo no está en vez de reemplazarlo', () => {
    const response = respond([pick('chevrolet-onix'), pick('fiat-147')])
    expect(response.columns.map(column => column.slug)).toEqual(['chevrolet-onix'])
    expect(response.missing).toEqual(['fiat-147'])
  })

  it('la misma variante para todas: una Hilux diésel no se compara con una Ranger nafta', () => {
    const response = respond([pick('toyota-hilux'), pick('ford-ranger')])
    expect(response.columns.map(column => column.variant.fuel)).toEqual(['nafta', 'nafta'])
  })

  it('una variante fijada en la URL arrastra a las columnas que pueden seguirla', () => {
    const response = respond([
      { slug: 'ford-ranger', fuel: 'diesel', transmission: 'manual' },
      pick('toyota-hilux'),
    ])
    expect(response.columns.map(column => column.variant.fuel)).toEqual(['diesel', 'diesel'])
  })

  it('entre las compartidas, la que tiene más años en común antes que la de más avisos', () => {
    const many = (fuel: 'nafta' | 'diesel', adverts: number, list: number[]) =>
      variant({ fuel, adverts, years: years(list.map(year => [year, 20_000] as [number, number])) })
    expect(
      sharedVariant([
        model({
          variants: [many('nafta', 70, [2013, 2014]), many('diesel', 50, [2019, 2020, 2021])],
        }),
        model({
          variants: [many('nafta', 55, [2013, 2014]), many('diesel', 68, [2019, 2020, 2021])],
        }),
      ])
    ).toEqual({ fuel: 'diesel', transmission: 'manual' })
  })

  it('sin variante en común, cada una la suya', () => {
    expect(
      sharedVariant([
        model({ variants: [variant({ fuel: 'diesel' })] }),
        model({ variants: [variant({ fuel: 'nafta' })] }),
      ])
    ).toBeNull()
  })

  it('rivales: misma carrocería y precio parecido a igual año', () => {
    expect(carCompareRivals(snapshot, ['chevrolet-onix']).map(option => option.slug)).toEqual([
      'volkswagen-gol',
      'peugeot-208',
    ])
    expect(carCompareRivals(snapshot, ['toyota-hilux']).map(option => option.slug)).toEqual([
      'ford-ranger',
    ])
  })

  it('las comparaciones frecuentes no repiten modelos', () => {
    const groups = carComparePopular(snapshot)
    const slugs = groups.flat().map(option => option.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(groups[0]!.map(option => option.slug)).toContain('chevrolet-onix')
  })
})

describe('la comparación', () => {
  const trio = respond([pick('chevrolet-onix'), pick('volkswagen-gol'), pick('peugeot-208')])

  it('al mismo año arranca en el año que más avisos tienen todos', () => {
    expect(carCompareDefaultYear(trio.columns)).toBe(2022)
    const result = compareCars(trio, query({ picks: [] }))
    expect(result.mode).toBe('anio')
    expect(result.year).toBe(2022)
  })

  it('un año que no está en ninguno vuelve al de por defecto; uno que falta en alguno se dice', () => {
    expect(compareCars(trio, query({ year: 1990 })).year).toBe(2022)
    const result = compareCars(trio, query({ year: 2018 }))
    expect(result.points.map(point => point.status)).toEqual(['ok', 'ok', 'sin-anio'])
    const price = result.groups[0]!.rows.find(row => row.key === 'precio')!
    expect(price.cells[2]!.text).toBe('Sin avisos')
  })

  it('con la misma plata: el año más nuevo cuya mediana entra, y el que entra negociando', () => {
    const result = compareCars(trio, query({ budget: 11_000 }))
    expect(result.mode).toBe('plata')
    expect(result.points.map(point => point.row?.year)).toEqual([2019, 2019, 2019])
    // Onix 2020 pide 12.900 y su cuarto más barato 11.900: no entra.
    expect(result.points[0]!.stretch).toBeNull()
    const tight = compareCars(trio, query({ budget: 12_000 }))
    expect(tight.points[0]!.stretch).toEqual({ year: 2020, p25: 11_900 })
  })

  it('si no alcanza, dice desde dónde arranca', () => {
    const result = compareCars(trio, query({ budget: 9_000 }))
    expect(result.points[0]!.status).toBe('no-alcanza')
    expect(result.points[1]!.status).toBe('no-alcanza')
    const cell = result.groups[0]!.rows[0]!.cells[1]!
    expect(cell.text).toBe('No alcanza')
    expect(plain(cell.sub)).toContain('US$ 9.500')
  })

  it('"pierde menos valor" sólo entre modelos con curva propia', () => {
    const result = compareCars(trio, query())
    const caida = result.groups.flatMap(group => group.rows).find(row => row.key === 'caida')!
    // El 208 no tiene curva: no gana ni pierde, aunque su costo use la típica del mercado.
    expect(caida.cells[2]!.best).toBe(false)
    expect(caida.cells[2]!.text).toBe('Sin curva propia')
    expect(result.verdicts[2]!.losses.some(reason => reason.key === 'caida')).toBe(false)
    expect(result.points[2]!.dropFromMarket).toBe(true)
  })

  it('el veredicto nombra al que queda parejo en vez de declarar una victoria que no fue', () => {
    const result = compareCars(trio, query())
    const consumo = result.verdicts[0]!.wins.find(reason => reason.key === 'consumo')!
    expect(plain(consumo.detail)).toContain('7,4 L/100 km (Gol)')
    expect(plain(consumo.detail)).toContain('Parejo con 208 (6,4 L/100 km)')
    expect(result.verdicts[1]!.losses.some(reason => reason.key === 'consumo')).toBe(true)
  })

  it('Latin NCAP se muestra y no puntúa', () => {
    const result = compareCars(trio, query())
    const row = result.groups.flatMap(group => group.rows).find(item => item.key === 'ncap')!
    expect(row.better).toBeNull()
    expect(row.cells[0]!.href).toContain('latinncap.com')
    expect(result.verdicts.flatMap(verdict => [...verdict.wins, ...verdict.losses])).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'ncap' })])
    )
  })

  it('el ensayo más cercano al año, avisando cuando queda lejos', () => {
    expect(carCompareNcap(ncap, 2018)?.testYear).toBe(2019)
    const result = compareCars(trio, query({ year: 2022 }))
    const row = result.groups.flatMap(group => group.rows).find(item => item.key === 'ncap')!
    expect(row.cells[0]!.sub).toBe('ensayo 2019')
    const old = compareCars(respond([pick('chevrolet-onix')]), query({ year: 2018 }))
    expect(
      old.groups.flatMap(group => group.rows).find(item => item.key === 'ncap')!.cells[0]!.sub
    ).toBe('ensayo 2019')
  })

  it('negociando es el año inmediatamente más nuevo, como en el asesor', () => {
    // 2018 entra por mediana; 2019 no entra ni negociando; 2020 sí por su cuarto más barato, pero
    // no es el siguiente: el asesor no lo ofrece y el comparador tampoco.
    const gap = buildCarCompareResponse(
      {
        ...snapshot,
        data: {
          ...snapshot.data,
          models: [
            model({
              marketSlug: 'a-a',
              variants: [
                variant({
                  years: [
                    { year: 2018, n: 5, p25: 13_000, median: 15_000, p75: 16_000, kmMedian: null },
                    { year: 2019, n: 5, p25: 16_000, median: 18_000, p75: 19_000, kmMedian: null },
                    { year: 2020, n: 5, p25: 14_000, median: 20_000, p75: 21_000, kmMedian: null },
                  ],
                }),
              ],
            }),
          ],
        },
      },
      [pick('a-a')],
      { fuel, ncapOf: () => [] }
    )
    const result = compareCars(gap, query({ budget: 15_000 }))
    expect(result.points[0]!.row?.year).toBe(2018)
    expect(result.points[0]!.stretch).toBeNull()
  })

  it('al que no le alcanza el presupuesto pierde "año al que llegás"', () => {
    const result = compareCars(trio, query({ budget: 10_500 }))
    // Gol llega a 2019 (10.400); Onix y 208 no alcanzan.
    expect(result.points.map(point => point.status)).toEqual(['no-alcanza', 'ok', 'no-alcanza'])
    const anio = result.groups[0]!.rows.find(row => row.key === 'anio')!
    expect(anio.cells.map(cell => cell.best)).toEqual([false, true, false])
    expect(result.verdicts[1]!.wins[0]!.key).toBe('anio')
    expect(result.verdicts[0]!.losses.some(reason => reason.key === 'anio')).toBe(true)
  })

  it('un total con la caída típica del mercado no compite', () => {
    const result = compareCars(trio, query())
    const total = result.groups.flatMap(group => group.rows).find(row => row.key === 'total')!
    expect(result.points[2]!.dropFromMarket).toBe(true)
    expect(total.cells[2]!.best).toBe(false)
  })

  it('si ningún modelo pedido está, muestra la comparación frecuente y dice cuál faltó', () => {
    const response = respond([pick('fiat-147')])
    expect(response.example).toBe(true)
    expect(response.missing).toEqual(['fiat-147'])
    expect(response.columns.length).toBeGreaterThan(1)
  })

  it('el enlace al directorio lleva la variante, el año y el tope', () => {
    const result = compareCars(trio, query({ budget: 12_000 }))
    expect(carCompareListingsQuery(trio.columns[0]!, result.points[0]!, 12_000)).toEqual({
      brand: 'chevrolet',
      model: 'chevrolet-onix',
      fuel: 'nafta',
      transmission: 'manual',
      noRisk: '1',
      yearMin: '2019',
      yearMax: '2020',
      priceMax: '12000',
    })
  })
})
