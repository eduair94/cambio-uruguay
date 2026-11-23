import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

// deploy.sh saltea el `nuxt build` (~12 min, heap de 12 GB) cuando la huella de lo que compila
// coincide con la que guardó el build vivo en `.output`. Lo que este test vigila es que el salto
// sólo pase cuando TODO coincide: cualquier duda tiene que terminar compilando (lento, nunca viejo).
const repoRoot = resolve(__dirname, '../../..')
const script = readFileSync(resolve(repoRoot, 'app/scripts/deploy.sh'), 'utf8')
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
let fixtureRoot: string | undefined

function shellPath(path: string): string {
  return process.platform === 'win32'
    ? path
        .replace(/\\/g, '/')
        .replace(/^([A-Z]):/i, (_, drive: string) => `/${drive.toLowerCase()}`)
    : path
}

// The decision block, exactly as deploy.sh runs it, with the helpers it relies on stubbed.
function decisionBlock(): string {
  const start = script.indexOf('BUILD_STAMP=".build-fingerprint"')
  const end = script.indexOf('timed "Clear staging and generated build files"')
  expect(start, 'deploy.sh perdió el bloque de la huella').toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return script.slice(start, end)
}

function fixture() {
  fixtureRoot = mkdtempSync(join(repoRoot, '.sdd-test-build-fingerprint-'))
  const appDir = join(fixtureRoot, 'app')
  mkdirSync(join(appDir, '.output', 'server'), { recursive: true })
  const runner = join(fixtureRoot, 'decide.sh')
  writeFileSync(
    runner,
    [
      'set -euo pipefail',
      `REPO_DIR='${shellPath(repoRoot)}'`,
      `APP_DIR='${shellPath(appDir)}'`,
      'APP_PORT=3311',
      'log() { printf "%s\\n" "$*"; }',
      'wait_healthy() { [ "${HEALTHY:-1}" = 1 ]; }',
      'FORCE_BUILD="${FORCE_BUILD:-0}"',
      'DEPS_HASH="${DEPS_HASH-deadbeef}"',
      decisionBlock(),
      'echo "BUILD fp=${FINGERPRINT}"',
    ].join('\n')
  )
  return { appDir, runner }
}

function decide(runner: string, env: Record<string, string> = {}) {
  const result = spawnSync(bash, [shellPath(runner)], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 20_000,
  })
  expect(result.status, result.stderr).toBe(0)
  const built = /^BUILD fp=(.*)$/m.exec(result.stdout)
  return { skipped: !built, fingerprint: built?.[1] ?? '', stdout: result.stdout }
}

afterEach(() => {
  if (!fixtureRoot) return
  const target = resolve(fixtureRoot)
  expect(dirname(target)).toBe(repoRoot)
  expect(basename(target)).toMatch(/^\.sdd-test-build-fingerprint-/)
  rmSync(target, { recursive: true, force: true })
  fixtureRoot = undefined
})

describe('deploy.sh: no recompila lo que ya está sirviendo', () => {
  it('saltea sólo con la misma huella, server/index.mjs presente y la app sana', () => {
    const { appDir, runner } = fixture()
    const first = decide(runner)
    expect(first.skipped, 'sin huella en .output tiene que compilar').toBe(false)
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/)

    writeFileSync(join(appDir, '.output', '.build-fingerprint'), `${first.fingerprint}\n`)
    expect(decide(runner).skipped, 'falta server/index.mjs: compilar').toBe(false)

    writeFileSync(join(appDir, '.output', 'server', 'index.mjs'), '')
    expect(decide(runner).skipped).toBe(true)
    expect(decide(runner, { HEALTHY: '0' }).skipped, 'misma huella pero no contesta 200').toBe(
      false
    )
    expect(decide(runner, { FORCE_BUILD: '1' }).skipped, '--force compila siempre').toBe(false)
  }, 30_000)

  it('cualquier entrada distinta cambia la huella, y una huella incalculable compila', () => {
    const { appDir, runner } = fixture()
    const base = decide(runner).fingerprint
    writeFileSync(join(appDir, '.output', '.build-fingerprint'), `${base}\n`)
    writeFileSync(join(appDir, '.output', 'server', 'index.mjs'), '')

    const otherDeps = decide(runner, { DEPS_HASH: 'cafebabe' })
    expect(otherDeps.skipped).toBe(false)
    expect(otherDeps.fingerprint).not.toBe(base)

    // Sin hash de deps (no hay sha256sum en el box) no hay huella: compilar, nunca saltear.
    const blind = decide(runner, { DEPS_HASH: '' })
    expect(blind.skipped).toBe(false)
    expect(blind.fingerprint).toBe('')

    // app/.env vive fuera de git y Nuxt lo hornea en el build.
    writeFileSync(join(appDir, '.env'), 'NUXT_SOMETHING=1\n')
    const withEnv = decide(runner)
    expect(withEnv.skipped).toBe(false)
    expect(withEnv.fingerprint).not.toBe(base)
  }, 30_000)

  it('escribe la huella en el candidato ya validado y antes del swap', () => {
    const check = script.indexOf('timed "Check candidate SSR before the swap"')
    const stamp = script.indexOf('>"$STAGING/$BUILD_STAMP"')
    const swap = script.indexOf('mv "$STAGING" "$APP_DIR/.output"')
    expect(check).toBeGreaterThan(-1)
    expect(stamp).toBeGreaterThan(check)
    expect(swap).toBeGreaterThan(stamp)
  })
})
