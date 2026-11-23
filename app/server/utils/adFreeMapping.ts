// What Mercado Pago and PayPal say about a payment, read into one shape, plus the checks that
// decide whether to believe it. Pure (node:crypto only), so it is tested without a network:
// tests/unit/adFreePayments.test.ts.
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AdFreeCurrency, AdFreeProvider, DonationStatus } from '../../utils/adFree'

export interface ProviderPayment {
  /** `mp:<paymentId>` / `pp:<captureId>`: the donation's id. */
  id: string
  orderId: string
  provider: AdFreeProvider
  amount: number
  currency: AdFreeCurrency
  status: DonationStatus
  statusDetail: string | null
  approvedAt: Date | null
}

const MP_STATUS: Record<string, DonationStatus> = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'pending',
  authorized: 'pending',
  // A dispute is open but the money is still ours: keep the period until it ends in charged_back.
  in_mediation: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back',
}

const PP_STATUS: Record<string, DonationStatus> = {
  COMPLETED: 'approved',
  PENDING: 'pending',
  DECLINED: 'rejected',
  FAILED: 'rejected',
  REFUNDED: 'refunded',
  // Part of it was given back on request; what is left still pays for the period.
  PARTIALLY_REFUNDED: 'approved',
  REVERSED: 'charged_back',
}

function currencyOf(raw: unknown): AdFreeCurrency | null {
  return raw === 'UYU' || raw === 'USD' ? raw : null
}

function dateOf(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function mapMpPayment(raw: Record<string, any> | null | undefined): ProviderPayment | null {
  if (!raw || raw.id === undefined || raw.id === null) return null
  const orderId = typeof raw.external_reference === 'string' ? raw.external_reference : ''
  let status = MP_STATUS[String(raw.status)]
  // A chargeback the seller won ("reimbursed") gives the money back to us: the period stands.
  if (status === 'charged_back' && raw.status_detail === 'reimbursed') status = 'approved'
  const currency = currencyOf(raw.currency_id)
  const amount = Number(raw.transaction_amount)
  if (!orderId || !status || !currency || !Number.isFinite(amount)) return null
  return {
    id: `mp:${raw.id}`,
    orderId,
    provider: 'mercadopago',
    amount,
    currency,
    status,
    statusDetail: typeof raw.status_detail === 'string' ? raw.status_detail : null,
    approvedAt: dateOf(raw.date_approved),
  }
}

export function mapPpCapture(
  raw: Record<string, any> | null | undefined,
  fallbackOrderId?: string
): ProviderPayment | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null
  const orderId =
    typeof raw.custom_id === 'string' && raw.custom_id ? raw.custom_id : fallbackOrderId
  const status = PP_STATUS[String(raw.status)]
  const currency = currencyOf(raw.amount?.currency_code)
  const amount = Number(raw.amount?.value)
  if (!orderId || !status || !currency || !Number.isFinite(amount)) return null
  const reason = raw.status_details?.reason
  return {
    id: `pp:${raw.id}`,
    orderId,
    provider: 'paypal',
    amount,
    currency,
    status,
    statusDetail: typeof reason === 'string' ? reason : null,
    // A capture can sit PENDING for days: the period starts when it completed (its last update).
    approvedAt: status === 'approved' ? (dateOf(raw.update_time) ?? dateOf(raw.create_time)) : null,
  }
}

/** The payment belongs to this order and is for exactly what the order asked. */
export function checkAgainstOrder(
  order: { _id: string; amount: number; currency: AdFreeCurrency },
  p: ProviderPayment
): boolean {
  return (
    p.orderId === order._id &&
    p.currency === order.currency &&
    Math.abs(p.amount - order.amount) < 0.005
  )
}

/**
 * Mercado Pago's webhook signature: `x-signature: ts=<ts>,v1=<hmac>` where the HMAC-SHA256 (key =
 * the app's webhook secret) covers `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, leaving out
 * any part whose value is missing, with an alphanumeric data.id in lowercase.
 */
export function verifyMpSignature(input: {
  xSignature: string | null | undefined
  xRequestId: string | null | undefined
  dataId: string
  secret: string
}): boolean {
  if (!input.secret || !input.xSignature) return false
  const parts = new Map<string, string>()
  for (const piece of input.xSignature.split(',')) {
    const at = piece.indexOf('=')
    if (at > 0) parts.set(piece.slice(0, at).trim(), piece.slice(at + 1).trim())
  }
  const ts = parts.get('ts')
  const v1 = parts.get('v1')
  if (!ts || !v1 || !/^[a-f0-9]+$/i.test(v1)) return false
  const id = /^[a-z0-9]+$/i.test(input.dataId) ? input.dataId.toLowerCase() : input.dataId
  let manifest = ''
  if (id) manifest += `id:${id};`
  if (input.xRequestId) manifest += `request-id:${input.xRequestId};`
  manifest += `ts:${ts};`
  const expected = createHmac('sha256', input.secret).update(manifest).digest()
  const given = Buffer.from(v1, 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * The `notification_url` of a preference. `source_news=webhooks` asks Mercado Pago for the webhook
 * format only: without it the same URL also gets the IPN format, whose `x-signature` cannot be
 * validated with the app secret.
 */
export function mpNotificationUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/api/payments/mercadopago/webhook?source_news=webhooks`
}

const PP_VERIFY_HEADERS = [
  'paypal-auth-algo',
  'paypal-cert-url',
  'paypal-transmission-id',
  'paypal-transmission-sig',
  'paypal-transmission-time',
] as const

/**
 * The body of PayPal's verify-webhook-signature call, with the event spliced in exactly as it was
 * received: PayPal signs the bytes, and a parsed-then-reserialized event (escapes, accents, `\/`)
 * fails verification. Null when a signing header is missing.
 */
export function ppVerifyBody(
  headers: Record<string, string | undefined>,
  webhookId: string,
  rawEvent: string
): string | null {
  if (!webhookId || PP_VERIFY_HEADERS.some(h => !headers[h])) return null
  const head = JSON.stringify({
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: webhookId,
  })
  return `${head.slice(0, -1)},"webhook_event":${rawEvent}}`
}

/** The payment id a Mercado Pago notification is about (webhook or IPN format), or null. */
export function mpNotificationPaymentId(
  query: Record<string, unknown>,
  body: unknown
): string | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>
  const type = query.type ?? b.type ?? query.topic ?? b.topic
  if (type !== 'payment') return null
  const id = query['data.id'] ?? b.data?.id ?? query.id ?? b.id
  if (typeof id === 'number') return String(id)
  return typeof id === 'string' && id ? id : null
}

/** The capture a PayPal `PAYMENT.CAPTURE.*` event is about; a refund points up to its capture. */
export function ppCaptureIdFromEvent(event: Record<string, any> | null | undefined): string | null {
  if (!event || typeof event.event_type !== 'string') return null
  if (!event.event_type.startsWith('PAYMENT.CAPTURE.')) return null
  const resource = event.resource ?? {}
  const up = Array.isArray(resource.links)
    ? resource.links.find((l: any) => l?.rel === 'up' && /\/captures\//.test(String(l.href)))
    : null
  if (up) return String(up.href).split('/captures/')[1]?.split(/[/?#]/)[0] || null
  return typeof resource.id === 'string' && resource.id ? resource.id : null
}

const RANK: Record<DonationStatus, number> = {
  approved: 6,
  pending: 5,
  refunded: 4,
  charged_back: 3,
  rejected: 2,
  cancelled: 1,
}

/** The most useful state to show among the payments of one order. */
export function bestDonationStatus(statuses: DonationStatus[]): DonationStatus | 'none' {
  let best: DonationStatus | 'none' = 'none'
  for (const s of statuses) if (best === 'none' || RANK[s] > RANK[best]) best = s
  return best
}
