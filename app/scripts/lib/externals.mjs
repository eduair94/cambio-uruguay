// The Nitro server is not self-contained: nuxt.config sets `nitro.externals.trace: false`, so the
// bundle imports vue, mongoose, firebase-admin and ~40 other packages by ABSOLUTE path from the
// app/node_modules of the machine that built it (`file:///root/cambio-uruguay/app/node_modules/…`).
// When the build runs in CI (at that same path) and the server runs it against its own
// node_modules, the two trees have to hold the same versions, or the client bundle and the SSR
// runtime disagree. These helpers list what the bundle imports and compare it with a tree.
// Pure functions; the CLI is scripts/externals-versions.mjs and the tests are in
// tests/unit/externalsVersions.test.ts.

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Package names referenced as `<appDir>/node_modules/<name>/…` (with or without `file://`).
// Only the first package after app/node_modules counts: a nested node_modules belongs to it.
export function externalPackagesIn(text, appDir) {
  const root = escapeRegExp(`${appDir.replace(/\/+$/, '')}/node_modules/`)
  const pattern = new RegExp(`${root}((?:@[^/'"\`\\s]+/)?[^/'"\`\\s]+)`, 'g')
  const found = new Set()
  for (const match of text.matchAll(pattern)) found.add(match[1])
  return found
}

// One `name version` per line, sorted, so the file diffs cleanly.
export function formatManifest(versions) {
  return (
    [...versions.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, version]) => `${name} ${version ?? 'missing'}`)
      .join('\n') + '\n'
  )
}

export function parseManifest(text) {
  const versions = new Map()
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [name, version] = trimmed.split(/\s+/)
    if (name && version) versions.set(name, version)
  }
  return versions
}

// Every package whose installed version is not the one the build used. A package the build
// itself could not resolve ("missing") cannot be checked and is reported as a mismatch too:
// the server would fail to import it, only later and only on the route that needs it.
export function versionMismatches(manifest, readVersion) {
  const mismatches = []
  for (const [name, want] of manifest) {
    const have = readVersion(name) ?? 'missing'
    if (want === 'missing' || have !== want) mismatches.push({ name, want, have })
  }
  return mismatches
}
