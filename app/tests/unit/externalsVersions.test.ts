import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  externalPackagesIn,
  formatManifest,
  parseManifest,
  versionMismatches,
} from '../../scripts/lib/externals.mjs'

// The frontend is built in CI and run on the server against the server's own app/node_modules
// (nitro.externals.trace is false). These helpers are what stops a CI build from going live
// against a node_modules with other versions of vue, mongoose & co.
const APP = '/root/cambio-uruguay/app'

describe('externalPackagesIn', () => {
  it('reads plain and scoped packages, with or without file://', () => {
    const text = [
      `import { ssrRenderList } from 'file://${APP}/node_modules/vue/server-renderer/index.mjs'`,
      `import { toRaw } from "file://${APP}/node_modules/@vue/shared/dist/shared.cjs.js"`,
      `const admin = require('${APP}/node_modules/firebase-admin/lib/index.js')`,
    ].join('\n')
    expect([...externalPackagesIn(text, APP)].sort()).toEqual([
      '@vue/shared',
      'firebase-admin',
      'vue',
    ])
  })

  it('counts a nested node_modules as its top-level package', () => {
    const text = `from 'file://${APP}/node_modules/mongoose/node_modules/mongodb/lib/index.js'`
    expect([...externalPackagesIn(text, APP)]).toEqual(['mongoose'])
  })

  it('ignores node_modules of other roots (another checkout, a build cache)', () => {
    const text = [
      `from 'file:///home/runner/work/x/app/node_modules/vue/index.mjs'`,
      `from 'file://${APP}/node_modules/vue/index.mjs'`,
      `from 'file:///root/cambio-uruguay/app-old/node_modules/pinia/dist/pinia.mjs'`,
    ].join('\n')
    expect([...externalPackagesIn(text, APP)]).toEqual(['vue'])
  })

  it('tolerates a trailing slash on the app dir', () => {
    expect([...externalPackagesIn(`'${APP}/node_modules/vue/index.mjs'`, `${APP}/`)]).toEqual([
      'vue',
    ])
  })
})

describe('manifest', () => {
  it('round-trips, sorted, one package per line', () => {
    const versions = new Map([
      ['vue', '3.5.43'],
      ['@vue/shared', '3.5.43'],
      ['mongoose', '8.9.0'],
    ])
    const text = formatManifest(versions)
    expect(text).toBe('@vue/shared 3.5.43\nmongoose 8.9.0\nvue 3.5.43\n')
    expect(parseManifest(text)).toEqual(versions)
  })

  it('writes an unresolvable package as missing', () => {
    expect(formatManifest(new Map([['ghost', null]]))).toBe('ghost missing\n')
  })
})

describe('versionMismatches', () => {
  const manifest = new Map([
    ['vue', '3.5.43'],
    ['mongoose', '8.9.0'],
    ['pinia', '3.0.1'],
  ])

  it('is empty when every version matches', () => {
    const installed: Record<string, string> = { vue: '3.5.43', mongoose: '8.9.0', pinia: '3.0.1' }
    expect(versionMismatches(manifest, (name: string) => installed[name] ?? null)).toEqual([])
  })

  it('reports a different version and a package that is not installed', () => {
    const installed: Record<string, string> = { vue: '3.5.44', mongoose: '8.9.0' }
    expect(versionMismatches(manifest, (name: string) => installed[name] ?? null)).toEqual([
      { name: 'vue', want: '3.5.43', have: '3.5.44' },
      { name: 'pinia', want: '3.0.1', have: 'missing' },
    ])
  })

  it('never accepts a package the build itself could not resolve', () => {
    expect(versionMismatches(new Map([['ghost', 'missing']]), () => 'missing')).toEqual([
      { name: 'ghost', want: 'missing', have: 'missing' },
    ])
  })
})

describe('wiring', () => {
  const repoRoot = resolve(__dirname, '../../..')
  const deploy = readFileSync(resolve(repoRoot, 'app/scripts/deploy.sh'), 'utf8')
  const workflow = readFileSync(resolve(repoRoot, '.github/workflows/deploy.yml'), 'utf8')

  it('the server checks the versions before the candidate is validated and swapped', () => {
    const check = deploy.indexOf('scripts/externals-versions.mjs" check "$STAGING"')
    expect(check, 'deploy.sh ya no verifica las versiones').toBeGreaterThan(-1)
    expect(check).toBeLessThan(deploy.indexOf('timed "Check candidate SSR before the swap"'))
    expect(check).toBeLessThan(deploy.indexOf('mv "$STAGING" "$APP_DIR/.output"'))
  })

  it('CI records the versions in the output it ships, built at the server path', () => {
    expect(workflow).toContain('node scripts/externals-versions.mjs write .output')
    // The build path has to be the server's: the bundle names app/node_modules by absolute path.
    expect(workflow).toContain('repo="${APP_DIR%/app}"')
    expect(workflow).toContain('sudo mount --bind "$GITHUB_WORKSPACE" "$repo"')
    expect(workflow).toMatch(
      /APP_DIR: \$\{\{ vars\.DEPLOY_APP_DIR \|\| '\/root\/cambio-uruguay\/app' \}\}/
    )
  })
})
