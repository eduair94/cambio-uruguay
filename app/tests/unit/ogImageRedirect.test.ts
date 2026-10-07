import { describe, expect, it } from 'vitest'
import {
  ogImageFallbackPath,
  ogImageNetworkFailure,
  ogImageRedirectTarget,
} from '../../server/utils/ogImageRedirect'

describe('ogImageRedirectTarget', () => {
  it('points the image of a redirected page at the destination image, same flavor and extension', () => {
    expect(
      ogImageRedirectTarget(
        '/__og-image__/image/sucursales/brou/CERRO%20LARGO/og.png',
        '/sucursales/brou/cerro-largo'
      )
    ).toBe('/__og-image__/image/sucursales/brou/cerro-largo/og.png')
    expect(
      ogImageRedirectTarget(
        '/__og-image__/static/en/casa/Brou/og.jpg?v=2',
        'https://cambio-uruguay.com/en/casa/brou/'
      )
    ).toBe('/__og-image__/static/en/casa/brou/og.jpg?v=2')
    expect(ogImageRedirectTarget('/__og-image__/image/inicio/og.png', '/')).toBe(
      '/__og-image__/image/og.png'
    )
  })

  it('refuses other hosts, loops, internal routes and non-OG requests', () => {
    const og = '/__og-image__/image/sucursales/brou/montevideo/og.png'
    for (const location of [
      'https://example.invalid/sucursales/brou',
      '//example.invalid/x',
      'javascript:alert(1)',
      '/sucursales/brou/montevideo/',
      '/__og-image__/image/x/og.png',
      '/__nuxt_island/x.json',
      '',
      null,
      undefined,
    ])
      expect(ogImageRedirectTarget(og, location)).toBeNull()
    expect(ogImageRedirectTarget('/sucursales/brou', '/sucursales/brou/montevideo')).toBeNull()
  })
})

describe('ogImageNetworkFailure', () => {
  it('finds the socket code under the fetch wrapper, as undici reports it', () => {
    const socket = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' })
    const fetchFailed = new TypeError('fetch failed', { cause: socket })
    expect(ogImageNetworkFailure(new Error('[GET] <no response>', { cause: fetchFailed }))).toBe(
      'ETIMEDOUT'
    )
    expect(ogImageNetworkFailure({ code: 'UND_ERR_CONNECT_TIMEOUT' })).toBe(
      'UND_ERR_CONNECT_TIMEOUT'
    )
  })

  it('is null for errors that are not the network, and survives a cyclic chain', () => {
    expect(ogImageNetworkFailure(new TypeError('Cannot read properties of null'))).toBeNull()
    expect(ogImageNetworkFailure({ code: 'ERR_HTTP_HEADERS_SENT' })).toBeNull()
    expect(ogImageNetworkFailure(null)).toBeNull()
    const loop: { cause?: unknown } = {}
    loop.cause = loop
    expect(ogImageNetworkFailure(loop)).toBeNull()
  })
})

describe('ogImageFallbackPath', () => {
  it('gives car adverts their own card and every other page the general one', () => {
    expect(ogImageFallbackPath('/__og-image__/image/autos-usados-uruguay/fb-1/og.png')).toBe(
      '/img/og-autos.png'
    )
    expect(ogImageFallbackPath('/__og-image__/image/pt/autos-usados-uruguay/ml-1/og.jpg?v=2')).toBe(
      '/img/og-autos.png'
    )
    expect(ogImageFallbackPath('/__og-image__/static/en/casa/brou/og.jpeg')).toBe('/img/og.png')
    expect(ogImageFallbackPath('/__og-image__/image/og.png')).toBe('/img/og.png')
  })

  it('is null for debugging views and for anything that is not an OG image request', () => {
    expect(ogImageFallbackPath('/__og-image__/image/casa/brou/og.svg')).toBeNull()
    expect(ogImageFallbackPath('/__og-image__/image/casa/brou/og.json')).toBeNull()
    expect(ogImageFallbackPath('/casa/brou')).toBeNull()
  })
})
