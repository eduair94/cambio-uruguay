// El título con la cifra del día en /cotizacion/<moneda> y /dolar/<departamento> (y /en, /pt).
// Vigila lo que puede salir mal: un título que no entra (y pierde la cifra en el corte), una
// descripción que se pasa, el separador decimal del idioma equivocado, y un mensaje que olvida su
// símbolo o usa un "|" (el separador de plurales de vue-i18n se come lo que sigue).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { currencyDisplayName, listCurrencySlugs, currencyFromSlug } from '../../utils/currencyPages'
import {
  bestOf,
  DESCRIPTION_MAX,
  pickDescription,
  pickTitle,
  seoRate,
  titleFits,
} from '../../utils/liveRateSeo'

const APP = resolve(__dirname, '../..')
type Lang = 'es' | 'en' | 'pt'
const LANGS: Lang[] = ['es', 'en', 'pt']
const messages = Object.fromEntries(
  LANGS.map(l => [l, JSON.parse(readFileSync(resolve(APP, `i18n/locales/json/${l}.json`), 'utf8'))])
) as Record<Lang, any>

/** Interpolación mínima de vue-i18n para estos mensajes (sólo `{name}`). */
const fill = (msg: string, args: Record<string, string | number>) =>
  msg.replace(/\{(\w+)\}/g, (_, k) => String(args[k]))

describe('seoRate', () => {
  it('sigue el separador del idioma', () => {
    expect(seoRate(40.634, 'es')).toBe('40,63')
    expect(seoRate(40.634, 'pt')).toBe('40,63')
    expect(seoRate(40.634, 'en')).toBe('40.63')
  })
  it('cuatro decimales bajo 1 y sin decimales cuando se pide', () => {
    expect(seoRate(0.00561, 'es')).toBe('0,0056')
    expect(seoRate(4023.85, 'es', 0)).toBe('4.024')
    expect(seoRate(4023.85, 'en', 0)).toBe('4,024')
  })
})

describe('bestOf', () => {
  it('mínimo de venta y máximo de compra entre casas, sin ceros ni nulos', () => {
    expect(
      bestOf([
        { buy: 40, sell: 41.5 },
        { buy: 40.2, sell: 41.2 },
        { buy: null, sell: 0 },
        { buy: 0, sell: null },
      ])
    ).toEqual({ sell: 41.2, buy: 40.2, count: 2 })
    expect(bestOf([])).toEqual({ sell: null, buy: null, count: 0 })
  })
})

describe('pickTitle / pickDescription', () => {
  it('gana el primero que entra con la marca; si ninguno, el traducido', () => {
    expect(pickTitle([null, 'Corto'], 'Genérico')).toBe('Corto')
    expect(pickTitle(['x'.repeat(50), 'y'.repeat(40)], 'G')).toBe('y'.repeat(40))
    expect(pickTitle(['x'.repeat(50)], 'G')).toBe('G')
    expect(pickDescription('z'.repeat(DESCRIPTION_MAX + 1), 'F')).toBe('F')
  })
})

describe('los mensajes', () => {
  for (const lang of LANGS) {
    const sym = lang === 'es' ? '$' : '$U '
    const c = messages[lang].cotizacion
    const d = messages[lang].dolarDepto

    it(`${lang}: llevan su símbolo y ningún "|"`, () => {
      for (const key of ['metaTitleLive', 'metaTitleLiveShort', 'metaDescriptionLive']) {
        expect(c[key]).toContain(`${sym}{sell}`)
        expect(d[key]).toContain(`${sym}{sell}`)
      }
      expect(c.metaTitleGold).toContain(`${sym}{gram}`)
      for (const m of [...Object.values(c), ...Object.values(d)] as string[]) {
        expect(m).not.toContain('|')
      }
    })

    it(`${lang}: el dólar, el real, el euro y el oro tienen título vivo que entra`, () => {
      for (const slug of ['dolar', 'real', 'euro']) {
        const currency = currencyDisplayName(currencyFromSlug(slug)!, lang)
        const args = { currency, sell: seoRate(slug === 'real' ? 8.2 : 41.25, lang) }
        const title = pickTitle(
          [fill(c.metaTitleLive, args), fill(c.metaTitleLiveShort, args)],
          'FALLBACK'
        )
        expect(title, `${lang} ${slug}`).not.toBe('FALLBACK')
        expect(titleFits(title)).toBe(true)
      }
      const gram = seoRate(4023.85, lang, 0)
      const gold = pickTitle(
        [fill(c.metaTitleGold, { gram }), fill(c.metaTitleGoldShort, { gram })],
        'FALLBACK'
      )
      expect(gold).not.toBe('FALLBACK')
    })

    it(`${lang}: Rivera, Montevideo y Maldonado tienen título vivo`, () => {
      for (const department of ['Rivera', 'Montevideo', 'Maldonado', 'Treinta Y Tres']) {
        const args = { department, sell: seoRate(41.25, lang) }
        const title = pickTitle(
          [fill(d.metaTitleLive, args), fill(d.metaTitleLiveShort, args)],
          'FALLBACK'
        )
        if (department !== 'Treinta Y Tres' || lang !== 'en') expect(title).not.toBe('FALLBACK')
        if (title !== 'FALLBACK') expect(titleFits(title)).toBe(true)
      }
    })

    it(`${lang}: la descripción viva de cada moneda entra o cae al genérico`, () => {
      for (const slug of listCurrencySlugs()) {
        const currency = currencyDisplayName(currencyFromSlug(slug)!, lang)
        const live = fill(c.metaDescriptionLive, {
          currency,
          sell: seoRate(41.25, lang),
          buy: seoRate(40.1, lang),
          count: 37,
        })
        const out = pickDescription(live, 'FALLBACK')
        expect(out === 'FALLBACK' || out.length <= DESCRIPTION_MAX).toBe(true)
      }
      // Las cuatro que más se buscan no pueden caer al genérico.
      for (const slug of ['dolar', 'real', 'euro', 'peso-argentino']) {
        const currency = currencyDisplayName(currencyFromSlug(slug)!, lang)
        const live = fill(c.metaDescriptionLive, {
          currency,
          sell: seoRate(41.25, lang),
          buy: seoRate(40.1, lang),
          count: 37,
        })
        expect(live.length, `${lang} ${slug}: ${live}`).toBeLessThanOrEqual(DESCRIPTION_MAX)
      }
    })
  }
})
