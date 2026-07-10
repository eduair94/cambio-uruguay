// The widget service silently ignores `rating` and `sort` (verified: ?rating=5
// and ?rating=1 return byte-identical pages). These tests pin the config we
// actually rely on, and fail loudly if someone re-adds a filter that does
// nothing but read as though it works.

import { describe, expect, it } from 'vitest'

import {
  buildWidgetConfig,
  probeWidgetReachable,
  TRUSTPILOT_DOMAIN,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEW_URL,
  TRUSTPILOT_WIDGET_HEIGHT,
  TRUSTPILOT_WIDGET_ORIGIN,
} from '../../utils/trustpilot'

describe('buildWidgetConfig', () => {
  it('suppresses the TrustScore banner and the global review summary', () => {
    const cfg = buildWidgetConfig({ theme: 'dark', reducedMotion: false })
    expect(cfg.hideTopBanner).toBe(true)
    expect(cfg.hideGlobalReviews).toBe(true)
  })

  it('never sets rating or sort, which are no-ops upstream', () => {
    const cfg = buildWidgetConfig({ theme: 'dark', reducedMotion: false })
    expect('rating' in cfg).toBe(false)
    expect('sort' in cfg).toBe(false)
  })

  it('shows every review rather than truncating from the newest end', () => {
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).maxReviews).toBe(5)
  })

  it('disables autoplay when the visitor prefers reduced motion', () => {
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: true }).autoplay).toBe(false)
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).autoplay).toBe(true)
  })

  it('passes the theme through unchanged', () => {
    expect(buildWidgetConfig({ theme: 'light', reducedMotion: false }).theme).toBe('light')
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).theme).toBe('dark')
  })

  it('reserves the same height the component reserves, so there is no CLS', () => {
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).height).toBe(
      TRUSTPILOT_WIDGET_HEIGHT
    )
  })

  it('points every URL at our own Trustpilot profile', () => {
    expect(TRUSTPILOT_DOMAIN).toBe('cambio-uruguay.com')
    expect(TRUSTPILOT_PROFILE_URL).toBe('https://www.trustpilot.com/review/cambio-uruguay.com')
    expect(TRUSTPILOT_REVIEW_URL).toBe('https://www.trustpilot.com/evaluate/cambio-uruguay.com')
  })
})

// `onReady` cannot be trusted to detect a blocked/downed host: the widget library
// sets `iframe.onload = onReady`, and browsers fire `load` even when the framed
// navigation is blocked or fails — the browser just loads an error document into
// the frame. `probeWidgetReachable` is the discriminator that actually works: an
// opaque `no-cors` fetch resolves when the host answers and rejects when the
// request is blocked, aborted, or the host is unreachable.
describe('probeWidgetReachable', () => {
  it('returns true when the host answers', async () => {
    const fetchImpl = (async () => new Response()) as unknown as typeof fetch

    await expect(probeWidgetReachable(fetchImpl)).resolves.toBe(true)
  })

  it('returns false when the request rejects (blocked, aborted, or unreachable)', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch

    await expect(probeWidgetReachable(fetchImpl)).resolves.toBe(false)
  })

  it('returns false once the timeout elapses when the request never settles on its own', async () => {
    // Mirrors real `fetch`: it only rejects once the passed-in signal aborts,
    // otherwise it would hang forever, same as a real stalled network request.
    const hangingFetch = ((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })) as typeof fetch

    await expect(probeWidgetReachable(hangingFetch, 20)).resolves.toBe(false)
  })

  it('probes the widget origin with our domain', async () => {
    let requestedUrl = ''
    const fetchImpl = (async (url: RequestInfo | URL) => {
      requestedUrl = String(url)
      return new Response()
    }) as unknown as typeof fetch

    await probeWidgetReachable(fetchImpl)

    expect(requestedUrl).toContain(TRUSTPILOT_WIDGET_ORIGIN)
    expect(requestedUrl).toContain(`domain=${TRUSTPILOT_DOMAIN}`)
  })

  it('issues an opaque no-cors request', async () => {
    let requestedInit: RequestInit | undefined
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestedInit = init
      return new Response()
    }) as unknown as typeof fetch

    await probeWidgetReachable(fetchImpl)

    expect(requestedInit?.mode).toBe('no-cors')
  })
})
