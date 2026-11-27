// Records (in CI, right after `nuxt build`) and checks (on the server, before the swap) the
// versions of the packages the Nitro server imports from app/node_modules by absolute path.
// scripts/lib/externals.mjs explains why that coupling exists.
//
// Usage (from app/):
//   node scripts/externals-versions.mjs write <outputDir>   # CI: writes <outputDir>/.externals-versions
//   node scripts/externals-versions.mjs check <outputDir>   # server: exit 1 on any mismatch
//
// Both read the node_modules next to this script (app/node_modules), and `write` looks for the
// absolute path of this app dir in the bundle, so CI has to build at the server's path.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  externalPackagesIn,
  formatManifest,
  parseManifest,
  versionMismatches,
} from './lib/externals.mjs'

const MANIFEST = '.externals-versions'
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nodeModules = join(appDir, 'node_modules')

function readVersion(name) {
  try {
    return JSON.parse(readFileSync(join(nodeModules, name, 'package.json'), 'utf8')).version ?? null
  } catch {
    return null
  }
}

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else if (/\.(?:mjs|cjs|js|json)$/.test(entry.name)) yield path
  }
}

const [mode, outputArg] = process.argv.slice(2)
if (!['write', 'check'].includes(mode) || !outputArg) {
  console.error('usage: node scripts/externals-versions.mjs write|check <outputDir>')
  process.exit(2)
}
const outputDir = resolve(outputArg)

if (mode === 'write') {
  const names = new Set()
  for (const file of files(join(outputDir, 'server'))) {
    for (const name of externalPackagesIn(readFileSync(file, 'utf8'), appDir)) names.add(name)
  }
  const versions = new Map([...names].map(name => [name, readVersion(name)]))
  writeFileSync(join(outputDir, MANIFEST), formatManifest(versions))
  const missing = [...versions].filter(([, version]) => !version).map(([name]) => name)
  console.log(`[externals] ${versions.size} packages imported from ${nodeModules}`)
  if (missing.length) {
    // The build resolved these at build time, so this is a broken install, not a broken bundle.
    console.error(`[externals] not installed here: ${missing.join(', ')}`)
    process.exit(1)
  }
} else {
  let manifest
  try {
    manifest = parseManifest(readFileSync(join(outputDir, MANIFEST), 'utf8'))
  } catch {
    console.error(`[externals] ${MANIFEST} is missing from ${outputDir}; refusing to guess.`)
    process.exit(1)
  }
  const mismatches = versionMismatches(manifest, readVersion)
  if (mismatches.length) {
    for (const { name, want, have } of mismatches) {
      console.error(`[externals] ${name}: built with ${want}, ${nodeModules} has ${have}`)
    }
    process.exit(1)
  }
  console.log(`[externals] ${manifest.size} packages match ${nodeModules}`)
}
