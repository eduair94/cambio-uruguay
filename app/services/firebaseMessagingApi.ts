// Thin re-export of firebase/messaging so it can be mocked and imported in one place.
import { getMessaging, deleteToken, isSupported } from 'firebase/messaging'
export { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging'

const DEVICE_KEY = 'cu_push_device'
let activeDevice: { uid: string; token: string } | null = null

export function readPushDevice(): { uid: string; token: string } | null {
  if (activeDevice) return activeDevice
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.localStorage.getItem(DEVICE_KEY) || 'null')
    return typeof value?.uid === 'string' && typeof value?.token === 'string' ? value : null
  } catch {
    return null
  }
}

export function rememberPushDevice(value: { uid: string; token: string } | null): void {
  activeDevice = value
  if (typeof window === 'undefined') return
  try {
    if (value) window.localStorage.setItem(DEVICE_KEY, JSON.stringify(value))
    else window.localStorage.removeItem(DEVICE_KEY)
  } catch {
    // The current page still retains enough information to revoke its registration.
  }
}

/** No permission prompt and no creation of a fresh token while disabling. */
export async function revokeBrowserPush(idToken: string | null): Promise<boolean> {
  const device = readPushDevice()
  let serverRevoked = false
  let firebaseRevoked = false
  if (device && idToken) {
    try {
      const response = await fetch('/api/me/fcm-token', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: device.token }),
      })
      serverRevoked = response.ok
    } catch {
      /* Fall back to revoking the token at Firebase itself. */
    }
  }
  try {
    if (await isSupported()) firebaseRevoked = await deleteToken(getMessaging())
  } catch {
    /* A failed server AND Firebase revocation is surfaced to the caller. */
  }
  if (!device || serverRevoked || firebaseRevoked) {
    rememberPushDevice(null)
    return true
  }
  return false
}
