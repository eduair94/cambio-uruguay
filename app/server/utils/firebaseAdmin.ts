import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let app: App | null = null

function init(): App {
  if (app) return app
  if (getApps().length) {
    app = getApps()[0]!
    return app
  }
  const raw = useRuntimeConfig().firebase?.serviceAccount
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  app = initializeApp({ credential: cert(json) })
  return app
}

export function adminAuth(): Auth {
  return getAuth(init())
}
