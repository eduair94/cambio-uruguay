import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInThisContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import * as unhead from '@unhead/vue'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import * as defu from 'defu'
import * as devalue from 'devalue'
import * as h3 from 'h3'
import ts from 'typescript'
import * as ufo from 'ufo'
import * as vue from 'vue'
import { describe, expect, it, vi } from 'vitest'

function execute(source: string, modules: Record<string, unknown>, globals = {}, server = true) {
  const context = {
    exports: {} as any,
    ...globals,
    require: (name: string) => {
      if (name in modules) return modules[name]
      throw new Error(`Unexpected module ${name}`)
    },
  }
  const compiled = ts.transpileModule(
    source
      .replaceAll('import.meta.server', String(server))
      .replaceAll('import.meta.client', String(!server))
      .replaceAll('import.meta.dev', 'false')
      .replaceAll('import.meta.prerender', 'false'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )
  // Keep plain objects in Unhead's realm: its resolver checks constructor === Object.
  runInThisContext(`(function(${Object.keys(context).join(',')}) { ${compiled.outputText}\n })`)(
    ...Object.values(context)
  )
  return context.exports
}

function script(path: string) {
  return parse(readFileSync(resolve(__dirname, path), 'utf8')).descriptor.scriptSetup!.content
}
const pageSource = script('../../pages/alquileres/[key].vue')
const pageAst = ts.createSourceFile('page.ts', pageSource, ts.ScriptTarget.Latest, true)
const imageBranch = pageAst.statements
  .find(
    statement =>
      ts.isIfStatement(statement) &&
      statement.expression.getText(pageAst).includes('primaryPhoto.value')
  )!
  .getText(pageAst)
const pageSeo = pageAst.statements
  .find(
    statement =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText(pageAst) === 'useSeoMeta'
  )!
  .getText(pageAst)
const appAst = ts.createSourceFile('app.ts', script('../../app.vue'), ts.ScriptTarget.Latest, true)
const rootImage = appAst.statements
  .find(
    statement =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText(appAst) === 'defineOgImageComponent'
  )!
  .getText(appAst)

const pagePath = '/alquileres/canelones-apartamento-avenida-de-las-americas-1dw4vag'
const photoUrl = 'https://cdn1.infocasas.com.uy/repo/img/176366570_ALB-1447-TRA_904.jpg'
const generatedUrl = `/__og-image__/image${pagePath}/og.png`

async function renderPreview(hasPhoto = true, disposeRoot = true) {
  const head = createHead()
  const useHead = (input: any, options: any = {}) => unhead.useHead(input, { ...options, head })
  const useSeoMeta = (input: any) => unhead.useSeoMeta(input, { head })
  const config = {
    app: { baseURL: '/' },
    'nuxt-og-image': {
      defaults: { component: 'Cambio', width: 1200, height: 630, extension: 'png' },
    },
  }
  const nuxtApp = { payload: { path: pagePath }, ssrContext: { event: { context: {} } } }
  const installed = (path: string) =>
    readFileSync(resolve(__dirname, '../../node_modules/nuxt-og-image/dist/runtime', path), 'utf8')
  // Exercise the installed module's priorities/disposal, then render through real Unhead SSR.
  const pure = execute(installed('pure.js'), { defu })
  const shared = execute(installed('shared.js'), {
    '#imports': { useRuntimeConfig: () => config },
    ufo,
    vue,
    './pure.js': pure,
  })
  const utilities = execute(installed('app/utils.js'), {
    '#build/nuxt-og-image/components.mjs': { componentNames: [] },
    '#imports': { useHead },
    '@unhead/vue': unhead,
    defu,
    devalue,
    ufo,
    '../shared.js': shared,
  })
  const composable = execute(installed('app/composables/defineOgImage.js'), {
    h3,
    vue,
    'nuxt/app': { useNuxtApp: () => nuxtApp, useRoute: () => ({ path: pagePath, query: {} }) },
    '../../server/util/kit.js': { createNitroRouteRuleMatcher: () => () => ({}) },
    '../../shared.js': shared,
    '../utils.js': utilities,
  })
  const component = execute(installed('app/composables/defineOgImageComponent.js'), {
    './defineOgImage.js': composable,
  })
  const globals = {
    ...composable,
    ...component,
    useSeoMeta,
    primaryPhoto: vue.ref(hasPhoto ? { url: photoUrl } : undefined),
    primaryPhotoAlt: vue.ref(hasPhoto ? 'Apartamento en Canelones · Foto 1' : undefined),
    pageTitle: vue.ref('Apartamento en alquiler en Canelones'),
    zone: vue.ref('Canelones'),
    description: vue.ref('Fotos, costos y aviso original.'),
    canonical: vue.ref(`https://cambio-uruguay.com${pagePath}`),
    locale: vue.ref('es'),
    data: vue.ref({ seo: { indexable: true } }),
    error: vue.ref(null),
    t: (key: string) => key,
  }
  execute(rootImage, {}, globals)
  execute(
    disposeRoot ? imageBranch : imageBranch.replace('defineOgImage(false)', 'void 0'),
    {},
    globals
  )
  execute(pageSeo, {}, globals)
  return renderSSRHead(head)
}

describe('rental previews through installed nuxt-og-image and Unhead SSR', () => {
  it('does not dispose application entries during client hydration or SPA navigation', () => {
    const dispose = vi.fn()
    const composable = execute(
      readFileSync(
        resolve(
          __dirname,
          '../../node_modules/nuxt-og-image/dist/runtime/app/composables/defineOgImage.js'
        ),
        'utf8'
      ),
      {
        h3,
        vue,
        'nuxt/app': {
          useNuxtApp: () => ({
            payload: { path: pagePath },
            ssrContext: { _ogImageInstances: [{ dispose }] },
          }),
          useRoute: () => ({ path: pagePath }),
        },
        '../../server/util/kit.js': {},
        '../../shared.js': {},
        '../utils.js': {},
      },
      {},
      false
    )
    composable.defineOgImage(false)
    expect(dispose).not.toHaveBeenCalled()
  })
  it('reproduces the root generated image overriding page metadata without explicit disposal', async () => {
    const { headTags } = await renderPreview(true, false)
    expect(headTags).toContain(`property="og:image" content="${generatedUrl}"`)
    expect(headTags).toContain('property="og:image:width" content="1200"')
  })
  it('publishes one real photo for OG/Twitter without inherited generated-image dimensions', async () => {
    const { headTags, bodyTags } = await renderPreview()
    expect(headTags.match(/property="og:image"/g)).toHaveLength(1)
    expect(headTags).toContain(`property="og:image" content="${photoUrl}"`)
    expect(headTags).toContain(`name="twitter:image" content="${photoUrl}"`)
    expect(headTags).toContain(
      'property="og:image:alt" content="Apartamento en Canelones · Foto 1"'
    )
    expect(headTags).toContain('index, follow, max-image-preview:large')
    expect(headTags).not.toMatch(/(?:og|twitter):image:(?:width|height|src)/)
    expect(bodyTags).not.toContain('nuxt-og-image-options')
  })
  it('retains the generated preview and rendering payload when the advert has no photo', async () => {
    const { headTags, bodyTags } = await renderPreview(false)
    expect(headTags).toContain(`property="og:image" content="${generatedUrl}"`)
    expect(headTags).toContain('property="og:image:width" content="1200"')
    expect(bodyTags).toContain('nuxt-og-image-options')
    expect(headTags).not.toContain(photoUrl)
  })
})
