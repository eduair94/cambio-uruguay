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
// Only `prefetch` changes: preload, imports, dynamicImports, scripts and stylesheets stay as they
// are. A chunk that the entry, the layout or other app-wide lazy code also reaches keeps its hint.
// A new `import('~/utils/...')` in app-wide code (plugin, layout, entry) is treated as on
// demand too: if it must be warm right after hydration, import it statically.
//
// A chunk can lose its "facade": when a lazy import needs something that Rollup keeps inside the
// module's chunk, the chunk exports more than the module and Vite keys it `_<file>`, with no `src`
// (the build of 2026-11-20 had three validator catalogues and one page like that). Only its
// `name`, the module's basename, says what it is, so the module passes the names to match.

export interface CataloguePrefetchOptions {
  /** Basenames of the modules directly under `utils/` (`guides` for `utils/guides.ts`). */
  utilsModules?: Iterable<string>
  /** Basenames of the modules directly under `services/`. */
  servicesModules?: Iterable<string>
  /** Every page as the manifest keys it (`pages/dolar-hoy.vue`). */
  pageSources?: Iterable<string>
}

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
const SOURCE_FILE = /\.[cm]?[jt]s$/
const DECLARATION_FILE = /\.d\.[cm]?ts$/

const sourceOf = (id: string, resource: ResourceMeta | undefined): string =>
  (resource?.src || id).replace(/\\/g, '/').split('?')[0] ?? ''

const basename = (path: string): string =>
  (path.replace(/\\/g, '/').split('/').pop() ?? '').replace(/\.[^.]+$/, '')

/** `guides.ts` -> `guides`; declarations and other files are skipped. */
export function moduleNames(fileNames: Iterable<string>): string[] {
  const names: string[] = []
  for (const file of fileNames)
    if (SOURCE_FILE.test(file) && !DECLARATION_FILE.test(file))
      names.push(file.replace(SOURCE_FILE, ''))
  return names
}

/** Pages with no chunk of their own: on their route nothing preloads their JS or links their CSS. */
export function pagesWithoutChunk(manifest: Manifest, pageSources: Iterable<string>): string[] {
  return [...pageSources].filter(page => !manifest[page])
}

const isFacadeless = (id: string, resource: ResourceMeta | undefined): boolean =>
  resource?.resourceType === 'script' && !resource.src && id.startsWith('_')

interface FacadelessNames {
  entry: Set<string>
  any: Set<string>
}

function facadelessNames(manifest: Manifest, options: CataloguePrefetchOptions): FacadelessNames {
  const entry = new Set(options.utilsModules ?? [])
  // A page without its own chunk is still in the entry's route table, which Nuxt could not filter.
  for (const page of pagesWithoutChunk(manifest, options.pageSources ?? []))
    entry.add(basename(page))
  return { entry, any: new Set(options.servicesModules ?? []) }
}

function isOnDemandRoot(
  manifest: Manifest,
  depId: string,
  importer: ResourceMeta,
  names: FacadelessNames
): boolean {
  const resource = manifest[depId]
  if (isFacadeless(depId, resource)) {
    const name = resource?.name || ''
    return names.any.has(name) || (Boolean(importer.isEntry) && names.entry.has(name))
  }
  const source = sourceOf(depId, resource)
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

function deferOnDemandRoots(manifest: Manifest, options: CataloguePrefetchOptions): void {
  const names = facadelessNames(manifest, options)
  const roots = new Set<string>()
  for (const resource of Object.values(manifest)) {
    if (resource.resourceType !== 'script') continue
    for (const depId of resource.dynamicImports || []) {
      if (isOnDemandRoot(manifest, depId, resource, names)) roots.add(depId)
    }
  }
  if (!roots.size) return

  // What the whole site keeps: the entry's static closure and that of every entry dynamic import
  // that is neither on demand nor a page (layouts, i18n config, workbox, lazy components). A chunk
  // without a facade never joins it: nothing in the manifest says it is app-wide.
  const kept = new Set<string>()
  for (const [id, resource] of Object.entries(manifest)) {
    if (!resource.isEntry) continue
    addStaticClosure(manifest, id, kept)
    for (const depId of resource.dynamicImports || []) {
      const dep = manifest[depId]
      if (roots.has(depId) || isFacadeless(depId, dep) || PAGE_MODULE.test(sourceOf(depId, dep)))
        continue
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

// vue-bundle-renderer hints a dynamic import's stylesheets too, by their own flag: a stylesheet
// whose every script lost its hint loses its own. One that a hinted script still lists keeps it.
function deferOrphanStyles(manifest: Manifest): void {
  const owners = new Map<string, ResourceMeta[]>()
  for (const resource of Object.values(manifest)) {
    if (resource.resourceType !== 'script') continue
    for (const css of resource.css || []) owners.set(css, [...(owners.get(css) ?? []), resource])
  }
  for (const [css, scripts] of owners) {
    const style = manifest[css]
    if (style?.resourceType === 'style' && scripts.every(script => script.prefetch === false))
      style.prefetch = false
  }
}

export function deferCataloguePrefetch(
  manifest: Manifest,
  options: CataloguePrefetchOptions = {}
): void {
  deferNamedCatalogues(manifest)
  deferOnDemandRoots(manifest, options)
  deferOrphanStyles(manifest)
}
