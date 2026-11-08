// One-click unsubscribe of a rate-alert email: the same contract as /api/rental-alerts/unsubscribe.
// GET shows a confirmation and changes nothing (mail scanners open links); POST turns off that
// alert's email channel, needs no login (RFC 8058 List-Unsubscribe-Post) and is idempotent.
import { rentalUnsubscribeHtml } from '../../utils/rentalAlertUnsubscribe'
import {
  rateAlertUnsubscribeInfo,
  unsubscribeRateAlertEmail,
  validRateAlertUnsubscribeToken,
} from '../../utils/rateAlertUnsubscribe'

const ACTION = '/api/alerts/unsubscribe'

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
  if (!validRateAlertUnsubscribeToken(token)) {
    setResponseStatus(event, 400)
    return rentalUnsubscribeHtml('es', 'missing', '', ACTION)
  }
  let found: Awaited<ReturnType<typeof rateAlertUnsubscribeInfo>>
  let writing = false
  try {
    found = await rateAlertUnsubscribeInfo(token)
    if (event.method === 'POST') {
      writing = true
      await unsubscribeRateAlertEmail(token)
    }
  } catch (error) {
    // Answered here rather than thrown: Nitro would log the request URL, token included, and
    // Nuxt would render its full error page at this address. The log line names the failure only.
    console.error(
      '[alerts/unsubscribe] unavailable:',
      error instanceof Error ? error.message : error
    )
    setResponseStatus(event, 503)
    // Before the write nothing changed; once it was attempted, its outcome is unknown.
    return rentalUnsubscribeHtml('es', writing ? 'unavailable' : 'unavailableRead', token, ACTION)
  }
  const state =
    event.method === 'POST' || (found && !found.channels?.email)
      ? 'done'
      : found
        ? 'confirm'
        : 'missing'
  if (state === 'missing') setResponseStatus(event, 404)
  // The rate-alert emails are written in Spanish, and so is this page.
  return rentalUnsubscribeHtml('es', state, token, ACTION)
})
