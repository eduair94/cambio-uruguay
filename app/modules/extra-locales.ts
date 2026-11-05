import { createResolver, defineNuxtModule } from '@nuxt/kit'
import type { NuxtPage } from '@nuxt/schema'

/**
 * How many routes @nuxtjs/i18n compacted into one `/:locale(en|pt|fr|…)/<path>` record.
 *
 * Every page answers in all 35 locales (utils/locales.ts) through `experimental.compactRoutes`:
 * one record for Spanish and one regex record for every other locale, instead of one per locale.
 * Measured on the production entry chunk (2026-11-02): one locale on every route is 321 records
 * and ~56 KB that every visitor downloads, so 34 non-default locales spelled out would have been
 * ~1.9 MB. Exported for the unit test.
 */
export function countCompactRoutes(pages: NuxtPage[]): number {
  return pages.filter(page => /^\/:locale\(/.test(page.path)).length
}

/**
 * Local modules are installed after the ones listed in nuxt.config (Nuxt's `resolveModules`), so
 * the hooks below are registered after @nuxtjs/i18n's — with one catch: i18n registers its pages
 * hook from inside its own `modules:done` handler, so ours is registered from `modules:done` too
 * (handlers run in registration order, i18n's first) or it would see the routes before i18n does.
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
      // A silent fall back to one record per locale would put ~1.9 MB in the entry chunk.
      nuxt.hook(pagesHook, pages => {
        if (!countCompactRoutes(pages)) {
          throw new Error('[extra-locales] @nuxtjs/i18n generated no compact route')
        }
      })
    })

    // `useLocalePath` → i18n/localePathFallback.ts: a page restricted to Spanish
    // (`defineI18nRoute({ locales: ['es'] })`) resolves to its Spanish URL from any locale.
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
