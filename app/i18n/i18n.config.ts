import { EXTRA_LOCALE_CODES } from '../utils/locales'

/**
 * vue-i18n options. The one thing set here: an extra locale (utils/locales.ts) falls back to
 * SPANISH. Its global messages are complete by construction (scripts/i18n/translate.mjs keeps
 * the English text for a key Google could not translate), so this exists for the 60-odd
 * components that carry their OWN messages (`useI18n({ useScope: 'local', messages })`, only
 * es/en/pt): without it they print raw keys ("findAddress") on a French page.
 *
 * Spanish and not English (until 2026-11-06 it was English): the page translation memory
 * (utils/autoTranslate.ts) is built from the Spanish pages, so a Spanish fallback comes out in
 * the page's language once the job has translated it, while an English one stayed English for
 * good — the cookie banner greeted every visitor of the 36 extra locales in English. The cost is
 * the same as before: an extra-locale page loads one more message file, es.json instead of
 * en.json. es, en and pt have no fallback, as before.
 */
export default defineI18nConfig(() => ({
  fallbackLocale: Object.fromEntries(EXTRA_LOCALE_CODES.map(code => [code, ['es']])),
}))
