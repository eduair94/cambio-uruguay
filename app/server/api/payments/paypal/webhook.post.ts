// PayPal webhooks for the ad-free donation, verified with PayPal's own verification call.
//   CHECKOUT.ORDER.APPROVED  → capture (the buyer approved but never came back to the site);
//   PAYMENT.CAPTURE.*        → read the capture back and apply its status (refunds, reversals).
import { AdFreeOrderModel } from '../../../models/AdFreeOrder'
import { applyProviderPayment } from '../../../utils/adFreeStore'
import { mapPpCapture, ppCaptureIdFromEvent } from '../../../utils/adFreeMapping'
import { connectDb } from '../../../utils/db'
import { getPpCapture, ppConfigured, reconcilePpOrder, verifyPpWebhook } from '../../../utils/paypal'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  if (!ppConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  }
  const body = (await readBody(event).catch(() => null)) as Record<string, any> | null
  const headers = Object.fromEntries(
    Object.entries(getRequestHeaders(event)).map(([k, v]) => [k.toLowerCase(), v])
  ) as Record<string, string | undefined>
  if (!body || !(await verifyPpWebhook(headers, body))) {
    throw createError({ statusCode: 401, statusMessage: 'Unverified' })
  }

  try {
    if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const paypalOrderId = String(body.resource?.id ?? '')
      await connectDb()
      const order = paypalOrderId
        ? await AdFreeOrderModel.findOne({ provider: 'paypal', providerRef: paypalOrderId }).lean()
        : null
      if (order) {
        const { captures, customId } = await reconcilePpOrder(paypalOrderId, order._id)
        for (const raw of captures) {
          const payment = mapPpCapture(raw, customId ?? order._id)
          if (payment) await applyProviderPayment(payment)
        }
      }
      return { ok: true }
    }
    const captureId = ppCaptureIdFromEvent(body)
    if (captureId) {
      const payment = mapPpCapture(await getPpCapture(captureId))
      if (payment) await applyProviderPayment(payment)
    }
  } catch (error) {
    console.warn('[ad-free] paypal webhook failed', error instanceof Error ? error.message : error)
    throw createError({ statusCode: 500, statusMessage: 'Retry later' })
  }
  return { ok: true }
})
