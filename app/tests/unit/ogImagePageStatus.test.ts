import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { parse as parseSfc } from '@vue/compiler-sfc'
import * as devalue from 'devalue'
import * as h3 from 'h3'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
      .replaceAll('import.meta.dev', 'false')
      .replaceAll('import.meta.client', 'false')
      .replaceAll('import.meta.prerender', 'false'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )
  runInNewContext(outputText, context)
  return context.exports
}

const ogServer = resolve(__dirname, '../../node_modules/nuxt-og-image/dist/runtime/server')
const encoding = runSource(readFileSync(resolve(ogServer, 'util/encoding.js'), 'utf8'), {})
const page = parseSfc(
  readFileSync(resolve(__dirname, '../../pages/sucursales/[origin]/[[location]].vue'), 'utf8')
).descriptor.scriptSetup!.content
const pageAst = ts.createSourceFile('page.ts', page, ts.ScriptTarget.Latest, true)
const pageMeta = pageAst.statements.find(
  statement =>
    ts.isExpressionStatement(statement) &&
    ts.isCallExpression(statement.expression) &&
    statement.expression.expression.getText(pageAst) === 'definePageMeta'
)!

afterEach(() => vi.unstubAllGlobals())

async function runtime(patched = true) {
  const hooks = new Map<string, (event: h3.H3Event) => unknown>()
  const captured: Array<{ path: string; status: number }> = []
  const events = new Map<string, h3.H3Event>()
  const sourceReads: string[] = []
  const directory = {
    casas: { brou: { name: 'BROU' } },
    branches: [{ origin: 'brou', dept: 'Montevideo' }],
  }
  let meta: any
  runSource(
    pageMeta.getText(pageAst),
    {},
    {
      definePageMeta: (value: unknown) => {
        meta = value
      },
      $fetch: async () => directory,
    }
  )
  const validate = runSource(
    readFileSync(
      resolve(__dirname, '../../node_modules/nuxt/dist/pages/runtime/validate.js'),
      'utf8'
    ),
    {
      '#app/composables/error': { createError: h3.createError },
      '#app/composables/router': { defineNuxtRouteMiddleware: (handler: unknown) => handler },
    }
  ).default
  const app = h3.createApp({
    onRequest: async event => {
      event.fetch = async input => request(String(input))
      events.set(event.path, event)
      await hooks.get('request')?.(event)
    },
    onError: (error, event) => {
      captured.push({ path: event.path, status: error.statusCode })
      h3.setResponseStatus(event, error.statusCode)
      h3.setHeader(event, 'content-type', 'text/html')
      return h3.send(event, `<html><h1>${error.statusCode}</h1></html>`)
    },
  })
  const originalOnError = app.options.onError!
  const delegated = vi.fn(originalOnError)
  app.options.onError = delegated
  if (patched) {
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    const { default: plugin } = await import('../../server/plugins/og-image-page-status')
    plugin({
      h3App: app,
      hooks: {
        hook: (name: string, handler: (event: h3.H3Event) => unknown) => hooks.set(name, handler),
      },
    } as never)
  }
  const webHandler = h3.toWebHandler(app)
  const request = (path: string) => webHandler(new Request(`http://localhost${path || '/'}`))
  // Execute the installed extractor, not a copy of its error checks. All fetches
  // remain in this in-memory H3 app; no Sentry, application jobs or network.
  const extractor = runSource(
    readFileSync(resolve(ogServer, 'og-image/context.js'), 'utf8') +
      '\nexport { fetchPathHtmlAndExtractOptions };',
    {
      '#og-image-cache': {
        htmlPayloadCache: { getItem: async () => null, setItem: async () => {} },
      },
      '#og-image-virtual/unocss-config.mjs': {},
      '#site-config/server/composables/useSiteConfig': {},
      '#site-config/server/composables/utils': {},
      '@unocss/core': {},
      '@unocss/preset-wind3': {},
      defu: {},
      devalue,
      h3,
      'nitropack/runtime': {},
      ohash: {},
      ufo: {},
      unstorage: {},
      '../../shared.js': {},
      '../util/encoding.js': encoding,
      '../util/kit.js': {},
      '../util/logger.js': { logger: { warn: () => {} } },
      '../util/options.js': {},
      './instances.js': {},
    },
    { globalThis: { $fetch: { raw: request } } }
  ).fetchPathHtmlAndExtractOptions
  app.use(
    h3.eventHandler(async event => {
      if (event.path.startsWith('/__og-image__/image/')) {
        const source = event.path.replace('/__og-image__/image', '').replace(/\/og\.png$/, '')
        if (source === '/renderer-failure') {
          await event.fetch!('/renderer-failure')
          throw h3.createError({ statusCode: 500, statusMessage: 'Renderer crashed' })
        }
        return extractor(event, source, source)
      }
      sourceReads.push(event.path)
      if (event.path === '/renderer-failure') {
        throw h3.createError({ statusCode: 404 })
      }
      if (event.path === '/gone') {
        throw h3.createError({ statusCode: 410 })
      }
      if (event.path === '/unavailable') {
        throw h3.createError({ statusCode: 503 })
      }
      if (event.path === '/broken') {
        return '<html><body>Successful SSR lost its OG metadata</body></html>'
      }
      if (event.path.startsWith('/sucursales/')) {
        const [, , origin, location] = event.path.split('/')
        const error = await validate(
          { meta, params: { origin, location }, fullPath: event.path },
          {}
        )
        if (error) return error
      }
      const payload = devalue.stringify({ component: 'OgImageCambio', props: { title: 'BROU' } })
      return `<html><script id="nuxt-og-image-options" type="application/json">${payload}</script></html>`
    })
  )
  return { request, captured, events, sourceReads, delegated }
}

describe('OG image status through the installed Nuxt validator, extractor and H3', () => {
  it('reproduces the original 500 for a branch page rejected by its real validate guard', async () => {
    const { request } = await runtime(false)
    expect((await request('/sucursales/no-existe')).status).toBe(404)
    expect((await request('/__og-image__/image/sucursales/no-existe/og.png')).status).toBe(500)
  })

  it.each(['/sucursales/no-existe', '/sucursales/brou/departamento-inventado'])(
    'preserves the real 404 for %s before Nitro captures and renders it',
    async source => {
      const { request, captured, delegated } = await runtime()
      const path = `/__og-image__/image${source}/og.png`
      expect((await request(path)).status).toBe(404)
      expect(captured.find(error => error.path === path)?.status).toBe(404)
      expect(delegated).toHaveBeenCalled()
    }
  )

  it('preserves 410 while keeping server failures and successful HTML without metadata as 500', async () => {
    const { request, captured } = await runtime()
    for (const [source, expected] of [
      ['/gone', 410],
      ['/unavailable', 500],
      ['/broken', 500],
    ] as const) {
      const path = `/__og-image__/image${source}/og.png`
      expect((await request(path)).status).toBe(expected)
      expect(captured.find(error => error.path === path)?.status).toBe(expected)
    }
  })

  it('keeps valid OG payloads and adds no source fetch', async () => {
    const { request, sourceReads, captured } = await runtime()
    const response = await request('/__og-image__/image/sucursales/brou/montevideo/og.png')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ component: 'OgImageCambio' })
    expect(sourceReads).toEqual(['/sucursales/brou/montevideo'])
    expect(captured).toEqual([])
  })

  it('does not relabel a different OG failure even after reading a missing source', async () => {
    const { request, captured } = await runtime()
    const path = '/__og-image__/image/renderer-failure/og.png'
    expect((await request(path)).status).toBe(500)
    expect(captured.find(error => error.path === path)?.status).toBe(500)
  })

  it('records the status its own page read saw, so a 500 says which case it was', async () => {
    const { request, events } = await runtime()
    for (const [source, expected] of [
      ['/broken', '200'],
      ['/sucursales/no-existe', '404'],
      ['/sucursales/brou/montevideo', '200'],
    ] as const) {
      const path = `/__og-image__/image${source}/og.png`
      await request(path)
      expect(events.get(path)?.context.ogSourceStatus).toBe(expected)
    }
    // A request the plugin does not handle keeps no diagnostic at all.
    await request('/unavailable')
    expect(events.get('/unavailable')?.context.ogSourceStatus).toBeUndefined()
  })

  it('does not mix statuses between parallel OG requests or alter unrelated route errors', async () => {
    const { request, captured } = await runtime()
    const paths = [
      '/__og-image__/image/sucursales/no-existe/og.png',
      '/__og-image__/image/broken/og.png',
      '/__og-image__/image/sucursales/brou/og.png',
      '/unavailable',
    ]
    const responses = await Promise.all(paths.map(request))
    expect(responses.map(response => response.status)).toEqual([404, 500, 200, 503])
    expect(captured.find(error => error.path === '/unavailable')?.status).toBe(503)
  })
})
