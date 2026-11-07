// The Firebase SDK is loaded on demand, never in the entry chunk.
//
// plugins/firebase.client.ts used to import firebase/app + firebase/auth (and, through the push
// helpers, firebase/messaging) on every page for every visitor. Only a browser that already
// holds a Firebase session needs it at load time, to restore that session. On mobile the bare
// getAuth() also fetched apis.google.com/js/api.js, the firebaseapp.com auth iframe (~95 KB)
// and getProjectConfig: ~140 KB and ~160 ms of main thread per page for a visitor who never
// signs in. Now the plugin loads the SDK only when hasStoredFirebaseSession() says so, and
// everything that needs Firebase (signing in, the magic link, the Discord hand-off, a token
// for an authenticated request) goes through loadFirebaseAuth(), which loads it on first use.
type AuthApi = typeof import('./firebaseAuthApi')
type Starter = (api: AuthApi) => void | Promise<void>

let loading: Promise<AuthApi> | null = null
let loaded: AuthApi | null = null
let starter: Starter | null = null

/**
 * Registered by plugins/firebase.client.ts: initializes the app and attaches the session
 * listener the first time the SDK loads. Without one (unit tests, Firebase not configured)
 * the module is returned as is.
 */
export function setFirebaseStarter(fn: Starter): void {
  starter = fn
}

export function loadFirebaseAuth(): Promise<AuthApi> {
  loading ??= import('./firebaseAuthApi')
    .then(async api => {
      await starter?.(api)
      loaded = api
      return api
    })
    .catch(error => {
      // A failed chunk load (offline, a deploy swapping the assets) must stay retryable.
      loading = null
      throw error
    })
  return loading
}

/** The SDK if it is already loaded, without triggering a load. */
export function loadedFirebaseAuth(): AuthApi | null {
  return loaded
}

// Query params only Firebase can consume: an emailed sign-in link (oobCode, or the link nested in
// link / deep_link_id, which is what isSignInWithEmailLink parses) and the Discord hand-off (ct).
const AUTH_HANDOFF_PARAMS = ['oobCode', 'link', 'deep_link_id', 'ct']

/** Whether this URL hands Firebase something to sign in with, so the SDK must load. */
export function isAuthHandoffUrl(href: string): boolean {
  try {
    const params = new URL(href).searchParams
    return AUTH_HANDOFF_PARAMS.some(name => params.has(name))
  } catch {
    return false
  }
}

const SESSION_DB = 'firebaseLocalStorageDb'
const SESSION_STORE = 'firebaseLocalStorage'
const USER_KEY_PREFIX = 'firebase:authUser:'

function inWebStorage(read: () => Storage | undefined): boolean {
  try {
    const storage = read()
    if (!storage) return false
    for (let i = 0; i < storage.length; i++) {
      if (storage.key(i)?.startsWith(USER_KEY_PREFIX)) return true
    }
  } catch {
    // Storage blocked: nothing can be persisted there either.
  }
  return false
}

/**
 * Whether this browser holds a saved Firebase session, read straight from Firebase Auth's own
 * persistence (IndexedDB `firebaseLocalStorageDb`, falling back to local/session storage) so the
 * SDK need not load to find out. Errs towards `true`: an unreadable store or a slow open means
 * "load Firebase", so a signed-in user is never shown as signed out. The database is never
 * created here (aborting the upgrade of a database that did not exist deletes it).
 */
export function hasStoredFirebaseSession(timeoutMs = 2000): Promise<boolean> {
  if (
    inWebStorage(() => globalThis.localStorage) ||
    inWebStorage(() => globalThis.sessionStorage)
  ) {
    return Promise.resolve(true)
  }
  if (typeof indexedDB === 'undefined') return Promise.resolve(false)
  return new Promise(resolve => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => finish(true), timeoutMs)
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(SESSION_DB)
    } catch {
      finish(true)
      return
    }
    let created = false
    request.onupgradeneeded = () => {
      // The database did not exist, so there is no session; do not leave an empty one behind.
      created = true
      request.transaction?.abort()
    }
    request.onerror = () => finish(!created)
    request.onblocked = () => finish(true)
    request.onsuccess = () => {
      const db = request.result
      const done = (value: boolean) => {
        db.close()
        finish(value)
      }
      try {
        if (!db.objectStoreNames.contains(SESSION_STORE)) return done(false)
        const keys = db
          .transaction(SESSION_STORE, 'readonly')
          .objectStore(SESSION_STORE)
          .getAllKeys()
        keys.onsuccess = () =>
          done(keys.result.some(key => typeof key === 'string' && key.startsWith(USER_KEY_PREFIX)))
        keys.onerror = () => done(true)
      } catch {
        done(true)
      }
    }
  })
}
