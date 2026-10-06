import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import * as ohash from 'ohash'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
// The installed Nuxt's own check (what @nuxt/nitro-server's island handler calls).
import {
  computeIslandHash,
  filterIslandProps,
} from '../../node_modules/nuxt/dist/app/island-hash.js'
import { nuxtIslandHash, rewriteOgImageIslandUrl } from '../../server/utils/ogImageIsland'

afterEach(() => vi.unstubAllGlobals())

/** The installed nuxt-og-image `fetchIsland`, run as-is with its `$fetch` captured. */
function moduleIslandFetch(component: string, props: Record<string, unknown>) {
  const source = readFileSync(
    resolve(__dirname, '../../node_modules/nuxt-og-image/dist/runtime/server/util/kit.js'),
    'utf8'
  )
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as { fetchIsland: (e: unknown, c: string, p: unknown) => unknown },
    require: (name: string) =>
      name === 'ohash' ? ohash : name === 'defu' ? { defu: Object.assign } : {},
  }
  runInNewContext(outputText, context)
  const calls: Array<[string, { params: Record<string, string> }]> = []
  context.exports.fetchIsland(
    {
      $fetch: (url: string, options: { params: Record<string, string> }) =>
        calls.push([url, options]),
    },
    component,
    props
  )
  return calls[0]!
}

/** What Nuxt 4.4's island handler expects for this request (getIslandContext). */
function nuxtExpects(url: string, params: Record<string, string>) {
  const name = url
    .replace('/__nuxt_island/', '')
    .replace(/\.json$/, '')
    .split('_')
    .slice(0, -1)
    .join('_')
  const props = JSON.parse(params.props!)
  return { name, hash: computeIslandHash(name, filterIslandProps(props), {}, undefined) }
}

const props = {
  title: 'Bmw X1 2.0 Sdrive 20i Sportline 192cv 2019 | Cambio Uruguay',
  description: 'Bmw X1, 2019, 65.000 km: US$ 36.900. Comparado contra avisos iguales en Uruguay.',
}

describe('og-image island hash compatibility', () => {
  it('reproduces the 400: the module hash is not the one Nuxt 4.4 validates', () => {
    const [url, options] = moduleIslandFetch('NuxtSeo', props)
    const sent = url.match(/_([A-Za-z0-9-]+)\.json$/)![1]
    expect(sent).not.toBe(nuxtExpects(url, options.params).hash)
  })

  it.each([
    ['NuxtSeo', props],
    ['OgImageCambio', { title: 'Dólar hoy', subtitle: 'Cerro Largo', tag: 'CONTACTO' }],
    ['OgImageCambio', { title: 'x', 'data-v-123': '' }],
    ['NuxtSeo', {}],
  ] as const)('re-addresses %s with exactly the hash Nuxt expects', (component, value) => {
    const [url, options] = moduleIslandFetch(component, value as Record<string, unknown>)
    const rewritten = rewriteOgImageIslandUrl(url, options)!
    const expected = nuxtExpects(url, options.params)
    expect(rewritten).toBe(`/__nuxt_island/${expected.name}_${expected.hash}.json`)
    expect(nuxtIslandHash(component, JSON.parse(options.params.props!))).toBe(expected.hash)
  })

  it('leaves every other request alone', () => {
    const [url, options] = moduleIslandFetch('NuxtSeo', props)
    for (const [request, init] of [
      ['/api/rentals', options],
      [url, undefined],
      [url, { params: { ...options.params, url: '/private' } }],
      [url, { params: { props: 'not json' } }],
      [url, { params: { props: '[1]' } }],
      [new Request('http://localhost' + url), options],
    ] as const)
      expect(rewriteOgImageIslandUrl(request, init)).toBeNull()
  })

  it('wraps $fetch only for OG image requests', async () => {
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    const { default: plugin } = await import('../../server/plugins/og-image-island-hash')
    let hook: ((event: { path: string; $fetch: unknown }) => void) | undefined
    plugin({ hooks: { hook: (_: string, fn: typeof hook) => (hook = fn) } } as never)
    const seen: unknown[] = []
    const $fetch = (request: unknown) => seen.push(request)
    const [url, options] = moduleIslandFetch('NuxtSeo', props)

    const page = { path: '/alquileres-uruguay', $fetch }
    hook!(page)
    expect(page.$fetch).toBe($fetch)

    const og = { path: '/__og-image__/image/autos-usados-uruguay/ml-1/og.png', $fetch }
    hook!(og)
    await (og.$fetch as (r: unknown, o: unknown) => unknown)(url, options)
    await (og.$fetch as (r: unknown, o: unknown) => unknown)('/api/branches', {})
    const expected = nuxtExpects(url, options.params)
    expect(seen).toEqual([`/__nuxt_island/NuxtSeo_${expected.hash}.json`, '/api/branches'])
  })
})
