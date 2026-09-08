import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const repoRoot = resolve(__dirname, '../../..')
const helper = join(repoRoot, 'app/scripts/check-staging.cjs')
let fixtureRoot: string | undefined

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const port = (server.address() as AddressInfo).port
  await new Promise<void>((done, reject) => server.close(error => (error ? reject(error) : done())))
  return port
}

function fixture(
  mode:
    | 'ready'
    | 'error-before-ready'
    | 'exit-before-ready'
    | 'http500'
    | 'shell'
    | 'wait-before-ready'
) {
  fixtureRoot = mkdtempSync(join(repoRoot, '.sdd-staging-test-'))
  const serverDir = join(fixtureRoot, 'server')
  mkdirSync(serverDir)
  writeFileSync(
    join(serverDir, 'index.mjs'),
    `import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { getHeapStatistics } from 'node:v8'
writeFileSync(new URL('../child.pid', import.meta.url), String(process.pid))
writeFileSync(new URL('../runtime-mode', import.meta.url), process.env.NODE_ENV || 'unset')
writeFileSync(new URL('../heap-limit', import.meta.url), String(getHeapStatistics().heap_size_limit))
const mode = ${JSON.stringify(mode)}
// A broken probe must never leave this synthetic child alive for 120 seconds.
setTimeout(() => process.exit(90), 5000).unref()
if (mode === 'exit-before-ready') process.exit(23)
if (mode === 'error-before-ready') {
  process.send?.({ error: 'Synthetic warmup failure' })
  console.error('Synthetic warmup failure')
  process.exit(24)
}
const server = createServer((req, res) => {
  if (req.url !== '/acerca') {
    res.writeHead(404).end('Wrong probe request')
    return
  }
  if (mode === 'http500') {
    res.writeHead(500).end('<h1>Sobre Cambio Uruguay</h1>')
  } else if (mode === 'shell') {
    res.writeHead(200).end('<div id="__nuxt">Loading...</div>')
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' }).end('<h1>Sobre Cambio Uruguay</h1>')
  }
})
server.on('error', error => {
  console.error(error.code)
  process.exit(25)
})
server.listen(Number(process.env.NITRO_PORT), process.env.NITRO_HOST, () => {
  writeFileSync(new URL('../listening', import.meta.url), 'listening')
  if (mode !== 'wait-before-ready') process.send?.('ready')
})
`
  )
  return fixtureRoot
}

function probe(output: string, port: number, nodeEnv?: string) {
  const env = {
    ...process.env,
    DEPLOY_PROBE_PORT: String(port),
    NODE_OPTIONS: '--max-old-space-size=8192',
  }
  if (nodeEnv === undefined) delete env.NODE_ENV
  else env.NODE_ENV = nodeEnv
  const result = spawnSync(process.execPath, [helper, output], {
    env,
    cwd: repoRoot,
    timeout: 8_000,
    encoding: 'utf8',
  })
  expect(result.error, 'the probe must finish without its 120-second timeout').toBeUndefined()
  return result
}

async function expectChildStopped(output: string) {
  const pid = Number(readFileSync(join(output, 'child.pid'), 'utf8'))
  expect(pid).toBeGreaterThan(0)
  // Signal 0 only checks existence. The test does not kill any PID or port.
  await vi.waitFor(() => expect(() => process.kill(pid, 0)).toThrow(), { timeout: 1_500 })
}

afterEach(() => {
  if (!fixtureRoot) return
  const target = resolve(fixtureRoot)
  expect(dirname(target)).toBe(repoRoot)
  expect(basename(target)).toMatch(/^\.sdd-staging-test-/)
  rmSync(target, { recursive: true, force: true })
  fixtureRoot = undefined
})

describe('staging readiness before publication', () => {
  it.each([undefined, 'development', 'production'])(
    'checks the production runtime regardless of the deploy shell NODE_ENV: %s',
    async nodeEnv => {
      const output = fixture('ready')
      const result = probe(output, await freePort(), nodeEnv)
      expect(result.status, result.stderr).toBe(0)
      expect(readFileSync(join(output, 'runtime-mode'), 'utf8')).toBe('production')
      // V8 adds its young generation allowance to the configured 512 MiB old space.
      const heapMiB = Number(readFileSync(join(output, 'heap-limit'), 'utf8')) / 1024 ** 2
      expect(heapMiB).toBeGreaterThanOrEqual(512)
      expect(heapMiB).toBeLessThan(900)
      await expectChildStopped(output)
    }
  )

  it('accepts IPC readiness plus the expected SSR page and stops its child', async () => {
    const output = fixture('ready')
    const result = probe(output, await freePort())
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('Candidate rendered SSR before publication')
    await expectChildStopped(output)
  })

  it.each(['error-before-ready', 'exit-before-ready'] as const)(
    'rejects a child that fails before readiness: %s',
    async mode => {
      const output = fixture(mode)
      const result = probe(output, await freePort())
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('keeping the live output')
      await expectChildStopped(output)
    }
  )

  it.each(['http500', 'shell'] as const)(
    'rejects ready IPC when the HTTP response is not healthy SSR: %s',
    async mode => {
      const output = fixture(mode)
      const result = probe(output, await freePort())
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('unexpected content')
      expect(result.stderr).toContain(mode === 'http500' ? 'HTTP 500' : 'HTTP 200')
      await expectChildStopped(output)
    }
  )

  it('does not kill an unrelated process already serving the probe port', async () => {
    const sentinel = createServer((_request, response) => response.end('unrelated listener'))
    await new Promise<void>(done => sentinel.listen(0, '127.0.0.1', done))
    const port = (sentinel.address() as AddressInfo).port
    try {
      const output = fixture('ready')
      const result = probe(output, port)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('EADDRINUSE')
      await expectChildStopped(output)
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(1_500),
      })
      expect(await response.text()).toBe('unrelated listener')
    } finally {
      sentinel.closeAllConnections()
      await new Promise<void>((done, reject) =>
        sentinel.close(error => (error ? reject(error) : done()))
      )
    }
  })
})

// Windows child.kill() terminates a process instead of delivering these POSIX
// signals to JS handlers. The Linux deployment/CI is the relevant environment.
describe.skipIf(process.platform === 'win32')('cancelling the staging probe on POSIX', () => {
  it.each([
    ['SIGTERM', 143],
    ['SIGINT', 130],
  ] as const)(
    'forwards %s only to its child and exits with %i',
    async (signal, expectedCode) => {
      const output = fixture('wait-before-ready')
      const port = await freePort()
      const probeProcess = spawn(process.execPath, [helper, output], {
        env: { ...process.env, DEPLOY_PROBE_PORT: String(port) },
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stderr = ''
      probeProcess.stderr.on('data', data => {
        stderr += String(data)
      })
      probeProcess.stdout.resume()
      const finished = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
        (done, reject) => {
          probeProcess.once('error', reject)
          probeProcess.once('exit', (code, exitSignal) => done({ code, signal: exitSignal }))
        }
      )

      try {
        // The child owns the port but has deliberately withheld IPC readiness.
        await vi.waitFor(() => expect(existsSync(join(output, 'listening'))).toBe(true), {
          timeout: 2_000,
        })
        expect(probeProcess.kill(signal)).toBe(true)
        const exit = await finished
        expect(exit.code, stderr).toBe(expectedCode)
        expect(exit.signal).toBeNull()
        await expectChildStopped(output)

        const replacement = createServer()
        await new Promise<void>((done, reject) => {
          replacement.once('error', reject)
          replacement.listen(port, '127.0.0.1', done)
        })
        await new Promise<void>((done, reject) =>
          replacement.close(error => (error ? reject(error) : done()))
        )
      } finally {
        if (probeProcess.exitCode === null && probeProcess.signalCode === null) {
          probeProcess.kill('SIGKILL')
        }
        // A failed assertion must not strand even the bounded fixture. The
        // synthetic child self-terminates at 5s if forwarding is broken.
        if (existsSync(join(output, 'child.pid'))) {
          const pid = Number(readFileSync(join(output, 'child.pid'), 'utf8'))
          await vi.waitFor(() => expect(() => process.kill(pid, 0)).toThrow(), { timeout: 6_000 })
        }
      }
    },
    12_000
  )
})
