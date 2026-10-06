import { describe, expect, it } from 'vitest'
import { ogImageRedirectTarget } from '../../server/utils/ogImageRedirect'

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
