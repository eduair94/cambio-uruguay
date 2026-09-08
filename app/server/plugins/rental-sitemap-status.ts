import { createError, setResponseHeader } from 'h3'

// sitemap 7.4 converts failed data sources into an empty array. Reject that
// cold/empty catalogue before either the index or XML cache can save a false
// successful result. The hook sees the full source, before chunk slicing.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('sitemap:input', context => {
    if (!/^rentals(?:-\d+)?$/.test(context.sitemapName) || context.urls.length) return
    if (context.event) setResponseHeader(context.event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental sitemap is temporarily unavailable',
    })
  })
})
