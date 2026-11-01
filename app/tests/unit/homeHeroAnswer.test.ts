import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'

/**
 * El párrafo de respuesta del hero de la home, en el idioma de la página.
 *
 * Estaba escrito en castellano dentro de `pages/index.vue`, así que /en y /pt lo mostraban tal
 * cual, y decía que los datos "se basan en el registro del BCU" cuando son las pizarras de cada
 * casa: el BCU no publica la cotización de ninguna.
 */
const SAMPLE = { date: '1', sell: '40,63', buy: '40,10', count: 42 }

const LOCALES = [
  ['es', es, '$40,63'],
  ['en', en, '$U 40,63'],
  ['pt', pt, '$U 40,63'],
] as const

function translate(code: string, messages: unknown): string {
  const i18n = createI18n({
    legacy: false,
    locale: code,
    messages: { [code]: messages as Record<string, unknown> },
    missingWarn: false,
    fallbackWarn: false,
  })
  return (i18n.global.t as (key: string, params?: Record<string, unknown>) => string)(
    'home.heroAnswer',
    SAMPLE
  )
}

describe('respuesta del hero de la home', () => {
  for (const [code, messages, sellWithSymbol] of LOCALES) {
    it(`${code}: lleva las dos cifras con el símbolo del idioma y no atribuye los datos al BCU`, () => {
      const text = translate(code, messages)
      expect(text).not.toBe('home.heroAnswer')
      expect(text).toContain(sellWithSymbol)
      expect(text).toContain('40,10')
      expect(text).toContain('42')
      expect(text).not.toMatch(/BCU|Banco Central/)
    })
  }

  it('cada idioma tiene su propio texto', () => {
    const texts = LOCALES.map(([code, messages]) => translate(code, messages))
    expect(new Set(texts).size).toBe(LOCALES.length)
  })

  it('la página arma el párrafo con la plantilla, no con texto escrito a mano', () => {
    const source = readFileSync(join(__dirname, '..', '..', 'pages', 'index.vue'), 'utf8')
    expect(source).toContain("t('home.heroAnswer'")
    expect(source).not.toMatch(/el dólar estadounidense se vende desde/)
  })
})
