import * as Sentry from '@sentry/nuxt'
import {
  sentryErrorOptions,
  sentryErrorsEnabled,
  sentryHttpStatus,
  sentryRouteCategory,
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
    if (!Sentry.getClient())
      Sentry.init(sentryErrorOptions(config, 'browser', () => window.location.pathname))
    const capture = (error: unknown) => {
      const status = sentryHttpStatus(error)
      if (status && status < 500) return
      Sentry.captureException(error, {
        tags: {
          route: sentryRouteCategory(window.location.pathname),
          ...(status ? { http_status: String(status) } : {}),
        },
      })
    }
    // GlobalHandlers also captures window errors and unhandled rejections.
    // Never pass Vue instances, component props or hook info to the SDK.
    nuxtApp.hook('vue:error', capture)
    nuxtApp.hook('app:error', capture)
  },
})
