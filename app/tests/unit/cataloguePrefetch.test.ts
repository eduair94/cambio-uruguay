import { describe, expect, it } from 'vitest'
import { normalizeViteManifest, type Manifest } from 'vue-bundle-renderer'
import {
  createRendererContext,
  getPrefetchLinks,
  getPreloadLinks,
  renderScripts,
} from 'vue-bundle-renderer/runtime'
import { deferCataloguePrefetch } from '../../modules/catalogue-prefetch/policy'

const fixture = (): Manifest =>
  normalizeViteManifest({
    'entry.js': {
      file: 'entry.js',
      isEntry: true,
      dynamicImports: [
        'utils/guides.ts',
        'utils/guideHubs.ts',
        'utils/glossary.ts',
        'utils/importCategories.ts',
        'utils/casasDirectory.ts',
        'pages/analisis-alquileres-uruguay.vue',
      ],
    },
    'utils/guides.ts': {
      file: 'guides-hash.js',
      src: 'utils/guides.ts',
      isDynamicEntry: true,
      imports: ['_reddit-hash.js', '_pareja-hash.js'],
    },
    '_reddit-hash.js': { file: 'reddit-hash.js', name: 'guidesReddit' },
    '_pareja-hash.js': { file: 'pareja-hash.js', name: 'guidesPareja' },
    'utils/guideHubs.ts': {
      file: 'hubs-hash.js',
      src: 'utils/guideHubs.ts',
      imports: ['utils/guides.ts'],
    },
    'utils/glossary.ts': { file: 'glossary-hash.js', src: 'utils/glossary.ts' },
    'utils/importCategories.ts': {
      file: 'imports-hash.js',
      src: 'utils/importCategories.ts',
      imports: ['_products-hash.js'],
    },
    '_products-hash.js': { file: 'products-hash.js', name: 'importProductTypes' },
    'utils/casasDirectory.ts': {
      file: 'casas-hash.js',
      src: 'utils/casasDirectory.ts',
      imports: ['entry.js'],
    },
    'pages/analisis-alquileres-uruguay.vue': {
      file: 'analysis-hash.js',
      src: 'pages/analisis-alquileres-uruguay.vue',
      css: ['analysis-hash.css'],
    },
    'pages/guias/[slug].vue': {
      file: 'guide-page-hash.js',
      imports: ['utils/guides.ts'],
    },
  })

describe('catalogues requested by route validators', () => {
  it('removes their SSR prefetch hints without changing actual imports, preload or scripts', () => {
    const manifest = fixture()
    const before = structuredClone(manifest)
    const initialRenderer = createRendererContext({ manifest: before })
    expect(getPrefetchLinks({}, initialRenderer).map(link => link.href)).toContain(
      '/reddit-hash.js'
    )

    deferCataloguePrefetch(manifest)
    const renderer = createRendererContext({ manifest })
    expect(getPrefetchLinks({}, renderer).map(link => link.href)).toEqual([
      '/analysis-hash.css',
      '/analysis-hash.js',
    ])
    expect(getPreloadLinks({}, renderer)).toEqual(getPreloadLinks({}, initialRenderer))
    expect(renderScripts({}, renderer)).toEqual(renderScripts({}, initialRenderer))
    for (const [id, resource] of Object.entries(manifest)) {
      expect({ ...resource, prefetch: before[id]!.prefetch }).toEqual(before[id])
    }
  })

  it('keeps catalogues preloaded when rendering a page that actually imports them', () => {
    const manifest = fixture()
    deferCataloguePrefetch(manifest)
    const renderer = createRendererContext({ manifest })
    const request = { modules: new Set(['pages/guias/[slug].vue']) }
    expect(getPreloadLinks(request, renderer).map(link => link.href)).toEqual(
      expect.arrayContaining(['/guides-hash.js', '/reddit-hash.js', '/pareja-hash.js'])
    )
    expect(manifest['entry.js']?.dynamicImports).toEqual(fixture()['entry.js']?.dynamicImports)
  })

  it('matches source paths across platforms and shared chunks without relying on output hashes', () => {
    const manifest = normalizeViteManifest({
      'C:\\project\\utils\\guides.ts': { file: 'different-a.js' },
      'virtual-source': { file: 'different-b.js', src: '/project/utils/glossary.ts?entry' },
      '_arbitrary-hash.js': { file: 'different-c.js', name: 'importProductTypes' },
      'pages/guides.vue': { file: 'page.js', src: 'pages/guides.vue', name: 'guides' },
      'unrelated.js': { file: 'unrelated.js', name: 'guides' },
      '_other-hash.js': { file: 'other.js', name: 'rentalAnalysis' },
      'guides.css': { file: 'guides.css', name: 'guides' },
    })
    deferCataloguePrefetch(manifest)
    for (const id of ['C:\\project\\utils\\guides.ts', 'virtual-source', '_arbitrary-hash.js'])
      expect(manifest[id]?.prefetch).toBe(false)
    for (const id of ['pages/guides.vue', 'unrelated.js', '_other-hash.js', 'guides.css'])
      expect(manifest[id]?.prefetch).toBe(true)
  })
})
