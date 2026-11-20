// One-click unsubscribe for the rate-alert emails (RFC 8058), the same contract as the rental
// alerts (rentalAlertUnsubscribe.ts): a random token per alert, a GET that only asks (mail
// scanners open links) and a POST that turns off that alert's email channel and nothing else.
import { randomBytes } from 'node:crypto'
import { AlertModel } from '../models/Alert'
import { connectDb } from './db'

export const validRateAlertUnsubscribeToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-f\d]{64}$/.test(token)

/**
 * The alert's unsubscribe token, minted the first time an email goes out (the alerts created
 * before the link existed have none). Only an alert without a token gets one, so two instances
 * sending at once agree on it. Null when the alert is gone.
 */
export async function rateAlertUnsubscribeToken(id: string): Promise<string | null> {
  await connectDb()
  await AlertModel.updateOne(
    { _id: id, unsubscribeToken: { $exists: false } },
    { $set: { unsubscribeToken: randomBytes(32).toString('hex') } }
  )
  const alert = await AlertModel.findById(id).select('+unsubscribeToken').lean()
  return alert?.unsubscribeToken ?? null
}

export async function rateAlertUnsubscribeInfo(token: string) {
  await connectDb()
  return AlertModel.findOne({ unsubscribeToken: token })
    .select({ _id: 1, uid: 1, channels: 1, active: 1 })
    .lean()
}

/**
 * Email off for this alert only; push and Telegram stay as they were. An alert left without a
 * channel is paused, as the rental alerts do: it would keep firing into nothing. GET never calls
 * this, and a repeated POST changes nothing. `onWrite` runs right before the write, so a caller
 * can tell a failure that changed nothing from one whose outcome is unknown.
 */
export async function unsubscribeRateAlertEmail(
  token: string,
  onWrite?: () => void
): Promise<void> {
  const current = await rateAlertUnsubscribeInfo(token)
  if (!current || !current.channels?.email) return
  const stillReaches = Boolean(current.channels.push || current.channels.telegram)
  onWrite?.()
  await AlertModel.updateOne(
    { _id: current._id, uid: current.uid, unsubscribeToken: token },
    { $set: { 'channels.email': false, active: Boolean(current.active) && stillReaches } }
  )
}
