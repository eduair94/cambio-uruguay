// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { createMemoryHistory, createRouter, type RouteLocationRaw } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as movingServices from '../../utils/movingServices'
import { movingServicesCopy } from '../../utils/movingServicesCopy'

const filename = resolve(__dirname, '../../pages/fletes-mudanzas-uruguay.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const { outputText } = ts.transpileModule(
  compileScript(descriptor, { id: 'moving-directory-navigation' }).content,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
)
const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
  vi.useRealTimers()
})

interface Target {
  path: string
  query: movingServices.MovingRouteQuery
  hash: string
}
interface PendingNavigation {
  target: Target
  resolve: (failure?: unknown) => void
}

function mountDirectory(initialQuery = '') {
  vi.useFakeTimers()
  const resolver = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: movingServices.MOVING_PATH, component: { render: () => null } }],
  })
  const initial = {
    path: movingServices.MOVING_PATH,
    query: {
      servicio: 'moving',
      precios: '1',
      q: initialQuery,
      campaign: 'keep',
    },
    hash: '',
  }
  const route = vue.reactive({ ...initial, fullPath: resolver.resolve(initial).fullPath })
  const pending: PendingNavigation[] = []
  const navigate = (target: Target) => new Promise(resolve => pending.push({ target, resolve }))
  const router = {
    resolve: (target: RouteLocationRaw) => resolver.resolve(target),
    push: vi.fn(navigate),
    replace: vi.fn(navigate),
  }
  const context = {
    ...vue,
    exports: {} as { default?: vue.Component },
    require(name: string) {
      if (name === 'vue') return vue
      if (name === '~/utils/movingServices') return movingServices
      if (name === '~/utils/movingServicesCopy') return { movingServicesCopy }
      if (name === '~/components/moving/ProviderRow.vue') return { default: { render: () => null } }
      throw new Error(`Unexpected import: ${name}`)
    },
    setTimeout,
    clearTimeout,
    useI18n: () => ({ locale: vue.ref('es') }),
    useRoute: () => route,
    useRouter: () => router,
    useLocalePath: () => (path: string) => path,
    useState: (_key: string, initialize: () => unknown) => vue.ref(initialize()),
    defineOgImageComponent: () => {},
    useSeoMeta: () => {},
    useHead: () => {},
  }
  // Exercise the actual page script and Vue watchers. Router completion and Nuxt's
  // delayed useRoute acknowledgement are separate operations under test control.
  runInNewContext(outputText, context)
  const app = vue.createApp({ ...context.exports.default, render: () => null })
  const container = document.createElement('div')
  document.body.append(container)
  app.mount(container)
  apps.push(app)
  const state = app._instance!.setupState as {
    query: string
    reset: () => Promise<unknown>
    filtered: movingServices.MovingProvider[]
  }
  async function commit(target: Target) {
    Object.assign(route, target, { fullPath: resolver.resolve(target).fullPath })
    await vue.nextTick()
  }
  return { state, route, router, pending, commit }
}

describe('moving directory pending navigation', () => {
  it.each(['', 'Furniture'])(
    'keeps a newer draft across reset, including retyping previous q=%j',
    async initialQuery => {
      const { state, route, router, pending, commit } = mountDirectory(initialQuery)
      const resetting = state.reset()
      state.query = 'Furniture'
      await vue.nextTick()
      await vi.advanceTimersByTimeAsync(350)
      expect(pending).toHaveLength(1)
      expect(router.replace).not.toHaveBeenCalled()

      pending[0].resolve()
      await resetting
      await vi.advanceTimersByTimeAsync(350)
      // A resolved push does not yet mean Nuxt has exposed the new filter state.
      expect(route.query.servicio).toBe('moving')
      expect(pending).toHaveLength(1)
      await commit(pending[0].target)
      expect(state.query).toBe('Furniture')
      expect(state.filtered).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(301)
      expect(router.replace).toHaveBeenCalledTimes(1)
      expect(pending[1].target.query).toEqual({ campaign: 'keep', q: 'Furniture' })
      pending[1].resolve()
      await commit(pending[1].target)
      expect(state.query).toBe('Furniture')
    }
  )

  it('lets back and forward discard a draft even when the committed q stays the same', async () => {
    const { state, pending, commit } = mountDirectory('Furniture')
    const back = {
      path: movingServices.MOVING_PATH,
      query: { servicio: 'assembly', departamento: 'Canelones', q: 'Furniture', campaign: 'keep' },
      hash: '',
    }
    state.query = 'pendiente'
    await vue.nextTick()
    await commit(back)
    expect(state.query).toBe('Furniture')
    await vi.advanceTimersByTimeAsync(450)
    expect(pending).toHaveLength(0)

    state.query = 'otro pendiente'
    await vue.nextTick()
    await commit({ ...back, query: { ...back.query, departamento: 'Montevideo' } })
    expect(state.query).toBe('Furniture')
    await vi.advanceTimersByTimeAsync(450)
    expect(pending).toHaveLength(0)
  })

  it('releases a failed navigation so a newer draft can still reach the URL', async () => {
    const { state, pending, router } = mountDirectory()
    const resetting = state.reset()
    state.query = 'Furniture'
    await vue.nextTick()
    pending[0].resolve({ type: 4 })
    await resetting
    await vi.advanceTimersByTimeAsync(301)
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(pending[1].target.query.q).toBe('Furniture')
    pending[1].resolve()
  })

  it('does not keep retrying a rejected text replacement without a later edit', async () => {
    const { state, pending, router } = mountDirectory()
    state.query = 'Furniture'
    await vi.advanceTimersByTimeAsync(301)
    expect(router.replace).toHaveBeenCalledTimes(1)
    pending[0].resolve({ type: 4 })
    await vi.advanceTimersByTimeAsync(1200)
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(state.query).toBe('Furniture')
  })

  it('recognizes later edits that return to the dispatched text before rejection', async () => {
    const { state, pending, router } = mountDirectory()
    state.query = 'Furniture'
    await vi.advanceTimersByTimeAsync(301)
    state.query = 'otro texto'
    state.query = 'Furniture'
    pending[0].resolve({ type: 4 })
    await vi.advanceTimersByTimeAsync(301)
    expect(router.replace).toHaveBeenCalledTimes(2)
    expect(pending[1].target.query.q).toBe('Furniture')
    pending[1].resolve({ type: 4 })
    await vi.advanceTimersByTimeAsync(1200)
    expect(router.replace).toHaveBeenCalledTimes(2)
  })
})
