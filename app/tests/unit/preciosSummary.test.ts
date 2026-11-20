import { describe, expect, it } from 'vitest'
import reading from './fixtures/precios-basket-2026-11-19.json'
import {
  PRECIOS_ARCHIVE_SINCE,
  preciosBasketCostSentence,
  preciosChainLabel,
  preciosChainsSentence,
  preciosCheapestSentence,
  preciosDayLabel,
  preciosDecimal,
  preciosDeptsSentence,
  preciosHubSummary,
  preciosLevelText,
  preciosMontevideoSentence,
  preciosPesos,
  preciosScopeExtremes,
  preciosStoreLabel,
  preciosStoreWithAddress,
  preciosWorkedExample,
} from '../../utils/preciosSummary'

// `reading` es la respuesta de GET /api/precios del 2026-11-19, recortada a lo que el resumen lee
// (todos los ámbitos, los tres locales más baratos del país y los locales por departamento).
const payload = reading as any

describe('formatos', () => {
  it('la fecha se lee del texto, sin Date', () => {
    expect(preciosDayLabel('2026-11-19')).toBe('19/11/2026')
    expect(preciosDayLabel(PRECIOS_ARCHIVE_SINCE)).toBe('07/09/2026')
    expect(preciosDayLabel('2026-9-1')).toBe('')
    expect(preciosDayLabel(undefined)).toBe('')
  })

  it('decimales y pesos con la notación uruguaya', () => {
    expect(preciosDecimal(8.4)).toBe('8,4')
    expect(preciosDecimal(16.666)).toBe('16,7')
    expect(preciosDecimal(3)).toBe('3,0')
    expect(preciosPesos(9535.6)).toBe('$ 9.536')
    expect(preciosPesos(1527)).toBe('$ 1.527')
    expect(preciosPesos(4996.6)).toBe('$ 4.997')
    expect(preciosPesos(812)).toBe('$ 812')
    expect(preciosPesos(1234567.4)).toBe('$ 1.234.567')
    expect(preciosPesos(Number.NaN)).toBe('')
  })

  it('el nivel de precios contra la mediana', () => {
    expect(preciosLevelText(0.913638024415406)).toBe('8,6 % bajo la mediana')
    expect(preciosLevelText(1.0124331178671946)).toBe('1,2 % sobre la mediana')
    expect(preciosLevelText(1.004)).toBe('como la mediana')
    expect(preciosLevelText(0.9951)).toBe('como la mediana')
    expect(preciosLevelText(null)).toBe('')
    expect(preciosLevelText(Number.NaN)).toBe('')
  })
})

describe('nombres de cadenas y locales', () => {
  const ranked = payload.basket.rankedStores

  it('la cadena con el nombre que publica un local suyo', () => {
    expect(preciosChainLabel('TA - TA', ranked)).toBe('Ta - Ta')
    expect(preciosChainLabel('MACROMERCADO', ranked)).toBe('Macromercado')
    expect(preciosChainLabel('SUPERMERCADO ITALIA', ranked)).toBe('Supermercado Italia')
  })

  it('sin un local entre los publicados, el nombre del ámbito en tipo título', () => {
    expect(preciosChainLabel('TIENDA INGLESA', ranked)).toBe('Tienda Inglesa')
    expect(preciosChainLabel('DEVOTO EXPRESS', ranked)).toBe('Devoto Express')
    expect(preciosChainLabel('SUPER TICO', [])).toBe('Super Tico')
  })

  it('el local: la sucursal sólo cuando agrega algo', () => {
    expect(preciosStoreLabel('La Pañalera- Suc. La Pañalera')).toBe('La Pañalera')
    expect(preciosStoreLabel('Supermercado La Casona- Suc.')).toBe('Supermercado La Casona')
    expect(preciosStoreLabel('El Dorado- Suc. Melo - Herrera y Muniz')).toBe(
      'El Dorado (Melo - Herrera y Muniz)'
    )
    expect(preciosStoreLabel('Ta - Ta - Suc. Fondar (Trinidad)')).toBe('Ta - Ta, Fondar (Trinidad)')
    expect(preciosStoreLabel('Expres Molino- Suc.')).toBe('Expres Molino')
    expect(preciosStoreLabel('Supermercado  Italia')).toBe('Supermercado Italia')
  })

  it('con la dirección, sin paréntesis anidados', () => {
    expect(
      preciosStoreWithAddress({
        storeName: 'Supermercado Unicentro- Suc. Supermercado Unicentro',
        address: 'Veraguas  1907',
      })
    ).toBe('Supermercado Unicentro (Veraguas 1907)')
    expect(
      preciosStoreWithAddress({
        storeName: 'Red Market- Suc. Nº 10 - Grias',
        address: 'Lezica 6309',
      })
    ).toBe('Red Market (Nº 10 - Grias), Lezica 6309')
    expect(preciosStoreWithAddress({ storeName: 'Frigorey- Suc. Frigorey' })).toBe('Frigorey')
  })
})

describe('preciosScopeExtremes con la lectura del 2026-11-19', () => {
  it('departamentos: Canelones y Durazno empatan abajo; arriba Tacuarembó y NO Paysandú', () => {
    const depts = preciosScopeExtremes(payload.basket.scopes, 'dept:')!
    expect(depts.ranked).toBe(13)
    expect(depts.total).toBe(19)
    expect(depts.lowest.names).toEqual(['Canelones', 'Durazno'])
    expect(depts.lowest.ratio).toBe(0.9264155932459488)
    expect(depts.lowest.stores).toEqual([57, 5])
    // Paysandú tiene la mediana más alta del día (1,01506) pero con 4 locales: no califica y no
    // se nombra.
    expect(depts.highest.names).toEqual(['Tacuarembó'])
    expect(depts.highest.ratio).toBeCloseTo(1.01504, 5)
    expect(depts.highest.stores).toEqual([6])
  })

  it('cadenas: de Macromercado (8) a Ta - Ta (84)', () => {
    const chains = preciosScopeExtremes(payload.basket.scopes, 'chain:')!
    expect(chains.ranked).toBe(10)
    expect(chains.lowest.names).toEqual(['MACROMERCADO'])
    expect(chains.lowest.stores).toEqual([8])
    expect(chains.highest.names).toEqual(['TA - TA'])
    expect(chains.highest.stores).toEqual([84])
  })

  it('sin ámbitos calificados no hay extremos', () => {
    expect(preciosScopeExtremes([], 'dept:')).toBeNull()
    expect(
      preciosScopeExtremes(
        [{ scope: 'dept:Artigas', median: 1, stores: 1, qualified: false }],
        'dept:'
      )
    ).toBeNull()
    expect(preciosScopeExtremes(undefined as any, 'chain:')).toBeNull()
  })
})

describe('preciosHubSummary: el texto publicado del 2026-11-19', () => {
  const summary = preciosHubSummary(payload)

  it('arma cada parte', () => {
    expect(summary.dayLabel).toBe('19/11/2026')
    expect(summary.nationalRatio).toBeCloseTo(0.97205, 5)
    expect(summary.cheapestStore).toMatchObject({
      label: 'La Pañalera',
      department: 'Colonia',
      coveragePct: 73,
      itemsDeclared: 24,
      items: 33,
    })
    expect(summary.cheapestStore!.referenceCost).toBeCloseTo(4996.6, 1)
  })

  it('las frases', () => {
    expect(preciosChainsSentence(summary.chains)).toBe(
      'entre las 10 cadenas con 5 o más locales comparables, el nivel va de 8,6 % bajo la mediana (Macromercado, 8 locales) a 1,2 % sobre la mediana (Ta - Ta, 84 locales).'
    )
    expect(preciosDeptsSentence(summary.depts)).toBe(
      'de los 13 con muestra, los más baratos son Canelones y Durazno (7,4 % bajo la mediana) y el más caro Tacuarembó (1,5 % sobre la mediana).'
    )
    expect(preciosMontevideoSentence(summary.montevideo)).toBe(
      '175 locales comparables, 2,6 % bajo la mediana. El de nivel más bajo es Supermercado Unicentro (Veraguas 1907), 12,1 % bajo la mediana.'
    )
    expect(preciosCheapestSentence(summary.cheapestStore)).toBe(
      'La Pañalera, en Colonia, 16,7 % bajo la mediana, con precio vigente para el 73 % de la canasta.'
    )
    expect(preciosBasketCostSentence(summary.basketCost)).toBe(
      'sus 33 artículos cuestan $ 9.536 a precio mediano del país.'
    )
    expect(preciosWorkedExample(summary.cheapestStore)).toBe(
      'La Pañalera tiene precio vigente para 24 de los 33 artículos. Por esos 24, en las cantidades de la canasta, cobra $ 4.160; a la mediana del país costarían $ 4.997. Su nivel: 16,7 % bajo la mediana.'
    )
  })

  it('una cadena sola no arma un rango', () => {
    const single = preciosHubSummary({
      day: '2026-11-19',
      basket: {
        day: '2026-11-19',
        scopes: [{ scope: 'chain:DISCO', median: 0.97436, stores: 29, qualified: true }],
        rankedStores: [],
      },
    }).chains
    expect(preciosChainsSentence(single)).toBe(
      'una sola cadena tiene 5 o más locales comparables: Disco, 29 locales, 2,6 % bajo la mediana.'
    )
  })

  it('un total parcial lo dice', () => {
    expect(
      preciosBasketCostSentence({ total: 9000, itemsPriced: 32, items: 33, food: 0, nonFood: 0 })
    ).toBe(
      '32 de sus 33 artículos tienen precio en esta lectura y suman $ 9.000 a precio mediano del país (total parcial).'
    )
  })

  it('sin lectura, todo vacío y sin excepciones', () => {
    for (const empty of [
      null,
      undefined,
      {},
      { day: '2026-11-19', basket: null },
      { basket: {} },
    ]) {
      const out = preciosHubSummary(empty as any)
      expect(out.chains).toBeNull()
      expect(out.depts).toBeNull()
      expect(out.montevideo).toBeNull()
      expect(out.cheapestStore).toBeNull()
      expect(out.basketCost).toBeNull()
      expect(out.nationalRatio).toBeNull()
      expect(preciosChainsSentence(out.chains)).toBe('')
      expect(preciosDeptsSentence(out.depts)).toBe('')
      expect(preciosMontevideoSentence(out.montevideo)).toBe('')
      expect(preciosCheapestSentence(out.cheapestStore)).toBe('')
      expect(preciosBasketCostSentence(out.basketCost)).toBe('')
      expect(preciosWorkedExample(out.cheapestStore)).toBe('')
    }
  })

  it('Montevideo sin muestra suficiente no se publica', () => {
    const thin = {
      ...payload,
      basket: {
        ...payload.basket,
        scopes: payload.basket.scopes.map((s: any) =>
          s.scope === 'dept:Montevideo' ? { ...s, qualified: false } : s
        ),
      },
    }
    expect(preciosHubSummary(thin).montevideo).toBeNull()
  })
})
