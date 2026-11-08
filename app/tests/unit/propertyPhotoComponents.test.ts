import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import * as serverRenderer from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import * as photoSizes from '../../utils/photoSizes'

// The card carousel and the property grid rendered by Vue's own SSR: what the server sends is what
// the phone downloads before any script runs. Nuxt's auto-imports are handed in as globals; the
// Vuetify components and the viewer stay unresolved tags (nothing here renders them).
const APP = resolve(__dirname, '../..')

function component(path: string) {
  const filename = resolve(APP, path)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const { content } = compileScript(descriptor, {
    id: 'photo-components-test',
    inlineTemplate: true,
    templateOptions: { ssr: true },
  })
  const source = content
    .replaceAll('import.meta.server', 'true')
    .replaceAll('import.meta.client', 'false')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const modules: Record<string, unknown> = {
    vue,
    'vue/server-renderer': serverRenderer,
    '~/utils/photoSizes': photoSizes,
  }
  const { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } = vue
  const globals: Record<string, unknown> = {
    ref,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    nextTick,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key}(${Object.values(params).join(',')})` : key,
    }),
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

async function render(path: string, props: Record<string, unknown>) {
  const app = vue.createSSRApp({ render: () => vue.h(component(path), props) })
  app.config.warnHandler = () => {}
  return serverRenderer.renderToString(app)
}

const images = (html: string) =>
  [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => ({
    src: /\ssrc="([^"]*)"/.exec(tag)?.[1],
    srcset: /\ssrcset="([^"]*)"/.exec(tag)?.[1],
    sizes: /\ssizes="([^"]*)"/.exec(tag)?.[1],
  }))

const infocasas = (n: number) =>
  `https://cdn1.infocasas.com.uy/repo/img/13651_UY.42.4.188.172.V1_${n}.jpg`
const mercadolibre = (n: number) =>
  `https://http2.mlstatic.com/D_NQ_NP_60521${n}-MLU118279795314_102026-F.webp`
const amp = (url: string) => url.replaceAll('&', '&amp;')

describe('PhotoCarousel: the card downloads the photo it shows and its neighbour', () => {
  const photos = Array.from({ length: 8 }, (_, n) => ({
    url: n % 2 ? mercadolibre(n) : infocasas(n),
    sourceName: 'Portal',
    sourceUrl: 'https://example.com/aviso',
  }))

  it('renders an image for slides 0 and 1 only, in the card size, keeping all eight numbered', async () => {
    const html = await render('components/property/PhotoCarousel.vue', {
      photos,
      total: 8,
      title: 'Apartamento',
      eager: true,
    })
    expect(images(html).map(image => image.src)).toEqual([
      amp(photoSizes.cardPhotoUrl(infocasas(0))),
      amp(photoSizes.cardPhotoUrl(mercadolibre(1))),
    ])
    expect(html.match(/class="photo-carousel__slide"/g)).toHaveLength(8)
    expect(html.match(/class="photo-carousel__pending"/g)).toHaveLength(6)
    expect(html).toContain('photoViewer.openPhoto(8,8)')
    expect(html).not.toContain('cdn1.infocasas.com.uy')
    expect(html).not.toContain('-F.webp')
  })
})

describe('PhotoGrid: each photo in the size it is drawn at', () => {
  const media = (url: string, n: number) => ({
    url,
    alt: `Foto ${n + 1}`,
    sourceName: 'Portal',
    sourceUrl: 'https://example.com/aviso',
  })

  it('gives the lead a srcset and the mosaic its thumbnails', async () => {
    const photos = Array.from({ length: 7 }, (_, n) => media(infocasas(n), n))
    const html = await render('components/property/PhotoGrid.vue', { photos, title: 'Casa' })
    const [lead, ...tiles] = images(html)
    expect(lead).toEqual({
      src: photoSizes.leadPhotoSources(infocasas(0)).src,
      srcset: photoSizes.leadPhotoSources(infocasas(0)).srcset,
      sizes: photoSizes.gridPhotoSizes(5),
    })
    expect(tiles.map(tile => tile.src)).toEqual(
      [1, 2, 3, 4].map(n => photoSizes.gridPhotoUrl(infocasas(n)))
    )
    expect(tiles.every(tile => tile.srcset === undefined)).toBe(true)
    // The full-size originals stay with the viewer, not in the grid.
    expect(images(html).some(image => image.src?.startsWith('https://cdn1.'))).toBe(false)
  })

  it('lets every photo of a grid of two to four choose like the lead', async () => {
    const photos = [0, 1, 2].map(n => media(mercadolibre(n), n))
    const html = await render('components/property/PhotoGrid.vue', { photos, title: 'Casa' })
    expect(images(html).map(image => image.sizes)).toEqual([
      photoSizes.gridPhotoSizes(3, 0),
      photoSizes.gridPhotoSizes(3, 1),
      photoSizes.gridPhotoSizes(3, 2),
    ])
    expect(images(html).map(image => image.srcset)).toEqual(
      [0, 1, 2].map(n => photoSizes.leadPhotoSources(mercadolibre(n)).srcset)
    )
  })
})
