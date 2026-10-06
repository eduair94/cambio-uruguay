import type { H3Event } from 'h3'

/**
 * Sets a header on a response that a Nitro memo (`defineCachedEventHandler`) may already have sent.
 *
 * When the request carries an `If-None-Match`/`If-Modified-Since` that matches the memo, Nitro
 * answers `304` itself and ENDS the response inside the cached handler. A wrapper that then sets
 * its own `cache-control` throws `ERR_HTTP_HEADERS_SENT`, and that exception turns a correct 304
 * into a logged 500 (Sentry CAMBIO-URUGUAY-BACKEND-14, `/api/rentals`: its stack ends in h3's
 * `setResponseHeader` → `res.setHeader`). A sent response keeps the headers it went out with.
 *
 * Returns whether the header was set.
 */
export function setHeaderUnlessSent(event: H3Event, name: string, value: string): boolean {
  const res = event.node?.res
  if (!res || event.handled || res.headersSent || res.writableEnded) return false
  res.setHeader(name, value)
  return true
}
