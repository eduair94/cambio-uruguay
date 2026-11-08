// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import * as photoSizes from '../../utils/photoSizes'

// components/property/PhotoCarousel.vue mounted in a browser-like DOM: the slide window grows as
// the visitor moves, a failed small file falls back to the original once, and a carousel left
// with no photo at all tells its card to show "sin foto".

function carousel(): vue.Component {
  const filename = resolve(__dirname, '../../components/property/PhotoCarousel.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const { content } = compileScript(descriptor, { id: 'carousel-client', inlineTemplate: true })
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
      checkLoaded: () => {},
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

const mounted: vue.App[] = []
afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

function mount(photos: Array<{ url: string }>) {
  // jsdom has neither of these; the carousel only needs them not to throw.
  HTMLElement.prototype.scrollTo = () => {}
  window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia
  const failed: number[] = []
  const root = document.createElement('div')
  document.body.append(root)
  const app = vue.createApp({
    render: () =>
      vue.h(carousel(), {
        photos: photos.map(photo => ({ ...photo, sourceName: 'Portal', sourceUrl: 'https://x' })),
        title: 'Casa',
        onFailed: () => failed.push(1),
      }),
  })
  app.config.warnHandler = () => {}
  app.mount(root)
  mounted.push(app)
  const sources = () => [...root.querySelectorAll('img')].map(image => image.getAttribute('src'))
  return { root, failed, sources }
}

const infocasas = (n: number) => `https://cdn1.infocasas.com.uy/repo/img/foto_${n}.jpg`

describe('PhotoCarousel in the browser', () => {
  it('tells its card there is nothing to show when no photo is left', async () => {
    const { failed } = mount([])
    await vue.nextTick()
    expect(failed).toHaveLength(1)
  })

  it('gives the next slide its file as the visitor moves, and keeps the ones already loaded', async () => {
    const photos = Array.from({ length: 6 }, (_, n) => ({ url: infocasas(n) }))
    const { root, sources } = mount(photos)
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
    const { root, failed, sources } = mount([{ url: infocasas(0) }])
    await vue.nextTick()
    expect(sources()).toEqual([photoSizes.cardPhotoUrl(infocasas(0))])
    root.querySelector('img')!.dispatchEvent(new Event('error'))
    await vue.nextTick()
    expect(sources()).toEqual([infocasas(0)])
    expect(failed).toHaveLength(0)
    root.querySelector('img')!.dispatchEvent(new Event('error'))
    await vue.nextTick()
    expect(sources()).toEqual([])
    expect(root.querySelector('.photo-carousel__missing')).not.toBeNull()
    expect(failed).toHaveLength(1)
  })
})
