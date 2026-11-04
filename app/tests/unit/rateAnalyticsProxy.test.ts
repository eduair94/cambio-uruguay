import { describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import { $fetch, FetchError } from 'ofetch'
import {
  minuteInstant,
  rateAnalyticsUpstreamQuery,
  upstreamTimedOut,
} from '../../server/utils/rateAnalyticsProxy'

describe('rateAnalyticsUpstreamQuery (CAMBIO-URUGUAY-BACKEND-1B)', () => {
  it('truncates the instants to the minute so the backend cache key repeats', () => {
    const a = rateAnalyticsUpstreamQuery({
      from: '2026-11-03T09:51:26.931Z',
      to: '2026-11-04T09:51:26.931Z',
    })
    const b = rateAnalyticsUpstreamQuery({
      from: '2026-11-03T09:51:59.004Z',
      to: '2026-11-04T09:51:59.004Z',
    })
    expect(a).toEqual(b)
    expect(a).toEqual({
      code: 'USD',
      origins: undefined,
      from: '2026-11-03T09:51:00.000Z',
      to: '2026-11-04T09:51:00.000Z',
      interval: 'hour',
    })
  })

  it('passes what it cannot read untouched, for the backend to refuse', () => {
    expect(minuteInstant('yesterday')).toBe('yesterday')
    expect(minuteInstant(['2026-11-04T09:51:26.931Z'])).toEqual(['2026-11-04T09:51:26.931Z'])
    expect(minuteInstant(undefined)).toBeUndefined()
    expect(rateAnalyticsUpstreamQuery({ code: 'EUR', interval: 'day', origins: 'brou' })).toEqual({
      code: 'EUR',
      origins: 'brou',
      from: undefined,
      to: undefined,
      interval: 'day',
    })
  })

  it('never turns a sub-minute range into an empty one', () => {
    expect(
      rateAnalyticsUpstreamQuery({
        from: '2026-11-04T09:51:01.000Z',
        to: '2026-11-04T09:51:30.000Z',
      })
    ).toMatchObject({ from: '2026-11-04T09:51:01.000Z', to: '2026-11-04T09:51:30.000Z' })
  })
})

describe('upstreamTimedOut', () => {
  const timeout = () => {
    const cause = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    const error = new FetchError('[GET] "/analytics/rates": <no response> timeout')
    Object.assign(error, { cause })
    return error
  }

  it('recognizes ofetch running out of time', () => {
    expect(upstreamTimedOut(timeout())).toBe(true)
  })

  it('recognizes a real ofetch timeout against a server that never answers', async () => {
    const server = createServer(() => {})
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as { port: number }
    try {
      const error = await $fetch(`http://127.0.0.1:${port}/analytics/rates`, { timeout: 50 }).catch(
        (failure: unknown) => failure
      )
      expect(upstreamTimedOut(error)).toBe(true)
    } finally {
      server.closeAllConnections()
      server.close()
    }
  })

  it('keeps a backend answer as the backend answer', () => {
    const error = new FetchError('[GET] "/analytics/rates": 500 Internal Server Error')
    Object.assign(error, { statusCode: 500 })
    expect(upstreamTimedOut(error)).toBe(false)
    expect(upstreamTimedOut(new Error('ECONNREFUSED'))).toBe(false)
    expect(upstreamTimedOut(null)).toBe(false)
  })
})
