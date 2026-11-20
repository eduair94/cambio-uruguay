import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isMarketSeriesKey, type MarketSeriesDoc } from '../../utils/marketSeries'
import {
  CAR_FILTERS,
  internalListingQuery,
  marketKeyFromQuery,
  marketPageUrl,
  marketSnapshotPrefix,
  OPEN_DATA_ENDPOINTS,
  OPEN_LISTINGS_MAX,
  openCar,
  openDataEnvelope,
  openDataOpenApi,
  openMarketRow,
  openRental,
  RENTAL_FILTERS,
} from '../../utils/openData'

const HERE = dirname(fileURLToPath(import.meta.url))
const API_DIR = resolve(HERE, '../../server/api')

describe('open data: series keys from readable params', () => {
  it('builds a rental key with the site defaults', () => {
    expect(marketKeyFromQuery({ mercado: 'alquiler' })).toEqual({
      ok: true,
      market: 'alquiler',
      key: 'alquiler|UYU|todas|any|uy',
    })
    expect(
      marketKeyFromQuery({
        mercado: 'alquiler',
        tipo: 'apartamento',
        dormitorios: '2',
        departamento: 'montevideo',
        barrio: 'pocitos',
      })
    ).toMatchObject({ ok: true, key: 'alquiler|UYU|apartamento|2|b:montevideo:pocitos' })
  })

  it('defaults sales to dollars and accepts "todos" for any bedroom count', () => {
    expect(
      marketKeyFromQuery({ mercado: 'venta', dormitorios: 'todos', departamento: 'maldonado' })
    ).toMatchObject({ ok: true, key: 'venta|USD|todas|any|d:maldonado' })
  })

  it('builds car keys and refuses a year without a model', () => {
    expect(marketKeyFromQuery({ mercado: 'autos' })).toMatchObject({ key: 'autos|USD|all' })
    expect(
      marketKeyFromQuery({ mercado: 'autos', modelo: 'toyota-hilux', anio: '2018' })
    ).toMatchObject({ key: 'autos|USD|m:toyota-hilux|y:2018' })
    expect(marketKeyFromQuery({ mercado: 'autos', anio: '2018' }).ok).toBe(false)
  })

  it('accepts the raw key and rejects anything that is not one', () => {
    expect(marketKeyFromQuery({ clave: 'venta|USD|casa|3|d:canelones' })).toMatchObject({
      ok: true,
      market: 'venta',
    })
    expect(marketKeyFromQuery({ clave: 'alquiler|UYU|todas|any|uy; drop' }).ok).toBe(false)
    expect(marketKeyFromQuery({ mercado: 'bitcoin' }).ok).toBe(false)
    expect(marketKeyFromQuery({ mercado: 'alquiler', moneda: 'EUR' }).ok).toBe(false)
    expect(marketKeyFromQuery({ mercado: 'alquiler', departamento: 'Monte video' }).ok).toBe(false)
    expect(marketKeyFromQuery({ mercado: 'alquiler', barrio: 'pocitos' }).ok).toBe(false)
  })

  it('every key it builds is one the site would accept', () => {
    for (const query of [
      { mercado: 'alquiler', moneda: 'usd', tipo: 'casa', dormitorios: '4plus' },
      { mercado: 'venta', departamento: 'rocha' },
      { mercado: 'autos', modelo: 'chevrolet-onix' },
    ]) {
      const parsed = marketKeyFromQuery(query)
      expect(parsed.ok && isMarketSeriesKey(parsed.key)).toBe(true)
    }
  })
})

describe('open data: snapshot prefixes', () => {
  it('keeps the place open so every department and barrio comes back', () => {
    expect(marketSnapshotPrefix({ mercado: 'alquiler', dormitorios: '2' })).toEqual({
      ok: true,
      market: 'alquiler',
      prefix: 'alquiler|UYU|todas|2|',
    })
    expect(marketSnapshotPrefix({ mercado: 'alquiler', departamento: 'montevideo' })).toMatchObject(
      {
        prefix: 'alquiler|UYU|todas|any|b:montevideo:',
      }
    )
    expect(marketSnapshotPrefix({ mercado: 'autos' })).toMatchObject({ prefix: 'autos|USD|m:' })
    expect(marketSnapshotPrefix({ mercado: 'alquiler', departamento: '.*' }).ok).toBe(false)
  })
})

describe('open data: links back to the page that draws the same numbers', () => {
  it('maps a series key to the evolution page with the same selection', () => {
    expect(marketPageUrl('alquiler|UYU|apartamento|2|b:montevideo:pocitos')).toBe(
      'https://cambio-uruguay.com/evolucion-precio-alquileres-uruguay?zona=b%3Amontevideo%3Apocitos&tipo=apartamento&dormitorios=2'
    )
    expect(marketPageUrl('venta|USD|todas|any|uy')).toBe(
      'https://cambio-uruguay.com/evolucion-precio-viviendas-uruguay'
    )
    expect(marketPageUrl('autos|USD|m:toyota-hilux|y:2018')).toBe(
      'https://cambio-uruguay.com/evolucion-precio-autos-usados-uruguay?modelo=toyota-hilux&anio=2018'
    )
  })

  it('points every evolution URL at a page that exists', () => {
    for (const page of [
      'evolucion-precio-alquileres-uruguay',
      'evolucion-precio-viviendas-uruguay',
      'evolucion-precio-autos-usados-uruguay',
    ])
      expect(existsSync(resolve(HERE, `../../pages/${page}.vue`)), page).toBe(true)
  })
})

describe('open data: public shapes', () => {
  const doc = {
    key: 'alquiler|UYU|apartamento|2|b:montevideo:pocitos',
    dims: {
      vertical: 'alquiler',
      currency: 'UYU',
      scope: 'neighborhood',
      propertyType: 'apartamento',
      bedrooms: '2',
      departmentSlug: 'montevideo',
      neighborhoodSlug: 'pocitos',
      marketSlug: null,
      year: null,
    },
    labels: { department: 'Montevideo', neighborhood: 'Pocitos', brand: null, model: null },
    label: 'Pocitos',
    latest: {
      d: '2026-11-12',
      n: 140,
      p25: 30000,
      med: 34000,
      p75: 39000,
      m2: { n: 90, med: 520 },
      w7: null,
      w30: { n: 60, chg: 0.012, down: 5, up: 9, same: 46, outliers: 0 },
      w90: null,
    },
  } as unknown as MarketSeriesDoc

  it('renames a cohort into the documented Spanish fields', () => {
    const row = openMarketRow(doc)
    expect(row).toMatchObject({
      clave: doc.key,
      barrio: 'Pocitos',
      ultimo: { fecha: '2026-11-12', mediana: 34000, medianaPorM2: 520, variacion30d: 0.012 },
    })
    expect(row.url).toContain('/evolucion-precio-alquileres-uruguay?')
  })

  it('never lets a rental leak photos, contacts, coordinates or the source URL', () => {
    const raw = {
      key: 'abc-123',
      title: 'Apto 2 dorm',
      price: 30000,
      currency: 'UYU',
      priceUyu: 30000,
      sources: ['infocasas'],
      latitude: -34.9,
      longitude: -56.1,
      offers: [{ url: 'https://portal.example/aviso', sellerName: 'Inmobiliaria X' }],
      images: ['https://cdn.example/1.jpg'],
    }
    const out = openRental(raw as never) as unknown as Record<string, unknown>
    expect(out.url).toBe('https://cambio-uruguay.com/alquileres/abc-123')
    const text = JSON.stringify(out)
    for (const leaked of ['portal.example', 'Inmobiliaria X', 'cdn.example', '-34.9', '-56.1'])
      expect(text, leaked).not.toContain(leaked)
  })

  it('never lets a car leak the dealer name or the original advert', () => {
    const out = openCar({
      key: 'ml-1',
      brand: 'Toyota',
      model: 'Hilux',
      marketSlug: 'toyota-hilux',
      priceUsd: 32990,
      sellerType: 'dealer',
      dealerName: 'Automotora Y',
      permalink: 'https://auto.example/1',
      picture: 'https://cdn.example/a.jpg',
    } as never)
    expect(out.vendedor).toBe('automotora')
    expect(out.precioDelModelo).toBe(
      'https://cambio-uruguay.com/autos-usados-uruguay/precios/toyota-hilux'
    )
    const text = JSON.stringify(out)
    for (const leaked of ['Automotora Y', 'auto.example', 'cdn.example'])
      expect(text, leaked).not.toContain(leaked)
  })

  it('marks listings as unlicensed and statistics as CC BY', () => {
    expect(openDataEnvelope([], { pagina: 'x', licensed: false }).fuente.licencia).toBeNull()
    expect(openDataEnvelope([], { pagina: 'x' }).fuente.licencia?.nombre).toBe('CC BY 4.0')
  })
})

describe('open data: listing queries', () => {
  it('passes only documented filters and caps the page size', () => {
    const { query, page, limit } = internalListingQuery(
      {
        departamento: 'Montevideo',
        precioMax: '30000',
        perPage: '500',
        secret: 'x',
        porPagina: '99',
      },
      RENTAL_FILTERS
    )
    expect(query).toEqual({ department: 'Montevideo', priceMax: '30000' })
    expect(page).toBe(1)
    expect(limit).toBe(OPEN_LISTINGS_MAX)
  })

  it('bounds the page so nobody walks the whole directory', () => {
    expect(internalListingQuery({ pagina: '3' }, CAR_FILTERS).query.page).toBe('3')
    expect(internalListingQuery({ pagina: '5000' }, CAR_FILTERS).page).toBe(1)
    expect(internalListingQuery({ porPagina: '5' }, CAR_FILTERS).limit).toBe(5)
  })
})

describe('open data: catalogue and OpenAPI stay in step with the routes', () => {
  const routeFile = (ruta: string) => {
    const rel = ruta.replace(/^\/api\//, '')
    return [`${rel}.get.ts`, `${rel}/index.get.ts`].map(f => resolve(API_DIR, f)).find(existsSync)
  }

  it('documents only routes that exist', () => {
    for (const endpoint of OPEN_DATA_ENDPOINTS)
      expect(routeFile(endpoint.ruta), endpoint.ruta).toBeTruthy()
  })

  it('documents every public route', () => {
    const dir = resolve(API_DIR, 'datos')
    const files = readdirSync(dir, { recursive: true })
      .map(String)
      .filter(f => f.endsWith('.get.ts'))
      .map(f => f.replace(/\\/g, '/'))
    const documented = new Set(OPEN_DATA_ENDPOINTS.map(e => e.ruta))
    for (const file of files) {
      if (file === 'index.get.ts' || file === 'openapi.json.get.ts') continue
      const ruta = `/api/datos/${file.replace(/(\/index)?\.get\.ts$/, '')}`
      expect(documented.has(ruta), ruta).toBe(true)
    }
  })

  it('every route answers with open CORS through the shared helper', () => {
    const dir = resolve(API_DIR, 'datos')
    for (const file of readdirSync(dir, { recursive: true }).map(String)) {
      if (!file.endsWith('.get.ts')) continue
      const source = readFileSync(resolve(dir, file), 'utf8')
      expect(source.includes('openDataHeaders(event'), file).toBe(true)
    }
  })

  it('emits an OpenAPI path per documented route', () => {
    const spec = openDataOpenApi() as { paths: Record<string, unknown> }
    expect(Object.keys(spec.paths).sort()).toEqual(OPEN_DATA_ENDPOINTS.map(e => e.ruta).sort())
  })

  it('every example is a URL the parser accepts', () => {
    for (const endpoint of OPEN_DATA_ENDPOINTS.filter(e => e.ruta.includes('/mercado'))) {
      const params = Object.fromEntries(new URL(endpoint.ejemplo, 'https://x').searchParams)
      if (endpoint.id === 'serie') expect(marketKeyFromQuery(params).ok, endpoint.id).toBe(true)
      if (endpoint.id === 'actual') expect(marketSnapshotPrefix(params).ok, endpoint.id).toBe(true)
    }
  })
})
