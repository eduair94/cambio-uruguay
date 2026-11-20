import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { replaceQueryInPlace } from '../../utils/historyQuery'

// The converter of the home writes its form into the URL on every tap. It did it with
// `router.push({ query })`: one history entry per amount tried and every RouterLink of the page
// recomputed. `replaceQueryInPlace` writes the same URL in place, like usePreciosQuerySync.

let browser: any
beforeEach(() => {
  browser = {
    location: new URL('https://cambio-uruguay.com/?from=USD&to=UYU&amount=100#convertir'),
    history: {
      length: 2,
      state: { current: '/?from=USD&to=UYU&amount=100#convertir', position: 1, back: null },
      replaceState: vi.fn((state, _unused, path) => {
        browser.history.state = state
        browser.location = new URL(path, 'https://cambio-uruguay.com')
      }),
      pushState: vi.fn(),
    },
  }
  vi.stubGlobal('window', browser)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('replaceQueryInPlace', () => {
  it('drops undefined keys and replaces the whole query, keeping path and hash', () => {
    const wrote = replaceQueryInPlace({
      from: 'USD',
      to: 'UYU',
      amount: '500',
      dir: undefined,
      house: undefined,
      canal: 'online',
      dep: undefined,
    })
    expect(wrote).toBe(true)
    expect(browser.history.replaceState).toHaveBeenCalledTimes(1)
    expect(browser.location.pathname).toBe('/')
    expect(browser.location.search).toBe('?from=USD&to=UYU&amount=500&canal=online')
    expect(browser.location.hash).toBe('#convertir')
    expect(browser.location.search).not.toContain('undefined')
    expect(browser.location.search).not.toMatch(/dir=|house=|dep=/)
  })

  it('updates history.state.current and keeps the rest of the router state', () => {
    replaceQueryInPlace({ from: 'EUR', to: 'UYU', amount: '100' })
    expect(browser.history.state).toEqual({
      current: '/?from=EUR&to=UYU&amount=100#convertir',
      position: 1,
      back: null,
    })
  })

  it('does nothing when the URL would not change', () => {
    const wrote = replaceQueryInPlace({ from: 'USD', to: 'UYU', amount: '100', dir: undefined })
    expect(wrote).toBe(false)
    expect(browser.history.replaceState).not.toHaveBeenCalled()
  })

  it('never adds a history entry', () => {
    for (const amount of ['500', '1000', '5000']) replaceQueryInPlace({ amount })
    expect(browser.history.pushState).not.toHaveBeenCalled()
    expect(browser.history.length).toBe(2)
    expect(browser.history.replaceState).toHaveBeenCalledTimes(3)
  })

  it('keeps a locale prefix and encodes a department name', () => {
    browser.location = new URL('https://cambio-uruguay.com/en')
    browser.history.state = { current: '/en' }
    replaceQueryInPlace({ dep: 'SAN JOSÉ' })
    expect(browser.location.pathname).toBe('/en')
    expect(new URLSearchParams(browser.location.search).get('dep')).toBe('SAN JOSÉ')
  })

  it('an empty query leaves the bare path', () => {
    replaceQueryInPlace({ dir: undefined })
    expect(browser.location.href).toBe('https://cambio-uruguay.com/#convertir')
  })

  it('a non-object history state is passed through as is', () => {
    browser.history.state = null
    replaceQueryInPlace({ amount: '7' })
    expect(browser.history.replaceState).toHaveBeenCalledWith(null, '', '/?amount=7#convertir')
  })

  it('on the server it does nothing', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('window', undefined)
    expect(replaceQueryInPlace({ amount: '1' })).toBe(false)
  })
})
