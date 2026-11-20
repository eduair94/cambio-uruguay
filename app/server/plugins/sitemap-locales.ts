import { isEmbargoed } from '../../utils/autoTranslate'
import { allTranslatedPages, embargoedRoutes } from '../utils/autoTranslateStore'
import { keepCanonicalLocales } from '../utils/sitemapLocales'

// Runs on every sitemap's full input — the custom sources AND the module's own `nuxt:pages`
// source, which adds a URL per locale for every static page file by itself. Filtering only in
// /api/__sitemap__/urls would leave those in place. The machine-translated pages come from the
// translation memory (server/utils/autoTranslateStore, cached per worker); a database that does
// not answer leaves the sitemap exactly as it was before the translations existed.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('sitemap:input', async context => {
    const [pages, routes] = await Promise.all([
      allTranslatedPages().catch(() => new Map<string, string[]>()),
      embargoedRoutes().catch(() => [] as string[]),
    ])
    context.urls = keepCanonicalLocales(context.urls, {
      pages,
      isEmbargoed: path => isEmbargoed(path, routes),
    })
  })
})
