import { hash } from 'ohash'

/**
 * Compatibility between nuxt-og-image 5 and the island hash check of Nuxt 4.4.
 *
 * Every social image is rendered by fetching its template as a server island,
 * `/__nuxt_island/<Component>_<hash>.json?props=…`. Nuxt 4.4 (`@nuxt/nitro-server`) started
 * REJECTING an island whose hash is not `computeIslandHash(name, props, context, source)`, with
 * "400 Invalid island request hash", while nuxt-og-image 5.1.x (latest 5.x is 5.1.13) still builds
 * the old `hash([name, props])`. Since the Nuxt 4.4 upgrade (2026-09-30) every
 * `/__og-image__/image/…/og.png` answered 400: ~99k log lines on 2026-10-05, and no share preview
 * anywhere on the site. Sentry never saw it because 4xx are not reported.
 *
 * The fix is narrow on purpose: only the module's own island fetch, made through `event.$fetch`
 * from inside an OG image request, is re-addressed with the hash Nuxt expects. The hash is not a secret — it is computed from the
 * public name and props — so this grants nothing a client could not do; it just speaks the newer
 * dialect. Remove it with the move to a nuxt-og-image release that calls Nuxt's own hash.
 */

const ISLAND_URL = /^\/__nuxt_island\/([A-Za-z][\w.-]*)_([A-Za-z0-9-]+)\.json$/

/** `computeIslandHash` + `filterIslandProps` of nuxt/dist/app/island-hash.js, pinned by a test. */
export function nuxtIslandHash(name: string, props: Record<string, unknown>): string {
  const filtered: Record<string, unknown> = {}
  for (const key in props) if (!key.startsWith('data-v-')) filtered[key] = props[key]
  return hash([name, filtered, {}, undefined]).replace(/[-_]/g, '')
}

/**
 * The island URL Nuxt accepts for this og-image island fetch, or `null` to leave it untouched:
 * anything that is not an island URL or carries anything but the `props` the module sends.
 *
 * The hash is computed from `JSON.parse(props)`, which is what Nuxt's handler validates against
 * (it parses the same query string with `destr`). The module's own hash is NOT required to match:
 * it is taken from the props object BEFORE stringifying, so a prop holding `undefined` would make
 * the two differ and leave that card broken. The caller restricts this to OG image requests.
 */
export function rewriteOgImageIslandUrl(request: unknown, options: unknown): string | null {
  if (typeof request !== 'string') return null
  const match = request.match(ISLAND_URL)
  if (!match) return null
  const params = (options as { params?: Record<string, unknown> } | undefined)?.params
  if (!params || typeof params !== 'object') return null
  const keys = Object.keys(params)
  if (keys.length !== 1 || keys[0] !== 'props' || typeof params.props !== 'string') return null
  let props: unknown
  try {
    props = JSON.parse(params.props)
  } catch {
    return null
  }
  if (!props || typeof props !== 'object' || Array.isArray(props)) return null
  const [, name, sent] = match as unknown as [string, string, string]
  const expected = nuxtIslandHash(name, props as Record<string, unknown>)
  return expected === sent ? null : `/__nuxt_island/${name}_${expected}.json`
}
