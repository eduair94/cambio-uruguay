import { ssrRecovery } from '~/utils/chunkError'

export default defineNuxtPlugin({
  name: 'ssr-snapshot',
  // Nuxt 4.4 revives payloads at -30; its router is a pre plugin at -20 and awaits the first route.
  order: -25,
  setup(nuxtApp) {
    ssrRecovery.capture(
      document,
      window.location.href,
      Boolean(nuxtApp.payload.serverRendered),
      nuxtApp.payload.error
    )
    nuxtApp.hook('app:error', () => ssrRecovery.noteStartupError())
    nuxtApp.hook('app:suspense:resolve', () => ssrRecovery.finishHydration(nuxtApp.payload.error))
  },
})
