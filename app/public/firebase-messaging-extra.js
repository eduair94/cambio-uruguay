/* global importScripts, firebase, clients */
// Register before Firebase imports. FCM owns clicks on its automatic notification
// payloads; this handler owns only our data-only messages.
function internalUrl(value) {
  try {
    const url = new URL(value || '/cuenta', self.location.origin)
    return url.origin === self.location.origin && !url.username && !url.password
      ? url.href
      : `${self.location.origin}/cuenta`
  } catch {
    return `${self.location.origin}/cuenta`
  }
}

self.addEventListener('notificationclick', event => {
  if (!event.notification.data?.cuRentalAlert) return
  event.stopImmediatePropagation()
  event.notification.close()
  const url = internalUrl(event.notification.data.url)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
      const existing = windows.find(client => client.url === url)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAk9gmrq82O1v_jHtkTE8Ubf3nk9JN2Avg',
  authDomain: 'cambiouruguay-d69e9.firebaseapp.com',
  projectId: 'cambiouruguay-d69e9',
  messagingSenderId: '473510862323',
  appId: '1:473510862323:web:07d3e4888e1a040d50c686',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  // Firebase already displays notification payloads, including legacy rate alerts.
  if (payload.notification) return
  const n = payload.data || {}
  if (!n.title || !n.body) return
  return self.registration.showNotification(n.title || 'Cambio Uruguay', {
    body: n.body || '',
    icon: '/android-chrome-192x192.png',
    tag: n.tag || undefined,
    data: { url: internalUrl(n.url), cuRentalAlert: true },
  })
})
