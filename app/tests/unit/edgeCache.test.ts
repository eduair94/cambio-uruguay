import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EDGE_TTL,
  EDGE_STALE,
  LIVE_RATES_EDGE_TTL,
  edgeCdnCacheControl,
  edgeResponseHeaders,
  edgeTtlFor,
} from '../../utils/edgeCache'
import { defaultHtmlCacheControl } from '../../utils/htmlCacheControl'
import { PREFIXED_LOCALE_CODES } from '../../utils/locales'

// La caché de borde por defecto (utils/edgeCache.ts + server/plugins/edge-cache.ts). Medido el
// 6/11/2026: 254 de 287 páginas salían DYNAMIC de Cloudflare, 1-6 s de TTFB contra 0,2 s en HIT.
describe('caché de borde por defecto', () => {
  it('guarda las páginas públicas, también las que más se visitan', () => {
    for (const path of [
      '/autos-usados-uruguay',
      '/alquileres-uruguay',
      '/venta-viviendas-uruguay',
      '/autos-usados-uruguay/fb-1561585904936621',
      '/alquileres/casa-en-pocitos-ml-123',
      '/guias/como-comprar-dolares',
      '/herramientas/calculadora-irpf',
      '/sillas-escritorio-uruguay?precio=hasta-5000',
    ]) {
      expect(edgeTtlFor(path), path).toBe(DEFAULT_EDGE_TTL)
    }
  })

  it('las cotizaciones en vivo duran lo mismo que una vuelta del scraper', () => {
    for (const path of [
      '/dolar-hoy',
      '/casas-de-cambio',
      '/casas-de-cambio/bancos',
      '/dolar/salto',
      '/convertir/100-dolares-a-pesos',
      '/comparar',
    ]) {
      expect(edgeTtlFor(path), path).toBe(LIVE_RATES_EDGE_TTL)
    }
    expect(LIVE_RATES_EDGE_TTL).toBeLessThanOrEqual(300)
  })

  it('no confunde una ruta con otra que empieza igual', () => {
    expect(edgeTtlFor('/comparar-autos-usados-uruguay')).toBe(DEFAULT_EDGE_TTL)
    expect(edgeTtlFor('/mapa-de-temas')).toBe(DEFAULT_EDGE_TTL)
    expect(edgeTtlFor('/estadisticas-del-sitio')).toBe(DEFAULT_EDGE_TTL)
    expect(edgeTtlFor('/buscar-con-ia')).toBe(DEFAULT_EDGE_TTL)
  })

  it('nunca guarda lo que depende de quién mira, lo privado ni el estado de ahora', () => {
    for (const path of [
      '/cuenta',
      '/conectar',
      '/mi-lista',
      '/buscar?q=dolar',
      '/asistente-ia',
      '/estado',
      '/pizarra',
      '/estadisticas-de-busqueda',
      '/estadisticas-por-pagina',
      '/opiniones-alquileres',
      '/contactos-comerciales',
      '/oportunidades-reddit',
      '/admin/clientes',
    ]) {
      expect(edgeTtlFor(path), path).toBeNull()
    }
  })

  it('decide igual con prefijo de idioma, en todos los idiomas', () => {
    for (const code of PREFIXED_LOCALE_CODES) {
      expect(edgeTtlFor(`/${code}/autos-usados-uruguay`), code).toBe(DEFAULT_EDGE_TTL)
      expect(edgeTtlFor(`/${code}/dolar-hoy`), code).toBe(LIVE_RATES_EDGE_TTL)
      expect(edgeTtlFor(`/${code}/cuenta`), code).toBeNull()
      expect(edgeTtlFor(`/${code}`), code).toBe(DEFAULT_EDGE_TTL)
    }
  })

  it('deja afuera lo que no es un documento', () => {
    for (const path of [
      '/__nuxt_error?statusCode=404',
      '/__nuxt_island/X',
      '/__og-image__/image/og.png',
      '/api/cars/ficha/x',
      '/_nuxt/entry.js',
      '/sw.js',
      '/sitemap_index.xml',
    ]) {
      expect(edgeTtlFor(path), path).toBeNull()
    }
  })

  it('el plugin sólo sube una respuesta 200 que nadie decidió', () => {
    const plugin = readFileSync(resolve(__dirname, '../../server/plugins/edge-cache.ts'), 'utf8')
    expect(plugin).toContain("hook('render:response'")
    expect(plugin).toMatch(/status !== 200\) return/)
    // La decisión vive en `edgeResponseHeaders` (probada abajo, caso por caso); el plugin sólo la
    // aplica, con la cabecera por defecto del navegador como referencia.
    expect(plugin).toContain('edgeResponseHeaders({')
    expect(plugin).toContain('defaultCacheControl: defaultHtmlCacheControl')
  })
})

// La copia vieja mientras se revalida (20/11/2026). Cloudflare apaga `stale-while-revalidate` y
// `stale-if-error` cuando la misma cabecera trae `s-maxage` o `must-revalidate`, y el HTML de este
// sitio necesita las dos en Cache-Control (la del navegador no se toca). Por eso va en
// `Cloudflare-CDN-Cache-Control`, que Cloudflare lee primero y no le pasa al navegador.
describe('Cloudflare-CDN-Cache-Control: copia vieja mientras se revalida', () => {
  const header = (ttl: number) => `${defaultHtmlCacheControl}, s-maxage=${ttl}`

  it('una página por defecto (600 s) se sirve vieja hasta 10 min más, y un día ante un 5xx', () => {
    expect(edgeCdnCacheControl('/autos-usados-uruguay', header(DEFAULT_EDGE_TTL))).toBe(
      'public, max-age=600, stale-while-revalidate=600, stale-if-error=86400'
    )
  })

  it('las cotizaciones vencidas se sirven a lo sumo 1 min más al revalidar y 15 min más ante un 5xx', () => {
    for (const path of ['/dolar-hoy', '/en/dolar-hoy', '/casas-de-cambio/bancos', '/']) {
      expect(edgeCdnCacheControl(path, header(LIVE_RATES_EDGE_TTL)), path).toBe(
        'public, max-age=300, stale-while-revalidate=60, stale-if-error=900'
      )
    }
    expect(EDGE_STALE.rates.revalidate).toBeLessThanOrEqual(60)
    expect(EDGE_STALE.rates.ifError).toBeLessThanOrEqual(900)
  })

  it('las familias de routeRules con cotizaciones usan la ventana corta aunque su TTL sea largo', () => {
    expect(edgeCdnCacheControl('/', header(3600))).toBe(
      'public, max-age=3600, stale-while-revalidate=60, stale-if-error=900'
    )
    expect(edgeCdnCacheControl('/casa/brou', header(3600))).toBe(
      'public, max-age=3600, stale-while-revalidate=60, stale-if-error=900'
    )
    expect(edgeCdnCacheControl('/pt/sucursal/brou-centro', header(3600))).toContain(
      'stale-while-revalidate=60,'
    )
    expect(edgeCdnCacheControl('/historico/brou/usd/ebrou', header(600))).toBe(
      'public, max-age=600, stale-while-revalidate=60, stale-if-error=900'
    )
    expect(edgeCdnCacheControl('/cotizacion/dolar', header(600))).toContain(
      'stale-while-revalidate=60,'
    )
    expect(edgeCdnCacheControl('/widget', header(3600))).toBe(
      'public, max-age=3600, stale-while-revalidate=60, stale-if-error=900'
    )
    expect(edgeCdnCacheControl('/sucursales/x', header(3600))).toContain(
      'stale-while-revalidate=60,'
    )
  })

  it('lo editorial de un día revalida en una hora; lo de TTL corto, en su propio TTL', () => {
    expect(edgeCdnCacheControl('/guias/x', header(86400))).toBe(
      'public, max-age=86400, stale-while-revalidate=3600, stale-if-error=86400'
    )
    expect(edgeCdnCacheControl('/alquiler/montevideo/pocitos-nuevo', header(300))).toBe(
      'public, max-age=300, stale-while-revalidate=300, stale-if-error=86400'
    )
    expect(edgeCdnCacheControl('/alquileres/x', header(60))).toBe(
      'public, max-age=60, stale-while-revalidate=60, stale-if-error=86400'
    )
  })

  it('la raíz es ruta exacta: no arrastra al resto del sitio a la familia de cotizaciones', () => {
    expect(edgeCdnCacheControl('/guias', header(600))).toBe(
      'public, max-age=600, stale-while-revalidate=600, stale-if-error=86400'
    )
    expect(edgeCdnCacheControl('/casas-de-cambio-abiertas-fin-de-semana', header(300))).toContain(
      'stale-while-revalidate=60,'
    )
    // /casa es familia de cotización; /casas-x no empieza por "/casa/".
    expect(edgeCdnCacheControl('/casamientos', header(600))).toContain(
      'stale-while-revalidate=600,'
    )
  })

  it('nada cuando el borde no debe guardar la página', () => {
    expect(edgeCdnCacheControl('/autos-usados-uruguay', defaultHtmlCacheControl)).toBeNull()
    expect(edgeCdnCacheControl('/autos-usados-uruguay', header(0))).toBeNull()
    expect(edgeCdnCacheControl('/autos-usados-uruguay', 'no-store')).toBeNull()
    expect(edgeCdnCacheControl('/autos-usados-uruguay', 'private, s-maxage=600')).toBeNull()
    expect(edgeCdnCacheControl('/autos-usados-uruguay', 'no-cache, s-maxage=600')).toBeNull()
    for (const path of ['/cuenta', '/estado', '/pizarra', '/en/mi-lista', '/api/x', '/sw.js']) {
      expect(edgeCdnCacheControl(path, header(600)), path).toBeNull()
    }
  })

  it('el plugin escribe las dos cabeceras que decide edgeResponseHeaders', () => {
    const plugin = readFileSync(resolve(__dirname, '../../server/plugins/edge-cache.ts'), 'utf8')
    expect(plugin).toContain("'cache-control': decision.cacheControl")
    expect(plugin).toContain("'cloudflare-cdn-cache-control': decision.cdn")
    expect(plugin).toMatch(/hasCdnHeader: CDN_HEADERS\.some\(/)
  })
})

// La decisión del plugin, sin Nitro (`edgeResponseHeaders`). Cada caso es una regla que, si se
// rompe, cambia qué guarda Cloudflare o qué recibe el navegador.
describe('edgeResponseHeaders: qué hace el plugin con una respuesta 200', () => {
  const base = { defaultCacheControl: defaultHtmlCacheControl, hasCdnHeader: false }

  it('la cabecera por defecto recibe el s-maxage por defecto y la cabecera de CDN', () => {
    expect(
      edgeResponseHeaders({
        ...base,
        path: '/autos-usados-uruguay',
        current: defaultHtmlCacheControl,
      })
    ).toEqual({
      cacheControl: `${defaultHtmlCacheControl}, s-maxage=600`,
      cdn: 'public, max-age=600, stale-while-revalidate=600, stale-if-error=86400',
    })
    // Sin cabecera (un pedido sin Accept: text/html) vale lo mismo.
    expect(
      edgeResponseHeaders({ ...base, path: '/dolar-hoy', current: undefined }).cacheControl
    ).toBe(`${defaultHtmlCacheControl}, s-maxage=300`)
  })

  it('un Cache-Control de routeRules se conserva tal cual y sólo gana la cabecera de CDN', () => {
    const out = edgeResponseHeaders({ ...base, path: '/glosario', current: 's-maxage=86400' })
    expect(out.cacheControl).toBeUndefined()
    expect(out.cdn).toBe('public, max-age=86400, stale-while-revalidate=3600, stale-if-error=86400')
  })

  it('una cabecera de CDN ya puesta por un handler no recibe nada nuestro', () => {
    expect(
      edgeResponseHeaders({
        ...base,
        path: '/autos-usados-uruguay',
        current: 's-maxage=600',
        hasCdnHeader: true,
      })
    ).toEqual({})
    // Con la cabecera por defecto sí se completa el s-maxage, pero la de CDN sigue siendo suya.
    expect(
      edgeResponseHeaders({
        ...base,
        path: '/autos-usados-uruguay',
        current: defaultHtmlCacheControl,
        hasCdnHeader: true,
      })
    ).toEqual({ cacheControl: `${defaultHtmlCacheControl}, s-maxage=600` })
  })

  it('una página que pidió no-store no recibe nada', () => {
    expect(
      edgeResponseHeaders({
        ...base,
        path: '/autos-usados-uruguay',
        current: 'no-store, max-age=0',
      })
    ).toEqual({})
  })

  it('lo que nunca va al borde no recibe nada aunque traiga la cabecera por defecto', () => {
    for (const path of ['/cuenta', '/estado', '/pizarra', '/api/x', '/sw.js']) {
      expect(
        edgeResponseHeaders({ ...base, path, current: defaultHtmlCacheControl }),
        path
      ).toEqual({})
    }
  })
})
