import { createError, type H3Event } from 'h3'
import { adminAuth } from './firebaseAdmin'

export interface AuthedUser {
  uid: string
  email: string | null
  /** El correo de la sesión está verificado (Google lo está siempre; correo y contraseña, tras el enlace). */
  emailVerified: boolean
  /** Sesión de invitado (Firebase anónimo): no identifica a nadie. */
  anonymous: boolean
}

export async function requireUser(event: H3Event): Promise<AuthedUser> {
  const header = event.node.req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })
  }
  const token = header.slice('Bearer '.length).trim()
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      anonymous: decoded.firebase?.sign_in_provider === 'anonymous',
    }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
}
