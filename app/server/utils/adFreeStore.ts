// The ad-free donation ledger: applies what a provider says about a payment and keeps
// `User.adFreeUntil` equal to what the approved payments add up to. Every entry point (the return
// page's confirm, both webhooks) ends here, so the rules live in one place:
//   - a payment that does not match its order (currency, amount, reference) grants nothing;
//   - `approvedAt` is set once, the first time a payment is seen approved;
//   - the period is recomputed from scratch, so a repeated webhook changes nothing and a refund
//     removes exactly its own twelve months.
import { AdFreeDonationModel } from '../models/AdFreeDonation'
import { AdFreeOrderModel } from '../models/AdFreeOrder'
import { UserModel } from '../models/User'
import {
  computeAdFreeUntil,
  formatAmount,
  isAdFreeActive,
  type AdFreeCurrency,
  type AdFreeProvider,
  type DonationStatus,
} from '../../utils/adFree'
import { checkAgainstOrder, type ProviderPayment } from './adFreeMapping'
import { connectDb } from './db'
import { isMailerConfigured, sendMail } from './mailer'
import { sendTelegram } from './telegram'

export interface AdFreeDonationSummary {
  provider: AdFreeProvider
  amount: number
  currency: AdFreeCurrency
  status: DonationStatus
  approvedAt: string | null
  createdAt: string
}

export interface AdFreeSummary {
  active: boolean
  until: string | null
  donations: AdFreeDonationSummary[]
}

export async function recomputeUser(uid: string): Promise<Date | null> {
  const approved = await AdFreeDonationModel.find(
    { uid, status: 'approved', approvedAt: { $ne: null } },
    { approvedAt: 1 }
  ).lean()
  const until = computeAdFreeUntil(approved.map(d => ({ approvedAt: d.approvedAt as Date })))
  await UserModel.updateOne({ _id: uid }, { $set: { adFreeUntil: until } }, { upsert: true })
  return until
}

export async function adFreeSummary(uid: string): Promise<AdFreeSummary> {
  await connectDb()
  const [user, donations] = await Promise.all([
    UserModel.findById(uid, { adFreeUntil: 1 }).lean(),
    AdFreeDonationModel.find({ uid }).sort({ createdAt: -1 }).limit(50).lean(),
  ])
  const until = user?.adFreeUntil ? new Date(user.adFreeUntil) : null
  return {
    active: isAdFreeActive(until),
    until: until ? until.toISOString() : null,
    donations: donations.map(d => ({
      provider: d.provider,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      approvedAt: d.approvedAt ? new Date(d.approvedAt).toISOString() : null,
      createdAt: new Date(d.createdAt).toISOString(),
    })),
  }
}

/**
 * Store what the provider said about one payment and recompute the owner's period. Returns
 * `newlyApproved` the first time this payment is seen approved (for the thank-you notices), and
 * `matched: false` when the payment does not belong to a known order or does not match it.
 */
export async function applyProviderPayment(
  p: ProviderPayment
): Promise<{ matched: boolean; newlyApproved: boolean; uid: string | null }> {
  await connectDb()
  const order = await AdFreeOrderModel.findById(p.orderId).lean()
  if (!order || order.provider !== p.provider || !checkAgainstOrder(order, p)) {
    console.warn('[ad-free] payment does not match its order', {
      payment: p.id,
      order: p.orderId,
      found: Boolean(order),
    })
    return { matched: false, newlyApproved: false, uid: order?.uid ?? null }
  }

  const previous = await AdFreeDonationModel.findById(p.id, { status: 1, approvedAt: 1 }).lean()
  const approvedNow = p.status === 'approved'
  const approvedAt = previous?.approvedAt ?? (approvedNow ? (p.approvedAt ?? new Date()) : null)
  await AdFreeDonationModel.updateOne(
    { _id: p.id },
    {
      $set: {
        status: p.status,
        statusDetail: p.statusDetail,
        approvedAt,
        amount: p.amount,
        currency: p.currency,
      },
      $setOnInsert: { orderId: order._id, uid: order.uid, provider: p.provider },
    },
    { upsert: true }
  )
  const until = await recomputeUser(order.uid)

  const newlyApproved = approvedNow && !previous?.approvedAt
  const lost = previous?.status === 'approved' && (p.status === 'refunded' || p.status === 'charged_back')
  if (newlyApproved || lost) {
    // Notices never decide anything and never fail the confirmation.
    void notify(order.uid, p, until, newlyApproved ? 'approved' : 'lost').catch(error =>
      console.warn('[ad-free] notice failed', error instanceof Error ? error.message : error)
    )
  }
  return { matched: true, newlyApproved, uid: order.uid }
}

function dateEs(d: Date): string {
  return d.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

async function notify(
  uid: string,
  p: ProviderPayment,
  until: Date | null,
  kind: 'approved' | 'lost'
): Promise<void> {
  const adminChatId = (useRuntimeConfig().telegram as { adminChatId?: string })?.adminChatId
  const provider = p.provider === 'mercadopago' ? 'Mercado Pago' : 'PayPal'
  if (adminChatId) {
    // Plain words only: sendTelegram uses Markdown and nothing here needs it.
    const text =
      kind === 'approved'
        ? `Nuevo aporte sin anuncios: ${formatAmount(p.amount, p.currency)} por ${provider}.`
        : `Aporte sin anuncios devuelto o desconocido (${p.status}): ${formatAmount(p.amount, p.currency)} por ${provider}.`
    await sendTelegram(adminChatId, text.replace(/[_*`[\]]/g, ''))
  }
  if (kind !== 'approved' || !until || !isMailerConfigured()) return
  const user = await UserModel.findById(uid, { email: 1 }).lean()
  if (!user?.email) return
  const siteUrl = String(useRuntimeConfig().public.siteUrl || 'https://cambio-uruguay.com')
  const page = `${siteUrl}/cuenta/sin-publicidad`
  const untilText = dateEs(until)
  await sendMail({
    to: user.email,
    subject: 'Gracias por tu aporte: tu cuenta no tiene anuncios',
    text:
      `Gracias por apoyar Cambio Uruguay.\n\n` +
      `Recibimos tu aporte de ${formatAmount(p.amount, p.currency)} por ${provider}. ` +
      `Tu cuenta no tiene anuncios hasta el ${untilText}, en todos los dispositivos donde inicies sesión.\n\n` +
      `No es una suscripción: no se renueva sola y no vamos a cobrarte nada más.\n\n` +
      `El comprobante del pago te lo manda ${provider}. Tus aportes: ${page}\n\n` +
      `Si querés que te devolvamos el aporte, respondé este correo dentro de los 5 días hábiles.`,
    html:
      `<p>Gracias por apoyar Cambio Uruguay.</p>` +
      `<p>Recibimos tu aporte de <strong>${formatAmount(p.amount, p.currency)}</strong> por ${provider}. ` +
      `Tu cuenta no tiene anuncios hasta el <strong>${untilText}</strong>, en todos los dispositivos donde inicies sesión.</p>` +
      `<p>No es una suscripción: no se renueva sola y no vamos a cobrarte nada más.</p>` +
      `<p>El comprobante del pago te lo manda ${provider}. <a href="${page}">Ver tus aportes</a>.</p>` +
      `<p>Si querés que te devolvamos el aporte, respondé este correo dentro de los 5 días hábiles.</p>`,
  })
}
