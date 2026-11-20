// What services/clarity.ts needs on every page: the shapes a value sent to Microsoft Clarity may
// take, the query parameters it must never send, and the cookies it leaves behind.
//
// PURE and small on purpose. composables/useTrack.ts imports the service, so this file ships in
// the entry chunk to every visitor, with Clarity on or off. The route lists, the families and the
// consent decision live in utils/clarityPolicy.ts, which only the on-demand runtime
// (services/clarityRuntime.ts) imports; it re-exports these for the tests and the runtime.

/**
 * Query parameters that make a URL private: Firebase's sign-in links (`oobCode`, `apiKey`), OAuth
 * hand-offs (`code`, `state`), tokens, and the rental directory's reference address (`refLat`,
 * `refLng`, `refLabel`). A page whose URL carries one is never recorded (clarityRouteAllowed), and
 * every URL Clarity does send goes out with their values replaced by `*na*` (its `drop` list).
 */
export const CLARITY_PRIVATE_QUERY_PARAMS: readonly string[] = Object.freeze([
  'oobCode',
  'apiKey',
  'code',
  'state',
  'token',
  // Discord's hand-off: a Firebase custom token (see utils/analyticsUrl.ts).
  'ct',
  'refLat',
  'refLng',
  'refLabel',
  // /mi-lista's share token: a list whose zone can be the sharer's position.
  'l',
])

/** The custom-event name Clarity may receive: the site's own `snake_case`/`kebab-case` names only. */
export function clarityEventName(name: unknown): string | null {
  return typeof name === 'string' && /^[\w-]{1,100}$/.test(name) ? name : null
}

/** A tag key or value: the same closed shape, and under Clarity's 255-character limit. */
export function clarityTagValue(value: unknown): string | null {
  return typeof value === 'string' && /^[\w.-]{1,100}$/.test(value) ? value : null
}

/** The cookies Clarity writes on the first party. CLID lives on clarity.ms and is Microsoft's. */
export const CLARITY_COOKIES: readonly string[] = Object.freeze(['_clck', '_clsk'])

/**
 * The `document.cookie` assignments that delete Clarity's cookies on `hostname`. Clarity writes
 * them on the widest domain the browser accepts (`.cambio-uruguay.com`); a cookie only goes away
 * with the same path and domain it was written with, so this clears the host-only copy and every
 * parent domain of two labels or more (the browser ignores the ones it would never have accepted).
 */
export function clarityForgetCookies(hostname: string): string[] {
  const labels = typeof hostname === 'string' && hostname ? hostname.split('.') : []
  const domains = ['']
  for (let index = labels.length - 2; index >= 0; index--)
    domains.push(`; domain=.${labels.slice(index).join('.')}`)
  return CLARITY_COOKIES.flatMap(name =>
    domains.map(domain => `${name}=; Max-Age=0; path=/${domain}`)
  )
}
