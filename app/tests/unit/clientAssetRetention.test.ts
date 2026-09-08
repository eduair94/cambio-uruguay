import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../..')
const helper = join(repoRoot, 'app/scripts/retain-client-assets.sh')
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
let fixtureRoot: string | undefined

function shellPath(path: string): string {
  return process.platform === 'win32'
    ? path
        .replace(/\\/g, '/')
        .replace(/^([A-Z]):/i, (_, drive: string) => `/${drive.toLowerCase()}`)
    : path
}

function fixture() {
  fixtureRoot = mkdtempSync(join(repoRoot, '.sdd-test-client-retention-'))
  const previous = join(fixtureRoot, 'previous output')
  const staging = join(fixtureRoot, 'staging output')
  const compatibility = join(fixtureRoot, 'compatibility assets')
  const oldAssets = join(previous, 'public/_nuxt')
  const newAssets = join(staging, 'public/_nuxt')
  for (const directory of [oldAssets, newAssets, compatibility]) {
    mkdirSync(directory, { recursive: true })
  }
  return { previous, staging, compatibility, oldAssets, newAssets }
}

function asset(directory: string, name: string, contents: string, hoursAgo = 0) {
  const target = join(directory, name)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents)
  const modified = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  utimesSync(target, modified, modified)
  return target
}

function retain(
  previous: string,
  staging: string,
  compatibility?: string,
  copyMode: 'native' | 'fallback' | 'modern' | 'legacy-9.2' = 'native'
) {
  const args = [helper, previous, staging, ...(compatibility ? [compatibility] : [])].map(shellPath)
  if (copyMode === 'native') {
    return execFileSync(bash, args, { cwd: repoRoot, timeout: 20_000, encoding: 'utf8' })
  }
  // xargs launches cp directly, so intercept it through PATH, not a shell function.
  // Simulate GNU cp differences while still copying through the real local cp.
  const shimDir = join(fixtureRoot!, 'copy shim')
  mkdirSync(shimDir)
  writeFileSync(
    join(shimDir, 'cp'),
    `#!/usr/bin/env bash
arguments=()
for argument in "$@"; do
  case "$RETENTION_TEST_CP_MODE:$argument" in
    fallback:--link) exit 1 ;;
    modern:--no-clobber|modern:-n) echo 'Legacy skip option used on modern cp' >&2; exit 1 ;;
    modern:--update=none) arguments+=(-n); continue ;;
    legacy-9.2:--update=none) exit 1 ;;
    legacy-9.2:--version) printf 'cp (GNU coreutils) 9.2\\n'; exit 0 ;;
    legacy-9.2:./collision.css) echo 'Legacy cp refuses skipped collisions' >&2; exit 1 ;;
  esac
  arguments+=("$argument")
done
exec "$RETENTION_TEST_REAL_CP" "\${arguments[@]}"
`,
    { mode: 0o755 }
  )
  const realCp = execFileSync(bash, ['-c', 'command -v cp'], { encoding: 'utf8' }).trim()
  return execFileSync(
    bash,
    [
      '-c',
      'PATH="$1:$PATH"; export PATH; shift; bash "$@"',
      'retention-fallback-test',
      shellPath(shimDir),
      ...args,
    ],
    {
      cwd: repoRoot,
      timeout: 20_000,
      encoding: 'utf8',
      env: {
        ...process.env,
        RETENTION_TEST_REAL_CP: realCp,
        RETENTION_TEST_CP_MODE: copyMode,
      },
    }
  )
}

afterEach(() => {
  if (!fixtureRoot) return
  const target = resolve(fixtureRoot)
  expect(dirname(target)).toBe(repoRoot)
  expect(basename(target)).toMatch(/^\.sdd-test-client-retention-/)
  rmSync(target, { recursive: true, force: true })
  fixtureRoot = undefined
})

describe('client asset retention across rolling deployments', () => {
  it('links missing assets, preserves fresh collisions and metadata, and keeps the three-day window', () => {
    const { previous, staging, oldAssets, newAssets } = fixture()
    const retained = asset(oldAssets, 'nested assets/old chunk.js', 'old client code', 61)
    chmodSync(retained, 0o644)
    const before = statSync(retained)
    asset(oldAssets, 'old chunk.js.gz', 'gzip bytes', 61)
    asset(oldAssets, 'old chunk.js.br', 'brotli bytes', 61)
    asset(oldAssets, 'expired.js', 'expired client code', 83)
    asset(oldAssets, 'collision.js', 'previous collision')
    asset(newAssets, 'collision.js', 'fresh collision')

    retain(previous, staging)

    const next = join(newAssets, 'nested assets/old chunk.js')
    expect(readFileSync(next, 'utf8')).toBe('old client code')
    expect(statSync(next).ino).toBe(before.ino)
    expect(statSync(next).nlink).toBeGreaterThan(1)
    expect(statSync(next).mtimeMs).toBe(before.mtimeMs)
    expect(statSync(next).mode).toBe(before.mode)
    expect(readFileSync(join(newAssets, 'old chunk.js.gz'), 'utf8')).toBe('gzip bytes')
    expect(readFileSync(join(newAssets, 'old chunk.js.br'), 'utf8')).toBe('brotli bytes')
    expect(readFileSync(join(newAssets, 'collision.js'), 'utf8')).toBe('fresh collision')
    expect(readFileSync(join(oldAssets, 'collision.js'), 'utf8')).toBe('previous collision')
    expect(existsSync(join(newAssets, 'expired.js'))).toBe(false)
    expect(readFileSync(join(oldAssets, 'expired.js'), 'utf8')).toBe('expired client code')

    // Removing the old generation's name must not strand an already-open tab.
    unlinkSync(retained)
    expect(readFileSync(next, 'utf8')).toBe('old client code')
  })

  it('overlays compatibility files before retention and never writes through a prior hardlink on rerun', () => {
    const { previous, staging, compatibility, oldAssets, newAssets } = fixture()
    const original = asset(oldAssets, 'recovery.js', 'old recovery')
    retain(previous, staging)
    expect(statSync(join(newAssets, 'recovery.js')).ino).toBe(statSync(original).ino)

    asset(compatibility, 'recovery.js', 'compatible recovery', 96)
    asset(compatibility, 'compat-only.js', 'standalone compatibility', 96)
    asset(newAssets, 'compat-only.js', 'generated collision')
    retain(previous, staging, compatibility)

    expect(readFileSync(original, 'utf8')).toBe('old recovery')
    expect(readFileSync(join(newAssets, 'recovery.js'), 'utf8')).toBe('compatible recovery')
    expect(statSync(join(newAssets, 'recovery.js')).ino).not.toBe(statSync(original).ino)
    expect(readFileSync(join(newAssets, 'compat-only.js'), 'utf8')).toBe('standalone compatibility')
  })

  it('copies missing files with their timestamps when hardlinks are unavailable', () => {
    const { previous, staging, oldAssets, newAssets } = fixture()
    const original = asset(oldAssets, 'retained.css', 'retained stylesheet', 61)
    asset(oldAssets, 'collision.css', 'old stylesheet')
    asset(newAssets, 'collision.css', 'fresh stylesheet')

    expect(retain(previous, staging, undefined, 'fallback')).toContain('copying missing assets')
    const next = join(newAssets, 'retained.css')
    expect(readFileSync(next, 'utf8')).toBe('retained stylesheet')
    expect(statSync(next).mtimeMs).toBe(statSync(original).mtimeMs)
    expect(statSync(next).ino).not.toBe(statSync(original).ino)
    expect(readFileSync(join(newAssets, 'collision.css'), 'utf8')).toBe('fresh stylesheet')
  })

  it.each(['modern', 'legacy-9.2'] as const)(
    'retains fresh collisions without depending on cp -n exit semantics: %s',
    mode => {
      const { previous, staging, oldAssets, newAssets } = fixture()
      const original = asset(oldAssets, 'retained.css', 'retained stylesheet', 61)
      asset(oldAssets, 'collision.css', 'old stylesheet')
      asset(newAssets, 'collision.css', 'fresh stylesheet')

      expect(retain(previous, staging, undefined, mode)).not.toContain('copying missing assets')
      expect(readFileSync(join(newAssets, 'collision.css'), 'utf8')).toBe('fresh stylesheet')
      expect(readFileSync(join(oldAssets, 'collision.css'), 'utf8')).toBe('old stylesheet')
      expect(statSync(join(newAssets, 'retained.css')).ino).toBe(statSync(original).ino)
    }
  )

  it('accepts a first deployment with compatibility assets and rejects overlapping output roots', () => {
    const { previous, staging, compatibility, newAssets } = fixture()
    asset(compatibility, 'recovery.js', 'recovery')
    retain(join(previous, 'not created'), staging, compatibility)
    expect(readFileSync(join(newAssets, 'recovery.js'), 'utf8')).toBe('recovery')

    const result = spawnSync(bash, [helper, staging, staging].map(shellPath), {
      cwd: repoRoot,
      timeout: 20_000,
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('output directories overlap')
    expect(readFileSync(join(newAssets, 'recovery.js'), 'utf8')).toBe('recovery')
  })

  it.skipIf(process.platform === 'win32')(
    'rejects symlinks instead of retaining a reference into an old generation',
    () => {
      const { previous, staging, oldAssets, newAssets } = fixture()
      const original = asset(oldAssets, 'original.js', 'original code')
      symlinkSync(original, join(oldAssets, 'alias.js'))

      const result = spawnSync(bash, [helper, previous, staging].map(shellPath), {
        cwd: repoRoot,
        timeout: 20_000,
        encoding: 'utf8',
      })
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Symlinks are not supported')
      expect(existsSync(join(newAssets, 'alias.js'))).toBe(false)
      expect(readFileSync(original, 'utf8')).toBe('original code')
    }
  )
})
