// GA4 "key events" (conversions) are configured in the GA4 UI against literal
// event-name strings. A rename here silently zeroes a conversion report weeks
// later, with no test failure and no runtime error — so the names are pinned.
//
// This is a source-level contract, not a behavioural test: it asserts the call
// sites exist with the agreed names and payload keys. It does NOT prove gtag
// fired (that needs a browser + consent) — the e2e/manual check is GA4 DebugView.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8')

/** The five events marked as key events in GA4. Renaming one is a breaking change. */
const KEY_EVENTS = [
  'outbound_click', // proxy for "went to a casa to change money"
  'alert_created',
  'newsletter_signup',
  'where_to_change',
  'convert',
] as const

describe('GA4 key events', () => {
  const sources: Record<(typeof KEY_EVENTS)[number], string> = {
    outbound_click: read('plugins/track-clicks.client.ts'),
    alert_created: read('components/account/AlertsPanel.vue'),
    newsletter_signup: read('components/NewsletterSignup.vue'),
    where_to_change: read('components/WhereToChange.vue'),
    convert: read('pages/index.vue'),
  }

  it.each(KEY_EVENTS)('%s is still emitted from its call site', event => {
    expect(sources[event]).toContain(`'${event}'`)
  })

  it('alert_created carries the alert shape, not a casa', () => {
    const src = sources.alert_created
    const call = src.slice(src.indexOf("track('alert_created'"))
    for (const key of ['currency', 'kind', 'op', 'target']) {
      expect(call.slice(0, 300)).toContain(key)
    }
    // An alert watches the best rate across every casa, so there is no origin.
    expect(call.slice(0, 300)).not.toContain('origin')
  })

  it('newsletter_signup carries the landing path so it can be attributed', () => {
    const src = sources.newsletter_signup
    const call = src.slice(src.indexOf("track('newsletter_signup'"))
    expect(call.slice(0, 200)).toContain('source')
  })

  it('conversions are only emitted after their request resolves', () => {
    // Guards against moving the track() call above the await, which would count
    // failed submissions as conversions.
    const alerts = sources.alert_created
    const postIdx = alerts.indexOf("authFetch('/api/me/alerts'")
    const trackIdx = alerts.indexOf("track('alert_created'")
    expect(postIdx).toBeGreaterThan(-1)
    expect(trackIdx).toBeGreaterThan(postIdx)

    const news = sources.newsletter_signup
    const subIdx = news.indexOf("$fetch('/api/newsletter/subscribe'")
    const newsTrackIdx = news.indexOf("track('newsletter_signup'")
    expect(subIdx).toBeGreaterThan(-1)
    expect(newsTrackIdx).toBeGreaterThan(subIdx)
  })
})
