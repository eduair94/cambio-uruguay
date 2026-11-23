// The return page asks this after coming back from the provider. It never reads the status from
// the return URL: it asks the provider about the order (Mercado Pago by external_reference,
// PayPal by the order id we stored, capturing it if the buyer approved and nobody captured yet).
import { AdFreeOrderModel } from '../../../models/AdFreeOrder'
import { requireUser } from '../../../utils/auth'
import { adFreeSummary, applyProviderPayment } from '../../../utils/adFreeStore'
import { bestDonationStatus, mapMpPayment, mapPpCapture } from '../../../utils/adFreeMapping'
import { connectDb } from '../../../utils/db'
import { mpConfigured, searchMpPayments } from '../../../utils/mercadoPago'
import { ppConfigured, reconcilePpOrder } from '../../../utils/paypal'
import type { DonationStatus } from '../../../../utils/adFree'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const body = ((await readBody(event).catch(() => null)) ?? {}) as Record<string, unknown>
  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  if (!/^[a-f0-9]{24}$/.test(orderId)) {
    throw createError({ statusCode: 400, statusMessage: 'Orden inválida.' })
  }
  await connectDb()
  const order = await AdFreeOrderModel.findById(orderId).lean()
  // Someone else's order answers like a missing one: an id must not tell who it belongs to.
  if (!order || order.uid !== uid) {
    throw createError({ statusCode: 404, statusMessage: 'No encontramos ese aporte.' })
  }

  const statuses: DonationStatus[] = []
  try {
    if (order.provider === 'mercadopago' && mpConfigured()) {
      for (const raw of await searchMpPayments(order._id)) {
        const payment = mapMpPayment(raw)
        if (!payment) continue
        const applied = await applyProviderPayment(payment)
        if (applied.matched) statuses.push(payment.status)
      }
    } else if (order.provider === 'paypal' && ppConfigured() && order.providerRef) {
      const { captures, customId } = await reconcilePpOrder(order.providerRef, order._id)
      for (const raw of captures) {
        const payment = mapPpCapture(raw, customId ?? order._id)
        if (!payment) continue
        const applied = await applyProviderPayment(payment)
        if (applied.matched) statuses.push(payment.status)
      }
    }
  } catch (error) {
    // The provider being slow is not a verdict: the page retries, and the webhook still arrives.
    console.warn(
      `[ad-free] confirm ${order.provider} failed`,
      error instanceof Error ? error.message : error
    )
    return { status: 'unknown' as const, summary: await adFreeSummary(uid) }
  }
  return { status: bestDonationStatus(statuses), summary: await adFreeSummary(uid) }
})
