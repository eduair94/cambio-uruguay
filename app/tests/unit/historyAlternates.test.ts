// Los dos ayudantes que hacen coherente el hreflang de una variante plegada de
// /historico/<casa>/<moneda>/<tipo> con su canónica.
//
// Medido en producción el 2026-09-22 sobre /historico/brou/usd/ebrou: la canónica
// apuntaba al padre y los siete `rel=alternate hreflang` del layout (x-default
// incluido) apuntaban a la variante misma. Google ignora el hreflang de una URL
// no canónica y la contradicción resta al grupo entero. La página no puede
// borrarlos (unhead los deduplica por `id`), así que los re-apunta: para eso los
// ids tienen que ser EXACTAMENTE los que emite @nuxtjs/i18n desde el layout.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HREFLANG_LOCALES,
  hreflangLinksFor,
  isFoldedHistoryType,
} from '../../utils/historyCanonical'

describe('isFoldedHistoryType', () => {
  it('sin segmento de tipo no hay variante que plegar', () => {
    expect(isFoldedHistoryType()).toBe(false)
    expect(isFoldedHistoryType(undefined)).toBe(false)
    expect(isFoldedHistoryType(null)).toBe(false)
    expect(isFoldedHistoryType('')).toBe(false)
    expect(isFoldedHistoryType('   ')).toBe(false)
  })

  it.each(['billete', 'BILLETE', 'cable', 'interbancario', 'ebrou', 'EBROU'])(
    '%s es una variante plegada, en cualquier caja',
    type => {
      expect(isFoldedHistoryType(type)).toBe(true)
    }
  )
})

describe('hreflangLinksFor', () => {
  const urlFor = (code: string) =>
    code === 'es' ? 'https://cambio-uruguay.com/p' : `https://cambio-uruguay.com/${code}/p`
  const links = hreflangLinksFor(urlFor)

  it('emite los mismos siete ids que el layout: x-default, por código y por ISO', () => {
    expect(links.map(link => link.id)).toEqual([
      'i18n-xd',
      'i18n-alt-es',
      'i18n-alt-es-ES',
      'i18n-alt-en',
      'i18n-alt-en-US',
      'i18n-alt-pt',
      'i18n-alt-pt-PT',
    ])
    for (const link of links) expect(link.rel).toBe('alternate')
  })

  it('x-default es el idioma por defecto del sitio, sin prefijo', () => {
    expect(links[0]).toEqual({
      id: 'i18n-xd',
      rel: 'alternate',
      hreflang: 'x-default',
      href: 'https://cambio-uruguay.com/p',
    })
  })

  it('el par código/ISO de cada idioma comparte la URL de ese idioma', () => {
    for (const { code, iso } of HREFLANG_LOCALES) {
      const byCode = links.find(link => link.hreflang === code)
      const byIso = links.find(link => link.hreflang === iso)
      expect(byCode?.href).toBe(urlFor(code))
      expect(byIso?.href).toBe(urlFor(code))
    }
  })

  it('los ISO son los que declara nuxt.config.ts, que es de donde el layout los saca', () => {
    const config = readFileSync(join(__dirname, '..', '..', 'nuxt.config.ts'), 'utf8')
    for (const { code, iso } of HREFLANG_LOCALES) {
      expect(config).toContain(`{ code: '${code}', iso: '${iso}'`)
    }
  })
})
