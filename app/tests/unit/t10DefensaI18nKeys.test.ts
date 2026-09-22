// Las claves i18n que las páginas de /historico y /sucursales ahora consultan en
// lugar de literales en castellano. Las tres páginas las piden con `t()`; si una
// falta en un idioma, vue-i18n imprime la clave cruda en la descripción que
// Google muestra — que es peor que el literal que se sacó.
//
// Las claves llegan por `integration/T10-defensa.md` (los JSON de idioma son
// archivos compartidos): este archivo está en rojo hasta que ese fragmento se
// aplique, y ese rojo es la señal de que falta aplicarlo.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALES = ['es', 'en', 'pt'] as const
const messages = Object.fromEntries(
  LOCALES.map(locale => [
    locale,
    JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'i18n', 'locales', 'json', `${locale}.json`), 'utf8')
    ) as Record<string, unknown>,
  ])
) as Record<(typeof LOCALES)[number], Record<string, unknown>>

const get = (locale: (typeof LOCALES)[number], path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], messages[locale])

/** Each key with the interpolation params the page passes: a missing `{param}` prints nothing. */
const KEYS: Record<string, string[]> = {
  'seo.historicalOriginLead': ['origin', 'buy', 'sell'],
  'seo.historicalOriginLeadOther': ['origin', 'parts'],
  'seo.historicalOriginPairPart': ['code', 'buy', 'sell'],
  'seo.historicalOriginUnitPart': ['code', 'value'],
  'seo.sucursalesLead': ['origin', 'buy', 'sell'],
  sucursalesHeading: ['origin', 'location'],
  sucursalesHeadingAll: ['origin'],
  sucursalesCountSource: ['count'],
  sucursalesBcuLink: [],
  'historical.recentChangesTitle': ['origin', 'currency'],
  'historical.recentChangesIntro': ['origin'],
  'historical.recentChangesAll': [],
}

describe('claves i18n del paquete T10 (historico/sucursales)', () => {
  it.each(Object.entries(KEYS))('%s existe en es/en/pt con sus parámetros', (key, params) => {
    for (const locale of LOCALES) {
      const value = get(locale, key)
      expect(typeof value, `${key} falta en ${locale}`).toBe('string')
      for (const param of params) {
        expect(value as string, `${key} en ${locale} no interpola {${param}}`).toContain(
          `{${param}}`
        )
      }
      // vue-i18n toma «|» como separador de plural y trunca el mensaje.
      expect(value as string).not.toContain('|')
    }
  })

  it('las tres versiones de la primera frase están en su idioma, no en castellano', () => {
    expect(get('en', 'seo.historicalOriginLead')).not.toMatch(/hoy|compra|venta/)
    expect(get('pt', 'seo.historicalOriginLead')).not.toMatch(/hoy|venta/)
    expect(get('en', 'seo.sucursalesLead')).not.toMatch(/hoy|compra|venta/)
    expect(get('pt', 'seo.sucursalesLead')).not.toMatch(/hoy|venta/)
    expect(get('es', 'sucursalesHeading')).toContain('horarios')
    expect(get('en', 'sucursalesHeading')).toMatch(/hours/)
    expect(get('pt', 'sucursalesHeading')).toContain('horários')
  })
})
