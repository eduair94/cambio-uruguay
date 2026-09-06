import { createHash } from 'node:crypto'
import type { RentalAlertDoc } from '../models/RentalAlert'
import { RentalAlertModel } from '../models/RentalAlert'
import { PushRegistrationModel } from '../models/PushRegistration'
import { rentalAlertSearchUrl, type RentalAlertCandidate } from '../../utils/rentalAlerts'
import { adminAuth } from './firebaseAdmin'
import { connectDb } from './db'
import { isMailerConfigured, sendMail } from './mailer'
import { sendPushNotification } from './push'
import { unregisterPushToken } from './pushRegistrations'

export interface RentalAlertDeliveryResult {
  status: 'sent' | 'unavailable' | 'failed' | 'uncertain'
  reason?: string
}

const ORIGIN = 'https://cambio-uruguay.com'
const COPY = {
  es: {
    subject: 'Nuevos alquileres para tu búsqueda',
    opportunity: 'Nuevas posibles oportunidades de alquiler',
    intro: 'Encontramos avisos nuevos que coinciden con tu alerta.',
    count: 'avisos nuevos',
    expenses: 'Gastos comunes',
    unknown: 'sin dato publicado',
    browse: 'Ver la búsqueda completa',
    detail: 'Ver ficha',
    cancel: 'Cancelar estos correos',
    note: 'Los precios y la disponibilidad pueden cambiar. Confirmá las condiciones en el aviso original.',
    comparison:
      'Las oportunidades comparan precios solicitados de otros avisos. Revisá la muestra y sus diferencias antes de decidir; el descuento indicado no garantiza ahorro ni equivale a una tasación.',
    push: 'Hay nuevos avisos para revisar en tu búsqueda guardada.',
  },
  en: {
    subject: 'New rentals for your search',
    opportunity: 'New possible rental opportunities',
    intro: 'We found new listings that match your alert.',
    count: 'new listings',
    expenses: 'Monthly building fees',
    unknown: 'not reported',
    browse: 'View the full search',
    detail: 'View listing',
    cancel: 'Unsubscribe from these emails',
    note: 'Prices and availability may change. Confirm the conditions in the original listing.',
    comparison:
      'Opportunities compare asking prices in other listings. Review the sample and its differences before deciding; the indicated discount is not guaranteed savings or a valuation.',
    push: 'New listings are available to review in your saved search.',
  },
  pt: {
    subject: 'Novos aluguéis para sua busca',
    opportunity: 'Novas possíveis oportunidades de aluguel',
    intro: 'Encontramos novos anúncios que correspondem ao seu alerta.',
    count: 'novos anúncios',
    expenses: 'Condomínio mensal',
    unknown: 'não informado',
    browse: 'Ver a busca completa',
    detail: 'Ver anúncio',
    cancel: 'Cancelar estes e-mails',
    note: 'Os preços e a disponibilidade podem mudar. Confirme as condições no anúncio original.',
    comparison:
      'As oportunidades comparam preços pedidos em outros anúncios. Confira a amostra e suas diferenças antes de decidir; o desconto indicado não garante economia nem equivale a uma avaliação.',
    push: 'Há novos anúncios para conferir na sua busca salva.',
  },
}

function plain(value: unknown, max = 300): string {
  return (
    String(value ?? '')
      // eslint-disable-next-line no-control-regex -- strip untrusted control characters from outgoing text
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .slice(0, max)
  )
}

function html(value: unknown): string {
  return plain(value, 12_000).replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )
}

function localePrefix(locale: string): string {
  return locale === 'en' || locale === 'pt' ? `/${locale}` : ''
}

export function rentalAlertEmail(
  alert: RentalAlertDoc,
  candidates: RentalAlertCandidate[],
  deliveryId: string
) {
  const locale = alert.locale in COPY ? alert.locale : 'es'
  const c = COPY[locale]
  const searchUrl = ORIGIN + rentalAlertSearchUrl(alert)
  if (!/^[a-f\d]{64}$/i.test(alert.unsubscribeToken)) throw new Error('Invalid unsubscribe token')
  const unsubscribeUrl = `${ORIGIN}/api/rental-alerts/unsubscribe?token=${encodeURIComponent(alert.unsubscribeToken)}`
  const money = (price: RentalAlertCandidate['price'] | null) =>
    price &&
    Number.isFinite(price.amount) &&
    price.amount >= 0 &&
    ['UYU', 'USD'].includes(price.currency)
      ? new Intl.NumberFormat(locale === 'es' ? 'es-UY' : locale === 'pt' ? 'pt-BR' : 'en-US', {
          style: 'currency',
          currency: price.currency,
          maximumFractionDigits: 0,
        }).format(price.amount)
      : c.unknown
  const subject = alert.kind === 'rental-opportunity' ? c.opportunity : c.subject
  const cards = candidates.slice(0, 10).map(item => {
    const link = /^[a-z0-9][a-z0-9-]{0,180}$/.test(item.propertyKey)
      ? `${ORIGIN}${localePrefix(locale)}/alquileres/${item.propertyKey}`
      : searchUrl
    const title = plain(item.title)
    const place = [plain(item.neighborhood, 100), plain(item.department, 100)]
      .filter(Boolean)
      .join(', ')
    const costs = `${money(item.price)} · ${c.expenses}: ${money(item.expenses)}`
    return {
      html: `<li><h2 style="font-size:18px">${html(title)}</h2><p>${html(place)}</p><p>${html(costs)}</p><p><a href="${html(link)}">${c.detail}</a></p></li>`,
      text: `${title}\n${place}\n${costs}\n${link}`,
    }
  })
  const note = [c.note, ...(alert.kind === 'rental-opportunity' ? [c.comparison] : [])].join(' ')
  return {
    subject,
    html: `<h1>${subject}</h1><p>${c.intro}</p><p>${candidates.length} ${c.count}</p><ul>${cards.map(card => card.html).join('')}</ul><p><a href="${html(searchUrl)}">${c.browse}</a></p><p>${html(note)}</p><p><a href="${html(unsubscribeUrl)}">${c.cancel}</a></p>`,
    text: `${subject}\n\n${c.intro}\n${candidates.length} ${c.count}\n\n${cards.map(card => card.text).join('\n\n')}\n\n${c.browse}: ${searchUrl}\n\n${note}\n\n${c.cancel}: ${unsubscribeUrl}`,
    listUnsubscribeUrl: unsubscribeUrl,
    messageId: `<rental-${createHash('sha256').update(deliveryId).digest('hex')}@cambio-uruguay.com>`,
  }
}

export function smtpFailureStatus(error: unknown): 'failed' | 'uncertain' {
  const e = error as { code?: string; command?: string; responseCode?: number }
  // Explicit SMTP rejection or failure before a connection is established is retryable.
  if (
    (e.responseCode && e.responseCode >= 400 && e.responseCode <= 599) ||
    e.code === 'EAUTH' ||
    e.code === 'EENVELOPE' ||
    e.command === 'CONN' ||
    ['EDNS', 'ECONNREFUSED'].includes(e.code || '')
  )
    return 'failed'
  // A timeout after DATA may have happened after acceptance. A stable Message-ID
  // helps diagnose it, but does not provide SMTP exactly-once delivery.
  return 'uncertain'
}

export async function deliverRentalAlertChannel(input: {
  channel: 'email' | 'push'
  alert: RentalAlertDoc
  candidates: RentalAlertCandidate[]
  deliveryId: string
}): Promise<RentalAlertDeliveryResult> {
  const { channel, alert, candidates, deliveryId } = input
  let pushAccepted = false
  let pushAttempted = false
  if (!candidates.length) return { status: 'unavailable', reason: 'empty_digest' }
  try {
    await connectDb()
    // Opt-out, edit and pause win over an already queued digest.
    const stillActive = await RentalAlertModel.exists({
      _id: alert._id,
      uid: alert.uid,
      active: true,
      revision: alert.revision,
      [`channels.${channel}`]: true,
    })
    if (!stillActive) return { status: 'unavailable', reason: 'subscription_changed' }
    const account = await adminAuth().getUser(alert.uid)
    // Subscription writes already require a non-anonymous authenticated session.
    // Firebase custom-token accounts may legitimately have no providerData (Telegram/Discord).
    if (account.disabled) return { status: 'unavailable', reason: 'account_ineligible' }
    if (channel === 'email') {
      if (!isMailerConfigured()) return { status: 'unavailable', reason: 'email_unconfigured' }
      if (
        !account.emailVerified ||
        !account.email ||
        !alert.emailAddress ||
        account.email.trim().toLowerCase() !== alert.emailAddress.trim().toLowerCase()
      )
        return { status: 'unavailable', reason: 'email_unverified_or_changed' }
      const content = rentalAlertEmail(alert, candidates, deliveryId)
      try {
        await sendMail({ to: account.email, ...content })
        return { status: 'sent' }
      } catch (error) {
        return { status: smtpFailureStatus(error), reason: 'smtp_delivery' }
      }
    }
    const registrations = await PushRegistrationModel.find({ uid: alert.uid })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean()
    if (!registrations.length) return { status: 'unavailable', reason: 'no_push_device' }
    const c = COPY[alert.locale] || COPY.es
    const title = alert.kind === 'rental-opportunity' ? c.opportunity : c.subject
    const tag = `rental-${createHash('sha256').update(deliveryId).digest('hex').slice(0, 32)}`
    const outcomes: Array<'sent' | 'invalid' | 'failed' | 'uncertain'> = []
    for (const device of registrations) {
      // Account switches or device revocation after reading the batch must not retain ownership.
      if (!(await PushRegistrationModel.exists({ _id: device._id, uid: alert.uid }))) continue
      pushAttempted = true
      const result = await sendPushNotification(device.token, title, c.push, {
        url: rentalAlertSearchUrl(alert),
        tag,
        dataOnly: true,
      })
      if (result.status === 'sent') pushAccepted = true
      outcomes.push(result.status)
      if (result.status === 'invalid') await unregisterPushToken(alert.uid, device.token)
    }
    if (outcomes.includes('sent'))
      return {
        status: 'sent',
        ...(outcomes.some(s => s !== 'sent') ? { reason: 'partial_push' } : {}),
      }
    if (outcomes.includes('uncertain')) return { status: 'uncertain', reason: 'push_delivery' }
    if (outcomes.includes('failed')) return { status: 'failed', reason: 'push_delivery' }
    return { status: 'unavailable', reason: 'no_push_device' }
  } catch {
    if (pushAccepted) return { status: 'sent', reason: 'partial_push' }
    if (pushAttempted) return { status: 'uncertain', reason: 'push_delivery' }
    return { status: 'failed', reason: 'delivery_preflight' }
  }
}
