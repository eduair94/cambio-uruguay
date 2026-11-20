import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInThisContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import unheadVite from '@unhead/addons/vite'
import * as unhead from '@unhead/vue'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import * as defu from 'defu'
import * as devalue from 'devalue'
import * as h3 from 'h3'
import ts from 'typescript'
import * as ufo from 'ufo'
import * as vue from 'vue'
import { parse as parseJs } from 'acorn'
import { describe, expect, it } from 'vitest'
import { pickSharePhoto } from '../../utils/photoSizes'
import { rentalPageMessages } from '../../utils/rentalPageMessages'

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
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText(pageAst) === 'defineOgImageComponent'
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
const photoHead = pageAst.statements
  .find(
    statement =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText(pageAst) === 'useHead' &&
      statement.expression.arguments.length === 2
  )!
  .getText(pageAst)
// The page's own choice of preview photo and its alt, run as written.
const sharePhotoStatements = pageAst.statements
  .filter(
    statement =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(declaration =>
        ['primaryPhoto', 'primaryPhotoAlt'].includes(declaration.name.getText(pageAst))
      )
  )
  .map(statement => statement.getText(pageAst))
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
const advertPhoto = 'https://cdn1.infocasas.com.uy/repo/img/176366570_ALB-1447-TRA_904.jpg'
// What the preview gets for that upload: InfoCasas' own 1200x630 file, under WhatsApp's 600 KB.
const photoUrl =
  'https://cdn2.infocasas.com.uy/repo/img/th.outside1200x630.176366570_ALB-1447-TRA_904.jpg'
const generatedUrl = `/__og-image__/image${pagePath}/og.png`
const pageTitleText = 'Apartamento en alquiler en Canelones'
const renderedAt = Date.UTC(2026, 10, 8, 12)
// Signed until 2026-11-12 (oe), Facebook's 261-px crop; and a TikTok cover that ran out on 10-31.
const facebookPhoto =
  'https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/500738122_n.jpg?stp=c0.214.553.553a_dst-jpg_tt6&ctp=s261x260&oe=6AF5B93B'
const tiktokPhoto =
  'https://p16-common-sign.tiktokcdn.com/tos-alisg-i-photomode-sg/f3fb90ed~tplv-photomode-image.jpeg?x-expires=1793419200&x-signature=x'

const t = (key: string, params: Record<string, unknown> = {}) =>
  String(rentalPageMessages.es[key as keyof typeof rentalPageMessages.es] ?? key).replace(
    /\{(\w+)\}/g,
    (_, name: string) => String(params[name] ?? '')
  )

function sharePhoto(photos: Array<{ url: string }>) {
  expect(sharePhotoStatements).toHaveLength(2)
  return execute(
    `${sharePhotoStatements.join('\n')}\nexports.primaryPhoto = primaryPhoto\nexports.primaryPhotoAlt = primaryPhotoAlt`,
    {},
    {
      computed: vue.computed,
      photos: vue.ref(photos),
      renderedAt: vue.ref(renderedAt),
      pickSharePhoto,
      pageTitle: vue.ref(pageTitleText),
      t,
    }
  ) as { primaryPhoto: vue.Ref<{ url: string } | undefined>; primaryPhotoAlt: vue.Ref<string> }
}

async function renderPreview(
  photos: Array<{ url: string }> = [{ url: advertPhoto }],
  legacy = false
) {
  const head = createHead()
  const useHead = (input: any, options: any = {}) => unhead.useHead(input, { ...options, head })
  const useSeoMeta = (input: any, options: any = {}) =>
    unhead.useSeoMeta(input, { ...options, head })
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
  const share = sharePhoto(photos)
  const globals = {
    ...composable,
    ...component,
    useSeoMeta,
    useHead,
    primaryPhoto: share.primaryPhoto,
    primaryPhotoAlt: share.primaryPhotoAlt,
    pageTitle: vue.ref(pageTitleText),
    zone: vue.ref('Canelones'),
    description: vue.ref('Fotos, costos y aviso original.'),
    canonical: vue.ref(`https://cambio-uruguay.com${pagePath}`),
    locale: vue.ref('es'),
    data: vue.ref({ seo: { indexable: true } }),
    error: vue.ref(null),
    t,
  }
  execute(rootImage, {}, globals)
  execute(
    legacy
      ? `if (primaryPhoto.value) { defineOgImage(false) } else { ${imageBranch} }`
      : imageBranch,
    {},
    globals
  )
  // Exercise the production optimizer too: installed Unhead 2.0.10 rewrites
  // inline useSeoMeta objects and drops their second options argument.
  const optimizer = unheadVite().find(plugin => plugin.name === 'unhead:use-seo-meta-transform')!
  const headSource = legacy ? pageSeo : `${pageSeo}\n${photoHead}`
  const transformed = await (optimizer.transform as any).call(
    { parse: (code: string) => parseJs(code, { ecmaVersion: 'latest', sourceType: 'module' }) },
    headSource,
    '/rental-preview.js'
  )
  execute(transformed?.code || headSource, {}, globals)
  return renderSSRHead(head)
}

describe('rental previews through installed nuxt-og-image and Unhead SSR', () => {
  it('reproduces the missing generated-card payload after disposing the root preview', async () => {
    const { headTags, bodyTags } = await renderPreview(undefined, true)
    expect(headTags).toContain(`property="og:image" content="${photoUrl}"`)
    expect(bodyTags).not.toContain('nuxt-og-image-options')
  })
  it('publishes one real photo for OG/Twitter without inherited generated-image dimensions', async () => {
    const { headTags, bodyTags } = await renderPreview()
    expect(headTags.match(/property="og:image"/g)).toHaveLength(1)
    expect(headTags).toContain(`property="og:image" content="${photoUrl}"`)
    expect(headTags).toContain(`name="twitter:image" content="${photoUrl}"`)
    expect(headTags).not.toContain(advertPhoto)
    // The alt names the page (its title carries the price), not the portal's headline.
    expect(headTags).toContain(`property="og:image:alt" content="${pageTitleText} · Foto 1"`)
    expect(headTags).toContain('index, follow, max-image-preview:large')
    expect(headTags).not.toMatch(/(?:og|twitter):image:(?:width|height|type)/)
    expect(headTags).toContain(`name="twitter:image:src" content="${photoUrl}"`)
    const payload = bodyTags.match(
      /<script[^>]+id="nuxt-og-image-options"[^>]*>(.*?)<\/script>/
    )?.[1]
    expect(payload).toBeDefined()
    expect(devalue.parse(payload!)).toMatchObject({
      props: {
        title: 'Apartamento en alquiler en Canelones',
        subtitle: 'Canelones',
        tag: 'ALQUILERES',
      },
    })
  })
  it('retains the generated preview and rendering payload when the advert has no photo', async () => {
    const { headTags, bodyTags } = await renderPreview([])
    expect(headTags).toContain(`property="og:image" content="${generatedUrl}"`)
    expect(headTags).toContain('property="og:image:width" content="1200"')
    expect(bodyTags).toContain('nuxt-og-image-options')
    expect(headTags).not.toContain(photoUrl)
  })
  it('uses the generated card when every photo is signed, tiny or about to expire', async () => {
    const { headTags, bodyTags } = await renderPreview([
      { url: facebookPhoto },
      { url: tiktokPhoto },
      { url: 'https://www.buscandocasa.com/fotostemp/0F8APAT0212216_20260925111845_99.jpg' },
    ])
    expect(headTags.match(/property="og:image"/g)).toHaveLength(1)
    expect(headTags).toContain(`property="og:image" content="${generatedUrl}"`)
    expect(headTags).toContain(`name="twitter:image" content="${generatedUrl}"`)
    expect(headTags).toContain('property="og:image:height" content="630"')
    expect(headTags).not.toMatch(/fbcdn|tiktokcdn|buscandocasa/)
    expect(headTags).toContain(`property="og:image:alt" content="${pageTitleText}"`)
    expect(bodyTags).toContain('nuxt-og-image-options')
  })
  it('skips an unusable first photo for the first one a preview can show', async () => {
    const cover = 'https://http2.mlstatic.com/D_NQ_NP_2X_893935-MLU121040513313_112026-C.webp'
    const { headTags } = await renderPreview([{ url: facebookPhoto }, { url: cover }])
    expect(headTags).toContain(
      'property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_2X_893935-MLU121040513313_112026-C.jpg"'
    )
    expect(headTags).toContain(`property="og:image:alt" content="${pageTitleText} · Foto 2"`)
    expect(headTags).not.toMatch(/(?:og|twitter):image:(?:width|height|type)/)
  })
})
