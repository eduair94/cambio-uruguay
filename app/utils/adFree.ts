// app/utils/adFree.ts
//
// The pure core of the ad-free donation (/cuenta/sin-publicidad): the amounts the owner decided,
// how approved donations add up to a period, and how a page load decides whether this viewer gets
// ads. Shared by the server (server/utils/adFreeStore.ts) and the client (plugins/ad-free.client.ts).
// Decided 2026-11-23: one donation = twelve months, no renewal; suggested amounts plus a free amount
// above a minimum; Mercado Pago in pesos and PayPal in dollars.

export type AdFreeProvider = 'mercadopago' | 'paypal'
export type AdFreeCurrency = 'UYU' | 'USD'
export type DonationStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'

export const AD_FREE_MONTHS = 12

export interface AdFreeAmounts {
  currency: AdFreeCurrency
  suggested: number[]
  min: number
  max: number
  decimals: 0 | 2
}

export const AD_FREE_AMOUNTS: Record<AdFreeProvider, AdFreeAmounts> = {
  mercadopago: { currency: 'UYU', suggested: [200, 400, 800], min: 150, max: 20000, decimals: 0 },
  paypal: { currency: 'USD', suggested: [5, 10, 20], min: 4, max: 500, decimals: 2 },
}

/** `$ 1.200`, `US$ 10`, `US$ 4,50`: the way the site writes money. */
export function formatAdFreeAmount(amount: number, currency: AdFreeCurrency): string {
  const cents = Math.round(amount * 100)
  const whole = Math.trunc(cents / 100)
  const rest = Math.abs(cents % 100)
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimals = rest ? `,${String(rest).padStart(2, '0')}` : ''
  return `${currency === 'USD' ? 'US$' : '$'} ${grouped}${decimals}`
}

export function validateAmount(
  provider: AdFreeProvider,
  raw: unknown
): { ok: true; amount: number } | { ok: false; error: string } {
  const limits = AD_FREE_AMOUNTS[provider]
  let amount: number
  if (typeof raw === 'number') amount = raw
  else if (typeof raw === 'string' && /^\d+(?:\.\d{1,2})?$/.test(raw.trim())) amount = Number(raw)
  else return { ok: false, error: 'Ingresá un monto.' }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Ingresá un monto.' }

  const scaled = amount * 10 ** limits.decimals
  if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
    return {
      ok: false,
      error: limits.decimals
        ? 'Usá hasta dos decimales.'
        : 'Ingresá un monto en pesos, sin centésimos.',
    }
  }
  if (amount < limits.min) {
    return {
      ok: false,
      error: `El aporte mínimo es ${formatAdFreeAmount(limits.min, limits.currency)}.`,
    }
  }
  if (amount > limits.max) {
    return {
      ok: false,
      error: `El aporte máximo es ${formatAdFreeAmount(limits.max, limits.currency)}.`,
    }
  }
  return { ok: true, amount }
}

/** Calendar months in UTC; a day the target month does not have becomes its last day. */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const out = new Date(date.getTime())
  out.setUTCDate(1)
  out.setUTCFullYear(y, m, Math.min(date.getUTCDate(), lastDay))
  return out
}

/**
 * The end of the ad-free period the approved donations add up to: each one starts when it was
 * approved or when the previous one ends, whichever is later, and adds AD_FREE_MONTHS.
 */
export function computeAdFreeUntil(approved: { approvedAt: Date }[]): Date | null {
  const sorted = approved
    .map(d => new Date(d.approvedAt))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  let until: Date | null = null
  for (const approvedAt of sorted) {
    const start: Date = until && until > approvedAt ? until : approvedAt
    until = addMonths(start, AD_FREE_MONTHS)
  }
  return until
}

export function isAdFreeActive(until: Date | string | null | undefined, now = new Date()): boolean {
  if (!until) return false
  const end = new Date(until)
  return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime()
}

// ── Who sees ads on this page view ──────────────────────────────────────────────────────────────

/** `unknown` during SSR, hydration and while a signed-in visitor waits for the server. */
export type ViewerStatus = 'unknown' | 'ads' | 'free'

/** The AdSense loader goes in only once the viewer is known to see ads. */
export function viewerLoadsAdsense(status: ViewerStatus): boolean {
  return status === 'ads'
}

/** Manual units and the sponsored row stay for everyone but a confirmed donor (no layout shift). */
export function viewerShowsAds(status: ViewerStatus): boolean {
  return status !== 'free'
}

/**
 * Whether nobody is signed in, as far as this page load can tell. Until the first auth state is
 * known (a slow phone restoring its session) the answer is `unknown`, never `signed-out`: treating
 * it as signed out would erase a donor's marker and load the ads.
 */
export function sessionVerdict(s: {
  ready: boolean
  hasUser: boolean
}): 'signed-in' | 'signed-out' | 'unknown' {
  if (s.hasUser) return 'signed-in'
  return s.ready ? 'signed-out' : 'unknown'
}

/** Remembered in localStorage so a page load can decide without waiting for the server. */
export const AD_FREE_HINT_KEY = 'cu_adfree_v1'

export interface AdFreeHint {
  uid: string
  until: string | null
  checkedAt: string
}

/** How long a "this account has no period" answer is trusted before waiting for the server again. */
const NON_DONOR_HINT_MS = 12 * 3_600_000

export function parseHint(raw: string | null): AdFreeHint | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<AdFreeHint>
    if (typeof value?.uid !== 'string' || !value.uid) return null
    if (typeof value.checkedAt !== 'string') return null
    if (value.until !== null && typeof value.until !== 'string') return null
    return { uid: value.uid, until: value.until, checkedAt: value.checkedAt }
  } catch {
    return null
  }
}

/**
 * What a page load does before the server answers: a donor whose period has not ended holds the
 * ads at once; an account checked recently and without a period lets them in at once; anything
 * else waits (and only a browser with a saved session actually waits: plugins/ad-free.client.ts).
 */
export function decideFromHint(
  hint: AdFreeHint | null,
  now: Date
): { status: ViewerStatus | 'wait'; revalidate: boolean } {
  if (!hint) return { status: 'wait', revalidate: true }
  if (isAdFreeActive(hint.until, now)) return { status: 'free', revalidate: true }
  const checked = new Date(hint.checkedAt).getTime()
  if (Number.isFinite(checked) && now.getTime() - checked < NON_DONOR_HINT_MS) {
    return { status: 'ads', revalidate: true }
  }
  return { status: 'wait', revalidate: true }
}
