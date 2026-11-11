// The cards, rates and sources the /asistente-ia chat draws under an answer (utils/chatResults.ts),
// read from the MCP's structured payload. The shapes below copy what the MCP returned on 2026-11-11
// (search_rentals, search_used_cars, search_products, get_rates, get_evolution, search_site, get_news),
// with invented values.

import { describe, expect, it } from 'vitest'
import {
  MAX_CARDS,
  buildChatBlocks,
  calmTitle,
  followUps,
  plainAnswer,
  safeImage,
  toolFamily,
  type CardsBlock,
  type LinksBlock,
  type QuoteBlock,
  type RatesBlock,
  type SeriesBlock,
  type ToolCallRecord,
} from '../../utils/chatResults'
import { changeLabel, marketStrip, seriesGeometry } from '../../utils/chatCharts'

const SITE = 'https://cambio-uruguay.com'

const rental = (key: string, over: Record<string, unknown> = {}) => ({
  key,
  title: 'Apartamento luminoso con balcón',
  type: 'apartamento',
  department: 'Montevideo',
  neighborhood: 'Pocitos',
  bedrooms: 2,
  bathrooms: 1,
  areaM2: 69,
  rent: { amount: 33000, currency: 'UYU', uyu: 33000 },
  expensesUyu: 4300,
  monthlyUyu: 37300,
  pets: true,
  sources: ['infocasas'],
  listingUrl: `https://www.infocasas.com.uy/aviso/${key}`,
  image: `https://cdn2.infocasas.com.uy/repo/img/${key}.jpg`,
  siteUrl: `${SITE}/alquileres/${key}`,
  ...over,
})

const rentals = (items: unknown[], over: Record<string, unknown> = {}): ToolCallRecord => ({
  name: 'search_rentals',
  data: { total: 926, items, siteUrl: `${SITE}/alquileres-uruguay?dormitorios=2`, ...over },
})

const cardsOf = (calls: ToolCallRecord[], answer = '') =>
  buildChatBlocks(calls, answer).filter((b): b is CardsBlock => b.kind === 'cards')

describe('alquileres', () => {
  it('una tarjeta por aviso, con lo que se decide de un vistazo', () => {
    const [block] = cardsOf([rentals([rental('pocitos-1')])])
    expect(block).toMatchObject({ vertical: 'alquiler', title: 'Alquileres', total: 926 })
    expect(block!.moreUrl).toBe(`${SITE}/alquileres-uruguay?dormitorios=2`)
    expect(block!.cards[0]).toMatchObject({
      id: 'pocitos-1',
      price: '$ 33.000/mes',
      priceCaption: 'Total $ 37.300 con gastos comunes',
      facts: ['Apartamento', '2 dorm.', '1 baño', '69 m²'],
      place: 'Pocitos',
      source: 'InfoCasas',
      url: `${SITE}/alquileres/pocitos-1`,
      image: 'https://cdn2.infocasas.com.uy/repo/img/pocitos-1.jpg',
    })
    expect(block!.cards[0]!.badges).toContainEqual({ label: 'Mascotas', tone: 'info' })
  })

  it('dice cuando los gastos comunes no están publicados y baja el título gritado', () => {
    const [block] = cardsOf([
      rentals([
        rental('cordon-1', {
          title: 'ALQUILER EN CORDON DE 1 DORMITORIO',
          expensesUyu: undefined,
          monthlyUyu: undefined,
          priceDrop: { pct: 8, from: 36000, at: '2026-11-01' },
          rent: { amount: 650, currency: 'USD' },
        }),
      ]),
    ])
    const card = block!.cards[0]!
    expect(card.title).toBe('Alquiler en cordon de 1 dormitorio')
    expect(card.price).toBe('US$ 650/mes')
    expect(card.priceCaption).toBe('Gastos comunes sin publicar')
    expect(card.badges[0]).toEqual({ label: 'Bajó 8 %', tone: 'good' })
  })

  it('sin gastos comunes no es lo mismo que gastos sin publicar, y sin barrio va el departamento', () => {
    const [block] = cardsOf([
      rentals([rental('casa-1', { expensesUyu: 0, monthlyUyu: 33000, neighborhood: undefined })]),
    ])
    expect(block!.cards[0]).toMatchObject({
      priceCaption: 'Sin gastos comunes',
      place: 'Montevideo',
    })
  })

  it('primero lo que la respuesta cita, después en el orden de la búsqueda', () => {
    const calls = [rentals([rental('a-111111111'), rental('b-222222222'), rental('c-333333333')])]
    const [block] = cardsOf(calls, `Te recomiendo [este](${SITE}/alquileres/c-333333333).`)
    expect(block!.cards.map(c => c.id)).toEqual(['c-333333333', 'a-111111111', 'b-222222222'])
    expect(block!.cards.map(c => c.mentioned)).toEqual([true, false, false])
  })

  it('reconoce la cita por la clave aunque el link venga sin dominio', () => {
    const [block] = cardsOf(
      [rentals([rental('a-111111111'), rental('b-222222222')])],
      '/alquileres/b-222222222'
    )
    expect(block!.cards[0]!.id).toBe('b-222222222')
  })

  it('junta varias búsquedas del turno sin repetir, y la primera dice el total', () => {
    const calls = [
      rentals([rental('a-1'), rental('b-1')]),
      rentals([rental('b-1'), rental('c-1')], { total: 3, siteUrl: `${SITE}/otra` }),
    ]
    const [block] = cardsOf(calls)
    expect(block!.cards.map(c => c.id)).toEqual(['a-1', 'b-1', 'c-1'])
    expect(block!.total).toBe(926)
    expect(block!.moreUrl).toBe(`${SITE}/alquileres-uruguay?dormitorios=2`)
  })

  it('un carrusel tiene un tope', () => {
    const many = Array.from({ length: 30 }, (_, i) => rental(`k-${i}`))
    expect(cardsOf([rentals(many)])[0]!.cards).toHaveLength(MAX_CARDS)
  })

  it('la ficha y sus parecidas van al mismo carrusel', () => {
    const [block] = cardsOf([
      { name: 'get_rental', data: { property: rental('main-1'), similar: [rental('sim-1')] } },
    ])
    expect(block!.cards.map(c => c.id)).toEqual(['main-1', 'sim-1'])
  })

  it('una foto que no es https no llega a la tarjeta', () => {
    const [block] = cardsOf([rentals([rental('a-1', { image: 'http://inseguro.example/a.jpg' })])])
    expect(block!.cards[0]!.image).toBeUndefined()
  })

  it('una herramienta que falló no dibuja nada', () => {
    expect(buildChatBlocks([{ ...rentals([rental('a-1')]), isError: true }])).toEqual([])
    expect(
      buildChatBlocks([{ name: 'tool_que_no_existe', data: { items: [rental('a-1')] } }])
    ).toEqual([])
  })
})

describe('autos, productos y oportunidades', () => {
  it('un auto: dólares, año, kilómetros y caja', () => {
    const [block] = cardsOf([
      {
        name: 'search_used_cars',
        data: {
          total: 40,
          siteUrl: `${SITE}/autos-usados-uruguay?caja=automatica`,
          items: [
            {
              key: 'ml-MLU1',
              title: 'Mitsubishi Mirage G4 1.2 Abs 4p Aut',
              image: 'https://http2.mlstatic.com/D_NQ_NP_2X_1.webp',
              year: 2024,
              km: 29000,
              priceUsd: 13900,
              fuel: 'nafta',
              transmission: 'automatica',
              department: 'Montevideo',
              source: 'Mercado Libre',
              siteUrl: `${SITE}/autos-usados-uruguay/ml-MLU1`,
              opportunity: { gapPct: 12, tier: 'clara' },
            },
          ],
        },
      },
    ])
    expect(block!.cards[0]).toMatchObject({
      vertical: 'auto',
      price: 'US$ 13.900',
      facts: ['2024', '29.000 km', 'Automático', 'Nafta'],
      place: 'Montevideo',
      source: 'Mercado Libre',
    })
    expect(block!.cards[0]!.badges[0]).toEqual({ label: '12 % bajo su cohorte', tone: 'good' })
  })

  it('un producto: desde cuánto y dónde', () => {
    const [block] = cardsOf([
      {
        name: 'search_products',
        data: {
          total: 2,
          items: [
            {
              vertical: 'celulares',
              name: 'Apple iPhone 13 128 GB',
              brand: 'Apple',
              bestPriceUyu: 21684,
              sellers: 4,
              image: 'https://f.fcdn.app/iphone.jpg',
              siteUrl: `${SITE}/celulares-uruguay/apple-iphone-13-128gb`,
            },
            {
              vertical: 'hogar',
              name: 'Heladera — Con freezer',
              bestPriceUyu: 18000,
              bestOffer: { seller: 'Tienda X', priceUyu: 18000 },
              usedSavingPct: 35,
              siteUrl: `${SITE}/equipar-casa-uruguay/heladera`,
            },
          ],
        },
      },
    ])
    expect(block!.cards[0]).toMatchObject({
      price: 'desde $ 21.684',
      priceCaption: '4 vendedores',
      facts: ['Apple'],
    })
    expect(block!.cards[1]).toMatchObject({ priceCaption: 'en Tienda X', image: undefined })
    expect(block!.cards[1]!.badges).toEqual([{ label: 'Usado 35 % menos', tone: 'good' }])
  })

  it('una oportunidad: el precio comparado contra sus parecidos', () => {
    const [block] = cardsOf([
      {
        name: 'find_property_opportunities',
        data: {
          total: 8,
          siteUrl: `${SITE}/oportunidades-inmobiliarias-uruguay`,
          items: [
            {
              title: 'Apto en Cordón',
              type: 'apartamento',
              neighborhood: 'Cordón',
              department: 'Montevideo',
              bedrooms: 1,
              comparedPrice: '$ 25.000',
              medianOfComparables: '$ 32.500',
              comparables: 12,
              gapPct: 23.1,
              confidence: 'más sólida',
              siteUrl: `${SITE}/alquileres/cordon-1`,
            },
          ],
        },
      },
    ])
    expect(block!.cards[0]).toMatchObject({
      vertical: 'oportunidad',
      price: '$ 25.000',
      priceCaption: 'Parecidos: mediana $ 32.500 (12 avisos)',
    })
    expect(block!.cards[0]!.badges[0]).toEqual({ label: '23 % bajo la mediana', tone: 'good' })
  })
})

describe('cotizaciones', () => {
  const rates = (houses: unknown[], over: Record<string, unknown> = {}): ToolCallRecord => ({
    name: 'get_rates',
    data: {
      currency: 'USD',
      marketAvgBuy: 39.3,
      marketAvgSell: 41.5,
      bestBuy: { origin: 'cambio_fenix', name: 'Cambio Fenix', rate: 40.4 },
      bestSell: { origin: 'prex', name: 'Prex', rate: 40.73 },
      houses,
      ...over,
    },
  })

  it('la mejor venta y compra, y cada casa marcada si no corona', () => {
    const [block] = buildChatBlocks([
      rates([
        { name: 'Baluma Cambio', buy: 37.15, sell: 39.55, offMarket: true, frozen: true },
        { name: 'Prex', buy: 40.32, sell: 40.73, offMarket: false },
        { name: 'Sin precio', buy: 0, sell: 41 },
      ]),
    ]) as RatesBlock[]
    expect(block).toMatchObject({
      kind: 'rates',
      currency: 'USD',
      bestSell: { name: 'Prex', rate: 40.73 },
      bestBuy: { name: 'Cambio Fenix', rate: 40.4 },
      moreUrl: `${SITE}/cotizacion/dolar`,
    })
    expect(block!.houses).toEqual([
      { name: 'Baluma Cambio', buy: 37.15, sell: 39.55, excluded: true },
      { name: 'Prex', buy: 40.32, sell: 40.73, excluded: false },
    ])
  })

  it('dos lecturas de la misma moneda en un turno: vale la última', () => {
    const blocks = buildChatBlocks([
      rates([], { marketAvgSell: 41 }),
      rates([], { marketAvgSell: 42 }),
    ]) as RatesBlock[]
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.avgSell).toBe(42)
  })

  it('la mejor casa y una conversión, como una cifra con su explicación', () => {
    const blocks = buildChatBlocks([
      { name: 'best_house', data: { currency: 'USD', side: 'buy', name: 'Prex', rate: 40.73 } },
      { name: 'convert', data: { amount: 100, from: 'USD', to: 'UYU', result: 4040, rate: 40.4 } },
    ]) as QuoteBlock[]
    expect(blocks[0]).toMatchObject({
      label: 'Para comprar USD',
      value: '$ 40,73',
      caption: 'Te lo vende Prex',
    })
    expect(blocks[1]).toMatchObject({ label: '100,00 USD son', value: '$ 4.040' })
  })

  it('la mejor casa no se repite al lado del panel de su moneda; la conversión sí queda', () => {
    const kinds = buildChatBlocks([
      rates([]),
      { name: 'best_house', data: { currency: 'USD', side: 'buy', name: 'Prex', rate: 40.73 } },
      { name: 'best_house', data: { currency: 'EUR', side: 'buy', name: 'Fortex', rate: 47.15 } },
      { name: 'convert', data: { amount: 100, from: 'USD', to: 'UYU', result: 4040 } },
    ]).map(b => (b.kind === 'quote' ? b.label : b.kind))
    expect(kinds).toEqual(['Para comprar EUR', '100,00 USD son', 'rates'])
  })

  it('las cifras van antes que los avisos', () => {
    const kinds = buildChatBlocks([
      rentals([rental('a-1')]),
      { name: 'best_house', data: { currency: 'USD', side: 'sell', name: 'Fenix', rate: 40.4 } },
    ]).map(b => b.kind)
    expect(kinds).toEqual(['quote', 'cards'])
  })

  it('la historia usa la pizarra de mostrador cuando la casa publica varias', () => {
    const [block] = buildChatBlocks([
      {
        name: 'get_evolution',
        data: {
          origin: 'brou',
          code: 'USD',
          localData: { name: 'BROU' },
          evolution: [
            { date: '2026-08-12T03:00:00.000Z', buy: 39.7, sell: 41.1, type: 'EBROU' },
            { date: '2026-08-12T03:00:00.000Z', buy: 39.5, sell: 41.5, type: '' },
            { date: '2026-08-11T03:00:00.000Z', buy: 39.4, sell: 41.4, type: '' },
          ],
        },
      },
    ]) as SeriesBlock[]
    expect(block).toMatchObject({ title: 'BROU · USD', moreUrl: `${SITE}/historico/brou` })
    expect(block!.points.map(p => p.sell)).toEqual([41.4, 41.5])
  })
})

describe('fuentes y noticias', () => {
  it('las páginas del sitio, sin repetir, primero las que la respuesta cita', () => {
    const [block] = buildChatBlocks(
      [
        {
          name: 'search_site',
          data: {
            pages: [
              { title: 'Couriers en Uruguay', url: `${SITE}/couriers-uruguay`, section: 'Compras' },
            ],
            content: [
              {
                title: 'Franquicia',
                url: `${SITE}/franquicia-courier-uruguay#limites`,
                crawledAt: '2026-10-19',
                passages: [{ text: 'Podés traer hasta   US$ 800 al año.' }],
              },
              { title: 'Couriers en Uruguay', url: `${SITE}/couriers-uruguay/`, passages: [] },
            ],
          },
        },
      ],
      `Según [la guía](${SITE}/franquicia-courier-uruguay#limites)…`
    ) as LinksBlock[]
    expect(block).toMatchObject({ variant: 'sources', title: 'Fuentes' })
    expect(block!.items.map(i => i.title)).toEqual(['Franquicia', 'Couriers en Uruguay'])
    expect(block!.items[0]!.snippet).toBe('Podés traer hasta US$ 800 al año.')
    // The day it was read, not the day before (a bare date is midnight UTC).
    expect(block!.items[0]!.meta).toMatch(/^leído el 19 oct/)
  })

  it('las noticias con su medio y su fecha', () => {
    const [block] = buildChatBlocks([
      {
        name: 'get_news',
        data: {
          items: [
            {
              title: 'El dólar cerró estable',
              link: 'https://news.google.com/rss/articles/x',
              source: 'EL PAÍS Uruguay',
              pubDate: 'Wed, 11 Nov 2026 15:56:38 GMT',
            },
          ],
        },
      },
    ]) as LinksBlock[]
    expect(block).toMatchObject({ variant: 'news', title: 'Noticias' })
    expect(block!.items[0]!.meta).toMatch(/^EL PAÍS Uruguay · 11 nov/)
  })
})

describe('preguntas para seguir', () => {
  it('siguen de lo que se mostró, sin repetir la pregunta recién hecha, y son tres como mucho', () => {
    const blocks = buildChatBlocks([rentals([rental('a-1')])])
    const next = followUps(blocks, 'Mostrame opciones más baratas')
    expect(next).toHaveLength(2)
    expect(next).not.toContain('Mostrame opciones más baratas')
    expect(followUps([])).toEqual([])
  })
})

describe('utilidades', () => {
  it('calmTitle sólo toca lo que está todo en mayúsculas', () => {
    expect(calmTitle('IPHONE')).toBe('IPHONE')
    expect(calmTitle('Apto en Pocitos con BBQ')).toBe('Apto en Pocitos con BBQ')
    expect(calmTitle('CASA EN EL PINAR CON PARRILLERO')).toBe('Casa en el pinar con parrillero')
  })

  it('plainAnswer: lo que oye un lector de pantalla, sin URLs ni marcas', () => {
    expect(
      plainAnswer('Hoy **Prex** vende más barato. Mirá [la ficha](https://x.example/a).')
    ).toBe('Hoy Prex vende más barato. Mirá la ficha.')
  })

  it('safeImage', () => {
    expect(safeImage('https://a.example/x.jpg')).toBe('https://a.example/x.jpg')
    expect(safeImage('https://user:pass@a.example/x.jpg')).toBeUndefined()
    expect(safeImage('javascript:alert(1)')).toBeUndefined()
    expect(safeImage(42)).toBeUndefined()
  })

  it('toolFamily elige el ícono de cada paso', () => {
    expect(toolFamily('search_rentals')).toBe('alquileres')
    expect(toolFamily('compare_neighborhoods')).toBe('alquileres')
    expect(toolFamily('get_car')).toBe('autos')
    expect(toolFamily('supermarket_prices')).toBe('productos')
    expect(toolFamily('search_site')).toBe('sitio')
    expect(toolFamily('get_rates')).toBe('cambio')
  })
})

describe('gráficos', () => {
  const houses = [
    { name: 'Baluma', buy: 37.15, sell: 39.55, excluded: true },
    { name: 'Prex', buy: 40.32, sell: 40.73, excluded: false },
    { name: 'Gales', buy: 39.05, sell: 41.45, excluded: false },
    { name: 'BROU', buy: 39.3, sell: 41.7, excluded: false },
  ]

  it('la tira del mercado se escala con las pizarras que coronan, y la descartada queda en el borde', () => {
    const strip = marketStrip(houses, 'sell', 'Prex', 41.5)!
    expect(strip.min).toBeLessThan(40.73)
    expect(strip.max).toBeGreaterThan(41.7)
    const baluma = strip.dots.find(d => d.name === 'Baluma')!
    expect(baluma).toMatchObject({ x: 0, excluded: true, best: false })
    const prex = strip.dots.find(d => d.name === 'Prex')!
    expect(prex.best).toBe(true)
    expect(prex.x).toBeGreaterThan(0)
    // The best dot is drawn last.
    expect(strip.dots[strip.dots.length - 1]!.name).toBe('Prex')
    expect(strip.avgX).toBeGreaterThan(prex.x)
  })

  it('sin dos pizarras vivas no hay tira', () => {
    expect(marketStrip(houses.slice(0, 2), 'sell')).toBeNull()
  })

  it('la historia: una línea por lado sobre la misma escala', () => {
    const geometry = seriesGeometry(
      [
        { date: '2026-08-11', buy: 39, sell: 41 },
        { date: '2026-08-12', buy: 39.5, sell: 41.5 },
        { date: '2026-08-13', buy: null, sell: 41.2 },
      ],
      300,
      100,
      10
    )!
    // One scale from 39 (the lowest buy) to 41,5 (the highest sell), 10 px of padding: 41 sits at
    // 10 + (1 − 2/2,5) × 80 = 26.
    expect(geometry.sell!.line).toBe('M0 26 L150 10 L300 19.6')
    expect(geometry.sell!.area.endsWith('L300 100 L0 100 Z')).toBe(true)
    expect(geometry.buy!.line).toBe('M0 90 L150 74')
    expect(geometry.sell).toMatchObject({ first: 41, last: 41.2, min: 41, max: 41.5 })
    // A day without a buy: no spread band, the area under the sell instead.
    expect(geometry.band).toBeUndefined()
    expect(geometry.sellMaxY).toBe(10)
  })

  it('con los dos lados cada día, la banda entre compra y venta es el spread', () => {
    const geometry = seriesGeometry(
      [
        { date: '2026-08-11', buy: 39, sell: 41 },
        { date: '2026-08-12', buy: 39.5, sell: 41.5 },
      ],
      300,
      100,
      10
    )!
    expect(geometry.band).toBe('M0 26 L300 10 L300 74 L0 90 Z')
  })

  it('changeLabel', () => {
    expect(changeLabel(40, 40.28)).toBe('+0,7 %')
    expect(changeLabel(41, 40.5)).toBe('−1,2 %')
    expect(changeLabel(41, 41)).toBe('sin cambios')
  })
})
