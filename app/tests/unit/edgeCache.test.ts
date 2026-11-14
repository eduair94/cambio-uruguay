import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_EDGE_TTL, LIVE_RATES_EDGE_TTL, edgeTtlFor } from '../../utils/edgeCache'
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
    expect(plugin).toContain('!== defaultHtmlCacheControl) return')
  })
})
