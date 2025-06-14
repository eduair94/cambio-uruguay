// PWA utilities for Nuxt 3
export default defineNuxtPlugin(() => {
  // Check for Cache API availability to prevent browser extension errors
  if (process.client && typeof window !== 'undefined') {
    // Polyfill or check for caches API
    if (!('caches' in window)) {
      // Create a minimal caches polyfill to prevent errors from browser extensions
      ;(window as any).caches = {
        open: () =>
          Promise.resolve({
            match: () => Promise.resolve(undefined),
            add: () => Promise.resolve(),
            addAll: () => Promise.resolve(),
            put: () => Promise.resolve(),
            delete: () => Promise.resolve(false),
            keys: () => Promise.resolve([]),
          }),
        match: () => Promise.resolve(undefined),
        has: () => Promise.resolve(false),
        delete: () => Promise.resolve(false),
        keys: () => Promise.resolve([]),
      }
    }
  }

  // PWA utilities
  const isStandalone = () => {
    if (process.client) {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      )
    }
    return false
  }

  const isPWASupported = () => {
    if (process.client) {
      return 'serviceWorker' in navigator && 'PushManager' in window
    }
    return false
  }

  const canInstall = () => {
    if (process.client) {
      return !!(window as any).deferredPrompt
    }
    return false
  }

  const install = async () => {
    if (process.client) {
      const deferredPrompt = (window as any).deferredPrompt
      if (deferredPrompt) {
        try {
          await deferredPrompt.prompt()
          const { outcome } = await deferredPrompt.userChoice
          if (outcome === 'accepted') {
            ;(window as any).deferredPrompt = null
          }
          return outcome
        } catch (error) {
          console.error('Error installing PWA:', error)
          throw error
        }
      }
    }
    return false
  }

  if (process.client) {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      ;(window as any).deferredPrompt = e
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      ;(window as any).deferredPrompt = null
    })

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        // Service Worker is ready
      })
    }
  }

  return {
    provide: {
      pwaUtils: {
        isStandalone: isStandalone(),
        isPWASupported: isPWASupported(),
        canInstall,
        install,
      },
    },
  }
})
