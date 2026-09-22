import { describe, expect, it } from 'vitest'
import {
  publicSeries,
  rentalAdvertId,
  PRICE_HISTORY_ID_MAX,
  PRICE_HISTORY_TOTAL_MAX,
} from '../../server/utils/priceHistory'
import type { PriceHistorySeries } from '../../utils/priceHistory'

// `carlistings` y `marketpricelogs` son colecciones PRIVADAS: la primera guarda descripciones,
// vendedores y teléfonos; la segunda, el id con el que se cruzan avisos. De ellas sale sólo la serie
// del aviso que el lector está mirando. `publicSeries` es el único armador de lo que cruza la red, y
// este test es el que se rompe si alguien le agrega un campo de adentro.
const SERIES_FIELDS = [
  'changePct',
  'currency',
  'currencySwitched',
  'firstSeen',
  'id',
  'lastChange',
  'lastSeen',
  'points',
]

describe('publicSeries', () => {
  it('publica exactamente los campos de la serie', () => {
    const series = {
      id: 'ml-MLU1',
      currency: 'USD',
      points: [{ d: '2026-09-17', p: 12490 }],
      firstSeen: '2026-09-17',
      lastSeen: '2026-09-22',
      changePct: null,
      lastChange: null,
      currencySwitched: false,
    } as PriceHistorySeries
    expect(Object.keys(publicSeries(series)).sort()).toEqual(SERIES_FIELDS)
  })

  it('no deja pasar un campo privado del documento de origen', () => {
    const contaminated = {
      id: 'ml-MLU2',
      currency: 'UYU',
      points: [
        { d: '2026-09-17', p: 30000, c: 'UYU', internalNote: 'privado' },
        { d: '2026-09-22', p: 27000 },
      ],
      firstSeen: '2026-09-17',
      lastSeen: '2026-09-22',
      changePct: -10,
      lastChange: { from: 30000, to: 27000, at: '2026-09-22', sellerPhone: '099...' },
      currencySwitched: false,
      // Lo que vive al lado en las colecciones privadas.
      detail: { description: 'texto del vendedor', phone: '099...' },
      sellerKey: 'automotora',
      advertId: 'infocasas:1',
      title: 'Chevrolet Onix',
    } as unknown as PriceHistorySeries
    const published = publicSeries(contaminated) as Record<string, any>
    expect(Object.keys(published).sort()).toEqual(SERIES_FIELDS)
    expect(Object.keys(published.points[0]).sort()).toEqual(['d', 'p'])
    expect(Object.keys(published.lastChange).sort()).toEqual(['at', 'from', 'to'])
  })
})

describe('rentalAdvertId', () => {
  it('no duplica el prefijo de la fuente', () => {
    expect(rentalAdvertId('mercadolibre', 'mercadolibre:MLU700182597')).toBe(
      'mercadolibre:MLU700182597'
    )
    expect(rentalAdvertId('infocasas', '194137043')).toBe('infocasas:194137043')
  })

  it('devuelve null sin fuente o sin aviso', () => {
    expect(rentalAdvertId('', 'MLU1')).toBeNull()
    expect(rentalAdvertId('mercadolibre', '')).toBeNull()
    expect(rentalAdvertId(undefined, null)).toBeNull()
  })
})

describe('los topes de ids', () => {
  it('piden por tandas, y el total sigue siendo el de una página', () => {
    expect(PRICE_HISTORY_ID_MAX).toBe(60)
    expect(PRICE_HISTORY_TOTAL_MAX).toBe(300)
  })
})
