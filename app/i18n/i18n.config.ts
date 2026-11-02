import { EXTRA_LOCALE_CODES } from '../utils/locales'

/**
 * vue-i18n options. The one thing set here: an extra locale (utils/locales.ts) falls back to
 * English. Its global messages are complete by construction (scripts/i18n/translate.mjs keeps
 * the English text for a key Google could not translate), so this exists for the 60-odd
 * components that carry their OWN messages (`useI18n({ useScope: 'local', messages })`, only
 * es/en/pt): without it they print raw keys ("findAddress") on a French page. The cost is that
 * an extra-locale page also loads en.json; es, en and pt have no fallback, as before.
 */
export default defineI18nConfig(() => ({
  fallbackLocale: Object.fromEntries(EXTRA_LOCALE_CODES.map(code => [code, ['en']])),
}))
