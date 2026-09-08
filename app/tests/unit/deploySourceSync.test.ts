import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../..')
const helper = resolve(repoRoot, 'app/scripts/sync-deploy-source.sh')
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
let fixtureRoot: string | undefined
let gitEnv: NodeJS.ProcessEnv

function shellPath(path: string): string {
  return process.platform === 'win32'
    ? path
        .replace(/\\/g, '/')
        .replace(/^([A-Z]):/i, (_, drive: string) => `/${drive.toLowerCase()}`)
    : path
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    env: gitEnv,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 20_000,
  }).trim()
}

function write(cwd: string, file: string, contents: string) {
  const target = join(cwd, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents)
}

function commit(cwd: string, message: string): string {
  git(cwd, 'add', '.')
  git(cwd, 'commit', '-m', message)
  return git(cwd, 'rev-parse', 'HEAD')
}

function fixture(withLockfile = true) {
  fixtureRoot = mkdtempSync(join(repoRoot, '.sdd-test-source-sync-'))
  const remote = join(fixtureRoot, 'remote.git')
  const writer = join(fixtureRoot, 'writer')
  // Spaces also exercise quoting in the helper's repository argument.
  const checkout = join(fixtureRoot, 'deploy checkout')
  const config = join(fixtureRoot, 'gitconfig')
  writeFileSync(config, '[user]\n\tname = Deploy Test\n\temail = deploy@example.invalid\n')
  gitEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: config }
  git(fixtureRoot, 'init', '--bare', remote)
  git(fixtureRoot, 'init', '--initial-branch=main', writer)
  write(writer, 'app/page.txt', 'initial page\n')
  if (withLockfile) write(writer, 'app/package-lock.json', 'initial lock\n')
  const initial = commit(writer, 'Initial source')
  git(writer, 'remote', 'add', 'origin', remote)
  git(writer, 'push', '-u', 'origin', 'main')
  git(fixtureRoot, 'clone', '--branch=main', remote, checkout)
  return { remote, writer, checkout, initial }
}

function sync(checkout: string) {
  return spawnSync(bash, [shellPath(helper), shellPath(checkout)], {
    cwd: repoRoot,
    env: gitEnv,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 20_000,
  })
}

afterEach(() => {
  if (!fixtureRoot) return
  // Prove this is our unique fixture inside the worktree before recursive removal.
  const target = resolve(fixtureRoot)
  expect(dirname(target)).toBe(repoRoot)
  expect(basename(target)).toMatch(/^\.sdd-test-source-sync-/)
  rmSync(target, { recursive: true, force: true })
  fixtureRoot = undefined
})

describe('deploy source synchronization', () => {
  it('fast-forwards to fetched main and reports each phase without changing Git config', () => {
    const { writer, checkout } = fixture()
    write(writer, 'app/page.txt', 'updated page\n')
    const next = commit(writer, 'Update page')
    git(writer, 'push', 'origin', 'main')
    git(checkout, 'config', 'maintenance.auto', 'true')
    git(checkout, 'config', 'gc.auto', '1')
    const configBefore = readFileSync(join(checkout, '.git/config'), 'utf8')

    const result = sync(checkout)

    expect(result.status, result.stderr).toBe(0)
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(next)
    expect(readFileSync(join(checkout, 'app/page.txt'), 'utf8')).toBe('updated page\n')
    for (const phase of [
      'Lockfile cleanup',
      'Fetch main',
      'Resolve fetched commit',
      'Fast-forward merge',
    ]) {
      expect(result.stdout).toMatch(new RegExp(`${phase}: \\d+ ms \\(exit 0\\)`))
    }
    expect(readFileSync(join(checkout, '.git/config'), 'utf8')).toBe(configBefore)
  }, 30_000)

  it('does not fetch new tags that point at the requested branch', () => {
    const { writer, checkout } = fixture()
    write(writer, 'app/page.txt', 'tagged page\n')
    const next = commit(writer, 'Tagged update')
    git(writer, 'tag', 'unneeded-release')
    git(writer, 'push', 'origin', 'main', '--tags')

    expect(sync(checkout).status).toBe(0)
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(next)
    expect(git(checkout, 'tag', '--list')).toBe('')
  }, 30_000)

  it('refuses divergent history without replacing local commits', () => {
    const { writer, checkout } = fixture()
    write(checkout, 'app/local.txt', 'local commit\n')
    const local = commit(checkout, 'Local commit')
    write(writer, 'app/remote.txt', 'remote commit\n')
    commit(writer, 'Remote commit')
    git(writer, 'push', 'origin', 'main')

    const result = sync(checkout)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Fast-forward merge failed')
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(local)
    expect(readFileSync(join(checkout, 'app/local.txt'), 'utf8')).toBe('local commit\n')
  }, 30_000)

  it('stops after failed fetch even when FETCH_HEAD contains a newer commit', () => {
    const { writer, checkout, initial } = fixture()
    write(writer, 'app/page.txt', 'previously fetched page\n')
    commit(writer, 'Previously fetched update')
    git(writer, 'push', 'origin', 'main')
    git(checkout, 'fetch', 'origin', 'main')
    const privateRemote = join(fixtureRoot!, 'missing-private-remote.git')
    git(checkout, 'remote', 'set-url', 'origin', privateRemote)

    const result = sync(checkout)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Fetch main failed')
    expect(result.stdout).not.toContain('Resolve fetched commit')
    expect(result.stdout).not.toContain('Fast-forward merge')
    expect(result.stderr).not.toContain(privateRemote)
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(initial)
  }, 30_000)

  it('preserves dirty source and refuses an overlapping update despite autostash config', () => {
    const { writer, checkout, initial } = fixture()
    write(checkout, 'app/page.txt', 'uncommitted local code\n')
    write(checkout, 'app/untracked.txt', 'untracked local code\n')
    git(checkout, 'config', 'merge.autoStash', 'true')
    write(writer, 'app/page.txt', 'conflicting remote code\n')
    commit(writer, 'Conflicting update')
    git(writer, 'push', 'origin', 'main')

    const result = sync(checkout)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Fast-forward merge failed')
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(initial)
    expect(readFileSync(join(checkout, 'app/page.txt'), 'utf8')).toBe('uncommitted local code\n')
    expect(readFileSync(join(checkout, 'app/untracked.txt'), 'utf8')).toBe('untracked local code\n')
    expect(git(checkout, 'stash', 'list')).toBe('')
    expect(git(checkout, 'config', 'merge.autoStash')).toBe('true')
  }, 30_000)

  it('cleans install lockfile churn while preserving unrelated dirty source', () => {
    const { writer, checkout } = fixture()
    write(checkout, 'app/package-lock.json', 'npm install churn\n')
    write(checkout, 'app/page.txt', 'local page changes\n')
    write(writer, 'app/package-lock.json', 'new committed lock\n')
    const next = commit(writer, 'Update dependencies')
    git(writer, 'push', 'origin', 'main')

    expect(sync(checkout).status).toBe(0)
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(next)
    expect(readFileSync(join(checkout, 'app/package-lock.json'), 'utf8')).toBe(
      'new committed lock\n'
    )
    expect(readFileSync(join(checkout, 'app/page.txt'), 'utf8')).toBe('local page changes\n')
    expect(git(checkout, 'diff', '--name-only')).toBe('app/page.txt')
  }, 30_000)

  it('supports a checkout without a tracked lockfile', () => {
    const { writer, checkout } = fixture(false)
    write(writer, 'app/page.txt', 'updated page\n')
    const next = commit(writer, 'Update without lockfile')
    git(writer, 'push', 'origin', 'main')

    expect(sync(checkout).status).toBe(0)
    expect(git(checkout, 'rev-parse', 'HEAD')).toBe(next)
  }, 30_000)
})
