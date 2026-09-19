import { describe, expect, it } from 'vitest'
import {
  PRECIOS_HUB_STORES_PER_DEPT,
  preciosCapRankedStores,
  preciosHubPayload,
} from '../../server/utils/preciosHubProjection'

const ranked = (storeId: number, department: string, ratio: number) => ({
  storeId,
  storeName: `Local ${storeId}`,
  department,
  chain: 'Cadena',
  address: 'Calle 1',
  ratio,
  coverage: 0.7272727272727273,
})

describe('preciosCapRankedStores', () => {
  it('se queda con los primeros N de cada departamento, en el orden del backend', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, i) => ranked(i + 1, 'Montevideo', 0.8 + i / 100)),
      ranked(100, 'Salto', 0.95),
    ]
    const out = preciosCapRankedStores(rows)
    expect(out.filter(row => row.department === 'Montevideo')).toHaveLength(
      PRECIOS_HUB_STORES_PER_DEPT
    )
    expect(out.find(row => row.department === 'Salto')?.storeId).toBe(100)
    expect(out[0].storeId).toBe(1)
  })

  it('redondea para no mandar 16 decimales por fila', () => {
    const [row] = preciosCapRankedStores([ranked(1, 'Canelones', 0.8712618640112028)])
    expect(row.ratio).toBe(0.8713)
    expect(row.coverage).toBe(0.7273)
  })

  it('un documento viejo sin el campo, o una fila rota, no rompen la página', () => {
    expect(preciosCapRankedStores(undefined)).toEqual([])
    expect(preciosCapRankedStores([null, { storeId: 1, ratio: 'x' }])).toEqual([])
  })
})

describe('preciosHubPayload', () => {
  it('pasa el catálogo y recorta sólo la lista larga de la canasta', () => {
    const basket = {
      day: '2026-09-20',
      qualifiedStores: 356,
      scopes: [{ scope: 'dept:Montevideo', median: 0.97, stores: 173, qualified: true }],
      cheapestStores: [{ storeId: 1 }],
      rankedStores: Array.from({ length: 40 }, (_, i) =>
        ranked(i + 1, 'Montevideo', 0.8 + i / 1000)
      ),
    }
    const out = preciosHubPayload(
      { day: '2026-09-20', count: 1, articles: [{ articleId: 2 }] },
      basket
    )
    expect(out.articles).toEqual([{ articleId: 2 }])
    expect(out.basket?.scopes).toEqual(basket.scopes)
    expect(out.basket?.cheapestStores).toEqual([{ storeId: 1 }])
    expect(out.basket?.rankedStores).toHaveLength(PRECIOS_HUB_STORES_PER_DEPT)
  })

  it('sin canasta del día, basket es null; sin catálogo, la forma vacía', () => {
    expect(preciosHubPayload(null, { day: null })).toEqual({
      day: null,
      count: 0,
      articles: [],
      basketMeta: null,
      basket: null,
    })
  })
})
