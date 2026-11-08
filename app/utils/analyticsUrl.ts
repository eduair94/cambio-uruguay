/**
 * Query parameters that must never reach an analytics or ad tag inside a page URL.
 *
 * GA4 and the Google Ads tag read `document.location` for every `page_view`, so whatever is still
 * in the address bar when gtag starts goes to Google. Measured in production on 2026-11-08: a
 * Discord sign-in lands on `/cuenta?ct=<Firebase custom token>` and the first `page_view` carried
 * the token (`dl=…/cuenta?ct=…`) — a credential that signs in as that person for about an hour —
 * before `plugins/discordToken.client.ts` removed it; an emailed sign-in link's one-time `oobCode`
 * was never removed at all. `plugins/gtag-init.client.ts` waits until none of these is in the
 * address bar; the code that consumes each one removes it.
 */

/** Sign-in hand-offs (Firebase custom token, emailed-link code and its companions). */
const SIGN_IN_PARAMS = [
  'ct',
  'authError',
  'oobCode',
  'apiKey',
  'continueUrl',
  'tenantId',
  'link',
  'deep_link_id',
]
/** Old rental links' reference point (`useRentalReference` removes it once the page mounts). */
const REFERENCE_PARAMS = ['refLat', 'refLng', 'refLabel']
/**
 * The email unsubscribe links' token (`/api/alerts/unsubscribe`, `/api/rental-alerts/unsubscribe`).
 * No page of the app reads it; this is for an error page ever rendered at such an address.
 */
const CREDENTIAL_PARAMS = ['token']
/**
 * Generic names that Firebase adds to an emailed link (`mode=signIn`, `lang=es`, and our own
 * `magic=1` marker): removed only next to an `oobCode`, because `mode` is a real filter elsewhere
 * (`/oportunidades-inmobiliarias-uruguay?mode=budget`).
 */
const SIGN_IN_COMPANIONS = ['mode', 'lang', 'magic']

export const ANALYTICS_UNSAFE_PARAMS: readonly string[] = Object.freeze([
  ...SIGN_IN_PARAMS,
  ...REFERENCE_PARAMS,
  ...CREDENTIAL_PARAMS,
])

/** Whether a `location.search` still carries something analytics must not see. */
export function hasAnalyticsUnsafeQuery(search: string, path = ''): boolean {
  const params = new URLSearchParams(search)
  // /mi-lista's share token (`?l=`) is a list whose zone can be the sharer's position; the page
  // removes it once it has read it.
  if (LIST_PATH.test(path) && params.has('l')) return true
  return ANALYTICS_UNSAFE_PARAMS.some(name => params.has(name))
}

const LIST_PATH = /^(?:\/[a-z]{2})?\/mi-lista\/?$/

/** The same query without the sign-in hand-off (and its companions); other parameters stay. */
export function withoutSignInHandoff(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const emailedLink = 'oobCode' in query
  for (const [key, value] of Object.entries(query)) {
    if (SIGN_IN_PARAMS.includes(key)) continue
    if (emailedLink && SIGN_IN_COMPANIONS.includes(key)) continue
    out[key] = value
  }
  return out
}
