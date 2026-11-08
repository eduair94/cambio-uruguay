import {
  rentalUnsubscribeHtml,
  rentalUnsubscribeInfo,
  unsubscribeRentalAlertEmail,
  validRentalUnsubscribeToken,
} from '../../utils/rentalAlertUnsubscribe'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store, max-age=0')
  setResponseHeader(event, 'referrer-policy', 'no-referrer')
  setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow')
  // Before anything can fail: an error page served at this address must not run scripts (the
  // address carries the token, and GA sends the address bar).
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  setResponseHeader(
    event,
    'content-security-policy',
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  )
  if (!['GET', 'HEAD', 'POST'].includes(event.method)) {
    setResponseHeader(event, 'allow', 'GET, HEAD, POST')
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }
  const token = getQuery(event).token
  // A mangled link gets this page too: under the CSP above, Nuxt's error page would render
  // without its stylesheets or scripts.
  if (!validRentalUnsubscribeToken(token)) {
    setResponseStatus(event, 400)
    return rentalUnsubscribeHtml('es', 'missing')
  }
  let found: Awaited<ReturnType<typeof rentalUnsubscribeInfo>>
  try {
    found = await rentalUnsubscribeInfo(token)
    // RFC 8058 callers need no login, and repeated POSTs remain successful.
    if (event.method === 'POST') await unsubscribeRentalAlertEmail(token)
  } catch (error) {
    // Answered here rather than thrown: Nitro would log the request URL, token included, and
    // Nuxt would render its full error page at this address. The log line names the failure only.
    console.error(
      '[rental-alerts/unsubscribe] unavailable:',
      error instanceof Error ? error.message : error
    )
    setResponseStatus(event, 503)
    return rentalUnsubscribeHtml('es', 'unavailable', token)
  }
  const state =
    event.method === 'POST' || (found && !found.channels.email)
      ? 'done'
      : found
        ? 'confirm'
        : 'missing'
  if (state === 'missing') setResponseStatus(event, 404)
  return rentalUnsubscribeHtml(found?.locale || 'es', state, token)
})
