import { keepCanonicalLocales } from '../utils/sitemapLocales'

// Runs on every sitemap's full input — the custom sources AND the module's own `nuxt:pages`
// source, which adds /en and /pt for every static page file by itself. Filtering only in
// /api/__sitemap__/urls would leave those in place.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('sitemap:input', context => {
    context.urls = keepCanonicalLocales(context.urls)
  })
})
