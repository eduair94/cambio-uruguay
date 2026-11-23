// Mercado Pago notifications for the ad-free donation. The notification is only a hint: the
// payment is read back with our own token, and that answer is what gets applied. So a delivery is
// never refused for its signature: Mercado Pago retries a refused one every 15 minutes for days,
// and some deliveries carry an `x-signature` that cannot be validated with the app secret (the IPN
// format, which `mpNotificationUrl` already asks it not to send). A bad signature is logged.
import { applyProviderPayment } from '../../../utils/adFreeStore'
import {
  mapMpPayment,
  mpNotificationPaymentId,
  verifyMpSignature,
} from '../../../utils/adFreeMapping'
import { getMpPayment, mpConfigured } from '../../../utils/mercadoPago'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  if (!mpConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  }
  const query = getQuery(event) as Record<string, unknown>
  const body = await readBody(event).catch(() => null)
  const paymentId = mpNotificationPaymentId(query, body)
  // Anything that is not a payment (merchant orders, tests from the panel) is acknowledged.
  if (!paymentId) return { ok: true }

  const xSignature = getHeader(event, 'x-signature') ?? null
  const secret =
    (useRuntimeConfig().adFree as { mercadopagoWebhookSecret?: string })
      ?.mercadopagoWebhookSecret ?? ''
  if (xSignature && secret) {
    const dataId = typeof query['data.id'] === 'string' ? query['data.id'] : paymentId
    const ok = verifyMpSignature({
      xSignature,
      xRequestId: getHeader(event, 'x-request-id') ?? null,
      dataId,
      secret,
    })
    if (!ok) console.warn('[ad-free] mercadopago notification with an unverifiable signature')
  }

  try {
    const payment = mapMpPayment(await getMpPayment(paymentId))
    if (payment) await applyProviderPayment(payment)
  } catch (error) {
    // A non-2xx makes Mercado Pago retry later, which is what a failed read needs.
    console.warn(
      '[ad-free] mercadopago webhook failed',
      error instanceof Error ? error.message : error
    )
    throw createError({ statusCode: 500, statusMessage: 'Retry later' })
  }
  return { ok: true }
})
