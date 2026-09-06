import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  rememberPushDevice,
  revokeBrowserPush,
} from '~/stores/firebaseMessagingApi'

let stopForeground: (() => void) | null = null

function safeNotificationUrl(value: string | undefined): string {
  try {
    const url = new URL(value || '/cuenta', window.location.origin)
    if (url.origin === window.location.origin && !url.username && !url.password) return url.href
  } catch {
    /* Use the account page for malformed links. */
  }
  return `${window.location.origin}/cuenta`
}

export function usePushNotifications() {
  const auth = useAuthStore()
  const config = useRuntimeConfig().public
  const app = useNuxtApp() as {
    $pwa?: { getSWRegistration?: () => ServiceWorkerRegistration | undefined }
  }

  async function registration(): Promise<ServiceWorkerRegistration | undefined> {
    return app.$pwa?.getSWRegistration?.() ?? navigator.serviceWorker.getRegistration()
  }

  async function getPushSupport(): Promise<{
    supported: boolean
    permission: NotificationPermission | 'unsupported'
    configured: boolean
  }> {
    const configured = Boolean(config.fcmVapidKey)
    if (
      !import.meta.client ||
      typeof Notification === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return { supported: false, permission: 'unsupported', configured }
    }
    const supported =
      configured &&
      (await isSupported().catch(() => false)) &&
      Boolean(await registration().catch(() => undefined))
    return { supported, permission: Notification.permission, configured }
  }

  async function enablePush(): Promise<'granted' | 'denied' | 'unsupported'> {
    if (
      !import.meta.client ||
      typeof Notification === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !config.fcmVapidKey
    )
      return 'unsupported'
    if (!auth.user) throw new Error('auth/required')
    const uid = auth.user.uid
    // Must happen directly in the button gesture, before awaiting Firebase or the SW (iOS).
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'
    if (!(await isSupported().catch(() => false))) return 'unsupported'

    // Bind FCM to the single vite-pwa Workbox SW (which importScripts the FCM
    // handler). In dev the PWA module is disabled, so fall back to any existing
    // registration; if there is none, push is unavailable.
    const swReg = await registration()
    if (!swReg) return 'unsupported'
    const messaging = getMessaging()
    const token = await getToken(messaging, {
      vapidKey: config.fcmVapidKey,
      serviceWorkerRegistration: swReg,
    })
    if (!token) throw new Error('push/token-unavailable')

    const bearer = await auth.getToken()
    if (!bearer || auth.user?.uid !== uid) throw new Error('auth/account-changed')
    // Remember before the request: an interrupted response can hide a successful registration.
    rememberPushDevice({ uid, token })
    await $fetch('/api/me/fcm-token', {
      method: 'POST',
      body: { token },
      headers: { Authorization: `Bearer ${bearer}` },
    })
    if (auth.user?.uid !== uid) {
      await revokeBrowserPush(bearer)
      throw new Error('auth/account-changed')
    }
    stopForeground?.()
    stopForeground = onMessage(messaging, payload => {
      if (auth.user?.uid !== uid || Notification.permission !== 'granted') return
      const n = payload.notification ?? payload.data
      if (!n?.title || !n.body) return
      void swReg
        .showNotification(n.title, {
          body: n.body,
          icon: '/android-chrome-192x192.png',
          tag: payload.data?.tag,
          data: {
            url: safeNotificationUrl(payload.data?.url ?? payload.fcmOptions?.link),
            cuRentalAlert: true,
          },
        })
        .catch(() => {})
    })
    return 'granted'
  }

  async function disablePush(): Promise<boolean> {
    const ok = await revokeBrowserPush(await auth.getToken())
    if (ok) {
      stopForeground?.()
      stopForeground = null
    }
    return ok
  }

  return { enablePush, disablePush, getPushSupport }
}
