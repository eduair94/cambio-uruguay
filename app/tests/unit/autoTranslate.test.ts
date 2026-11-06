import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { keepCanonicalLocales } from '../../server/utils/sitemapLocales'
import {
  AUTO_TRANSLATE_LOCALES,
  announcedLocales,
  canonicalTarget,
  spanishOgImage,
  untranslatedRedirect,
  decodeEntities,
  fillTemplate,
  hashText,
  htmlSegments,
  isEmbargoed,
  isTranslatable,
  normalizeText,
  scanHtml,
  segmentKey,
  translateHtml,
  translateSegment,
} from '../../utils/autoTranslate'
import { LOCALE_CODES } from '../../utils/locales'

const APP = resolve(__dirname, '../..')
// Keys are hashes of TEMPLATES (numbers already replaced by {n}), which is what the job stores.
const memory = (entries: Record<string, string>) =>
  new Map(Object.entries(entries).map(([template, text]) => [hashText(template), text]))

describe('auto-translate: segments and keys', () => {
  it('hashes deterministically, in the same 53-bit space on every runtime', () => {
    expect(hashText('Hoy el dólar está a {0}')).toBe(hashText('Hoy el dólar está a {0}'))
    expect(hashText('a')).not.toBe(hashText('b'))
    expect(hashText('Hoy el dólar está a {0}')).toMatch(/^[0-9a-z]{1,12}$/)
  })

  it('collapses whitespace the way a text node reads', () => {
    expect(normalizeText('  El dólar\n\t hoy  ')).toBe('El dólar hoy')
    expect(normalizeText('a b')).toBe('a b')
  })

  it('translates prose, not codes, figures, links or e-mails', () => {
    expect(isTranslatable('El dólar hoy')).toBe(true)
    expect(isTranslatable('USD')).toBe(false)
    expect(isTranslatable('$U 40,63')).toBe(false)
    expect(isTranslatable('BROU')).toBe(false)
    expect(isTranslatable('https://cambio-uruguay.com/mapa')).toBe(false)
    expect(isTranslatable('hola@cambio-uruguay.com')).toBe(false)
    expect(isTranslatable('x')).toBe(false)
  })

  it('keeps numbers out of the key and puts the live ones back', () => {
    const today = segmentKey('Hoy el dólar está a 40,63 y ayer a 40.10')
    const tomorrow = segmentKey('Hoy el dólar está a 41,02 y ayer a 40,63')
    expect(today.template).toBe('Hoy el dólar está a {0} y ayer a {1}')
    expect(today.hash).toBe(tomorrow.hash)
    expect(today.numbers).toEqual(['40,63', '40.10'])
    expect(fillTemplate('Today {0}, yesterday {1}', tomorrow.numbers)).toBe(
      'Today 41,02, yesterday 40,63'
    )
    expect(fillTemplate('Today {2}', ['1'])).toBeNull()
    expect(segmentKey('Al 02/11/2026 a las 10:30').numbers).toEqual(['02/11/2026', '10:30'])
  })

  it('translates a segment through the memory, or not at all', () => {
    const map = memory({ 'Hoy el dólar está a {0}': 'Today the dollar is at {0}' })
    expect(translateSegment('Hoy el dólar está a 39,90', map)).toBe('Today the dollar is at 39,90')
    expect(translateSegment('Otra frase', map)).toBeNull()
    expect(translateSegment('USD', map)).toBeNull()
  })
})

describe('auto-translate: the HTML', () => {
  const html =
    '<div id="__nuxt"><!--[--><h1 title="Cotización de hoy">El dólar hoy:  <strong>40,63</strong> pesos</h1>' +
    '<p>Hoy el dólar está a 40,63 &amp; sube</p><code>no traducir</code>' +
    '<span translate="no">Cambio Fenix es nombre</span><p class="a notranslate">nada que ver</p>' +
    '<script>var a = "<p>dentro de un script</p>"</script><img alt="Mapa de casas" src="/a.png">' +
    '<p data-notranslate><b>tampoco esto</b> acá</p><br><p>Después del br</p><!--]--></div>'

  it('finds text nodes and translatable attributes, and skips code, scripts and opt-outs', () => {
    expect(htmlSegments(html).map(key => key.template)).toEqual([
      'Cotización de hoy',
      'El dólar hoy:',
      'pesos',
      'Hoy el dólar está a {0} & sube',
      'Mapa de casas',
      'Después del br',
    ])
  })

  it('decodes entities like the DOM does', () => {
    expect(decodeEntities('a &amp; b &#39;c&#39; &#x41; &quot;d&quot; &lt;e&gt;')).toBe(
      'a & b \'c\' A "d" <e>'
    )
  })

  it('replaces what the memory knows, keeps whitespace, and escapes the result', () => {
    const map = memory({
      'Cotización de hoy': "Today's rate",
      'El dólar hoy:': 'The dollar today:',
      'Hoy el dólar está a {0} & sube': 'Today the dollar is at {0} <rising>',
    })
    const result = translateHtml(html, map)
    expect(result.html).toContain('title="Today\'s rate"')
    expect(result.html).toContain('The dollar today:  <strong>40,63</strong> pesos')
    expect(result.html).toContain('<p>Today the dollar is at 40,63 &lt;rising&gt;</p>')
    expect(result.html).toContain('<code>no traducir</code>')
    expect(result.html).toContain('"<p>dentro de un script</p>"')
    expect(Object.keys(result.used)).toHaveLength(3)
    expect(result.translatedChars).toBeLessThan(result.chars)
  })

  it('is a no-op without translations', () => {
    expect(translateHtml(html, new Map()).html).toBe(html)
  })

  it('never reads a piece of a tag as text', () => {
    for (const piece of scanHtml(html)) {
      expect(html.slice(piece.start, piece.end)).not.toMatch(/[<>]/)
    }
  })
})

describe('auto-translate: what a translated page may claim', () => {
  it('reserves a page with the semantics of the change log', () => {
    const routes = ['/historico/*', '/guias/', '/', '/en/retirar-efectivo-uruguay']
    expect(isEmbargoed('/historico/brou', routes)).toBe(true)
    expect(isEmbargoed('/historico', routes)).toBe(false)
    expect(isEmbargoed('/guias', routes)).toBe(true)
    expect(isEmbargoed('/guias/una', routes)).toBe(true)
    expect(isEmbargoed('/', routes)).toBe(true)
    expect(isEmbargoed('/mapa', routes)).toBe(false)
    expect(isEmbargoed('/retirar-efectivo-uruguay', routes)).toBe(true)
  })

  it('announces English and Portuguese everywhere, an extra locale only where it has copy', () => {
    const none = { translated: [], embargoed: false }
    expect(announcedLocales('/guias/una', none)).toEqual(['en', 'pt'])
    expect(announcedLocales('/mapa', none)).toContain('fr')
    expect(announcedLocales('/guias/una', { translated: ['fr', 'en'], embargoed: false })).toEqual([
      'en',
      'pt',
      'fr',
    ])
    expect(announcedLocales('/guias/una', { translated: ['fr'], embargoed: true })).toEqual([
      'en',
      'pt',
    ])
  })

  it('points the canonical at the page once translated, at Spanish when an extra locale has nothing', () => {
    const translated = { translated: ['en', 'fr'], embargoed: false }
    const none = { translated: [], embargoed: false }
    expect(canonicalTarget('en', '/guias/una', translated)).toBe('self')
    expect(canonicalTarget('fr', '/guias/una', translated)).toBe('self')
    expect(canonicalTarget('es', '/guias/una', translated)).toBe('keep')
    expect(canonicalTarget('pt', '/guias/una', none)).toBe('keep')
    expect(canonicalTarget('de', '/guias/una', none)).toBe('spanish')
    expect(canonicalTarget('de', '/mapa', none)).toBe('keep')
    expect(canonicalTarget('en', '/guias/una', { translated: ['en'], embargoed: true })).toBe(
      'keep'
    )
  })

  it('sends an extra locale that does not have the page to the Spanish one, unrendered', () => {
    const none = { translated: [], embargoed: false }
    expect(untranslatedRedirect('fr', '/autos-usados-uruguay/ml-1', none)).toBe(
      '/autos-usados-uruguay/ml-1'
    )
    expect(untranslatedRedirect('fr', '/guias/una', { translated: ['fr'], embargoed: false })).toBe(
      null
    )
    expect(untranslatedRedirect('fr', '/guias/una', { translated: ['fr'], embargoed: true })).toBe(
      '/guias/una'
    )
    // vue-i18n pages are whole in every locale; English and Portuguese always answered.
    expect(untranslatedRedirect('fr', '/pizarra', none)).toBe(null)
    expect(untranslatedRedirect('en', '/guias/una', none)).toBe(null)
    expect(untranslatedRedirect('es', '/guias/una', none)).toBe(null)
  })

  it('shares the Spanish image in the extra locales, and keeps the English one', () => {
    const base = 'https://cambio-uruguay.com/__og-image__/image'
    expect(spanishOgImage(`${base}/de/guias/una/og.png`)).toBe(`${base}/guias/una/og.png`)
    expect(spanishOgImage(`${base}/ja/og.png`)).toBe(`${base}/og.png`)
    expect(spanishOgImage(`${base}/en/guias/una/og.png`)).toBe(`${base}/en/guias/una/og.png`)
    // A page whose own slug starts like a locale code is not one.
    expect(spanishOgImage(`${base}/frontera/rivera/og.png`)).toBe(`${base}/frontera/rivera/og.png`)
  })

  it('translates into every locale of the site but Spanish, each once', () => {
    for (const code of AUTO_TRANSLATE_LOCALES) expect(LOCALE_CODES).toContain(code)
    expect(AUTO_TRANSLATE_LOCALES).not.toContain('es')
    expect(new Set(AUTO_TRANSLATE_LOCALES).size).toBe(AUTO_TRANSLATE_LOCALES.length)
    expect([...AUTO_TRANSLATE_LOCALES].sort()).toEqual(
      LOCALE_CODES.filter(code => code !== 'es').sort()
    )
  })
})

describe('auto-translate: the sitemap', () => {
  const spanish = (path: string) => ({
    loc: path,
    changefreq: 'weekly',
    alternatives: [
      { hreflang: 'es-ES', href: path },
      { hreflang: 'en-US', href: `/en${path}` },
      { hreflang: 'pt-PT', href: `/pt${path}` },
      { hreflang: 'x-default', href: path },
    ],
  })

  it('adds the translated URLs of a Spanish-only page; extra hreflang stays in the <head>', () => {
    const urls = keepCanonicalLocales([spanish('/guias/una'), { loc: '/de/guias/una' }], {
      pages: new Map([['/guias/una', ['en', 'fr']]]),
      isEmbargoed: () => false,
    })
    expect(urls.map(url => url.loc)).toEqual(['/guias/una', '/en/guias/una', '/fr/guias/una'])
    const hreflangs = (url: unknown) =>
      (url as { alternatives?: Array<{ hreflang: string }> }).alternatives?.map(
        alternative => alternative.hreflang
      )
    expect(hreflangs(urls[0])).toEqual(['es-ES', 'en-US', 'x-default'])
    expect(hreflangs(urls[1])).toEqual(['es-ES', 'en-US', 'x-default'])
    expect(hreflangs(urls[2])).toBeUndefined()
    expect((urls[2] as { changefreq?: string }).changefreq).toBe('weekly')
  })

  it('strips the alternates of a translated extra URL that a source already listed', () => {
    const urls = keepCanonicalLocales(
      [spanish('/guias/una'), { loc: '/fr/guias/una', alternatives: spanish('/x').alternatives }],
      { pages: new Map([['/guias/una', ['fr']]]), isEmbargoed: () => false }
    )
    expect(urls.map(url => url.loc)).toEqual(['/guias/una', '/fr/guias/una'])
    expect((urls[1] as { alternatives?: unknown }).alternatives).toBeUndefined()
  })

  it('leaves a reserved page exactly as it was', () => {
    const urls = keepCanonicalLocales([spanish('/guias/una'), { loc: '/en/guias/una' }], {
      pages: new Map([['/guias/una', ['en', 'fr']]]),
      isEmbargoed: () => true,
    })
    expect(urls.map(url => url.loc)).toEqual(['/guias/una'])
  })
})

describe('auto-translate: wiring', () => {
  it('translates the HTML in app:rendered, before the payload and the head are written', () => {
    const plugin = readFileSync(join(APP, 'plugins/auto-translate.ts'), 'utf8')
    expect(plugin).toContain("nuxtApp.hooks.hook('app:rendered'")
    expect(plugin).toContain("head.hooks.hook('tags:resolve'")
    expect(plugin).toContain('new MutationObserver')
  })
})
