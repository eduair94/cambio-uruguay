import type { H3Event } from 'h3'

// nuxt-og-image 5 turns a missing page into a 500 when its error HTML has no
// OG payload. Keep the page's actual 404/410 without hiding a successful SSR
// response that unexpectedly lost its metadata. Observe the module's existing
// fetch: no extra render, shared fetch patch, or second directory query.
export default defineNitroPlugin(nitroApp => {
  const sourceStatuses = new WeakMap<H3Event, number>()

  nitroApp.hooks.hook('request', event => {
    const match = event.path
      .split('?')[0]
      .match(/^\/__og-image__\/(?:image|static)(\/.*)?\/og\.(?:png|jpe?g|svg|html|json)$/)
    if (!match || !event.fetch) return
    const sourcePath = match[1] || '/'
    const fetchPage = event.fetch.bind(event)
    event.fetch = async (input, init) => {
      const response = await fetchPage(input, init)
      if ((String(input).split('?')[0] || '/') === sourcePath) {
        sourceStatuses.set(event, response.status)
      }
      return response
    }
  })

  // Nitro's original handler captures and renders the error. Correct its HTTP
  // status before both actions; changing a response hook would report a false
  // 500 to Sentry before eventually sending the right status to the caller.
  const onError = nitroApp.h3App.options.onError
  nitroApp.h3App.options.onError = (error, event) => {
    const sourceStatus = sourceStatuses.get(event)
    if (
      (sourceStatus === 404 || sourceStatus === 410) &&
      error.statusCode === 500 &&
      /^\[Nuxt OG Image\] (?:HTML response from .+ is missing the #nuxt-og-image-options script tag\.|Failed to read the path .+ for og-image extraction, returning no HTML\.)/.test(
        error.statusMessage || ''
      )
    ) {
      error.statusCode = sourceStatus
      error.statusMessage = 'OG image not found'
      error.message = 'OG image not found'
    }
    return onError?.call(nitroApp.h3App.options, error, event)
  }
})
