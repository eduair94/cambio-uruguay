export default (_context: any, inject: any) => {
  // Verificar si la app está instalada como PWA
  if (process.client) {
    // Detectar si está en modo standalone (instalada)
    const isStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      )
    }

    // Verificar soporte para PWA
    const isPWASupported = () => {
      return 'serviceWorker' in navigator && 'PushManager' in window
    }

    // Detectar si se puede instalar
    let deferredPrompt: any = null

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que Chrome 67 y anteriores muestren automáticamente el prompt
      e.preventDefault()
      // Guardar el evento para poder triggerearlo después
      deferredPrompt = e

      // Opcional: mostrar un botón de instalación personalizado
    })

    // Método para instalar la PWA
    const installPWA = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        await deferredPrompt.userChoice
        deferredPrompt = null
      }
    }

    // Detectar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null
    })

    // Create PWA utils object
    const pwaUtils = {
      isStandalone: isStandalone(),
      isPWASupported: isPWASupported(),
      canInstall: () => !!deferredPrompt,
      install: installPWA,
    }

    // Inject the plugin
    inject('pwaUtils', pwaUtils)

    // Verificar estado del service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        // Service Worker is ready
      })
    }
  }
}
