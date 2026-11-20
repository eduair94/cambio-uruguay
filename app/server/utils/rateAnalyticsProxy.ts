/**
 * The Nitro side of /api/rate-analytics, a thin proxy to the backend's /analytics/rates.
 *
 * CAMBIO-URUGUAY-BACKEND-1B (2026-10-11 and 2026-11-04): a lone 500 with no error code. The
 * backend keeps every answer 30 s in Redis under a key built from the exact `from`/`to`, and the
 * page sends them with millisecond precision (`new Date().toISOString()`), so no two visitors ever
 * shared one: every request recomputed the series, which measured 2.3 s for one day, 4.1 s for a
 * week and 8.8 s for two years on a quiet box — a few seconds of load from the 12 s timeout. And a
 * timeout came out as the same bare 500 as a backend crash, so the report could not say which.
 */

/** Truncates an ISO instant to its minute, so visitors in the same minute share the cache. */
export function minuteInstant(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const time = Date.parse(value)
  if (!Number.isFinite(time) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
  return new Date(time - (time % 60_000)).toISOString()
}

export function rateAnalyticsUpstreamQuery(query: Record<string, unknown>) {
  const from = minuteInstant(query.from)
  const to = minuteInstant(query.to)
  return {
    code: query.code ?? 'USD',
    origins: query.origins,
    // A range shorter than a minute would collapse to from === to; the backend's own
    // validation answers that with a 400, so it keeps the instants it was sent.
    ...(from !== to ? { from, to } : { from: query.from, to: query.to }),
    interval: query.interval ?? 'hour',
  }
}

/** Whether the call failed because it ran out of time, not because the backend answered. */
export function upstreamTimedOut(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    if (seen.has(current)) return false
    seen.add(current)
    const { name, statusCode, cause } = current as {
      name?: unknown
      statusCode?: unknown
      cause?: unknown
    }
    // A response arrived: whatever its status, it is the backend's answer, not a timeout.
    if (typeof statusCode === 'number' && statusCode > 0) return false
    if (name === 'TimeoutError') return true
    current = cause
  }
  return false
}
