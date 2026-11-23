// Starts one ad-free donation: validates, writes the order, asks the provider for a hosted payment
// page and returns its URL. The owner comes from the SESSION, never from the body.
import { randomBytes } from 'node:crypto'
import { AdFreeOrderModel } from '../../../models/AdFreeOrder'
import { AD_FREE_AMOUNTS } from '../../../../utils/adFree'
import { requireUser } from '../../../utils/auth'
import { parseCheckoutRequest } from '../../../utils/adFreeCheckout'
import { connectDb } from '../../../utils/db'
import { createMpPreference, mpConfigured } from '../../../utils/mercadoPago'
import { createPpOrder, ppConfigured } from '../../../utils/paypal'

const MAX_ORDERS_PER_HOUR = 10

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const parsed = parseCheckoutRequest(user, await readBody(event).catch(() => null), {
    mercadopago: mpConfigured(),
    paypal: ppConfigured(),
  })
  if (parsed.ok === false) {
    throw createError({ statusCode: parsed.status, statusMessage: parsed.message })
  }
  const { provider, amount } = parsed.value

  await connectDb()
  const recent = await AdFreeOrderModel.countDocuments({
    uid: user.uid,
    createdAt: { $gte: new Date(Date.now() - 3_600_000) },
  })
  if (recent >= MAX_ORDERS_PER_HOUR) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Demasiados intentos seguidos. Probá de nuevo en una hora.',
    })
  }

  const order = await AdFreeOrderModel.create({
    _id: randomBytes(12).toString('hex'),
    uid: user.uid,
    provider,
    amount,
    currency: AD_FREE_AMOUNTS[provider].currency,
    providerRef: null,
  })
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl || 'https://cambio-uruguay.com').replace(/\/$/, '')

  try {
    const created =
      provider === 'mercadopago'
        ? await createMpPreference(order, { email: user.email, siteUrl })
        : await createPpOrder(order, { siteUrl })
    await AdFreeOrderModel.updateOne({ _id: order._id }, { $set: { providerRef: created.id } })
    return { orderId: order._id, url: created.url }
  } catch (error) {
    console.error(
      `[ad-free] ${provider} checkout failed`,
      error instanceof Error ? error.message : error
    )
    throw createError({
      statusCode: 502,
      statusMessage:
        provider === 'mercadopago'
          ? 'Mercado Pago no respondió. Probá de nuevo en un rato.'
          : 'PayPal no respondió. Probá de nuevo en un rato.',
    })
  }
})
