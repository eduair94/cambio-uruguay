// Mercado Pago Checkout Pro for the ad-free donation, over its REST API (no SDK): a preference per
// order, the payment page hosted by Mercado Pago, and the payment read back with our own token.
// The browser's return URL and the webhook body are only hints; the status always comes from
// `GET /v1/payments/<id>`.
import type { AdFreeOrderDoc } from '../models/AdFreeOrder'
import { AD_FREE_MONTHS } from '../../utils/adFree'
import { mpNotificationUrl } from './adFreeMapping'

const API = 'https://api.mercadopago.com'

function token(): string {
  return (
    (useRuntimeConfig().adFree as { mercadopagoAccessToken?: string })?.mercadopagoAccessToken ?? ''
  )
}

export function mpConfigured(): boolean {
  return Boolean(token())
}

function headers(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${token()}`, ...extra }
}

/** Checkout Pro preference for one order. `url` is where the browser goes to pay. */
export async function createMpPreference(
  order: Pick<AdFreeOrderDoc, '_id' | 'amount' | 'currency'>,
  opts: { email: string | null; siteUrl: string }
): Promise<{ id: string; url: string }> {
  const back = `${opts.siteUrl}/cuenta/sin-publicidad?orden=${encodeURIComponent(order._id)}`
  const res = await $fetch<{ id: string; init_point: string }>(`${API}/checkout/preferences`, {
    method: 'POST',
    // The order id is the idempotency key: a retried request never creates a second preference.
    headers: headers({ 'X-Idempotency-Key': `adfree-${order._id}` }),
    body: {
      items: [
        {
          id: 'sin-anuncios-12-meses',
          title: `Aporte a Cambio Uruguay: ${AD_FREE_MONTHS} meses sin anuncios`,
          description: 'Aporte único. No es una suscripción y no se renueva solo.',
          category_id: 'services',
          quantity: 1,
          currency_id: order.currency,
          unit_price: order.amount,
        },
      ],
      ...(opts.email ? { payer: { email: opts.email } } : {}),
      external_reference: order._id,
      metadata: { order_id: order._id },
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      notification_url: mpNotificationUrl(opts.siteUrl),
      statement_descriptor: 'CAMBIOURUGUAY',
      payment_methods: { installments: 1 },
    },
    timeout: 15_000,
  })
  if (!res?.id || !res.init_point) throw new Error('Mercado Pago did not return a preference')
  return { id: res.id, url: res.init_point }
}

export function getMpPayment(id: string): Promise<Record<string, any>> {
  return $fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: headers(),
    timeout: 15_000,
  })
}

/** Every payment Mercado Pago holds for one order, newest first. */
export async function searchMpPayments(orderId: string): Promise<Record<string, any>[]> {
  const res = await $fetch<{ results?: Record<string, any>[] }>(`${API}/v1/payments/search`, {
    headers: headers(),
    query: { external_reference: orderId, sort: 'date_created', criteria: 'desc', limit: 20 },
    timeout: 15_000,
  })
  return Array.isArray(res?.results) ? res.results : []
}
