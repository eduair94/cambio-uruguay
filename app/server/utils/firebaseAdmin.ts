import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let app: App | null = null

/**
 * Loads the Firebase service-account credentials. Resolution order:
 *  1. FIREBASE_SERVICE_ACCOUNT — base64-encoded JSON (CI / env-only deploys).
 *  2. serviceAccountPath / FIREBASE_SERVICE_ACCOUNT_PATH — explicit file path.
 *  3. A `serviceAccount.json` next to the server cwd or one level up (the repo
 *     root), which is how this project ships it to the 104 server.
 */
function loadServiceAccount(): ServiceAccount {
  const cfg = useRuntimeConfig().firebase ?? {}

  if (cfg.serviceAccount) {
    return JSON.parse(Buffer.from(cfg.serviceAccount, 'base64').toString('utf8'))
  }

  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    resolve(process.cwd(), 'serviceAccount.json'),
    resolve(process.cwd(), '..', 'serviceAccount.json'),
  ].filter(Boolean) as string[]

  for (const path of candidates) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8'))
    }
  }

  throw new Error(
    'Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT (base64), ' +
      'FIREBASE_SERVICE_ACCOUNT_PATH, or place serviceAccount.json at the project root.'
  )
}

function init(): App {
  if (app) return app
  if (getApps().length) {
    app = getApps()[0]!
    return app
  }
  app = initializeApp({ credential: cert(loadServiceAccount()) })
  return app
}

export function adminAuth(): Auth {
  return getAuth(init())
}
