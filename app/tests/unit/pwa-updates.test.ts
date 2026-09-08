import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
  vi.stubGlobal('navigator', { onLine: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function startPlugin() {
  const { default: plugin } = await import('../../plugins/pwa-updates.client')
  const hooks = new Map<
    string,
    (data: { url: string; registration?: ServiceWorkerRegistration }) => void
  >()
  let dispose = () => {}
  plugin.setup({
    hook: (name: string, fn: (data: never) => void) => {
      hooks.set(name, fn as never)
      return () => hooks.delete(name)
    },
    vueApp: { onUnmount: (fn: () => void) => (dispose = fn) },
  } as never)
  const registration = { installing: null, update: vi.fn().mockResolvedValue(undefined) }
  const activate = () =>
    hooks.get('service-worker:activated')?.({
      url: '/sw.js',
      registration: registration as unknown as ServiceWorkerRegistration,
    })
  return { registration, activate, dispose }
}

describe('PWA update polling', () => {
  it('recovers from a rejected fetch without an unhandled rejection', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetch)
    const { activate, registration } = await startPlugin()
    activate()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(registration.update).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenLastCalledWith('/sw.js', {
      cache: 'no-store',
      headers: { cache: 'no-store', 'cache-control': 'no-cache' },
    })
  })

  it('recovers when the registration update itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))
    const { activate, registration } = await startPlugin()
    registration.update.mockRejectedValueOnce(new TypeError('Failed to update'))
    activate()
    await vi.advanceTimersByTimeAsync(40_000)
    expect(registration.update).toHaveBeenCalledTimes(2)
  })

  it('skips offline browsers even without navigator.connection and resumes online', async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('navigator', { onLine: false })
    const { activate, registration } = await startPlugin()
    activate()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetch).not.toHaveBeenCalled()
    vi.stubGlobal('navigator', { onLine: true })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(registration.update).toHaveBeenCalledTimes(1)
  })

  it('does not update from a failed worker response or overlap slow checks', async () => {
    let respond!: (response: { status: number }) => void
    const fetch = vi.fn(() => new Promise(resolve => (respond = resolve)))
    vi.stubGlobal('fetch', fetch)
    const { activate, registration } = await startPlugin()
    activate()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    respond({ status: 503 })
    await vi.advanceTimersByTimeAsync(0)
    expect(registration.update).not.toHaveBeenCalled()
  })

  it('keeps a single timer and removes it and its hook on unmount', async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetch)
    const { activate, dispose } = await startPlugin()
    expect(vi.getTimerCount()).toBe(0)
    activate()
    activate()
    expect(vi.getTimerCount()).toBe(1)
    dispose()
    activate()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetch).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('disables the module timer so its unhandled fetch cannot run alongside ours', async () => {
    vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
    const { default: config } = await import('../../nuxt.config')
    const pwa = config.modules.find(
      module => Array.isArray(module) && module[0] === '@vite-pwa/nuxt'
    ) as unknown as [string, { client: { periodicSyncForUpdates: number } }]
    expect(pwa[1].client.periodicSyncForUpdates).toBe(0)
  })
})
