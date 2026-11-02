import { createResolver, defineNuxtModule } from '@nuxt/kit'
import type { NuxtPage } from '@nuxt/schema'
import { EXTRA_LOCALE_CODES, hasExtraLocales } from '../utils/locales'

const EXTRA_ROUTE_NAME = new RegExp(`___(${EXTRA_LOCALE_CODES.join('|')})$`)

/**
 * Drop the extra-locale copies of every route that is not in `EXTRA_LOCALE_ROUTES`.
 *
 * @nuxtjs/i18n localizes every page into every locale. For the core locales that is the
 * design (Spanish-only pages answer /en and /pt with a Spanish canonical); for the extra ones
 * it would be ~320 route records per locale in the entry chunk and thousands of crawlable
 * Spanish pages under French or Japanese URLs. Exported for the unit test.
 */
export function pruneExtraLocaleRoutes(pages: NuxtPage[]): number {
  let removed = 0
  for (let index = pages.length - 1; index >= 0; index--) {
    const page = pages[index]!
    const match = page.name ? EXTRA_ROUTE_NAME.exec(page.name) : null
    if (!match) continue
    const base = page.path.slice(match[1]!.length + 1) || '/'
    if (hasExtraLocales(base)) continue
    pages.splice(index, 1)
    removed++
  }
  return removed
}

/**
 * Local modules are installed after the ones listed in nuxt.config (Nuxt's `resolveModules`),
 * so the hooks below are registered after @nuxtjs/i18n's — with one catch: i18n registers its
 * pages hook from inside its own `modules:done` handler. Ours is therefore registered from
 * `modules:done` too (handlers run in registration order, i18n's first), or it would run before
 * the routes are localized and prune nothing. Measured on the first build that got this wrong:
 * 322 `___fr` routes in the entry chunk, and the Nitro build ran out of a 10 GB heap.
 */
export default defineNuxtModule({
  meta: { name: 'extra-locales' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.hook('modules:done', () => {
      const pagesHook =
        nuxt.options.experimental.scanPageMeta === 'after-resolve'
          ? 'pages:resolved'
          : 'pages:extend'
      nuxt.hook(pagesHook, pages => {
        const removed = pruneExtraLocaleRoutes(pages)
        if (!removed) throw new Error('[extra-locales] no extra-locale route to prune: hook order?')
      })
    })

    // `useLocalePath` → i18n/localePathFallback.ts (Spanish URL when the current locale has no page).
    nuxt.hook('imports:sources', sources => {
      const i18nSource = sources.find(
        source =>
          typeof source.from === 'string' &&
          /@nuxtjs[\\/]i18n[\\/]/.test(source.from) &&
          source.imports.includes('useLocalePath')
      )
      if (!i18nSource) {
        throw new Error(
          '[extra-locales] @nuxtjs/i18n no longer registers useLocalePath as a source'
        )
      }
      i18nSource.imports = i18nSource.imports.filter(name => name !== 'useLocalePath')
      sources.push({ from: resolve('../i18n/localePathFallback'), imports: ['useLocalePath'] })
    })
  },
})
