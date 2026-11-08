// Microsoft Clarity: heatmaps, session recordings and frustration signals (rage and dead clicks),
// the "what people do" half that GA4's counts cannot show. Inert until the owner creates the
// project and builds with NUXT_PUBLIC_CLARITY_ID (runtimeConfig.public.clarityId): with the id
// empty this plugin returns before registering anything, so no request reaches *.clarity.ms and
// `window.clarity` stays undefined.
//
// This file is all that ships in the entry chunk. WHEN is decided here: after hydration and an
// idle moment (onNuxtReady → requestIdleCallback), and only with the tab visible — ~25 KB of
// script and a full DOM serialisation never compete with the first paint, hydration or the first
// interaction. Nothing in the server HTML, no hydration change: it is a script, so the Auto Ads
// rule about lazy hydration is untouched. Whether, where and for whom it records, and keeping it
// in line with the visitor's choice, is services/clarityRuntime.ts, fetched only then.
export default defineNuxtPlugin(nuxtApp => {
  if (!import.meta.client) return
  const config = useRuntimeConfig().public
  const projectId = String(config.clarityId || '').trim()
  if (!projectId) return

  const router = useRouter()
  const begin = () =>
    requestIdleCallback(
      () => {
        import('~/services/clarityRuntime')
          .then(({ startClarityRuntime }) =>
            startClarityRuntime({
              projectId,
              adsTools: config.adsTools,
              router,
              onNavigationEnd: callback => nuxtApp.hook('page:loading:end', callback),
              idle: requestIdleCallback,
            })
          )
          .catch(() => {
            // A chunk that cannot be fetched (offline, a deploy in between) leaves the page as it
            // was: without Clarity.
          })
      },
      { timeout: 8000 }
    )

  onNuxtReady(() => {
    if (document.visibilityState === 'visible') {
      begin()
      return
    }
    // A tab opened in the background loads nothing until someone looks at it.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', onVisible)
      begin()
    }
    document.addEventListener('visibilitychange', onVisible)
  })
})
