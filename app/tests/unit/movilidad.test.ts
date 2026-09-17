import { describe, expect, it } from 'vitest'
import {
  isMovilidadCategorySlug,
  movilidadCategoryProjection,
  movilidadCheapestOffers,
  movilidadLongDate,
  movilidadMoney,
  movilidadPlausibleProducts,
  movilidadPrecioTipicoAnswer,
  movilidadSellerLabel,
  movilidadShortDate,
  movilidadSortItems,
  movilidadUsadoAnswer,
  movilidadUsd,
  type MovilidadBand,
  type MovilidadItemDoc,
  type MovilidadOffer,
  type MovilidadProduct,
} from '../../utils/movilidad'

const band = (n: number, overrides: Partial<MovilidadBand> = {}): MovilidadBand => ({
  p25: 9_000,
  median: 11_000,
  p75: 14_000,
  min: 7_000,
  n,
  ...overrides,
})

const offer = (priceUyu: number, overrides: Partial<MovilidadOffer> = {}): MovilidadOffer => ({
  seller: 'Tienda',
  title: 'Producto',
  url: 'https://example.com/producto',
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  condition: 'new',
  source: 'store',
  observedAt: '2026-09-10T00:00:00.000Z',
  ...overrides,
})

const product = (offersCount: number, bestPriceUyu = 10_000): MovilidadProduct => ({
  slug: 'producto',
  name: 'Producto',
  brand: 'Marca',
  model: 'Modelo',
  image: null,
  offers: Array.from({ length: offersCount }, (_, i) => offer(bestPriceUyu + i)),
  bestPriceUyu,
  sellers: offersCount,
})

function item(overrides: Partial<MovilidadItemDoc> = {}): MovilidadItemDoc {
  return {
    key: 'monopatin-electrico:urbano',
    category: 'monopatin-electrico',
    categoryLabel: 'Monopatín eléctrico',
    variant: 'urbano',
    variantLabel: 'Urbano o estándar',
    room: 'movilidad',
    tier: 'B',
    rank: 999,
    variantRank: 2,
    image: null,
    regime: 'modelo',
    reason: 'transporte',
    usedOk: true,
    quantity: 1,
    newBand: null,
    usedBand: null,
    usedSavingPct: null,
    products: [],
    offers: [],
    suspectDropped: 0,
    observedAt: null,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    ...overrides,
  }
}

describe('isMovilidadCategorySlug', () => {
  it('acepta sólo las dos categorías del registro', () => {
    expect(isMovilidadCategorySlug('monopatin-electrico')).toBe(true)
    expect(isMovilidadCategorySlug('bicicleta-electrica')).toBe(true)
  })

  it('rechaza cualquier otra cosa', () => {
    expect(isMovilidadCategorySlug('heladera')).toBe(false)
    expect(isMovilidadCategorySlug('')).toBe(false)
    expect(isMovilidadCategorySlug('monopatin-electrico ')).toBe(false)
  })
})

describe('movilidadSortItems', () => {
  it('pone primero los ítems con banda, después por variantRank, después alfabético', () => {
    const sinBanda = item({ key: 'a', variant: 'alto-rendimiento', variantRank: 3 })
    const conBandaNueva = item({ key: 'b', variant: 'urbano', variantRank: 2, newBand: band(10) })
    const conBandaUsada = item({
      key: 'c',
      variant: 'infantil',
      variantRank: 1,
      usedBand: band(4),
    })
    const result = movilidadSortItems([sinBanda, conBandaNueva, conBandaUsada])
    expect(result.map(r => r.key)).toEqual(['c', 'b', 'a'])
  })

  it('no muta el arreglo de entrada', () => {
    const original = [item({ key: 'z' }), item({ key: 'a' })]
    const copy = [...original]
    movilidadSortItems(original)
    expect(original).toEqual(copy)
  })
})

describe('movilidadPlausibleProducts', () => {
  it('saca un producto con precio menor a la mitad del p25 nuevo', () => {
    const products = [product(1, 500), product(1, 9_500)]
    products[0]!.slug = 'barato-sospechoso'
    products[1]!.slug = 'real'
    const result = movilidadPlausibleProducts(item({ newBand: band(20), products }))
    expect(result.map(p => p.slug)).toEqual(['real'])
  })

  it('sin banda nueva no filtra nada', () => {
    const products = [product(1, 500)]
    expect(movilidadPlausibleProducts(item({ newBand: null, products }))).toEqual(products)
  })
})

describe('movilidadCategoryProjection', () => {
  it('recorta productos a 12 y sus ofertas a 6', () => {
    const products = Array.from({ length: 20 }, () => product(10, 10_000))
    const [result] = movilidadCategoryProjection([item({ newBand: band(50), products })])
    expect(result!.products).toHaveLength(12)
    for (const p of result!.products) expect(p.offers).toHaveLength(6)
  })

  it('recorta las ofertas del ítem a 14', () => {
    const offers = Array.from({ length: 20 }, (_, i) => offer(1_000 + i))
    const [result] = movilidadCategoryProjection([item({ offers })])
    expect(result!.offers).toHaveLength(14)
  })

  it('no muta los ítems de entrada', () => {
    const products = Array.from({ length: 20 }, () => product(10, 10_000))
    const original = item({ newBand: band(50), products })
    movilidadCategoryProjection([original])
    expect(original.products).toHaveLength(20)
  })
})

describe('movilidadSellerLabel', () => {
  it('rotula al vendedor sin identificar de Mercado Libre', () => {
    expect(movilidadSellerLabel('Mercado Libre', 'mercadolibre')).toBe(
      'Vendedor sin identificar (Mercado Libre)'
    )
  })

  it('no toca un vendedor identificado de Mercado Libre', () => {
    expect(movilidadSellerLabel('Bikes Uruguay', 'mercadolibre')).toBe('Bikes Uruguay')
  })

  it('no toca una tienda que se llame igual pero no venga de Mercado Libre', () => {
    expect(movilidadSellerLabel('Mercado Libre', 'store')).toBe('Mercado Libre')
    expect(movilidadSellerLabel('Mercado Libre', 'facebook')).toBe('Mercado Libre')
  })
})

describe('movilidadCheapestOffers', () => {
  it('ordena por precio y respeta el límite, sólo de la condición pedida', () => {
    const items = [
      item({
        key: 'a',
        offers: [offer(3_000, { condition: 'used' }), offer(1_000), offer(2_000)],
      }),
      item({ key: 'b', offers: [offer(500)] }),
    ]
    const result = movilidadCheapestOffers(items, 'new', 2)
    expect(result.map(r => r.offer.priceUyu)).toEqual([500, 1_000])
  })

  it('descarta ofertas sin url', () => {
    const items = [item({ offers: [offer(100, { url: '' })] })]
    expect(movilidadCheapestOffers(items, 'new', 5)).toEqual([])
  })
})

describe('formato', () => {
  it('movilidadMoney lleva espacio duro y separador es-UY', () => {
    expect(movilidadMoney(13019)).toBe('$\u00A013.019')
  })

  it('movilidadUsd lleva espacio duro y el prefijo USD', () => {
    expect(movilidadUsd(199)).toBe('USD\u00A0199')
  })

  it('movilidadLongDate escribe "setiembre", no "septiembre"', () => {
    expect(movilidadLongDate('2026-09-17')).toContain('setiembre')
    expect(movilidadLongDate('2026-09-17')).not.toContain('septiembre')
  })

  it('movilidadShortDate y movilidadLongDate devuelven vacío sin fecha', () => {
    expect(movilidadShortDate(null)).toBe('')
    expect(movilidadLongDate(undefined)).toBe('')
  })
})

describe('movilidadPrecioTipicoAnswer', () => {
  it('dice "sin datos suficientes" sin ninguna banda nueva', () => {
    const answer = movilidadPrecioTipicoAnswer([item()], 'monopatines eléctricos', null)
    expect(answer).toContain('sin datos suficientes')
  })

  it('lista la mediana por variante, la más observada primero', () => {
    const items = [
      item({ key: 'a', variantLabel: 'Urbano', newBand: band(5) }),
      item({ key: 'b', variantLabel: 'Infantil', newBand: band(20) }),
    ]
    const answer = movilidadPrecioTipicoAnswer(items, 'monopatines eléctricos', '2026-09-17')
    expect(answer.indexOf('infantil')).toBeLessThan(answer.indexOf('urbano'))
    expect(answer).toContain('setiembre')
  })
})

describe('movilidadUsadoAnswer', () => {
  it('dice que no conviene cuando usedOk es false', () => {
    expect(movilidadUsadoAnswer([item()], false, 'no conviene por la garantía')).toBe(
      'No: no conviene por la garantía'
    )
  })

  it('dice que faltan avisos usados sin banda usada', () => {
    const answer = movilidadUsadoAnswer([item()], true, undefined)
    expect(answer).toContain('todavía no relevamos')
  })

  it('publica la mediana usada y el ahorro cuando hay banda', () => {
    const items = [item({ usedBand: band(6), usedSavingPct: 32 })]
    const answer = movilidadUsadoAnswer(items, true, undefined)
    expect(answer).toContain('32 %')
    expect(answer).toContain('6 avisos')
  })
})
