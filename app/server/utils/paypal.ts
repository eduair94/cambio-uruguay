// PayPal Orders API v2 for the ad-free donation, over REST (no JS SDK on the page): the server
// creates the order, the browser approves it on paypal.com and comes back, and the server captures
// it. A webhook covers the person who closes the tab before coming back (CHECKOUT.ORDER.APPROVED →
// capture) and refunds/reversals afterwards.
import type { AdFreeOrderDoc } from '../models/AdFreeOrder'
import { AD_FREE_MONTHS } from '../../utils/adFree'

interface PaypalConfig {
  paypalClientId?: string
  paypalClientSecret?: string
  paypalWebhookId?: string
  paypalEnv?: 'live' | 'sandbox'
}

function cfg(): PaypalConfig {
  return (useRuntimeConfig().adFree ?? {}) as PaypalConfig
}

function api(): string {
  return cfg().paypalEnv === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

export function ppConfigured(): boolean {
  const c = cfg()
  return Boolean(c.paypalClientId && c.paypalClientSecret)
}

let cached: { token: string; expiresAt: number } | null = null

export async function ppAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token
  const c = cfg()
  const basic = Buffer.from(`${c.paypalClientId}:${c.paypalClientSecret}`).toString('base64')
  const res = await $fetch<{ access_token: string; expires_in: number }>(`${api()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    timeout: 15_000,
  })
  cached = {
    token: res.access_token,
    // A minute of margin: a token that expires mid-request is a failed capture.
    expiresAt: Date.now() + Math.max(0, (res.expires_in ?? 0) - 60) * 1000,
  }
  return cached.token
}

async function call<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; requestId?: string } = {}) {
  const token = await ppAccessToken()
  return $fetch<T>(`${api()}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // PayPal's idempotency key: a retried create or capture returns the first result.
      ...(opts.requestId ? { 'PayPal-Request-Id': opts.requestId } : {}),
    },
    ...(opts.body === undefined ? {} : { body: opts.body as Record<string, unknown> }),
    timeout: 20_000,
  })
}

export async function createPpOrder(
  order: Pick<AdFreeOrderDoc, '_id' | 'amount' | 'currency'>,
  opts: { siteUrl: string }
): Promise<{ id: string; url: string }> {
  const back = `${opts.siteUrl}/cuenta/sin-publicidad?orden=${encodeURIComponent(order._id)}`
  const res = await call<{ id: string; links?: { rel: string; href: string }[] }>(
    '/v2/checkout/orders',
    {
      method: 'POST',
      requestId: `adfree-${order._id}`,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order._id,
            custom_id: order._id,
            description: `Aporte a Cambio Uruguay: ${AD_FREE_MONTHS} meses sin anuncios`,
            soft_descriptor: 'CAMBIOURUGUAY',
            amount: { currency_code: order.currency, value: order.amount.toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Cambio Uruguay',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: back,
              cancel_url: `${back}&cancelado=1`,
            },
          },
        },
      },
    }
  )
  const url = res.links?.find(l => l.rel === 'payer-action' || l.rel === 'approve')?.href
  if (!res.id || !url) throw new Error('PayPal did not return an approval link')
  return { id: res.id, url }
}

/**
 * The captures of one PayPal order, capturing it first when the buyer approved it and nobody
 * captured it yet. Returns raw capture objects plus the order's `custom_id`.
 */
export async function reconcilePpOrder(
  paypalOrderId: string,
  orderId: string
): Promise<{ captures: Record<string, any>[]; customId: string | null }> {
  let order = await call<Record<string, any>>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
  if (order.status === 'APPROVED') {
    order = await call<Record<string, any>>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      { method: 'POST', requestId: `adfree-capture-${orderId}`, body: {} }
    )
  }
  const unit = order.purchase_units?.[0] ?? {}
  return {
    captures: Array.isArray(unit.payments?.captures) ? unit.payments.captures : [],
    customId: typeof unit.custom_id === 'string' ? unit.custom_id : null,
  }
}

export function getPpCapture(captureId: string): Promise<Record<string, any>> {
  return call(`/v2/payments/captures/${encodeURIComponent(captureId)}`)
}

/** PayPal's own verdict on a webhook delivery (the documented verification call). */
export async function verifyPpWebhook(
  headers: Record<string, string | undefined>,
  event: unknown
): Promise<boolean> {
  const webhookId = cfg().paypalWebhookId
  if (!webhookId || !ppConfigured()) return false
  const need = [
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time',
  ]
  if (need.some(h => !headers[h])) return false
  try {
    const res = await call<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: event,
        },
      }
    )
    return res.verification_status === 'SUCCESS'
  } catch {
    return false
  }
}
