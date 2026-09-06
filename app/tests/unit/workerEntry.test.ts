import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'
import { describe, expect, it, vi } from 'vitest'
import {
  needsWorkerReadiness,
  warmWorkerBeforeReady,
  WORKER_READINESS_PATH,
} from '../../server/utils/workerReadiness'

// Transpile the actual entry, then replace its imported runtime bindings with
// mocks. This exercises asynchronous startup and listen ordering without a server.
const source = readFileSync(new URL('../../server/entry.ts', import.meta.url), 'utf8')
const code = transformSync(source, {
  loader: 'ts',
  format: 'esm',
  target: 'es2019',
  define: {
    'import.meta.dev': 'false',
    'import.meta._websocket': 'true',
    'import.meta._tasks': 'true',
  },
})
  .code.replace(/^import[\s\S]*?;\n/gm, '')
  .replace(/^export\s*\{[\s\S]*?\};?\n?/gm, '')

function runEntry(
  render: () => Promise<{ status: number; text(): Promise<string> }>,
  preflight = false
) {
  const listen = vi.fn()
  const send = vi.fn()
  const construct = vi.fn()
  const schedule = vi.fn()
  const graceful = vi.fn()
  const upgrade = vi.fn()
  class Server {
    constructor() {
      construct()
    }
    listen(options: unknown, callback: () => void) {
      listen(options)
      queueMicrotask(callback)
      return this
    }
    address() {
      return { family: 'IPv4', address: '127.0.0.1', port: 3311 }
    }
    on(event: string) {
      upgrade(event)
    }
  }
  const result = runInNewContext(`(async () => {${code}; await startup})()`, {
    HttpServer: Server,
    HttpsServer: Server,
    wsAdapter: () => ({ handleUpgrade: () => {} }),
    destr: Number,
    toNodeListener: () => () => {},
    useNitroApp: () => ({ h3App: {}, localFetch: render }),
    useRuntimeConfig: () => ({ app: { baseURL: '/' } }),
    setupGracefulShutdown: graceful,
    startScheduleRunner: schedule,
    trapUnhandledNodeErrors: () => {},
    needsWorkerReadiness,
    warmWorkerBeforeReady,
    WORKER_READINESS_PATH,
    process: {
      env: { pm_id: '0', NITRO_PORT: '3311', ...(preflight ? { CU_DEPLOY_PREFLIGHT: '1' } : {}) },
      pid: 123,
      send,
      exit: () => {
        throw new Error('exit')
      },
    },
    console: { log() {}, info() {}, error() {} },
  }) as Promise<void>
  return { result, listen, send, construct, schedule, graceful, upgrade }
}

describe('production worker entry', () => {
  it('does not create or listen on a socket until its own SSR completes', async () => {
    let finish!: (value: { status: number; text(): Promise<string> }) => void
    const render = vi.fn(
      () => new Promise<{ status: number; text(): Promise<string> }>(resolve => (finish = resolve))
    )
    const entry = runEntry(render)
    expect(render).toHaveBeenCalledWith('/acerca', expect.objectContaining({ redirect: 'manual' }))
    expect(entry.construct).not.toHaveBeenCalled()
    expect(entry.listen).not.toHaveBeenCalled()
    expect(entry.send).not.toHaveBeenCalled()
    finish({ status: 200, text: async () => '<h1>Sobre Cambio Uruguay</h1>' })
    await entry.result
    expect(entry.listen).toHaveBeenCalledOnce()
    expect(entry.send).toHaveBeenCalledWith('ready')
    expect(entry.graceful).toHaveBeenCalledOnce()
    expect(entry.upgrade).toHaveBeenCalledWith('upgrade')
    expect(entry.schedule).toHaveBeenCalledOnce()
  })

  it('never opens a socket or announces ready after failed SSR', async () => {
    const entry = runEntry(async () => ({ status: 500, text: async () => 'error' }))
    await expect(entry.result).rejects.toThrow('exit')
    expect(entry.construct).not.toHaveBeenCalled()
    expect(entry.listen).not.toHaveBeenCalled()
    expect(entry.send).not.toHaveBeenCalled()
  })

  it('does not start scheduled jobs in a deployment preflight', async () => {
    const entry = runEntry(
      async () => ({ status: 200, text: async () => '<h1>Cambio Uruguay</h1>' }),
      true
    )
    await entry.result
    expect(entry.send).toHaveBeenCalledWith('ready')
    expect(entry.schedule).not.toHaveBeenCalled()
  })
})
