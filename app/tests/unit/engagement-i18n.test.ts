import { describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { readerFollowUpMessages } from '../../i18n/locales/readerFollowUp'
import { engagementAccountMessages } from '../../i18n/locales/engagementAccount'
import { externalNavigationMessages } from '../../i18n/locales/externalNavigation'

describe('engagement translations', () => {
  for (const [section, messages] of Object.entries({
    readerFollowUp: readerFollowUpMessages,
    engagementAccount: engagementAccountMessages,
    externalNavigation: externalNavigationMessages,
  })) {
    it(`${section} has matching, renderable keys in Spanish, English and Portuguese`, () => {
      const expectedKeys = Object.keys(messages.es).sort()
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        for (const locale of ['es', 'en', 'pt'] as const) {
          expect(Object.keys(messages[locale]).sort()).toEqual(expectedKeys)
          const i18n = createI18n({
            legacy: false,
            locale,
            messages: { [locale]: messages[locale] },
          })
          for (const key of expectedKeys) {
            const translated = i18n.global.t(key, { seconds: 10 })
            expect(translated, `${section}.${locale}.${key}`).not.toBe(key)
            expect(translated.trim().length).toBeGreaterThan(0)
          }
        }
        expect(error).not.toHaveBeenCalled()
        expect(warn).not.toHaveBeenCalled()
      } finally {
        error.mockRestore()
        warn.mockRestore()
      }
    })
  }
})
