import * as Sentry from '@sentry/nuxt'
import {
  sentryErrorOptions,
  sentryErrorsEnabled,
  sentryHttpStatus,
  sentryRouteCategory,
} from '../../utils/sentryPrivacy'

export default defineNitroPlugin(nitroApp => {
  const config = useRuntimeConfig().sentry
  if (
    !sentryErrorsEnabled(config, {
      dev: import.meta.dev,
      prerender: import.meta.prerender,
      test: process.env.NODE_ENV === 'test',
      preflight: process.env.CU_DEPLOY_PREFLIGHT === '1',
    })
  )
    return
  if (!Sentry.getClient())
    Sentry.init({
      ...sentryErrorOptions(config, 'nitro'),
      // Error hooks need no HTTP/DB instrumentation or ESM loader patches.
      registerEsmLoaderHooks: false,
      skipOpenTelemetrySetup: true,
    })
  nitroApp.hooks.hook('error', (error, context) => {
    const status = sentryHttpStatus(error)
    if (status && status < 500) return
    // Routes retain an internal cause while H3's public JSON stays generic.
    // Capture that error's original stack, then apply the same strict scrubber.
    const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
    Sentry.captureException(cause instanceof Error ? cause : error, {
      tags: {
        route: sentryRouteCategory(context.event?.path),
        method: context.event?.method || 'UNKNOWN',
        ...(status ? { http_status: String(status) } : {}),
      },
    })
  })
  nitroApp.hooks.hook('close', async () => {
    await Sentry.flush(2000)
  })
})
