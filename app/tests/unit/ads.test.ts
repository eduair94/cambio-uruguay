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

  it('monetises the newsletter ARCHIVE even though the signup page is ad-free', () => {
    // `/newsletter` is a form to protect; everything under it is a long read
    // arrived at from search. Prefix-matching the archive into the no-ads list
    // would silently de-monetise a surface that grows by one page every day —
    // so the signup page is matched exactly, not by prefix.
    expect(adDensityForPath('/newsletter')).toBe('none')
    expect(adDensityForPath('/newsletter/')).toBe('none')
    expect(adDensityForPath('/en/newsletter')).toBe('none')
    for (const p of [
      '/newsletter/archivo',
      '/newsletter/2026-08-15',
      '/en/newsletter/2026-08-15',
      '/newsletter/archivo?p=3',
    ]) {
      expect(adDensityForPath(p), p).toBe('normal')
      expect(maxAdSlots(adDensityForPath(p)), p).toBe(2)
    }
  })

  it('still prefix-matches the account area, which is why the split exists', () => {
    // The exact-match escape hatch must not leak: /cuenta keeps its children.
    expect(adDensityForPath('/cuenta/favoritos')).toBe('none')
  })

  it('keeps the calculators ad-free while their directory page stays light', () => {
    // A calculator's DOM is a form, so auto ads land between the inputs and
    // the result. `light` would not prevent that — it only caps the MANUAL
    // units — so the loader has to stay off the page entirely.
    for (const p of [
      '/herramientas/calculadora-sueldo-liquido',
      '/herramientas/calculadora-irpf',
      '/herramientas/carrito-importacion',
      '/en/herramientas/costo-de-vida',
      '/pt/herramientas/conversor-de-monedas?x=1',
    ]) {
      expect(adDensityForPath(p), p).toBe('none')
      expect(adsAllowed(p), p).toBe(false)
    }
    expect(adDensityForPath('/herramientas')).toBe('light')
    expect(adsAllowed('/herramientas')).toBe(true)
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
      '/herramientas',
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
