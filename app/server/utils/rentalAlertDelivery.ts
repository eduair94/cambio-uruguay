import { createHash } from 'node:crypto'
import type { RentalAlertDoc } from '../models/RentalAlert'
import { RentalAlertModel } from '../models/RentalAlert'
import { PushRegistrationModel } from '../models/PushRegistration'
import {
  rentalAlertSearchUrl,
  type RentalAlertCandidate,
  type RentalAlertKind,
} from '../../utils/rentalAlerts'
import { isListingAlertKind, listingAlertPath } from '../../utils/listingAlerts'
import { rentalValidKey } from '../../utils/rentals'
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
    expenses: 'Gastos comunes',
    unknown: 'sin dato publicado',
    browse: 'Ver la búsqueda completa',
    detail: 'Ver ficha',
    cancel: 'Cancelar estos correos',
    note: 'Los precios y la disponibilidad pueden cambiar. Confirmá las condiciones en el aviso original.',
    comparison:
      'Las oportunidades comparan precios solicitados de otros avisos. Revisá la muestra y sus diferencias antes de decidir; el descuento indicado no garantiza ahorro ni equivale a una tasación.',
  },
  en: {
    subject: 'New rentals for your search',
    opportunity: 'New possible rental opportunities',
    intro: 'We found new listings that match your alert.',
    expenses: 'Monthly building fees',
    unknown: 'not reported',
    browse: 'View the full search',
    detail: 'View listing',
    cancel: 'Unsubscribe from these emails',
    note: 'Prices and availability may change. Confirm the conditions in the original listing.',
    comparison:
      'Opportunities compare asking prices in other listings. Review the sample and its differences before deciding; the indicated discount is not guaranteed savings or a valuation.',
  },
  pt: {
    subject: 'Novos aluguéis para sua busca',
    opportunity: 'Novas possíveis oportunidades de aluguel',
    intro: 'Encontramos novos anúncios que correspondem ao seu alerta.',
    expenses: 'Condomínio mensal',
    unknown: 'não informado',
    browse: 'Ver a busca completa',
    detail: 'Ver anúncio',
    cancel: 'Cancelar estes e-mails',
    note: 'Os preços e a disponibilidade podem mudar. Confirme as condições no anúncio original.',
    comparison:
      'As oportunidades comparam preços pedidos em outros anúncios. Confira a amostra e suas diferenças antes de decidir; o desconto indicado não garante economia nem equivale a uma avaliação.',
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

type Locale = keyof typeof COPY
type Money = RentalAlertCandidate['price']
const KIND_COPY: Record<RentalAlertKind, Record<Locale, { fresh: string; updates: string }>> = {
  'rental-search': {
    es: { fresh: COPY.es.subject, updates: 'Novedades en tu búsqueda de alquileres' },
    en: { fresh: COPY.en.subject, updates: 'Updates for your rental search' },
    pt: { fresh: COPY.pt.subject, updates: 'Novidades na sua busca de aluguéis' },
  },
  'rental-opportunity': {
    es: { fresh: COPY.es.opportunity, updates: COPY.es.opportunity },
    en: { fresh: COPY.en.opportunity, updates: COPY.en.opportunity },
    pt: { fresh: COPY.pt.opportunity, updates: COPY.pt.opportunity },
  },
  'car-search': {
    es: {
      fresh: 'Nuevos autos usados para tu búsqueda',
      updates: 'Novedades en tu búsqueda de autos usados',
    },
    en: { fresh: 'New used cars for your search', updates: 'Updates for your used car search' },
    pt: {
      fresh: 'Novos carros usados para sua busca',
      updates: 'Novidades na sua busca de carros usados',
    },
  },
  'moto-search': {
    es: {
      fresh: 'Nuevas motos usadas para tu búsqueda',
      updates: 'Novedades en tu búsqueda de motos usadas',
    },
    en: {
      fresh: 'New used motorcycles for your search',
      updates: 'Updates for your used motorcycle search',
    },
    pt: {
      fresh: 'Novas motos usadas para sua busca',
      updates: 'Novidades na sua busca de motos usadas',
    },
  },
  'sale-search': {
    es: {
      fresh: 'Nuevas viviendas en venta para tu búsqueda',
      updates: 'Novedades en tu búsqueda de viviendas en venta',
    },
    en: {
      fresh: 'New homes for sale for your search',
      updates: 'Updates for your homes for sale search',
    },
    pt: {
      fresh: 'Novos imóveis à venda para sua busca',
      updates: 'Novidades na sua busca de imóveis à venda',
    },
  },
}
const COUNTS: Record<Locale, { fresh: (n: number) => string; drops: (n: number) => string }> = {
  es: {
    fresh: n => (n === 1 ? '1 aviso nuevo' : `${n} avisos nuevos`),
    drops: n => (n === 1 ? '1 bajó de precio' : `${n} bajaron de precio`),
  },
  en: {
    fresh: n => (n === 1 ? '1 new listing' : `${n} new listings`),
    drops: n => (n === 1 ? '1 price drop' : `${n} price drops`),
  },
  pt: {
    fresh: n => (n === 1 ? '1 novo anúncio' : `${n} novos anúncios`),
    drops: n => (n === 1 ? '1 baixou de preço' : `${n} baixaram de preço`),
  },
}
const BEFORE: Record<Locale, string> = { es: 'Antes', en: 'Was', pt: 'Antes' }
const INTRO_UPDATES: Record<Locale, string> = {
  es: 'Encontramos avisos nuevos o que bajaron de precio y coinciden con tu alerta.',
  en: 'We found new or cheaper listings that match your alert.',
  pt: 'Encontramos anúncios novos ou mais baratos que correspondem ao seu alerta.',
}

const localeOf = (alert: Pick<RentalAlertDoc, 'locale'>): Locale =>
  alert.locale in COPY ? alert.locale : 'es'

/** "3 avisos nuevos · 1 bajó de precio": counts only, nothing about any advert. */
export function rentalAlertCountLine(locale: Locale, candidates: RentalAlertCandidate[]): string {
  const drops = candidates.filter(item => item.previousPrice).length
  const fresh = candidates.length - drops
  return [fresh ? COUNTS[locale].fresh(fresh) : '', drops ? COUNTS[locale].drops(drops) : '']
    .filter(Boolean)
    .join(' · ')
}

export function rentalAlertTitle(
  alert: Pick<RentalAlertDoc, 'kind' | 'locale'>,
  candidates: RentalAlertCandidate[]
): string {
  const titles = (KIND_COPY[alert.kind] ?? KIND_COPY['rental-search'])[localeOf(alert)]
  return candidates.some(item => item.previousPrice) ? titles.updates : titles.fresh
}

/** Only an original advert on Mercado Libre Uruguay over https leaves the site from an email. */
const EXTERNAL_ADVERT = /^https:\/\/(?:[a-z0-9-]+\.)*mercadolibre\.com\.uy\/[^\s"'<>]*$/i
const INTERNAL_PATH = /^\/[\w\-/%.]+$/

function candidateLink(
  alert: RentalAlertDoc,
  item: RentalAlertCandidate,
  searchUrl: string
): string {
  if (!isListingAlertKind(alert.kind))
    // El texto del mail va en el idioma del suscriptor; la ficha, no: /alquileres/<key> existe
    // sólo en español (`defineI18nRoute` en la página, como el blog y las sucursales). Enlazar
    // /en/alquileres/... mandaba a un 404. El catálogo (`searchUrl`) sí conserva su espejo.
    return rentalValidKey(item.propertyKey) ? `${ORIGIN}/alquileres/${item.propertyKey}` : searchUrl
  if (item.link && EXTERNAL_ADVERT.test(item.link)) return item.link
  // Autos and sales have their own page per advert (Spanish path, always present); motos do not.
  if (INTERNAL_PATH.test(item.url) && item.url !== listingAlertPath(alert.kind))
    return `${ORIGIN}${item.url}`
  return searchUrl
}

export function rentalAlertEmail(
  alert: RentalAlertDoc,
  candidates: RentalAlertCandidate[],
  deliveryId: string
) {
  const locale = localeOf(alert)
  const c = COPY[locale]
  const searchUrl = ORIGIN + rentalAlertSearchUrl(alert)
  if (!/^[a-f\d]{64}$/i.test(alert.unsubscribeToken)) throw new Error('Invalid unsubscribe token')
  const unsubscribeUrl = `${ORIGIN}/api/rental-alerts/unsubscribe?token=${encodeURIComponent(alert.unsubscribeToken)}`
  const money = (price: Money | null | undefined) =>
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
  const dropLine = (item: RentalAlertCandidate) => {
    const before = item.previousPrice
    if (!before || before.currency !== item.price.currency || !(before.amount > item.price.amount))
      return ''
    const pct = Math.round((1 - item.price.amount / before.amount) * 100)
    return `${BEFORE[locale]} ${money(before)} (−${pct} %)`
  }
  const listing = isListingAlertKind(alert.kind)
  const subject = rentalAlertTitle(alert, candidates)
  const hasDrops = candidates.some(item => item.previousPrice)
  const cards = candidates.slice(0, 10).map(item => {
    const link = candidateLink(alert, item, searchUrl)
    const title = plain(item.title)
    const place = listing
      ? (item.facts ?? []).map(fact => plain(fact, 100)).join(' · ')
      : [plain(item.neighborhood, 100), plain(item.department, 100)].filter(Boolean).join(', ')
    const costs = [
      listing ? money(item.price) : `${money(item.price)} · ${c.expenses}: ${money(item.expenses)}`,
      dropLine(item),
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      html: `<li><h2 style="font-size:18px">${html(title)}</h2>${place ? `<p>${html(place)}</p>` : ''}<p>${html(costs)}</p><p><a href="${html(link)}">${c.detail}</a></p></li>`,
      text: [title, place, costs, link].filter(Boolean).join('\n'),
    }
  })
  const note = [c.note, ...(alert.kind === 'rental-opportunity' ? [c.comparison] : [])].join(' ')
  const intro = hasDrops ? INTRO_UPDATES[locale] : c.intro
  const count = rentalAlertCountLine(locale, candidates)
  return {
    subject,
    html: `<h1>${subject}</h1><p>${intro}</p><p>${count}</p><ul>${cards.map(card => card.html).join('')}</ul><p><a href="${html(searchUrl)}">${c.browse}</a></p><p>${html(note)}</p><p><a href="${html(unsubscribeUrl)}">${c.cancel}</a></p>`,
    text: `${subject}\n\n${intro}\n${count}\n\n${cards.map(card => card.text).join('\n\n')}\n\n${c.browse}: ${searchUrl}\n\n${note}\n\n${c.cancel}: ${unsubscribeUrl}`,
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
    const title = rentalAlertTitle(alert, candidates)
    const body = rentalAlertCountLine(localeOf(alert), candidates)
    const tag = `rental-${createHash('sha256').update(deliveryId).digest('hex').slice(0, 32)}`
    const outcomes: Array<'sent' | 'invalid' | 'failed' | 'uncertain'> = []
    for (const device of registrations) {
      // Account switches or device revocation after reading the batch must not retain ownership.
      if (!(await PushRegistrationModel.exists({ _id: device._id, uid: alert.uid }))) continue
      pushAttempted = true
      const result = await sendPushNotification(device.token, title, body, {
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
