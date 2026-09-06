import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  needsWorkerReadiness,
  warmWorkerBeforeReady,
  WORKER_READINESS_TIMEOUT_MS,
} from '../../server/utils/workerReadiness'

const html = '<!doctype html><main><h1>Sobre Cambio Uruguay: metodología y fuentes</h1></main>'
const response = (status = 200, body = html) => ({ status, text: async () => body })

afterEach(() => vi.useRealTimers())

describe('PM2 worker readiness', () => {
  it('requires explicit readiness and leaves time to fail before PM2 replaces the old worker', () => {
    const config = createRequire(import.meta.url)('../../ecosystem.config.cjs')
    const app = config.apps.find((entry: { name: string }) => entry.name === 'cambio-uruguay')
    expect(app.wait_ready).toBe(true)
    expect(app.listen_timeout).toBeGreaterThan(WORKER_READINESS_TIMEOUT_MS)
  })

  it('only runs for a production PM2 process with an IPC channel, including instance zero', () => {
    expect(needsWorkerReadiness(false, '0', true)).toBe(true)
    expect(needsWorkerReadiness(false, '143', true)).toBe(true)
    expect(needsWorkerReadiness(true, '143', true)).toBe(false)
    expect(needsWorkerReadiness(false, undefined, true)).toBe(false)
    expect(needsWorkerReadiness(false, '143', false)).toBe(false)
  })

  it('does not announce ready until the successful SSR body has finished', async () => {
    let finishBody!: (value: string) => void
    const ready = vi.fn()
    const result = warmWorkerBeforeReady(
      async () => ({ status: 200, text: () => new Promise(resolve => (finishBody = resolve)) }),
      ready
    )
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    finishBody(html)
    await result
    expect(ready).toHaveBeenCalledOnce()
  })

  it.each([301, 404, 500, 503])('rejects HTTP %i without announcing ready', async status => {
    const ready = vi.fn()
    await expect(warmWorkerBeforeReady(async () => response(status), ready)).rejects.toThrow(
      `HTTP ${status}`
    )
    expect(ready).not.toHaveBeenCalled()
  })

  it.each([
    '',
    '<html><body><div id="__nuxt"></div></body></html>',
    '<title>Cambio Uruguay</title><h1>Server error</h1>',
    '<script>const expected = "Cambio Uruguay"</script>',
  ])('rejects an empty shell or error page without announcing ready', async body => {
    const ready = vi.fn()
    await expect(warmWorkerBeforeReady(async () => response(200, body), ready)).rejects.toThrow(
      'expected page heading'
    )
    expect(ready).not.toHaveBeenCalled()
  })

  it('propagates rendering and body-read failures without announcing ready', async () => {
    const ready = vi.fn()
    await expect(
      warmWorkerBeforeReady(async () => {
        throw new Error('renderer import failed')
      }, ready)
    ).rejects.toThrow('renderer import failed')
    await expect(
      warmWorkerBeforeReady(
        async () => ({
          status: 200,
          text: async () => {
            throw new Error('body failed')
          },
        }),
        ready
      )
    ).rejects.toThrow('body failed')
    expect(ready).not.toHaveBeenCalled()
  })

  it('times out before PM2 and never announces ready if the response eventually arrives', async () => {
    vi.useFakeTimers()
    let finish!: (value: ReturnType<typeof response>) => void
    const ready = vi.fn()
    const result = warmWorkerBeforeReady(() => new Promise(resolve => (finish = resolve)), ready)
    const rejected = expect(result).rejects.toThrow('SSR warmup timed out')
    await vi.advanceTimersByTimeAsync(WORKER_READINESS_TIMEOUT_MS)
    await rejected
    finish(response())
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears the timeout after success', async () => {
    vi.useFakeTimers()
    await warmWorkerBeforeReady(async () => response(), vi.fn())
    expect(vi.getTimerCount()).toBe(0)
  })
})
