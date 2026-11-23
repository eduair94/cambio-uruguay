// The return page asks this after coming back from the provider. It never reads the status from
// the return URL: it asks the provider about the order (Mercado Pago by external_reference,
// PayPal by the order id we stored, capturing it if the buyer approved and nobody captured yet).
import { AdFreeOrderModel } from '../../../models/AdFreeOrder'
import { requireUser } from '../../../utils/auth'
import { adFreeSummary } from '../../../utils/adFreeStore'
import { bestDonationStatus } from '../../../utils/adFreeMapping'
import { reconcileOrder } from '../../../utils/adFreeReconcile'
import { connectDb } from '../../../utils/db'

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
  // What the page needs for the GA4 `purchase` (value, currency); never a provider id.
  const orderInfo = { amount: order.amount, currency: order.currency, provider: order.provider }
  try {
    const statuses = await reconcileOrder(order)
    return {
      status: bestDonationStatus(statuses),
      order: orderInfo,
      summary: await adFreeSummary(uid),
    }
  } catch (error) {
    // The provider being slow is not a verdict: the page retries, and the webhook still arrives.
    console.warn(
      `[ad-free] confirm ${order.provider} failed`,
      error instanceof Error ? error.message : error
    )
    return { status: 'unknown' as const, order: orderInfo, summary: await adFreeSummary(uid) }
  }
})
