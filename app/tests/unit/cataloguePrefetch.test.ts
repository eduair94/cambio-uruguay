import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeViteManifest, type Manifest } from 'vue-bundle-renderer'
import {
  createRendererContext,
  getPrefetchLinks,
  getPreloadLinks,
  renderScripts,
  renderStyles,
} from 'vue-bundle-renderer/runtime'
import {
  deferCataloguePrefetch,
  moduleNames,
  pagesWithoutChunk,
} from '../../modules/catalogue-prefetch/policy'

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

// Shaped like the production graph of 2026-11-20: the entry hoists every route validator's
// `await import('~/utils/...')`, the Firebase session code hangs off app-wide plugins, stores
// and the layout, and app-wide lazy code (layout, i18n config, workbox) shares chunks with them.
const productionLike = (): Manifest =>
  normalizeViteManifest({
    'entry.js': {
      file: 'entry.js',
      isEntry: true,
      imports: ['_lazy.js'],
      dynamicImports: [
        'utils/comparativas.ts',
        'utils/bankosPages.ts',
        'services/firebaseAuthApi.ts',
        'services/firebaseAuthSync.ts',
        'layouts/default.vue',
        'i18n/i18n.config.ts',
        '../node_modules/workbox-window/build/workbox-window.prod.es5.mjs',
        '../node_modules/firebase/messaging/dist/index.esm.js',
        '../node_modules/some-lib/dist/utils/lazy.mjs',
        'pages/comparativas/[familia]/index.vue',
        'pages/descuentos-con-tarjeta-uruguay/[banco].vue',
      ],
    },
    '_lazy.js': { file: 'lazy.js', name: 'firebaseLazy' },
    'utils/comparativas.ts': {
      file: 'comparativas-hash.js',
      src: 'utils/comparativas.ts',
      isDynamicEntry: true,
      imports: ['_cards-hash.js', '_shared-hash.js'],
    },
    '_cards-hash.js': { file: 'cards-hash.js', name: 'cardRewards' },
    '_shared-hash.js': { file: 'shared-hash.js', name: 'formatters' },
    'utils/bankosPages.ts': {
      file: 'bankos-hash.js',
      src: 'utils/bankosPages.ts',
      isDynamicEntry: true,
    },
    'services/firebaseAuthApi.ts': {
      file: 'auth-api-hash.js',
      src: 'services/firebaseAuthApi.ts',
      isDynamicEntry: true,
      imports: ['_firebase-app-hash.js'],
    },
    '_firebase-app-hash.js': { file: 'firebase-app-hash.js', name: 'index.esm' },
    'services/firebaseAuthSync.ts': {
      file: 'auth-sync-hash.js',
      src: 'services/firebaseAuthSync.ts',
      isDynamicEntry: true,
      imports: ['_firebase-app-hash.js', '_sync-store-hash.js'],
    },
    '_sync-store-hash.js': { file: 'sync-store-hash.js', name: 'favorites' },
    'layouts/default.vue': {
      file: 'default-hash.js',
      src: 'layouts/default.vue',
      isDynamicEntry: true,
      imports: ['_shared-hash.js'],
      dynamicImports: ['components/SearchPalette.vue', 'services/firebaseMessagingApi.ts'],
    },
    'components/SearchPalette.vue': {
      file: 'palette-hash.js',
      src: 'components/SearchPalette.vue',
      isDynamicEntry: true,
      dynamicImports: ['utils/searchIndex.ts'],
    },
    'utils/searchIndex.ts': {
      file: 'search-index-hash.js',
      src: 'utils/searchIndex.ts',
      isDynamicEntry: true,
    },
    'services/firebaseMessagingApi.ts': {
      file: 'messaging-hash.js',
      src: 'services/firebaseMessagingApi.ts',
      isDynamicEntry: true,
      imports: ['_firebase-app-hash.js'],
    },
    'i18n/i18n.config.ts': {
      file: 'i18n-config-hash.js',
      src: 'i18n/i18n.config.ts',
      isDynamicEntry: true,
    },
    '../node_modules/workbox-window/build/workbox-window.prod.es5.mjs': {
      file: 'workbox-hash.js',
      src: '../node_modules/workbox-window/build/workbox-window.prod.es5.mjs',
      isDynamicEntry: true,
    },
    '../node_modules/firebase/messaging/dist/index.esm.js': {
      file: 'firebase-messaging-hash.js',
      src: '../node_modules/firebase/messaging/dist/index.esm.js',
      isDynamicEntry: true,
      imports: ['_firebase-app-hash.js'],
    },
    '../node_modules/some-lib/dist/utils/lazy.mjs': {
      file: 'lib-lazy-hash.js',
      src: '../node_modules/some-lib/dist/utils/lazy.mjs',
      isDynamicEntry: true,
    },
    'pages/comparativas/[familia]/index.vue': {
      file: 'comparativas-page-hash.js',
      src: 'pages/comparativas/[familia]/index.vue',
      isDynamicEntry: true,
      imports: ['utils/comparativas.ts'],
    },
    'pages/descuentos-con-tarjeta-uruguay/[banco].vue': {
      file: 'bankos-page-hash.js',
      src: 'pages/descuentos-con-tarjeta-uruguay/[banco].vue',
      isDynamicEntry: true,
      imports: ['utils/bankosPages.ts'],
    },
  })

const onDemandFiles = [
  '/comparativas-hash.js',
  '/cards-hash.js',
  '/bankos-hash.js',
  '/auth-api-hash.js',
  '/auth-sync-hash.js',
  '/sync-store-hash.js',
  '/firebase-app-hash.js',
  '/messaging-hash.js',
  '/firebase-messaging-hash.js',
]
const layoutRequest = () => ({ modules: new Set(['layouts/default.vue']) })

describe('code that is only loaded on demand', () => {
  it('drops the sitewide hints for validator catalogues and session code, keeping app-wide lazy code', () => {
    const manifest = productionLike()
    const initial = createRendererContext({ manifest: productionLike() })
    const hintedBefore = getPrefetchLinks(layoutRequest(), initial).map(link => link.href)
    expect(hintedBefore).toEqual(expect.arrayContaining(onDemandFiles))

    deferCataloguePrefetch(manifest)
    const renderer = createRendererContext({ manifest })
    for (const request of [{}, layoutRequest()]) {
      const hinted = getPrefetchLinks(request, renderer).map(link => link.href)
      for (const file of onDemandFiles) expect(hinted).not.toContain(file)
      expect(hinted).toEqual(
        expect.arrayContaining(['/i18n-config-hash.js', '/workbox-hash.js', '/lib-lazy-hash.js'])
      )
    }
    // Not rendered: the layout is hinted with what it shares. Rendered: it is preloaded instead,
    // and its own lazy component is hinted.
    expect(getPrefetchLinks({}, renderer).map(link => link.href)).toEqual(
      expect.arrayContaining(['/default-hash.js', '/shared-hash.js'])
    )
    expect(getPrefetchLinks(layoutRequest(), renderer).map(link => link.href)).toContain(
      '/palette-hash.js'
    )
    // Shared with the layout, which every page renders: it keeps its hint.
    expect(manifest['_shared-hash.js']?.prefetch).toBe(true)
  })

  it('changes nothing but the prefetch flag: preload and scripts stay identical', () => {
    const manifest = productionLike()
    const before = structuredClone(manifest)
    const initial = createRendererContext({ manifest: before })
    deferCataloguePrefetch(manifest)
    const renderer = createRendererContext({ manifest })
    for (const request of [{}, layoutRequest()]) {
      expect(getPreloadLinks(request, renderer)).toEqual(getPreloadLinks(request, initial))
      expect(renderScripts(request, renderer)).toEqual(renderScripts(request, initial))
    }
    for (const [id, resource] of Object.entries(manifest)) {
      expect({ ...resource, prefetch: before[id]!.prefetch }).toEqual(before[id])
    }
  })

  it('still modulepreloads each catalogue on the page that imports it', () => {
    const manifest = productionLike()
    deferCataloguePrefetch(manifest)
    const renderer = createRendererContext({ manifest })
    const preloaded = (page: string) =>
      getPreloadLinks({ modules: new Set([page]) }, renderer).map(link => link.href)
    expect(preloaded('pages/comparativas/[familia]/index.vue')).toEqual(
      expect.arrayContaining(['/comparativas-hash.js', '/cards-hash.js', '/shared-hash.js'])
    )
    expect(preloaded('pages/descuentos-con-tarjeta-uruguay/[banco].vue')).toContain(
      '/bankos-hash.js'
    )
  })

  it('applies the utils rule only to entry imports and the services rule from any chunk', () => {
    const manifest = productionLike()
    deferCataloguePrefetch(manifest)
    // services/ imported by the layout, not the entry: still on demand.
    expect(manifest['services/firebaseMessagingApi.ts']?.prefetch).toBe(false)
    // utils/ imported by a lazy component, not the entry: not a validator, keeps its hint.
    expect(manifest['utils/searchIndex.ts']?.prefetch).toBe(true)
    // A package's own utils/ folder is not a route validator.
    expect(manifest['../node_modules/some-lib/dist/utils/lazy.mjs']?.prefetch).toBe(true)
    // Pages are never on-demand roots.
    expect(manifest['pages/comparativas/[familia]/index.vue']?.prefetch).toBe(true)
  })

  it('never touches what the entry loads statically and is idempotent', () => {
    const manifest = productionLike()
    deferCataloguePrefetch(manifest)
    expect(manifest['entry.js']?.prefetch).toBe(true)
    expect(manifest['_lazy.js']?.prefetch).toBe(true)
    const once = structuredClone(manifest)
    deferCataloguePrefetch(manifest)
    expect(manifest).toEqual(once)
  })

  it('keeps a chunk that the entry imports statically even when a deferred root shares it', () => {
    const raw = {
      'entry.js': {
        file: 'entry.js',
        isEntry: true,
        imports: ['_common-hash.js'],
        dynamicImports: ['utils/catalogue.ts'],
      },
      '_common-hash.js': { file: 'common-hash.js', name: 'common' },
      'utils/catalogue.ts': {
        file: 'catalogue-hash.js',
        src: 'utils/catalogue.ts',
        isDynamicEntry: true,
        imports: ['_common-hash.js', 'entry.js'],
      },
    }
    const manifest = normalizeViteManifest(raw)
    deferCataloguePrefetch(manifest)
    expect(manifest['utils/catalogue.ts']?.prefetch).toBe(false)
    expect(manifest['_common-hash.js']?.prefetch).toBe(true)
    expect(manifest['entry.js']?.prefetch).toBe(true)
  })
})

// Cut from the client manifest of the production build of 2026-11-20 (commit 5b7833f8, public
// build metadata): the entry with 20 of its 77 dynamic imports, the layout and its lazy
// components, /dolar-hoy, and every static import of those. Two things in it that no hand-made
// fixture had: three validator catalogues and the page /alquileres-uruguay lost their facade
// (keyed `_<file>`, no `src`), and the page's lazy MapPropertyDetail imports the page's chunk.
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = join(here, '../..')
const realCut = JSON.parse(
  readFileSync(join(here, 'fixtures/client-manifest-2026-11-20.json'), 'utf8')
) as Manifest
const realManifest = (): Manifest => {
  const manifest = normalizeViteManifest(structuredClone(realCut))
  // What @nuxtjs/i18n's own build:manifest hook does to the locale files.
  for (const [id, resource] of Object.entries(manifest))
    if (id.startsWith('i18n/locales/')) resource.prefetch = resource.preload = false
  return manifest
}
const sourceNames = (dir: string) =>
  readdirSync(join(appRoot, dir))
    .filter(file => /\.[cm]?[jt]s$/.test(file) && !/\.d\.[cm]?ts$/.test(file))
    .map(file => file.replace(/\.[cm]?[jt]s$/, ''))
// What modules/catalogue-prefetch.ts passes in the build, from this checkout.
const realOptions = {
  utilsModules: sourceNames('utils'),
  servicesModules: sourceNames('services'),
  pageSources: ['pages/alquileres-uruguay.vue', 'pages/dolar-hoy.vue'],
}
// What Nuxt registers while rendering /dolar-hoy.
const dolarHoy = () => ({ modules: new Set(['layouts/default.vue', 'pages/dolar-hoy.vue']) })
// A hint by the chunk's preserved module name, or a stylesheet by its file's stem.
const hintNames = (
  manifest: Manifest,
  request: Parameters<typeof getPrefetchLinks>[0],
  as: 'script' | 'style'
) => {
  const byFile = new Map(Object.values(manifest).map(resource => [`/${resource.file}`, resource]))
  return getPrefetchLinks(request, createRendererContext({ manifest }))
    .filter(link => link.as === as)
    .map(link => {
      const resource = byFile.get(link.href)!
      return as === 'script' ? resource.name! : resource.file.split('.')[0]!
    })
    .sort()
}
// App-wide lazy code, all of it reachable right after hydration: the auth middleware, the widget
// layout, the i18n config and the locale helper, workbox, and the layout's search palette,
// feedback block and login dialog.
const APP_WIDE_SCRIPTS = [
  'AuthDialog',
  'FeedbackForm',
  'PageHelpful',
  'SearchPalette',
  'SearchResults',
  'assistantPrompt',
  'auth',
  'externalNavigation',
  'i18n.config',
  'trustpilot',
  'widget',
  'workbox-window.prod.es5',
]
const APP_WIDE_STYLES = [
  'AuthDialog',
  'FeedbackForm',
  'PageHelpful',
  'SearchPalette',
  'SearchResults',
  'widget',
]

describe('the production build of 2026-11-20', () => {
  it('hints the rental page and the faceless catalogues on /dolar-hoy without the policy', () => {
    const manifest = realManifest()
    const scripts = hintNames(manifest, dolarHoy(), 'script')
    expect(scripts).toEqual(
      expect.arrayContaining(['alquileres-uruguay', 'comparativas', 'equiparCategoryPages'])
    )
    expect(scripts).toEqual(expect.arrayContaining(['monopatinModelos', 'firebaseAuthSync']))
    expect(hintNames(manifest, dolarHoy(), 'style')).toEqual(
      expect.arrayContaining(['alquileres-uruguay', 'ZoneBars', 'VPagination'])
    )
  })

  it('leaves /dolar-hoy with the app-wide lazy code and nothing else', () => {
    const manifest = realManifest()
    deferCataloguePrefetch(manifest, realOptions)
    // assistantPrompt is shared by the search palette and the rental page: while the page has no
    // facade it is a deferred root and takes the hint with it. With the facade back
    // (pages/alquileres-uruguay.vue imports MapPropertyDetail statically) it keeps it.
    expect(hintNames(manifest, dolarHoy(), 'script')).toEqual(
      APP_WIDE_SCRIPTS.filter(name => name !== 'assistantPrompt')
    )
    expect(hintNames(manifest, dolarHoy(), 'style')).toEqual(APP_WIDE_STYLES)
  })

  it('changes no preload, stylesheet or script of any page', () => {
    const requests = [
      {},
      dolarHoy(),
      { modules: new Set(['layouts/default.vue', 'components/rentals/MapPropertyDetail.vue']) },
    ]
    const before = createRendererContext({ manifest: realManifest() })
    const manifest = realManifest()
    deferCataloguePrefetch(manifest, realOptions)
    const after = createRendererContext({ manifest })
    for (const request of requests) {
      expect(getPreloadLinks(request, after)).toEqual(getPreloadLinks(request, before))
      expect(renderStyles(request, after)).toEqual(renderStyles(request, before))
      expect(renderScripts(request, after)).toEqual(renderScripts(request, before))
    }
    const untouched = realManifest()
    for (const [id, resource] of Object.entries(manifest))
      expect({ ...resource, prefetch: untouched[id]!.prefetch }).toEqual(untouched[id])
  })

  it('defers the validator catalogues that lost their facade, with what only they reach', () => {
    const manifest = realManifest()
    deferCataloguePrefetch(manifest, realOptions)
    for (const id of ['_CvD9iAPZ.js', '_UQ8xYZcM.js', '_CEW8SFT9.js', 'utils/currencyPages.ts'])
      expect(manifest[id]?.prefetch, id).toBe(false)
    // cardRewards and debitCards (comparativas), householdBills, monopatinFicha.
    for (const id of ['_C0gQbGNa.js', '_B1Kyr0og.js', '_DNmmwYl8.js', '_im6dPkFZ.js'])
      expect(manifest[id]?.prefetch, id).toBe(false)
    // The names come from the checkout: the three catalogues are still utils modules.
    expect(realOptions.utilsModules).toEqual(
      expect.arrayContaining(['comparativas', 'equiparCategoryPages', 'monopatinModelos'])
    )
  })

  it('keeps every app-wide lazy chunk warm', () => {
    const manifest = realManifest()
    deferCataloguePrefetch(manifest, realOptions)
    for (const id of [
      'node_modules/nuxt/dist/app/entry.js',
      'layouts/default.vue',
      'layouts/widget.vue',
      'middleware/auth.ts',
      'i18n/i18n.config.ts',
      'node_modules/workbox-window/build/workbox-window.prod.es5.mjs',
      'components/SearchPalette.vue',
      'components/feedback/PageHelpful.vue',
      'components/AuthDialog.vue',
      'SearchPalette.DaGcxIWC.css',
      'widget.Bb5Calbu.css',
    ])
      expect(manifest[id]?.prefetch, id).toBe(true)
  })

  it('reports the page that lost its chunk, and treats it as on demand', () => {
    const manifest = realManifest()
    expect(pagesWithoutChunk(manifest, realOptions.pageSources)).toEqual([
      'pages/alquileres-uruguay.vue',
    ])
    deferCataloguePrefetch(manifest, realOptions)
    expect(manifest['_Bww13dD9.js']?.prefetch).toBe(false)
    // Its stylesheets go with it: every script that lists them lost its hint.
    expect(manifest['alquileres-uruguay.CJ_6Vkmf.css']?.prefetch).toBe(false)
    expect(manifest['ZoneBars.uC1BL1zF.css']?.prefetch).toBe(false)
  })

  it('is idempotent', () => {
    const manifest = realManifest()
    deferCataloguePrefetch(manifest, realOptions)
    const once = structuredClone(manifest)
    deferCataloguePrefetch(manifest, realOptions)
    expect(manifest).toEqual(once)
  })
})

describe('moduleNames', () => {
  it('takes the basename of source modules and skips declarations and data files', () => {
    expect(
      moduleNames(['guides.ts', 'clarity.mjs', 'types.d.ts', 'temaIndex.json', 'mealprep'])
    ).toEqual(['guides', 'clarity'])
  })
})
