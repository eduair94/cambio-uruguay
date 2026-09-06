import type { H3Event } from 'h3'
import { adminAuth } from './firebaseAdmin'
import { isMailerConfigured } from './mailer'
import { connectDb } from './db'
import { PushRegistrationModel } from '../models/PushRegistration'
import type { RentalAlertCapabilities } from '../../utils/rentalAlerts'

export interface RentalAlertUser {
  uid: string
  capabilities: RentalAlertCapabilities
}

export function rentalAlertError(code: string, statusCode = 400): Error {
  return Object.assign(new Error(code), { statusCode, data: { code } })
}

/** Identity and address verification come from Firebase, never from a submitted email field. */
export async function requireRentalAlertUser(event: H3Event): Promise<RentalAlertUser> {
  const header = event.node.req.headers.authorization
  if (!header?.startsWith('Bearer ') || header.length > 8192)
    throw rentalAlertError('auth_required', 401)
  try {
    const auth = adminAuth()
    const decoded = await auth.verifyIdToken(header.slice(7).trim(), true)
    const account = await auth.getUser(decoded.uid)
    const provider = decoded.firebase?.sign_in_provider
    await connectDb()
    const registration = await PushRegistrationModel.exists({ uid: decoded.uid })
    return {
      uid: decoded.uid,
      capabilities: {
        accountEligible: !account.disabled && Boolean(provider) && provider !== 'anonymous',
        emailAvailable: Boolean(account.email) && isMailerConfigured(),
        emailVerified: Boolean(account.emailVerified),
        email: account.email || null,
        pushAvailable: Boolean(useRuntimeConfig().public?.fcmVapidKey),
        pushRegistered: Boolean(registration),
      },
    }
  } catch (error) {
    const code = String((error as { code?: string }).code || '')
    if (
      [
        'auth/id-token-expired',
        'auth/id-token-revoked',
        'auth/invalid-id-token',
        'auth/argument-error',
        'auth/user-not-found',
        'auth/user-disabled',
      ].includes(code)
    )
      throw rentalAlertError('auth_required', 401)
    throw rentalAlertError('temporarily_unavailable', 503)
  }
}
