/* global importScripts, firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDVfz6541hc0VME3vnBgc_IgwRqOaphdZM',
  authDomain: 'helpbot-nconrh.firebaseapp.com',
  projectId: 'helpbot-nconrh',
  messagingSenderId: '958321688893',
  appId: '1:958321688893:web:f63a07aeaa57ff814fc554',
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
