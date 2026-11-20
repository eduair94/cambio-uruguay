import { describe, expect, it } from 'vitest'

import {
  PRODUCTOS_VIDA_EMPTY,
  productosVidaCountLabel,
  productosVidaDateTime,
  productosVidaFaq,
  productosVidaFilterHref,
  productosVidaFit,
  productosVidaFitLine,
  productosVidaLead,
  productosVidaLongDate,
  productosVidaMlSearchUrl,
  productosVidaMoney,
  productosVidaMontevideoDay,
  productosVidaQueryFromState,
  productosVidaRanks,
  productosVidaResponse,
  productosVidaResultLine,
  productosVidaRulerDomain,
  productosVidaRulerPositions,
  productosVidaSearchLabel,
  productosVidaSellerLabel,
  productosVidaShortDate,
  productosVidaShortTitle,
  productosVidaStateFromQuery,
  productosVidaTieText,
  productosVidaTypeCounts,
  productosVidaUsd,
  productosVidaVisible,
  type ProductosVidaItemDoc,
  type ProductosVidaProduct,
  type ProductosVidaResponse,
  type ProductosVidaStoredOffer,
} from '../../utils/productosVida'
import { PRODUCTOS_VIDA_PRODUCTS, PRODUCTOS_VIDA_SLUGS } from '../../utils/productosVidaCatalog'

const HOUR = 3_600_000
const GENERATED = '2026-11-20T16:13:05.123Z'
const NOW = Date.parse('2026-11-20T16:20:00Z')
const META = { generatedAt: GENERATED, usdUyu: 40.12, listings: 1934 }
const NBSP = '\u00A0'

// Títulos reales de la muestra de Mercado Libre del 2026-11-19 (docs/seo/data/, fuera del repo).
function offer(
  id: string,
  title: string,
  price: number,
  currency: 'UYU' | 'USD',
  extra: Partial<ProductosVidaStoredOffer> = {}
): ProductosVidaStoredOffer {
  return {
    listingId: `MLU${id}`,
    seller: 'LOi',
    title,
    url: `https://articulo.mercadolibre.com.uy/MLU-${id}-aviso`,
    image: `https://http2.mlstatic.com/D_NQ_NP_${id}-MLU${id}_112025-F.webp`,
    price,
    currency,
    priceUyu: currency === 'USD' ? Math.round(price * 40.12) : price,
    condition: 'new',
    source: 'mercadolibre',
    observedAt: '2026-11-20T16:11:00.000Z',
    ...extra,
  }
}

function item(
  category: string,
  variant: string,
  variantRank: number,
  band: ProductosVidaItemDoc['newBand'],
  offers: ProductosVidaStoredOffer[],
  observedAt = '2026-11-20T16:12:00.000Z'
): ProductosVidaItemDoc {
  return {
    category,
    variant,
    variantLabel: `Variante ${variant}`,
    variantRank,
    newBand: band,
    offers,
    lastSeen: observedAt.slice(0, 10),
    observedAt,
  }
}

const FREIDORA_BAND = { p25: 2990, median: 4139, p75: 7182, min: 2390, n: 28 }

describe('productosVidaResponse: el armado de la API', () => {
  it('deja afuera lo que no es del catálogo y respeta el orden del catálogo', () => {
    const res = productosVidaResponse(
      META,
      [
        item('freidora-de-aire', 'grande', 3, FREIDORA_BAND, [
          offer(
            '702991670',
            'Freidora Sin Aceite Nappo Digital De 10l + Manopla Y Pinza',
            3170,
            'UYU'
          ),
        ]),
        item('smartwatch', 'unico', 1, FREIDORA_BAND, []),
        item(
          'calientacama',
          'dos-plazas',
          2,
          { p25: 1300, median: 1680, p75: 2400, min: 990, n: 32 },
          [
            offer(
              '666085584',
              'Calientacama 2 Plazas Blanco Allied AL-BW02 2 Temperaturas Lavable Poliester',
              1299,
              'UYU'
            ),
          ]
        ),
      ],
      NOW
    )
    expect(res.products.map(p => p.slug)).toEqual(['calientacama', 'freidora-de-aire'])
    expect(res.generatedAt).toBe(GENERATED)
    expect(res.usdUyu).toBe(40.12)
    expect(res.listings).toBe(1934)
    expect(res.stale).toBe(false)
    expect(res.unavailable).toBe(false)
  })

  it('sólo lo nuevo: las ofertas usadas no salen ni cuentan', () => {
    const res = productosVidaResponse(
      META,
      [
        item(
          'lavavajillas',
          'estandar',
          2,
          { p25: 25000, median: 31000, p75: 38000, min: 20000, n: 45 },
          [
            offer('824514304', 'Lavavajillas James Lv 14 M Bp Negro 14 Cubiertos', 652, 'USD'),
            offer('100000001', 'Lavavajillas usado 12 cubiertos', 150, 'USD', {
              condition: 'used',
            }),
          ]
        ),
      ],
      NOW
    )
    const product = res.products[0]!
    expect(product.offers).toHaveLength(1)
    expect(product.offers[0]!.title).toContain('James')
    expect(product.variants[0]!.newOffers).toBe(1)
    expect(JSON.stringify(res)).not.toContain('usedBand')
  })

  it('reparte hasta 4 ofertas por vueltas entre variantes con banda, la más barata primero', () => {
    const res = productosVidaResponse(
      META,
      [
        item(
          'secarropas',
          'tambor',
          3,
          { p25: 22000, median: 27000, p75: 40000, min: 18000, n: 28 },
          [
            offer(
              '652192488',
              'Secarropas Samsung DV90T5240A Carga Frontal 9 Kg Blanco',
              999,
              'USD'
            ),
            offer(
              '702387431',
              'Secarropa Frontal Enxuta 8kg Bomba de Calor SENX980BC Blanco',
              589,
              'USD'
            ),
            offer(
              '1365067178',
              'Secarropas Inverter Whirlpool W3d91wees 9 Kg Bl Blanco',
              799,
              'USD'
            ),
          ]
        ),
        item('secarropas', 'bolsa', 1, { p25: 1900, median: 2400, p75: 3100, min: 1500, n: 18 }, [
          offer('200000001', 'Secarropas Portatil De Bolsa Aire Caliente', 2290, 'UYU'),
          offer('200000002', 'Secarropas Portatil Plegable Bolsa', 1990, 'UYU'),
        ]),
      ],
      NOW
    )
    const product = res.products[0]!
    expect(product.variants.map(v => v.id)).toEqual(['bolsa', 'tambor'])
    expect(product.offers.map(o => [o.variant, o.price])).toEqual([
      ['bolsa', 1990],
      ['tambor', 589],
      ['bolsa', 2290],
      ['tambor', 799],
    ])
  })

  it('no repite una URL, corta el título y achica la foto', () => {
    const long =
      'Freidora de Aire Dual Moulinex con doble canasto de acero inox, control digital, Ademas de freir posee el modo parrilla integrado, EZ905D20 Easy Fry & Grill 8.3 Litros 2700w'
    const dup = offer('739077796', long, 229, 'USD')
    const res = productosVidaResponse(
      META,
      [
        item('freidora-de-aire', 'grande', 3, FREIDORA_BAND, [dup, { ...dup, price: 230 }]),
        item('freidora-de-aire', 'mediana', 2, FREIDORA_BAND, [{ ...dup, variant: 'x' } as never]),
      ],
      NOW
    )
    const offers = res.products[0]!.offers
    expect(offers).toHaveLength(1)
    expect(offers[0]!.title.length).toBeLessThanOrEqual(90)
    expect(offers[0]!.title.endsWith('…')).toBe(true)
    expect(offers[0]!.image).toBe(
      'https://http2.mlstatic.com/D_NQ_NP_739077796-MLU739077796_112025-O.webp'
    )
    expect(offers[0]!.currency).toBe('USD')
    expect(offers[0]!.priceUyu).toBe(Math.round(229 * 40.12))
  })

  it('una oferta sin foto queda con image null', () => {
    const res = productosVidaResponse(
      META,
      [
        item('freidora-de-aire', 'grande', 3, FREIDORA_BAND, [
          offer('1', 'Freidora Sin Aceite Nappo 8l', 2990, 'UYU', { image: null }),
        ]),
      ],
      NOW
    )
    expect(res.products[0]!.offers[0]!.image).toBeNull()
  })

  it('stale pasadas 13 h de la última lectura (el hueco normal de las 4 a las 16 UTC mide 12 h)', () => {
    const at = (hours: number) =>
      productosVidaResponse(META, [], Date.parse(GENERATED) + hours * HOUR)
    expect(at(12.2).stale).toBe(false)
    expect(at(13.1).stale).toBe(true)
    expect(productosVidaResponse(null, [], NOW).stale).toBe(false)
  })

  it('sin nada que leer devuelve la forma vacía', () => {
    expect(productosVidaResponse(null, [], NOW)).toEqual(PRODUCTOS_VIDA_EMPTY)
    expect(productosVidaResponse(undefined, undefined, NOW)).toEqual(PRODUCTOS_VIDA_EMPTY)
  })

  it('corte de 48 h por observedAt: 47 h se queda, 49 h se va aunque su día pase el prefiltro', () => {
    const band = { p25: 1000, median: 1300, p75: 1700, min: 900, n: 25 }
    const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * HOUR).toISOString()
    const res = productosVidaResponse(
      META,
      [
        item('calientacama', 'una-plaza', 1, band, [], iso(47)),
        item('lavavajillas', 'estandar', 2, band, [], iso(49)),
        { ...item('secarropas', 'tambor', 3, band, []), observedAt: null },
      ],
      NOW
    )
    expect(res.products.map(p => p.slug)).toEqual(['calientacama'])
  })

  it('las ofertas salen sólo de variantes con banda; la delgada sólo cuenta', () => {
    const banded = Array.from({ length: 6 }, (_, i) =>
      offer(`30000000${i}`, `Freidora Sin Aceite Nappo Digital ${5 + i}l`, 2900 + i * 100, 'UYU')
    )
    const res = productosVidaResponse(
      META,
      [
        item('freidora-de-aire', 'chica', 1, null, [
          offer('400000001', 'Freidora de aire repuesto canasto', 1, 'UYU'),
          offer('400000002', 'Freidora de aire 4l', 4139, 'USD', { priceUyu: 4139 * 100 }),
        ]),
        item('freidora-de-aire', 'mediana', 2, FREIDORA_BAND, banded),
        item('panificadora', 'estandar', 1, null, [
          offer('500000001', 'Panificadora Atma 1kg', 1, 'UYU'),
        ]),
      ],
      NOW
    )
    const freidora = res.products.find(p => p.slug === 'freidora-de-aire')!
    expect(freidora.offers).toHaveLength(4)
    expect(freidora.offers.every(o => o.variant === 'mediana')).toBe(true)
    expect(freidora.variants.find(v => v.id === 'chica')).toMatchObject({
      band: null,
      newOffers: 2,
    })
    const panificadora = res.products.find(p => p.slug === 'panificadora')!
    expect(panificadora.offers).toEqual([])
    expect(panificadora.variants).toHaveLength(1)
  })

  it('omite la variante sin banda y sin ofertas nuevas, y el producto que se queda sin variantes', () => {
    const res = productosVidaResponse(META, [item('kindle', 'premium', 3, null, [])], NOW)
    expect(res.products).toEqual([])
  })

  it('observedOn es el día de Montevideo y variant es el id de la variante', () => {
    const res = productosVidaResponse(
      { ...META, generatedAt: '2026-11-21T00:14:00Z' },
      [
        item(
          'freidora-de-aire',
          'grande',
          3,
          FREIDORA_BAND,
          [
            offer('1', 'Freidora Sin Aceite Nappo 8l', 2990, 'UYU', {
              observedAt: '2026-11-21T00:13:00Z',
            }),
          ],
          '2026-11-21T00:13:30Z'
        ),
      ],
      Date.parse('2026-11-21T00:20:00Z')
    )
    expect(res.products[0]!.offers[0]).toMatchObject({
      observedOn: '2026-11-20',
      variant: 'grande',
    })
  })

  it('«leído el» sólo cuando la variante quedó más de 6 h detrás de la última lectura', () => {
    const band = { p25: 1000, median: 1300, p75: 1700, min: 900, n: 25 }
    const gen = '2026-11-21T04:13:00Z'
    const res = productosVidaResponse(
      { ...META, generatedAt: gen },
      [
        item('calientacama', 'una-plaza', 1, band, [], '2026-11-21T00:13:00Z'),
        item('calientacama', 'dos-plazas', 2, band, [], '2026-11-20T20:13:00Z'),
      ],
      Date.parse('2026-11-21T04:20:00Z')
    )
    const [unaPlaza, dosPlazas] = res.products[0]!.variants
    expect(unaPlaza!.seenOn).toBeNull()
    expect(dosPlazas!.seenOn).toBe('20/11')
  })

  it('unavailable nunca lo pone el armado', () => {
    expect(productosVidaResponse(META, [], NOW).unavailable).toBe(false)
  })

  it('el presupuesto de tamaño: el peor caso escrito campo por campo entra en 72 000 bytes', () => {
    // Midió 67 775 bytes el 2026-11-20 (wf/vida/size_check3.js).
    const title = `${'a'.repeat(89)}…`
    const fixture: ProductosVidaResponse = {
      generatedAt: '2026-11-20T16:13:05.123Z',
      usdUyu: 40.12,
      listings: 2600,
      stale: false,
      unavailable: false,
      products: PRODUCTOS_VIDA_SLUGS.map(slug => ({
        slug,
        variants: Array.from({ length: 3 }, () => ({
          id: 'recortadora',
          label: 'l'.repeat(49),
          rank: 1,
          band: { p25: 123456, median: 234567, p75: 345678, n: 120 },
          newOffers: 8,
          seenOn: '20/11',
        })),
        offers: Array.from({ length: 4 }, () => ({
          title,
          url: 'u'.repeat(160),
          image: 'i'.repeat(75),
          price: 123456,
          currency: 'USD' as const,
          priceUyu: 4567890,
          seller: 's'.repeat(30),
          observedOn: '2026-11-20',
          variant: 'recortadora',
        })),
      })),
    }
    expect(fixture.products).toHaveLength(26)
    expect(Buffer.byteLength(JSON.stringify(fixture))).toBeLessThanOrEqual(72_000)
  })
})

describe('productosVidaShortTitle', () => {
  it('no toca un título corto y corta uno largo en un espacio, con «…»', () => {
    expect(productosVidaShortTitle('Calientacama 2 Plazas')).toBe('Calientacama 2 Plazas')
    const cut = productosVidaShortTitle('palabra '.repeat(30))
    expect(cut.length).toBeLessThanOrEqual(90)
    expect(cut).toMatch(/palabra…$/)
  })
})

describe('el puesto y los textos del conteo', () => {
  it('puesto de competencia con empates', () => {
    const ranks = productosVidaRanks([
      { slug: 'a', name: 'A', mentions: 4 },
      { slug: 'b', name: 'B', mentions: 4 },
      { slug: 'c', name: 'C', mentions: 4 },
      { slug: 'd', name: 'D', mentions: 3 },
      { slug: 'e', name: 'E', mentions: 3 },
      { slug: 'f', name: 'F', mentions: 1 },
    ])
    expect(ranks.map(r => r.rank)).toEqual([1, 1, 1, 4, 4, 6])
    expect(ranks[0]!.tiedWith).toEqual(['B', 'C'])
    expect(ranks[5]!.tiedWith).toEqual([])
  })

  it('en el catálogo real hay 15 empatados con una persona, la sartén entre ellos', () => {
    const ranks = productosVidaRanks(PRODUCTOS_VIDA_PRODUCTS)
    const last = ranks[ranks.length - 1]!
    expect(last.rank).toBe(12)
    expect(last.tiedWith).toHaveLength(14)
    expect(productosVidaTieText(last.tiedWith)).toBe(', puesto compartido con otros 14 productos')
    const sarten = ranks.find(r => r.slug === 'sarten-acero-inoxidable')!
    expect(sarten.rank).toBe(12)
  })

  it('el texto del empate con 1, 2 y 13 otros', () => {
    expect(productosVidaTieText(['Freidora de aire'])).toBe(
      ', puesto compartido con Freidora de aire'
    )
    expect(productosVidaTieText(['Lavavajillas', 'Secarropas'])).toBe(
      ', puesto compartido con Lavavajillas y Secarropas'
    )
    expect(productosVidaTieText(['Kindle', 'Isla'])).toBe(', puesto compartido con Kindle e Isla')
    expect(productosVidaTieText(Array.from({ length: 13 }, (_, i) => `P${i}`))).toBe(
      ', puesto compartido con otros 13 productos'
    )
    expect(productosVidaTieText([])).toBe('')
  })

  it('la bajada del catálogo real, con precios y sin ellos, en 160 caracteres o menos', () => {
    const withPrices = productosVidaLead(PRODUCTOS_VIDA_PRODUCTS, true)
    const without = productosVidaLead(PRODUCTOS_VIDA_PRODUCTS, false)
    expect(withPrices).toBe(
      'El calientacama, el lavavajillas y el secarropas los nombraron cuatro personas cada uno. Acá está cada producto con lo que piden por él en Mercado Libre.'
    )
    expect(without).toBe(
      'El calientacama, el lavavajillas y el secarropas los nombraron cuatro personas cada uno. Acá está cada producto con lo que conviene mirar antes de comprarlo.'
    )
    expect(withPrices.length).toBeLessThanOrEqual(160)
    expect(without.length).toBeLessThanOrEqual(160)
  })

  it('la gramática de la bajada', () => {
    expect(
      productosVidaLead(
        [
          { phrase: 'el freezer', mentions: 4 },
          { phrase: 'la pesa rusa', mentions: 1 },
        ],
        true
      )
    ).toMatch(/^El freezer lo nombraron cuatro personas\. /)
    expect(productosVidaLead([{ phrase: 'la panificadora', mentions: 3 }], true)).toMatch(
      /^La panificadora la nombraron tres personas\. /
    )
    expect(
      productosVidaLead(
        [
          { phrase: 'la panificadora', mentions: 2 },
          { phrase: 'las pesas', mentions: 2 },
        ],
        true
      )
    ).toMatch(/^La panificadora y las pesas las nombraron dos personas cada una\. /)
    expect(productosVidaLead([{ phrase: 'el kindle', mentions: 1 }], true)).toMatch(
      /^El kindle lo nombró una persona\. /
    )
  })

  it('el conteo de cada producto concuerda con su artículo', () => {
    expect(productosVidaCountLabel(4, 'el calientacama')).toBe('Lo nombraron 4 personas')
    expect(productosVidaCountLabel(3, 'la aspiradora robot')).toBe('La nombraron 3 personas')
    expect(productosVidaCountLabel(2, 'los tuppers de vidrio')).toBe('Los nombraron 2 personas')
    expect(productosVidaCountLabel(2, 'las pesas')).toBe('Las nombraron 2 personas')
    expect(productosVidaCountLabel(1, 'el Kindle')).toBe('Lo nombró 1 persona')
  })

  it('el texto de la búsqueda sale de la frase, sin artículo, nunca de searchQuery', () => {
    for (const entry of PRODUCTOS_VIDA_PRODUCTS) {
      const label = productosVidaSearchLabel(entry)
      expect(label.startsWith('Buscar ')).toBe(true)
      expect(label).not.toMatch(/^Buscar (el|la|los|las) /)
      expect(label.endsWith(' en Mercado Libre')).toBe(true)
    }
    const sarten = PRODUCTOS_VIDA_PRODUCTS.find(p => p.slug === 'sarten-acero-inoxidable')!
    expect(productosVidaSearchLabel(sarten)).toBe(
      'Buscar sartén de acero inoxidable en Mercado Libre'
    )
    expect(productosVidaSearchLabel(sarten)).not.toContain(sarten.searchQuery)
    const kindle = PRODUCTOS_VIDA_PRODUCTS.find(p => p.slug === 'kindle')!
    expect(productosVidaSearchLabel(kindle)).toBe('Buscar Kindle en Mercado Libre')
  })

  it('la URL de búsqueda de Mercado Libre', () => {
    expect(productosVidaMlSearchUrl('tupper vidrio hermetico')).toBe(
      'https://listado.mercadolibre.com.uy/tupper-vidrio-hermetico'
    )
  })
})

describe('los filtros', () => {
  it('estado y query van y vuelven; lo inválido es null', () => {
    const state = productosVidaStateFromQuery({ hasta: '5000', tipo: 'cocina' })
    expect(state).toEqual({ hasta: 5000, tipo: 'cocina' })
    expect(productosVidaQueryFromState(state)).toEqual({ hasta: '5000', tipo: 'cocina' })
    expect(productosVidaStateFromQuery(productosVidaQueryFromState(state))).toEqual(state)
    expect(productosVidaStateFromQuery({ hasta: '3000', tipo: 'jardin' })).toEqual({
      hasta: null,
      tipo: null,
    })
    expect(productosVidaStateFromQuery({ hasta: ['15000', '2000'] })).toEqual({
      hasta: 15000,
      tipo: null,
    })
    expect(productosVidaQueryFromState({ hasta: null, tipo: null })).toEqual({})
  })

  it('el href de cada filtro conserva el idioma de la ruta', () => {
    const base = '/en/productos-que-te-cambian-la-vida-uruguay'
    expect(productosVidaFilterHref(base, { hasta: null, tipo: null }, { hasta: 2000 })).toBe(
      '/en/productos-que-te-cambian-la-vida-uruguay?hasta=2000#lista'
    )
    expect(
      productosVidaFilterHref(base, { hasta: 2000, tipo: 'cocina' }, { hasta: null, tipo: null })
    ).toBe('/en/productos-que-te-cambian-la-vida-uruguay#lista')
  })
})

function product(
  slug: string,
  bands: Array<[string, number, number, number, number]>
): ProductosVidaProduct {
  return {
    slug,
    offers: [],
    variants: bands.map(([id, p25, median, p75, n], i) => ({
      id,
      label: `Variante ${id}`,
      rank: i + 1,
      band: { p25, median, p75, n },
      newOffers: 8,
      seenOn: null,
    })),
  }
}

describe('el presupuesto', () => {
  const calienta = product('calientacama', [
    ['una-plaza', 1100, 1340, 1700, 25],
    ['dos-plazas', 1300, 1680, 2400, 32],
    ['manta', 5000, 7261, 9000, 20],
  ])

  it('entra: la banda de más avisos cuya mediana entra', () => {
    expect(productosVidaFit(calienta, 2000)).toEqual({
      kind: 'entra',
      variantLabel: 'Variante dos-plazas',
      value: 1680,
    })
  })

  it('justo: el p25 entra y la mediana no', () => {
    expect(productosVidaFit(calienta, 1200)).toEqual({
      kind: 'justo',
      variantLabel: 'Variante una-plaza',
      value: 1100,
    })
  })

  it('fuera y sin banda', () => {
    expect(productosVidaFit(calienta, 1000).kind).toBe('fuera')
    expect(productosVidaFit(undefined, 2000).kind).toBe('sin-banda')
    const thin: ProductosVidaProduct = {
      slug: 'kindle',
      offers: [],
      variants: [
        { id: 'basico', label: 'Básico', rank: 1, band: null, newOffers: 3, seenOn: null },
      ],
    }
    expect(productosVidaFit(thin, 2000).kind).toBe('sin-banda')
  })

  it('un producto sin banda se ve con cualquier presupuesto; uno fuera no', () => {
    const entry = { group: 'dormir-y-clima' as const }
    for (const hasta of [2000, 5000, 15000] as const) {
      expect(productosVidaVisible(entry, undefined, { hasta, tipo: null })).toBe(true)
    }
    expect(productosVidaVisible(entry, calienta, { hasta: 2000, tipo: null })).toBe(true)
    const freezer = product('freezer', [['grande', 30000, 40000, 50000, 11]])
    expect(productosVidaVisible({ group: 'cocina' }, freezer, { hasta: 2000, tipo: null })).toBe(
      false
    )
    expect(
      productosVidaVisible({ group: 'cocina' }, freezer, { hasta: null, tipo: 'cocina' })
    ).toBe(true)
    expect(
      productosVidaVisible({ group: 'cocina' }, freezer, { hasta: null, tipo: 'tecnologia' })
    ).toBe(false)
  })

  it('sin ningún precio en la respuesta, el presupuesto se ignora', () => {
    const freezer = product('freezer', [['grande', 30000, 40000, 50000, 11]])
    expect(
      productosVidaVisible({ group: 'cocina' }, freezer, { hasta: 2000, tipo: null }, false)
    ).toBe(true)
  })

  it('las líneas del presupuesto', () => {
    expect(
      productosVidaFitLine({ kind: 'entra', variantLabel: 'X', value: 1680 }, 2000, false)
    ).toBe(`Entra: la mitad de los avisos nuevos sale $${NBSP}1.680 o menos.`)
    expect(
      productosVidaFitLine({ kind: 'justo', variantLabel: 'Una plaza', value: 1100 }, 1200, true)
    ).toBe(
      `Entra justo (Una plaza): al menos uno de cada cuatro avisos nuevos está por debajo de $${NBSP}1.200.`
    )
    expect(productosVidaFitLine({ kind: 'sin-banda' }, 2000, false)).toBeNull()
    expect(productosVidaFitLine({ kind: 'entra', value: 10 }, null, false)).toBeNull()
  })

  it('cuenta por tipo con el presupuesto de ahora', () => {
    const bySlug = new Map([
      ['calientacama', calienta],
      ['freezer', product('freezer', [['grande', 30000, 40000, 50000, 11]])],
    ])
    const entries = [
      { slug: 'calientacama', group: 'dormir-y-clima' as const },
      { slug: 'freezer', group: 'cocina' as const },
      { slug: 'kindle', group: 'tecnologia' as const },
    ]
    const counts = productosVidaTypeCounts(entries, bySlug, 2000)
    expect(counts.todos).toBe(2)
    expect(counts['dormir-y-clima']).toBe(1)
    expect(counts.cocina).toBe(0)
    expect(counts.tecnologia).toBe(1)
    expect(productosVidaTypeCounts(entries, bySlug, null).todos).toBe(3)
  })

  it('la línea de resultados', () => {
    expect(productosVidaResultLine(26, 0, { hasta: null, tipo: null })).toBe(
      '26 productos, del más nombrado al menos.'
    )
    expect(productosVidaResultLine(8, 0, { hasta: null, tipo: 'cocina' })).toBe(
      '8 productos de cocina.'
    )
    expect(productosVidaResultLine(7, 2, { hasta: 2000, tipo: null })).toBe(
      `5 productos entran con $${NBSP}2.000 o menos. Se muestran además 2 sin precio típico todavía. El número de cada uno es su puesto en el hilo.`
    )
    expect(productosVidaResultLine(1, 0, { hasta: 5000, tipo: 'cocina' })).toBe(
      `1 producto de cocina entra con $${NBSP}5.000 o menos. El número de cada uno es su puesto en el hilo.`
    )
  })
})

describe('la regla de precios', () => {
  it('2 décadas como mínimo y 5 como máximo', () => {
    const narrow = productosVidaRulerDomain([product('a', [['x', 1200, 1500, 1800, 10]])])
    expect([narrow.lo, narrow.hi]).toEqual([1000, 100000])
    const wide = productosVidaRulerDomain([
      product('a', [['x', 2, 5, 8, 10]]),
      product('b', [['y', 500000, 900000, 2000000, 10]]),
    ])
    expect([wide.lo, wide.hi]).toEqual([100, 10000000])
    expect(wide.ticks).toHaveLength(6)
  })

  it('rótulos: con 3 marcas todas; con más, las que están a distancia par de la última', () => {
    const labelled = (lo: number, hi: number) =>
      productosVidaRulerDomain([product('a', [['x', lo, lo, hi, 10]])])
        .ticks.map((tick, i) => (tick.label ? i : -1))
        .filter(i => i >= 0)
    expect(labelled(1200, 99000)).toEqual([0, 1, 2]) // 3 marcas
    expect(labelled(150, 99000)).toEqual([1, 3]) // 4 marcas: $ 1.000 y $ 100.000
    expect(labelled(15, 99000)).toEqual([0, 2, 4]) // 5 marcas
    expect(labelled(150, 9_900_000)).toEqual([1, 3, 5]) // 6 marcas
    const four = productosVidaRulerDomain([product('a', [['x', 150, 150, 99000, 10]])])
    expect(four.ticks.map(t => t.label)).toEqual([null, `$${NBSP}1.000`, null, `$${NBSP}100.000`])
  })

  it('posiciones con recorte y la mediana dentro de la banda', () => {
    const domain = { lo: 1000, hi: 100000 }
    expect(
      productosVidaRulerPositions({ p25: 1000, median: 10000, p75: 100000 }, domain, null)
    ).toEqual({
      from: 0,
      to: 100,
      mid: 50,
      cap: null,
    })
    const clamped = productosVidaRulerPositions(
      { p25: 10, median: 20, p75: 5_000_000 },
      domain,
      2000
    )
    expect(clamped.from).toBe(0)
    expect(clamped.to).toBe(100)
    expect(clamped.mid).toBe(0)
    expect(clamped.cap).toBe(15.1)
    const inside = productosVidaRulerPositions({ p25: 2000, median: 1500, p75: 3000 }, domain, null)
    expect(inside.mid).toBeGreaterThanOrEqual(inside.from)
    expect(inside.mid).toBeLessThanOrEqual(inside.to)
  })
})

describe('montos y fechas', () => {
  it('montos con espacio duro', () => {
    expect(productosVidaMoney(31270.4)).toBe(`$${NBSP}31.270`)
    expect(productosVidaUsd(845.06)).toBe(`USD${NBSP}845`)
  })

  it('un día YYYY-MM-DD se lee al mediodía y no se corre', () => {
    expect(productosVidaLongDate('2026-11-20')).toBe('20 de noviembre de 2026')
    expect(productosVidaShortDate('2026-11-20')).toBe('20/11')
    expect(productosVidaShortDate('2026-12-01')).toBe('01/12')
    expect(productosVidaShortDate('2026-12-09T15:00:00Z')).toBe('09/12')
    expect(productosVidaMontevideoDay('2026-11-20')).toBe('2026-11-20')
  })

  it('un instante se escribe en Montevideo', () => {
    const iso = '2026-11-21T00:13:00Z'
    expect(productosVidaLongDate(iso)).toBe('20 de noviembre de 2026')
    expect(productosVidaShortDate(iso)).toBe('20/11')
    expect(productosVidaDateTime(iso)).toBe('20/11 a las 21:13')
    expect(productosVidaMontevideoDay(iso)).toBe('2026-11-20')
    expect(productosVidaDateTime('2026-11-20')).toBe('')
  })

  it('el vendedor sin nombre de Mercado Libre', () => {
    expect(productosVidaSellerLabel('Mercado Libre')).toBe(
      'Vendedor sin identificar (Mercado Libre)'
    )
    expect(productosVidaSellerLabel('LOi')).toBe('LOi')
  })
})

describe('las preguntas frecuentes', () => {
  const full = productosVidaResponse(
    META,
    [
      item('freidora-de-aire', 'grande', 3, FREIDORA_BAND, [
        offer('1', 'Freidora Nappo 8l', 2990, 'UYU'),
      ]),
      item(
        'lavavajillas',
        'estandar',
        2,
        { p25: 25000, median: 31000, p75: 38000, min: 20000, n: 45 },
        []
      ),
      item(
        'secarropas',
        'tambor',
        3,
        { p25: 22000, median: 27000, p75: 40000, min: 18000, n: 28 },
        []
      ),
    ],
    NOW
  )
  const cases: Array<[string, ProductosVidaResponse]> = [
    ['con datos', full],
    ['sin datos', PRODUCTOS_VIDA_EMPTY],
    ['sin Mongo', { ...PRODUCTOS_VIDA_EMPTY, unavailable: true }],
  ]

  it.each(cases)('ninguna respuesta dice null, undefined, NaN ni %% (%s)', (_, response) => {
    const faq = productosVidaFaq(response)
    expect(faq).toHaveLength(7)
    for (const entry of faq) {
      expect(entry.answer).not.toMatch(/null|undefined|NaN|%/)
      expect(entry.answer.length).toBeGreaterThan(40)
    }
  })

  it('sin banda fresca no hay precio en la respuesta', () => {
    const faq = productosVidaFaq(PRODUCTOS_VIDA_EMPTY)
    expect(faq.find(f => f.id === 'vida-freidora')!.answer).not.toMatch(/\$/)
    expect(faq.find(f => f.id === 'vida-lavavajillas')!.answer).not.toMatch(/\$/)
    const withData = productosVidaFaq(full)
    expect(withData.find(f => f.id === 'vida-freidora')!.answer).toContain(`$${NBSP}4.139`)
    expect(withData.find(f => f.id === 'vida-lavavajillas')!.answer).toContain(
      'canilla tipo lavarropas'
    )
  })

  it('el Black Friday según la fecha de la lectura, nunca la del reloj', () => {
    const bf = (generatedAt: string | null) =>
      productosVidaFaq({ ...PRODUCTOS_VIDA_EMPTY, generatedAt }).find(
        f => f.id === 'vida-black-friday'
      )!
    expect(bf('2026-11-30T20:13:00Z').answer).toContain(
      'va del viernes 27 al lunes 30 de noviembre'
    )
    expect(bf('2026-12-01T12:13:00Z').answer).toContain(
      'fue del viernes 27 al lunes 30 de noviembre'
    )
    expect(bf(null).answer).toContain(
      'Las fechas del Black Friday 2026: del viernes 27 al lunes 30 de noviembre.'
    )
    expect(bf(null).link?.to).toBe('/ciberlunes-y-black-friday-uruguay')
  })

  it('la primera nombra a los más nombrados y la fecha del hilo', () => {
    const first = productosVidaFaq(PRODUCTOS_VIDA_EMPTY)[0]!
    expect(first.answer).toMatch(
      /^El calientacama, el lavavajillas y el secarropas, con cuatro personas cada uno\. Les siguen la aspiradora robot y la freidora de aire, con tres personas\./
    )
    expect(first.answer).toContain('19/11/2026')
    expect(first.answer).toContain('81 comentarios')
  })
})
