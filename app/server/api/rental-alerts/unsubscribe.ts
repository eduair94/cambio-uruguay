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
  if (!['GET', 'HEAD', 'POST'].includes(event.method)) {
    setResponseHeader(event, 'allow', 'GET, HEAD, POST')
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }
  const token = getQuery(event).token
  if (!validRentalUnsubscribeToken(token))
    throw createError({ statusCode: 400, statusMessage: 'Invalid link' })
  const found = await rentalUnsubscribeInfo(token)
  // RFC 8058 callers need no login, and repeated POSTs remain successful.
  if (event.method === 'POST') await unsubscribeRentalAlertEmail(token)
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  setResponseHeader(
    event,
    'content-security-policy',
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  )
  const state =
    event.method === 'POST' || (found && !found.channels.email)
      ? 'done'
      : found
        ? 'confirm'
        : 'missing'
  if (state === 'missing') setResponseStatus(event, 404)
  return rentalUnsubscribeHtml(found?.locale || 'es', state, token)
})
