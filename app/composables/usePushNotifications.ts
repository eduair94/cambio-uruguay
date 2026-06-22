import { getMessaging, getToken, onMessage, isSupported } from '~/stores/firebaseMessagingApi'

export function usePushNotifications() {
  const { authFetch } = useAuthFetch()
  const config = useRuntimeConfig().public

  async function enablePush(): Promise<'granted' | 'denied' | 'unsupported'> {
    if (!import.meta.client) return 'unsupported'
    if (!(await isSupported().catch(() => false))) return 'unsupported'
    if (!config.fcmVapidKey) return 'unsupported'

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    // Bind FCM to the single vite-pwa Workbox SW (which importScripts the FCM
    // handler). In dev the PWA module is disabled, so fall back to any existing
    // registration; if there is none, push is unavailable.
    const { $pwa } = useNuxtApp() as {
      $pwa?: { getSWRegistration?: () => ServiceWorkerRegistration | undefined }
    }
    const swReg = $pwa?.getSWRegistration?.() ?? (await navigator.serviceWorker.getRegistration())
    if (!swReg) return 'unsupported'
    const messaging = getMessaging()
    const token = await getToken(messaging, {
      vapidKey: config.fcmVapidKey,
      serviceWorkerRegistration: swReg,
    })
    if (!token) return 'denied'

    await authFetch('/api/me/fcm-token', { method: 'POST', body: { token } })

    // Foreground messages -> native notification
    onMessage(messaging, payload => {
      const n = payload.notification
      if (n && Notification.permission === 'granted') {
        new Notification(n.title || 'Cambio Uruguay', { body: n.body || '' })
      }
    })
    return 'granted'
  }

  return { enablePush }
}
