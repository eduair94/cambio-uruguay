import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createUnhead, useHead, useSeoMeta } from '@unhead/vue'
import { createHead as createServerHead } from '@unhead/vue/server'
import * as dates from 'date-fns'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as attribution from '../../utils/attribution'
import * as markers from '../../utils/chartMoveMarkers'
import * as currencies from '../../utils/currencyPages'
import * as faq from '../../utils/faqAnswers'
import * as canonical from '../../utils/historyCanonical'
import * as answer from '../../utils/rateAnswer'
import * as mirrors from '../../utils/rateMirrors'
import * as stats from '../../utils/rateStats'

const filename = resolve(__dirname, '../../pages/historico/[origin]/[currency]/[[type]].vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'historico-detail-head-test' })
const { outputText } = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const scopes: vue.EffectScope[] = []
const mountedApps: vue.App[] = []
afterEach(() => {
  mountedApps.splice(0).forEach(app => app.unmount())
  scopes.splice(0).forEach(scope => scope.stop())
})

// A small host renderer exercises actual Vue lifecycle hooks without loading
// charts, external services or browser DOM. Unhead still uses its client path.
function createHostNode() {
  return { children: [] as any[], parent: null as any }
}
function removeHostNode(node: ReturnType<typeof createHostNode>) {
  if (node.parent) {
    const index = node.parent.children.indexOf(node)
    if (index >= 0) node.parent.children.splice(index, 1)
  }
  node.parent = null
}
const renderer = vue.createRenderer<any, any>({
  createElement: createHostNode,
  createText: createHostNode,
  createComment: createHostNode,
  insert(node, parent, anchor = null) {
    if (node.parent) removeHostNode(node)
    node.parent = parent
    const position = anchor ? parent.children.indexOf(anchor) : -1
    if (position < 0) parent.children.push(node)
    else parent.children.splice(position, 0, node)
  },
  remove: removeHostNode,
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  setText() {},
  setElementText() {},
  patchProp() {},
})

function setupHistory(type?: string, server = false, mount = false) {
  const route = vue.reactive({ params: { origin: 'brou', currency: 'usd', type }, query: {} })
  // The actual client path in Unhead eagerly evaluates SEO getters. No DOM
  // rendering plugin is installed, so this exercises reactivity without a browser.
  const head = server ? createServerHead() : createUnhead({ document: {} as Document })
  const scope = vue.effectScope()
  scopes.push(scope)
  const imports: Record<string, unknown> = {
    '#imports': {
      useSeoMeta: (input: Parameters<typeof useSeoMeta>[0]) =>
        scope.run(() => useSeoMeta(input, { head })),
    },
    vue: mount ? vue : { ...vue, withAsyncContext: (fn: () => unknown) => [fn(), () => {}] },
    'vue-router': { useRoute: () => route, useRouter: () => ({ replace: vi.fn() }) },
    vuetify: { useDisplay: () => ({ smAndDown: vue.ref(false) }) },
    'chart.js': { Chart: { register: vi.fn() } },
    'vue-chartjs': {},
    'date-fns': dates,
    '~/utils/faqAnswers': faq,
    '~/utils/chartMoveMarkers': markers,
    '~/utils/attribution': attribution,
    '~/utils/historyCanonical': canonical,
    '~/utils/rateMirrors': mirrors,
    '~/utils/rateStats': stats,
    '~/utils/currencyPages': currencies,
    '~/utils/rateAnswer': answer,
  }
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name in imports) return imports[name]
      throw new Error(`Unexpected import: ${name}`)
    },
    useI18n: () => ({ t: (key: string) => key, locale: vue.ref('es') }),
    useLocalePath: () => (path: string) => path,
    useApiService: () => ({
      getEvolutionData: async () => ({ data: { evolution: [], localData: { name: 'BROU' } } }),
    }),
    useLoading: () => ({ withLoading: (fn: () => unknown) => fn() }),
    useAIInsights: () => ({
      loading: vue.ref(false),
      error: vue.ref(null),
      insight: vue.ref(null),
    }),
    useFetch: async () => ({ data: vue.ref({ items: [] }) }),
    useLazyAsyncData: () => ({ data: vue.ref(null) }),
    useAsyncData: async (_key: string, fetch: () => Promise<unknown>) => ({
      data: vue.ref(await fetch()),
      error: vue.ref(null),
      pending: vue.ref(false),
      refresh: vi.fn(),
    }),
    onMounted: () => {},
    onBeforeMount: () => {},
    watch: () => {},
    useHead: (input: Parameters<typeof useHead>[0]) => scope.run(() => useHead(input, { head })),
    definePageMeta: () => {},
    defineOgImageComponent: () => {},
  }
  runInNewContext(outputText, context)
  const errors: unknown[] = []
  let setup: Promise<unknown>
  let unmount = () => {}
  if (mount) {
    const component = {
      ...context.exports.default,
      setup(props: unknown, setupContext: unknown) {
        setup = context.exports.default.setup(props, setupContext)
        return setup
      },
      render: () => null,
    }
    const app = renderer.createApp({
      render: () => vue.h(vue.Suspense, null, { default: () => vue.h(component) }),
    })
    app.config.errorHandler = error => errors.push(error)
    app.mount(createHostNode())
    mountedApps.push(app)
    unmount = () => {
      app.unmount()
      mountedApps.splice(mountedApps.indexOf(app), 1)
    }
  } else {
    setup = context.exports.default.setup({}, { expose: () => {} })
  }
  return { setup: setup!, route, head, errors, unmount }
}

describe('historical detail client metadata', () => {
  it.each([undefined, 'BILLETE'])(
    'initializes the canonical before client SEO getters run: %s',
    async type => {
      const { setup, head } = setupHistory(type)
      await expect(setup).resolves.toBeDefined()
      const tags = await head.resolveTags()
      const url = 'https://cambio-uruguay.com/historico/brou/usd'
      expect(tags.find(tag => tag.props.property === 'og:url')?.props.content).toBe(url)
      expect(tags.find(tag => tag.props.rel === 'canonical')?.props.href).toBe(url)
      const dataset = tags
        .filter(tag => tag.tag === 'script')
        .map(tag => JSON.parse(String(tag.innerHTML)))
        .find(item => item['@type'] === 'Dataset')
      expect(dataset.url).toBe(url)
    }
  )

  it('keeps SEO and structured URLs aligned after reactive route parameters change', async () => {
    const { setup, route, head } = setupHistory()
    await setup
    route.params.origin = 'itau'
    route.params.currency = 'eur'
    await vue.nextTick()
    const tags = await head.resolveTags()
    const url = 'https://cambio-uruguay.com/historico/itau/eur'
    expect(tags.find(tag => tag.props.property === 'og:url')?.props.content).toBe(url)
    expect(tags.find(tag => tag.props.rel === 'canonical')?.props.href).toBe(url)
  })

  it('preserves the same canonical and OG URL when the server resolves metadata after setup', async () => {
    const { setup, head } = setupHistory('BILLETE', true)
    await setup
    const tags = await head.resolveTags()
    const url = 'https://cambio-uruguay.com/historico/brou/usd'
    expect(tags.find(tag => tag.props.property === 'og:url')?.props.content).toBe(url)
    expect(tags.find(tag => tag.props.rel === 'canonical')?.props.href).toBe(url)
  })

  it('mounts and unmounts without cascading from SEO evaluation into head disposal errors', async () => {
    // P/N were Unhead's entry.dispose() after Q/O prevented the head entry from
    // being created. A setup-only check cannot exercise that second exception.
    const { setup, head, errors, unmount } = setupHistory('BILLETE', false, true)
    await setup
    await vue.nextTick()
    const tags = await head.resolveTags()
    expect(tags.find(tag => tag.props.property === 'og:url')?.props.content).toBe(
      'https://cambio-uruguay.com/historico/brou/usd'
    )
    unmount()
    await vue.nextTick()
    expect(errors).toEqual([])
    expect(await head.resolveTags()).toEqual([])
  })
})
