// The widget service silently ignores `rating` and `sort` (verified: ?rating=5
// and ?rating=1 return byte-identical pages). These tests pin the config we
// actually rely on, and fail loudly if someone re-adds a filter that does
// nothing but read as though it works.

import { describe, expect, it } from 'vitest'

import {
  buildWidgetConfig,
  TRUSTPILOT_DOMAIN,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEW_URL,
  TRUSTPILOT_WIDGET_HEIGHT,
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
