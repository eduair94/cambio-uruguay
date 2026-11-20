import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import * as serverRenderer from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import * as carsUtils from '../../utils/cars'
import { normalizeCarsQuery, type CarsResponse } from '../../utils/cars'
import * as carBudgetUtils from '../../utils/carBudget'
import { CAR_BUDGETS, CAR_BUDGET_MIN_MODELS } from '../../utils/carBudget'
import * as carsReportUtils from '../../utils/carsReport'
import type { CarReportResponse } from '../../utils/carsReport'
import * as summaryUtils from '../../utils/carsDirectorySummary'
import {
  CARS_DIRECTORY_MIN_ADVERTS,
  carsDirectoryBandLabel,
  carsDirectoryBandParams,
  carsDirectoryBrowse,
  carsDirectoryBudgetLine,
  carsDirectoryCount,
  carsDirectoryFaq,
  carsDirectoryFresh,
  carsDirectoryLead,
  carsDirectoryProfile,
  carsDirectorySummary,
} from '../../utils/carsDirectorySummary'

const APP = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(APP, path), 'utf8')

type Data = CarReportResponse['data']

const budgetModel = (brand: string, model: string, adverts: number, medianYear: number) => ({
  marketSlug: `${brand}-${model}`.toLowerCase(),
  brand,
  model,
  adverts,
  medianUsd: 5000,
  medianYear,
  medianKm: 100_000,
})

/** El informe del 20/11/2026 (GET /api/car-report), recortado a lo que lee el directorio. */
function report(overrides: Partial<Data> = {}, generatedAt = '2026-11-20T02:39:03.250Z') {
  const data = {
    market: {
      adverts: 19_568,
      brands: 82,
      models: 947,
      price: { p25: 8900, median: 12_490, p75: 18_000 },
      year: { p25: 2013, median: 2018, p75: 2022 },
      km: { p25: 67_000, median: 109_593, p75: 155_525 },
      sellers: { dealer: 9189, private: 10_348, unknown: 31 },
      fuels: [],
      transmissions: [],
      departments: [
        { department: 'Montevideo', adverts: 9594 },
        { department: 'Canelones', adverts: 4265 },
        { department: 'Maldonado', adverts: 1224 },
        { department: 'Sin dato', adverts: 900 },
        { department: 'Colonia', adverts: 563 },
        { department: 'Paysandú', adverts: 450 },
        { department: 'San José', adverts: 394 },
        { department: 'Soriano', adverts: 339 },
      ],
      priceBands: [
        { from: 0, to: 5000, adverts: 686 },
        { from: 5000, to: 8000, adverts: 3089 },
        { from: 8000, to: 12_000, adverts: 5751 },
        { from: 12_000, to: 18_000, adverts: 5129 },
        { from: 18_000, to: 25_000, adverts: 2400 },
        { from: 25_000, to: 40_000, adverts: 1583 },
        { from: 40_000, to: null, adverts: 930 },
      ],
    },
    brands: [
      {
        slug: 'chevrolet',
        name: 'Chevrolet',
        adverts: 2719,
        share: 0.139,
        medianUsd: 11_000,
        medianYear: 2018,
      },
      {
        slug: 'Mal Slug',
        name: 'Rota',
        adverts: 2600,
        share: 0.13,
        medianUsd: 9000,
        medianYear: 2015,
      },
      {
        slug: 'volkswagen',
        name: 'Volkswagen',
        adverts: 2451,
        share: 0.125,
        medianUsd: 13_990,
        medianYear: 2018,
      },
    ],
    models: [
      {
        brand: 'Chevrolet',
        model: 'Onix',
        adverts: 652,
        price: { p25: 10_000, median: 12_700, p75: 15_000 },
      },
      {
        brand: 'Peugeot',
        model: '208',
        adverts: 477,
        price: { p25: 9000, median: 11_990, p75: 14_000 },
      },
      {
        brand: 'Volkswagen',
        model: 'Gol',
        adverts: 477,
        price: { p25: 8000, median: 10_000, p75: 12_000 },
      },
      {
        brand: 'Volkswagen',
        model: 'Saveiro',
        adverts: 416,
        price: { p25: 11_000, median: 14_000, p75: 16_000 },
      },
    ],
    budgets: [
      {
        maxUsd: 6000,
        adverts: 991,
        models: [
          budgetModel('Chevrolet', 'Corsa', 55, 2008),
          budgetModel('Suzuki', 'Alto', 84, 2018),
          budgetModel('Chevrolet', 'Celta', 51, 2007),
        ],
      },
      { maxUsd: 10_000, adverts: 3290, models: [budgetModel('Renault', 'Kwid', 176, 2020)] },
      { maxUsd: 7000, adverts: 12, models: [budgetModel('Fiat', 'Uno', 9, 2010)] },
      { maxUsd: 30_000, adverts: 40, models: [] },
    ],
    sellerGaps: { median: 0.022, models: [] },
    negotiation: {
      windowDays: 7,
      changed: 306,
      cut: 271,
      raised: 35,
      medianCut: 0.043,
      shareOfMarket: 0.011,
    },
    rotation: {
      measurable: true,
      historyDays: 63.8,
      retired: 17_595,
      medianDays: 28.45,
      note: '',
    },
    ...overrides,
  }
  return { generatedAt, usdUyu: 40, data } as unknown as CarReportResponse
}

const coverage = {
  listings: 21_950,
  sources: [
    { source: 'carper', name: 'Carper', listings: 231, duplicates: 114 },
    { source: 'mercadolibre', name: 'Mercado Libre', listings: 17_575, duplicates: 0 },
    { source: 'facebook', name: 'Facebook Marketplace', listings: 3529, duplicates: 723 },
    { source: 'motorlider', name: 'Motorlider', listings: 0, duplicates: 47 },
    { source: 'clasiautos', name: 'Clasiautos', listings: 211, duplicates: 7 },
  ],
} as unknown as Pick<CarsResponse['coverage'], 'listings' | 'sources'>

const summary = () => carsDirectorySummary(report())!

describe('carsDirectorySummary', () => {
  it('no resume un informe ausente, flaco o incoherente', () => {
    expect(carsDirectorySummary(null)).toBeNull()
    expect(carsDirectorySummary(undefined)).toBeNull()
    const thin = report()
    thin.data.market.adverts = CARS_DIRECTORY_MIN_ADVERTS - 1
    expect(carsDirectorySummary(thin)).toBeNull()
    const upsideDown = report()
    upsideDown.data.market.price = { p25: 20_000, median: 12_490, p75: 18_000 }
    expect(carsDirectorySummary(upsideDown)).toBeNull()
    const zero = report()
    zero.data.market.price = { p25: 0, median: 12_490, p75: 18_000 }
    expect(carsDirectorySummary(zero)).toBeNull()
    expect(carsDirectorySummary(report({}, 'ayer'))).toBeNull()
  })

  it('copia las cifras del mercado tal como las publica el informe', () => {
    const s = summary()
    expect(s.adverts).toBe(19_568)
    expect(s.brands).toBe(82)
    expect(s.price).toEqual({ p25: 8900, median: 12_490, p75: 18_000 })
    expect(s.yearMedian).toBe(2018)
    expect(s.kmMedian).toBe(109_593)
    expect(s.dealerShare).toBeCloseTo(9189 / 19_568)
    expect(s.privateShare).toBeCloseTo(10_348 / 19_568)
    // Un resumen chico: lo que viaja en el payload de SSR, no el informe de 43 KB.
    expect(JSON.stringify(s).length).toBeLessThan(4000)
  })

  it('mantiene las franjas en orden y descarta una tabla con huecos', () => {
    const s = summary()
    expect(s.bands.map(band => band.from)).toEqual([0, 5000, 8000, 12_000, 18_000, 25_000, 40_000])
    expect(s.bands.reduce((sum, band) => sum + band.share, 0)).toBeCloseTo(1, 2)
    const gap = report()
    gap.data.market.priceBands = [
      { from: 0, to: 5000, adverts: 686 },
      { from: 8000, to: null, adverts: 3089 },
    ]
    expect(carsDirectorySummary(gap)!.bands).toEqual([])
    const openMiddle = report()
    openMiddle.data.market.priceBands = [
      { from: 0, to: null, adverts: 686 },
      { from: 5000, to: null, adverts: 3089 },
    ]
    expect(carsDirectorySummary(openMiddle)!.bands).toEqual([])
  })

  it('escribe la franja con el tope exclusivo y la abre en el buscador con los mismos topes', () => {
    expect(carsDirectoryBandLabel({ from: 0, to: 5000 })).toBe('menos de US$ 5.000')
    expect(carsDirectoryBandLabel({ from: 5000, to: 8000 })).toBe('US$ 5.000 a US$ 7.999')
    expect(carsDirectoryBandLabel({ from: 40_000, to: null })).toBe('US$ 40.000 o más')
    expect(carsDirectoryBandParams({ from: 0, to: 5000 })).toEqual({ priceMax: '4999' })
    expect(carsDirectoryBandParams({ from: 5000, to: 8000 })).toEqual({
      priceMin: '5000',
      priceMax: '7999',
    })
    expect(carsDirectoryBandParams({ from: 40_000, to: null })).toEqual({ priceMin: '40000' })
    for (const band of summary().bands) {
      const query = normalizeCarsQuery(carsDirectoryBandParams(band))
      expect(query.priceMin ?? 0).toBe(band.from)
      expect(query.priceMax).toBe(band.to === null ? null : band.to - 1)
    }
  })

  it('agrupa los miles a mano', () => {
    expect(carsDirectoryCount(3087)).toBe('3.087')
    expect(carsDirectoryCount(19_568)).toBe('19.568')
    expect(carsDirectoryCount(930)).toBe('930')
    expect(carsDirectoryLead(summary())).toBe(
      'En los avisos publicados en dólares el precio mediano pedido es US$ 12.490, y la mitad pide entre US$ 8.900 y US$ 18.000.'
    )
    expect(carsDirectoryProfile(summary())).toBe(
      'La mitad de los publicados es modelo 2018 o más nuevo y la mitad de los que informan los kilómetros declara menos de 109.593 km.'
    )
    expect(carsDirectoryProfile({ ...summary(), kmMedian: null })).toBe(
      'La mitad de los publicados es modelo 2018 o más nuevo.'
    )
    expect(carsDirectoryProfile({ ...summary(), yearMedian: null })).toBe('')
  })

  it('sólo publica los presupuestos que tienen página, y la enlaza si es indexable', () => {
    const budgets = summary().budgets
    expect(budgets.map(tier => tier.maxUsd)).toEqual([6000, 10_000, 30_000])
    for (const tier of budgets) expect(CAR_BUDGETS).toContain(tier.maxUsd)
    expect(budgets[0]).toMatchObject({
      top: { name: 'Suzuki Alto', medianYear: 2018 },
      hasPage: 3 >= CAR_BUDGET_MIN_MODELS,
    })
    expect(budgets[1]!.hasPage).toBe(false)
    expect(budgets[2]!.top).toBeNull()
    expect(carsDirectoryBudgetLine(budgets[0]!)).toBe(
      '991 avisos entre US$ 4.800 y US$ 6.000. El modelo con más avisos en esa franja es Suzuki Alto, con año mediano 2018.'
    )
    expect(carsDirectoryBudgetLine(budgets[2]!)).toBe('40 avisos entre US$ 24.000 y US$ 30.000.')
  })

  it('descarta marcas con un slug inválido y departamentos que no existen', () => {
    const s = summary()
    expect(s.brandsTop.map(brand => brand.slug)).toEqual(['chevrolet', 'volkswagen'])
    expect(s.departments.map(entry => entry.name)).toEqual([
      'Montevideo',
      'Canelones',
      'Maldonado',
      'Colonia',
      'Paysandú',
      'San José',
    ])
    expect(s.departments[0]!.share).toBeCloseTo(9594 / 19_568)
  })
})

describe('carsDirectoryFresh', () => {
  it('compara las dos fechas del payload', () => {
    const s = summary()
    expect(carsDirectoryFresh(s, '2026-11-20T02:39:03.250Z')).toBe(true)
    expect(carsDirectoryFresh(s, '2026-11-23T02:39:03.250Z')).toBe(true)
    expect(carsDirectoryFresh(s, '2026-11-24T02:39:03.250Z')).toBe(false)
    expect(carsDirectoryFresh(s, 'mañana')).toBe(false)
    expect(carsDirectoryFresh(s, null)).toBe(false)
    expect(carsDirectoryFresh(null, '2026-11-20T02:39:03.250Z')).toBe(false)
  })
})

describe('carsDirectoryBrowse', () => {
  it('sólo ofrece atajos que el buscador acepta como filtro', () => {
    const browse = carsDirectoryBrowse({
      departments: [
        { slug: 'Montevideo', name: 'Montevideo', count: 10_729 },
        { slug: 'Buenos Aires', name: 'Buenos Aires', count: 3 },
        { slug: 'Rocha', name: 'Rocha', count: 0 },
      ],
      bodies: [
        { slug: 'hatchback', name: 'Hatchback', count: 7987 },
        { slug: 'tanque', name: 'Tanque', count: 2 },
      ],
    })
    expect(browse!.departments.map(facet => facet.slug)).toEqual(['Montevideo'])
    expect(browse!.bodies).toEqual([{ slug: 'hatchback', name: 'Hatchback', count: 7987 }])
    for (const facet of browse!.departments)
      expect(normalizeCarsQuery({ department: facet.slug }).department).toBe(facet.slug)
    for (const facet of browse!.bodies)
      expect(normalizeCarsQuery({ body: facet.slug }).body).toBe(facet.slug)
    expect(carsDirectoryBrowse(null)).toBeNull()
    expect(carsDirectoryBrowse({ departments: [], bodies: [] })).toBeNull()
  })
})

describe('carsDirectoryFaq', () => {
  const ids = [
    'autos-precio-tipico',
    'autos-menos-de',
    'autos-presupuesto',
    'autos-modelos',
    'autos-departamentos',
    'autos-fuentes',
    'autos-automotora-o-dueno',
    'autos-bajas-de-precio',
  ]

  it('publica las ocho preguntas, en orden, con los números del informe', () => {
    const faq = carsDirectoryFaq(summary(), coverage)
    expect(faq.map(item => item.id)).toEqual(ids)
    const answer = (id: string) => faq.find(item => item.id === id)!.answer
    expect(answer('autos-precio-tipico')).toBe(
      'El precio mediano pedido es US$ 12.490 y la mitad de los avisos pide entre US$ 8.900 y US$ 18.000. Sale de 19.568 avisos publicados en dólares, medidos el 19 de noviembre de 2026. Son precios pedidos en avisos, no precios de venta cerrados.'
    )
    expect(answer('autos-menos-de')).toContain(
      '686 avisos publicados en dólares piden menos de US$ 5.000 (3,5 % del total)'
    )
    expect(answer('autos-menos-de')).toContain('3.089 piden de US$ 5.000 a US$ 7.999')
    expect(answer('autos-presupuesto')).toMatch(
      /^Con US\$ 6\.000, Suzuki Alto 2018; con US\$ 10\.000, Renault Kwid 2020\. /
    )
    expect(answer('autos-modelos')).toMatch(
      /^Chevrolet Onix \(652 avisos, mediana US\$ 12\.700\), Peugeot 208 \(477, US\$ 11\.990\) y Volkswagen Gol \(477, US\$ 10\.000\)\./
    )
    expect(answer('autos-departamentos')).toBe(
      'De los avisos publicados en dólares, el 49 % está en Montevideo, el 22 % en Canelones y el 6 % en Maldonado. Después vienen Colonia, Paysandú y San José.'
    )
    expect(answer('autos-fuentes')).toBe(
      'De los 21.950 avisos vigentes que leemos, 17.575 están en Mercado Libre y 3.529 en Facebook Marketplace. El resto se reparte entre Carper (231) y Clasiautos (211). El mismo auto publicado en más de una fuente se muestra una sola vez.'
    )
    expect(answer('autos-automotora-o-dueno')).toBe(
      'Por el mismo modelo y año, una automotora pide 2,2 % más que un dueño. De los avisos publicados en dólares, el 47 % es de automotoras y el 53 %, de dueños.'
    )
    expect(answer('autos-bajas-de-precio')).toBe(
      'En los últimos 7 días 306 avisos cambiaron de precio, el 1,1 % de los publicados: 271 bajaron y 35 subieron. Los que bajaron recortaron 4,3 % en la mediana. Son cambios que vimos entre dos lecturas nuestras, no rebajas que el aviso dice tener.'
    )
    expect(answer('autos-menos-de')).toContain(
      'Contando los publicados en pesos y los de Facebook con la moneda estimada hay más'
    )
    // La rotación del informe es la vida de los avisos que YA salieron: no contesta cuánto tarda
    // en venderse un auto, así que no se publica como pregunta.
    expect(faq.some(item => /tarda|vende/i.test(item.question))).toBe(false)
  })

  it('sin el reparto por vendedor no inventa un 0 %', () => {
    const base = report()
    const market = { ...base.data.market } as Record<string, unknown>
    delete market.sellers
    const s = carsDirectorySummary({
      ...base,
      data: { ...base.data, market },
    } as unknown as CarReportResponse)!
    expect(s.dealerShare).toBeNull()
    expect(s.privateShare).toBeNull()
    const answer = carsDirectoryFaq(s, coverage).find(
      item => item.id === 'autos-automotora-o-dueno'
    )!.answer
    expect(answer).toBe('Por el mismo modelo y año, una automotora pide 2,2 % más que un dueño.')
    expect(answer).not.toContain('0 %')
  })

  it('las preguntas no cambian de un informe a otro (el FAQPage se identifica por ellas)', () => {
    const other = report({}, '2026-12-01T02:00:00.000Z')
    other.data.market.price = { p25: 9000, median: 13_000, p75: 19_000 }
    other.data.market.priceBands[0]!.adverts = 700
    const a = carsDirectoryFaq(summary(), coverage)
    const b = carsDirectoryFaq(carsDirectorySummary(other), coverage)
    expect(b.map(item => item.question)).toEqual(a.map(item => item.question))
    expect(b[0]!.answer).not.toBe(a[0]!.answer)
  })

  it('una pregunta sin su medición no se publica', () => {
    const s = carsDirectorySummary(
      report({
        negotiation: {
          windowDays: 7,
          changed: 49,
          cut: 40,
          raised: 9,
          medianCut: 0.04,
          shareOfMarket: 0,
        },
        rotation: { measurable: false, historyDays: 3, retired: 10, medianDays: 5, note: '' },
        sellerGaps: { median: null, models: [] },
      })
    )
    const faq = carsDirectoryFaq(s, null)
    expect(faq.map(item => item.id)).toEqual([
      'autos-precio-tipico',
      'autos-menos-de',
      'autos-presupuesto',
      'autos-modelos',
      'autos-departamentos',
    ])
    expect(carsDirectoryFaq(null, coverage)).toEqual([])
  })

  it('ninguna respuesta escribe una ruta del sitio', () => {
    for (const item of carsDirectoryFaq(summary(), coverage)) {
      expect(item.answer).not.toMatch(/\/[a-z0-9-]+-uruguay/)
      expect(item.link).toBeUndefined()
    }
  })
})

describe('el directorio y su bloque de mercado (código)', () => {
  const page = read('pages/autos-usados-uruguay/index.vue')
  const component = read('components/cars/DirectoryMarket.vue')

  it('los dos componentes parsean', () => {
    expect(parse(page, { filename: 'index.vue' }).errors).toEqual([])
    expect(parse(component, { filename: 'DirectoryMarket.vue' }).errors).toEqual([])
  })

  it('la página trae el informe con clave propia y sólo guarda el resumen en el payload', () => {
    expect(page).toContain("'cars-directory-market'")
    expect(page).toContain('transform: carsDirectorySummary')
    expect(page).toMatch(/<FaqSection[^>]*:ad="false"/)
    expect(page).not.toMatch(/<VRow\b/)
  })

  it('el bloque no suma anuncios, ni grillas, ni enlaces rastreables a URLs con filtros', () => {
    expect(component).not.toMatch(/<VRow\b/)
    expect(component).not.toContain('AdSlot')
    // Las páginas por presupuesto existen sólo en español: la ruta va cruda.
    expect(component).not.toContain('localePath(carBudgetPath')
    expect(component).not.toMatch(/(href|:to)="[^"]*(priceMin|priceMax|department|body|brand)/)
  })
})

/** El bloque renderizado por el SSR de Vue: lo que lee un buscador o un asistente sin ejecutar JS. */
async function renderMarket(props: Record<string, unknown>): Promise<string> {
  const filename = join(APP, 'components/cars/DirectoryMarket.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const { content } = compileScript(descriptor, {
    id: 'cars-directory-market-test',
    inlineTemplate: true,
    templateOptions: { ssr: true },
  })
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const modules: Record<string, unknown> = {
    vue,
    'vue/server-renderer': serverRenderer,
    '~/utils/cars': carsUtils,
    '~/utils/carBudget': carBudgetUtils,
    '~/utils/carsReport': carsReportUtils,
    '~/utils/carsDirectorySummary': summaryUtils,
  }
  const exports = {} as { default: vue.Component }
  new Function('exports', 'require', 'useLocalePath', outputText)(
    exports,
    (name: string) => {
      if (name in modules) return modules[name]
      throw new Error(`Unexpected module ${name}`)
    },
    () => (path: string) => path
  )
  const app = vue.createSSRApp({ render: () => vue.h(exports.default, props) })
  // Vuetify y NuxtLink no se registran acá: un stub que dibuja su contenido alcanza para leer el texto.
  app.component('VTable', {
    setup:
      (_, { slots }) =>
      () =>
        vue.h('table', slots.default?.()),
  })
  app.component('NuxtLink', {
    props: { to: { type: String, required: true } },
    setup:
      (p: { to: string }, { slots }) =>
      () =>
        vue.h('a', { href: p.to }, slots.default?.()),
  })
  app.config.warnHandler = () => {}
  return serverRenderer.renderToString(app)
}

const textOf = (html: string): string =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/ ([.,:)])/g, '$1')
    .trim()

describe('CarsDirectoryMarket en el HTML del servidor', () => {
  const facets = {
    departments: [{ slug: 'Montevideo', name: 'Montevideo', count: 10_729 }],
    bodies: [{ slug: 'suv', name: 'SUV o crossover', count: 4837 }],
  }

  it('publica la mediana, las franjas, los presupuestos con enlace y las marcas', async () => {
    const html = await renderMarket({ summary: summary(), facets, total: 21_947 })
    const text = textOf(html)
    expect(text).toContain('US$ 12.490 es la mediana de lo que se pide por un auto usado.')
    expect(text).toContain('Sale de 19.568 avisos publicados en dólares, de 82 marcas')
    expect(text).toContain('US$ 5.000 a US$ 7.999 3.089 15,8 %')
    expect(html).toContain('href="/autos-usados-uruguay/hasta-6000-dolares"')
    expect(html).not.toContain('hasta-10000-dolares')
    // El enlace termina en el monto: el doble punto va pegado, sin un espacio adentro del enlace.
    expect(html).toMatch(/>Con US\$ 6\.000<\/a>: 991 avisos/)
    expect(text).toContain('Chevrolet 2.719 US$ 11.000 2018')
    expect(text).toContain('Cuántos de los 21.947 avisos vigentes hay en cada departamento')
    expect(text).toContain('(los que no informan el dato no entran en ninguno)')
    expect(text).toContain('Montevideo (10.729)')
    expect(text).toContain('SUV o crossover (4.837)')
    expect(html.match(/<h2\b/g)).toHaveLength(2)
    expect(html).not.toMatch(/<h1\b/)
  })

  it('sin informe deja sólo los atajos, y sin nada no dibuja ninguna sección', async () => {
    const onlyFacets = textOf(await renderMarket({ summary: null, facets, total: null }))
    expect(onlyFacets).not.toContain('mediana')
    expect(onlyFacets).toContain('Cuántos avisos vigentes hay en cada departamento')
    const empty = await renderMarket({ summary: null, facets: null, total: null })
    expect(empty).not.toMatch(/<section\b/)
  })
})
