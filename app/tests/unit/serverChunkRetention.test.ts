import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../..')
const helper = resolve(repoRoot, 'app/scripts/retain-server-chunks.sh')
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
let fixtureRoot: string | undefined

function shellPath(path: string): string {
  return process.platform === 'win32'
    ? path
        .replace(/\\/g, '/')
        .replace(/^([A-Z]):/i, (_, drive: string) => `/${drive.toLowerCase()}`)
    : path
}

function chunk(output: string, name: string, contents: string) {
  const target = join(output, 'server/chunks', name)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents)
}

function readChunk(output: string, name: string): string {
  return readFileSync(join(output, 'server/chunks', name), 'utf8')
}

function retain(previous: string, staging: string) {
  execFileSync(bash, [shellPath(helper), shellPath(previous), shellPath(staging)], {
    cwd: repoRoot,
    timeout: 20_000,
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

afterEach(() => {
  if (!fixtureRoot) return
  // Never recursively remove a computed path without proving that it is our
  // unique fixture directly inside the worktree, on Windows as well as Linux.
  const target = resolve(fixtureRoot)
  expect(dirname(target)).toBe(repoRoot)
  expect(basename(target)).toMatch(/^\.sdd-test-retention-/)
  rmSync(target, { recursive: true, force: true })
  fixtureRoot = undefined
})

describe('server chunk retention across rolling deployments', () => {
  it('keeps the previous generation available without overwriting new code or inheriting older generations', () => {
    fixtureRoot = mkdtempSync(join(repoRoot, '.sdd-test-retention-'))
    // Spaces also exercise quoting in the helper's tar/copy paths.
    const first = join(fixtureRoot, 'first output')
    const second = join(fixtureRoot, 'second output')
    const third = join(fixtureRoot, 'third output')

    // The first migration has no manifest. Old workers may still dynamically
    // import its chunks while PM2 warms the new generation.
    chunk(first, 'pages/old-lazy.mjs', 'first-generation lazy chunk')
    chunk(first, 'shared.mjs', 'first-generation shared code')
    chunk(second, 'pages/new-lazy.mjs', 'second-generation lazy chunk')
    chunk(second, 'shared.mjs', 'second-generation shared code')

    retain(first, second)

    expect(readChunk(second, 'pages/old-lazy.mjs')).toBe('first-generation lazy chunk')
    expect(readChunk(second, 'shared.mjs')).toBe('second-generation shared code')
    expect(readChunk(second, 'pages/new-lazy.mjs')).toBe('second-generation lazy chunk')
    expect(readChunk(first, 'pages/old-lazy.mjs')).toBe('first-generation lazy chunk')

    const secondManifest = readFileSync(join(second, 'server/chunks.manifest'), 'utf8')
    expect(secondManifest).toContain('new-lazy.mjs')
    expect(secondManifest).toContain('shared.mjs')
    expect(secondManifest).not.toContain('old-lazy.mjs')

    chunk(third, 'pages/fresh-lazy.mjs', 'third-generation lazy chunk')
    chunk(third, 'shared.mjs', 'third-generation shared code')
    retain(second, third)

    expect(readChunk(third, 'pages/new-lazy.mjs')).toBe('second-generation lazy chunk')
    expect(readChunk(third, 'shared.mjs')).toBe('third-generation shared code')
    expect(readChunk(third, 'pages/fresh-lazy.mjs')).toBe('third-generation lazy chunk')
    expect(existsSync(join(third, 'server/chunks/pages/old-lazy.mjs'))).toBe(false)
    expect(readChunk(second, 'pages/old-lazy.mjs')).toBe('first-generation lazy chunk')

    const thirdManifest = readFileSync(join(third, 'server/chunks.manifest'), 'utf8')
    expect(thirdManifest).toContain('fresh-lazy.mjs')
    expect(thirdManifest).not.toContain('new-lazy.mjs')
    expect(thirdManifest).not.toContain('old-lazy.mjs')
  }, 30_000)
})
