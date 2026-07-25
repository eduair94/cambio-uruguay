const BUILD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Compatibility endpoint for browser tabs that loaded an older Nuxt bundle.
 *
 * New builds disable the client app manifest, but a tab opened before that
 * change can still request its build-specific metadata while the CDN serves
 * cached HTML. Returning the route-rule matcher lets that client finish
 * hydration instead of replacing the page with Nuxt's error view.
 */
export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id') || ''

  if (!BUILD_ID_PATTERN.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Build manifest not found' })
  }

  setResponseHeader(event, 'cache-control', 'no-store, max-age=0')

  return {
    id,
    timestamp: Date.now(),
    matcher: {
      static: {
        '/sitemap.xml': {
          redirect: '/sitemap_index.xml',
        },
      },
      wildcard: {},
      dynamic: {},
    },
    prerendered: [],
  }
})
