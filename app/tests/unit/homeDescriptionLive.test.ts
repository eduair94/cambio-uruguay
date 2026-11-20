import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'

/**
 * La descripción viva de la home: las dos cifras del día en el idioma de la página.
 *
 * Estuvo escrita en castellano dentro de `pages/index.vue`, así que /en y /pt la servían tal cual
 * ("se vende desde $40.63" en la página inglesa) y decía "Datos del BCU" cuando las cifras son las
 * pizarras de las casas. Se mide con cifras de tres dígitos enteros, el peor caso plausible, como
 * el título en `seoTitleBudget.test.ts`.
 */
const SAMPLE = { sell: '140,65', buy: '140,00', count: 45 }
const MAX_DESCRIPTION = 160

const LOCALES = [
  ['es', es, '$140,65'],
  ['en', en, '$U 140,65'],
  ['pt', pt, '$U 140,65'],
] as const

function translator(code: string, messages: unknown) {
  const i18n = createI18n({
    legacy: false,
    locale: code,
    messages: { [code]: messages as Record<string, unknown> },
    missingWarn: false,
    fallbackWarn: false,
  })
  return i18n.global.t as (key: string, params?: Record<string, unknown>) => string
}

describe('descripción viva de la home', () => {
  for (const [code, messages, sellWithSymbol] of LOCALES) {
    it(`${code}: entra en el SERP y lleva las dos cifras con el símbolo del idioma`, () => {
      const t = translator(code, messages)
      const text = t('seo.homeDescriptionLive', SAMPLE)

      expect(text).not.toBe('seo.homeDescriptionLive')
      expect(text.length, text).toBeLessThanOrEqual(MAX_DESCRIPTION)
      expect(text).toContain(sellWithSymbol)
      expect(text).toContain('140,00')
      expect(text).toContain('45')
      // Las cifras son las pizarras de las casas; el BCU no publica la de ninguna.
      expect(text).not.toMatch(/BCU/)
    })
  }

  it('cada idioma tiene su propio texto', () => {
    const texts = LOCALES.map(([code, messages]) =>
      translator(code, messages)('seo.homeDescriptionLive', SAMPLE)
    )
    expect(new Set(texts).size).toBe(LOCALES.length)
  })

  it('la página arma la descripción con la plantilla, no con texto escrito a mano', () => {
    const source = readFileSync(join(__dirname, '..', '..', 'pages', 'index.vue'), 'utf8')
    expect(source).toContain("t('seo.homeDescriptionLive'")
    expect(source).not.toMatch(/Datos del BCU actualizados/)
  })
})
