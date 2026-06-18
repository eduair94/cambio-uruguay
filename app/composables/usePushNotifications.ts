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

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
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
