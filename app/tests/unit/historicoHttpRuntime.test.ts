import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import * as serverRenderer from 'vue/server-renderer'
import * as h3 from 'h3'
import * as ufo from 'ufo'
import * as rates from '../../utils/rateSource'
import { expect, it } from 'vitest'

// Exercise Nuxt's installed error boundary and renderer without starting jobs,
// connecting to databases, or rebuilding the application. A setup rejection
// alone does not prove that the actual HTTP response preserves its status.
function runSource(source: string, modules: Record<string, unknown>, globals = {}) {
  const context = {
    exports: {} as any,
    ...globals,
    require: (name: string) => {
      if (name in modules) return modules[name]
      throw new Error(`Unexpected module ${name}`)
    },
  }
  const { outputText } = ts.transpileModule(
    source
      .replaceAll('import.meta.server', 'true')
      .replaceAll('import.meta.client', 'false')
      .replaceAll('import.meta.dev', 'false')
      .replaceAll('import.meta.test', 'false')
      .replaceAll('import.meta.prerender', 'false'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )
  runInNewContext(outputText, context)
  return context.exports
}

function sfc(path: string, modules: Record<string, unknown>, globals = {}, ssr = false) {
  const filename = resolve(__dirname, '../..', path)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  return runSource(
    compileScript(descriptor, {
      id: 'isolated-http-test',
      inlineTemplate: ssr,
      templateOptions: { ssr },
    }).content,
    modules,
    globals
  ).default
}

it('returns HTTP 404 through app.vue and the installed Nuxt SSR runtime after history setup rejects', async () => {
  const hooks = { callHook: async () => {}, callHookWith: () => [] }
  const ssrContext: any = {
    url: '/historico/no-existe',
    error: false,
    payload: {},
    head: { push: () => {} },
  }
  const nuxtApp: any = {
    hooks,
    payload: ssrContext.payload,
    ssrContext,
    deferHydration: () => () => {},
    runWithContext: (fn: () => unknown) => fn(),
  }
  ssrContext.nuxt = nuxtApp
  const errors = runSource(
    readFileSync(
      resolve(__dirname, '../../node_modules/nuxt/dist/app/composables/error.js'),
      'utf8'
    ),
    {
      h3,
      vue,
      '../nuxt.js': { useNuxtApp: () => nuxtApp },
      './router.js': {},
    }
  )
  const route = { params: { origin: 'no-existe' }, query: {}, path: '/historico/no-existe' }
  const page = sfc(
    'pages/historico/[origin]/index.vue',
    {
      vue,
      'vue-router': { useRoute: () => route, useRouter: () => ({}) },
      'vue-i18n': { useI18n: () => ({ t: (key: string) => key, locale: vue.ref('es') }) },
      vuetify: { useDisplay: () => ({ smAndDown: vue.ref(false) }) },
      '@/utils/rateSource': rates,
    },
    {
      useLocalePath: () => (path: string) => path,
      useApiService: () => ({
        getExchangeData: async () => [{ origin: 'brou', code: 'USD', type: '', buy: 40, sell: 42 }],
      }),
      useAsyncData: async (_key: string, fetch: () => unknown) => ({
        data: vue.ref(await fetch()),
        pending: vue.ref(false),
        error: vue.ref(null),
        refresh: () => {},
      }),
      createError: errors.createError,
      useSeoMeta: () => {
        throw new Error('Page head must not be registered')
      },
    }
  )
  // Only setup runs for the page; omit its Vuetify template. Compile and render
  // the real app.vue and Nuxt root so an intervening error boundary cannot hide
  // the rejection from Nuxt and turn the response into an empty HTTP 200.
  page.ssrRender = () => {}
  const appComponent = sfc(
    'app.vue',
    { vue, 'vue/server-renderer': serverRenderer },
    {
      defineOgImageComponent: () => {},
      useHead: () => {},
      useSeoMeta: () => {},
      useAds: () => ({ pubId: '', scriptAllowed: vue.ref(false) }),
      onErrorCaptured: vue.onErrorCaptured,
    },
    true
  )
  const root = sfc(
    'node_modules/nuxt/dist/app/components/nuxt-root.vue',
    {
      vue,
      'vue/server-renderer': serverRenderer,
      '../nuxt': { useNuxtApp: () => nuxtApp },
      '../composables/error': errors,
      '../composables/router': { useRoute: () => route },
      '../components/injections': { PageRouteSymbol: Symbol('route') },
      '#build/app-component.mjs': { default: appComponent, __esModule: true },
      '#build/error-component.mjs': { default: { render: () => 'error' }, __esModule: true },
      '#build/nuxt.config.mjs': { componentIslands: false },
    },
    {},
    true
  )
  const renderer = runSource(
    readFileSync(
      resolve(__dirname, '../../node_modules/nuxt/dist/core/runtime/nitro/handlers/renderer.js'),
      'utf8'
    ),
    {
      'node:async_hooks': {},
      'vue-bundle-renderer/runtime': {
        getRequestDependencies: () => ({ styles: {}, scripts: {} }),
        getPreloadLinks: () => [],
        getPrefetchLinks: () => [],
      },
      h3,
      ufo,
      '@unhead/vue/server': {
        propsToString: () => '',
        renderSSRHead: () => ({ headTags: '', bodyTags: '', bodyTagsOpen: '' }),
      },
      destr: {},
      'nitropack/runtime': {
        defineRenderHandler: (handler: unknown) => handler,
        getRouteRules: () => ({}),
        useNitroApp: () => ({ hooks }),
      },
      '../utils/renderer/build-files.js': {
        getRenderer: async () => ({
          renderToString: async () => {
            const vueApp = vue.createSSRApp(root)
            vueApp.component('NuxtPage', page)
            vueApp.component('NuxtLayout', {
              setup:
                (_props, { slots }) =>
                () =>
                  slots.default?.(),
            })
            vueApp.component('NuxtLoadingIndicator', { render: () => null })
            vueApp.component('ClientOnly', { render: () => null })
            vueApp.component('PWANetworkStatus', { render: () => null })
            return { html: await serverRenderer.renderToString(vueApp, ssrContext) }
          },
        }),
      },
      '../utils/cache.js': {},
      '../utils/renderer/payload.js': { renderPayloadScript: () => [] },
      '../utils/renderer/app.js': { createSSRContext: () => ssrContext },
      '../utils/renderer/inline-styles.js': {},
      '../utils/renderer/islands.js': {},
      '#internal/unhead.config.mjs': {},
      '#internal/nuxt.config.mjs': { appHead: {}, appTeleportAttrs: {}, appTeleportTag: '' },
      '#internal/nuxt/paths': {},
    },
    { process: { env: {} } }
  ).default
  const app = h3.createApp().use(h3.eventHandler(renderer))
  const response = await h3.toWebHandler(app)(
    new Request('http://localhost/historico/no-existe', { headers: { accept: 'application/json' } })
  )
  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({ statusCode: 404 })
})
