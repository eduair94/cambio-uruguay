import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import es from '../../i18n/locales/json/es.json'
import en from '../../i18n/locales/json/en.json'
import pt from '../../i18n/locales/json/pt.json'

describe('newsletter i18n compiles (no vue-i18n syntax errors)', () => {
  for (const [loc, msg] of [
    ['es', es],
    ['en', en],
    ['pt', pt],
  ] as const) {
    it(`${loc} newsletter keys render`, () => {
      const i18n = createI18n({ legacy: false, locale: loc, messages: { [loc]: msg } })
      const t = i18n.global.t as (k: string) => string
      // Touch every newsletter key — a bad @/{} would throw at compile time.
      for (const k of Object.keys((msg as Record<string, Record<string, string>>).newsletter)) {
        expect(typeof t(`newsletter.${k}`)).toBe('string')
      }
      expect(t('newsletter.emailPlaceholder')).toContain('@')
    })
  }
})
