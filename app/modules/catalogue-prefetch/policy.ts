import type { Manifest } from 'vue-bundle-renderer'

// These five route validators import their catalogue on demand. The renderer otherwise
// emits speculative script hints for every dynamic import of the shared route entry.
// Include the three data catalogues imported by those validators' catalogues, but not
// unrelated pages, shared application code, styles or other resources.
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

export function deferCataloguePrefetch(manifest: Manifest): void {
  for (const [id, resource] of Object.entries(manifest)) {
    if (resource.resourceType !== 'script') continue
    const source = (resource.src || id).replace(/\\/g, '/').split('?')[0]!
    const file = /(?:^|\/)utils\/([^/]+)\.[cm]?[jt]s$/.exec(source)?.[1]
    // Vite keeps src for dynamic entry modules. A shared chunk has a hashed key,
    // no src, and its original module basename in name. Never match hashed filenames.
    const namedSharedChunk =
      !resource.src && id.startsWith('_') && catalogues.has(resource.name || '')
    if ((file && catalogues.has(file)) || namedSharedChunk) resource.prefetch = false
  }
}
