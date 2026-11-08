import { describe, expect, it } from 'vitest'
import {
  CLARITY_MAX_QUERY_RESTARTS,
  clarityEventName,
  clarityFamily,
  clarityForgetCookies,
  clarityKeepRecording,
  clarityLocale,
  clarityQueryRestarts,
  clarityReferrerAllowed,
  clarityRouteAllowed,
  claritySampled,
  claritySampleRate,
  clarityStartDecision,
  clarityTagValue,
  parseClaritySeed,
  strictConsentCountry,
  strictRegionFromTimeZone,
} from '../../utils/clarityPolicy'

const undecided = { cookie: null, strictRegion: false } as const

describe('whether Clarity may load for a visitor', () => {
  it('loads for an undecided visitor outside the strict regions, the default regime', () => {
    expect(clarityStartDecision(undecided)).toBe('load')
  })

  it('waits for "Aceptar" when undecided in a strict region or one that could not be told', () => {
    expect(clarityStartDecision({ cookie: null, strictRegion: true })).toBe('wait')
    expect(clarityStartDecision({ cookie: null, strictRegion: null })).toBe('wait')
    expect(clarityStartDecision({ cookie: undefined, strictRegion: undefined })).toBe('wait')
  })

  it('loads after "Aceptar" anywhere, and never after "Rechazar"', () => {
    expect(clarityStartDecision({ cookie: 'granted', strictRegion: true })).toBe('load')
    expect(clarityStartDecision({ cookie: 'denied', strictRegion: false })).toBe('skip')
    expect(clarityStartDecision({ cookie: 'denied', strictRegion: true })).toBe('skip')
  })

  it('skips with Global Privacy Control, an automated browser or saveData, even after "Aceptar"', () => {
    for (const signal of ['gpc', 'automated', 'saveData'] as const) {
      expect(clarityStartDecision({ ...undecided, [signal]: true })).toBe('skip')
      expect(clarityStartDecision({ cookie: 'granted', strictRegion: false, [signal]: true })).toBe(
        'skip'
      )
    }
  })
})

describe('the country behind the decision', () => {
  it('is strict in the EEA, the UK and Switzerland, and not in Uruguay', () => {
    for (const country of ['DE', 'fr', 'GB', 'CH', 'NO', 'IS']) {
      expect(strictConsentCountry(country)).toBe(true)
    }
    for (const country of ['UY', 'AR', 'BR', 'US'])
      expect(strictConsentCountry(country)).toBe(false)
  })

  it('is strict when Cloudflare cannot tell: unknown, Tor, missing or malformed', () => {
    for (const country of ['XX', 'T1', '', undefined, null, 'URY', 42]) {
      expect(strictConsentCountry(country)).toBe(true)
    }
  })

  it('falls back to the time zone: Europe and the EEA outside it are strict', () => {
    expect(strictRegionFromTimeZone('Europe/Madrid')).toBe(true)
    expect(strictRegionFromTimeZone('Atlantic/Canary')).toBe(true)
    expect(strictRegionFromTimeZone('Asia/Nicosia')).toBe(true)
    expect(strictRegionFromTimeZone('America/Montevideo')).toBe(false)
    expect(strictRegionFromTimeZone('')).toBeNull()
    expect(strictRegionFromTimeZone(undefined)).toBeNull()
  })
})

describe('the routes Clarity never records', () => {
  it('excludes the private pages under any locale prefix', () => {
    for (const path of [
      '/cuenta',
      '/en/cuenta',
      '/fr/cuenta/',
      '/conectar',
      '/asistente-ia',
      '/opinion-alquileres',
      '/opiniones-alquileres',
      '/estadisticas-de-busqueda',
      '/estadisticas-por-pagina',
      '/pt/estadisticas-del-sitio',
      '/oportunidades-reddit',
      '/offline',
      '/estado',
      '/grabacion-sin-consentimiento-uruguay',
      '/descuentos-con-tarjeta-uruguay/cerca-de-mi',
      '/pizarra',
      '/en/widget',
    ]) {
      expect(clarityRouteAllowed(path), path).toBe(false)
    }
  })

  it('does not take a neighbour for an excluded route', () => {
    for (const path of [
      '/',
      '/cuenta-remunerada-uruguay',
      '/alquileres-uruguay',
      '/alquileres/montevideo-pocitos-1abc',
      '/descuentos-con-tarjeta-uruguay',
      '/en/dolar-hoy',
    ]) {
      expect(clarityRouteAllowed(path), path).toBe(true)
    }
  })

  it('excludes a URL carrying a sign-in code, a token or the reference address', () => {
    expect(clarityRouteAllowed('/alquileres-uruguay', { refLabel: 'Bulevar Artigas 1234' })).toBe(
      false
    )
    expect(clarityRouteAllowed('/alquileres-uruguay', { reflat: '-34.9' })).toBe(false)
    expect(clarityRouteAllowed('/', { oobCode: 'abc', mode: 'signIn' })).toBe(false)
    expect(clarityRouteAllowed('/?apiKey=x&lang=es')).toBe(false)
    expect(clarityRouteAllowed('/dolar-hoy', '?token=1')).toBe(false)
    expect(clarityRouteAllowed('/', new URLSearchParams('code=1&state=2'))).toBe(false)
    expect(clarityRouteAllowed('/alquileres-uruguay', { departamento: 'montevideo' })).toBe(true)
    expect(clarityRouteAllowed('/alquileres-uruguay?departamento=montevideo#mapa')).toBe(true)
  })

  it('excludes a tab opened from such a URL: Clarity sends the referrer as is', () => {
    expect(
      clarityReferrerAllowed(
        'https://cambio-uruguay.com/alquileres-uruguay?refLat=-34.9&refLabel=Bulevar%20Artigas'
      )
    ).toBe(false)
    expect(clarityReferrerAllowed('https://cambio-uruguay.com/conectar?OOBCODE=abc')).toBe(false)
    expect(clarityReferrerAllowed('https://cambio-uruguay.com/alquileres-uruguay?barrio=x')).toBe(
      true
    )
    expect(clarityReferrerAllowed('https://www.google.com/')).toBe(true)
    expect(clarityReferrerAllowed('')).toBe(true)
    expect(clarityReferrerAllowed(undefined)).toBe(true)
  })
})

describe('the cap on filter changes in the big directories', () => {
  const at = (fullPath: string) => ({ path: fullPath.split(/[?#]/)[0]!, fullPath })

  it('stops recording from the fourth query-only navigation, and a path change resumes it', () => {
    let count = 0
    let from = at('/alquileres-uruguay')
    const kept: boolean[] = []
    for (const query of ['?a=1', '?a=2', '?a=3', '?a=4', '?a=5']) {
      const to = at(`/alquileres-uruguay${query}`)
      count = clarityQueryRestarts(count, from, to)
      kept.push(clarityKeepRecording({ path: to.path, queryChanges: count }))
      from = to
    }
    expect(kept).toEqual([true, true, true, false, false])
    expect(CLARITY_MAX_QUERY_RESTARTS).toBe(3)

    const elsewhere = at('/alquileres/montevideo-pocitos-1abc')
    count = clarityQueryRestarts(count, from, elsewhere)
    expect(count).toBe(0)
    expect(clarityKeepRecording({ path: elsewhere.path, queryChanges: count })).toBe(true)
    // Back on the directory, it records again.
    count = clarityQueryRestarts(count, elsewhere, at('/alquileres-uruguay?a=6'))
    expect(clarityKeepRecording({ path: '/alquileres-uruguay', queryChanges: count })).toBe(true)
  })

  it('ignores hash-only changes, as Clarity does, and leaves other pages uncapped', () => {
    expect(
      clarityQueryRestarts(2, at('/autos-usados-uruguay?x=1'), at('/autos-usados-uruguay?x=1#f'))
    ).toBe(2)
    expect(clarityKeepRecording({ path: '/en/motos-usadas-uruguay', queryChanges: 4 })).toBe(false)
    expect(
      clarityKeepRecording({ path: '/equipar-casa-uruguay/productos/heladera', queryChanges: 9 })
    ).toBe(false)
    expect(clarityKeepRecording({ path: '/precio/aceite', queryChanges: 40 })).toBe(true)
  })
})

describe('sampling and tags', () => {
  it('records every rental visit and half of the rest, decided by a stable seed', () => {
    expect(claritySampleRate('alquileres')).toBe(1)
    expect(claritySampleRate('otra')).toBe(0.5)
    expect(claritySampled('alquileres', 0.99)).toBe(true)
    expect(claritySampled('cotizaciones', 0.49)).toBe(true)
    expect(claritySampled('cotizaciones', 0.5)).toBe(false)
    // The same seed, the same answer every time.
    expect([1, 2, 3].map(() => claritySampled('guias', 0.73))).toEqual([false, false, false])
    expect(parseClaritySeed('0.4321')).toBe(0.4321)
    expect(parseClaritySeed('1')).toBeNull()
    expect(parseClaritySeed('-0.2')).toBeNull()
    expect(parseClaritySeed(null)).toBeNull()
  })

  it('names the family and the locale from a closed vocabulary', () => {
    expect(clarityFamily('/')).toBe('inicio')
    expect(clarityFamily('/en/')).toBe('inicio')
    expect(clarityFamily('/alquileres-uruguay')).toBe('alquileres')
    expect(clarityFamily('/alquileres/montevideo-cordon-1rt3jaj')).toBe('alquileres')
    expect(clarityFamily('/alquiler/montevideo/pocitos')).toBe('alquileres')
    expect(clarityFamily('/autos-usados-uruguay/precios/gol')).toBe('autos')
    expect(clarityFamily('/motos-usadas-uruguay')).toBe('motos')
    expect(clarityFamily('/venta-viviendas-uruguay')).toBe('viviendas')
    expect(clarityFamily('/casa/brou')).toBe('cotizaciones')
    expect(clarityFamily('/herramientas/aguinaldo')).toBe('herramientas')
    expect(clarityFamily('/una-ruta-que-alguien-escribio')).toBe('otra')
    expect(clarityLocale('/en/dolar-hoy')).toBe('en')
    expect(clarityLocale('/fr')).toBe('fr')
    expect(clarityLocale('/dolar-hoy')).toBe('es')
  })

  it('lets through only the shapes the site writes', () => {
    expect(clarityEventName('feedback_view')).toBe('feedback_view')
    expect(clarityEventName('cta_rental-feedback-si')).toBe('cta_rental-feedback-si')
    expect(clarityEventName('Bulevar Artigas 1234')).toBeNull()
    expect(clarityEventName('x'.repeat(101))).toBeNull()
    expect(clarityTagValue('por-defecto')).toBe('por-defecto')
    expect(clarityTagValue('a@b.com')).toBeNull()
    expect(clarityTagValue('')).toBeNull()
  })
})

describe('forgetting Clarity in this browser', () => {
  it('deletes both cookies host-only and on every parent domain', () => {
    expect(clarityForgetCookies('cambio-uruguay.com')).toEqual([
      '_clck=; Max-Age=0; path=/',
      '_clck=; Max-Age=0; path=/; domain=.cambio-uruguay.com',
      '_clsk=; Max-Age=0; path=/',
      '_clsk=; Max-Age=0; path=/; domain=.cambio-uruguay.com',
    ])
    expect(clarityForgetCookies('www.cambio-uruguay.com')).toContain(
      '_clsk=; Max-Age=0; path=/; domain=.cambio-uruguay.com'
    )
    expect(clarityForgetCookies('localhost')).toEqual([
      '_clck=; Max-Age=0; path=/',
      '_clsk=; Max-Age=0; path=/',
    ])
  })
})
