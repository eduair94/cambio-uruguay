import type { Manifest, ResourceMeta } from 'vue-bundle-renderer'

// vue-bundle-renderer emits a `<link rel="prefetch">` for every dynamic import of every
// rendered module (the entry, the layout) and for their static imports, on every page. Two
// kinds of dynamic import are only ever needed on demand, so their hints are removed here:
//
// - Route validators. Nuxt hoists `definePageMeta({ validate })` into the entry's route table,
//   so each `await import('~/utils/x')` inside a validator is an entry dynamic import. The page
//   that needs the catalogue also imports it statically and gets it as a modulepreload.
// - Session code under `services/` and the Firebase packages, loaded on demand since #260.
//
// Only `prefetch` changes: preload, imports, dynamicImports, scripts and CSS stay as they are.
// A chunk that the entry, the layout or other app-wide lazy code also reaches keeps its hint.
// A new `import('~/utils/...')` in app-wide code (plugin, layout, entry) is treated as on
// demand too: if it must be warm right after hydration, import it statically.

// The original list from 2026-09-08. The structural rule below covers the entry imports, but
// this also matches hashed shared chunks by their module name, so it stays as a guard.
const catalogues = new Set([
  'guides',
  'guideHubs',
  'glossary',
  'importCategories',
  'casasDirectory',
  'guidesReddit',
  'guidesPareja',
  'importProductTypes',
])

const UTILS_MODULE = /(?:^|\/)utils\/([^/]+)\.[cm]?[jt]s$/
const SERVICES_MODULE = /(?:^|\/)services\/[^/]+\.[cm]?[jt]s$/
const FIREBASE_PACKAGE = /(?:^|\/)node_modules\/(?:firebase|@firebase)\//
const PAGE_MODULE = /(?:^|\/)pages\//
const PACKAGE_MODULE = /(?:^|\/)node_modules\//

const sourceOf = (id: string, resource: ResourceMeta | undefined): string =>
  (resource?.src || id).replace(/\\/g, '/').split('?')[0] ?? ''

function isOnDemandRoot(manifest: Manifest, depId: string, importer: ResourceMeta): boolean {
  const source = sourceOf(depId, manifest[depId])
  if (PAGE_MODULE.test(source)) return false
  if (FIREBASE_PACKAGE.test(source)) return true
  if (PACKAGE_MODULE.test(source)) return false
  if (SERVICES_MODULE.test(source)) return true
  return Boolean(importer.isEntry) && UTILS_MODULE.test(source)
}

function addStaticClosure(manifest: Manifest, id: string, seen: Set<string>): void {
  const stack = [id]
  while (stack.length) {
    const next = stack.pop()!
    if (seen.has(next) || !manifest[next]) continue
    seen.add(next)
    for (const dep of manifest[next]!.imports || []) stack.push(dep)
  }
}

function deferNamedCatalogues(manifest: Manifest): void {
  for (const [id, resource] of Object.entries(manifest)) {
    if (resource.resourceType !== 'script') continue
    const file = UTILS_MODULE.exec(sourceOf(id, resource))?.[1]
    // Vite keeps src for dynamic entry modules. A shared chunk has a hashed key,
    // no src, and its original module basename in name. Never match hashed filenames.
    const namedSharedChunk =
      !resource.src && id.startsWith('_') && catalogues.has(resource.name || '')
    if ((file && catalogues.has(file)) || namedSharedChunk) resource.prefetch = false
  }
}

function deferOnDemandRoots(manifest: Manifest): void {
  const roots = new Set<string>()
  for (const resource of Object.values(manifest)) {
    if (resource.resourceType !== 'script') continue
    for (const depId of resource.dynamicImports || []) {
      if (isOnDemandRoot(manifest, depId, resource)) roots.add(depId)
    }
  }
  if (!roots.size) return

  // What the whole site keeps: the entry's static closure and that of every entry dynamic
  // import that is neither on demand nor a page (layouts, i18n config, workbox, lazy components).
  const kept = new Set<string>()
  for (const [id, resource] of Object.entries(manifest)) {
    if (!resource.isEntry) continue
    addStaticClosure(manifest, id, kept)
    for (const depId of resource.dynamicImports || []) {
      if (roots.has(depId) || PAGE_MODULE.test(sourceOf(depId, manifest[depId]))) continue
      addStaticClosure(manifest, depId, kept)
    }
  }

  const deferred = new Set<string>()
  for (const root of roots) addStaticClosure(manifest, root, deferred)
  for (const id of deferred) {
    const resource = manifest[id]
    if (resource?.resourceType === 'script' && !kept.has(id)) resource.prefetch = false
  }
}

export function deferCataloguePrefetch(manifest: Manifest): void {
  deferNamedCatalogues(manifest)
  deferOnDemandRoots(manifest)
}
