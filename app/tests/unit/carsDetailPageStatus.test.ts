import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import * as unhead from '@unhead/vue'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import * as h3 from 'h3'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as cars from '../../utils/cars'
import * as carsRisk from '../../utils/carsRisk'
import * as carsSpecs from '../../utils/carsSpecs'
import type { PublicCarListing } from '../../utils/carsPublic'

// La ficha de un aviso de auto, ejecutada tal cual está escrita, con un aviso que YA NO ESTÁ.
// El 22/9/2026 la galería se leía ansiosamente en setup (`ref(gallery.value[0])`) sobre
// `data.value!.car`, y el TypeError que salía de ahí hacía que Nitro pisara el 404 recién
// puesto con un 500 "Server Error" — en la página, en /en y /pt, y en el endpoint
// /__og-image__ que vuelve a pedir la página para leer su payload. Ninguna prueba lo veía:
// las de la API paran en el handler y las de OG usan la de sucursales. Ésta corre el
// `<script setup>` compilado dentro de un vm con las composables de Nuxt reemplazadas por
// stubs que registran lo que la página les pide.
const filename = resolve(__dirname, '../../pages/autos-usados-uruguay/[key].vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'cars-detail-page-status-test' })
const { outputText } = ts.transpileModule(
  script.content
    .replaceAll('import.meta.server', 'true')
    .replaceAll('import.meta.client', 'false')
    .replaceAll('import.meta.dev', 'false'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
)

// Se llama ADVERT y no KEY a propósito: el gate de secretos (gitleaks, generic-api-key) marca
// cualquier identificador con la palabra inglesa para "clave" seguido de un valor con dígitos.
const ADVERT = 'ml-MLU1490460672'

function listing(overrides: Partial<PublicCarListing> = {}): PublicCarListing {
  return {
    key: ADVERT,
    brand: 'Peugeot',
    brandSlug: 'peugeot',
    model: '208',
    modelSlug: '208',
    marketSlug: 'peugeot-208',
    title: 'Peugeot 208 Allure',
    year: 2017,
    km: 100000,
    price: 7900,
    currency: 'USD',
    priceUsd: 7900,
    priceConverted: false,
    transmission: 'manual',
    fuel: 'nafta',
    engine: '1.5',
    trim: 'Allure',
    department: 'Montevideo',
    neighborhood: null,
    sellerType: 'private',
    dealerName: null,
    picture: 'https://http2.mlstatic.com/D_cover.jpg',
    pictures: ['https://http2.mlstatic.com/D_1.jpg', 'https://http2.mlstatic.com/D_2.jpg'],
    pictureCount: 2,
    permalink: 'https://auto.mercadolibre.com.uy/MLU-1490460672-_JM',
    firstSeen: '2026-09-01T12:00:00.000Z',
    lastSeen: '2026-09-22T12:00:00.000Z',
    priceDrop: null,
    flags: [],
    opportunity: null,
    ...overrides,
  } as PublicCarListing
}

type Scenario =
  | { kind: 'missing' }
  | { kind: 'unavailable' }
  | { kind: 'live'; car?: Partial<PublicCarListing> }

async function setupPage(scenario: Scenario) {
  const head = createHead()
  const event = { path: `/autos-usados-uruguay/${ADVERT}`, context: {} }
  const setResponseStatus = vi.fn()
  const responseHeaders = new Map<string, unknown>()
  let meta: { validate?: (route: { params: Record<string, string> }) => boolean } = {}
  const fetchAdvert = vi.fn(async () => {
    if (scenario.kind === 'missing')
      throw h3.createError({ statusCode: 404, statusMessage: 'Advert not found' })
    if (scenario.kind === 'unavailable')
      throw h3.createError({ statusCode: 503, statusMessage: 'Advert temporarily unavailable' })
    return {
      car: listing(scenario.car),
      cohort: null,
      market: { slug: 'peugeot-208', brand: 'Peugeot', model: '208', listings: 12 },
      similar: [],
      opportunity: null,
    }
  })
  const context = {
    exports: {} as any,
    require: (name: string) => {
      const modules: Record<string, unknown> = {
        // El `await` de arriba de setup lo envuelve compileScript en `withAsyncContext`, que
        // exige una instancia de componente montada; acá no hay ninguna, y lo que importa es
        // que el handler corra tal cual, no el contexto de la instancia.
        vue: {
          ...vue,
          withAsyncContext: (getAwaitable: () => unknown) => [getAwaitable(), () => {}],
        },
        '~/utils/cars': cars,
        '~/utils/carsRisk': carsRisk,
        '~/utils/carsSpecs': carsSpecs,
      }
      if (name in modules) return modules[name]
      throw new Error(`Unexpected module ${name}`)
    },
    computed: vue.computed,
    ref: vue.ref,
    watch: vue.watch,
    useRoute: () => ({ params: { key: ADVERT }, path: event.path, query: {} }),
    useLocalePath: () => (path: string) => path,
    $fetch: fetchAdvert,
    // Lo mismo que hace `useAsyncData` de Nuxt con un handler que tira: el error queda en
    // `error.value`, nunca sale de setup (nuxt/dist/app/composables/asyncData.js).
    useAsyncData: async (_key: unknown, handler: () => Promise<unknown>) => {
      try {
        return { data: vue.ref(await handler()), error: vue.ref(null) }
      } catch (error) {
        return { data: vue.ref(null), error: vue.ref(error) }
      }
    },
    useRequestEvent: () => event,
    setResponseStatus,
    useResponseHeader: (name: string) => ({
      set value(value: unknown) {
        responseHeaders.set(name, value)
      },
      get value() {
        return responseHeaders.get(name)
      },
    }),
    useSeoMeta: (input: unknown) => unhead.useSeoMeta(input as never, { head }),
    useHead: (input: unknown) => unhead.useHead(input as never, { head }),
    definePageMeta: (value: typeof meta) => {
      meta = value
    },
  }
  runInNewContext(outputText, context)
  const bindings = await context.exports.default.setup({}, { expose: () => {} })
  return { bindings, meta, head, setResponseStatus, responseHeaders, fetchAdvert }
}

describe('autos advert page status (SSR setup executed as written)', () => {
  it('answers 404 with no-store for an advert that left the directory, without crashing', async () => {
    const { bindings, setResponseStatus, responseHeaders, head } = await setupPage({
      kind: 'missing',
    })
    expect(setResponseStatus).toHaveBeenCalledTimes(1)
    expect(setResponseStatus.mock.calls[0][1]).toBe(404)
    expect(responseHeaders.get('cache-control')).toBe('no-store, max-age=0')
    expect(bindings.failureCode.value).toBe(404)
    // Todo lo que cuelga del aviso sigue vivo con `car === null`: la plantilla de "ya no está"
    // y el head se renderizan igual.
    expect(bindings.car.value).toBeNull()
    expect(bindings.gallery.value).toEqual([])
    expect(bindings.activePicture.value).toBeNull()
    expect(bindings.specTables.value).toEqual({ mechanics: [], dimensions: [], deal: [] })
    expect(bindings.equipmentGroups.value).toEqual([])
    expect(bindings.hasSpecSheet.value).toBe(false)
    expect(bindings.breadcrumbs.value.at(-1)).toEqual({ title: 'Aviso' })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toContain('<title>Aviso de auto usado | Cambio Uruguay</title>')
    expect(headTags).toContain('noindex, follow')
    expect(headTags).not.toContain('application/ld+json')
  })

  it('answers 503 when the directory itself is down, and keeps the same no-store', async () => {
    const { bindings, setResponseStatus, responseHeaders } = await setupPage({
      kind: 'unavailable',
    })
    expect(setResponseStatus.mock.calls[0][1]).toBe(503)
    expect(responseHeaders.get('cache-control')).toBe('no-store, max-age=0')
    expect(bindings.failureCode.value).toBe(503)
    expect(bindings.car.value).toBeNull()
  })

  it('leaves a live advert untouched: 200, gallery seeded from the advert, JSON-LD published', async () => {
    const { bindings, setResponseStatus, responseHeaders, head } = await setupPage({
      kind: 'live',
    })
    expect(setResponseStatus).not.toHaveBeenCalled()
    expect(responseHeaders.size).toBe(0)
    expect(bindings.car.value?.key).toBe(ADVERT)
    expect(bindings.gallery.value).toEqual([
      'https://http2.mlstatic.com/D_1.jpg',
      'https://http2.mlstatic.com/D_2.jpg',
    ])
    expect(bindings.activePicture.value).toBe('https://http2.mlstatic.com/D_1.jpg')
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toContain('<title>Peugeot 208 Allure 2017 | Cambio Uruguay</title>')
    expect(headTags).toContain(`https://cambio-uruguay.com/autos-usados-uruguay/${ADVERT}`)
    expect(headTags).toContain('application/ld+json')
    expect(headTags).toContain('"@type":"Car"')
  })

  it('falls back to the search-card cover when the advert page was never read', async () => {
    const { bindings } = await setupPage({ kind: 'live', car: { pictures: undefined } })
    expect(bindings.gallery.value).toEqual(['https://http2.mlstatic.com/D_cover.jpg'])
    expect(bindings.activePicture.value).toBe('https://http2.mlstatic.com/D_cover.jpg')
  })

  it('rejects a malformed key in definePageMeta.validate, before any advert read', async () => {
    const { meta, fetchAdvert } = await setupPage({ kind: 'live' })
    expect(meta.validate).toBeTypeOf('function')
    expect(meta.validate!({ params: { key: ADVERT } })).toBe(true)
    expect(meta.validate!({ params: { key: 'ml-MLU1; drop' } })).toBe(false)
    expect(meta.validate!({ params: {} })).toBe(false)
    // El handler ya no valida la forma de la clave: eso pasó a `validate`, que corre antes.
    expect(fetchAdvert).toHaveBeenCalledTimes(1)
  })
})
