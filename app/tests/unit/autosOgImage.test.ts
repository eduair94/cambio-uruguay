import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { resolveUnrefHeadInput } from '@unhead/vue'
import { TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defu } from 'defu'
import * as devalue from 'devalue'
import * as h3 from 'h3'
import { hash } from 'ohash'
import * as radix3 from 'radix3'
import ts from 'typescript'
import * as ufo from 'ufo'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import * as vue from 'vue'
import { describe, expect, it } from 'vitest'

// The social card of a car advert, through the INSTALLED nuxt-og-image runtime (its
// defineOgImage, its two server plugins and its head helpers) on a real unhead instance. Only
// the Nuxt runtime around them is stubbed. On 2026-10-07 every advert page still pointed og:image
// at its own /__og-image__ render although nuxt.config had `ogImage: { url: '/img/og-autos.png' }`
// route rules for the three locales: the module's `route-rule-og-image.server` plugin runs on
// `app:rendered`, sees any ogImage rule, and pushes the generated URL over the static one.

const app = resolve(__dirname, '../..')
const ogRuntime = resolve(app, 'node_modules/nuxt-og-image/dist/runtime')
const SITE = 'https://cambio-uruguay.com'

// Same realm on purpose (not node:vm): unhead only walks plain objects whose constructor is this
// realm's `Object`, so module code run in another context would leave its head input unresolved.
function runSource(source: string, modules: Record<string, unknown>, globals = {}) {
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

  new Function('exports', 'require', ...Object.keys(globals), outputText)(
    exports,
    require,
    ...Object.values(globals)
  )
  return exports
}

const read = (path: string) => readFileSync(resolve(ogRuntime, path), 'utf8')

/** The single top-level `<name>(…)` statement of a component's `<script setup>`. */
function setupCall(file: string, name: string): string {
  const setup = parseSfc(readFileSync(resolve(app, file), 'utf8')).descriptor.scriptSetup!.content
  const ast = ts.createSourceFile('setup.ts', setup, ts.ScriptTarget.Latest, true)
  const calls = ast.statements.filter(
    statement =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText(ast) === name
  )
  expect(calls, `${file} calls ${name} once`).toHaveLength(1)
  return calls[0]!.getText(ast)
}

const appCall = setupCall('app.vue', 'defineOgImageComponent')
const advertCall = () => setupCall('pages/autos-usados-uruguay/[key].vue', 'defineOgImage')

/** SSR of one request: module plugins first, then app.vue's setup, then the page's, then render. */
async function renderHead(path: string, routeRules: Record<string, unknown>, page?: string) {
  const head = createHead()
  const rendered: Array<(ctx: unknown) => Promise<void> | void> = []
  const runtimeConfig = {
    app: { baseURL: '/' },
    nitro: { routeRules },
    'nuxt-og-image': { defaults: { width: 1200, height: 630, extension: 'png' } },
  }
  const event = { path, context: { _nitro: { routeRules: {} } } }
  const ssrContext: Record<string, unknown> = { url: path, event, head, runtimeConfig }
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
    useHead: (input: unknown, options: unknown) => head.push(input as never, options as never),
    useRequestEvent: () => event,
    withSiteUrl: (url: string) => (url.startsWith('/') ? `${SITE}${url}` : url),
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
      useRoute: () => ({ path, query: {} }),
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
  // Module plugins are registered before the app's own code, in the module's order.
  plugins.routeRuleOgImage(nuxtApp)
  plugins.ogImageCanonicalUrls(nuxtApp)
  runSource(appCall, {}, { defineOgImageComponent: component.defineOgImageComponent })
  if (page) runSource(page, {}, { defineOgImage: defineOgImageModule.defineOgImage })
  for (const hook of rendered) await hook({ ssrContext })
  const { headTags, bodyTags } = await renderSSRHead(head)
  const meta = (attribute: 'property' | 'name', key: string) =>
    headTags.match(new RegExp(`<meta ${attribute}="${key}" content="([^"]*)"`))?.[1]
  return {
    ogImage: meta('property', 'og:image'),
    twitterImage: meta('name', 'twitter:image'),
    twitterImageSrc: meta('name', 'twitter:image:src'),
    width: meta('property', 'og:image:width'),
    height: meta('property', 'og:image:height'),
    payload: /id="nuxt-og-image-options"/.test(headTags + bodyTags),
  }
}

const ADVERTS = [
  '/autos-usados-uruguay/ml-MLU701850879',
  '/autos-usados-uruguay/fb-955232724311873',
  '/en/autos-usados-uruguay/ml-MLU701850879',
  '/en/autos-usados-uruguay/fb-955232724311873',
  '/pt/autos-usados-uruguay/ml-MLU701850879',
  '/pt/autos-usados-uruguay/fb-955232724311873',
]

describe('social card of a car advert', () => {
  it('reproduces the live bug: an `ogImage: { url }` route rule is overwritten by the generated card', async () => {
    const rule = { ogImage: { url: '/img/og-autos.png' } }
    const head = await renderHead('/en/autos-usados-uruguay/ml-MLU701850879', {
      '/autos-usados-uruguay/*': rule,
      '/en/autos-usados-uruguay/*': rule,
      '/pt/autos-usados-uruguay/*': rule,
    })
    expect(head.ogImage).toBe(
      `${SITE}/__og-image__/image/en/autos-usados-uruguay/ml-MLU701850879/og.png`
    )
  })

  it.each(ADVERTS)('%s points og:image and twitter:image at the static autos card', async path => {
    const head = await renderHead(path, {}, advertCall())
    expect(head.ogImage).toBe(`${SITE}/img/og-autos.png`)
    expect(head.twitterImage).toBe(`${SITE}/img/og-autos.png`)
    expect(head.twitterImageSrc).toBe(`${SITE}/img/og-autos.png`)
    expect([head.width, head.height]).toEqual(['1200', '630'])
    // app.vue's payload stays, so an already crawled /__og-image__ URL of the advert still draws a
    // card instead of answering 500 for a page without one.
    expect(head.payload).toBe(true)
  })

  it('leaves every other page with its own generated card', async () => {
    const head = await renderHead('/autos-usados-uruguay/hasta-6000-dolares', {})
    expect(head.ogImage).toBe(
      `${SITE}/__og-image__/image/autos-usados-uruguay/hasta-6000-dolares/og.png`
    )
  })

  it('keeps nuxt.config free of `ogImage` route rules, which this module version cannot honour', () => {
    const config = readFileSync(resolve(app, 'nuxt.config.ts'), 'utf8')
    expect(config).not.toMatch(/^\s*'[^']+':\s*\{[^}]*\bogImage:/m)
  })
})
