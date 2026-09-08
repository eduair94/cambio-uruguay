// Boot the exact candidate before replacing any live files. A failed warmup,
// occupied probe port, or bad response fails this deploy while production stays put.
const { fork } = require('node:child_process')
const { resolve } = require('node:path')

const staging = process.argv[2]
if (!staging) throw new Error('Staging output directory required')
const port = process.env.DEPLOY_PROBE_PORT || '13311'
const child = fork(resolve(staging, 'server/index.mjs'), [], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    pm_id: 'deploy-preflight',
    CU_DEPLOY_PREFLIGHT: '1',
    NITRO_PORT: port,
    PORT: port,
    NITRO_HOST: '127.0.0.1',
    NITRO_UNIX_SOCKET: '',
  },
  // Match the live worker's heap budget, not the build shell's larger allowance.
  execArgv: ['--max-old-space-size=512'],
  stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
})

let stopping = false
function stopChild() {
  if (stopping) return
  stopping = true
  // Forward cancellation to this exact child, never to a process found by port.
  child.kill('SIGTERM')
  const force = setTimeout(() => child.kill('SIGKILL'), 35_000)
  force.unref()
  child.once('exit', () => clearTimeout(force))
}
for (const [signal, code] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
  ['SIGHUP', 129],
]) {
  process.once(signal, () => {
    process.exitCode = code
    stopChild()
  })
}

async function check() {
  let timer
  try {
    await new Promise((done, reject) => {
      timer = setTimeout(
        () => reject(new Error('Staging SSR did not become ready in 120s')),
        120_000
      )
      child.once('error', reject)
      child.once('exit', code =>
        reject(new Error(`Staging server exited before readiness (${code})`))
      )
      child.on('message', message => {
        if (message === 'ready') done()
      })
    })
    const response = await fetch(`http://127.0.0.1:${port}/acerca`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Host: 'cambio-uruguay.com' },
      redirect: 'manual',
    })
    const html = await response.text()
    if (response.status !== 200 || !/<h1\b[^>]*>[^<]*Sobre Cambio Uruguay/.test(html)) {
      throw new Error(`Staging SSR probe returned unexpected content (HTTP ${response.status})`)
    }
    console.log('[deploy] Candidate rendered SSR before publication.')
  } finally {
    clearTimeout(timer)
    stopChild()
  }
}

check().catch(error => {
  console.error(`[deploy] ${error.message}; keeping the live output.`)
  process.exitCode ||= 1
})
