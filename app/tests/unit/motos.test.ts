// El motor de `/motos-usadas-uruguay`: filtros, orden, etiquetas y los textos calculados. Cada `it`
// afirma una REGLA del dominio con su porqué, no la implementación.
//
// El caso de referencia sale del backend real (`classes/motos/`, 2026-09-22): el catálogo publica
// una fila por AVISO con `priceUsd` ya convertido, la cilindrada sale del título y si no está queda
// en `null`, y una línea eléctrica tiene ficha propia (`<marca-modelo>-electrica`) porque su banda
// nunca se promedia con las de nafta. Medido ese día en MLU1763: 1.172 avisos de nafta, 35
// eléctricos, 2 híbridos, 1 diésel y 181 sin combustible declarado.

import { describe, expect, it } from 'vitest'
import {
  MOTOS_PER_PAGE,
  MOTO_DISPLACEMENT_BUCKETS,
  MOTO_REPORT_ID,
  MOTO_SLUG_RE,
  motoCilindradaAnswer,
  motoCoverageOf,
  motoDepreciacionAnswer,
  motoEmptyList,
  motoFichaSlug,
  motoFilterChips,
  motoFiltered,
  motoFreshFloor,
  motoKeyValid,
  motoKmLabel,
  motoMatch,
  motoMedian,
  motoModelName,
  motoMoney,
  motoNormalizeQuery,
  motoPrecioTipicoAnswer,
  motoQueryParams,
  motoQueryWithout,
  motoSortSpec,
  motoUsd,
  motoYearRange,
} from '../../utils/motos'
import type {
  MotoPublicCatalogMeta,
  MotoPublicListing,
  MotoPublicModel,
} from '../../utils/motosPublic'

function listing(over: Partial<MotoPublicListing> = {}): MotoPublicListing {
  return {
    key: 'ml-1',
    source: 'mercadolibre',
    sourceName: 'Mercado Libre',
    brand: 'Yumbo',
    brandSlug: 'yumbo',
    model: 'GS',
    modelSlug: 'gs',
    marketSlug: 'yumbo-gs',
    productKey: 'yumbo|gs|125',
    title: 'Yumbo GS 125 2020',
    year: 2020,
    km: 12_000,
    price: 95_000,
    currency: 'UYU',
    priceUsd: 2_300,
    priceConverted: true,
    currencyInferred: false,
    displacement: 125,
    displacementBasis: 'title',
    type: 'calle',
    typeBasis: 'mercadolibre',
    fuel: 'nafta',
    department: 'Montevideo',
    neighborhood: null,
    sellerType: 'private',
    picture: null,
    pictureCount: 3,
    permalink: 'https://articulo.mercadolibre.com.uy/MLU-1',
    firstSeen: '2026-09-10',
    lastSeen: '2026-09-22',
    priceDrop: null,
    flags: [],
    ...over,
  }
}

function model(over: Partial<MotoPublicModel> = {}): MotoPublicModel {
  return {
    version: 1,
    slug: 'yumbo-gs',
    brand: 'Yumbo',
    brandSlug: 'yumbo',
    model: 'GS',
    modelSlug: 'gs',
    generatedAt: '2026-09-22',
    listings: 24,
    propulsion: 'combustion',
    band: { n: 20, sellers: 17, p25: 1_800, median: 2_300, p75: 2_900, kmMedian: 14_000 },
    years: [
      { year: 2022, n: 6, sellers: 6, p25: 2_600, median: 2_900, p75: 3_200, kmMedian: 6_000 },
      { year: 2020, n: 8, sellers: 7, p25: 2_000, median: 2_300, p75: 2_600, kmMedian: 14_000 },
      { year: 2018, n: 6, sellers: 5, p25: 1_500, median: 1_700, p75: 1_950, kmMedian: 26_000 },
    ],
    displacements: [
      {
        displacement: 125,
        n: 14,
        sellers: 12,
        p25: 1_700,
        median: 2_000,
        p75: 2_400,
        kmMedian: null,
      },
      {
        displacement: 200,
        n: 6,
        sellers: 5,
        p25: 2_600,
        median: 3_000,
        p75: 3_400,
        kmMedian: null,
      },
    ],
    annualDrop: 12.4,
    types: [{ type: 'calle', adverts: 18 }],
    ...over,
  }
}

const META: MotoPublicCatalogMeta = {
  id: 'uy-motos',
  generatedAt: '2026-09-22',
  freshDays: 5,
  sourceCoverage: 'partial',
  listings: 1391,
  usdUyu: 41.2,
  lastFullReadAt: '2026-09-22',
  lastReadAt: '2026-09-22',
  reportedTotal: 1500,
  withoutDisplacement: 181,
  // Los que no entran en NINGÚN tramo: ni cilindrada en el título ni tramo declarado por el
  // origen. Siempre es menor o igual que el de arriba, y es el que la página muestra.
  withoutDisplacementBand: 42,
  models: [{ slug: 'yumbo-gs', brand: 'Yumbo', model: 'GS', listings: 24 }],
  sources: [
    {
      source: 'mercadolibre',
      name: 'Mercado Libre',
      listings: 1391,
      duplicates: 0,
      lastReadAt: '2026-09-22',
      ok: true,
    },
  ],
}

describe('motoNormalizeQuery', () => {
  it('da vuelta un rango de años escrito al revés en vez de devolver cero filas', () => {
    expect(motoNormalizeQuery({ anioDesde: '2020', anioHasta: '2015' })).toMatchObject({
      anioDesde: 2015,
      anioHasta: 2020,
    })
  })

  it('ignora un tramo de cilindrada que no existe', () => {
    expect(motoNormalizeQuery({ cilindrada: '1000-2000' }).cilindrada).toBe('')
    expect(motoNormalizeQuery({ cilindrada: '126-250' }).cilindrada).toBe('126-250')
  })

  it('ignora un tipo o un combustible que el catálogo no publica', () => {
    // La taxonomía de tipo es la de Mercado Libre: no se acepta una inventada del lado de la URL.
    expect(motoNormalizeQuery({ tipo: 'monster' }).tipo).toBe('')
    expect(motoNormalizeQuery({ tipo: 'scooter' }).tipo).toBe('scooter')
    expect(motoNormalizeQuery({ combustible: 'nuclear' }).combustible).toBe('')
    expect(motoNormalizeQuery({ combustible: 'electrica' }).combustible).toBe('electrica')
  })

  it('el tope de precio es en dólares y no tiene una variante en pesos', () => {
    // El catálogo guarda cada aviso en su moneda y el job publica `priceUsd`: hay UNA escala
    // comparable y el filtro va sobre ella. Un tope "en pesos" sobre una mezcla no significa nada.
    const query = motoNormalizeQuery({ precioMaxUsd: '2500' })
    expect(query.precioMaxUsd).toBe(2500)
    expect('precioMax' in query).toBe(false)
  })

  it('no emite los filtros vacíos en la URL', () => {
    expect(motoQueryParams(motoNormalizeQuery({}))).toEqual({})
    expect(motoQueryParams(motoNormalizeQuery({ marca: 'yumbo', page: '3' }))).toEqual({
      marca: 'yumbo',
      page: '3',
    })
  })

  it('reordenar no es filtrar: el orden solo no saca la página del índice', () => {
    expect(motoFiltered(motoNormalizeQuery({ sort: 'price_asc' }))).toBe(false)
    expect(motoFiltered(motoNormalizeQuery({ marca: 'yumbo' }))).toBe(true)
  })
})

describe('motoQueryWithout', () => {
  it('sacar la marca saca el modelo: un modelo huérfano no se puede volver a encontrar', () => {
    const query = motoNormalizeQuery({ marca: 'yumbo', modelo: 'yumbo-gs' })
    expect(motoQueryWithout(query, ['marca'])).toMatchObject({ marca: '', modelo: '' })
  })

  it('vuelve siempre a la página 1', () => {
    expect(
      motoQueryWithout(motoNormalizeQuery({ tipo: 'scooter', page: '7' }), ['tipo']).page
    ).toBe(1)
  })
})

describe('motoFilterChips', () => {
  it('usa la etiqueta del facet y no el slug crudo', () => {
    const chips = motoFilterChips(motoNormalizeQuery({ marca: 'yumbo' }), {
      brands: [{ value: 'yumbo', label: 'Yumbo', count: 24 }],
      models: [],
      departments: [],
      types: [],
      fuels: [],
      sellers: [],
    })
    expect(chips[0]!.label).toBe('Yumbo')
  })

  it('el chip de precio dice la unidad', () => {
    const chips = motoFilterChips(motoNormalizeQuery({ precioMaxUsd: '2500' }))
    expect(chips[0]!.label).toContain('USD')
  })
})

describe('motoMatch', () => {
  it('un aviso sin cilindrada Y sin tramo no cumple ningún tramo de cilindrada', () => {
    // Las dos vías: la cilindrada exacta del título cuando está, y el tramo que declaró el propio
    // Mercado Libre cuando no. `$gte/$lte` y la igualdad excluyen `null` por definición, así que un
    // aviso sin ninguna de las dos no entra — la cilindrada no se infiere nunca del modelo.
    const match = motoMatch(motoNormalizeQuery({ cilindrada: 'hasta-125' }), '2026-09-22', 5)
    expect(match.$or).toEqual([
      { displacement: { $gte: 0, $lte: 125 } },
      { displacementBand: 'hasta-125' },
    ])
  })

  it('el tope de precio va sobre el precio convertido, nunca sobre el del aviso', () => {
    // Filtrar por `price` mezclaría escalas: 95.000 pesos y 2.300 dólares son la misma moto.
    const match = motoMatch(motoNormalizeQuery({ precioMaxUsd: '2500' }), '2026-09-22', 5)
    expect(match.priceUsd).toEqual({ $lte: 2500 })
    expect(match.price).toBeUndefined()
  })

  it('la ventana de frescura es la que publica la corrida, no una constante del app', () => {
    // Si el app tuviera su propio número, listaría avisos que el job ya dejó de contar (o al revés)
    // y nadie lo notaría.
    expect(motoMatch(motoNormalizeQuery({}), '2026-09-22', 5).lastSeen).toEqual({
      $gte: '2026-09-17',
    })
    expect(motoFreshFloor('2026-01-03', 7)).toBe('2025-12-27')
  })

  it('filtra por marca, departamento, tipo, motor y vendedor con los campos del catálogo', () => {
    const match = motoMatch(
      motoNormalizeQuery({
        marca: 'yumbo',
        modelo: 'yumbo-gs',
        departamento: 'Salto',
        tipo: 'scooter',
        combustible: 'electrica',
        vendedor: 'dealer',
      }),
      '2026-09-22',
      5
    )
    expect(match).toMatchObject({
      brandSlug: 'yumbo',
      marketSlug: 'yumbo-gs',
      department: 'Salto',
      type: 'scooter',
      fuel: 'electrica',
      sellerType: 'dealer',
    })
  })
})

describe('motoSortSpec', () => {
  it('ordena el precio en dólares: por `price` pondría primero cualquier aviso en pesos', () => {
    expect(motoSortSpec('price_asc')).toEqual({ priceUsd: 1, year: -1 })
  })

  it('cae en frescura ante un orden desconocido', () => {
    expect(motoSortSpec('recent')).toEqual({ lastSeen: -1, firstSeen: -1 })
  })
})

describe('motoKeyValid / motoFichaSlug', () => {
  it('rechaza la clave reservada del informe: no es una ficha de modelo', () => {
    expect(motoKeyValid(MOTO_REPORT_ID)).toBe(false)
    expect(motoKeyValid('yumbo-gs')).toBe(true)
  })

  it('rechaza cualquier cosa que no tenga forma de slug', () => {
    expect(MOTO_SLUG_RE.test('yumbo-gs-125')).toBe(true)
    expect(motoKeyValid('../../etc')).toBe(false)
    expect(motoKeyValid('Yumbo-GS')).toBe(false)
  })

  it('un aviso eléctrico enlaza a SU ficha, que es otra', () => {
    // Si enlazara a `marca-modelo` a secas, un fabricante que sólo vende esa línea en eléctrico
    // daría 404 y uno que vende las dos llevaría a la ficha equivocada.
    expect(motoFichaSlug(listing())).toBe('yumbo-gs')
    expect(motoFichaSlug(listing({ fuel: 'electrica' }))).toBe('yumbo-gs-electrica')
  })
})

describe('etiquetas', () => {
  it('el monto lleva espacio duro para que el celular no lo parta en dos líneas', () => {
    expect(motoMoney(95_000)).toBe('$\u00A095.000')
    expect(motoUsd(2_300)).toBe('USD\u00A02.300')
  })

  it('sin kilómetros dice "no informado", nunca cero', () => {
    // El job ya tiró los rellenos (1, 111.111…); publicar un 0 los volvería a inventar.
    expect(motoKmLabel(null)).toBe('km no informado')
    expect(motoKmLabel(0)).toBe('0 km')
    expect(motoKmLabel(12_000)).toBe('12.000 km')
  })

  it('el nombre dice "eléctrica" cuando la ficha lo es', () => {
    expect(motoModelName(model())).toBe('Yumbo GS')
    expect(motoModelName(model({ propulsion: 'electrica' }))).toBe('Yumbo GS eléctrica')
  })

  it('los tramos de cilindrada cubren el rango sin huecos', () => {
    const sorted = [...MOTO_DISPLACEMENT_BUCKETS].sort((a, b) => a.min - b.min)
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index]!.min).toBe(sorted[index - 1]!.max + 1)
    }
  })
})

describe('motoCoverageOf', () => {
  it('recorta la meta y conserva la ventana de frescura de la corrida', () => {
    const coverage = motoCoverageOf(META)
    expect(coverage).toMatchObject({ freshDays: 5, listings: 1391, withoutDisplacement: 181 })
    expect(coverage!.models).toHaveLength(1)
  })

  it('sin meta no inventa una cobertura', () => {
    expect(motoCoverageOf(null)).toBeNull()
  })
})

describe('motoYearRange', () => {
  it('el año más barato y el más caro salen de la MEDIANA, no del año', () => {
    // Una moto más vieja no siempre es la más barata (una edición, otra cilindrada bajo el mismo
    // nombre), y lo que la ficha afirma es el precio, no la antigüedad.
    const range = motoYearRange(model())
    expect(range!.cheapest.year).toBe(2018)
    expect(range!.dearest.year).toBe(2022)
  })

  it('sin bandas por año no hay rango que afirmar', () => {
    expect(motoYearRange(model({ years: [] }))).toBeNull()
  })
})

describe('textos calculados', () => {
  it('se abstiene de publicar una mediana cuando no hay avisos', () => {
    const answer = motoPrecioTipicoAnswer([], motoCoverageOf(META))
    expect(answer).toContain('Todavía no relevamos')
    expect(answer).not.toMatch(/USD/)
  })

  it('dice que son precios pedidos y con qué fecha', () => {
    const answer = motoPrecioTipicoAnswer(
      [listing(), listing({ priceUsd: 2_700 })],
      motoCoverageOf(META)
    )
    expect(answer).toContain('PEDIDOS')
    expect(answer).toContain('setiembre')
  })

  it('la respuesta de depreciación se abstiene donde se abstiene el job', () => {
    // `annualDrop: null` es la negativa del backend a publicar una pendiente sin curva. Acá no se
    // inventa una: se dice.
    expect(motoDepreciacionAnswer(model({ annualDrop: null }))).toContain('no podemos medir')
    expect(motoDepreciacionAnswer(model())).toContain('12,4 %')
    expect(motoDepreciacionAnswer(null)).toContain('Todavía no publicamos')
  })

  it('la respuesta de cilindrada declara cuántos avisos no la dicen', () => {
    // Sin esa cifra, "no aparece en ningún tramo" se lee como "no existe".
    const answer = motoCilindradaAnswer([listing()], motoCoverageOf(META))
    expect(answer).toContain('42')
    expect(answer).toContain('nunca la inferimos del modelo')
    expect(motoCilindradaAnswer([], null)).toContain('Todavía no relevamos')
  })
})

describe('contrato de la respuesta vacía', () => {
  it('dice POR QUÉ está vacía', () => {
    // Tres cosas distintas: el job todavía no corrió, la base no contestó, o leímos y no hay nada.
    expect(motoEmptyList(motoNormalizeQuery({})).status).toBe('preparing')
    expect(motoEmptyList(motoNormalizeQuery({}), 'unavailable').status).toBe('unavailable')
  })

  it('conserva la página pedida para que el paginador no salte a 1 sin motivo', () => {
    expect(motoEmptyList(motoNormalizeQuery({ page: '4' })).page).toBe(4)
    expect(motoEmptyList(motoNormalizeQuery({})).perPage).toBe(MOTOS_PER_PAGE)
  })
})

describe('motoMedian', () => {
  it('la mediana de un par es el promedio de los dos del medio', () => {
    expect(motoMedian([10, 20, 30, 40])).toBe(25)
    expect(motoMedian([])).toBe(0)
  })
})
