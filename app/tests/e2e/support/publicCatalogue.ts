import type { Page } from '@playwright/test'

/**
 * The property directories read their catalogue from the app's own `/api` routes, which are backed
 * by the app's MongoDB. CI has no database, so a local server answers those reads with an error
 * and the page shows "Volver a intentar" instead of cards — eight specs that need a REAL result set
 * (not fixtures) went red on every run for that reason alone.
 *
 * Those specs read the public catalogue instead: same endpoints, same payload, served by
 * production. Only GET reads are forwarded; anything that writes stays on the server under test.
 * The initial SSR read cannot be intercepted, so a spec that uses this must load its results with
 * a client-side action (a sort change, a filter) — which is what these specs already do.
 */
const catalogueOrigin = process.env.E2E_CATALOGUE_ORIGIN || 'https://cambio-uruguay.com'

export async function usePublicCatalogue(page: Page) {
  await page.route(
    /\/api\/(?:rentals|property-sales|property-opportunities)(?:[/?]|$)/,
    async route => {
      const request = route.request()
      const source = new URL(request.url())
      if (request.method() !== 'GET' || source.origin === catalogueOrigin) return route.fallback()
      // A read still in flight when the test ends (a map tile of results, a prefetch) rejects with
      // "Test ended"; that is not a failure of the page. A catalogue that is really unreachable
      // still shows up: the page renders its error state and the spec's own assertions go red.
      try {
        const response = await route.fetch({
          url: new URL(source.pathname + source.search, catalogueOrigin).toString(),
        })
        await route.fulfill({ response })
      } catch {
        await route.abort().catch(() => {})
      }
    }
  )
}
