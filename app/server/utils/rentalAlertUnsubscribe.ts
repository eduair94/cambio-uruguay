import { RentalAlertModel } from '../models/RentalAlert'
import { connectDb } from './db'
import { withRentalAlertLease } from './rentalAlertLease'

export const validRentalUnsubscribeToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-f\d]{64}$/.test(token)

export async function rentalUnsubscribeInfo(token: string) {
  await connectDb()
  return RentalAlertModel.findOne({ unsubscribeToken: token })
    .select({ _id: 1, uid: 1, locale: 1, channels: 1, active: 1, revision: 1 })
    .lean()
}

/**
 * Email-only unsubscribe. Existing push consent remains independent. GET never calls this.
 * `onWrite` runs right before the write (inside the lease), so a caller can tell a failure that
 * changed nothing (a busy lease, a failed read) from one whose outcome is unknown.
 */
export async function unsubscribeRentalAlertEmail(
  token: string,
  onWrite?: () => void
): Promise<void> {
  const found = await rentalUnsubscribeInfo(token)
  if (!found) return
  await withRentalAlertLease(`uid:${found.uid}`, async assertOwned => {
    const current = await rentalUnsubscribeInfo(token)
    if (!current || !current.channels.email) return
    await assertOwned()
    onWrite?.()
    await RentalAlertModel.updateOne(
      { _id: current._id, uid: current.uid, unsubscribeToken: token },
      {
        $set: {
          'channels.email': false,
          emailAddress: null,
          active: current.active && current.channels.push,
          ...(!current.channels.push ? { revision: current.revision + 1 } : {}),
        },
      }
    )
  })
}

const copy = {
  es: {
    title: 'Cancelar correos de esta alerta',
    body: 'Dejarás de recibir por email las novedades de esta suscripción. Las notificaciones push se administran por separado en tu cuenta.',
    action: 'Cancelar correos',
    done: 'Correos cancelados',
    doneBody:
      'Esta suscripción ya no te enviará correos. Podés administrar tus otras alertas desde tu cuenta.',
    missing: 'Este enlace ya no está disponible',
    missingBody: 'Podés administrar tus suscripciones desde tu cuenta.',
    unavailable: 'No pudimos procesar el enlace',
    unavailableBody: 'No sabemos si se llegó a aplicar: probá de nuevo en unos minutos.',
    unavailableReadBody: 'Probá de nuevo en unos minutos: no se cambió nada.',
    account: 'Administrar mis alertas',
  },
  en: {
    title: 'Unsubscribe from these alert emails',
    body: 'You will stop receiving emails from this subscription. Push notifications are managed separately in your account.',
    action: 'Unsubscribe from emails',
    done: 'Email subscription cancelled',
    doneBody:
      'This subscription will no longer send you emails. You can manage your other alerts in your account.',
    missing: 'This link is no longer available',
    missingBody: 'You can manage your subscriptions in your account.',
    unavailable: 'We could not process this link',
    unavailableBody: 'We do not know whether it went through: please try again in a few minutes.',
    unavailableReadBody: 'Please try again in a few minutes: nothing was changed.',
    account: 'Manage my alerts',
  },
  pt: {
    title: 'Cancelar emails deste alerta',
    body: 'Você deixará de receber por email as novidades desta assinatura. As notificações push são administradas separadamente na sua conta.',
    action: 'Cancelar emails',
    done: 'Emails cancelados',
    doneBody:
      'Esta assinatura não enviará mais emails. Você pode administrar seus outros alertas na sua conta.',
    missing: 'Este link não está mais disponível',
    missingBody: 'Você pode administrar suas assinaturas na sua conta.',
    unavailable: 'Não foi possível processar o link',
    unavailableBody: 'Não sabemos se chegou a ser aplicado: tente novamente em alguns minutos.',
    unavailableReadBody: 'Tente novamente em alguns minutos: nada foi alterado.',
    account: 'Administrar meus alertas',
  },
}

/** Also the page of the rate-alert unsubscribe (api/alerts/unsubscribe), with its own `action`. */
export function rentalUnsubscribeHtml(
  locale: string,
  /** `unavailable`: the write was attempted and its outcome is unknown; `unavailableRead`: it failed before any write. */
  state: 'confirm' | 'done' | 'missing' | 'unavailable' | 'unavailableRead',
  token = '',
  action = '/api/rental-alerts/unsubscribe'
): string {
  const lang = locale === 'en' || locale === 'pt' ? locale : 'es'
  const c = copy[lang]
  const title = {
    confirm: c.title,
    done: c.done,
    missing: c.missing,
    unavailable: c.unavailable,
    unavailableRead: c.unavailable,
  }[state]
  const body = {
    confirm: c.body,
    done: c.doneBody,
    missing: c.missingBody,
    unavailable: c.unavailableBody,
    unavailableRead: c.unavailableReadBody,
  }[state]
  const prefix = lang === 'es' ? '' : `/${lang}`
  const form =
    state === 'confirm' && validRentalUnsubscribeToken(token)
      ? `<form method="post" action="${action}?token=${token}"><button type="submit">${c.action}</button></form>`
      : ''
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · Cambio Uruguay</title><style>html{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;padding:24px}main{max-width:580px;margin:8vh auto}h1{font-size:1.8rem;line-height:1.25}p{line-height:1.7}button,a{min-height:44px;display:inline-flex;align-items:center;font:inherit}button{padding:10px 18px;border-radius:8px;cursor:pointer}form{margin:24px 0}a{color:LinkText}</style></head><body><main><h1>${title}</h1><p>${body}</p>${form}<a href="${prefix}/cuenta?tab=alerts">${c.account}</a></main></body></html>`
}
