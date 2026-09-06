import type { H3Event } from 'h3'
import { adminAuth } from './firebaseAdmin'

export interface RentalAvailabilityUser {
  uid: string
}

export function rentalAvailabilityError(code: string, statusCode = 400): Error {
  return Object.assign(new Error(code), { statusCode, data: { code } })
}

/** Only a current, recoverable account can contribute; claims alone are insufficient. */
export async function requireRentalAvailabilityUser(
  event: H3Event
): Promise<RentalAvailabilityUser> {
  const header = event.node.req.headers.authorization
  if (!header?.startsWith('Bearer ') || header.length > 8192 || !header.slice(7).trim())
    throw rentalAvailabilityError('auth_required', 401)
  let decoded
  let account
  try {
    const auth = adminAuth()
    decoded = await auth.verifyIdToken(header.slice(7).trim(), true)
    account = await auth.getUser(decoded.uid)
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
      throw rentalAvailabilityError('auth_required', 401)
    throw rentalAvailabilityError('temporarily_unavailable', 503)
  }
  const provider = decoded.firebase?.sign_in_provider
  if (account.disabled || !provider || provider === 'anonymous')
    throw rentalAvailabilityError('account_required', 403)
  return { uid: decoded.uid }
}
