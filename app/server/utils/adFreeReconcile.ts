// Asks the provider what happened to an order and applies the answer. One path for the return
// page (confirm), the account summary (the fallback when a webhook never arrives) and PayPal's
// "approved but never came back" webhook.
import type { AdFreeOrderDoc } from '../models/AdFreeOrder'
import { AdFreeDonationModel } from '../models/AdFreeDonation'
import { AdFreeOrderModel } from '../models/AdFreeOrder'
import type { DonationStatus } from '../../utils/adFree'
import { applyProviderPayment } from './adFreeStore'
import { mapMpPayment, mapPpCapture } from './adFreeMapping'
import { getMpPayment, mpConfigured, searchMpPayments } from './mercadoPago'
import { ppConfigured, reconcilePpOrder } from './paypal'

/** The statuses of the payments that matched this order, as the provider reports them now. */
export async function reconcileOrder(
  order: Pick<AdFreeOrderDoc, '_id' | 'provider' | 'providerRef'>
): Promise<DonationStatus[]> {
  const statuses: DonationStatus[] = []
  await AdFreeOrderModel.updateOne({ _id: order._id }, { $set: { checkedAt: new Date() } })
  if (order.provider === 'mercadopago' && mpConfigured()) {
    for (const found of await searchMpPayments(order._id)) {
      // The search index can lag behind the payment (an approval shown after its refund): read
      // each one by id, which is what the webhook reads too.
      const raw = await getMpPayment(String(found.id)).catch(() => found)
      const payment = mapMpPayment(raw)
      if (!payment) continue
      if ((await applyProviderPayment(payment)).matched) statuses.push(payment.status)
    }
  } else if (order.provider === 'paypal' && ppConfigured() && order.providerRef) {
    const { captures, customId, declined } = await reconcilePpOrder(order.providerRef, order._id)
    if (declined) statuses.push('rejected')
    for (const raw of captures) {
      const payment = mapPpCapture(raw, customId ?? order._id)
      if (!payment) continue
      if ((await applyProviderPayment(payment)).matched) statuses.push(payment.status)
    }
  }
  return statuses
}

const RECENT_MS = 3 * 86_400_000
const RECHECK_MS = 2 * 60_000
const SETTLED: DonationStatus[] = ['approved', 'refunded', 'charged_back']

/**
 * The fallback for a webhook that never came (a cash payment credited days later, a provider
 * outage): the account's recent orders that have no settled payment yet are asked again, at most
 * every two minutes each. Most accounts have no order at all, so this is one indexed query.
 */
export async function reconcileRecentOrders(uid: string): Promise<void> {
  const now = Date.now()
  const orders = await AdFreeOrderModel.find(
    {
      uid,
      providerRef: { $ne: null },
      createdAt: { $gte: new Date(now - RECENT_MS) },
      $or: [{ checkedAt: null }, { checkedAt: { $lt: new Date(now - RECHECK_MS) } }],
    },
    { provider: 1, providerRef: 1 }
  )
    .sort({ createdAt: -1 })
    .limit(3)
    .lean()
  for (const order of orders) {
    const settled = await AdFreeDonationModel.exists({
      orderId: order._id,
      status: { $in: SETTLED },
    })
    if (settled) continue
    try {
      await reconcileOrder(order)
    } catch (error) {
      console.warn(
        `[ad-free] fallback reconcile ${order.provider} failed`,
        error instanceof Error ? error.message : error
      )
    }
  }
}
