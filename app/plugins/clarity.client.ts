// Microsoft Clarity — free session recording + heatmaps + rage/dead-click detection.
// Complements GA4 (aggregate metrics) with qualitative UX insight for UI optimization.
// No-op until a project id is provided via runtimeConfig.public.clarityId
// (env: NUXT_PUBLIC_CLARITY_ID). Get the id at https://clarity.microsoft.com.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const clarityId = useRuntimeConfig().public.clarityId as string
  if (!clarityId) return // not configured yet -> do nothing

  // Defer until after critical content renders (mirror tawk.client.ts strategy)
  setTimeout(() => {
    ;(function (c: any, l: Document, a: string, r: string, i: string) {
      c[a] =
        c[a] ||
        function (...args: unknown[]) {
          ;(c[a].q = c[a].q || []).push(args)
        }
      const t = l.createElement(r) as HTMLScriptElement
      t.async = true
      t.src = 'https://www.clarity.ms/tag/' + i
      const y = l.getElementsByTagName(r)[0]
      if (y?.parentNode) y.parentNode.insertBefore(t, y)
      else l.head.appendChild(t)
    })(window, document, 'clarity', 'script', clarityId)
  }, 3000)
})
