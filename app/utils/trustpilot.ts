// Config for the Trustpilot review carousel (trustpilot-iframe-widget).
//
// Two upstream options are deliberately absent. `rating` (minimum-rating
// filter) and `sort` are documented in the package README but are no-ops
// against trustpilot.checkleaked.com — `?rating=5` and `?rating=1` return
// byte-identical pages. Adding them would look like curation while doing
// nothing. Consequently every review renders, including one content-free 4★
// entry that cannot be filtered out.
//
// `hideTopBanner` + `hideGlobalReviews` suppress the 3.8 TrustScore. That
// number is an age-decay artifact of Trustpilot's time-weighted formula (four
// of the five reviews are from January 2023); the reviews themselves mean 4.8.

export const TRUSTPILOT_DOMAIN = 'cambio-uruguay.com'
export const TRUSTPILOT_PROFILE_URL = `https://www.trustpilot.com/review/${TRUSTPILOT_DOMAIN}`
export const TRUSTPILOT_REVIEW_URL = `https://www.trustpilot.com/evaluate/${TRUSTPILOT_DOMAIN}`

/** Kept in lockstep with the min-height the component reserves, so the iframe never shifts layout. */
export const TRUSTPILOT_WIDGET_HEIGHT = 320

export interface WidgetOpts {
  theme: 'light' | 'dark'
  reducedMotion: boolean
}

export interface TrustpilotWidgetConfig {
  domain: string
  theme: 'light' | 'dark'
  autoplay: boolean
  interval: number
  maxReviews: number
  showRating: boolean
  showDate: boolean
  showAvatar: boolean
  showReply: boolean
  hideGlobalReviews: boolean
  hideTopBanner: boolean
  height: number
}

export function buildWidgetConfig({ theme, reducedMotion }: WidgetOpts): TrustpilotWidgetConfig {
  return {
    domain: TRUSTPILOT_DOMAIN,
    theme,
    autoplay: !reducedMotion,
    interval: 6000,
    maxReviews: 5,
    showRating: true,
    showDate: true,
    showAvatar: true,
    showReply: false,
    hideGlobalReviews: true,
    hideTopBanner: true,
    height: TRUSTPILOT_WIDGET_HEIGHT,
  }
}
