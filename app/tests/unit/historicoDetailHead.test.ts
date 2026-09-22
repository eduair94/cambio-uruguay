import * as bcuHistory from '../../utils/bcuHistory'
import * as format from '../../utils/format'
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

interface RecentChangeFixture {
  origin: string
  code: string
  type: string
  previousBuy: number
  previousSell: number
  buy: number
  sell: number
  buyChanged: boolean
  sellChanged: boolean
  observedAt: string
}

function setupHistory(
  type?: string,
  server = false,
  mount = false,
  options: {
    origin?: string
    currency?: string
    evolution?: answer.EvolutionRow[]
    /** What `/api/rate-changes-recent` answers; the query it received is recorded in `fetchCalls`. */
    changes?: RecentChangeFixture[]
  } = {}
) {
  const fetchCalls: Array<{ url: string; options: Record<string, unknown> }> = []
  const route = vue.reactive({
    params: { origin: options.origin ?? 'brou', currency: options.currency ?? 'usd', type },
    query: {},
  })
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
    '~/utils/bcuHistory': bcuHistory,
  }
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name in imports) return imports[name]
      throw new Error(`Unexpected import: ${name}`)
    },
    useI18n: () => ({ t: (key: string) => key, locale: vue.ref('es') }),
    // Mirrors @nuxtjs/i18n `prefix_except_default`: the default locale keeps
    // the bare path, the others get their prefix — so the alternates the page
    // re-points on a folded variant can be asserted per locale.
    useLocalePath: () => (path: string, code?: string) =>
      code && code !== 'es' ? `/${code}${path}` : path,
    useApiService: () => ({
      getEvolutionData: async () => ({
        data: {
          evolution: options.evolution ?? [],
          localData: { name: options.origin === 'bcu' ? 'Banco Central del Uruguay' : 'BROU' },
          statistics: {
            buy: { current: 99, avg: 99, min: 99, max: 99, change: 0 },
            sell: { current: 99, avg: 99, min: 99, max: 99, change: 0 },
            dateRange: {
              start: '2026-03-14T03:00:00.000Z',
              end: '2026-09-14T03:00:00.000Z',
              periodMonths: 6,
            },
          },
        },
      }),
    }),
    useLoading: () => ({ withLoading: (fn: () => unknown) => fn() }),
    useAIInsights: () => ({
      loading: vue.ref(false),
      error: vue.ref(null),
      insight: vue.ref(null),
    }),
    useFetch: async (url: string, fetchOptions: Record<string, unknown> = {}) => {
      fetchCalls.push({ url, options: fetchOptions })
      if (url === '/api/rate-changes-recent') {
        // `immediate: false` (the BCU page) leaves the default in place, like Nuxt does.
        const fallback = (fetchOptions.default as (() => unknown) | undefined)?.() ?? {
          asOf: '',
          changes: [],
        }
        return {
          data: vue.ref(
            fetchOptions.immediate === false
              ? fallback
              : { asOf: '2026-09-22T12:00:00.000Z', changes: options.changes ?? [] }
          ),
        }
      }
      return { data: vue.ref({ items: [] }) }
    },
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
    // Auto-imported by Nuxt (no explicit `import` in the page, same as onMounted/
    // watch above), so it has to be exposed as a bare context global rather than
    // routed through the require() map like the explicitly-imported neighbours
    // below. Reuses the real implementation instead of re-deriving the mapping.
    dateLocale: format.dateLocale,
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
  return { setup: setup!, route, head, errors, unmount, fetchCalls }
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

const bcuRow = (day: string, type = 'BILLETE', buy = 40.2, sell = buy): answer.EvolutionRow => ({
  date: `${day}T03:00:00.000Z`,
  type,
  buy,
  sell,
})

describe('BCU reference presentation in the compiled page', () => {
  it('charts the preferred type, keeps all table types, and dates the last observation instead of the request', async () => {
    const rows = [bcuRow('2026-09-10'), bcuRow('2026-09-11'), bcuRow('2026-09-11', 'CABLE', 41, 42)]
    const { setup, head } = setupHistory(undefined, false, false, {
      origin: 'bcu',
      evolution: rows,
    })
    const page = (await setup) as any
    expect(page.answerFacts.value).toMatchObject({ buy: 40.2, sell: 40.2, asOf: rows[1].date })
    expect(page.bcuRows.value).toEqual(rows.slice(0, 2))
    expect(page.bcuType.value).toBe('BILLETE')
    expect(page.chartData.value.datasets).toHaveLength(1)
    expect(page.chartData.value.datasets[0].data).toEqual([40.2, 40.2])
    expect(page.tableData.value).toHaveLength(3)
    expect(page.headers.value.map((header: { key: string }) => header.key)).toEqual([
      'date',
      'reference',
      'type',
      'name',
    ])
    expect(page.answerSentence.value).not.toMatch(/hoy|no publicó|compra|venta/)
    expect(page.bcuScope.value).toContain('10/09/2026')
    expect(page.bcuScope.value).toContain('11/09/2026')
    page.selectedPeriod.value = 24 // the old payload remains until refresh resolves
    expect(page.bcuScope.value).toContain('10/09/2026')
    expect(page.bcuScope.value).not.toContain('24')
    const tags = await head.resolveTags()
    expect(tags.find(tag => tag.tag === 'title')?.textContent).toBe(
      'BCU Dólar: referencia e histórico'
    )
    expect(tags.find(tag => tag.props.name === 'description')?.props.content).toContain(
      '11/09/2026'
    )
    expect(tags.find(tag => tag.props.rel === 'canonical')?.props.href).toBe(
      'https://cambio-uruguay.com/historico/bcu/usd'
    )
    const dataset = tags
      .filter(tag => tag.tag === 'script')
      .map(tag => JSON.parse(String(tag.innerHTML)))
      .find(item => item['@type'] === 'Dataset')
    expect(dataset.variableMeasured.map((value: { name: string }) => value.name)).toEqual([
      'TCC',
      'TCV',
    ])
  })

  it('does not hide an earlier unequal pair when the latest reference is equal', async () => {
    const rows = [bcuRow('2026-09-10', 'BILLETE', 40.2001, 40.2002), bcuRow('2026-09-11')]
    const { setup } = setupHistory('billete', false, false, { origin: 'bcu', evolution: rows })
    const page = (await setup) as any
    expect(
      page.chartData.value.datasets.map((dataset: { label: string }) => dataset.label)
    ).toEqual(['TCC', 'TCV'])
    expect(page.chartData.value.datasets[0].data[0]).toBe(40.2001)
    expect(page.chartData.value.datasets[1].data[0]).toBe(40.2002)
    expect(page.periodRecords.value).toBeNull()
  })

  it('does not substitute aggregate statistics when an explicit BCU type has no observations', async () => {
    const { setup, head } = setupHistory('cable', true, false, {
      origin: 'bcu',
      evolution: [bcuRow('2026-09-11')],
    })
    const page = (await setup) as any
    expect(page.answerFacts.value).toBeNull()
    expect(page.bcuRows.value).toEqual([])
    expect(page.chartData.value.labels).toEqual([])
    expect(page.bcuExplanation.value).not.toContain('BEVSA')
    const tags = await head.resolveTags()
    expect(tags.find(tag => tag.props.name === 'description')?.props.content).not.toMatch(
      /99|14\/09|Última/
    )
  })

  it('keeps the existing retail chart with both prices and all payload rows', async () => {
    const rows = [bcuRow('2026-09-10', '', 39, 41), bcuRow('2026-09-11', 'EBROU', 40, 42)]
    const { setup } = setupHistory(undefined, false, false, { evolution: rows })
    const page = (await setup) as any
    expect(
      page.chartData.value.datasets.map((dataset: { label: string }) => dataset.label)
    ).toEqual(['precioCompra', 'precioVenta'])
    expect(page.chartData.value.datasets[0].data).toEqual([39, 40])
  })
})

// Medido en producción el 2026-09-22 sobre /historico/brou/usd/ebrou: canónica al
// padre y siete `rel=alternate hreflang` (x-default incluido) hacia la variante
// misma. La página no puede borrarlos (unhead los deduplica por `id`), así que los
// re-apunta al grupo del padre con los mismos ids que emite el layout.
describe('una variante plegada re-apunta el hreflang al grupo del padre', () => {
  const byId = (tags: Array<{ tag: string; props: Record<string, unknown> }>) =>
    Object.fromEntries(
      tags
        .filter(tag => tag.tag === 'link' && tag.props.rel === 'alternate')
        .map(tag => [tag.props.id, [tag.props.hreflang, tag.props.href]])
    )

  it('emite los siete enlaces del layout con las URLs del padre, por idioma', async () => {
    const { setup, head } = setupHistory('ebrou', true)
    await setup
    const tags = await head.resolveTags()
    expect(byId(tags)).toEqual({
      'i18n-xd': ['x-default', 'https://cambio-uruguay.com/historico/brou/usd'],
      'i18n-alt-es': ['es', 'https://cambio-uruguay.com/historico/brou/usd'],
      'i18n-alt-es-ES': ['es-ES', 'https://cambio-uruguay.com/historico/brou/usd'],
      'i18n-alt-en': ['en', 'https://cambio-uruguay.com/en/historico/brou/usd'],
      'i18n-alt-en-US': ['en-US', 'https://cambio-uruguay.com/en/historico/brou/usd'],
      'i18n-alt-pt': ['pt', 'https://cambio-uruguay.com/pt/historico/brou/usd'],
      'i18n-alt-pt-PT': ['pt-PT', 'https://cambio-uruguay.com/pt/historico/brou/usd'],
    })
    // El defecto exacto: ninguno vuelve a la variante.
    for (const [, href] of Object.values(byId(tags))) expect(href).not.toContain('ebrou')
    expect(tags.find(tag => tag.props.rel === 'canonical')?.props.href).toBe(
      'https://cambio-uruguay.com/historico/brou/usd'
    )
  })

  it('la página base no toca los alternates: los deja al layout', async () => {
    const { setup, head } = setupHistory(undefined, true)
    await setup
    expect(byId(await head.resolveTags())).toEqual({})
  })

  it('la canónica ya no imprime `hid` como atributo', async () => {
    const { setup, head } = setupHistory('billete', true)
    await setup
    const canonical = (await head.resolveTags()).find(tag => tag.props.rel === 'canonical')
    expect(canonical?.props.hid).toBeUndefined()
    expect(canonical?.props.href).toBe('https://cambio-uruguay.com/historico/brou/usd')
  })
})

describe('últimos cambios de esta casa en esta moneda', () => {
  const change = (
    observedAt: string,
    over: Partial<RecentChangeFixture> = {}
  ): RecentChangeFixture => ({
    origin: 'brou',
    code: 'USD',
    type: '',
    previousBuy: 39.1,
    previousSell: 40.5,
    buy: 39.35,
    sell: 40.75,
    buyChanged: true,
    sellChanged: true,
    observedAt,
    ...over,
  })
  const recentCall = (calls: Array<{ url: string; options: Record<string, unknown> }>) =>
    calls.find(call => call.url === '/api/rate-changes-recent')

  it('pide al proxy cacheado por casa y moneda, y el tipo sólo cuando la URL trae uno', async () => {
    const variant = setupHistory('ebrou')
    await variant.setup
    expect(recentCall(variant.fetchCalls)?.options.query).toEqual({
      origin: 'brou',
      code: 'USD',
      type: 'EBROU',
      limit: 8,
    })
    const base = setupHistory()
    await base.setup
    expect(recentCall(base.fetchCalls)?.options.query).toEqual({
      origin: 'brou',
      code: 'USD',
      type: undefined,
      limit: 8,
    })
  })

  it('formatea cada fila en el idioma de la página, con fecha de Montevideo, y corta en 8', async () => {
    const changes = Array.from({ length: 10 }, (_, i) =>
      change(`2026-09-${String(22 - i).padStart(2, '0')}T15:00:00.000Z`, {
        buyChanged: i % 2 === 0,
        type: i === 1 ? 'EBROU' : '',
      })
    )
    const { setup } = setupHistory(undefined, false, false, { changes })
    const page = (await setup) as any
    expect(page.recentChangeRows.value).toHaveLength(8)
    expect(page.recentChangeRows.value[0]).toMatchObject({
      day: '22/09/2026',
      type: '',
      buyChanged: true,
      sellChanged: true,
      previousBuy: '39,10',
      buy: '39,35',
      previousSell: '40,50',
      sell: '40,75',
    })
    expect(page.recentChangeRows.value[1]).toMatchObject({ day: '21/09/2026', type: 'EBROU' })
  })

  it('sin datos no hay filas, y la página del BCU ni siquiera consulta', async () => {
    const empty = setupHistory(undefined, false, false, { changes: [] })
    expect(((await empty.setup) as any).recentChangeRows.value).toEqual([])
    const bcu = setupHistory(undefined, false, false, {
      origin: 'bcu',
      changes: [change('2026-09-22T15:00:00.000Z')],
    })
    const page = (await bcu.setup) as any
    expect(recentCall(bcu.fetchCalls)?.options.immediate).toBe(false)
    expect(page.recentChangeRows.value).toEqual([])
  })
})
