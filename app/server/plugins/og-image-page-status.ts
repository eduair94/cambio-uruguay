import { sendRedirect, setResponseHeader, type H3Event } from 'h3'
import {
  ogImageFallbackPath,
  ogImageNetworkFailure,
  ogImageRedirectTarget,
} from '../utils/ogImageRedirect'

// nuxt-og-image 5 turns a missing page into a 500 when its error HTML has no
// OG payload. Keep the page's actual 404/410 without hiding a successful SSR
// response that unexpectedly lost its metadata. Observe the module's existing
// fetch: no extra render, shared fetch patch, or second directory query.
export default defineNitroPlugin(nitroApp => {
  const sourceStatuses = new WeakMap<H3Event, number>()
  const sourceLocations = new WeakMap<H3Event, string>()

  nitroApp.hooks.hook('request', event => {
    const match = event.path
      .split('?')[0]
      .match(/^\/__og-image__\/(?:image|static)(\/.*)?\/og\.(?:png|jpe?g|svg|html|json)$/)
    if (!match || !event.fetch) return
    const sourcePath = match[1] || '/'
    // What the module's page read saw, kept for the error report. The remaining
    // failures are pages answering 2xx without their OG payload — or reads that
    // never resolved — and the two are indistinguishable in the error itself.
    const context = event.context as { ogSourceStatus?: string }
    context.ogSourceStatus = 'unobserved'
    const fetchPage = event.fetch.bind(event)
    event.fetch = async (input, init) => {
      const response = await fetchPage(input, init)
      if ((String(input).split('?')[0] || '/') === sourcePath) {
        sourceStatuses.set(event, response.status)
        context.ogSourceStatus = String(response.status)
        const location = response.headers?.get?.('location')
        if (location) sourceLocations.set(event, location)
      }
      return response
    }
  })

  // Nitro's original handler captures and renders the error. Correct its HTTP
  // status before both actions; changing a response hook would report a false
  // 500 to Sentry before eventually sending the right status to the caller.
  //
  // Any 4xx from the page (not only 404/410) means "there is nothing to draw",
  // never "the renderer broke": a 403 or 451 advert should not page Sentry as a
  // 500 either. The three strings are every failure the installed extractor can
  // raise; the third one ("Failed to parse") is what 2026-09-22's autos outage
  // logged, when a crashed setup turned the page's 404 into a 500 upstream. That
  // case is fixed at the page and stays 500 here on purpose (the source was 5xx);
  // the pattern is listed so a future module that reports 4xx through it is
  // relabelled too instead of slipping past this guard again.
  //
  // A 3xx page (an old slug, an upper-case department) has no card of its own either: the module
  // read the redirect's empty body and reported "missing the #nuxt-og-image-options script tag" as
  // a 500 (Sentry CAMBIO-URUGUAY-BACKEND-9 and -11, `og_source: 301`, from crawlers that kept the
  // old og:image). That card is the destination's, so the image request is redirected to the
  // destination's image — same flavor, same extension — and to a 404 when the target is unusable.
  //
  // A page that answered 2xx but whose card could not be drawn because a request to another host
  // failed (the module's emoji lookup on api.iconify.design, Sentry CAMBIO-URUGUAY-BACKEND-18)
  // gets the site's static card through a temporary, uncached redirect: the share preview still
  // has an image, the next request draws the real card again, and an outage of somebody else's
  // host is not reported as our 500. Any other failure of a readable page stays a 500.
  const onError = nitroApp.h3App.options.onError
  nitroApp.h3App.options.onError = (error, event) => {
    const sourceStatus = sourceStatuses.get(event)
    if (sourceStatus !== undefined && sourceStatus >= 200 && sourceStatus < 300) {
      const networkCode = ogImageNetworkFailure(error)
      const fallback = networkCode ? ogImageFallbackPath(event.path) : null
      if (fallback) {
        console.warn(`[og-image] ${networkCode} while drawing the card; serving ${fallback}`)
        setResponseHeader(event, 'cache-control', 'no-store')
        return sendRedirect(event, fallback, 302)
      }
    }
    const extractorFailure =
      error.statusCode === 500 &&
      /^\[Nuxt OG Image\] (?:HTML response from .+ is missing the #nuxt-og-image-options script tag\.|Failed to read the path .+ for og-image extraction, returning no HTML\.|Failed to parse .+ for og-image extraction\.)/.test(
        error.statusMessage || ''
      )
    if (
      extractorFailure &&
      sourceStatus !== undefined &&
      sourceStatus >= 300 &&
      sourceStatus < 400
    ) {
      const target = ogImageRedirectTarget(event.path, sourceLocations.get(event))
      if (target) return sendRedirect(event, target, 301)
      error.statusCode = 404
      error.statusMessage = 'OG image not found'
      error.message = 'OG image not found'
    }
    if (
      sourceStatus !== undefined &&
      sourceStatus >= 400 &&
      sourceStatus < 500 &&
      extractorFailure
    ) {
      error.statusCode = sourceStatus
      error.statusMessage = 'OG image not found'
      error.message = 'OG image not found'
    }
    return onError?.call(nitroApp.h3App.options, error, event)
  }
})
