import { rewriteOgImageIslandUrl } from '../utils/ogImageIsland'

// nuxt-og-image 5 addresses its template island with a hash Nuxt 4.4 no longer accepts, so every
// social image answered 400 "Invalid island request hash" (see server/utils/ogImageIsland.ts).
// Only the island fetch the module makes through `event.$fetch` while serving an OG image is
// re-addressed; the path is not rewritten in a request hook because h3 has already captured the
// request path by then, and every other island request keeps Nuxt's own check untouched.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('request', event => {
    if (!/^\/__og-image__\/(?:image|static)\//.test(event.path) || !event.$fetch) return
    const original = event.$fetch
    event.$fetch = ((request: unknown, options?: unknown) =>
      (original as (request: unknown, options?: unknown) => unknown)(
        rewriteOgImageIslandUrl(request, options) ?? request,
        options
      )) as typeof event.$fetch
  })
})
