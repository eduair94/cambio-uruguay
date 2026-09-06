import { getMessaging } from 'firebase-admin/messaging'
import { adminApp } from './firebaseAdmin'
import type { AlertDoc } from '../models/Alert'

const KIND_LABEL: Record<AlertDoc['kind'], string> = {
  bestBuy: 'mejor compra',
  bestSell: 'mejor venta',
}

/** Pure notification copy (Spanish). */
export function alertText(alert: AlertDoc, rate: number): { title: string; body: string } {
  const where = alert.origin && alert.origin !== 'any' ? ` en ${alert.origin}` : ''
  return {
    title: `${alert.currency} ${KIND_LABEL[alert.kind]} ${alert.op} ${alert.target}`,
    body: `La ${KIND_LABEL[alert.kind]} de ${alert.currency}${where} está en ${rate} (objetivo ${alert.op} ${alert.target}).`,
  }
}

export interface PushResult {
  token: string
  status: 'sent' | 'invalid' | 'failed' | 'uncertain'
}

export function internalPushUrl(value: string): string {
  try {
    const url = new URL(value, 'https://cambio-uruguay.com')
    if (url.origin !== 'https://cambio-uruguay.com' || url.username || url.password)
      return 'https://cambio-uruguay.com/cuenta'
    return url.href
  } catch {
    return 'https://cambio-uruguay.com/cuenta'
  }
}

/** HTTP v1 per-device sends work with the installed Admin SDK, without legacy batch RPCs. */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  options: { url: string; tag: string; dataOnly?: boolean }
): Promise<PushResult> {
  const url = internalPushUrl(options.url)
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const messaging = getMessaging(adminApp())
    const sending = messaging.send({
      token,
      ...(options.dataOnly
        ? { data: { title, body, url, tag: options.tag } }
        : { notification: { title, body } }),
      webpush: {
        headers: { TTL: '86400' },
        ...(options.dataOnly ? {} : { fcmOptions: { link: url } }),
        ...(options.dataOnly
          ? {}
          : {
              notification: {
                ...(options.tag ? { tag: options.tag } : {}),
                icon: '/android-chrome-192x192.png',
              },
            }),
      },
    })
    await Promise.race([
      sending,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              Object.assign(new Error('Push delivery deadline'), { code: 'push/deadline-exceeded' })
            ),
          30_000
        )
        timeout.unref?.()
      }),
    ])
    return { token, status: 'sent' }
  } catch (error: unknown) {
    const code = String((error as { code?: unknown })?.code || '')
    // INVALID_ARGUMENT can mean a malformed payload; it never justifies deleting a device.
    if (/registration-token-not-registered|invalid-registration-token/.test(code))
      return { token, status: 'invalid' }
    if (
      /invalid-argument|mismatched-credential|authentication-error|sender-id-mismatch|third-party-auth-error/.test(
        code
      )
    )
      return { token, status: 'failed' }
    // A network failure can occur after FCM accepted the message. Do not promise a safe retry.
    return { token, status: 'uncertain' }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

/** Compatible with currency/Bankos callers; notification payloads display once via FCM. */
export async function sendPush(tokens: string[], title: string, body: string): Promise<string[]> {
  const invalid: string[] = []
  for (const token of [...new Set(tokens)]) {
    const result = await sendPushNotification(token, title, body, { url: '/cuenta', tag: '' })
    if (result.status === 'invalid') invalid.push(token)
  }
  return invalid
}
