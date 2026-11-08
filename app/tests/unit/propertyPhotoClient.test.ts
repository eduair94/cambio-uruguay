// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import * as photoSizes from '../../utils/photoSizes'

// components/property/PhotoCarousel.vue and PhotoGrid.vue mounted in a browser-like DOM: the slide
// window grows as the visitor moves, a failed small file falls back to the original once, a dead
// gallery still reaches "sin foto", and a photo that loaded or failed before hydration (when its
// `load`/`error` already fired) is read back by hand.

/** The URLs the components reported as loaded through `usePropertyGalleries().checkLoaded`. */
const loaded: string[] = []

function component(path: string): vue.Component {
  const filename = resolve(__dirname, '../..', path)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const { content } = compileScript(descriptor, { id: 'photo-client', inlineTemplate: true })
  const { outputText } = ts.transpileModule(
    content.replaceAll('import.meta.client', 'true').replaceAll('import.meta.server', 'false'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )
  const modules: Record<string, unknown> = { vue, '~/utils/photoSizes': photoSizes }
  const { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } = vue
  const globals: Record<string, unknown> = {
    ref,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    nextTick,
    useI18n: () => ({ t: (key: string) => key }),
    usePropertyGalleries: () => ({
      load: async () => [],
      cached: () => null,
      checkLoaded: (url: string) => loaded.push(url),
      real: <T>(photos: readonly T[]) => [...photos],
    }),
  }
  const exports = {} as { default: vue.Component }
  new Function('exports', 'require', ...Object.keys(globals), outputText)(
    exports,
    (name: string) => {
      if (name in modules) return modules[name]
      throw new Error(`Unexpected module ${name}`)
    },
    ...Object.values(globals)
  )
  return exports.default
}

/** Prototype getters a test replaced, put back after it. */
const restore: Array<() => void> = []
function stubGetter(proto: object, key: string, get: (this: HTMLElement) => unknown) {
  const own = Object.getOwnPropertyDescriptor(proto, key)
  Object.defineProperty(proto, key, { configurable: true, get, set() {} })
  restore.push(() =>
    own ? Object.defineProperty(proto, key, own) : Reflect.deleteProperty(proto, key)
  )
}
/** Every image of the page as the browser leaves it before hydration: already over. */
function imagesAlreadyOver(naturalWidth: number) {
  stubGetter(HTMLImageElement.prototype, 'complete', () => true)
  stubGetter(HTMLImageElement.prototype, 'naturalWidth', () => naturalWidth)
}

const mounted: vue.App[] = []
afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  for (const undo of restore.splice(0).reverse()) undo()
  loaded.length = 0
  document.body.innerHTML = ''
})

function mountComponent(path: string, props: Record<string, unknown>) {
  // jsdom has neither of these; the components only need them not to throw.
  HTMLElement.prototype.scrollTo = () => {}
  HTMLElement.prototype.scrollIntoView = () => {}
  window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia
  const definition = component(path)
  const root = document.createElement('div')
  document.body.append(root)
  const app = vue.createApp({ render: () => vue.h(definition, props) })
  app.config.warnHandler = () => {}
  app.mount(root)
  mounted.push(app)
  const sources = () => [...root.querySelectorAll('img')].map(image => image.getAttribute('src'))
  return { root, sources }
}

function mountCarousel(photos: Array<{ url: string }>) {
  const failed: number[] = []
  const view = mountComponent('components/property/PhotoCarousel.vue', {
    photos: photos.map(photo => ({ ...photo, sourceName: 'Portal', sourceUrl: 'https://x' })),
    title: 'Casa',
    onFailed: () => failed.push(1),
  })
  return { ...view, failed }
}

const infocasas = (n: number) => `https://cdn1.infocasas.com.uy/repo/img/foto_${n}.jpg`
/** A host with no smaller file: a failure goes straight to "failed", with no retry. */
const plain = (n: number) => `https://images.example.com/aviso/${n}.jpg`
const fail = (image: Element) => image.dispatchEvent(new Event('error'))

describe('PhotoCarousel in the browser', () => {
  it('tells its card there is nothing to show when no photo is left', async () => {
    const { failed } = mountCarousel([])
    await vue.nextTick()
    expect(failed).toHaveLength(1)
  })

  it('gives the next slide its file as the visitor moves, and keeps the ones already loaded', async () => {
    const photos = Array.from({ length: 6 }, (_, n) => ({ url: infocasas(n) }))
    const { root, sources } = mountCarousel(photos)
    await vue.nextTick()
    expect(sources()).toEqual([0, 1].map(n => photoSizes.cardPhotoUrl(infocasas(n))))
    const carouselRoot = root.querySelector('.photo-carousel')!
    carouselRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await vue.nextTick()
    await vue.nextTick()
    expect(sources()).toEqual([0, 1, 2].map(n => photoSizes.cardPhotoUrl(infocasas(n))))
    expect(root.querySelectorAll('.photo-carousel__pending')).toHaveLength(3)
  })

  it('retries the original once when the small file fails, then gives the photo up', async () => {
    const { root, failed, sources } = mountCarousel([{ url: infocasas(0) }])
    await vue.nextTick()
    expect(sources()).toEqual([photoSizes.cardPhotoUrl(infocasas(0))])
    fail(root.querySelector('img')!)
    await vue.nextTick()
    expect(sources()).toEqual([infocasas(0)])
    expect(failed).toHaveLength(0)
    fail(root.querySelector('img')!)
    await vue.nextTick()
    expect(sources()).toEqual([])
    expect(root.querySelector('.photo-carousel__missing')).not.toBeNull()
    expect(failed).toHaveLength(1)
  })

  it('walks a dead gallery to "sin foto", asking for each photo once', async () => {
    const photos = Array.from({ length: 5 }, (_, n) => ({ url: plain(n) }))
    const { root, failed, sources } = mountCarousel(photos)
    await vue.nextTick()
    const asked = new Set(sources())
    for (let round = 0; round < 10 && root.querySelector('img'); round++) {
      root.querySelectorAll('img').forEach(fail)
      await vue.nextTick()
      for (const src of sources()) asked.add(src)
    }
    expect(failed).toHaveLength(1)
    expect(root.querySelectorAll('.photo-carousel__missing')).toHaveLength(5)
    expect([...asked]).toEqual(photos.map(photo => photo.url))
  })

  it('costs a live gallery one extra photo per failure, not the whole strip', async () => {
    const photos = Array.from({ length: 6 }, (_, n) => ({ url: plain(n) }))
    const { root, failed, sources } = mountCarousel(photos)
    await vue.nextTick()
    fail(root.querySelector('img')!)
    await vue.nextTick()
    // Photo 1 is still loading; photo 2 took the dead one's turn, photo 3 waits for a swipe.
    expect(sources()).toEqual([plain(1), plain(2)])
    expect(root.querySelectorAll('.photo-carousel__pending')).toHaveLength(3)
    expect(failed).toHaveLength(0)
  })

  it('starts from the photo a swipe reached before hydration', async () => {
    // scroll-snap works without JavaScript: the strip already sits on photo 4 (of 300 px each).
    const isTrack = (element: HTMLElement) => element.classList.contains('photo-carousel__track')
    stubGetter(HTMLElement.prototype, 'clientWidth', function () {
      return isTrack(this) ? 300 : 0
    })
    stubGetter(HTMLElement.prototype, 'scrollLeft', function () {
      return isTrack(this) ? 900 : 0
    })
    const photos = Array.from({ length: 6 }, (_, n) => ({ url: infocasas(n) }))
    const { root, sources } = mountCarousel(photos)
    await vue.nextTick()
    expect(sources()).toEqual([0, 1, 2, 3, 4].map(n => photoSizes.cardPhotoUrl(infocasas(n))))
    expect(root.querySelector('.photo-carousel__count')!.textContent).toBe('4 / 6')
  })

  it('retries the original of a photo that failed before hydration, then gives it up', async () => {
    imagesAlreadyOver(0)
    const photos = Array.from({ length: 4 }, (_, n) => ({ url: infocasas(n) }))
    const { root, failed, sources } = mountCarousel(photos)
    restore
      .splice(0)
      .reverse()
      .forEach(undo => undo())
    await vue.nextTick()
    // Both server-rendered slides had failed: each asks for its original once.
    expect(sources()).toEqual([infocasas(0), infocasas(1)])
    fail(root.querySelector('img')!)
    await vue.nextTick()
    expect(root.querySelector('.photo-carousel__missing')).not.toBeNull()
    expect(sources()).toEqual([infocasas(1), photoSizes.cardPhotoUrl(infocasas(2))])
    expect(failed).toHaveLength(0)
  })

  it('reports a photo that loaded before hydration and keeps its small file', async () => {
    imagesAlreadyOver(400)
    const photos = Array.from({ length: 4 }, (_, n) => ({ url: infocasas(n) }))
    const { sources } = mountCarousel(photos)
    await vue.nextTick()
    expect(loaded).toEqual([infocasas(0), infocasas(1)])
    expect(sources()).toEqual([0, 1].map(n => photoSizes.cardPhotoUrl(infocasas(n))))
  })
})

describe('PhotoGrid in the browser', () => {
  const media = (url: string, n: number) => ({
    url,
    alt: `Foto ${n + 1}`,
    sourceName: 'Portal',
    sourceUrl: 'https://example.com/aviso',
  })
  const mountGrid = (urls: string[]) =>
    mountComponent('components/property/PhotoGrid.vue', {
      photos: urls.map(media),
      title: 'Casa',
    })
  const srcsets = (root: Element) =>
    [...root.querySelectorAll('img')].map(image => image.getAttribute('srcset'))

  it('retries the originals of photos that failed before hydration, then drops a dead one', async () => {
    imagesAlreadyOver(0)
    const urls = Array.from({ length: 6 }, (_, n) => infocasas(n))
    const { root, sources } = mountGrid(urls)
    restore
      .splice(0)
      .reverse()
      .forEach(undo => undo())
    await vue.nextTick()
    // The lead lost its srcset and every tile its thumbnail: one more try, with the original.
    expect(sources()).toEqual(urls.slice(0, 5))
    expect(srcsets(root).every(srcset => srcset === null)).toBe(true)
    fail(root.querySelector('img')!)
    await vue.nextTick()
    // The original failed too: the photo leaves the grid, and the next one leads.
    expect(sources()[0]).toBe(infocasas(1))
    expect(sources()).not.toContain(infocasas(0))
  })

  it('reports a photo that loaded before hydration and keeps its sizes', async () => {
    imagesAlreadyOver(800)
    const urls = Array.from({ length: 6 }, (_, n) => infocasas(n))
    const { root, sources } = mountGrid(urls)
    await vue.nextTick()
    expect(loaded).toEqual(urls.slice(0, 5))
    expect(sources()[0]).toBe(photoSizes.leadPhotoSources(infocasas(0)).src)
    expect(srcsets(root)[0]).toBe(photoSizes.leadPhotoSources(infocasas(0)).srcset)
    expect(sources().slice(1)).toEqual(urls.slice(1, 5).map(photoSizes.gridPhotoUrl))
  })
})
