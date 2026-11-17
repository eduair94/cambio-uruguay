import * as Sentry from '@sentry/nuxt'
import {
  isAutomatedBrowser,
  sentryBrowserTag,
  sentryDocumentStatus,
  sentryErrorOptions,
  sentryErrorsEnabled,
  sentryHttpStatus,
  sentryPageName,
  sentryRouteCategory,
  sentryThrownShape,
  sentryVueTags,
} from '~/utils/sentryPrivacy'

export default defineNuxtPlugin({
  name: 'sentry-errors',
  enforce: 'pre',
  setup(nuxtApp) {
    const config = useRuntimeConfig().public.sentry
    if (
      !sentryErrorsEnabled(config, { dev: import.meta.dev, test: process.env.NODE_ENV === 'test' })
    )
      return
    // Crawlers and automation execute the page with blocked requests and time budgets: their
    // failures are not a visitor's, and they were most of the chunk-load reports.
    if (isAutomatedBrowser(globalThis.navigator)) return
    const browser = sentryBrowserTag(globalThis.navigator?.userAgent)
    // The route NAME comes from file names under pages/ (`casa-origin`, `guias-slug`), so it
    // names the page that failed where the path category can only say `/other`.
    const page = () =>
      sentryPageName(
        (nuxtApp.$router as { currentRoute?: { value?: { name?: unknown } } } | undefined)
          ?.currentRoute?.value?.name
      )
    if (!Sentry.getClient())
      Sentry.init(
        sentryErrorOptions(config, 'browser', () => window.location.pathname, {
          origin: () => window.location.origin,
          tags: () => ({ browser, page: page() }),
        })
      )
    // CAMBIO-URUGUAY-BACKEND-Y: browser "HTTP 500" reports with no frames, no `page` and no
    // matching Nitro event. Three fixed-shape facts separate the hypotheses: which Nuxt hook
    // saw it, whether the app had finished its first render, and the HTTP status the
    // document itself was served with (a 500 here is the SSR answer; a 200 means the 500
    // was produced in the browser).
    let started = false
    nuxtApp.hook('app:suspense:resolve', () => {
      started = true
    })
    const capture = (hook: 'app' | 'vue', error: unknown, instance?: unknown, info?: unknown) => {
      const status = sentryHttpStatus(error)
      if (status && status < 500) return
      const documentStatus = sentryDocumentStatus(globalThis.performance)
      Sentry.captureException(error, {
        tags: {
          route: sentryRouteCategory(window.location.pathname),
          ...(status ? { http_status: String(status) } : {}),
          nuxt_hook: hook,
          nuxt_phase: started ? 'navigation' : 'startup',
          ...(documentStatus ? { document_status: documentStatus } : {}),
          // What was thrown (class only) and whether it had a stack: a frameless 500.
          ...sentryThrownShape(error),
          // Only the component's file name and Vue's lifecycle code, never the instance itself.
          ...sentryVueTags(instance, info),
        },
      })
    }
    // GlobalHandlers also captures window errors and unhandled rejections.
    // Never pass Vue instances, component props or hook info to the SDK.
    nuxtApp.hook('vue:error', (error, instance, info) => capture('vue', error, instance, info))
    nuxtApp.hook('app:error', error => capture('app', error))
  },
})
