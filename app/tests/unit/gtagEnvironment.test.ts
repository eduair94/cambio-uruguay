import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { defu } from 'defu'
import ts from 'typescript'
import { withQuery } from 'ufo'
import { describe, expect, it, vi } from 'vitest'
import { isBareRoute } from '../../utils/bareRoutes'
import { CONSENT_STRICT_REGIONS } from '../../utils/consent'

const appDir = resolve(__dirname, '../..')
const moduleDir = resolve(appDir, 'node_modules/nuxt-gtag/dist')

// Execute the actual config and installed module in memory. No Nuxt server,
// process environment, browser script, Google request or build is involved.
function evaluate(
  filename: string,
  imports: Record<string, unknown>,
  globals: Record<string, unknown> = {}
) {
  const source = readFileSync(filename, 'utf8')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href))
    .replaceAll('import.meta.client', 'true')
    .replaceAll('import.meta.server', 'false')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name in imports) return imports[name]
      throw new Error(`Unexpected import: ${name}`)
    },
    ...globals,
  }
  runInNewContext(outputText, context)
  return context.exports
}

function setup(environment: string) {
  const config = evaluate(
    resolve(appDir, 'nuxt.config.ts'),
    {
      'node:url': { fileURLToPath },
      'node:child_process': {
        execFileSync: () => {
          throw new Error('No child processes in the analytics test')
        },
      },
      './utils/consent': { CONSENT_STRICT_REGIONS },
    },
    {
      defineNuxtConfig: (value: unknown) => value,
      process: { env: { NODE_ENV: environment, SENTRY_RELEASE: 'analytics-test' } },
      URL,
    }
  ).default
  const options = config.modules.find((entry: any) => entry?.[0] === 'nuxt-gtag')[1]
  const imports: any[] = []
  const plugins: any[] = []
  const module = evaluate(resolve(moduleDir, 'module.mjs'), {
    '@nuxt/kit': {
      defineNuxtModule: (value: unknown) => value,
      createResolver: () => ({ resolve: (path: string) => resolve(moduleDir, path) }),
      addImports: (values: any[]) => imports.push(...values),
      addPlugin: (value: unknown) => plugins.push(value),
    },
    defu: { defu },
  }).default
  const nuxt = { options: { runtimeConfig: { public: {} as any }, build: { transpile: [] } } }
  module.setup({ ...module.defaults, ...options }, nuxt)

  const browser: any = { location: { pathname: '/' } }
  const head: any[] = []
  const hooks: ((to: { path: string }) => void)[] = []
  const runtimeGlobals = {
    window: browser,
    document: { head: { querySelector: () => (head.length ? {} : null) } },
    console: { error: vi.fn() },
  }
  const cache = new Map<string, any>()
  const runtimeImports: Record<string, any> = {
    '#imports': {
      toRaw: (value: unknown) => value,
      useHead: (value: unknown) => head.push(value),
      useRuntimeConfig: () => nuxt.options.runtimeConfig,
      defineNuxtPlugin: (value: unknown) => value,
    },
    ufo: { withQuery },
  }
  const loadRuntime = (filename: string): any => {
    if (cache.has(filename)) return cache.get(filename)
    const dependencies = { ...runtimeImports }
    const source = readFileSync(filename, 'utf8')
    for (const match of source.matchAll(/from "(\.[^"]+)"/g)) {
      dependencies[match[1]] = loadRuntime(resolve(dirname(filename), match[1]))
    }
    const result = evaluate(filename, dependencies, runtimeGlobals)
    cache.set(filename, result)
    return result
  }
  const composable = (name: string) => {
    const entry = imports.find(item => (item.as || item.name) === name)
    return loadRuntime(`${entry.from}.js`)[entry.name]
  }
  const useGtag = composable('useGtag')
  const useTrackEvent = composable('useTrackEvent')
  const startApp = (path: string) => {
    browser.location.pathname = path
    for (const plugin of plugins) loadRuntime(`${plugin.src}.js`).default.setup()
    evaluate(
      resolve(appDir, 'plugins/gtag-init.client.ts'),
      { '~/utils/bareRoutes': { isBareRoute } },
      {
        ...runtimeGlobals,
        defineNuxtPlugin: (callback: (app: unknown) => void) => callback({}),
        useGtag,
        useRouter: () => ({
          afterEach: (callback: (to: { path: string }) => void) => hooks.push(callback),
        }),
      }
    )
  }
  return { options, imports, plugins, browser, head, hooks, useGtag, useTrackEvent, startApp }
}

describe('Google tags by environment', () => {
  it.each(['development', 'test'])('keeps %s initialization and events as no-ops', environment => {
    const runtime = setup(environment)
    expect(runtime.options.enabled).toBe(false)
    expect(runtime.imports.map(item => item.name)).toEqual(['useGtagMock', 'useTrackEventMock'])
    expect(runtime.plugins).toEqual([])
    runtime.startApp('/herramientas/calculadora-plazo-fijo')
    runtime.hooks[0]({ path: '/declaracion-de-irpf-uruguay' })
    const tag = runtime.useGtag()
    tag.initialize()
    tag.gtag('event', 'test_event')
    tag.disableAnalytics()
    tag.enableAnalytics()
    runtime.useTrackEvent('test_event')
    expect(runtime.head).toEqual([])
    expect(runtime.browser.dataLayer).toBeUndefined()
  })

  it('keeps production manual initialization and both real composables', () => {
    const runtime = setup('production')
    expect(runtime.options.enabled).toBe(true)
    expect(runtime.options.initMode).toBe('manual')
    expect(runtime.imports.map(item => item.name)).toEqual(['useGtag', 'useTrackEvent'])
    runtime.startApp('/declaracion-de-irpf-uruguay')
    expect(runtime.head).toHaveLength(1)
    expect(runtime.head[0].script[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-F97PNVRMRF'
    )
    runtime.useGtag().gtag('event', 'direct_event')
    runtime.useTrackEvent('composable_event')
    const commands = runtime.browser.dataLayer.map((args: IArguments) => Array.from(args))
    expect(
      commands.filter((args: any[]) => args[0] === 'config').map((args: any[]) => args[1])
    ).toEqual(['G-F97PNVRMRF', 'AW-972399920'])
    expect(commands).toContainEqual(['event', 'direct_event'])
    expect(commands).toContainEqual(['event', 'composable_event'])
  })

  it.each(['/widget', '/pizarra', '/en/pizarra', '/pt/widget'])(
    'preserves the production bare-route guard for %s and starts once on exit',
    path => {
      const runtime = setup('production')
      runtime.startApp(path)
      expect(runtime.head).toEqual([])
      runtime.hooks[0]({ path: '/declaracion-de-irpf-uruguay' })
      expect(runtime.head).toHaveLength(1)
      runtime.hooks[0]({ path: '/' })
      expect(runtime.head).toHaveLength(1)
    }
  )
})
