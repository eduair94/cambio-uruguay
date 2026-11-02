import { EXTRA_LOCALES, isExtraLocale } from '~/utils/locales'
import { overlayContent, type ContentTranslation } from '~/utils/contentOverlay'

// One lazy chunk per tree and locale: a French reader downloads the French copy of this page
// only, and the es/en/pt pages never load any of it.
const loaders = import.meta.glob<ContentTranslation>('../i18n/content/*/*.json', {
  import: 'default',
})

/**
 * The machine translation of a content tree (i18n/content/<name>/<locale>.json) for the
 * current locale, or null in the core locales. Resolved during SSR and carried in the payload.
 */
export async function useContentTranslation(name: string) {
  const { locale } = useI18n()
  const { data } = await useAsyncData(
    () => `content-translation:${name}:${locale.value}`,
    async () => {
      if (!isExtraLocale(locale.value)) return null
      const load = loaders[`../i18n/content/${name}/${locale.value}.json`]
      return load ? await load() : null
    }
  )
  return data
}

/**
 * The tree an extra-locale reader sees: the English tree with every fresh translation laid
 * over it, and its `locale`/`lang` fields (where the tree has them) set to the reader's.
 */
export function translatedTree<T extends object>(
  english: T,
  code: string,
  translation: ContentTranslation | null | undefined
): T {
  // A copy even without a translation: the fields below must never land on the shared tree.
  const tree = { ...(overlayContent(english, translation) as Record<string, unknown>) }
  const language = EXTRA_LOCALES.find(locale => locale.code === code)?.language ?? code
  if ('locale' in tree) tree.locale = code
  if ('lang' in tree) tree.lang = language
  return tree as T
}
