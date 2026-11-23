// PayPal webhooks for the ad-free donation, verified with PayPal's own verification call over the
// raw body (PayPal signs the bytes; a re-serialized event fails verification).
//   CHECKOUT.ORDER.APPROVED  → capture (the buyer approved but never came back to the site);
//   PAYMENT.CAPTURE.*        → read the capture back and apply its status (refunds, reversals).
import { AdFreeOrderModel } from '../../../models/AdFreeOrder'
import { AdFreeDonationModel } from '../../../models/AdFreeDonation'
import { applyProviderPayment } from '../../../utils/adFreeStore'
import { mapPpCapture, ppCaptureIdFromEvent } from '../../../utils/adFreeMapping'
import { reconcileOrder } from '../../../utils/adFreeReconcile'
import { connectDb } from '../../../utils/db'
import { getPpCapture, ppConfigured, verifyPpWebhook } from '../../../utils/paypal'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  if (!ppConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  }
  const raw = (await readRawBody(event, 'utf8').catch(() => null)) ?? ''
  let body: Record<string, any> | null
  try {
    body = JSON.parse(raw)
  } catch {
    body = null
  }
  const headers = Object.fromEntries(
    Object.entries(getRequestHeaders(event)).map(([k, v]) => [k.toLowerCase(), v])
  ) as Record<string, string | undefined>
  if (!body || !(await verifyPpWebhook(headers, raw))) {
    throw createError({ statusCode: 401, statusMessage: 'Unverified' })
  }

  try {
    await connectDb()
    if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const paypalOrderId = String(body.resource?.id ?? '')
      const order = paypalOrderId
        ? await AdFreeOrderModel.findOne({ provider: 'paypal', providerRef: paypalOrderId }).lean()
        : null
      if (order) await reconcileOrder(order)
      return { ok: true }
    }
    const captureId = ppCaptureIdFromEvent(body)
    if (captureId) {
      // A capture without custom_id still belongs to the order we stored it under.
      const known = await AdFreeDonationModel.findById(`pp:${captureId}`, { orderId: 1 }).lean()
      const payment = mapPpCapture(await getPpCapture(captureId), known?.orderId)
      if (payment) await applyProviderPayment(payment)
    }
  } catch (error) {
    console.warn('[ad-free] paypal webhook failed', error instanceof Error ? error.message : error)
    throw createError({ statusCode: 500, statusMessage: 'Retry later' })
  }
  return { ok: true }
})
