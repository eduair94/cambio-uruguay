import { coinsContent } from '../../utils/coins'
import { withdrawContent } from '../../utils/withdrawCash'

/**
 * The content trees that scripts/i18n/translate.mjs machine-translates for the extra locales,
 * by the name their page passes to `useContentTranslation()`. Always the ENGLISH tree: it is
 * the source the translations are hashed against (utils/contentOverlay.ts).
 */
export const CONTENT_SOURCES = {
  withdraw: withdrawContent.en,
  coins: coinsContent.en,
}
