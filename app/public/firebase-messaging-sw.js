/* global importScripts, firebase, clients */
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
  const n = payload.notification || {}
  self.registration.showNotification(n.title || 'Cambio Uruguay', {
    body: n.body || '',
    icon: '/android-chrome-192x192.png',
    data: { url: 'https://cambio-uruguay.com/cuenta' },
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/cuenta'))
})
