// Mercado Pago notifications for the ad-free donation. The notification is only a hint: the
// payment is read back with our own token and that answer is what gets applied. A signed delivery
// (webhook format, `x-signature`) must carry a valid signature; the older IPN format arrives
// unsigned, and reading the payment back from Mercado Pago is what makes it safe to act on.
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

  const xSignature = getHeader(event, 'x-signature') ?? null
  const secret =
    (useRuntimeConfig().adFree as { mercadopagoWebhookSecret?: string })
      ?.mercadopagoWebhookSecret ?? ''
  if (xSignature && secret) {
    const dataId = typeof query['data.id'] === 'string' ? query['data.id'] : (paymentId ?? '')
    const ok = verifyMpSignature({
      xSignature,
      xRequestId: getHeader(event, 'x-request-id') ?? null,
      dataId,
      secret,
    })
    if (!ok) throw createError({ statusCode: 401, statusMessage: 'Bad signature' })
  }

  // Anything that is not a payment (merchant orders, tests from the panel) is acknowledged.
  if (!paymentId) return { ok: true }
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
