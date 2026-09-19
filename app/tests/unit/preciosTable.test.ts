import { describe, expect, it } from 'vitest'
import fixture from './fixtures/precios-articles-2026-09-14.json'
import type { PreciosArticleRow, PreciosStoreRow } from '../../utils/preciosCatalog'
import {
  PRECIOS_ARTICLE_TABLE_DEFAULTS,
  preciosArticleQueryFromState,
  preciosArticleStateFromQuery,
  preciosBestPerUnitInGroup,
  preciosCategory,
  preciosCategoryCounts,
  preciosCheapestRankable,
  preciosFilterArticles,
  preciosFilterStoreRows,
  preciosMatchesQuery,
  preciosSavings,
  preciosSortArticles,
  preciosSortBy,
  preciosSortRankedStores,
  preciosSortStoreRows,
  preciosStoreQueryFromState,
  preciosStoreStateFromQuery,
  preciosWithDistance,
  PRECIOS_STORE_FILTER_DEFAULTS,
} from '../../utils/preciosTable'

const articles = (fixture as { articles: PreciosArticleRow[] }).articles

const article = (over: Partial<PreciosArticleRow>): PreciosArticleRow => ({
  articleId: 1,
  name: 'Artículo',
  n: 100,
  ...over,
})

const store = (over: Partial<PreciosStoreRow>): PreciosStoreRow => ({
  storeId: 1,
  storeName: 'Local',
  department: 'Montevideo',
  price: 100,
  sourceDay: '2026-09-18',
  freshness: 'fresh',
  verdict: 'ok',
  ...over,
})

describe('preciosMatchesQuery', () => {
  it('encuentra sin tildes y en cualquier orden', () => {
    expect(preciosMatchesQuery('Azúcar blanco Azucarlito', 'azucar')).toBe(true)
    expect(preciosMatchesQuery('Pañales Babysec Premium', 'PANALES')).toBe(true)
    expect(preciosMatchesQuery('Aceite de girasol - Óptimo', 'optimo aceite')).toBe(true)
  })

  it('exige todas las palabras', () => {
    expect(preciosMatchesQuery('Aceite de girasol - Óptimo', 'aceite soja')).toBe(false)
  })

  it('una búsqueda vacía o de espacios no filtra nada', () => {
    expect(preciosMatchesQuery('lo que sea', '   ')).toBe(true)
  })
})

describe('preciosCategory', () => {
  it('ningún artículo del catálogo real cae en "otros"', () => {
    const orphans = articles.filter(row => preciosCategory(row) === 'otros').map(row => row.name)
    expect(orphans).toEqual([])
  })

  it('las reglas ordenadas resuelven los nombres que se pisan', () => {
    expect(preciosCategory({ name: 'Jabón de tocador Palmolive' })).toBe('higiene')
    expect(preciosCategory({ name: 'Jabón en polvo máquina Drive' })).toBe('limpieza')
    expect(preciosCategory({ name: 'Hipoclorito de sodio Agua Jane' })).toBe('limpieza')
    expect(preciosCategory({ name: 'Pulpa de tomate Conaprole' })).toBe('almacen')
    expect(preciosCategory({ name: 'Tomate Perita' })).toBe('frutas')
    expect(preciosCategory({ name: 'Papel higiénico hoja simple Elite' })).toBe('limpieza')
    expect(preciosCategory({ name: 'Papa Rosada' })).toBe('frutas')
    expect(preciosCategory({ name: 'Galletitas al agua Famosa' })).toBe('almacen')
    expect(preciosCategory({ name: 'Dulce de leche envasado Conaprole' })).toBe('lacteos')
    expect(preciosCategory({ name: 'Shampoo Pantene' })).toBe('higiene')
  })

  it('cuenta por rubro sobre el catálogo entero', () => {
    const counts = preciosCategoryCounts(articles)
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    expect(total).toBe(articles.length)
    expect(counts.otros).toBeUndefined()
  })
})

describe('preciosSavings', () => {
  it('mide contra p10, no contra el mínimo crudo', () => {
    expect(preciosSavings({ p10: 80, p50: 100 })).toBeCloseTo(0.2)
  })

  it('sin mediana no hay ahorro que medir', () => {
    expect(preciosSavings({ p10: 80 })).toBeNull()
    expect(preciosSavings({ p10: 80, p50: 0 })).toBeNull()
  })
})

describe('preciosBestPerUnitInGroup', () => {
  const oil = (articleId: number, p50: number, qty: number, n = 100) =>
    article({
      articleId,
      name: `Aceite ${articleId}`,
      group: 'Aceite de girasol',
      p50,
      qty,
      unit: 'ml',
      n,
    })

  it('marca la variante con menor precio por litro del grupo', () => {
    const best = preciosBestPerUnitInGroup([oil(1, 120, 900), oil(2, 200, 1500), oil(3, 99, 900)])
    // 1 → 133,3/l, 2 → 133,3/l, 3 → 110/l
    expect([...best]).toEqual([[3, 3]])
  })

  it('no compara con muestra chica ni entre grupos escritos distinto como si fueran otros', () => {
    const rows = [
      oil(1, 120, 900),
      oil(2, 90, 900, 5), // muestra chica: no compite
      article({
        articleId: 3,
        name: 'Arroz A',
        group: 'Arroz Blanco',
        p50: 50,
        qty: 1,
        unit: 'kg',
      }),
      article({
        articleId: 4,
        name: 'Arroz B',
        group: 'Arroz blanco',
        p50: 60,
        qty: 1,
        unit: 'kg',
      }),
    ]
    const best = preciosBestPerUnitInGroup(rows)
    expect(best.has(1)).toBe(false) // quedó sola en su grupo
    expect(best.get(3)).toBe(2) // "Arroz Blanco" y "Arroz blanco" son el mismo grupo
  })

  it('un empate no tiene ganador', () => {
    expect(preciosBestPerUnitInGroup([oil(1, 100, 1000), oil(2, 100, 1000)]).size).toBe(0)
  })

  it('no compara un litro con un kilo', () => {
    const rows = [
      oil(1, 100, 1000),
      article({
        articleId: 2,
        name: 'Aceite X',
        group: 'Aceite de girasol',
        p50: 10,
        qty: 1,
        unit: 'kg',
      }),
    ]
    expect(preciosBestPerUnitInGroup(rows).size).toBe(0)
  })
})

describe('preciosSortBy', () => {
  const rows = [
    { name: 'b', value: 2 as number | null },
    { name: 'a', value: null },
    { name: 'c', value: 1 },
    { name: 'd', value: 2 },
  ]

  it('los vacíos van al final en las dos direcciones', () => {
    const asc = preciosSortBy(
      rows,
      row => row.value,
      'asc',
      row => row.name
    )
    const desc = preciosSortBy(
      rows,
      row => row.value,
      'desc',
      row => row.name
    )
    expect(asc.map(row => row.name)).toEqual(['c', 'b', 'd', 'a'])
    expect(desc.map(row => row.name)).toEqual(['b', 'd', 'c', 'a'])
  })

  it('no muta la lista original', () => {
    preciosSortBy(
      rows,
      row => row.value,
      'asc',
      row => row.name
    )
    expect(rows.map(row => row.name)).toEqual(['b', 'a', 'c', 'd'])
  })
})

describe('tabla de artículos', () => {
  it('filtra por rubro, muestra y texto a la vez', () => {
    const out = preciosFilterArticles(articles, { q: 'aceite', rubro: 'almacen', muestra: true })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every(row => /aceite/i.test(row.name) && (row.n ?? 0) >= 30)).toBe(true)
  })

  it('ordena por precio por litro con los envases ilegibles al final', () => {
    const sorted = preciosSortArticles(articles, 'unidad', 'asc')
    const last = sorted[sorted.length - 1]
    expect(last.unit === null || last.unit === undefined || !last.qty).toBe(true)
  })

  it('ordena por locales de más a menos', () => {
    const sorted = preciosSortArticles(articles, 'locales', 'desc')
    expect(sorted[0].n).toBe(Math.max(...articles.map(row => row.n ?? 0)))
  })
})

describe('estado de la tabla ↔ URL', () => {
  it('la URL limpia es el default', () => {
    expect(preciosArticleStateFromQuery({})).toEqual(PRECIOS_ARTICLE_TABLE_DEFAULTS)
    expect(preciosArticleQueryFromState(PRECIOS_ARTICLE_TABLE_DEFAULTS)).toEqual({})
  })

  it('ida y vuelta sin perder nada', () => {
    const query = { q: 'yerba', rubro: 'almacen', orden: 'unidad', dir: 'desc', muestra: '30' }
    expect(preciosArticleQueryFromState(preciosArticleStateFromQuery(query))).toEqual(query)
  })

  it('un valor desconocido vuelve al default en vez de vaciar la tabla', () => {
    const state = preciosArticleStateFromQuery({
      rubro: 'juguetes',
      orden: 'precio',
      dir: 'arriba',
    })
    expect(state.rubro).toBe('')
    expect(state.orden).toBe('nombre')
    expect(state.dir).toBe('asc')
  })

  it('la dirección por defecto depende de la columna', () => {
    expect(preciosArticleStateFromQuery({ orden: 'ahorro' }).dir).toBe('desc')
    expect(
      preciosArticleQueryFromState({
        ...PRECIOS_ARTICLE_TABLE_DEFAULTS,
        orden: 'ahorro',
        dir: 'desc',
      })
    ).toEqual({
      orden: 'ahorro',
    })
  })

  it('la ficha no guarda la ubicación en la URL', () => {
    const state = preciosStoreStateFromQuery({
      depto: 'Maldonado',
      viejos: 'no',
      ofertas: '1',
      orden: 'distancia',
    })
    expect(state).toMatchObject({
      depto: 'Maldonado',
      ocultarViejos: true,
      soloOfertas: true,
      orden: 'precio',
    })
    expect(preciosStoreQueryFromState(state)).toEqual({
      depto: 'Maldonado',
      viejos: 'no',
      ofertas: '1',
    })
  })
})

describe('ficha: local por local', () => {
  const rows = [
    store({ storeId: 1, storeName: 'Tata Pocitos', price: 90, lat: -34.91, lon: -56.15 }),
    store({
      storeId: 2,
      storeName: 'Disco Centro',
      price: 80,
      freshness: 'stale',
      lat: -34.905,
      lon: -56.19,
    }),
    store({
      storeId: 3,
      storeName: 'Super Maldonado',
      department: 'Maldonado',
      price: 70,
      promo: true,
      lat: -34.9,
      lon: -54.95,
    }),
    store({
      storeId: 4,
      storeName: 'Sin coordenada',
      price: 60,
      verdict: 'suspect',
      lat: null,
      lon: null,
    }),
  ]
  const origin = { lat: -34.91, lng: -56.16 }

  it('mide la distancia sólo a los locales con coordenada', () => {
    const out = preciosWithDistance(rows, origin)
    expect(out[0].distanceKm).toBeLessThan(2)
    expect(out[3].distanceKm).toBeNull()
    expect(preciosWithDistance(rows, null).every(row => row.distanceKm === null)).toBe(true)
  })

  it('con un radio activo, el que no se puede ubicar no está "cerca"', () => {
    const out = preciosFilterStoreRows(preciosWithDistance(rows, origin), {
      ...PRECIOS_STORE_FILTER_DEFAULTS,
      radioKm: 5,
    })
    expect(out.map(row => row.storeId)).toEqual([1, 2])
  })

  it('filtra por departamento, texto, datos viejos y ofertas', () => {
    const base = preciosWithDistance(rows, null)
    const f = (over: Partial<typeof PRECIOS_STORE_FILTER_DEFAULTS>) =>
      preciosFilterStoreRows(base, { ...PRECIOS_STORE_FILTER_DEFAULTS, ...over }).map(
        row => row.storeId
      )
    expect(f({ depto: 'Maldonado' })).toEqual([3])
    expect(f({ q: 'pocitos' })).toEqual([1])
    expect(f({ ocultarViejos: true })).toEqual([1, 3, 4])
    expect(f({ soloOfertas: true })).toEqual([3])
  })

  it('ordena por distancia con los que no tienen coordenada al final', () => {
    const sorted = preciosSortStoreRows(preciosWithDistance(rows, origin), 'distancia', 'asc')
    expect(sorted[0].storeId).toBe(1)
    expect(sorted[sorted.length - 1].storeId).toBe(4)
  })

  it('el más barato del resumen no es ni la góndola quieta ni la sospechosa', () => {
    expect(preciosCheapestRankable(rows)?.storeId).toBe(3)
    expect(
      preciosCheapestRankable(rows.filter(row => row.department === 'Montevideo'))?.storeId
    ).toBe(1)
    expect(preciosCheapestRankable([rows[1], rows[3]])).toBeNull()
  })
})

describe('locales por nivel de precios', () => {
  it('ordena por cobertura de mayor a menor y desempata por nombre', () => {
    const rows = [
      { storeId: 1, storeName: 'B', ratio: 0.9, coverage: 0.8 },
      { storeId: 2, storeName: 'A', ratio: 0.95, coverage: 0.8 },
      { storeId: 3, storeName: 'C', ratio: 0.85, coverage: 0.9 },
    ]
    expect(preciosSortRankedStores(rows, 'cobertura', 'desc').map(row => row.storeId)).toEqual([
      3, 2, 1,
    ])
    expect(preciosSortRankedStores(rows, 'nivel', 'asc').map(row => row.storeId)).toEqual([3, 1, 2])
  })
})
