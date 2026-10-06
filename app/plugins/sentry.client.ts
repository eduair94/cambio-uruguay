import * as Sentry from '@sentry/nuxt'
import {
  isAutomatedBrowser,
  sentryBrowserTag,
  sentryErrorOptions,
  sentryErrorsEnabled,
  sentryHttpStatus,
  sentryPageName,
  sentryRouteCategory,
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
    const capture = (error: unknown, instance?: unknown, info?: unknown) => {
      const status = sentryHttpStatus(error)
      if (status && status < 500) return
      Sentry.captureException(error, {
        tags: {
          route: sentryRouteCategory(window.location.pathname),
          ...(status ? { http_status: String(status) } : {}),
          // Only the component's file name and Vue's lifecycle code, never the instance itself.
          ...sentryVueTags(instance, info),
        },
      })
    }
    // GlobalHandlers also captures window errors and unhandled rejections.
    // Never pass Vue instances, component props or hook info to the SDK.
    nuxtApp.hook('vue:error', (error, instance, info) => capture(error, instance, info))
    nuxtApp.hook('app:error', error => capture(error))
  },
})
