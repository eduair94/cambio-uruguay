import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveUnrefHeadInput } from '@unhead/vue'
import { TemplateParamsPlugin } from '@unhead/vue/plugins'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import { defu } from 'defu'
import * as devalue from 'devalue'
import * as h3 from 'h3'
import { hash } from 'ohash'
import * as radix3 from 'radix3'
import ts from 'typescript'
import * as ufo from 'ufo'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The card URLs a page writes in its head, through the INSTALLED nuxt-og-image runtime (its
// defineOgImage, its two server plugins and its head helpers) on a real unhead instance — the
// harness of autosOgImage.test.ts, with a request query. nuxt-og-image 5.1.6 copies the page's
// query into every card URL it writes; plugins/01.og-image-head.ts writes the clean URL instead.

const app = resolve(__dirname, '../..')
const ogRuntime = resolve(app, 'node_modules/nuxt-og-image/dist/runtime')
const SITE = 'https://cambio-uruguay.com'

// Same realm on purpose (not node:vm): unhead only walks plain objects whose constructor is this
// realm's `Object`, so module code run in another context would leave its head input unresolved.
function runSource(source: string, modules: Record<string, unknown>) {
  const exports = {} as any
  const require = (name: string) => {
    if (name in modules) return modules[name]
    throw new Error(`Unexpected module ${name}`)
  }
  const { outputText } = ts.transpileModule(
    source
      .replaceAll('import.meta.server', 'true')
      .replaceAll('import.meta.client', 'false')
      .replaceAll('import.meta.dev', 'false')
      .replaceAll('import.meta.prerender', 'false'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )
  new Function('exports', 'require', outputText)(exports, require)
  return exports
}

const read = (path: string) => readFileSync(resolve(ogRuntime, path), 'utf8')

afterEach(() => vi.unstubAllGlobals())

type Composables = {
  defineOgImage: (options: Record<string, unknown>) => void
  push: (input: unknown) => void
}

/**
 * SSR of one request: module plugins, then (optionally) the site's head plugin, then app.vue's
 * site-wide card, then the page's own head, then render.
 */
async function renderHead(
  url: string,
  options: { plugin: boolean; page?: (c: Composables) => void }
) {
  const { pathname: path, searchParams } = new URL(url, SITE)
  const query = Object.fromEntries(searchParams)
  const head = createHead()
  const rendered: Array<(ctx: unknown) => Promise<void> | void> = []
  const runtimeConfig = {
    app: { baseURL: '/' },
    nitro: { routeRules: {} },
    'nuxt-og-image': { defaults: { width: 1200, height: 630, extension: 'png' } },
  }
  const event = { path: url, context: { _nitro: { routeRules: {} } } }
  const ssrContext: Record<string, unknown> = { url, event, head, runtimeConfig }
  const nuxtApp = {
    payload: { path },
    ssrContext,
    hooks: {
      hook: (name: string, fn: (ctx: unknown) => void) =>
        name === 'app:rendered' && rendered.push(fn),
    },
    runWithContext: <T>(fn: () => T) => fn(),
  }
  const imports = {
    useRuntimeConfig: () => runtimeConfig,
    useHead: (input: unknown, opts: unknown) => head.push(input as never, opts as never),
    useRequestEvent: () => event,
    withSiteUrl: (value: string) => (value.startsWith('/') ? `${SITE}${value}` : value),
  }
  const pure = runSource(read('pure.js'), { defu: { defu } })
  const shared = runSource(read('shared.js'), { '#imports': imports, ufo, vue, './pure.js': pure })
  const utils = runSource(read('app/utils.js'), {
    '#build/nuxt-og-image/components.mjs': { componentNames: [] },
    '#imports': imports,
    '@unhead/vue': { resolveUnrefHeadInput },
    defu: { defu },
    devalue,
    ufo,
    '../shared.js': shared,
  })
  const kit = runSource(read('server/util/kit.js'), {
    '#imports': imports,
    defu: { defu },
    ohash: { hash },
    radix3,
    ufo,
  })
  const defineOgImageModule = runSource(read('app/composables/defineOgImage.js'), {
    h3,
    'nuxt/app': {
      createError: h3.createError,
      useNuxtApp: () => nuxtApp,
      useRequestEvent: () => event,
      useRoute: () => ({ path, query }),
      useState: (_key: string, init: () => unknown) => vue.ref(init()),
    },
    vue,
    '../../server/util/kit.js': kit,
    '../../shared.js': shared,
    '../utils.js': utils,
  })
  const component = runSource(read('app/composables/defineOgImageComponent.js'), {
    './defineOgImage.js': defineOgImageModule,
  })
  const plugins = runSource(read('app/utils/plugins.js'), {
    '#imports': imports,
    '@unhead/vue/plugins': { TemplateParamsPlugin },
    defu: { defu },
    devalue,
    radix3,
    ufo,
    vue,
    '../../app/utils.js': utils,
    '../../pure.js': pure,
    '../../shared.js': shared,
  })
  // Module plugins are registered before the app's own plugins, in the module's order.
  plugins.routeRuleOgImage(nuxtApp)
  plugins.ogImageCanonicalUrls(nuxtApp)
  if (options.plugin) {
    vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
    vi.stubGlobal('injectHead', () => head)
    const { default: plugin } = await import('../../plugins/01.og-image-head')
    ;(plugin as unknown as { setup: (app: unknown) => void }).setup(nuxtApp)
  }
  // app.vue: the site-wide default card, `defineOgImageComponent('Cambio')`.
  component.defineOgImageComponent('Cambio')
  options.page?.({
    defineOgImage: defineOgImageModule.defineOgImage,
    push: input => head.push(input as never),
  })
  for (const hook of rendered) await hook({ ssrContext })
  const { headTags } = await renderSSRHead(head)
  const meta = (attribute: 'property' | 'name', key: string) =>
    headTags.match(new RegExp(`<meta ${attribute}="${key}" content="([^"]*)"`))?.[1]
  return {
    ogImage: meta('property', 'og:image'),
    ogImageUrl: meta('property', 'og:image:url'),
    ogImageSecureUrl: meta('property', 'og:image:secure_url'),
    twitterImage: meta('name', 'twitter:image'),
    twitterImageSrc: meta('name', 'twitter:image:src'),
  }
}

const TRACKED = '/dolar-hoy?utm_source=x&fbclid=y&title=z'
const CARD = `${SITE}/__og-image__/image/dolar-hoy/og.png`

describe('card URLs of a page asked with a query', () => {
  it('reproduces the leak: the installed module copies the page query into the card URL', async () => {
    const head = await renderHead(TRACKED, { plugin: false })
    for (const url of [head.ogImage, head.twitterImage, head.twitterImageSrc]) {
      expect(url).toMatch(
        /^https:\/\/cambio-uruguay\.com\/__og-image__\/image\/dolar-hoy\/og\.png\?/
      )
      expect(url).toContain('_query')
      expect(url).toContain('title=z')
    }
  })

  it('writes the clean card URL with plugins/01.og-image-head.ts', async () => {
    const head = await renderHead(TRACKED, { plugin: true })
    for (const url of [head.ogImage, head.twitterImage, head.twitterImageSrc]) {
      expect(url).toBe(CARD)
      expect(url).toMatch(/\/og\.png$/)
      expect(url).not.toContain('?')
      expect(url).not.toContain('_query')
    }
  })

  it('cleans every meta tag that can carry the card, home page included', async () => {
    const head = await renderHead('/?x=123', {
      plugin: true,
      page: ({ push }) =>
        push({
          meta: [
            { property: 'og:image:url', content: `${SITE}/__og-image__/image/og.png?x=123` },
            { property: 'og:image:secure_url', content: `${SITE}/__og-image__/image/og.png?x=1` },
          ],
        }),
    })
    expect(head.ogImage).toBe(`${SITE}/__og-image__/image/og.png`)
    expect(head.ogImageUrl).toBe(`${SITE}/__og-image__/image/og.png`)
    expect(head.ogImageSecureUrl).toBe(`${SITE}/__og-image__/image/og.png`)
  })

  it("leaves a page's own photo untouched, query and all", async () => {
    const photo = 'https://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1_112026-C.webp?x=1'
    const head = await renderHead('/alquileres/una-ficha?fbclid=y', {
      plugin: true,
      page: ({ defineOgImage }) => defineOgImage({ url: photo }),
    })
    expect(head.ogImage).toBe(photo)
    expect(head.twitterImage).toBe(photo)
  })
})
