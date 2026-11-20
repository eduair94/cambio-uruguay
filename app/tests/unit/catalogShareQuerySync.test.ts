import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { effectScope, reactive } from 'vue'
import { useCatalogShareQuery } from '../../composables/useCatalogShareQuery'

const lifecycle = vi.hoisted(() => ({
  mounted: [] as Array<() => void>,
  unmount: [] as Array<() => void>,
}))
vi.mock('vue', async importOriginal => ({
  ...(await importOriginal<typeof import('vue')>()),
  onMounted: (fn: () => void) => lifecycle.mounted.push(fn),
  onBeforeUnmount: (fn: () => void) => lifecycle.unmount.push(fn),
}))

let scope: ReturnType<typeof effectScope>
let route: { path: string; query: Record<string, string> }
let browser: any
beforeEach(() => {
  lifecycle.mounted.length = 0
  lifecycle.unmount.length = 0
  route = reactive({ path: '/celulares-uruguay', query: { marca: 'lg' } })
  const events = new EventTarget()
  browser = {
    location: new URL(
      'https://cambio-uruguay.com/celulares-uruguay?marca=lg&utm_source=friend#modelos'
    ),
    history: {
      state: { current: '/celulares-uruguay?marca=lg', position: 4 },
      replaceState: vi.fn((state, _unused, path) => {
        browser.history.state = state
        browser.location = new URL(path, 'https://cambio-uruguay.com')
      }),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  }
  vi.stubGlobal('window', browser)
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useSeoMeta', vi.fn())
  scope = effectScope()
})
afterEach(() => {
  lifecycle.unmount.forEach(fn => fn())
  scope.stop()
  vi.unstubAllGlobals()
})

it('writes choices immediately without navigation and restores browser/router history', () => {
  const state = reactive({ marca: 'lg' })
  scope.run(() =>
    useCatalogShareQuery(
      ['marca'],
      () => ({ marca: state.marca }),
      query => {
        state.marca = typeof query.marca === 'string' ? query.marca : ''
      }
    )
  )
  lifecycle.mounted.forEach(fn => fn())
  state.marca = 'samsung'
  expect(browser.location.search).toBe('?utm_source=friend&marca=samsung')
  expect(browser.location.hash).toBe('#modelos')
  expect(browser.history.state).toMatchObject({
    position: 4,
    current: '/celulares-uruguay?utm_source=friend&marca=samsung#modelos',
  })

  const writes = browser.history.replaceState.mock.calls.length
  browser.location = new URL('https://cambio-uruguay.com/celulares-uruguay?marca=motorola')
  browser.dispatchEvent(new Event('popstate'))
  expect(state.marca).toBe('motorola')
  expect(browser.history.replaceState).toHaveBeenCalledTimes(writes)
  route.query = { marca: 'apple' }
  expect(state.marca).toBe('apple')
  expect(browser.history.replaceState).toHaveBeenCalledTimes(writes)
})

it('does not rewrite a different page while navigation is unmounting the catalog', () => {
  const state = reactive({ marca: 'lg' })
  scope.run(() =>
    useCatalogShareQuery(
      ['marca'],
      () => ({ marca: state.marca }),
      () => {}
    )
  )
  browser.location = new URL('https://cambio-uruguay.com/comparar')
  state.marca = 'apple'
  expect(browser.history.replaceState).not.toHaveBeenCalled()
})
