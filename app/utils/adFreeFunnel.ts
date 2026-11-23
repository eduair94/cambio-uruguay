// app/utils/adFreeFunnel.ts
//
// Where and how often the ad-free offer is shown, and the GA4 ecommerce payload that measures it.
// The funnel uses GA4's recommended events (view_promotion → select_promotion → view_item →
// begin_checkout → purchase) so the standard funnel and promotion reports work without custom
// definitions, and `purchase` carries `transaction_id` so GA4 counts a confirmation once.
import { AD_FREE_MONTHS, formatAdFreeAmount, type AdFreeCurrency } from './adFree'

export const AD_FREE_ITEM_ID = 'sin-anuncios-12-meses'
export const AD_FREE_PROMOTION = { id: 'sin-anuncios', name: 'Navegá sin anuncios' } as const

/** Where the offer was shown: the `creative_slot` of the promotion events. */
export type AdFreeSlot = 'content-end' | 'content-end-link' | 'donation-card' | 'account-menu'

/** Pages with ads seen in this browser (one per route change), the engagement signal. */
export const NUDGE_PAGEVIEWS_KEY = 'cu_adfree_pv'
/** When the reader closed the card ("No, gracias"). */
export const NUDGE_DISMISS_KEY = 'cu_adfree_nudge_dismissed'
/** The card already appeared in this session (sessionStorage). */
export const NUDGE_SESSION_KEY = 'cu_adfree_nudge_session'

/** The card waits for a reader who already met ads on a few pages: that reader is the one who
 * buys "without ads"; a first visit from Google is not. */
export const NUDGE_MIN_PAGEVIEWS = 3
export const NUDGE_DISMISS_DAYS = 30

export function nudgeVariant(opts: {
  pageViews: number
  dismissedAt: number | null
  cardShownThisSession: boolean
  now: number
}): 'card' | 'link' {
  if (opts.pageViews < NUDGE_MIN_PAGEVIEWS) return 'link'
  if (opts.cardShownThisSession) return 'link'
  if (
    opts.dismissedAt !== null &&
    Number.isFinite(opts.dismissedAt) &&
    opts.now - opts.dismissedAt < NUDGE_DISMISS_DAYS * 86_400_000
  ) {
    return 'link'
  }
  return 'card'
}

/** "$ 33" a month for $ 400: the price read as what it costs per month of reading. */
export function monthlyEquivalent(amount: number, currency: AdFreeCurrency): string {
  const monthly = amount / AD_FREE_MONTHS
  return formatAdFreeAmount(
    currency === 'UYU' ? Math.round(monthly) : Math.round(monthly * 100) / 100,
    currency
  )
}

export function adFreeItems(amount: number, _currency: AdFreeCurrency) {
  return [
    {
      item_id: AD_FREE_ITEM_ID,
      item_name: `Navegá sin anuncios (${AD_FREE_MONTHS} meses)`,
      item_category: 'aporte',
      price: amount,
      quantity: 1,
    },
  ]
}

/** Whether any payment medium is configured: without one the offer is a dead end, so no entry
 * point links to it. */
export function adFreeOffered(config: { mercadopago?: boolean; paypal?: boolean } | undefined) {
  return Boolean(config?.mercadopago || config?.paypal)
}

export function promotionParams(slot: AdFreeSlot) {
  return {
    promotion_id: AD_FREE_PROMOTION.id,
    promotion_name: AD_FREE_PROMOTION.name,
    creative_slot: slot,
  }
}
