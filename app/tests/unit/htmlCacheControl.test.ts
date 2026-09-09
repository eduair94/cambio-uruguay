import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { defaultHtmlCacheControl, wantsHtmlCacheControl } from '../../utils/htmlCacheControl'

// El compañero de `routeRules-browser-cache.test.ts`. Aquel vigila que las rutas
// que SÍ declaran `cache-control` digan algo honesto; éste vigila el agujero que
// tenía al lado: todas las demás páginas salían sin ninguna cabecera.
//
// Medido contra producción el 2026-09-09, antes de este arreglo: `/` respondía
// `public, max-age=0, must-revalidate, s-maxage=3600` y `/dolar-hoy`,
// `/casas-de-cambio` y `/alquileres-uruguay` no respondían `cache-control`
// ninguno.
//
// Igual que su vecino: esto prueba la mitad que vive en el repo. Que el visitante
// revalide de verdad depende además del Browser Cache TTL de la zona, y eso se
// comprueba con una sonda contra producción, no acá.
describe('cache-control de los documentos HTML', () => {
  it('le habla al navegador y se calla sobre las cachés compartidas', () => {
    expect(defaultHtmlCacheControl).toContain('max-age=0')
    expect(defaultHtmlCacheControl).toContain('must-revalidate')
    // `s-maxage` acá volvería edge-cacheable algo que hoy no lo es.
    expect(defaultHtmlCacheControl).not.toContain('s-maxage')
  })

  it('alcanza a las páginas, que es donde faltaba', () => {
    const html = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    for (const path of [
      '/',
      '/dolar-hoy',
      '/casas-de-cambio',
      '/alquileres-uruguay',
      '/casa/brou',
      '/sucursal/brou-montevideo-centro',
    ]) {
      expect(wantsHtmlCacheControl(path, html), path).toBe(true)
    }
  })

  it('no toca datos, assets ni archivos con su propia política', () => {
    const html = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    for (const path of [
      '/api/rentals',
      '/_nuxt/entry.abc123.js',
      '/_ipx/f_webp/img.png',
      // `/sw.js` y los assets inmutables ya declaran su cabecera en routeRules:
      // que este middleware ni los mire evita pisarlas por accidente.
      '/sw.js',
      '/firebase-messaging-extra.js',
      '/robots.txt',
      '/manifest.webmanifest',
    ]) {
      expect(wantsHtmlCacheControl(path, html), path).toBe(false)
    }
  })

  it('ignora lo que no es una navegación', () => {
    expect(wantsHtmlCacheControl('/dolar-hoy', 'application/json')).toBe(false)
    expect(wantsHtmlCacheControl('/dolar-hoy', 'image/avif,image/webp,*/*')).toBe(false)
    expect(wantsHtmlCacheControl('/dolar-hoy', undefined)).toBe(false)
  })

  it('el middleware no pisa la cabecera que routeRules ya declaró', () => {
    const source = readFileSync(
      resolve(__dirname, '../../server/middleware/html-cache-control.ts'),
      'utf-8'
    )
    expect(source).toContain("res.getHeader('cache-control')")
  })
})
