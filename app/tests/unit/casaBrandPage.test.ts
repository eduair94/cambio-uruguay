// Una página por marca: la consulta que trae sólo el nombre de una casa («cambio principal»,
// «cotización brou») tiene UNA URL que la contesta, y las demás dicen su intención.
//
// Medido en Search Console (20/9–17/10/2026): «cambio principal» aparecía con doce URLs propias
// entre la posición 4 y la 10, porque cuatro familias se presentaban como la de la marca y abrían la
// descripción con la misma frase. Ver utils/casaBrandPage.ts para el porqué de cada decisión. Este
// test fija las señales que lo arreglan, plantilla por plantilla, para que la próxima no vuelva a
// presentarse como la de la marca sin que CI lo note.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { casaBrandPath, casaHubPath, compareBrandTableCodes } from '../../utils/casaBrandPage'

const PAGES = join(__dirname, '..', '..', 'pages')
const read = (...parts: string[]) => readFileSync(join(PAGES, ...parts), 'utf8')
// Sin los comentarios HTML: los que documentan el cambio citan el texto viejo a propósito.
const templateOf = (src: string) =>
  src.slice(0, src.indexOf('<script')).replace(/<!--[\s\S]*?-->/g, '')
const scriptOf = (src: string) => src.slice(src.indexOf('<script'))

const LOCALES = [
  ['es', es],
  ['en', en],
  ['pt', pt],
] as const

function translator(code: 'es' | 'en' | 'pt', messages: unknown) {
  const i18n = createI18n({
    legacy: false,
    locale: code,
    messages: { [code]: messages as Record<string, unknown> },
    missingWarn: false,
    fallbackWarn: false,
  })
  return i18n.global.t as (key: string, params?: Record<string, unknown>) => string
}

/** Espejo del titleTemplate de app.vue (ver seoTitleBudget.test.ts). */
const withBrand = (title: string) =>
  /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`

describe('la página de marca de una casa', () => {
  it('es /historico/<casa>, la que Google ya elige para la consulta del nombre', () => {
    expect(casaBrandPath('cambio_principal')).toBe('/historico/cambio_principal')
    expect(casaBrandPath('brou')).toBe('/historico/brou')
  })

  it('una casa sin cotización hoy cae en su ficha: su página de marca respondería 404', () => {
    expect(casaHubPath('brou', true)).toBe('/historico/brou')
    expect(casaHubPath('cambio_minas', false)).toBe('/casa/cambio_minas')
  })

  it('la tabla de la página de marca pone el dólar primero, no ARS/BRL/EUR por alfabeto', () => {
    const codes = ['ARS', 'BRL', 'CHF', 'EUR', 'GBP', 'PYG', 'USD']
    expect([...codes].sort(compareBrandTableCodes)).toEqual([
      'USD',
      'EUR',
      'BRL',
      'ARS',
      'CHF',
      'GBP',
      'PYG',
    ])
    expect(compareBrandTableCodes('usd', 'ARS')).toBeLessThan(0)
  })
})

describe.each(LOCALES)('los mensajes dicen la intención de cada página (%s)', (code, messages) => {
  const t = translator(code, messages)

  it('la página de marca abre por la marca y ya no promete un histórico que no tiene', () => {
    const title = t('seo.historicalOriginTitle', { origin: 'Cambio Principal' })
    expect(title.startsWith('Cambio Principal')).toBe(true)
    expect(title).not.toMatch(/hist[oó]r/i)
    // La descripción también arranca por la marca: «Dólar en X hoy» es la frase de la página
    // del dólar, y que las dos abrieran igual era parte del reparto.
    const lead = t('seo.historicalOriginLead', { origin: 'BROU', buy: '39,00', sell: '41,20' })
    expect(lead.startsWith('BROU')).toBe(true)
    const dollarLead = t('seo.historicalDetailDescriptionLive', {
      origin: 'BROU',
      currency: 'Dólar',
      buy: '39,00',
      sell: '41,20',
    })
    expect(dollarLead.startsWith('BROU')).toBe(false)
  })

  it('la página de una moneda abre por la moneda, no por la casa', () => {
    const title = t('seo.historicalDetailTitle', { origin: 'BROU', currency: 'Dólar' })
    expect(title.startsWith('Dólar')).toBe(true)
    expect(title).toContain('BROU')
  })

  it('el título de la página de marca entra en el SERP con la casa de nombre más largo', () => {
    // «Cambio Aguerrebere» (18 caracteres) es el nombre más largo que imprime esta plantilla, que
    // lo toma de `formatOriginName`; el BCU tiene título propio y no pasa por esta clave.
    for (const origin of ['BROU', 'Cambio Principal', 'Cambio Aguerrebere']) {
      expect(withBrand(t('seo.historicalOriginTitle', { origin })).length).toBeLessThanOrEqual(60)
    }
  })

  it('el título de la moneda entra en el SERP en las casas de nombre corto', () => {
    // BROU es, lejos, la casa con más consultas de «dólar + marca» (10.045 impresiones en 28 días
    // contra 1.030 de Itaú, la segunda). Los nombres largos se pasan por pocos caracteres, igual que
    // con el título anterior («Cambio Principal Real hoy: cotización y evolución», 66 con la
    // marca): lo que se corta es la cola, y la moneda y la casa van primero.
    for (const origin of ['BROU', 'Itaú', 'BBVA', 'Gales', 'Prex']) {
      const title = withBrand(t('seo.historicalDetailTitle', { origin, currency: 'Dólar' }))
      expect(title.length, title).toBeLessThanOrEqual(60)
    }
  })

  it('el ancla hacia la página de marca lleva el nombre de la casa', () => {
    expect(t('historical.brandLink', { origin: 'Cambio Principal' })).toContain('Cambio Principal')
    expect(t('historical.originHeading', { origin: 'Gales' })).toContain('Gales')
  })

  it('un solo local no dice «1 locales»', () => {
    const one = { origin: 'Cambio Principal', location: 'Rivera', count: 1 }
    for (const key of [
      'seo.sucursalesInLocationOne',
      'seo.sucursalesWithCountOne',
      'seo.sucursalesLocationDescriptionOne',
      'seo.sucursalesDescriptionOne',
    ]) {
      const text = t(key, one)
      expect(text, key).not.toBe(key)
      expect(text, key).not.toMatch(/\b1\b/)
    }
  })
})

describe('cada plantilla enlaza la marca a la página de marca', () => {
  it('la ficha /casa/<casa> declara canónica a la página de marca y re-apunta sus hreflang', () => {
    const script = scriptOf(read('casa', '[origin]', 'index.vue'))
    expect(script).toContain('casaHubPath(origin.value, rates.value.length > 0)')
    expect(script).toContain(
      'const canonicalUrl = computed(() => `https://cambio-uruguay.com${localePath(brandPath.value)}`)'
    )
    expect(script).toContain('hreflangLinksFor(')
    expect(script).toContain(
      "link: [{ rel: 'canonical', href: canonicalUrl.value }, ...brandAlternates.value]"
    )
    // La canónica fija en castellano, que valía también para /en y /pt, ya no existe.
    expect(script).not.toContain('`https://cambio-uruguay.com/casa/${origin.value}`')
  })

  it('la ficha enlaza la página de marca con el nombre de la casa', () => {
    const template = templateOf(read('casa', '[origin]', 'index.vue'))
    expect(template).toContain(':to="localePath(brandPath)"')
    expect(template).toContain("$t('historical.brandLink', { origin: casaName })")
  })

  it('la página de marca ya no le cede la marca a la ficha', () => {
    const template = templateOf(read('historico', '[origin]', 'index.vue'))
    expect(template).not.toContain('Ver todo sobre')
    expect(template).toContain("$t('historical.originHeading', { origin: originName })")
    expect(template).toContain("$t('historical.branchesLink', { origin: originName })")
    expect(template).toContain("$t('historical.fichaLink', { origin: originName })")
    expect(template).toContain(':custom-key-sort="{ code: compareBrandTableCodes }"')
  })

  it('la página de una moneda manda su botón a la página de marca', () => {
    const src = read('historico', '[origin]', '[currency]', '[[type]].vue')
    expect(templateOf(src)).toContain(':to="localePath(brandHubPath)"')
    expect(templateOf(src)).toContain("$t('historical.brandLink', { origin: exchangeHouseName })")
    expect(templateOf(src)).not.toContain('/casa/${route.params.origin}')
    expect(templateOf(src)).toContain(':to="localePath(mirrorSourcePath(mirror))"')
  })

  it('las sucursales mandan su enlace de marca a la página de marca', () => {
    const template = templateOf(read('sucursales', '[origin]', '[[location]].vue'))
    expect(template).not.toContain('Ver todo sobre')
    expect(template).toContain(':to="localePath(casaHubPath(origin, Boolean(usdToday)))"')
    expect(template).toContain("$t('historical.brandLink', { origin: exchangeHouseName })")
  })

  it('las páginas de intención enlazan la página de marca, no la ficha', () => {
    const src = read('casa', '[origin]', '[intent].vue')
    const template = templateOf(src)
    // El hub de la casa ya no se enlaza directo; las páginas hermanas (/casa/<casa>/<intención>) sí.
    expect(template).not.toContain('localePath(`/casa/${origin}`)')
    expect(template).toContain('localePath(`/casa/${origin}/${other}`)')
    expect(template).toContain(':to="localePath(brandPath)"')
    // El chip «Histórico» apuntaba a la misma URL que «X: cotización de hoy»: dos anclas, un destino.
    expect(template).not.toContain('localePath(`/historico/${origin}`)')
    expect(scriptOf(src)).toContain('item: `https://cambio-uruguay.com${brandPath.value}`')
  })

  it('el sitemap ya no declara la ficha, que no es canónica', () => {
    const sitemap = readFileSync(
      join(__dirname, '..', '..', 'server', 'api', '__sitemap__', 'urls.get.ts'),
      'utf8'
    )
    expect(sitemap).not.toContain('addUrlsForAllLocales(`/casa/${origin}`')
    expect(sitemap).toContain('loc: `/casa/${origin}/${intent}`')
  })
})
