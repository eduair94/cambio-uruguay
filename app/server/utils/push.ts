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

/** Send a web-push notification; returns tokens that are invalid and should be pruned. */
export async function sendPush(tokens: string[], title: string, body: string): Promise<string[]> {
  if (!tokens.length) return []
  const res = await getMessaging(adminApp()).sendMulticast({
    tokens,
    notification: { title, body },
    webpush: { fcmOptions: { link: 'https://cambio-uruguay.com/cuenta' } },
  })
  const invalid: string[] = []
  res.responses.forEach((r: { success: boolean; error?: { code?: string } }, i: number) => {
    if (!r.success) {
      const code = r.error?.code || ''
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-argument') ||
        code.includes('invalid-registration-token')
      ) {
        invalid.push(tokens[i]!)
      }
    }
  })
  return invalid
}
