export default defineNuxtPlugin({
  name: 'pwa-updates',
  enforce: 'pre',
  setup(nuxtApp) {
    let timer: ReturnType<typeof setInterval> | undefined
    const stop = () => {
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    }

    const unhook = nuxtApp.hook('service-worker:activated', ({ url, registration }) => {
      stop()
      if (!registration) return
      let pending = false
      timer = setInterval(async () => {
        if (pending || registration.installing || navigator.onLine === false) return
        pending = true
        try {
          const response = await fetch(url, {
            cache: 'no-store',
            headers: { cache: 'no-store', 'cache-control': 'no-cache' },
          })
          if (response.status === 200) await registration.update()
        } catch {
          // The connection can disappear after the online check; update() can
          // also fail while fetching the worker. Retry on the next interval.
        } finally {
          pending = false
        }
      }, 20_000)
    })

    const dispose = () => {
      stop()
      unhook()
    }
    nuxtApp.vueApp.onUnmount(dispose)
    if (import.meta.hot) import.meta.hot.dispose(dispose)
  },
})
