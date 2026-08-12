import { describe, expect, it } from 'vitest'
import { adDensityForPath, adsAllowed, maxAdSlots, normalizeAdPath } from '../../utils/ads'

describe('normalizeAdPath', () => {
  it('drops the query, the trailing slash and the locale prefix', () => {
    expect(normalizeAdPath('/mapa/')).toBe('/mapa')
    expect(normalizeAdPath('/en/mapa')).toBe('/mapa')
    expect(normalizeAdPath('/pt/mapa/?x=1')).toBe('/mapa')
    expect(normalizeAdPath('/en')).toBe('/')
    expect(normalizeAdPath('/')).toBe('/')
  })
})

describe('adDensityForPath', () => {
  it('carries no ads on the chrome-free routes', () => {
    // /widget renders inside other people's sites and /pizarra promises zero
    // third-party requests. An ad on either is a broken promise, not revenue.
    for (const p of ['/widget', '/pizarra', '/en/widget', '/pt/pizarra?c=100']) {
      expect(adDensityForPath(p), p).toBe('none')
      expect(adsAllowed(p), p).toBe(false)
    }
  })

  it('carries no ads where the page IS the conversion', () => {
    for (const p of ['/contacto', '/newsletter', '/cuenta', '/cuenta/alertas', '/conectar']) {
      expect(adDensityForPath(p), p).toBe('none')
    }
  })

  it('carries no ads on plumbing pages', () => {
    expect(adDensityForPath('/offline')).toBe('none')
    expect(adDensityForPath('/estado')).toBe('none')
  })

  it('keeps the rate and tool surfaces light', () => {
    for (const p of [
      '/',
      '/en',
      '/dolar-hoy',
      '/casas-de-cambio',
      '/casas-de-cambio/bancos',
      '/casa/brou',
      '/herramientas/calculadora-sueldo-liquido',
      '/mapa',
      '/mi-lista',
      '/buscar',
      '/convertir/usd-a-uyu',
    ]) {
      expect(adDensityForPath(p), p).toBe('light')
      expect(maxAdSlots(adDensityForPath(p)), p).toBe(1)
    }
  })

  it('allows the normal density on the long reads', () => {
    for (const p of [
      '/franquicia-aduana-uruguay',
      '/guias/como-cobrar-en-dolares',
      '/blog/2026-08-11-dolar',
      '/temas/aduana',
      '/mejores-bancos-uruguay',
      '/en/alquilar-en-uruguay',
    ]) {
      expect(adDensityForPath(p), p).toBe('normal')
      expect(maxAdSlots(adDensityForPath(p)), p).toBe(2)
    }
  })

  it('does not let a lookalike path inherit a rule', () => {
    // `/casa` is light; `/casas-de-cambio` is a different page that happens to
    // start with the same letters, and a future `/estado-de-cuenta` must not
    // silently pick up the no-ads exemption.
    expect(adDensityForPath('/estado-de-cuenta')).toBe('normal')
    expect(adDensityForPath('/contacto-directo')).toBe('normal')
    expect(adDensityForPath('/mapa-de-temas')).toBe('normal')
  })
})

describe('maxAdSlots', () => {
  it('never allows more than two units on a page', () => {
    expect(maxAdSlots('none')).toBe(0)
    expect(maxAdSlots('light')).toBe(1)
    expect(maxAdSlots('normal')).toBe(2)
  })
})
